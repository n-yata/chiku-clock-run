import Phaser from 'phaser';
import {
  TEX_KEY,
  BOSS_MAX_HP,
  BOSS_INTRO_MS,
  BOSS_ATTACK_MS,
  BOSS_STAGGER_MS,
  BOSS_PENDULUM_PIVOT_Y,
  BOSS_PENDULUM_LENGTH,
  BOSS_PENDULUM_AMP_RAD,
  BOSS_PENDULUM_OMEGA_BY_PHASE,
  BOSS_PENDULUM_BOB_RADIUS,
  BOSS_PENDULUM_BOB_BODY,
  BOSS_GEAR_RAIN_INTERVAL_MS,
  BOSS_GEAR_RAIN_MAX,
  BOSS_GEAR_RAIN_SIZE,
  BOSS_GEAR_RAIN_BODY,
  BOSS_GEAR_RAIN_VY,
  BOSS_CLOCK_BRASS,
  BOSS_CLOCK_BRASS_DARK
} from '../config/gameConfig';

export type BossState = 'intro' | 'attack' | 'stagger' | 'defeated';

/** 振り子の運動学パラメータ。 */
export interface PendulumParams {
  pivotX: number;
  pivotY: number;
  length: number;
  ampRad: number;
  /** 角速度 (rad/ms)。 */
  omega: number;
  /** 位相 (rad)。省略時 0。 */
  phase?: number;
}

/**
 * 振り子の錘の座標を求める純関数。
 * θ = amp·sin(ω·t + phase)、錘位置 = pivot + length·(sinθ, cosθ)。
 * θ=0（最下点）で錘は支点の真下、θ=±amp で最大に振れる。
 */
export function pendulumPosition(elapsedMs: number, p: PendulumParams): { x: number; y: number; theta: number } {
  const theta = p.ampRad * Math.sin(p.omega * elapsedMs + (p.phase ?? 0));
  return {
    x: p.pivotX + p.length * Math.sin(theta),
    y: p.pivotY + p.length * Math.cos(theta),
    theta
  };
}

/** ボスアリーナの座標情報（BossScene から渡す）。 */
export interface BossArena {
  /** 支点・大時計の中心 X（ワールド px）。 */
  pivotX: number;
  /** 床上端の Y（落下歯車の消滅ライン）。 */
  floorTopY: number;
  /** 落下歯車をスポーンする X の左右内壁境界。 */
  leftBound: number;
  rightBound: number;
}

/** BossController → BossScene への通知。 */
export interface BossCallbacks {
  onHpChanged(hp: number, max: number): void;
  onDefeated(): void;
}

/**
 * ボス「グランドファーザー」の状態機械・攻撃を駆動する（design §コンポーネント2）。
 * 可動物（振り子の錘・落下歯車）を生成・保持する。撃破ダメージは「振り子の錘を上から踏む」方式で、
 * 踏みつけ成立は BossScene 側で判定して `hit()` を呼ぶ（20260603 リワーク）。
 * プレイヤーへの加害（被弾）判定も BossScene の overlap 登録に委ねる。
 */
export class BossController {
  private state: BossState = 'intro';
  private stateUntil = 0;
  private hp = BOSS_MAX_HP;
  /** 受けたダメージ数（= フェーズ index）。振り子 ω の段階に使う。 */
  private damageTaken = 0;
  private attackStartedAt = 0;
  private lastGearRainAt = 0;

  private arm!: Phaser.GameObjects.Graphics;
  /** 攻撃中、錘が「踏める対象」であることを示すスケール脈動。stagger/defeat で停止。 */
  private bobPulse: Phaser.Tweens.Tween | null = null;

  /** 振り子の錘（攻撃中に床を薙ぐ／上から踏むとダメージ）。BossScene が overlap 登録する。 */
  bob!: Phaser.Physics.Arcade.Sprite;
  /** 落下歯車グループ。 */
  gearRain!: Phaser.Physics.Arcade.Group;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly arena: BossArena,
    private readonly callbacks: BossCallbacks
  ) {}

  /** 可動物・グラフィックを生成する。create() 内で 1 回呼ぶ。 */
  build(): void {
    // 振り子の腕（支点→錘の真鍮の棒）
    this.arm = this.scene.add.graphics().setDepth(1);

    // 振り子の錘（実寸テクスチャ。当たり判定は中央寄せの円で絞る）
    this.bob = this.scene.physics.add.sprite(
      this.arena.pivotX,
      BOSS_PENDULUM_PIVOT_Y + BOSS_PENDULUM_LENGTH,
      TEX_KEY.bossBob
    );
    this.bob.setDepth(2);
    const bobBody = this.bob.body as Phaser.Physics.Arcade.Body;
    bobBody.setAllowGravity(false);
    const bobOffset = (BOSS_PENDULUM_BOB_RADIUS * 2 - BOSS_PENDULUM_BOB_BODY) / 2;
    bobBody.setCircle(BOSS_PENDULUM_BOB_BODY / 2, bobOffset, bobOffset);
    bobBody.enable = false;

    // 落下歯車グループ
    this.gearRain = this.scene.physics.add.group();
  }

  /** ボス戦を開始する（intro へ）。 */
  start(now: number): void {
    this.enterIntro(now);
  }

  get currentHp(): number {
    return this.hp;
  }

  get maxHp(): number {
    return BOSS_MAX_HP;
  }

  /** 攻撃中（振り子が振れ、上から踏むとダメージが入る窓）か。 */
  get isAttacking(): boolean {
    return this.state === 'attack';
  }

  get isDefeated(): boolean {
    return this.state === 'defeated';
  }

  /** 毎フレーム更新。BossScene.update から呼ぶ。 */
  update(now: number): void {
    switch (this.state) {
      case 'intro':
        this.parkPendulum();
        if (now >= this.stateUntil) this.enterAttack(now);
        break;
      case 'attack':
        this.updatePendulum(now);
        this.maybeSpawnGearRain(now);
        this.cullGearRain();
        if (now >= this.stateUntil) this.enterStagger(now);
        break;
      case 'stagger':
        this.parkPendulum();
        this.cullGearRain();
        if (now >= this.stateUntil) this.enterAttack(now);
        break;
      case 'defeated':
        // 撃破後は collapse() の落下 tween に任せ、振り子を park し直さない。
        this.cullGearRain();
        break;
    }
  }

  /**
   * 振り子の錘への踏みつけ成立時に呼ぶ。攻撃中のみ HP を減らす。
   * 戻り値 true = ダメージが入った（撃破有無は問わない）／false = 攻撃中でなく無効。
   */
  hit(): boolean {
    if (this.state !== 'attack') return false;
    this.damageTaken += 1;
    this.hp = Math.max(0, this.hp - 1);
    this.callbacks.onHpChanged(this.hp, BOSS_MAX_HP);

    if (this.hp <= 0) {
      this.enterDefeated();
      this.callbacks.onDefeated();
      return true;
    }
    // 生存: 短くよろけて（多重ヒット防止）から攻撃へ復帰（ω 加速）。
    this.enterStagger(this.scene.time.now);
    return true;
  }

  /** 撃破演出（BossScene.onBossDefeated）から呼ぶ。錘を床へ落下させ、腕を断つ。 */
  collapse(): void {
    this.bobPulse?.stop();
    this.bobPulse = null;
    this.disableBob();
    this.bob.setScale(1);
    this.arm?.clear();
    const floorY = this.arena.floorTopY - BOSS_PENDULUM_BOB_RADIUS;
    this.scene.tweens.add({
      targets: this.bob,
      y: floorY,
      duration: 900,
      ease: 'Bounce.easeOut'
    });
    this.scene.tweens.add({
      targets: this.bob,
      angle: this.bob.angle + 540,
      duration: 900,
      ease: 'Cubic.easeOut'
    });
  }

  destroy(): void {
    // tween を止めて破棄中オブジェクトへのコールバック発火を防ぐ。
    // 可動物（arm/bob/gearRain）の破棄は Phaser のシーン shutdown が担う。
    // ここで gearRain.clear/destroy を呼ぶと、物理ワールドの shutdown と競合して
    // 例外（undefined.size）でゲームループが落ちるため、明示破棄はしない。
    this.bobPulse?.stop();
    this.bobPulse = null;
  }

  // --- 状態遷移 ---

  private enterIntro(now: number): void {
    this.state = 'intro';
    this.stateUntil = now + BOSS_INTRO_MS;
    this.disableBob();
    this.stopBobPulse();
  }

  private enterAttack(now: number): void {
    this.state = 'attack';
    this.attackStartedAt = now;
    this.stateUntil = now + BOSS_ATTACK_MS;
    this.lastGearRainAt = now;
    const bobBody = this.bob.body as Phaser.Physics.Arcade.Body;
    bobBody.enable = true;
    this.startBobPulse();
  }

  private enterStagger(now: number): void {
    this.state = 'stagger';
    this.stateUntil = now + BOSS_STAGGER_MS;
    this.disableBob();
    this.stopBobPulse();
    // よろけの点滅（無防備の合図）。stagger 終了で stopBobPulse がクリアする。
    this.bob.setAlpha(1);
    this.bobPulse = this.scene.tweens.add({
      targets: this.bob,
      alpha: 0.35,
      duration: 140,
      yoyo: true,
      repeat: -1
    });
  }

  private enterDefeated(): void {
    this.state = 'defeated';
    this.disableBob();
    this.stopBobPulse();
  }

  /** 攻撃中、錘に「踏める対象」を示すスケール脈動を付ける。 */
  private startBobPulse(): void {
    this.stopBobPulse();
    this.bob.setScale(1);
    this.bob.setAlpha(1);
    this.bobPulse = this.scene.tweens.add({
      targets: this.bob,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private stopBobPulse(): void {
    this.bobPulse?.stop();
    this.bobPulse = null;
    this.bob?.setScale(1);
    this.bob?.setAlpha(1);
  }

  // --- 振り子 ---

  private updatePendulum(now: number): void {
    const phaseIdx = Math.min(this.damageTaken, BOSS_PENDULUM_OMEGA_BY_PHASE.length - 1);
    const omega = BOSS_PENDULUM_OMEGA_BY_PHASE[phaseIdx];
    const pos = pendulumPosition(now - this.attackStartedAt, {
      pivotX: this.arena.pivotX,
      pivotY: BOSS_PENDULUM_PIVOT_Y,
      length: BOSS_PENDULUM_LENGTH,
      ampRad: BOSS_PENDULUM_AMP_RAD,
      omega
    });
    this.bob.setPosition(pos.x, pos.y);
    this.bob.setVelocity(0, 0);
    this.bob.setRotation(pos.theta);
    this.drawArm(pos.x, pos.y);
  }

  /** 非攻撃時: 錘を支点直下の高所に格納し、当たり判定を無効化する。 */
  private parkPendulum(): void {
    const parkY = BOSS_PENDULUM_PIVOT_Y + 36;
    this.bob.setPosition(this.arena.pivotX, parkY);
    this.bob.setVelocity(0, 0);
    this.bob.setRotation(0);
    this.disableBob();
    this.drawArm(this.arena.pivotX, parkY);
  }

  private disableBob(): void {
    const body = this.bob?.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) body.enable = false;
  }

  private drawArm(bobX: number, bobY: number): void {
    if (!this.arm) return;
    this.arm.clear();
    this.arm.lineStyle(5, BOSS_CLOCK_BRASS_DARK, 1);
    this.arm.lineBetween(this.arena.pivotX, BOSS_PENDULUM_PIVOT_Y, bobX, bobY);
    this.arm.lineStyle(2, BOSS_CLOCK_BRASS, 1);
    this.arm.lineBetween(this.arena.pivotX, BOSS_PENDULUM_PIVOT_Y, bobX, bobY);
  }

  // --- 落下歯車 ---

  private maybeSpawnGearRain(now: number): void {
    if (now - this.lastGearRainAt < BOSS_GEAR_RAIN_INTERVAL_MS) return;
    if (this.gearRain.countActive(true) >= BOSS_GEAR_RAIN_MAX) return;
    this.lastGearRainAt = now;

    const x = Phaser.Math.Between(this.arena.leftBound, this.arena.rightBound);
    const gear = this.gearRain.create(x, 40, TEX_KEY.bossGear) as Phaser.Physics.Arcade.Sprite;
    gear.setDepth(2);
    const body = gear.body as Phaser.Physics.Arcade.Body;
    const offset = (BOSS_GEAR_RAIN_SIZE - BOSS_GEAR_RAIN_BODY) / 2;
    body.setCircle(BOSS_GEAR_RAIN_BODY / 2, offset, offset);
    gear.setVelocityY(BOSS_GEAR_RAIN_VY);
    gear.setAngularVelocity(180);
  }

  /** 床より下に達した落下歯車を破棄する（リーク防止）。 */
  private cullGearRain(): void {
    const toRemove: Phaser.Physics.Arcade.Sprite[] = [];
    this.gearRain.children.iterate((child) => {
      const gear = child as Phaser.Physics.Arcade.Sprite;
      if (gear.active && gear.y > this.arena.floorTopY) toRemove.push(gear);
      return true;
    });
    for (const gear of toRemove) gear.destroy();
  }
}

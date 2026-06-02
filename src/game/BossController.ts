import Phaser from 'phaser';
import {
  TEX_KEY,
  BOSS_MAX_HP,
  BOSS_INTRO_MS,
  BOSS_ATTACK_MS,
  BOSS_VULN_MS,
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
  BOSS_CORE_SIZE,
  BOSS_CORE_BODY,
  BOSS_CORE_HIDDEN_Y,
  BOSS_CORE_EXPOSED_Y,
  BOSS_CORE_MOVE_MS,
  BOSS_CORE_PULSE_MS,
  BOSS_CORE_TINT,
  BOSS_CLOCK_BRASS,
  BOSS_CLOCK_BRASS_DARK
} from '../config/gameConfig';

export type BossState = 'intro' | 'attack' | 'vulnerable' | 'defeated';

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
 * ボス「グランドファーザー」の状態機械・攻撃・弱点コアを駆動する（design §コンポーネント2）。
 * 可動物（振り子の錘・弱点コア・落下歯車）を生成・保持し、踏みつけ被ダメージは BossScene 側で
 * 判定して `hit()` を呼ぶ。プレイヤーへの加害（被弾）判定も BossScene の overlap 登録に委ねる。
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
  private corePulse: Phaser.Tweens.Tween | null = null;
  private coreMoveTween: Phaser.Tweens.Tween | null = null;

  /** 振り子の錘（攻撃中に床を薙ぐ）。BossScene が overlap 登録する。 */
  bob!: Phaser.Physics.Arcade.Sprite;
  /** 弱点コア（踏みつけ対象）。 */
  core!: Phaser.Physics.Arcade.Sprite;
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

    // 弱点コア（光る歯車。tint で発光）
    this.core = this.scene.physics.add.sprite(this.arena.pivotX, BOSS_CORE_HIDDEN_Y, TEX_KEY.bossCore);
    this.core.setDepth(2);
    this.core.setTint(BOSS_CORE_TINT);
    const coreBody = this.core.body as Phaser.Physics.Arcade.Body;
    coreBody.setAllowGravity(false);
    const coreOffset = (BOSS_CORE_SIZE - BOSS_CORE_BODY) / 2;
    coreBody.setCircle(BOSS_CORE_BODY / 2, coreOffset, coreOffset);
    coreBody.enable = false;

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

  /** 弱点が露出中か（踏みつけでダメージが入る窓）。 */
  get isVulnerable(): boolean {
    return this.state === 'vulnerable';
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
        if (now >= this.stateUntil) this.enterVulnerable(now);
        break;
      case 'vulnerable':
        this.parkPendulum();
        this.cullGearRain();
        if (now >= this.stateUntil) this.enterAttack(now);
        break;
      case 'defeated':
        this.parkPendulum();
        this.cullGearRain();
        break;
    }
  }

  /**
   * 弱点コアへの踏みつけ成立時に呼ぶ。露出窓のときのみ HP を減らす。
   * 撃破したら true を返す。
   */
  hit(): boolean {
    if (this.state !== 'vulnerable') return false;
    this.damageTaken += 1;
    this.hp = Math.max(0, this.hp - 1);
    this.callbacks.onHpChanged(this.hp, BOSS_MAX_HP);

    if (this.hp <= 0) {
      this.enterDefeated();
      this.callbacks.onDefeated();
      return true;
    }
    // 生存: コアを格納して攻撃フェーズへ（小休止を与える）。
    this.enterAttack(this.scene.time.now);
    return true;
  }

  destroy(): void {
    // tween を止めて破棄中オブジェクトへのコールバック発火を防ぐ。
    // 可動物（arm/bob/core/gearRain）の破棄は Phaser のシーン shutdown が担う。
    // ここで gearRain.clear/destroy を呼ぶと、物理ワールドの shutdown と競合して
    // 例外（undefined.size）でゲームループが落ちるため、明示破棄はしない。
    this.corePulse?.stop();
    this.coreMoveTween?.stop();
    this.corePulse = null;
    this.coreMoveTween = null;
  }

  // --- 状態遷移 ---

  private enterIntro(now: number): void {
    this.state = 'intro';
    this.stateUntil = now + BOSS_INTRO_MS;
    this.disableBob();
    this.retractCore();
  }

  private enterAttack(now: number): void {
    this.state = 'attack';
    this.attackStartedAt = now;
    this.stateUntil = now + BOSS_ATTACK_MS;
    this.lastGearRainAt = now;
    this.retractCore();
    const bobBody = this.bob.body as Phaser.Physics.Arcade.Body;
    bobBody.enable = true;
  }

  private enterVulnerable(now: number): void {
    this.state = 'vulnerable';
    this.stateUntil = now + BOSS_VULN_MS;
    this.disableBob();
    this.exposeCore();
  }

  private enterDefeated(): void {
    this.state = 'defeated';
    this.disableBob();
    this.retractCore();
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

  // --- 弱点コア ---

  private exposeCore(): void {
    this.coreMoveTween?.stop();
    this.corePulse?.stop();
    this.core.setScale(1);
    const body = this.core.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    this.coreMoveTween = this.scene.tweens.add({
      targets: this.core,
      y: BOSS_CORE_EXPOSED_Y,
      duration: BOSS_CORE_MOVE_MS,
      ease: 'Quad.easeOut'
    });
    this.corePulse = this.scene.tweens.add({
      targets: this.core,
      scaleX: 1.14,
      scaleY: 1.14,
      duration: BOSS_CORE_PULSE_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private retractCore(): void {
    this.corePulse?.stop();
    this.corePulse = null;
    this.coreMoveTween?.stop();
    this.core.setScale(1);
    const body = this.core?.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) body.enable = false;
    this.coreMoveTween = this.scene.tweens.add({
      targets: this.core,
      y: BOSS_CORE_HIDDEN_Y,
      duration: BOSS_CORE_MOVE_MS,
      ease: 'Quad.easeIn'
    });
  }
}

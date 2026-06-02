import Phaser from 'phaser';
import {
  ANIM_KEY,
  TEX_KEY,
  TILE_SIZE,
  BG_BASE_COLOR,
  PLAYER_SPRITE_W,
  PLAYER_SPRITE_H,
  STAGE_FADE_MS,
  INITIAL_LIVES,
  MAX_LIVES,
  MIN_LIVES,
  MISS_FLASH_COLOR,
  MISS_FLASH_MS,
  PLAYER_HIT_KNOCKBACK_VY,
  PLAYER_DEATH_BOUNCE_VY,
  PLAYER_DEATH_FALL_MS,
  STOMP_BOUNCE_VELOCITY,
  HITSTOP_MS,
  FALL_THRESHOLD_Y,
  BGM_FADE_OUT_MS,
  GAME_OVER_TEXT,
  GAME_OVER_COLOR,
  GAME_OVER_FONT_SIZE,
  GAME_OVER_STROKE_THICKNESS,
  GAME_OVER_TO_TITLE_DELAY_MS,
  PROMPT_TITLE_TEXT,
  INSTRUCTION_TEXT,
  STAGE_CLEAR_COLOR,
  BOSS_ARENA_COLS,
  BOSS_ARENA_ROWS,
  BOSS_SPAWN_COL,
  BOSS_PENDULUM_PIVOT_Y,
  BOSS_CLOCK_BRASS,
  BOSS_CLOCK_BRASS_DARK,
  BOSS_CLOCK_FACE,
  BOSS_CLOCK_FACE_GLOW,
  BOSS_CLOCK_HAND,
  BOSS_CLOCK_FACE_Y,
  BOSS_CLOCK_FACE_RADIUS,
  BOSS_DEFEAT_SHAKE_MS,
  BOSS_DEFEAT_SHAKE_INTENSITY,
  BOSS_DEFEAT_TO_ENDING_MS,
  BOSS_INTRO_TEXT,
  BOSS_INTRO_TEXT_COLOR,
  CENTER_MSG_FONT_SIZE
} from '../config/gameConfig';
import { STAGES as STAGE_LIST } from '../stages/index';
import { AudioManager } from '../audio/AudioManager';
import { HudManager } from '../game/HudManager';
import { ParticleManager } from '../game/ParticleManager';
import { TouchController, type TouchHost } from '../game/TouchController';
import { PlayerController, type InputState } from '../game/PlayerController';
import { PowerUpManager } from '../game/PowerUpManager';
import { BossController } from '../game/BossController';
import { BossHpBar } from '../game/BossHpBar';
import { registerAnimations } from './animations';

interface BossInitData {
  gearsCollected?: number;
  gearsTotal?: number;
  lives?: number;
}

/**
 * 最後のボス戦シーン（20260602-final-boss）。stage03 クリア後に GameScene から起動され、
 * ボス「グランドファーザー」を撃破すると EndingScene へ遷移する。
 * 単一画面の固定アリーナ（カメラはアリーナ全体が収まるよう固定ズーム）。
 */
export class BossScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private restartKey!: Phaser.Input.Keyboard.Key;

  private worldWidth = 0;
  private worldHeight = 0;
  private spawnX = 0;
  private spawnY = 0;

  private isMissed = false;
  private isBossDefeated = false;

  private lives = INITIAL_LIVES;
  private gearsCollected = 0;
  private gearsTotal = 0;

  private audio!: AudioManager;
  private hud!: HudManager;
  private hpBar!: BossHpBar;
  private particles!: ParticleManager;
  private touch!: TouchController;
  private playerController!: PlayerController;
  private powerUps!: PowerUpManager;
  private boss!: BossController;

  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private bgOverlay!: Phaser.GameObjects.Image;
  /** 大時計（ボス本体）の Graphics。撃破演出でフェード崩壊させるため保持する。 */
  private bossClock!: Phaser.GameObjects.Graphics;
  private playerGroundCollider: Phaser.Physics.Arcade.Collider | null = null;
  private pendingAdvance: (() => void) | null = null;

  constructor() {
    super('BossScene');
  }

  init(data: BossInitData): void {
    const incomingLives = data?.lives ?? INITIAL_LIVES;
    this.lives = Math.min(MAX_LIVES, Math.max(MIN_LIVES, Number.isFinite(incomingLives) ? Math.floor(incomingLives) : INITIAL_LIVES));
    const c = Number(data?.gearsCollected);
    const t = Number(data?.gearsTotal);
    this.gearsCollected = Number.isFinite(c) && c >= 0 ? Math.floor(c) : 0;
    this.gearsTotal = Number.isFinite(t) && t >= 0 ? Math.floor(t) : 0;
  }

  private get isInvincible(): boolean {
    return this.powerUps?.isInvincible ?? false;
  }

  create(): void {
    this.isMissed = false;
    this.isBossDefeated = false;
    this.pendingAdvance = null;
    this.playerGroundCollider = null;

    this.worldWidth = BOSS_ARENA_COLS * TILE_SIZE;
    this.worldHeight = BOSS_ARENA_ROWS * TILE_SIZE;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.cameras.main.setBackgroundColor(BG_BASE_COLOR);

    // 背景（GameScene と同じワークショップ夜景 + オーバーレイ）
    this.add.tileSprite(0, 0, this.worldWidth * 2, this.worldHeight * 2, TEX_KEY.bgTile)
      .setOrigin(0, 0)
      .setScrollFactor(0.15)
      .setDepth(-10);
    this.bgOverlay = this.add.image(0, 0, TEX_KEY.bgOverlay)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(-9);

    this.buildArena();
    this.drawBossClock();

    // プレイヤー
    this.player = this.physics.add.sprite(this.spawnX, this.spawnY, TEX_KEY.playerSheet, 'idle');
    this.player.setCollideWorldBounds(true);
    this.setupPlayerSize();

    registerAnimations(this);
    this.player.anims.play(ANIM_KEY.playerIdle, true);

    this.powerUps = new PowerUpManager(this, this.player);

    // ボス
    const pivotX = this.worldWidth / 2;
    const floorTopY = (BOSS_ARENA_ROWS - 1) * TILE_SIZE;
    this.boss = new BossController(
      this,
      {
        pivotX,
        floorTopY,
        leftBound: 2 * TILE_SIZE,
        rightBound: this.worldWidth - 2 * TILE_SIZE
      },
      {
        onHpChanged: (hp, max) => this.hpBar.setHp(hp, max),
        onDefeated: () => this.onBossDefeated()
      }
    );
    this.boss.build();

    // 衝突登録
    this.playerGroundCollider = this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.boss.gearRain, this.ground, (gear) => {
      // 物理ステップ中の即時 destroy はグループ走査と衝突して不安定なため、
      // disableBody で無効化し destroy は次フレームへ遅延する（EnemyManager.explode と同方針）。
      const sprite = gear as Phaser.Physics.Arcade.Sprite;
      sprite.disableBody(true, false);
      this.time.delayedCall(0, () => sprite.destroy());
    });
    this.physics.add.overlap(this.player, this.boss.bob, this.onBobOverlap, undefined, this);
    this.physics.add.overlap(this.player, this.boss.gearRain, this.onGearRainOverlap, undefined, this);

    // 入力
    if (!this.input.keyboard) {
      throw new Error('Keyboard input plugin is not available');
    }
    this.cursors = this.input.keyboard.createCursorKeys();
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.playerController = new PlayerController(this.player, {
      onJump: () => this.audio.playSe('jump'),
      onLand: (_fallVelocity, x, y) => {
        this.audio.playSe('land');
        this.particles.dust(x, y);
      }
    });

    // HUD（ライフ）＋ ボス HP バー
    this.hud = new HudManager(this);
    this.hud.build();
    this.hud.setStage(STAGE_LIST.length - 1, STAGE_LIST.length); // 最終ステージ扱い（3 / 3）
    this.hud.setGear(this.gearsCollected, this.gearsTotal);
    this.hud.setLives(this.lives);

    this.hpBar = new BossHpBar(this);
    this.hpBar.build(this.boss.maxHp);

    this.particles = new ParticleManager(this);

    // カメラ: アリーナ全体が収まる固定ズーム
    this.layoutView();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutView, this);

    this.input.addPointer(2);
    const self = this;
    const touchHost: TouchHost = {
      get isMissed() { return self.isMissed; },
      get isCleared() { return self.isBossDefeated; },
      unlockAudio: () => self.audio.unlock()
    };
    this.touch = new TouchController(this, touchHost);
    this.touch.start();

    this.audio = new AudioManager();
    this.input.keyboard.once('keydown', () => this.audio.unlock());
    this.audio.startBgm();

    this.events.once('shutdown', () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutView, this);
      this.physics.world.timeScale = 1; // スロー演出中の遷移に備えて必ず復帰
      this.audio.destroy();
      this.touch.destroy();
      this.powerUps.destroy();
      this.boss.destroy();
      this.hpBar.destroy();
    });

    this.hud.showInstruction(INSTRUCTION_TEXT);
    this.showIntroBanner();

    this.cameras.main.fadeIn(STAGE_FADE_MS);
    this.boss.start(this.time.now);
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.fullRestart();
      return;
    }

    if (this.isMissed || this.isBossDefeated) {
      this.player.setVelocityX(0);
      if (this.pendingAdvance) {
        const keyAdvance =
          (this.cursors.space ? Phaser.Input.Keyboard.JustDown(this.cursors.space) : false) ||
          (this.cursors.up ? Phaser.Input.Keyboard.JustDown(this.cursors.up) : false);
        if (keyAdvance || this.touch.consumeAdvanceTap()) {
          this.firePendingAdvance();
        }
      }
      return;
    }

    const input: InputState = {
      left: (this.cursors.left?.isDown ?? false) || this.touch.isLeft,
      right: (this.cursors.right?.isDown ?? false) || this.touch.isRight,
      jumpHeld:
        (this.cursors.space?.isDown ?? false) ||
        (this.cursors.up?.isDown ?? false) ||
        this.touch.isJumpHeld,
      jumpJustPressed:
        (this.cursors.space ? Phaser.Input.Keyboard.JustDown(this.cursors.space) : false) ||
        (this.cursors.up ? Phaser.Input.Keyboard.JustDown(this.cursors.up) : false) ||
        this.touch.consumeJump()
    };
    this.playerController.update(this.time.now, input);

    this.boss.update(this.time.now);

    if (this.player.y > FALL_THRESHOLD_Y) {
      this.handleMiss('fall');
    }
  }

  // --- アリーナ構築 ---

  private buildArena(): void {
    this.ground = this.physics.add.staticGroup();
    const cols = BOSS_ARENA_COLS;
    const rows = BOSS_ARENA_ROWS;
    const place = (col: number, row: number) => {
      const tile = this.ground.create(
        col * TILE_SIZE + TILE_SIZE / 2,
        row * TILE_SIZE + TILE_SIZE / 2,
        TEX_KEY.ground
      ) as Phaser.Physics.Arcade.Sprite;
      tile.setDisplaySize(TILE_SIZE, TILE_SIZE);
      tile.refreshBody();
    };
    // 床（最下段）
    for (let c = 0; c < cols; c++) place(c, rows - 1);
    // 左右の壁（プレイヤーをアリーナ内に閉じ込める）
    for (let r = 0; r < rows - 1; r++) {
      place(0, r);
      place(cols - 1, r);
    }

    this.spawnX = BOSS_SPAWN_COL * TILE_SIZE + TILE_SIZE / 2;
    this.spawnY = (rows - 1) * TILE_SIZE - PLAYER_SPRITE_H / 2;
  }

  /** 大時計（ボス本体）を Graphics で描く。可動物・プレイヤーの背面（depth -5）。 */
  private drawBossClock(): void {
    const g = this.bossClock = this.add.graphics().setDepth(-5);
    const cx = this.worldWidth / 2;
    const fy = BOSS_CLOCK_FACE_Y;
    const R = BOSS_CLOCK_FACE_RADIUS;

    // 支点の留め具（振り子の吊り元）
    g.fillStyle(BOSS_CLOCK_BRASS_DARK, 1);
    g.fillCircle(cx, BOSS_PENDULUM_PIVOT_Y, 12);
    g.fillStyle(BOSS_CLOCK_BRASS, 1);
    g.fillCircle(cx, BOSS_PENDULUM_PIVOT_Y, 7);

    // 文字盤の外枠（真鍮の二重リング）
    g.fillStyle(BOSS_CLOCK_BRASS_DARK, 1);
    g.fillCircle(cx, fy, R + 10);
    g.fillStyle(BOSS_CLOCK_BRASS, 1);
    g.fillCircle(cx, fy, R + 4);
    // 文字盤（沈んだ暗色＝敵対的）
    g.fillStyle(BOSS_CLOCK_FACE, 1);
    g.fillCircle(cx, fy, R);

    // 赤い眼光（左右）— 不気味さの識別点
    g.fillStyle(BOSS_CLOCK_FACE_GLOW, 0.9);
    g.fillCircle(cx - R * 0.4, fy - R * 0.2, R * 0.16);
    g.fillCircle(cx + R * 0.4, fy - R * 0.2, R * 0.16);
    // 怒り眉
    g.lineStyle(5, BOSS_CLOCK_BRASS, 1);
    g.lineBetween(cx - R * 0.62, fy - R * 0.5, cx - R * 0.18, fy - R * 0.28);
    g.lineBetween(cx + R * 0.62, fy - R * 0.5, cx + R * 0.18, fy - R * 0.28);

    // 時刻マーカー
    g.lineStyle(3, BOSS_CLOCK_BRASS, 0.9);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const r1 = R - 4;
      const r2 = R - (i % 3 === 0 ? 16 : 10);
      g.lineBetween(cx + Math.cos(a) * r1, fy + Math.sin(a) * r1, cx + Math.cos(a) * r2, fy + Math.sin(a) * r2);
    }

    // 針（X 字に開いた牙のような配置）
    g.lineStyle(5, BOSS_CLOCK_HAND, 1);
    g.lineBetween(cx, fy, cx - R * 0.5, fy + R * 0.5);
    g.lineBetween(cx, fy, cx + R * 0.5, fy + R * 0.5);
    g.fillStyle(BOSS_CLOCK_HAND, 1);
    g.fillCircle(cx, fy, 5);
  }

  private setupPlayerSize(): void {
    this.player.setDisplaySize(PLAYER_SPRITE_W, PLAYER_SPRITE_H);
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    body?.setSize(PLAYER_SPRITE_W, PLAYER_SPRITE_H);
    body?.updateFromGameObject();
    this.player.clearTint();
  }

  /** カメラズーム・中央寄せ・HUD/HP バー・オーバーレイをまとめて再配置する。 */
  private layoutView(): void {
    const cam = this.cameras.main;
    const zoom = Math.min(this.scale.width / this.worldWidth, this.scale.height / this.worldHeight);
    cam.setZoom(zoom);
    cam.centerOn(this.worldWidth / 2, this.worldHeight / 2);

    this.bgOverlay.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.bgOverlay.setDisplaySize(this.scale.width / zoom + 4, this.scale.height / zoom + 4);

    this.hud?.layout();
    this.hpBar?.layout();
  }

  // --- 衝突コールバック ---

  /**
   * 振り子の錘との接触。上から踏めばボスにダメージ、横/下からなら被弾（敵踏みと同型, 20260603）。
   */
  private onBobOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_player, bob) => {
    if (this.isMissed || this.isBossDefeated) return;
    // 攻撃中のみ踏みつけ判定が成立する（stagger/intro は body 無効なので原則発火しない）。
    const bobSprite = bob as Phaser.Physics.Arcade.Sprite;
    const pBody = this.player.body as Phaser.Physics.Arcade.Body;
    const bBody = bobSprite.body as Phaser.Physics.Arcade.Body;
    const onTop = pBody.center.y <= bBody.center.y;
    const isStomp = onTop && pBody.velocity.y > 0;

    if (isStomp && this.boss.isAttacking) {
      this.particles.burstEnemy(bobSprite.x, bobSprite.y);
      this.player.setVelocityY(STOMP_BOUNCE_VELOCITY);
      this.audio.playSe('stomp');
      this.applyHitstop();
      this.boss.hit();
      return;
    }

    if (this.isInvincible) return;
    this.handleMiss('enemy');
  };

  private onGearRainOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_player, gear) => {
    if (this.isMissed || this.isBossDefeated) return;
    // 無敵中は歯車を消費しない（onBobOverlap / GameScene.onEnemyOverlap と対称）。
    if (this.isInvincible) return;
    const sprite = gear as Phaser.Physics.Arcade.Sprite;
    sprite.disableBody(true, false);
    this.time.delayedCall(0, () => sprite.destroy());
    this.handleMiss('enemy');
  };

  // --- 被弾 / ライフ ---

  private handleMiss(reason: 'fall' | 'enemy'): void {
    if (this.isMissed || this.isBossDefeated) return;
    if (this.isInvincible && reason === 'enemy') return;

    // 残ライフがあれば、その場で 1 ライフ消費して無敵 + ノックバックで復帰。
    if (reason === 'enemy' && this.lives > MIN_LIVES + 1) {
      this.lives -= 1;
      this.hud.setLives(this.lives);
      this.powerUps.startInvincible();
      this.player.setVelocityY(PLAYER_HIT_KNOCKBACK_VY);
      this.audio.playSe('miss');
      return;
    }

    this.isMissed = true;
    this.audio.playSe('miss');

    if (reason === 'enemy') {
      this.playPlayerDeathAnimation();
      this.time.delayedCall(PLAYER_DEATH_FALL_MS, () => this.decrementLifeAndContinue(), [], this);
    } else {
      this.player.setTint(MISS_FLASH_COLOR);
      this.player.setVelocity(0, 0);
      this.decrementLifeAndContinue();
    }
  }

  private playPlayerDeathAnimation(): void {
    this.playerGroundCollider?.destroy();
    this.playerGroundCollider = null;
    this.player.setFlipY(true);
    this.player.anims.play(ANIM_KEY.playerJump, true);
    this.player.setVelocity(0, PLAYER_DEATH_BOUNCE_VY);
  }

  private decrementLifeAndContinue(): void {
    this.lives = Math.max(MIN_LIVES, this.lives - 1);
    this.hud.setLives(this.lives);
    if (this.lives <= 0) {
      this.showGameOver();
    } else {
      this.time.delayedCall(MISS_FLASH_MS, () => this.fullRestart(), [], this);
    }
  }

  private applyHitstop(): void {
    if (this.physics.world.isPaused) return;
    this.physics.world.pause();
    this.time.delayedCall(HITSTOP_MS, () => this.physics.world.resume());
  }

  // --- 撃破 / 遷移 ---

  private onBossDefeated(): void {
    if (this.isBossDefeated) return;
    this.isBossDefeated = true;
    this.playerController.setControlEnabled(false);
    this.player.setVelocity(0, 0);
    this.audio.stopBgm(BGM_FADE_OUT_MS);

    // 決着の溜め: 一瞬の白フラッシュ + 物理スローモーション（必ず 1.0 へ復帰させる）。
    // ※ this.time.timeScale は絞らない（タイマー/トゥイーン/リセットまで遅延し不安定になるため）。
    //   Arcade Physics は timeScale が大きいほど遅くなる（実質「逆数」的）。
    this.cameras.main.flash(260, 255, 255, 255);
    this.physics.world.timeScale = 2.2;
    this.time.delayedCall(600, () => {
      this.physics.world.timeScale = 1;
    });

    this.cameras.main.shake(BOSS_DEFEAT_SHAKE_MS, BOSS_DEFEAT_SHAKE_INTENSITY);

    // 振り子の落下と大時計のフェード崩壊。
    this.boss.collapse();
    this.tweens.add({
      targets: this.bossClock,
      alpha: 0,
      duration: 1300,
      delay: 400,
      ease: 'Quad.easeIn'
    });

    // 大時計の崩壊バースト（中心で複数回・拡散を増やして盛り上げる）。
    const cx = this.worldWidth / 2;
    for (let i = 0; i < 9; i++) {
      this.time.delayedCall(i * 150, () => {
        this.particles.burstExplosion(
          cx + Phaser.Math.Between(-90, 90),
          BOSS_CLOCK_FACE_Y + Phaser.Math.Between(-60, 60)
        );
        this.audio.playSe('explode');
      });
    }
    this.particles.celebrate(this.player.x, this.player.y - 20);
    this.hud.showCenterMessage('VICTORY!', { color: STAGE_CLEAR_COLOR });

    this.pendingAdvance = () => this.goToEnding();
    this.time.delayedCall(BOSS_DEFEAT_TO_ENDING_MS, () => this.firePendingAdvance(), [], this);
  }

  private goToEnding(): void {
    this.cameras.main.fadeOut(STAGE_FADE_MS, 0, 0, 0);
    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      this.teardownPhysics();
      this.scene.start('EndingScene', {
        gearsCollected: this.gearsCollected,
        gearsTotal: this.gearsTotal
      });
    };
    this.cameras.main.once('camerafadeoutcomplete', go);
    this.time.delayedCall(STAGE_FADE_MS + 200, go);
  }

  private showGameOver(): void {
    this.hud.showCenterMessage(GAME_OVER_TEXT, {
      color: GAME_OVER_COLOR,
      fontSize: GAME_OVER_FONT_SIZE,
      strokeThickness: GAME_OVER_STROKE_THICKNESS
    });
    this.hud.showPrompt(PROMPT_TITLE_TEXT);
    this.audio.stopBgm(BGM_FADE_OUT_MS);
    this.pendingAdvance = () => this.restartFromTop();
    this.time.delayedCall(GAME_OVER_TO_TITLE_DELAY_MS, () => this.firePendingAdvance(), [], this);
  }

  private firePendingAdvance(): void {
    const fn = this.pendingAdvance;
    this.pendingAdvance = null;
    fn?.();
  }

  private teardownPhysics(): void {
    this.physics.world.colliders.destroy();
  }

  private fullRestart(): void {
    this.teardownPhysics();
    this.scene.restart({
      lives: this.lives,
      gearsCollected: this.gearsCollected,
      gearsTotal: this.gearsTotal
    });
  }

  private restartFromTop(): void {
    this.teardownPhysics();
    this.scene.start('TitleScene');
  }

  private showIntroBanner(): void {
    // 登場演出: 番人の鐘（チャイム）＋ 軽い地響き（カメラ揺れ）＋ 一瞬の赤フラッシュ。
    this.audio.playSe('beacon');
    this.cameras.main.shake(360, 0.008);
    this.cameras.main.flash(420, 90, 10, 10);

    const banner = this.hud.showCenterMessage(BOSS_INTRO_TEXT, {
      color: BOSS_INTRO_TEXT_COLOR,
      fontSize: CENTER_MSG_FONT_SIZE
    });
    this.tweens.add({
      targets: banner,
      alpha: { from: 1, to: 0 },
      delay: 1200,
      duration: 600,
      onComplete: () => banner.destroy()
    });
  }
}

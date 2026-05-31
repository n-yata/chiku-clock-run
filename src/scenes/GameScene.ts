import Phaser from 'phaser';
import {
  ALL_CLEAR_TO_TITLE_DELAY_MS,
  ANIM_KEY,
  BGM_FADE_OUT_MS,
  GEAR_BIT_SPRITE_H,
  GEAR_BIT_SPRITE_W,
  ENEMY_SPEED,
  ENEMY_SPRITE_H,
  FALL_THRESHOLD_Y,
  GAME_OVER_TEXT,
  GAME_OVER_TO_TITLE_DELAY_MS,
  BEACON_SPRITE_H,
  BEACON_SPRITE_W,
  INITIAL_LIVES,
  MAX_LIVES,
  MIN_LIVES,
  MISS_FLASH_COLOR,
  MISS_FLASH_MS,
  PLAYER_HIT_KNOCKBACK_VY,
  PLAYER_SPRITE_H,
  PLAYER_SPRITE_W,
  STAGE_CLEAR_DELAY_MS,
  STAGE_FADE_MS,
  STAGE_INDEX_STORAGE_KEY,
  STOMP_BOUNCE_VELOCITY,
  PLAYER_DEATH_BOUNCE_VY,
  PLAYER_DEATH_FALL_MS,
  TEX_KEY,
  BG_BASE_COLOR,
  TILE_SIZE,
  USE_HARD_RELOAD_FALLBACK,
  INSTRUCTION_TEXT,
  STAGE_CLEAR_COLOR,
  ALL_CLEAR_COLOR,
  ALL_CLEAR_SUFFIX,
  GAME_OVER_FONT_SIZE,
  GAME_OVER_COLOR,
  GAME_OVER_STROKE_THICKNESS,
  PROMPT_NEXT_TEXT,
  PROMPT_TITLE_TEXT,
  HITSTOP_MS
} from '../config/gameConfig';
import { AudioManager } from '../audio/AudioManager';
import { getStage, nextStageIndex, STAGES, type StageDefinition } from '../stages/index';
import { registerAnimations } from './animations';
import { CameraController } from '../game/CameraController';
import { HudManager } from '../game/HudManager';
import { ParticleManager } from '../game/ParticleManager';
import { TouchController, type TouchHost } from '../game/TouchController';
import { PlayerController, type InputState } from '../game/PlayerController';
import { EnemyManager } from '../game/EnemyManager';
import { PowerUpManager } from '../game/PowerUpManager';
import { CollisionHandler } from '../game/CollisionHandler';
import { GameEvents, type PointPayload } from '../game/events';

interface BuiltStage {
  ground: Phaser.Physics.Arcade.StaticGroup;
  goal: Phaser.Physics.Arcade.Sprite;
  spawnX: number;
  spawnY: number;
  enemies: Phaser.Physics.Arcade.Group;
  gearBits: Phaser.Physics.Arcade.StaticGroup;
  gearBitTotal: number;
  groundMask: ReadonlyArray<ReadonlyArray<boolean>>;
}

type EnemyDir = -1 | 1;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private spawnX = 0;
  private spawnY = 0;
  private isCleared = false;
  private isMissed = false;

  private enemies!: Phaser.Physics.Arcade.Group;
  private gearBits!: Phaser.Physics.Arcade.StaticGroup;
  private gearBitTotal = 0;
  private gearBitsCollected = 0;
  private groundMask: ReadonlyArray<ReadonlyArray<boolean>> = [];
  private audio!: AudioManager;

  private camera!: CameraController;
  private hud!: HudManager;
  private bgOverlay!: Phaser.GameObjects.Image;
  private playerJuice?: Phaser.Tweens.Tween;
  // juice の基準スケール（displaySize 確定時に更新）。squash/stretch は常にこの値へ戻す。
  private playerBaseScaleX = 1;
  private playerBaseScaleY = 1;
  private particles!: ParticleManager;
  private touch!: TouchController;
  private playerController!: PlayerController;

  private stageIndex = 0;
  private stage!: StageDefinition;
  private isAllCleared = false;

  private lives = INITIAL_LIVES;

  private playerGroundCollider: Phaser.Physics.Arcade.Collider | null = null;
  private enemyManager!: EnemyManager;
  private powerUps!: PowerUpManager;
  private collisions!: CollisionHandler;
  /** クリア / ゲームオーバー時の自動遷移を、タップ/キーで前倒しするためのワンショット。 */
  private pendingAdvance: (() => void) | null = null;

  constructor() {
    super('GameScene');
  }

  init(data: { stageIndex?: number; lives?: number }): void {
    const resolved = getStage(data?.stageIndex ?? 0);
    this.stageIndex = resolved.index;
    this.stage = resolved.stage;
    const incomingLives = data?.lives ?? INITIAL_LIVES;
    this.lives = Math.min(MAX_LIVES, Math.max(MIN_LIVES, Number.isFinite(incomingLives) ? Math.floor(incomingLives) : INITIAL_LIVES));
  }

  // --- E2E / 内部参照向けファサード（実体は PowerUpManager, D-004）---
  private get isInvincible(): boolean {
    return this.powerUps?.isInvincible ?? false;
  }

  create(): void {
    this.isCleared = false;
    this.isMissed = false;
    this.isAllCleared = false;
    this.gearBitsCollected = 0;
    this.playerGroundCollider = null;
    this.pendingAdvance = null;

    const stage = this.stage;
    const worldWidth = stage.cols * TILE_SIZE;
    const worldHeight = stage.rows * TILE_SIZE;

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    const built = this.buildStage(stage);
    this.spawnX = built.spawnX;
    this.spawnY = built.spawnY;
    this.enemies = built.enemies;
    this.gearBits = built.gearBits;
    this.gearBitTotal = built.gearBitTotal;
    this.groundMask = built.groundMask;

    // 遠景ベース（フラットな基調色。タイルの隙間や端を埋めて奥行きの土台にする）
    this.cameras.main.setBackgroundColor(BG_BASE_COLOR);

    // 背景タイル（ワークショップ夜景。パラックス視差 0.15 で遠景感を出す）
    this.add.tileSprite(0, 0, worldWidth * 2, worldHeight * 2, TEX_KEY.bgTile)
      .setOrigin(0, 0)
      .setScrollFactor(0.15)
      .setDepth(-10);

    // 明暗オーバーレイ（非タイル・画面固定）。ビネット + 暖色グローで世界観を付与（relayout で画面に合わせる）。
    this.bgOverlay = this.add.image(0, 0, TEX_KEY.bgOverlay)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(-9);

    this.player = this.physics.add.sprite(this.spawnX, this.spawnY, TEX_KEY.playerSheet, 'idle');
    this.player.setCollideWorldBounds(false);

    this.enemyManager = new EnemyManager(this, this.enemies, this.groundMask);
    this.powerUps = new PowerUpManager(this, this.player);

    this.collisions = new CollisionHandler(this, this);
    this.playerGroundCollider = this.collisions.register(
      {
        player: this.player,
        ground: built.ground,
        goal: built.goal,
        enemies: this.enemies,
        gearBits: this.gearBits
      },
      {
        onGoalHit: this.onGoalHit,
        onEnemyOverlap: this.onEnemyOverlap,
        onGearBitOverlap: this.onGearBitOverlap
      }
    );

    if (!this.input.keyboard) {
      throw new Error('Keyboard input plugin is not available');
    }
    this.cursors = this.input.keyboard.createCursorKeys();
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.camera = new CameraController(this, this.player, { w: worldWidth, h: worldHeight });
    this.camera.start();

    this.hud = new HudManager(this);
    this.hud.build();
    this.hud.setGear(this.gearBitsCollected, this.gearBitTotal);
    this.hud.setStage(this.stageIndex, STAGES.length);
    this.hud.setLives(this.lives);

    this.particles = new ParticleManager(this);
    // 敵撃破（踏みつけ）で消滅バーストを出す。
    this.events.on(GameEvents.EnemyKilled, (p: PointPayload) => {
      this.particles.burstEnemy(p.x, p.y);
    });

    this.playerController = new PlayerController(this.player, {
      onJump: () => {
        this.audio.playSe('jump');
        this.squashStretch(0.78, 1.24, 120); // 跳ね出しに縦伸び
      },
      onLand: (_fallVelocity, x, y) => {
        this.audio.playSe('land');
        this.particles.dust(x, y);
        this.squashStretch(1.26, 0.74, 130);  // 着地につぶれ
      }
    });

    const relayout = () => {
      this.camera.applyZoom();
      this.hud.layout();
      // オーバーレイを画面中央へ固定し、ズーム込みでビューポート全体を覆う。
      const zoom = this.cameras.main.zoom || 1;
      this.bgOverlay.setPosition(this.scale.width / 2, this.scale.height / 2);
      this.bgOverlay.setDisplaySize(this.scale.width / zoom + 4, this.scale.height / zoom + 4);
    };
    relayout();
    this.scale.on(Phaser.Scale.Events.RESIZE, relayout);

    this.input.addPointer(2);
    const self = this;
    const touchHost: TouchHost = {
      get isMissed() { return self.isMissed; },
      get isCleared() { return self.isCleared; },
      unlockAudio: () => self.audio.unlock()
    };
    this.touch = new TouchController(this, touchHost);
    this.touch.start();

    this.audio = new AudioManager();
    this.input.keyboard!.once('keydown', () => { this.audio.unlock(); });
    this.audio.startBgm();
    this.events.once('shutdown', () => {
      this.audio.destroy();
      this.touch.destroy();
      this.powerUps.destroy();
    });

    registerAnimations(this);
    this.player.anims.play(ANIM_KEY.playerIdle, true);

    this.setupPlayerSize();
    this.hud.showInstruction(INSTRUCTION_TEXT);

    this.camera.fadeIn(STAGE_FADE_MS);
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      if (this.isAllCleared) {
        this.restartFromTop();
      } else {
        this.fullRestart();
      }
      return;
    }

    if (this.isCleared || this.isMissed) {
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

    this.enemyManager.update();

    this.camera.update();

    if (this.player.y > FALL_THRESHOLD_Y) {
      this.handleMiss('fall');
    }
  }

  private buildStage(def: StageDefinition): BuiltStage {
    if (def.tiles.length !== def.rows) {
      throw new Error(`Stage ${def.id}: tiles.length ${def.tiles.length} !== rows ${def.rows}`);
    }
    let pCount = 0;
    let gCount = 0;
    let spawnCol = -1;
    let spawnRow = -1;
    let goalCol = -1;
    let goalRow = -1;
    const enemyPositions: Array<{ col: number; row: number }> = [];
    const gearBitPositions: Array<{ col: number; row: number }> = [];

    for (let r = 0; r < def.rows; r++) {
      const line = def.tiles[r];
      if (line.length !== def.cols) {
        throw new Error(`Stage ${def.id}: row ${r} length ${line.length} !== cols ${def.cols}`);
      }
      for (let c = 0; c < def.cols; c++) {
        const ch = line.charAt(c);
        if (ch === 'P') {
          pCount++;
          spawnCol = c;
          spawnRow = r;
        } else if (ch === 'G') {
          gCount++;
          goalCol = c;
          goalRow = r;
        } else if (ch === 'E') {
          enemyPositions.push({ col: c, row: r });
        } else if (ch === 'C') {
          gearBitPositions.push({ col: c, row: r });
        } else if (ch !== '.' && ch !== '#') {
          throw new Error(`Stage ${def.id}: unknown tile '${ch}' at row ${r} col ${c}`);
        }
      }
    }
    if (pCount !== 1) {
      throw new Error(`Stage ${def.id}: 'P' must appear exactly once (got ${pCount})`);
    }
    if (gCount !== 1) {
      throw new Error(`Stage ${def.id}: 'G' must appear exactly once (got ${gCount})`);
    }
    if (spawnCol > Math.floor(def.cols / 3)) {
      throw new Error(
        `Stage ${def.id}: spawn col ${spawnCol} must be within left third (< ${Math.floor(def.cols / 3)})`
      );
    }
    if (enemyPositions.length < 1 || enemyPositions.length > 8) {
      throw new Error(
        `Stage ${def.id}: 'E' count must be 1..8 (got ${enemyPositions.length})`
      );
    }
    if (gearBitPositions.length < 1 || gearBitPositions.length > 30) {
      throw new Error(
        `Stage ${def.id}: 'C' Gear Bit count must be 1..30 (got ${gearBitPositions.length})`
      );
    }
    // 'E' は地面の真上に置かないと出現直後に落下するため、buildStage 段階で弾く
    for (const p of enemyPositions) {
      const below = p.row + 1 < def.rows ? def.tiles[p.row + 1].charAt(p.col) : '.';
      if (below !== '#') {
        throw new Error(
          `Stage ${def.id}: 'E' at (${p.col},${p.row}) must have '#' directly below`
        );
      }
    }

    const ground = this.physics.add.staticGroup();
    for (let r = 0; r < def.rows; r++) {
      const line = def.tiles[r];
      for (let c = 0; c < def.cols; c++) {
        if (line.charAt(c) === '#') {
          // refreshBody() を明示的に呼んで static body のサイズ・位置を確実に再計算する。
          // scene 再起動時に画像テクスチャの寸法取得が遅延するケースの保険。
          const tile = ground.create(
            c * TILE_SIZE + TILE_SIZE / 2,
            r * TILE_SIZE + TILE_SIZE / 2,
            TEX_KEY.ground
          ) as Phaser.Physics.Arcade.Sprite;
          tile.setDisplaySize(TILE_SIZE, TILE_SIZE);
          tile.refreshBody();
        }
      }
    }

    // 'P' / 'G' タイルはスプライトの足元が乗るセルを表す。
    // スプライト下端 = (row + 1) * TILE_SIZE になるように中心 Y を逆算する。
    const goal = this.physics.add.staticSprite(
      goalCol * TILE_SIZE + TILE_SIZE / 2,
      (goalRow + 1) * TILE_SIZE - BEACON_SPRITE_H / 2,
      TEX_KEY.beacon
    );
    goal.setDisplaySize(BEACON_SPRITE_W, BEACON_SPRITE_H);
    goal.refreshBody();

    const groundMask = this.buildGroundMask(def);
    const enemies = this.buildEnemies(enemyPositions);
    const gearBitPair = this.buildGearBits(gearBitPositions);

    return {
      ground,
      goal,
      enemies,
      gearBits: gearBitPair.group,
      gearBitTotal: gearBitPair.total,
      groundMask,
      spawnX: spawnCol * TILE_SIZE + TILE_SIZE / 2,
      spawnY: (spawnRow + 1) * TILE_SIZE - PLAYER_SPRITE_H / 2
    };
  }

  private buildGroundMask(def: StageDefinition): boolean[][] {
    const mask: boolean[][] = [];
    for (let r = 0; r < def.rows; r++) {
      const row: boolean[] = [];
      const line = def.tiles[r];
      for (let c = 0; c < def.cols; c++) {
        row.push(line.charAt(c) === '#');
      }
      mask.push(row);
    }
    return mask;
  }

  private buildEnemies(
    positions: Array<{ col: number; row: number }>
  ): Phaser.Physics.Arcade.Group {
    const group = this.physics.add.group();
    for (const p of positions) {
      const cx = p.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = (p.row + 1) * TILE_SIZE - ENEMY_SPRITE_H / 2;
      const enemy = group.create(cx, cy, TEX_KEY.enemySheet, 'enemy_walk1') as Phaser.Physics.Arcade.Sprite;
      enemy.setData('dir', -1 satisfies EnemyDir);
      enemy.setVelocityX(-ENEMY_SPEED);
      enemy.anims.play(ANIM_KEY.winderWalk, true);
      enemy.setCollideWorldBounds(false);
    }
    return group;
  }

  private buildGearBits(
    positions: Array<{ col: number; row: number }>
  ): { group: Phaser.Physics.Arcade.StaticGroup; total: number } {
    const group = this.physics.add.staticGroup();
    for (const p of positions) {
      // 歯車片はタイル中心配置。中心対称・小サイズのため 'P'/'G' とは別ルール。
      const cx = p.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = p.row * TILE_SIZE + TILE_SIZE / 2;
      const gearBit = group.create(cx, cy, TEX_KEY.gearBit) as Phaser.Physics.Arcade.Sprite;
      gearBit.setDisplaySize(GEAR_BIT_SPRITE_W, GEAR_BIT_SPRITE_H);
      gearBit.refreshBody();
    }
    return { group, total: positions.length };
  }

  private onGearBitOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_player, gearBit) => {
    if (this.isCleared || this.isMissed) return;
    const sprite = gearBit as Phaser.Physics.Arcade.Sprite;
    this.particles.burstGear(sprite.x, sprite.y);
    sprite.disableBody(true, true);
    this.gearBitsCollected++;
    this.audio.playSe('gearBit');
    this.hud.setGear(this.gearBitsCollected, this.gearBitTotal);
  };

  private onEnemyOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_player, enemy) => {
    if (this.isCleared || this.isMissed) return;
    if (this.isInvincible) return;

    const pBody = this.player.body as Phaser.Physics.Arcade.Body;
    const eSprite = enemy as Phaser.Physics.Arcade.Sprite;
    const eBody = eSprite.body as Phaser.Physics.Arcade.Body;

    const isStomp = pBody.velocity.y > 0 && pBody.center.y <= eBody.center.y;
    if (isStomp) {
      this.enemyManager.kill(eSprite);
      this.player.setVelocityY(STOMP_BOUNCE_VELOCITY);
      this.audio.playSe('stomp');
      this.applyHitstop();
      return;
    }

    this.handleMiss('enemy');
  };

  private handleMiss(reason: 'fall' | 'enemy'): void {
    if (this.isMissed || this.isCleared) return;
    if (this.isInvincible && reason === 'enemy') return;

    // 敵被弾でまだライフが残る場合は、その場で 1 ライフ消費して無敵 + ノックバックで復帰する。
    if (reason === 'enemy' && this.lives > MIN_LIVES + 1) {
      this.lives -= 1;
      this.hud.setLives(this.lives);
      this.powerUps.startInvincible();
      this.player.setVelocityY(PLAYER_HIT_KNOCKBACK_VY);
      this.audio.playSe('miss');
      return;
    }

    // 致命（敵でライフが尽きる / 落下）。
    this.isMissed = true;
    this.audio.playSe('miss');

    if (reason === 'enemy') {
      this.playPlayerDeathAnimation();
      this.time.delayedCall(PLAYER_DEATH_FALL_MS, () => this.decrementLifeAndContinue(), [], this);
    } else {
      // 落下死: プレイヤーはすでに画面外のため即時処理
      this.player.setTint(MISS_FLASH_COLOR);
      this.player.setVelocity(0, 0);
      this.decrementLifeAndContinue();
    }
  }

  private fullRestart(): void {
    if (USE_HARD_RELOAD_FALLBACK) {
      try {
        sessionStorage.setItem(STAGE_INDEX_STORAGE_KEY, String(this.stageIndex));
      } catch { /* sessionStorage 利用不可時は無視 */ }
      window.location.reload();
      return;
    }
    this.teardownPhysics();
    this.scene.restart({ stageIndex: this.stageIndex, lives: this.lives });
  }

  private onGoalHit = (): void => {
    if (this.isCleared) return;
    this.isCleared = true;
    this.audio.playSe('beacon');
    this.audio.stopBgm(BGM_FADE_OUT_MS);
    this.player.setVelocity(0, 0);
    this.playerController.setControlEnabled(false);
    this.particles.celebrate(this.player.x, this.player.y);
    this.events.emit(GameEvents.Goal, { x: this.player.x, y: this.player.y });

    const next = nextStageIndex(this.stageIndex);
    if (next === null) {
      this.showAllClear();
      return;
    }

    this.showStageClear(next);
    this.time.delayedCall(STAGE_CLEAR_DELAY_MS, () => this.firePendingAdvance());
  };

  private showStageClear(nextIndex: number): void {
    this.hud.showCenterMessage(
      `STAGE ${this.stageIndex + 1} CLEAR!\n${this.hud.formatGear()}`,
      { color: STAGE_CLEAR_COLOR }
    );
    this.hud.showPrompt(PROMPT_NEXT_TEXT);
    this.pendingAdvance = () => {
      this.cameras.main.fadeOut(STAGE_FADE_MS, 0, 0, 0);
      let transitioned = false;
      const doTransition = () => {
        if (transitioned) return;
        transitioned = true;
        this.transitionToStage(nextIndex);
      };
      this.cameras.main.once('camerafadeoutcomplete', doTransition);
      // カメライベントが発火しない場合のセーフティタイマー
      this.time.delayedCall(STAGE_FADE_MS + 200, doTransition);
    };
  }

  private showAllClear(): void {
    this.isAllCleared = true;
    this.hud.showCenterMessage(
      `ALL CLEAR!\n${this.hud.formatGear()}\n${ALL_CLEAR_SUFFIX}`,
      { color: ALL_CLEAR_COLOR }
    );
    this.hud.showPrompt(PROMPT_TITLE_TEXT);
    this.pendingAdvance = () => this.restartFromTop();
    this.time.delayedCall(ALL_CLEAR_TO_TITLE_DELAY_MS, () => this.firePendingAdvance(), [], this);
  }

  private teardownPhysics(): void {
    this.physics.world.colliders.destroy();
    if (this.gearBits) this.gearBits.clear(true, true);
    if (this.enemies) this.enemies.clear(true, true);
  }

  private transitionToStage(index: number): void {
    if (USE_HARD_RELOAD_FALLBACK) {
      try {
        sessionStorage.setItem(STAGE_INDEX_STORAGE_KEY, String(index));
      } catch { /* sessionStorage 利用不可時は無視 */ }
      window.location.reload();
      return;
    }
    this.teardownPhysics();
    this.scene.restart({ stageIndex: index, lives: this.lives });
  }

  private restartFromTop(): void {
    if (USE_HARD_RELOAD_FALLBACK) {
      try {
        sessionStorage.setItem(STAGE_INDEX_STORAGE_KEY, '0');
      } catch { /* sessionStorage 利用不可時は無視 */ }
      window.location.reload();
      return;
    }
    this.teardownPhysics();
    this.scene.start('TitleScene');
  }

  /**
   * スクワッシュ&ストレッチ（juice）。基準スケール（playerBaseScale*）から相対的に変形し、
   * 開始前に必ず基準へリセットしてから tween する。これにより、前回の tween を途中で
   * stop() した残差を拾って累積する（着地のたびに潰れていく）バグを防ぐ。
   * yoyo で基準へ戻すため displaySize 依存の状態管理・E2E（displayHeight 検証）も壊さない。
   */
  private squashStretch(scaleXFactor: number, scaleYFactor: number, durationMs: number): void {
    this.playerJuice?.stop();
    const baseX = this.playerBaseScaleX;
    const baseY = this.playerBaseScaleY;
    this.player.setScale(baseX, baseY); // 中途半端なスケール残差を必ずリセット
    this.playerJuice = this.tweens.add({
      targets: this.player,
      scaleX: baseX * scaleXFactor,
      scaleY: baseY * scaleYFactor,
      duration: durationMs,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
  }

  /** プレイヤーの表示サイズ・物理ボディを通常サイズで確定し、juice の基準スケールを記録する。 */
  private setupPlayerSize(): void {
    this.playerJuice?.stop();
    this.player.setDisplaySize(PLAYER_SPRITE_W, PLAYER_SPRITE_H);
    this.playerBaseScaleX = this.player.scaleX;
    this.playerBaseScaleY = this.player.scaleY;
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    body?.setSize(PLAYER_SPRITE_W, PLAYER_SPRITE_H);
    body?.updateFromGameObject();
    this.player.clearTint();
  }

  /** 敵踏み時のヒットストップ。物理のみ一時停止し、描画/音には波及させない（design §11）。 */
  private applyHitstop(): void {
    if (this.physics.world.isPaused) return;
    this.physics.world.pause();
    this.time.delayedCall(HITSTOP_MS, () => {
      this.physics.world.resume();
    });
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

  /** pendingAdvance を一度だけ実行し、null に戻す。 */
  private firePendingAdvance(): void {
    const fn = this.pendingAdvance;
    this.pendingAdvance = null;
    fn?.();
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

}

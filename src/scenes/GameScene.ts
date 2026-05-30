import Phaser from 'phaser';
import {
  ALL_CLEAR_TO_TITLE_DELAY_MS,
  ANIM_KEY,
  BGM_FADE_OUT_MS,
  BIG_SCALE,
  GEAR_BIT_SPRITE_H,
  GEAR_BIT_SPRITE_W,
  ENEMY_SPEED,
  ENEMY_SPRITE_H,
  FALL_THRESHOLD_Y,
  PULSE_BOLT_BODY_H,
  PULSE_BOLT_BODY_W,
  PULSE_BOLT_BOUNCE_COUNT,
  PULSE_BOLT_BOUNCE_Y,
  PULSE_BOLT_COOLDOWN_MS,
  PULSE_BOLT_LIFETIME_MS,
  PULSE_BOLT_MAX_COUNT,
  PULSE_BOLT_SPEED_X,
  PULSE_BOLT_SPEED_Y,
  PULSE_BOLT_SPRITE_H,
  PULSE_BOLT_SPRITE_W,
  PULSE_CORE_SPRITE_H,
  PULSE_CORE_SPRITE_W,
  GAME_OVER_TEXT,
  GAME_OVER_TO_TITLE_DELAY_MS,
  BEACON_SPRITE_H,
  BEACON_SPRITE_W,
  HUD_PULSE_LABEL,
  INITIAL_LIVES,
  MAX_LIVES,
  MIN_LIVES,
  MISS_FLASH_COLOR,
  MISS_FLASH_MS,
  SPRING_COIL_SPRITE_H,
  SPRING_COIL_SPRITE_W,
  PLAYER_FIRE_TINT,
  PLAYER_SPRITE_H,
  PLAYER_SPRITE_W,
  STAGE_CLEAR_DELAY_MS,
  STAGE_FADE_MS,
  STAGE_PULSE_CORE_MAX,
  STAGE_PULSE_CORE_MIN,
  STAGE_INDEX_STORAGE_KEY,
  STAGE_SPRING_COIL_MAX,
  STAGE_SPRING_COIL_MIN,
  STAGE_CHRONO_CRYSTAL_MAX,
  STAGE_CHRONO_CRYSTAL_MIN,
  CHRONO_CRYSTAL_SPRITE_H,
  CHRONO_CRYSTAL_SPRITE_W,
  STOMP_BOUNCE_VELOCITY,
  PLAYER_DEATH_BOUNCE_VY,
  PLAYER_DEATH_FALL_MS,
  TEX_KEY,
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
  SHAKE_LAND_MS,
  SHAKE_LAND_INTENSITY,
  SHAKE_STOMP_MS,
  SHAKE_STOMP_INTENSITY,
  SHAKE_GOAL_MS,
  SHAKE_GOAL_INTENSITY,
  HITSTOP_MS,
  type PlayerState
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
  springCoils: Phaser.Physics.Arcade.StaticGroup;
  pulseCores: Phaser.Physics.Arcade.StaticGroup;
  chronoCrystals: Phaser.Physics.Arcade.StaticGroup;
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
  private particles!: ParticleManager;
  private touch!: TouchController;
  private playerController!: PlayerController;

  private stageIndex = 0;
  private stage!: StageDefinition;
  private isAllCleared = false;

  private lives = INITIAL_LIVES;
  private playerState: PlayerState = 'small';
  private springCoils!: Phaser.Physics.Arcade.StaticGroup;

  private playerGroundCollider: Phaser.Physics.Arcade.Collider | null = null;
  private enemyManager!: EnemyManager;
  private powerUps!: PowerUpManager;
  private collisions!: CollisionHandler;
  private pulseCores!: Phaser.Physics.Arcade.StaticGroup;
  private chronoCrystals!: Phaser.Physics.Arcade.StaticGroup;
  private pulseBolts!: Phaser.Physics.Arcade.Group;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private fireCooldownUntil = 0;
  /** クリア / ゲームオーバー時の自動遷移を、タップ/キーで前倒しするためのワンショット。 */
  private pendingAdvance: (() => void) | null = null;

  constructor() {
    super('GameScene');
  }

  init(data: { stageIndex?: number; lives?: number; playerState?: PlayerState }): void {
    const resolved = getStage(data?.stageIndex ?? 0);
    this.stageIndex = resolved.index;
    this.stage = resolved.stage;
    const incomingLives = data?.lives ?? INITIAL_LIVES;
    this.lives = Math.min(MAX_LIVES, Math.max(MIN_LIVES, Number.isFinite(incomingLives) ? Math.floor(incomingLives) : INITIAL_LIVES));
    const incoming = data?.playerState;
    this.playerState = (incoming === 'small' || incoming === 'big' || incoming === 'fire')
      ? incoming : 'small';
  }

  // --- E2E / 内部参照向けファサード（実体は PowerUpManager, D-004）---
  private get isInvincible(): boolean {
    return this.powerUps?.isInvincible ?? false;
  }

  get isChronoShielded(): boolean {
    return this.powerUps?.isChronoShielded ?? false;
  }

  create(): void {
    this.isCleared = false;
    this.isMissed = false;
    this.isAllCleared = false;
    this.gearBitsCollected = 0;
    this.playerGroundCollider = null;
    this.fireCooldownUntil = 0;
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
    this.springCoils = built.springCoils;
    this.pulseCores = built.pulseCores;
    this.chronoCrystals = built.chronoCrystals;

    // 背景タイル（ワークショップ夜景。パラックス視差 0.15 で遠景感を出す）
    this.add.tileSprite(0, 0, worldWidth * 2, worldHeight * 2, TEX_KEY.bgTile)
      .setOrigin(0, 0)
      .setScrollFactor(0.15)
      .setDepth(-10);

    this.player = this.physics.add.sprite(this.spawnX, this.spawnY, TEX_KEY.playerSheet, 'idle');
    this.player.setCollideWorldBounds(false);

    this.pulseBolts = this.physics.add.group({
      defaultKey: TEX_KEY.pulseBolt,
      maxSize: PULSE_BOLT_MAX_COUNT,
      collideWorldBounds: false,
      allowGravity: true,
    });

    this.enemyManager = new EnemyManager(this, this.enemies, this.groundMask);
    this.powerUps = new PowerUpManager(
      this,
      this.player,
      this.groundMask,
      () => this.applyPlayerState(this.playerState)
    );

    this.collisions = new CollisionHandler(this, this);
    this.playerGroundCollider = this.collisions.register(
      {
        player: this.player,
        ground: built.ground,
        goal: built.goal,
        enemies: this.enemies,
        gearBits: this.gearBits,
        springCoils: this.springCoils,
        pulseCores: this.pulseCores,
        chronoCrystals: this.chronoCrystals,
        pulseBolts: this.pulseBolts
      },
      {
        onGoalHit: this.onGoalHit,
        onEnemyOverlap: this.onEnemyOverlap,
        onGearBitOverlap: this.onGearBitOverlap,
        onSpringCoilOverlap: this.onSpringCoilOverlap,
        onPulseCoreOverlap: this.onPulseCoreOverlap,
        onChronoCrystalOverlap: this.onChronoCrystalOverlap,
        onPulseBoltGroundCollide: this.onPulseBoltGroundCollide,
        onPulseBoltEnemyOverlap: this.onPulseBoltEnemyOverlap
      }
    );

    if (!this.input.keyboard) {
      throw new Error('Keyboard input plugin is not available');
    }
    this.cursors = this.input.keyboard.createCursorKeys();
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

    this.camera = new CameraController(this, this.player, { w: worldWidth, h: worldHeight });
    this.camera.start();

    this.hud = new HudManager(this);
    this.hud.build();
    this.hud.setGear(this.gearBitsCollected, this.gearBitTotal);
    this.hud.setStage(this.stageIndex, STAGES.length);
    this.hud.setLives(this.lives);

    this.particles = new ParticleManager(this);
    // 敵撃破（踏み / クロノ接触 / パルス弾）で消滅バーストを出す。
    this.events.on(GameEvents.EnemyKilled, (p: PointPayload) => {
      this.particles.burstEnemy(p.x, p.y);
    });

    this.playerController = new PlayerController(this.player, {
      onJump: () => this.audio.playSe('jump'),
      onLand: (_fallVelocity, x, y) => {
        this.audio.playSe('land');
        this.particles.dust(x, y);
        this.camera.shake(SHAKE_LAND_MS, SHAKE_LAND_INTENSITY);
      }
    });

    const relayout = () => {
      this.camera.applyZoom();
      this.hud.layout();
    };
    relayout();
    this.scale.on(Phaser.Scale.Events.RESIZE, relayout);

    this.input.addPointer(2);
    const self = this;
    const touchHost: TouchHost = {
      get isMissed() { return self.isMissed; },
      get isCleared() { return self.isCleared; },
      get playerState() { return self.playerState; },
      unlockAudio: () => self.audio.unlock(),
      shootPulseBolt: () => self.tryShootPulseBolt()
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

    this.applyPlayerState(this.playerState);

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

    // Z キーでパルス弾を投射
    if (Phaser.Input.Keyboard.JustDown(this.fireKey)) {
      this.tryShootPulseBolt();
    }

    // パルス弾寿命チェック
    if (this.pulseBolts) {
      this.pulseBolts.children.iterate((child) => {
        const fb = child as Phaser.Physics.Arcade.Sprite;
        if (!fb.active) return true;
        const expireAt = (fb.getData('expireAt') as number) ?? 0;
        if (this.time.now >= expireAt) {
          this.destroyPulseBolt(fb);
          return true;
        }
        const worldW = this.stage.cols * TILE_SIZE;
        const worldH = this.stage.rows * TILE_SIZE;
        if (fb.x < -TILE_SIZE || fb.x > worldW + TILE_SIZE || fb.y > worldH + TILE_SIZE) {
          this.destroyPulseBolt(fb);
        }
        return true;
      });
    }

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
    const springCoilPositions: Array<{ col: number; row: number }> = [];
    const pulseCorePositions: Array<{ col: number; row: number }> = [];
    const chronoCrystalPositions: Array<{ col: number; row: number }> = [];

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
        } else if (ch === 'M') {
          springCoilPositions.push({ col: c, row: r });
        } else if (ch === 'F') {
          pulseCorePositions.push({ col: c, row: r });
        } else if (ch === 'S') {
          chronoCrystalPositions.push({ col: c, row: r });
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
    if (springCoilPositions.length < STAGE_SPRING_COIL_MIN || springCoilPositions.length > STAGE_SPRING_COIL_MAX) {
      throw new Error(
        `Stage ${def.id}: 'M' Spring Coil count must be ${STAGE_SPRING_COIL_MIN}..${STAGE_SPRING_COIL_MAX} (got ${springCoilPositions.length})`
      );
    }
    if (pulseCorePositions.length < STAGE_PULSE_CORE_MIN || pulseCorePositions.length > STAGE_PULSE_CORE_MAX) {
      throw new Error(
        `Stage ${def.id}: 'F' Pulse Core count must be ${STAGE_PULSE_CORE_MIN}..${STAGE_PULSE_CORE_MAX} (got ${pulseCorePositions.length})`
      );
    }
    if (chronoCrystalPositions.length < STAGE_CHRONO_CRYSTAL_MIN || chronoCrystalPositions.length > STAGE_CHRONO_CRYSTAL_MAX) {
      throw new Error(
        `Stage ${def.id}: 'S' Chrono Crystal count must be ${STAGE_CHRONO_CRYSTAL_MIN}..${STAGE_CHRONO_CRYSTAL_MAX} (got ${chronoCrystalPositions.length})`
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
    const springCoils = this.buildSpringCoils(springCoilPositions);
    const pulseCores = this.buildPulseCores(pulseCorePositions);
    const chronoCrystals = this.buildChronoCrystals(chronoCrystalPositions);

    return {
      ground,
      goal,
      enemies,
      gearBits: gearBitPair.group,
      gearBitTotal: gearBitPair.total,
      groundMask,
      springCoils,
      pulseCores,
      chronoCrystals,
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

  private buildSpringCoils(
    positions: Array<{ col: number; row: number }>
  ): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    for (const p of positions) {
      const cx = p.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = p.row * TILE_SIZE + TILE_SIZE / 2;
      const springCoil = group.create(cx, cy, TEX_KEY.springCoil) as Phaser.Physics.Arcade.Sprite;
      springCoil.setDisplaySize(SPRING_COIL_SPRITE_W, SPRING_COIL_SPRITE_H);
      springCoil.refreshBody();
    }
    return group;
  }

  private buildPulseCores(
    positions: Array<{ col: number; row: number }>
  ): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    for (const p of positions) {
      const cx = p.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = p.row * TILE_SIZE + TILE_SIZE / 2;
      const pulseCore = group.create(cx, cy, TEX_KEY.pulseCore) as Phaser.Physics.Arcade.Sprite;
      pulseCore.setDisplaySize(PULSE_CORE_SPRITE_W, PULSE_CORE_SPRITE_H);
      pulseCore.refreshBody();
    }
    return group;
  }

  private buildChronoCrystals(
    positions: Array<{ col: number; row: number }>
  ): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    for (const p of positions) {
      const cx = p.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = p.row * TILE_SIZE + TILE_SIZE / 2;
      const chronoCrystal = group.create(cx, cy, TEX_KEY.chronoCrystal) as Phaser.Physics.Arcade.Sprite;
      chronoCrystal.setDisplaySize(CHRONO_CRYSTAL_SPRITE_W, CHRONO_CRYSTAL_SPRITE_H);
      chronoCrystal.refreshBody();
    }
    return group;
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

    if (this.isChronoShielded) {
      this.enemyManager.kill(eSprite);
      this.audio.playSe('stomp');
      return;
    }

    const isStomp = pBody.velocity.y > 0 && pBody.center.y <= eBody.center.y;
    if (isStomp) {
      this.enemyManager.kill(eSprite);
      this.player.setVelocityY(STOMP_BOUNCE_VELOCITY);
      this.audio.playSe('stomp');
      this.camera.shake(SHAKE_STOMP_MS, SHAKE_STOMP_INTENSITY);
      this.applyHitstop();
      return;
    }

    this.handleMiss('enemy');
  };

  private handleMiss(reason: 'fall' | 'enemy'): void {
    if (this.isMissed || this.isCleared) return;
    if (this.isInvincible && reason === 'enemy') return;

    if (reason === 'enemy') {
      if (this.playerState === 'fire') {
        this.applyPlayerState('big');
        this.powerUps.snapToNearbyGround();
        this.powerUps.startInvincible();
        this.audio.playSe('stomp');
        return;
      }
      if (this.playerState === 'big') {
        this.applyPlayerState('small');
        this.powerUps.snapToNearbyGround();
        this.powerUps.startInvincible();
        this.audio.playSe('stomp');
        return;
      }
    }

    // ミス確定（small + 敵 / 任意状態 + 落下）
    this.isMissed = true;
    if (this.playerState !== 'small') {
      this.applyPlayerState('small');
    }
    this.playerState = 'small';
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
    this.scene.restart({ stageIndex: this.stageIndex, lives: this.lives, playerState: 'small' as PlayerState });
  }

  private onGoalHit = (): void => {
    if (this.isCleared) return;
    this.isCleared = true;
    this.audio.playSe('beacon');
    this.audio.stopBgm(BGM_FADE_OUT_MS);
    this.player.setVelocity(0, 0);
    this.playerController.setControlEnabled(false);
    this.camera.shake(SHAKE_GOAL_MS, SHAKE_GOAL_INTENSITY);
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
    if (this.springCoils) this.springCoils.clear(true, true);
    if (this.pulseCores) this.pulseCores.clear(true, true);
    if (this.chronoCrystals) this.chronoCrystals.clear(true, true);
    if (this.pulseBolts) this.pulseBolts.clear(true, true);
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
    this.scene.restart({ stageIndex: index, lives: this.lives, playerState: this.playerState });
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

  private onSpringCoilOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_player, springCoil) => {
    if (this.isCleared || this.isMissed) return;
    (springCoil as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
    this.audio.playSe('springCoil');
    if (this.playerState === 'small') {
      this.applyPlayerState('big');
    }
  };

  private applyPlayerState(newState: PlayerState): void {
    this.playerState = newState;
    const isBig = newState === 'big' || newState === 'fire';
    const w = isBig ? PLAYER_SPRITE_W * BIG_SCALE : PLAYER_SPRITE_W;
    const h = isBig ? PLAYER_SPRITE_H * BIG_SCALE : PLAYER_SPRITE_H;
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    const bottom = body?.bottom ?? this.player.y + this.player.displayHeight * (1 - this.player.originY);
    this.player.setDisplaySize(w, h);
    body?.setSize(PLAYER_SPRITE_W, PLAYER_SPRITE_H);
    body?.updateFromGameObject();
    this.setPlayerBodyBottom(bottom);
    if (!this.isChronoShielded) {
      if (newState === 'fire') {
        this.player.setTint(PLAYER_FIRE_TINT);
      } else {
        this.player.clearTint();
      }
    }
    this.hud?.showInstruction(newState === 'fire' ? HUD_PULSE_LABEL : INSTRUCTION_TEXT);
  }

  private setPlayerBodyBottom(bottom: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      this.player.setY(this.player.y + bottom - body.bottom);
      body.updateFromGameObject();
      return;
    }
    this.player.setY(bottom - this.player.displayHeight * (1 - this.player.originY));
  }

  private onPulseCoreOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_p, pulseCore) => {
    if (this.isCleared || this.isMissed) return;
    (pulseCore as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
    this.audio.playSe('pulseCore');
    this.applyPlayerState('fire');
  };

  private onChronoCrystalOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_p, chronoCrystal) => {
    if (this.isCleared || this.isMissed) return;
    (chronoCrystal as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
    this.audio.playSe('chronoCrystal');
    this.powerUps.startChronoShield();
  };

  private tryShootPulseBolt(): void {
    if (this.isCleared || this.isMissed) return;
    if (this.playerState !== 'fire') return;
    if (this.time.now < this.fireCooldownUntil) return;
    const fb = this.pulseBolts.get(this.player.x, this.player.y, TEX_KEY.pulseBolt) as Phaser.Physics.Arcade.Sprite | null;
    if (!fb) return;
    fb.enableBody(true, this.player.x, this.player.y, true, true);
    fb.setDisplaySize(PULSE_BOLT_SPRITE_W, PULSE_BOLT_SPRITE_H);
    const body = fb.body as Phaser.Physics.Arcade.Body;
    body.setSize(PULSE_BOLT_BODY_W, PULSE_BOLT_BODY_H);
    body.setBounce(0, PULSE_BOLT_BOUNCE_Y);
    const dir: 1 | -1 = this.player.flipX ? -1 : 1;
    fb.setVelocity(dir * PULSE_BOLT_SPEED_X, PULSE_BOLT_SPEED_Y);
    fb.setData('bounces', 0);
    fb.setData('expireAt', this.time.now + PULSE_BOLT_LIFETIME_MS);
    this.fireCooldownUntil = this.time.now + PULSE_BOLT_COOLDOWN_MS;
    this.audio.playSe('pulseBolt');
  }

  private destroyPulseBolt(fb: Phaser.Physics.Arcade.Sprite): void {
    fb.disableBody(true, true);
  }

  /** 敵踏み時のヒットストップ。物理のみ一時停止し、描画/音には波及させない（design §11）。 */
  private applyHitstop(): void {
    if (this.physics.world.isPaused) return;
    this.physics.world.pause();
    this.time.delayedCall(HITSTOP_MS, () => {
      this.physics.world.resume();
    });
  }

  private onPulseBoltGroundCollide: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (fb, _ground) => {
    const sprite = fb as Phaser.Physics.Arcade.Sprite;
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down) {
      const bounces = ((sprite.getData('bounces') as number) ?? 0) + 1;
      sprite.setData('bounces', bounces);
      if (bounces > PULSE_BOLT_BOUNCE_COUNT) {
        this.destroyPulseBolt(sprite);
      }
    } else if (body.blocked.left || body.blocked.right) {
      this.destroyPulseBolt(sprite);
    }
  };

  private onPulseBoltEnemyOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (fb, enemy) => {
    const sprite = fb as Phaser.Physics.Arcade.Sprite;
    const eSprite = enemy as Phaser.Physics.Arcade.Sprite;
    if (!sprite.active || !eSprite.active) return;
    this.particles.burstPulse(sprite.x, sprite.y);
    this.enemyManager.kill(eSprite);
    this.destroyPulseBolt(sprite);
    this.audio.playSe('stomp');
  };

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

import Phaser from 'phaser';
import {
  ALL_CLEAR_TO_TITLE_DELAY_MS,
  ANIM_KEY,
  BGM_FADE_OUT_MS,
  BIG_SCALE,
  CAMERA_LERP_X,
  CAMERA_LERP_Y,
  GEAR_BIT_SPRITE_H,
  GEAR_BIT_SPRITE_W,
  DOUBLE_TAP_MS,
  ENEMY_SPEED,
  ENEMY_SPRITE_H,
  ENEMY_SPRITE_W,
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
  HUD_GEAR_LABEL,
  HUD_GEAR_X,
  HUD_GEAR_Y,
  HUD_PULSE_LABEL,
  HUD_FONT_COLOR,
  HUD_FONT_SIZE,
  HUD_INSTRUCTION_Y,
  HUD_LIFE_HEART,
  HUD_LIFE_LABEL,
  HUD_LIFE_X,
  HUD_LIFE_Y,
  HUD_STAGE_LABEL,
  HUD_STAGE_Y,
  HUD_STROKE_COLOR,
  HUD_STROKE_THICKNESS,
  INITIAL_LIVES,
  INVINCIBLE_BLINK_MS,
  INVINCIBLE_MS,
  JUMP_VELOCITY,
  MAX_LIVES,
  MIN_LIVES,
  MISS_FLASH_COLOR,
  MISS_FLASH_MS,
  SPRING_COIL_SPRITE_H,
  SPRING_COIL_SPRITE_W,
  PLAYER_FIRE_TINT,
  PLAYER_SPEED,
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
  CHRONO_BLINK_MS,
  CHRONO_END_WARNING_MS,
  CHRONO_INVINCIBLE_MS,
  CHRONO_CRYSTAL_SPRITE_H,
  CHRONO_CRYSTAL_SPRITE_W,
  STOMP_BOUNCE_VELOCITY,
  TEX_KEY,
  TILE_SIZE,
  TOUCH_SLIDE_THRESHOLD_PX,
  TOUCH_ZONE_SPLIT_RATIO,
  USE_HARD_RELOAD_FALLBACK,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH,
  type PlayerState
} from '../config/gameConfig';
import { AudioManager } from '../audio/AudioManager';
import { getStage, nextStageIndex, STAGES, type StageDefinition } from '../stages/index';
import { registerAnimations } from './animations';

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
  private touchLeft = false;
  private touchRight = false;
  private touchJumpRequested = false;
  private jumpPointerId: number | null = null;
  private movePointerId: number | null = null;
  private touchMoveBaseX: number | null = null;

  private enemies!: Phaser.Physics.Arcade.Group;
  private gearBits!: Phaser.Physics.Arcade.StaticGroup;
  private gearBitTotal = 0;
  private gearBitsCollected = 0;
  private gearHud!: Phaser.GameObjects.Text;
  private stageHud!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private groundMask: ReadonlyArray<ReadonlyArray<boolean>> = [];
  private audio!: AudioManager;

  private stageIndex = 0;
  private stage!: StageDefinition;
  private isAllCleared = false;

  private lives = INITIAL_LIVES;
  private playerState: PlayerState = 'small';
  private springCoils!: Phaser.Physics.Arcade.StaticGroup;
  private lifeHud!: Phaser.GameObjects.Text;
  private invincibleTimer: Phaser.Time.TimerEvent | null = null;
  private blinkTween: Phaser.Tweens.Tween | null = null;

  private isInvincible = false;
  private isChronoShielded = false;
  private chronoTimer: Phaser.Time.TimerEvent | null = null;
  private chronoWarningTimer: Phaser.Time.TimerEvent | null = null;
  private chronoBlinkTween: Phaser.Tweens.Tween | null = null;
  private pulseCores!: Phaser.Physics.Arcade.StaticGroup;
  private chronoCrystals!: Phaser.Physics.Arcade.StaticGroup;
  private pulseBolts!: Phaser.Physics.Arcade.Group;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private fireCooldownUntil = 0;
  private lastTapRightAt = 0;

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

  create(): void {
    this.isCleared = false;
    this.isMissed = false;
    this.isAllCleared = false;
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJumpRequested = false;
    this.jumpPointerId = null;
    this.movePointerId = null;
    this.touchMoveBaseX = null;
    this.gearBitsCollected = 0;
    this.invincibleTimer = null;
    this.blinkTween = null;
    this.isInvincible = false;
    this.isChronoShielded = false;
    this.fireCooldownUntil = 0;
    this.lastTapRightAt = 0;
    this.chronoTimer = null;
    this.chronoWarningTimer = null;
    this.chronoBlinkTween = null;

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

    this.player = this.physics.add.sprite(this.spawnX, this.spawnY, TEX_KEY.playerSheet, 'idle');
    this.player.setCollideWorldBounds(false);

    this.pulseBolts = this.physics.add.group({
      defaultKey: TEX_KEY.pulseBolt,
      maxSize: PULSE_BOLT_MAX_COUNT,
      collideWorldBounds: false,
      allowGravity: true,
    });

    this.physics.add.collider(this.player, built.ground);
    this.physics.add.collider(this.enemies, built.ground);

    // overlap 登録順は二重保証 (design.md §3.4.3 Q5):
    // ゴールを先に登録し、onEnemyOverlap 冒頭の isCleared ガードと併用する。
    this.physics.add.overlap(this.player, built.goal, this.onGoalHit, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.onEnemyOverlap, undefined, this);
    this.physics.add.overlap(this.player, this.gearBits, this.onGearBitOverlap, undefined, this);
    this.physics.add.overlap(this.player, this.springCoils, this.onSpringCoilOverlap, undefined, this);
    this.physics.add.overlap(this.player, built.pulseCores, this.onPulseCoreOverlap, undefined, this);
    this.physics.add.overlap(this.player, built.chronoCrystals, this.onChronoCrystalOverlap, undefined, this);
    this.physics.add.collider(this.pulseBolts, built.ground, this.onPulseBoltGroundCollide, undefined, this);
    this.physics.add.overlap(this.pulseBolts, this.enemies, this.onPulseBoltEnemyOverlap, undefined, this);

    if (!this.input.keyboard) {
      throw new Error('Keyboard input plugin is not available');
    }
    this.cursors = this.input.keyboard.createCursorKeys();
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP_X, CAMERA_LERP_Y);

    this.instructionText = this.add
      .text(
        0,
        0,
        'PC: ←/→ Space/↑ R   スマホ: 左スライドで左右移動 / 右タップでジャンプ',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          color: '#ffffff'
        }
      )
      .setScrollFactor(0);

    this.gearHud = this.add
      .text(0, 0, this.formatGearHud(), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: HUD_FONT_SIZE,
        color: HUD_FONT_COLOR,
        stroke: HUD_STROKE_COLOR,
        strokeThickness: HUD_STROKE_THICKNESS
      })
      .setScrollFactor(0);

    this.stageHud = this.add
      .text(0, 0, this.formatStageHud(), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: HUD_FONT_SIZE,
        color: HUD_FONT_COLOR,
        stroke: HUD_STROKE_COLOR,
        strokeThickness: HUD_STROKE_THICKNESS
      })
      .setScrollFactor(0);

    this.lifeHud = this.add
      .text(0, 0, this.formatLifeHud(), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: HUD_FONT_SIZE,
        color: HUD_FONT_COLOR,
        stroke: HUD_STROKE_COLOR,
        strokeThickness: HUD_STROKE_THICKNESS
      })
      .setScrollFactor(0);

    const updateAll = () => {
      const zoom = Math.min(
        this.scale.width / VIEWPORT_WIDTH,
        this.scale.height / VIEWPORT_HEIGHT
      );
      this.cameras.main.setZoom(zoom);
      this.updateHudPositions();
    };
    updateAll();
    this.scale.on(Phaser.Scale.Events.RESIZE, updateAll);

    this.input.addPointer(2);
    this.setupTouchControls();

    this.audio = new AudioManager();
    this.input.keyboard!.once('keydown', () => { this.audio.unlock(); });
    this.audio.startBgm();
    this.events.once('shutdown', () => {
      this.audio.destroy();
      this.invincibleTimer?.remove(false);
      this.invincibleTimer = null;
      this.blinkTween?.stop();
      this.blinkTween = null;
      this.chronoTimer?.remove(false);
      this.chronoTimer = null;
      this.chronoWarningTimer?.remove(false);
      this.chronoWarningTimer = null;
      this.chronoBlinkTween?.stop();
      this.chronoBlinkTween = null;
    });

    registerAnimations(this);
    this.player.anims.play(ANIM_KEY.playerIdle, true);

    this.applyPlayerState(this.playerState);

    this.cameras.main.fadeIn(STAGE_FADE_MS);
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
      return;
    }

    const onGround = this.player.body?.blocked.down ?? false;

    const leftDown = (this.cursors.left?.isDown ?? false) || this.touchLeft;
    const rightDown = (this.cursors.right?.isDown ?? false) || this.touchRight;
    const keyJumpDown =
      (this.cursors.space?.isDown ?? false) || (this.cursors.up?.isDown ?? false);

    if (leftDown) {
      this.player.setVelocityX(-PLAYER_SPEED);
    } else if (rightDown) {
      this.player.setVelocityX(PLAYER_SPEED);
    } else {
      this.player.setVelocityX(0);
    }

    if ((keyJumpDown || this.touchJumpRequested) && onGround) {
      this.player.setVelocityY(JUMP_VELOCITY);
      this.audio.playSe('jump');
    }
    this.touchJumpRequested = false;

    // アニメーション状態遷移
    if (this.isCleared || this.isMissed) {
      this.player.anims.play(ANIM_KEY.playerIdle, true);
    } else if (!onGround) {
      this.player.anims.play(ANIM_KEY.playerJump, true);
    } else if (Math.abs(this.player.body!.velocity.x) > 0.1) {
      this.player.anims.play(ANIM_KEY.playerWalk, true);
    } else {
      this.player.anims.play(ANIM_KEY.playerIdle, true);
    }

    // 向き反転
    const vx = this.player.body!.velocity.x;
    if (vx < -0.1) this.player.setFlipX(true);
    else if (vx > 0.1) this.player.setFlipX(false);

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

    this.updateEnemyAi();

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

  private updateEnemyAi(): void {
    this.enemies.children.iterate((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return true;
      const body = enemy.body as Phaser.Physics.Arcade.Body | null;
      if (!body) return true;

      let dir = (enemy.getData('dir') as EnemyDir | undefined) ?? -1;

      if (dir < 0 && body.blocked.left) dir = 1;
      else if (dir > 0 && body.blocked.right) dir = -1;

      // 段差端で反転: 進行方向の足元タイル (前方ピクセル + 1) が地面でなければ反転。
      // 着地中のみ判定する (空中で前方タイルが空でも落下中は反転しない)。
      if (body.blocked.down) {
        const probeX = enemy.x + dir * (ENEMY_SPRITE_W / 2 + 1);
        const probeY = enemy.y + ENEMY_SPRITE_H / 2 + 1;
        const probeCol = Math.floor(probeX / TILE_SIZE);
        const probeRow = Math.floor(probeY / TILE_SIZE);
        const inBounds =
          probeRow >= 0 &&
          probeRow < this.groundMask.length &&
          probeCol >= 0 &&
          probeCol < (this.groundMask[probeRow]?.length ?? 0);
        if (inBounds && !this.groundMask[probeRow][probeCol]) {
          dir = (dir === 1 ? -1 : 1) as EnemyDir;
        }
      }

      enemy.setData('dir', dir);
      // 速度を毎フレーム強制し、衝突後の速度ゼロ化事故を防ぐ
      enemy.setVelocityX(dir * ENEMY_SPEED);
      enemy.setFlipX(dir > 0);
      return true;
    });
  }

  private onGearBitOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_player, gearBit) => {
    if (this.isCleared || this.isMissed) return;
    (gearBit as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
    this.gearBitsCollected++;
    this.audio.playSe('gearBit');
    this.refreshGearHud();
  };

  private onEnemyOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_player, enemy) => {
    if (this.isCleared || this.isMissed) return;
    if (this.isInvincible) return;

    const pBody = this.player.body as Phaser.Physics.Arcade.Body;
    const eSprite = enemy as Phaser.Physics.Arcade.Sprite;
    const eBody = eSprite.body as Phaser.Physics.Arcade.Body;

    if (this.isChronoShielded) {
      eSprite.disableBody(true, true);
      this.audio.playSe('stomp');
      return;
    }

    const isStomp = pBody.velocity.y > 0 && pBody.center.y <= eBody.center.y;
    if (isStomp) {
      eSprite.disableBody(true, true);
      this.player.setVelocityY(STOMP_BOUNCE_VELOCITY);
      this.audio.playSe('stomp');
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
        this.snapPlayerToNearbyGround();
        this.startInvincible();
        this.audio.playSe('stomp');
        return;
      }
      if (this.playerState === 'big') {
        this.applyPlayerState('small');
        this.snapPlayerToNearbyGround();
        this.startInvincible();
        this.audio.playSe('stomp');
        return;
      }
    }

    // ミス確定（small + 敵 / 任意状態 + 落下）
    this.isMissed = true;
    if (this.playerState !== 'small') {
      this.applyPlayerState('small');
    }
    this.audio.playSe('miss');
    this.player.setTint(MISS_FLASH_COLOR);
    this.player.setVelocity(0, 0);
    this.playerState = 'small';
    this.decrementLifeAndContinue();
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

    const next = nextStageIndex(this.stageIndex);
    if (next === null) {
      this.showAllClear();
      return;
    }

    this.showStageClear();

    this.time.delayedCall(STAGE_CLEAR_DELAY_MS, () => {
      this.cameras.main.fadeOut(STAGE_FADE_MS, 0, 0, 0);

      let transitioned = false;
      const doTransition = () => {
        if (transitioned) return;
        transitioned = true;
        this.transitionToStage(next);
      };

      this.cameras.main.once('camerafadeoutcomplete', doTransition);
      // カメライベントが発火しない場合のセーフティタイマー
      this.time.delayedCall(STAGE_FADE_MS + 200, doTransition);
    });
  };

  private showStageClear(): void {
    this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        `STAGE ${this.stageIndex + 1} CLEAR!\n${this.formatGearHud()}`,
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '44px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 6,
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0);
  }

  private showAllClear(): void {
    this.isAllCleared = true;
    this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        `ALL CLEAR!\n${this.formatGearHud()}\nタイトルへ戻ります...`,
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '44px',
          color: '#ffff00',
          stroke: '#000000',
          strokeThickness: 6,
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.time.delayedCall(ALL_CLEAR_TO_TITLE_DELAY_MS, () => {
      this.scene.start('TitleScene');
    }, [], this);
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

  private updateHudPositions(): void {
    const zoom = this.cameras.main.zoom;
    const hw = this.scale.width / 2;
    const hh = this.scale.height / 2;
    const toWorldX = (sx: number) => (sx - (1 - zoom) * hw) / zoom;
    const toWorldY = (sy: number) => (sy - (1 - zoom) * hh) / zoom;
    this.stageHud.setPosition(toWorldX(HUD_GEAR_X), toWorldY(HUD_STAGE_Y));         // y=16
    this.gearHud.setPosition(toWorldX(HUD_GEAR_X), toWorldY(HUD_GEAR_Y));           // y=40
    this.lifeHud.setPosition(toWorldX(HUD_LIFE_X), toWorldY(HUD_LIFE_Y));           // y=64
    this.instructionText.setPosition(toWorldX(HUD_LIFE_X), toWorldY(HUD_INSTRUCTION_Y)); // y=88
  }

  private formatGearHud(): string {
    return `${HUD_GEAR_LABEL}: ${this.gearBitsCollected} / ${this.gearBitTotal}`;
  }

  private refreshGearHud(): void {
    this.gearHud.setText(this.formatGearHud());
  }

  private formatStageHud(): string {
    return `${HUD_STAGE_LABEL}: ${this.stageIndex + 1} / ${STAGES.length}`;
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
    if (this.instructionText) {
      if (newState === 'fire') {
        this.instructionText.setText(HUD_PULSE_LABEL);
      } else {
        this.instructionText.setText('PC: ←/→ Space/↑ R   スマホ: 左スライドで左右移動 / 右タップでジャンプ');
      }
    }
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

  private snapPlayerToNearbyGround(): void {
    const groundTop = this.findNearbyGroundTopUnderPlayer();
    if (groundTop === null) return;
    this.setPlayerBodyBottom(groundTop);
    this.player.setVelocityY(0);
  }

  private findNearbyGroundTopUnderPlayer(): number | null {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return null;

    const probeXs = [body.left + 1, body.center.x, body.right - 1];
    let nearest: { top: number; distance: number } | null = null;

    for (const x of probeXs) {
      const col = Math.floor(x / TILE_SIZE);
      if (col < 0) continue;
      for (let row = 0; row < this.groundMask.length; row++) {
        if (!this.groundMask[row]?.[col]) continue;
        const top = row * TILE_SIZE;
        const distance = body.bottom - top;
        if (distance < -2 || distance > TILE_SIZE + 4) continue;
        if (!nearest || distance < nearest.distance) {
          nearest = { top, distance };
        }
      }
    }

    return nearest?.top ?? null;
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
    this.startChronoShield();
  };

  private startChronoShield(): void {
    this.chronoTimer?.remove(false);
    this.chronoWarningTimer?.remove(false);
    this.chronoBlinkTween?.stop();
    this.isChronoShielded = true;
    this.chronoBlinkTween = this.tweens.add({
      targets: this.player,
      alpha: 0.6,
      duration: CHRONO_BLINK_MS,
      yoyo: true,
      repeat: -1
    });
    this.chronoWarningTimer = this.time.delayedCall(
      CHRONO_INVINCIBLE_MS - CHRONO_END_WARNING_MS,
      () => {
        this.chronoBlinkTween?.stop();
        this.chronoBlinkTween = this.tweens.add({
          targets: this.player,
          alpha: 0.4,
          duration: CHRONO_BLINK_MS / 2,
          yoyo: true,
          repeat: -1
        });
      }
    );
    this.chronoTimer = this.time.delayedCall(CHRONO_INVINCIBLE_MS, () => this.endChronoShield());
  }

  private endChronoShield(): void {
    this.isChronoShielded = false;
    this.chronoBlinkTween?.stop();
    this.chronoBlinkTween = null;
    this.chronoWarningTimer = null;
    this.chronoTimer = null;
    this.player.setAlpha(1);
    this.applyPlayerState(this.playerState);
  }

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
    eSprite.disableBody(true, true);
    this.destroyPulseBolt(sprite);
    this.audio.playSe('stomp');
  };

  private startInvincible(): void {
    this.invincibleTimer?.remove(false);
    this.blinkTween?.stop();
    this.player.setAlpha(1);
    this.isInvincible = true;

    this.blinkTween = this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: INVINCIBLE_BLINK_MS,
      yoyo: true,
      repeat: -1
    });

    this.invincibleTimer = this.time.delayedCall(INVINCIBLE_MS, () => {
      this.blinkTween?.stop();
      this.blinkTween = null;
      this.player.setAlpha(1);
      this.isInvincible = false;
      this.invincibleTimer = null;
    });
  }

  private decrementLifeAndContinue(): void {
    this.lives = Math.max(MIN_LIVES, this.lives - 1);
    this.refreshLifeHud();
    if (this.lives <= 0) {
      this.showGameOver();
    } else {
      this.time.delayedCall(MISS_FLASH_MS, () => this.fullRestart(), [], this);
    }
  }

  private showGameOver(): void {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, GAME_OVER_TEXT, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '64px',
        color: '#ff3030',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center'
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.audio.stopBgm(BGM_FADE_OUT_MS);
    this.time.delayedCall(GAME_OVER_TO_TITLE_DELAY_MS, () => this.scene.start('TitleScene'), [], this);
  }

  private formatLifeHud(): string {
    return `${HUD_LIFE_LABEL}: ${HUD_LIFE_HEART} × ${this.lives}`;
  }

  private refreshLifeHud(): void {
    this.lifeHud.setText(this.formatLifeHud());
  }

  private setupTouchControls(): void {
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('pointerupoutside', this.handlePointerUp, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.audio.unlock();
    if (this.isMissed) return;
    if (this.isCleared) {
      if (this.isAllCleared) {
        this.restartFromTop();
      }
      // 通常クリア中（次ステージへの自動遷移待ち）はタップを無視
      return;
    }

    const splitX = this.scale.width * TOUCH_ZONE_SPLIT_RATIO;
    if (pointer.x < splitX) {
      // 左ゾーン: スライド移動
      if (this.movePointerId === null) {
        this.movePointerId = pointer.id;
        this.touchMoveBaseX = pointer.x;
        this.touchLeft = false;
        this.touchRight = false;
      }
    } else {
      // 右ゾーン
      const now = this.time.now;
      const isDoubleTap = (now - this.lastTapRightAt) <= DOUBLE_TAP_MS;
      this.lastTapRightAt = now;

      if (isDoubleTap && this.playerState === 'fire') {
        this.tryShootPulseBolt();
        return;
      }

      if (this.jumpPointerId === null) {
        this.jumpPointerId = pointer.id;
        this.touchJumpRequested = true;
      }
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.isMissed || this.isCleared) return;
    if (pointer.id !== this.movePointerId) return;
    if (this.touchMoveBaseX === null) return;

    const dx = pointer.x - this.touchMoveBaseX;
    if (dx > TOUCH_SLIDE_THRESHOLD_PX) {
      this.touchLeft = false;
      this.touchRight = true;
    } else if (dx < -TOUCH_SLIDE_THRESHOLD_PX) {
      this.touchLeft = true;
      this.touchRight = false;
    } else {
      this.touchLeft = false;
      this.touchRight = false;
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.jumpPointerId) {
      this.jumpPointerId = null;
    }
    if (pointer.id === this.movePointerId) {
      this.movePointerId = null;
      this.touchMoveBaseX = null;
      this.touchLeft = false;
      this.touchRight = false;
    }
  }
}

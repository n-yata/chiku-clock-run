import Phaser from 'phaser';
import {
  ALL_CLEAR_TO_TITLE_DELAY_MS,
  ANIM_KEY,
  BGM_FADE_OUT_MS,
  BIG_SCALE,
  CAMERA_LERP_X,
  CAMERA_LERP_Y,
  COIN_SPRITE_H,
  COIN_SPRITE_W,
  DOUBLE_TAP_MS,
  ENEMY_SPEED,
  ENEMY_SPRITE_H,
  ENEMY_SPRITE_W,
  FALL_THRESHOLD_Y,
  FIREBALL_BODY_H,
  FIREBALL_BODY_W,
  FIREBALL_BOUNCE_COUNT,
  FIREBALL_BOUNCE_Y,
  FIREBALL_COOLDOWN_MS,
  FIREBALL_LIFETIME_MS,
  FIREBALL_MAX_COUNT,
  FIREBALL_SPEED_X,
  FIREBALL_SPEED_Y,
  FIREBALL_SPRITE_H,
  FIREBALL_SPRITE_W,
  FIREFLOWER_SPRITE_H,
  FIREFLOWER_SPRITE_W,
  GAME_OVER_TEXT,
  GAME_OVER_TO_TITLE_DELAY_MS,
  GOAL_SPRITE_H,
  GOAL_SPRITE_W,
  HUD_COIN_LABEL,
  HUD_COIN_X,
  HUD_COIN_Y,
  HUD_FIRE_LABEL,
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
  MUSHROOM_SPRITE_H,
  MUSHROOM_SPRITE_W,
  PLAYER_FIRE_TINT,
  PLAYER_SPEED,
  PLAYER_SPRITE_H,
  PLAYER_SPRITE_W,
  STAGE_CLEAR_DELAY_MS,
  STAGE_FADE_MS,
  STAGE_FIREFLOWER_MAX,
  STAGE_FIREFLOWER_MIN,
  STAGE_INDEX_STORAGE_KEY,
  STAGE_MUSHROOM_MAX,
  STAGE_MUSHROOM_MIN,
  STAGE_STAR_MAX,
  STAGE_STAR_MIN,
  STAR_BLINK_MS,
  STAR_END_WARNING_MS,
  STAR_INVINCIBLE_MS,
  STAR_SPRITE_H,
  STAR_SPRITE_W,
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
  coins: Phaser.Physics.Arcade.StaticGroup;
  coinTotal: number;
  groundMask: ReadonlyArray<ReadonlyArray<boolean>>;
  mushrooms: Phaser.Physics.Arcade.StaticGroup;
  fireflowers: Phaser.Physics.Arcade.StaticGroup;
  stars: Phaser.Physics.Arcade.StaticGroup;
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
  private coins!: Phaser.Physics.Arcade.StaticGroup;
  private coinTotal = 0;
  private coinsCollected = 0;
  private coinHud!: Phaser.GameObjects.Text;
  private stageHud!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private groundMask: ReadonlyArray<ReadonlyArray<boolean>> = [];
  private audio!: AudioManager;

  private stageIndex = 0;
  private stage!: StageDefinition;
  private isAllCleared = false;

  private lives = INITIAL_LIVES;
  private playerState: PlayerState = 'small';
  private mushrooms!: Phaser.Physics.Arcade.StaticGroup;
  private lifeHud!: Phaser.GameObjects.Text;
  private invincibleTimer: Phaser.Time.TimerEvent | null = null;
  private blinkTween: Phaser.Tweens.Tween | null = null;

  private isInvincible = false;
  private isStarInvincible = false;
  private starTimer: Phaser.Time.TimerEvent | null = null;
  private starWarningTimer: Phaser.Time.TimerEvent | null = null;
  private starBlinkTween: Phaser.Tweens.Tween | null = null;
  private fireflowers!: Phaser.Physics.Arcade.StaticGroup;
  private stars!: Phaser.Physics.Arcade.StaticGroup;
  private fireballs!: Phaser.Physics.Arcade.Group;
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
    this.coinsCollected = 0;
    this.invincibleTimer = null;
    this.blinkTween = null;
    this.isInvincible = false;
    this.isStarInvincible = false;
    this.fireCooldownUntil = 0;
    this.lastTapRightAt = 0;
    this.starTimer = null;
    this.starWarningTimer = null;
    this.starBlinkTween = null;

    const stage = this.stage;
    const worldWidth = stage.cols * TILE_SIZE;
    const worldHeight = stage.rows * TILE_SIZE;

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    const built = this.buildStage(stage);
    this.spawnX = built.spawnX;
    this.spawnY = built.spawnY;
    this.enemies = built.enemies;
    this.coins = built.coins;
    this.coinTotal = built.coinTotal;
    this.groundMask = built.groundMask;
    this.mushrooms = built.mushrooms;
    this.fireflowers = built.fireflowers;
    this.stars = built.stars;

    this.player = this.physics.add.sprite(this.spawnX, this.spawnY, TEX_KEY.playerSheet, 'idle');
    this.player.setCollideWorldBounds(false);

    this.fireballs = this.physics.add.group({
      defaultKey: TEX_KEY.fireball,
      maxSize: FIREBALL_MAX_COUNT,
      collideWorldBounds: false,
      allowGravity: true,
    });

    this.physics.add.collider(this.player, built.ground);
    this.physics.add.collider(this.enemies, built.ground);

    // overlap 登録順は二重保証 (design.md §3.4.3 Q5):
    // ゴールを先に登録し、onEnemyOverlap 冒頭の isCleared ガードと併用する。
    this.physics.add.overlap(this.player, built.goal, this.onGoalHit, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.onEnemyOverlap, undefined, this);
    this.physics.add.overlap(this.player, this.coins, this.onCoinOverlap, undefined, this);
    this.physics.add.overlap(this.player, this.mushrooms, this.onMushroomOverlap, undefined, this);
    this.physics.add.overlap(this.player, built.fireflowers, this.onFireflowerOverlap, undefined, this);
    this.physics.add.overlap(this.player, built.stars, this.onStarOverlap, undefined, this);
    this.physics.add.collider(this.fireballs, built.ground, this.onFireballGroundCollide, undefined, this);
    this.physics.add.overlap(this.fireballs, this.enemies, this.onFireballEnemyOverlap, undefined, this);

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

    this.coinHud = this.add
      .text(0, 0, this.formatCoinHud(), {
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
      this.starTimer?.remove(false);
      this.starTimer = null;
      this.starWarningTimer?.remove(false);
      this.starWarningTimer = null;
      this.starBlinkTween?.stop();
      this.starBlinkTween = null;
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

    // Z キーでファイアボール投射
    if (Phaser.Input.Keyboard.JustDown(this.fireKey)) {
      this.tryShootFireball();
    }

    // ファイアボール寿命チェック
    if (this.fireballs) {
      this.fireballs.children.iterate((child) => {
        const fb = child as Phaser.Physics.Arcade.Sprite;
        if (!fb.active) return true;
        const expireAt = (fb.getData('expireAt') as number) ?? 0;
        if (this.time.now >= expireAt) {
          this.destroyFireball(fb);
          return true;
        }
        const worldW = this.stage.cols * TILE_SIZE;
        const worldH = this.stage.rows * TILE_SIZE;
        if (fb.x < -TILE_SIZE || fb.x > worldW + TILE_SIZE || fb.y > worldH + TILE_SIZE) {
          this.destroyFireball(fb);
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
    const coinPositions: Array<{ col: number; row: number }> = [];
    const mushroomPositions: Array<{ col: number; row: number }> = [];
    const fireflowerPositions: Array<{ col: number; row: number }> = [];
    const starPositions: Array<{ col: number; row: number }> = [];

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
          coinPositions.push({ col: c, row: r });
        } else if (ch === 'M') {
          mushroomPositions.push({ col: c, row: r });
        } else if (ch === 'F') {
          fireflowerPositions.push({ col: c, row: r });
        } else if (ch === 'S') {
          starPositions.push({ col: c, row: r });
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
    if (coinPositions.length < 1 || coinPositions.length > 30) {
      throw new Error(
        `Stage ${def.id}: 'C' count must be 1..30 (got ${coinPositions.length})`
      );
    }
    if (mushroomPositions.length < STAGE_MUSHROOM_MIN || mushroomPositions.length > STAGE_MUSHROOM_MAX) {
      throw new Error(
        `Stage ${def.id}: 'M' count must be ${STAGE_MUSHROOM_MIN}..${STAGE_MUSHROOM_MAX} (got ${mushroomPositions.length})`
      );
    }
    if (fireflowerPositions.length < STAGE_FIREFLOWER_MIN || fireflowerPositions.length > STAGE_FIREFLOWER_MAX) {
      throw new Error(
        `Stage ${def.id}: 'F' count must be ${STAGE_FIREFLOWER_MIN}..${STAGE_FIREFLOWER_MAX} (got ${fireflowerPositions.length})`
      );
    }
    if (starPositions.length < STAGE_STAR_MIN || starPositions.length > STAGE_STAR_MAX) {
      throw new Error(
        `Stage ${def.id}: 'S' count must be ${STAGE_STAR_MIN}..${STAGE_STAR_MAX} (got ${starPositions.length})`
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
          // scene 再起動時に generateTexture 由来テクスチャの寸法取得が遅延するケースの保険。
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
      (goalRow + 1) * TILE_SIZE - GOAL_SPRITE_H / 2,
      TEX_KEY.goal
    );
    goal.setDisplaySize(GOAL_SPRITE_W, GOAL_SPRITE_H);
    goal.refreshBody();

    const groundMask = this.buildGroundMask(def);
    const enemies = this.buildEnemies(enemyPositions);
    const coinPair = this.buildCoins(coinPositions);
    const mushrooms = this.buildMushrooms(mushroomPositions);
    const fireflowers = this.buildFireflowers(fireflowerPositions);
    const stars = this.buildStars(starPositions);

    return {
      ground,
      goal,
      enemies,
      coins: coinPair.group,
      coinTotal: coinPair.total,
      groundMask,
      mushrooms,
      fireflowers,
      stars,
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
      enemy.anims.play(ANIM_KEY.enemyWalk, true);
      enemy.setCollideWorldBounds(false);
    }
    return group;
  }

  private buildCoins(
    positions: Array<{ col: number; row: number }>
  ): { group: Phaser.Physics.Arcade.StaticGroup; total: number } {
    const group = this.physics.add.staticGroup();
    for (const p of positions) {
      // コインはタイル中心配置。中心対称・小サイズのため 'P'/'G' とは別ルール。
      const cx = p.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = p.row * TILE_SIZE + TILE_SIZE / 2;
      const coin = group.create(cx, cy, TEX_KEY.coin) as Phaser.Physics.Arcade.Sprite;
      coin.setDisplaySize(COIN_SPRITE_W, COIN_SPRITE_H);
      coin.refreshBody();
    }
    return { group, total: positions.length };
  }

  private buildMushrooms(
    positions: Array<{ col: number; row: number }>
  ): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    for (const p of positions) {
      const cx = p.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = p.row * TILE_SIZE + TILE_SIZE / 2;
      const mush = group.create(cx, cy, TEX_KEY.mushroom) as Phaser.Physics.Arcade.Sprite;
      mush.setDisplaySize(MUSHROOM_SPRITE_W, MUSHROOM_SPRITE_H);
      mush.refreshBody();
    }
    return group;
  }

  private buildFireflowers(
    positions: Array<{ col: number; row: number }>
  ): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    for (const p of positions) {
      const cx = p.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = p.row * TILE_SIZE + TILE_SIZE / 2;
      const flower = group.create(cx, cy, TEX_KEY.fireflower) as Phaser.Physics.Arcade.Sprite;
      flower.setDisplaySize(FIREFLOWER_SPRITE_W, FIREFLOWER_SPRITE_H);
      flower.refreshBody();
    }
    return group;
  }

  private buildStars(
    positions: Array<{ col: number; row: number }>
  ): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    for (const p of positions) {
      const cx = p.col * TILE_SIZE + TILE_SIZE / 2;
      const cy = p.row * TILE_SIZE + TILE_SIZE / 2;
      const star = group.create(cx, cy, TEX_KEY.star) as Phaser.Physics.Arcade.Sprite;
      star.setDisplaySize(STAR_SPRITE_W, STAR_SPRITE_H);
      star.refreshBody();
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

  private onCoinOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_player, coin) => {
    if (this.isCleared || this.isMissed) return;
    (coin as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
    this.coinsCollected++;
    this.audio.playSe('coin');
    this.refreshCoinHud();
  };

  private onEnemyOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_player, enemy) => {
    if (this.isCleared || this.isMissed) return;
    if (this.isInvincible) return;

    const pBody = this.player.body as Phaser.Physics.Arcade.Body;
    const eSprite = enemy as Phaser.Physics.Arcade.Sprite;
    const eBody = eSprite.body as Phaser.Physics.Arcade.Body;

    if (this.isStarInvincible) {
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
        this.startInvincible();
        this.audio.playSe('stomp');
        return;
      }
      if (this.playerState === 'big') {
        this.applyPlayerState('small');
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
    this.audio.playSe('goal');
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
        `STAGE ${this.stageIndex + 1} CLEAR!\n${this.formatCoinHud()}`,
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
        `ALL CLEAR!\n${this.formatCoinHud()}\nタイトルへ戻ります...`,
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
    if (this.coins) this.coins.clear(true, true);
    if (this.enemies) this.enemies.clear(true, true);
    if (this.mushrooms) this.mushrooms.clear(true, true);
    if (this.fireflowers) this.fireflowers.clear(true, true);
    if (this.stars) this.stars.clear(true, true);
    if (this.fireballs) this.fireballs.clear(true, true);
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
    this.stageHud.setPosition(toWorldX(HUD_COIN_X), toWorldY(HUD_STAGE_Y));         // y=16
    this.coinHud.setPosition(toWorldX(HUD_COIN_X), toWorldY(HUD_COIN_Y));           // y=40
    this.lifeHud.setPosition(toWorldX(HUD_LIFE_X), toWorldY(HUD_LIFE_Y));           // y=64
    this.instructionText.setPosition(toWorldX(HUD_LIFE_X), toWorldY(HUD_INSTRUCTION_Y)); // y=88
  }

  private formatCoinHud(): string {
    return `${HUD_COIN_LABEL}: ${this.coinsCollected} / ${this.coinTotal}`;
  }

  private refreshCoinHud(): void {
    this.coinHud.setText(this.formatCoinHud());
  }

  private formatStageHud(): string {
    return `${HUD_STAGE_LABEL}: ${this.stageIndex + 1} / ${STAGES.length}`;
  }

  private onMushroomOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_player, mush) => {
    if (this.isCleared || this.isMissed) return;
    (mush as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
    this.audio.playSe('mushroom');
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
    const bottom = this.player.y + this.player.displayHeight * (1 - this.player.originY);
    this.player.setDisplaySize(w, h);
    this.player.setY(bottom - this.player.displayHeight / 2);
    body?.setSize(PLAYER_SPRITE_W, PLAYER_SPRITE_H);
    body?.updateFromGameObject();
    if (!this.isStarInvincible) {
      if (newState === 'fire') {
        this.player.setTint(PLAYER_FIRE_TINT);
      } else {
        this.player.clearTint();
      }
    }
    if (this.instructionText) {
      if (newState === 'fire') {
        this.instructionText.setText(HUD_FIRE_LABEL);
      } else {
        this.instructionText.setText('PC: ←/→ Space/↑ R   スマホ: 左スライドで左右移動 / 右タップでジャンプ');
      }
    }
  }

  private onFireflowerOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_p, flower) => {
    if (this.isCleared || this.isMissed) return;
    (flower as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
    this.audio.playSe('powerup');
    this.applyPlayerState('fire');
  };

  private onStarOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_p, star) => {
    if (this.isCleared || this.isMissed) return;
    (star as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
    this.audio.playSe('star');
    this.startStarInvincible();
  };

  private startStarInvincible(): void {
    this.starTimer?.remove(false);
    this.starWarningTimer?.remove(false);
    this.starBlinkTween?.stop();
    this.isStarInvincible = true;
    this.starBlinkTween = this.tweens.add({
      targets: this.player,
      alpha: 0.6,
      duration: STAR_BLINK_MS,
      yoyo: true,
      repeat: -1
    });
    this.starWarningTimer = this.time.delayedCall(
      STAR_INVINCIBLE_MS - STAR_END_WARNING_MS,
      () => {
        this.starBlinkTween?.stop();
        this.starBlinkTween = this.tweens.add({
          targets: this.player,
          alpha: 0.4,
          duration: STAR_BLINK_MS / 2,
          yoyo: true,
          repeat: -1
        });
      }
    );
    this.starTimer = this.time.delayedCall(STAR_INVINCIBLE_MS, () => this.endStarInvincible());
  }

  private endStarInvincible(): void {
    this.isStarInvincible = false;
    this.starBlinkTween?.stop();
    this.starBlinkTween = null;
    this.starWarningTimer = null;
    this.starTimer = null;
    this.player.setAlpha(1);
    this.applyPlayerState(this.playerState);
  }

  private tryShootFireball(): void {
    if (this.isCleared || this.isMissed) return;
    if (this.playerState !== 'fire') return;
    if (this.time.now < this.fireCooldownUntil) return;
    const fb = this.fireballs.get(this.player.x, this.player.y, TEX_KEY.fireball) as Phaser.Physics.Arcade.Sprite | null;
    if (!fb) return;
    fb.enableBody(true, this.player.x, this.player.y, true, true);
    fb.setDisplaySize(FIREBALL_SPRITE_W, FIREBALL_SPRITE_H);
    const body = fb.body as Phaser.Physics.Arcade.Body;
    body.setSize(FIREBALL_BODY_W, FIREBALL_BODY_H);
    body.setBounce(0, FIREBALL_BOUNCE_Y);
    const dir: 1 | -1 = this.player.flipX ? -1 : 1;
    fb.setVelocity(dir * FIREBALL_SPEED_X, FIREBALL_SPEED_Y);
    fb.setData('bounces', 0);
    fb.setData('expireAt', this.time.now + FIREBALL_LIFETIME_MS);
    this.fireCooldownUntil = this.time.now + FIREBALL_COOLDOWN_MS;
    this.audio.playSe('fireball');
  }

  private destroyFireball(fb: Phaser.Physics.Arcade.Sprite): void {
    fb.disableBody(true, true);
  }

  private onFireballGroundCollide: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (fb, _ground) => {
    const sprite = fb as Phaser.Physics.Arcade.Sprite;
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down) {
      const bounces = ((sprite.getData('bounces') as number) ?? 0) + 1;
      sprite.setData('bounces', bounces);
      if (bounces > FIREBALL_BOUNCE_COUNT) {
        this.destroyFireball(sprite);
      }
    } else if (body.blocked.left || body.blocked.right) {
      this.destroyFireball(sprite);
    }
  };

  private onFireballEnemyOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (fb, enemy) => {
    const sprite = fb as Phaser.Physics.Arcade.Sprite;
    const eSprite = enemy as Phaser.Physics.Arcade.Sprite;
    if (!sprite.active || !eSprite.active) return;
    eSprite.disableBody(true, true);
    this.destroyFireball(sprite);
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
        this.tryShootFireball();
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

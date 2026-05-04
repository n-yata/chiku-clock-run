import Phaser from 'phaser';
import {
  CAMERA_LERP_X,
  CAMERA_LERP_Y,
  ENEMY_SPEED,
  ENEMY_SPRITE_H,
  ENEMY_SPRITE_W,
  FALL_THRESHOLD_Y,
  GOAL_SPRITE_H,
  HUD_COIN_LABEL,
  HUD_COIN_X,
  HUD_COIN_Y,
  HUD_FONT_COLOR,
  HUD_FONT_SIZE,
  HUD_STROKE_COLOR,
  HUD_STROKE_THICKNESS,
  JUMP_VELOCITY,
  MISS_FLASH_COLOR,
  MISS_FLASH_MS,
  PLAYER_SPEED,
  PLAYER_SPRITE_H,
  STOMP_BOUNCE_VELOCITY,
  STOMP_TOLERANCE_PX,
  TEX_KEY,
  TILE_SIZE,
  TOUCH_SLIDE_THRESHOLD_PX,
  TOUCH_ZONE_SPLIT_RATIO,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH
} from '../config/gameConfig';
import { STAGE_01, type StageDefinition } from '../stages/stage01';

interface BuiltStage {
  ground: Phaser.Physics.Arcade.StaticGroup;
  goal: Phaser.Physics.Arcade.Sprite;
  spawnX: number;
  spawnY: number;
  enemies: Phaser.Physics.Arcade.Group;
  coins: Phaser.Physics.Arcade.StaticGroup;
  coinTotal: number;
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
  private groundMask: ReadonlyArray<ReadonlyArray<boolean>> = [];

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.isCleared = false;
    this.isMissed = false;
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJumpRequested = false;
    this.jumpPointerId = null;
    this.movePointerId = null;
    this.touchMoveBaseX = null;
    this.coinsCollected = 0;

    const stage = STAGE_01;
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

    this.player = this.physics.add.sprite(this.spawnX, this.spawnY, TEX_KEY.player);
    this.player.setCollideWorldBounds(false);

    this.physics.add.collider(this.player, built.ground);
    this.physics.add.collider(this.enemies, built.ground);

    // overlap 登録順は二重保証 (design.md §3.4.3 Q5):
    // ゴールを先に登録し、onEnemyOverlap 冒頭の isCleared ガードと併用する。
    this.physics.add.overlap(this.player, built.goal, this.onGoalHit, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.onEnemyOverlap, undefined, this);
    this.physics.add.overlap(this.player, this.coins, this.onCoinOverlap, undefined, this);

    if (!this.input.keyboard) {
      throw new Error('Keyboard input plugin is not available');
    }
    this.cursors = this.input.keyboard.createCursorKeys();
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP_X, CAMERA_LERP_Y);

    this.add
      .text(
        16,
        16,
        'PC: ←/→ Space/↑ R   スマホ: 左スライドで左右移動 / 右タップでジャンプ',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          color: '#ffffff'
        }
      )
      .setScrollFactor(0);

    this.coinHud = this.add
      .text(HUD_COIN_X, HUD_COIN_Y, this.formatCoinHud(), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: HUD_FONT_SIZE,
        color: HUD_FONT_COLOR,
        stroke: HUD_STROKE_COLOR,
        strokeThickness: HUD_STROKE_THICKNESS
      })
      .setScrollFactor(0);

    this.input.addPointer(2);
    this.setupTouchControls();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.fullRestart();
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
    }
    this.touchJumpRequested = false;

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
    goal.refreshBody();

    const groundMask = this.buildGroundMask(def);
    const enemies = this.buildEnemies(enemyPositions);
    const coinPair = this.buildCoins(coinPositions);

    return {
      ground,
      goal,
      enemies,
      coins: coinPair.group,
      coinTotal: coinPair.total,
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
      const enemy = group.create(cx, cy, TEX_KEY.enemy) as Phaser.Physics.Arcade.Sprite;
      enemy.setData('dir', -1 satisfies EnemyDir);
      enemy.setVelocityX(-ENEMY_SPEED);
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
      coin.refreshBody();
    }
    return { group, total: positions.length };
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
      return true;
    });
  }

  private onCoinOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_player, coin) => {
    if (this.isCleared || this.isMissed) return;
    (coin as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
    this.coinsCollected++;
    this.refreshCoinHud();
  };

  private onEnemyOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_player, enemy) => {
    if (this.isCleared || this.isMissed) return;
    const pBody = this.player.body as Phaser.Physics.Arcade.Body;
    const eSprite = enemy as Phaser.Physics.Arcade.Sprite;
    const eBody = eSprite.body as Phaser.Physics.Arcade.Body;
    const isStomp =
      pBody.velocity.y > 0 && pBody.bottom <= eBody.top + STOMP_TOLERANCE_PX;
    if (isStomp) {
      eSprite.disableBody(true, true);
      this.player.setVelocityY(STOMP_BOUNCE_VELOCITY);
    } else {
      this.handleMiss('enemy');
    }
  };

  private handleMiss(_reason: 'fall' | 'enemy'): void {
    if (this.isMissed || this.isCleared) return;
    this.isMissed = true;
    this.player.setTint(MISS_FLASH_COLOR);
    this.player.setVelocity(0, 0);
    this.time.delayedCall(MISS_FLASH_MS, () => this.fullRestart(), [], this);
  }

  private fullRestart(): void {
    // scene.restart() / scene.start('BootScene') のいずれでも 2 回目以降の
    // 床貫通バグが再現したため、最終手段として window.location.reload() で
    // ページ全体を再ロードする。Phaser のシーンマネージャ・物理ワールド・
    // テクスチャマネージャがすべて初期状態から再構築される。
    // 副作用: リスタートに数百 ms 〜 1 秒程度のロード待ちが発生する。
    window.location.reload();
  }

  private onGoalHit = (): void => {
    if (this.isCleared) return;
    this.isCleared = true;
    this.player.setVelocity(0, 0);

    this.add
      .text(
        VIEWPORT_WIDTH / 2,
        VIEWPORT_HEIGHT / 2,
        `クリア！\n${this.formatCoinHud()}\nR またはタップで最初から`,
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
  };

  private formatCoinHud(): string {
    return `${HUD_COIN_LABEL}: ${this.coinsCollected} / ${this.coinTotal}`;
  }

  private refreshCoinHud(): void {
    this.coinHud.setText(this.formatCoinHud());
  }

  private setupTouchControls(): void {
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('pointerupoutside', this.handlePointerUp, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isMissed) return;
    if (this.isCleared) {
      this.fullRestart();
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
      // 右ゾーン: 即時ジャンプ
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

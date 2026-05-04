import Phaser from 'phaser';
import {
  CAMERA_LERP_X,
  CAMERA_LERP_Y,
  FALL_THRESHOLD_Y,
  GOAL_SPRITE_H,
  JUMP_VELOCITY,
  PLAYER_SPEED,
  PLAYER_SPRITE_H,
  TEX_KEY,
  TILE_SIZE,
  TOUCH_HOLD_MS,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH
} from '../config/gameConfig';
import { STAGE_01, type StageDefinition } from '../stages/stage01';

interface BuiltStage {
  ground: Phaser.Physics.Arcade.StaticGroup;
  goal: Phaser.Physics.Arcade.Sprite;
  spawnX: number;
  spawnY: number;
}

type TouchSide = 'left' | 'right' | null;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private spawnX = 0;
  private spawnY = 0;
  private isCleared = false;
  private touchLeft = false;
  private touchRight = false;
  private touchJumpRequested = false;
  private touchHoldTriggered = false;
  private touchPointerSide: TouchSide = null;
  private touchHoldTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.isCleared = false;
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJumpRequested = false;
    this.touchHoldTriggered = false;
    this.touchPointerSide = null;
    this.touchHoldTimer = undefined;

    const stage = STAGE_01;
    const worldWidth = stage.cols * TILE_SIZE;
    const worldHeight = stage.rows * TILE_SIZE;

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    const built = this.buildStage(stage);
    this.spawnX = built.spawnX;
    this.spawnY = built.spawnY;

    this.player = this.physics.add.sprite(this.spawnX, this.spawnY, TEX_KEY.player);
    this.player.setCollideWorldBounds(false);

    this.physics.add.collider(this.player, built.ground);
    this.physics.add.overlap(this.player, built.goal, this.onGoalHit, undefined, this);

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
        'PC: ←/→ Space/↑ R   スマホ: 画面左右の長押しで移動 / タップでジャンプ',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          color: '#ffffff'
        }
      )
      .setScrollFactor(0);

    this.setupTouchControls();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.fullRestart();
      return;
    }

    if (this.isCleared) {
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

    if (this.player.y > FALL_THRESHOLD_Y) {
      this.respawn();
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

    return {
      ground,
      goal,
      spawnX: spawnCol * TILE_SIZE + TILE_SIZE / 2,
      spawnY: (spawnRow + 1) * TILE_SIZE - PLAYER_SPRITE_H / 2
    };
  }

  private respawn(): void {
    this.player.setVelocity(0, 0);
    this.player.setPosition(this.spawnX, this.spawnY);
  }

  private fullRestart(): void {
    // scene.restart() 経由のリセットでは 2 回目以降に static body のサイズが
    // 取れず player が地面を貫通する不具合があったため、BootScene を経由する
    // 完全再構築に切り替えた。BootScene → GameScene の流れでテクスチャ・物理
    // ワールド・入力プラグインがすべて再初期化される。
    this.scene.start('BootScene');
  }

  private onGoalHit(): void {
    if (this.isCleared) return;
    this.isCleared = true;
    this.player.setVelocity(0, 0);

    this.add
      .text(VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT / 2, 'クリア！\nR またはタップで最初から', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '44px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
        align: 'center'
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
  }

  private setupTouchControls(): void {
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('pointerupoutside', this.handlePointerUp, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isCleared) {
      this.fullRestart();
      return;
    }
    this.touchPointerSide = pointer.x < this.scale.width / 2 ? 'left' : 'right';
    this.touchHoldTriggered = false;
    this.touchHoldTimer?.remove();
    this.touchHoldTimer = this.time.delayedCall(TOUCH_HOLD_MS, () => {
      this.touchHoldTriggered = true;
      if (this.touchPointerSide === 'left') {
        this.touchLeft = true;
      } else if (this.touchPointerSide === 'right') {
        this.touchRight = true;
      }
    });
  }

  private handlePointerUp(): void {
    if (!this.touchHoldTriggered && this.touchPointerSide !== null) {
      this.touchJumpRequested = true;
    }
    this.touchHoldTimer?.remove();
    this.touchHoldTimer = undefined;
    this.touchLeft = false;
    this.touchRight = false;
    this.touchHoldTriggered = false;
    this.touchPointerSide = null;
  }
}

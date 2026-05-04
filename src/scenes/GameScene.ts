import Phaser from 'phaser';
import {
  CAMERA_LERP_X,
  CAMERA_LERP_Y,
  FALL_THRESHOLD_Y,
  JUMP_VELOCITY,
  PLAYER_SPEED,
  TEX_KEY,
  TILE_SIZE,
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

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private spawnX = 0;
  private spawnY = 0;
  private isCleared = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.isCleared = false;

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
      .text(16, 16, '←/→: 移動  Space/↑: ジャンプ  R: リスタート', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#ffffff'
      })
      .setScrollFactor(0);
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.scene.restart();
      return;
    }

    if (this.isCleared) {
      this.player.setVelocityX(0);
      return;
    }

    const onGround = this.player.body?.blocked.down ?? false;

    if (this.cursors.left?.isDown) {
      this.player.setVelocityX(-PLAYER_SPEED);
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(PLAYER_SPEED);
    } else {
      this.player.setVelocityX(0);
    }

    if ((this.cursors.space?.isDown || this.cursors.up?.isDown) && onGround) {
      this.player.setVelocityY(JUMP_VELOCITY);
    }

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
          ground.create(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, TEX_KEY.ground);
        }
      }
    }

    const goal = this.physics.add.staticSprite(
      goalCol * TILE_SIZE + TILE_SIZE / 2,
      goalRow * TILE_SIZE + TILE_SIZE / 2,
      TEX_KEY.goal
    );

    return {
      ground,
      goal,
      spawnX: spawnCol * TILE_SIZE + TILE_SIZE / 2,
      spawnY: spawnRow * TILE_SIZE + TILE_SIZE / 2
    };
  }

  private respawn(): void {
    this.player.setVelocity(0, 0);
    this.player.setPosition(this.spawnX, this.spawnY);
  }

  private onGoalHit(): void {
    if (this.isCleared) return;
    this.isCleared = true;
    this.player.setVelocity(0, 0);

    this.add
      .text(VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT / 2, 'クリア！\nR で最初から', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '48px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
        align: 'center'
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
  }
}

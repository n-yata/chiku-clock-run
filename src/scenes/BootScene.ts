import Phaser from 'phaser';
import {
  GOAL_COLOR,
  GOAL_SPRITE_H,
  GOAL_SPRITE_W,
  GROUND_COLOR,
  PLAYER_COLOR,
  PLAYER_SPRITE_H,
  PLAYER_SPRITE_W,
  TEX_KEY,
  TILE_SIZE
} from '../config/gameConfig';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    const g = this.add.graphics();

    g.fillStyle(PLAYER_COLOR, 1);
    g.fillRect(0, 0, PLAYER_SPRITE_W, PLAYER_SPRITE_H);
    g.generateTexture(TEX_KEY.player, PLAYER_SPRITE_W, PLAYER_SPRITE_H);
    g.clear();

    g.fillStyle(GROUND_COLOR, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    g.generateTexture(TEX_KEY.ground, TILE_SIZE, TILE_SIZE);
    g.clear();

    g.fillStyle(GOAL_COLOR, 1);
    g.fillRect(0, 0, GOAL_SPRITE_W, GOAL_SPRITE_H);
    g.generateTexture(TEX_KEY.goal, GOAL_SPRITE_W, GOAL_SPRITE_H);
    g.destroy();
  }

  create(): void {
    this.scene.start('GameScene');
  }
}

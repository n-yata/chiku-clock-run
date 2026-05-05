import Phaser from 'phaser';
import {
  COIN_COLOR,
  COIN_SPRITE_H,
  COIN_SPRITE_W,
  ENEMY_COLOR,
  ENEMY_SPRITE_H,
  ENEMY_SPRITE_W,
  GOAL_COLOR,
  GOAL_SPRITE_H,
  GOAL_SPRITE_W,
  GROUND_COLOR,
  PLAYER_COLOR,
  PLAYER_SPRITE_H,
  PLAYER_SPRITE_W,
  STAGE_INDEX_STORAGE_KEY,
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
    g.clear();

    g.fillStyle(ENEMY_COLOR, 1);
    g.fillRect(0, 0, ENEMY_SPRITE_W, ENEMY_SPRITE_H);
    g.generateTexture(TEX_KEY.enemy, ENEMY_SPRITE_W, ENEMY_SPRITE_H);
    g.clear();

    // コインは円形で描画してゴール（黄色矩形）と形でも区別する
    g.fillStyle(COIN_COLOR, 1);
    g.fillCircle(COIN_SPRITE_W / 2, COIN_SPRITE_H / 2, COIN_SPRITE_W / 2);
    g.generateTexture(TEX_KEY.coin, COIN_SPRITE_W, COIN_SPRITE_H);
    g.destroy();
  }

  create(): void {
    let stageIndex = 0;
    try {
      const stored = sessionStorage.getItem(STAGE_INDEX_STORAGE_KEY);
      if (stored !== null) {
        const parsed = Number.parseInt(stored, 10);
        if (Number.isInteger(parsed) && parsed >= 0) {
          stageIndex = parsed;
        }
        sessionStorage.removeItem(STAGE_INDEX_STORAGE_KEY);
      }
    } catch { /* sessionStorage 利用不可時は stageIndex=0 のまま */ }
    this.scene.start('GameScene', { stageIndex });
  }
}

import Phaser from 'phaser';
import {
  ASSET_PATH_COIN,
  ASSET_PATH_ENEMY,
  ASSET_PATH_GOAL,
  ASSET_PATH_GROUND,
  ASSET_PATH_PLAYER,
  STAGE_INDEX_STORAGE_KEY,
  TEX_KEY
} from '../config/gameConfig';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error(`[BootScene] failed to load asset: ${file.key} (${file.src})`);
    });
    this.load.image(TEX_KEY.player, ASSET_PATH_PLAYER);
    this.load.image(TEX_KEY.ground, ASSET_PATH_GROUND);
    this.load.image(TEX_KEY.goal,   ASSET_PATH_GOAL);
    this.load.image(TEX_KEY.enemy,  ASSET_PATH_ENEMY);
    this.load.image(TEX_KEY.coin,   ASSET_PATH_COIN);
  }

  create(): void {
    let stageIndex = 0;
    let hasStoredIndex = false;
    try {
      const stored = sessionStorage.getItem(STAGE_INDEX_STORAGE_KEY);
      if (stored !== null) {
        const parsed = Number.parseInt(stored, 10);
        if (Number.isInteger(parsed) && parsed >= 0) {
          stageIndex = parsed;
          hasStoredIndex = true;
        }
        sessionStorage.removeItem(STAGE_INDEX_STORAGE_KEY);
      }
    } catch { /* sessionStorage 利用不可時は stageIndex=0 のまま */ }

    if (hasStoredIndex) {
      // リロードフォールバック経路: sessionStorage にステージ番号が保存されていた場合は直接 GameScene へ
      this.scene.start('GameScene', { stageIndex });
    } else {
      this.scene.start('TitleScene');
    }
  }
}

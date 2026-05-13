import Phaser from 'phaser';
import {
  STAGE_INDEX_STORAGE_KEY,
  TEX_KEY
} from '../config/gameConfig';
import { buildPlayerSheet, buildEnemySheet, buildMushroomSheet, buildFireflowerSheet, buildStarSheet, buildFireballSheet } from './spriteSheets';
import { STAGES } from '../stages/index';

const REQUIRED_IMAGE_ASSETS = [
  { key: TEX_KEY.ground, url: new URL('../assets/images/ground.png', import.meta.url).href },
  { key: TEX_KEY.goal, url: new URL('../assets/images/goal.png', import.meta.url).href },
  { key: TEX_KEY.coin, url: new URL('../assets/images/coin.png', import.meta.url).href }
] as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error(`[BootScene] failed to load asset: ${file.key} (${file.src})`);
    });
    for (const asset of REQUIRED_IMAGE_ASSETS) {
      this.load.image(asset.key, asset.url);
    }
  }

  create(): void {
    for (const asset of REQUIRED_IMAGE_ASSETS) {
      if (!this.textures.exists(asset.key)) {
        throw new Error(`[BootScene] required texture is missing: ${asset.key} (${asset.url})`);
      }
    }

    buildPlayerSheet(this);
    buildEnemySheet(this);
    buildMushroomSheet(this);
    buildFireflowerSheet(this);
    buildStarSheet(this);
    buildFireballSheet(this);

    let stageIndex = 0;
    let hasStoredIndex = false;
    try {
      const stored = sessionStorage.getItem(STAGE_INDEX_STORAGE_KEY);
      if (stored !== null) {
        const parsed = Number.parseInt(stored, 10);
        if (Number.isInteger(parsed) && parsed >= 0 && parsed < STAGES.length) {
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

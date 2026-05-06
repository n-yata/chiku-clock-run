import Phaser from 'phaser';
import {
  STAGE_INDEX_STORAGE_KEY,
  TEX_KEY
} from '../config/gameConfig';
import groundUrl from '../assets/images/ground.png';
import goalUrl   from '../assets/images/goal.png';
import coinUrl   from '../assets/images/coin.png';
import { buildPlayerSheet, buildEnemySheet, buildMushroomSheet, buildFireflowerSheet, buildStarSheet, buildFireballSheet } from './spriteSheets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error(`[BootScene] failed to load asset: ${file.key} (${file.src})`);
    });
    this.load.image(TEX_KEY.ground, groundUrl);
    this.load.image(TEX_KEY.goal,   goalUrl);
    this.load.image(TEX_KEY.coin,   coinUrl);
  }

  create(): void {
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

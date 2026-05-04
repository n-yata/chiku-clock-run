import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { BG_COLOR, GRAVITY_Y, VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from './config/gameConfig';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEWPORT_WIDTH,
  height: VIEWPORT_HEIGHT,
  pixelArt: true,
  backgroundColor: BG_COLOR,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: GRAVITY_Y },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, GameScene]
};

new Phaser.Game(config);

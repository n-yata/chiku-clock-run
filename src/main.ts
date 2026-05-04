import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { BG_COLOR, GRAVITY_Y } from './config/gameConfig';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
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
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER
  },
  scene: [BootScene, GameScene]
};

const game = new Phaser.Game(config);

// iOS Safari では orientationchange 後に resize イベントが遅延するため強制リフレッシュする
window.addEventListener('orientationchange', () => {
  setTimeout(() => game.scale.refresh(), 200);
});

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
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
  scene: [BootScene, TitleScene, GameScene]
};

const game = new Phaser.Game(config);

// 縦持ち時に CSS 回転（body.is-portrait）で横画面プレイを可能にする（design §5.2）。
const mq = window.matchMedia('(orientation: portrait)');
const applyOrientation = () => document.body.classList.toggle('is-portrait', mq.matches);
mq.addEventListener('change', applyOrientation);
window.addEventListener('resize', () => game.scale.refresh());
applyOrientation();

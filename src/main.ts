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

// CSS 適用後に Phaser へキャンバス再計算を指示する（RAF でレイアウト確定を待つ）。
const syncScale = () => requestAnimationFrame(() => game.scale.refresh());

const applyOrientation = () => {
  document.body.classList.toggle('is-portrait', mq.matches);
  syncScale();
};

mq.addEventListener('change', applyOrientation);
window.addEventListener('resize', syncScale);

// 初回ロード: CSS クラスを即時適用し、Phaser 準備完了後にキャンバスサイズを同期する。
document.body.classList.toggle('is-portrait', mq.matches);
game.events.once('ready', syncScale);

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { BG_COLOR, GRAVITY_Y } from './config/gameConfig';

// 縦持ち時に CSS 回転（body.is-portrait）で横画面プレイを可能にする（design §5.2）。
// Phaser は getBoundingClientRect() でコンテナを測定するが、CSS transform がかかった要素では
// 回転後のビジュアル座標が返るため RESIZE モードでは正しいキャンバス寸法を取得できない。
// そのため Phaser.Scale.NONE を使い、常に window.inner* から寸法を明示的に渡す。
const mq = window.matchMedia('(orientation: portrait)');

const getGameSize = (): { w: number; h: number } => mq.matches
  ? { w: window.innerHeight, h: window.innerWidth }
  : { w: window.innerWidth, h: window.innerHeight };

// CSS クラスを Phaser 起動前に適用し、初回キャンバス寸法と CSS 状態を一致させる。
document.body.classList.toggle('is-portrait', mq.matches);

const { w: initW, h: initH } = getGameSize();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: initW,
  height: initH,
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
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER
  },
  scene: [BootScene, TitleScene, GameScene]
};

const game = new Phaser.Game(config);

const resizeGame = () => {
  const { w, h } = getGameSize();
  game.scale.resize(w, h);
};

const applyOrientation = () => {
  document.body.classList.toggle('is-portrait', mq.matches);
  requestAnimationFrame(resizeGame);
};

mq.addEventListener('change', applyOrientation);
window.addEventListener('resize', () => requestAnimationFrame(resizeGame));

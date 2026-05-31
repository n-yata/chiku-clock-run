import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { EndingScene } from './scenes/EndingScene';
import { BG_COLOR, GRAVITY_Y } from './config/gameConfig';

// 縦持ち時に CSS 回転（body.is-portrait）で横画面プレイを可能にする（design §5.2）。
// Phaser.Scale.RESIZE を使うことで devicePixelRatio が自動処理され、テキスト・スプライトが
// 高解像度ディスプレイでも鮮明に描画される。
// portrait 時に Phaser が getBoundingClientRect() で誤ったサイズを読むため、
// game.scale.on(RESIZE) を監視して正しいランドスケープ寸法に上書きする。
const mq = window.matchMedia('(orientation: portrait)');
document.body.classList.toggle('is-portrait', mq.matches);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  pixelArt: false,    // antialias ON → テキスト・スプライトがスムーズに描画される
  antialias: true,
  roundPixels: true,  // スプライトは整数座標で描画してブレを防ぐ
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
  scene: [BootScene, TitleScene, GameScene, EndingScene]
};

const game = new Phaser.Game(config);

const getLandscapeSize = (): { w: number; h: number } => mq.matches
  ? { w: window.innerHeight, h: window.innerWidth }
  : { w: window.innerWidth, h: window.innerHeight };

// portrait 時 Phaser の自動リサイズを正しいランドスケープ寸法で上書きする。
// correcting フラグで再帰ループを防ぐ。
let correcting = false;
const syncSize = (): void => {
  if (correcting) return;
  const { w, h } = getLandscapeSize();
  const gs = game.scale.gameSize;
  if (Math.abs(gs.width - w) > 2 || Math.abs(gs.height - h) > 2) {
    correcting = true;
    game.scale.resize(w, h);
    correcting = false;
  }
};

game.events.once('ready', () => {
  syncSize();
  game.scale.on(Phaser.Scale.Events.RESIZE, syncSize);
});

const applyOrientation = (): void => {
  document.body.classList.toggle('is-portrait', mq.matches);
  requestAnimationFrame(syncSize);
};

mq.addEventListener('change', applyOrientation);
window.addEventListener('resize', () => requestAnimationFrame(syncSize));

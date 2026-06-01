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

// --- Android PWA: マルチタスクから復帰すると画面が真っ黒になる問題への対処 ---
// バックグラウンド中に WebGL コンテキストが失われたり、復帰直後にキャンバスの実サイズが
// 0 のまま固定されたりするのが原因。復帰時にサイズとレンダラを描き直し、コンテキストが
// 失われたまま復元されない端末では最終手段としてリロードして黒画面を回避する。
// リロードはセッション内 1 回までに制限し、コンテキストを復元できない端末での
// 「復帰→黒画面→reload」無限ループ（自己DoS的挙動）を断つ。
const GL_RELOAD_FLAG = 'chiku-clock-run.glReloaded';
let glContextLost = false;
const canvas = game.canvas;
if (canvas) {
  canvas.addEventListener('webglcontextlost', (e) => {
    // preventDefault しないとブラウザは webglcontextrestored を発火しない（軽量復帰の前提）。
    e.preventDefault();
    glContextLost = true;
  }, false);
  canvas.addEventListener('webglcontextrestored', () => {
    glContextLost = false;
    try { sessionStorage.removeItem(GL_RELOAD_FLAG); } catch { /* 利用不可時は無視 */ }
    requestAnimationFrame(() => { syncSize(); game.scale.refresh(); });
  }, false);
}

const handleResume = (): void => {
  if (document.visibilityState !== 'visible') return;
  // 2 フレーム待ってからサイズとレンダラを確定する（復帰直後は innerWidth/Height が
  // 旧値や 0 を返すことがあるため）。それでも GL コンテキストが失われたままなら最終手段でリロード。
  requestAnimationFrame(() => requestAnimationFrame(() => {
    syncSize();
    game.scale.refresh();
    if (!glContextLost) return;
    let alreadyReloaded = false;
    try { alreadyReloaded = sessionStorage.getItem(GL_RELOAD_FLAG) === '1'; } catch { /* 無視 */ }
    if (!alreadyReloaded) {
      try { sessionStorage.setItem(GL_RELOAD_FLAG, '1'); } catch { /* 無視 */ }
      window.location.reload();
    }
  }));
};
document.addEventListener('visibilitychange', handleResume);
// bfcache から復元された場合（pageshow.persisted）も同様に描き直す。
window.addEventListener('pageshow', (e) => { if (e.persisted) handleResume(); });

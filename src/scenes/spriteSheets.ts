import Phaser from 'phaser';
import {
  TEX_KEY,
  PLAYER_COLOR, PLAYER_SKIN_COLOR,
  PLAYER_BRASS_COLOR, PLAYER_GOGGLE_LENS_COLOR, PLAYER_SHOE_COLOR, PLAYER_SCARF_COLOR,

  PLAYER_COAT_COLOR,
  ENEMY_COLOR, ENEMY_DARK_COLOR, ENEMY_ACCENT_COLOR,
  PLAYER_SPRITE_W, PLAYER_SPRITE_H,
  ENEMY_SPRITE_W, ENEMY_SPRITE_H,
  SPRING_COIL_SPRITE_W, SPRING_COIL_SPRITE_H,
  SPRING_COIL_BRASS_COLOR, SPRING_COIL_HIGHLIGHT_COLOR, SPRING_COIL_DARK_COLOR,
  PULSE_CORE_SPRITE_W, PULSE_CORE_SPRITE_H,
  PULSE_CORE_OUTER_COLOR, PULSE_CORE_INNER_COLOR, PULSE_CORE_WIRE_COLOR,
  CHRONO_CRYSTAL_SPRITE_W, CHRONO_CRYSTAL_SPRITE_H,
  CHRONO_CRYSTAL_COLOR, CHRONO_CRYSTAL_OUTLINE_COLOR,
  PULSE_BOLT_SPRITE_W, PULSE_BOLT_SPRITE_H,
  PULSE_BOLT_COLOR, PULSE_BOLT_HIGHLIGHT_COLOR,
  PARTICLE_DOT_SIZE
} from '../config/gameConfig';

type PlayerFrame = 'idle' | 'idle_b' | 'walk1' | 'walk2' | 'walk3' | 'jump';
type EnemyFrame = 'enemy_walk1' | 'enemy_walk2' | 'enemy_walk3';

function toHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

/** 色を係数で明暗調整して 'rgb(r,g,b)' を返す。factor>1 で明るく、<1 で暗く。 */
function shade(color: number, factor: number): string {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((color & 0xff) * factor));
  return `rgb(${r},${g},${b})`;
}

/** 角丸矩形のパスを作る（fill/stroke は呼び出し側）。 */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// プレイヤーは高解像度（128×192）の座標空間に曲線・グラデーションで描き、
// drawImage で実フレームサイズへ滑らかにダウンスケールする（antialias 前提）。
const PLAYER_DRAW_W = 128;
const PLAYER_DRAW_H = 192;

export function buildPlayerSheet(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.playerSheet)) return;
  const frameW = PLAYER_SPRITE_W;
  const frameH = PLAYER_SPRITE_H;
  const canvas = document.createElement('canvas');
  canvas.width = frameW * 4;
  canvas.height = frameH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.imageSmoothingEnabled = true; // 高解像度→実フレームへ滑らかにダウンスケール

  const tmp = document.createElement('canvas');
  tmp.width = PLAYER_DRAW_W;
  tmp.height = PLAYER_DRAW_H;
  const tmpCtx = tmp.getContext('2d');
  if (!tmpCtx) throw new Error('canvas 2d context unavailable');
  tmpCtx.imageSmoothingEnabled = true; // 曲線・グラデを滑らかに描画

  const frames: PlayerFrame[] = ['idle', 'idle_b', 'walk1', 'walk2', 'walk3', 'jump'];
  canvas.width = frameW * frames.length;
  frames.forEach((frame, i) => {
    tmpCtx.clearRect(0, 0, PLAYER_DRAW_W, PLAYER_DRAW_H);
    drawPlayerFrame(tmpCtx, 0, frame);
    ctx.drawImage(tmp, 0, 0, PLAYER_DRAW_W, PLAYER_DRAW_H, i * frameW, 0, frameW, frameH);
  });

  const tex = scene.textures.addCanvas(TEX_KEY.playerSheet, canvas);
  if (!tex) throw new Error(`Failed to create texture: ${TEX_KEY.playerSheet}`);
  frames.forEach((name, i) => tex.add(name, 0, i * frameW, 0, frameW, frameH));
}

export function buildSpringCoilSheet(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.springCoil)) return;
  const W = SPRING_COIL_SPRITE_W;
  const H = SPRING_COIL_SPRITE_H;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  // Wound brass ribbon over a dark mounting plate.
  ctx.fillStyle = toHex(SPRING_COIL_DARK_COLOR);
  ctx.fillRect(6, 25, 20, 5);
  ctx.fillRect(9, 22, 14, 3);
  ctx.fillRect(6, 5, 20, 3);
  ctx.fillRect(6, 5, 3, 17);
  ctx.fillRect(23, 8, 3, 14);
  ctx.fillRect(9, 12, 14, 3);
  ctx.fillRect(9, 19, 14, 3);

  ctx.fillStyle = toHex(SPRING_COIL_BRASS_COLOR);
  ctx.fillRect(8, 6, 16, 2);
  ctx.fillRect(7, 8, 3, 4);
  ctx.fillRect(9, 12, 15, 2);
  ctx.fillRect(22, 14, 3, 5);
  ctx.fillRect(8, 19, 15, 2);
  ctx.fillRect(10, 23, 12, 2);
  ctx.fillRect(8, 26, 16, 3);

  ctx.fillStyle = toHex(SPRING_COIL_HIGHLIGHT_COLOR);
  ctx.fillRect(10, 6, 8, 1);
  ctx.fillRect(10, 12, 7, 1);
  ctx.fillRect(10, 19, 7, 1);
  ctx.fillRect(10, 26, 9, 1);

  if (!scene.textures.addCanvas(TEX_KEY.springCoil, canvas)) {
    throw new Error(`Failed to create texture: ${TEX_KEY.springCoil}`);
  }
}

export function buildPulseCoreSheet(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.pulseCore)) return;
  const canvas = document.createElement('canvas');
  canvas.width = PULSE_CORE_SPRITE_W;
  canvas.height = PULSE_CORE_SPRITE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  ctx.fillStyle = toHex(PULSE_CORE_WIRE_COLOR);
  ctx.fillRect(2, 15, 6, 2);
  ctx.fillRect(24, 15, 6, 2);
  ctx.fillRect(15, 25, 2, 5);
  ctx.fillRect(4, 12, 2, 5);
  ctx.fillRect(26, 15, 2, 5);

  ctx.fillStyle = toHex(PULSE_CORE_OUTER_COLOR);
  ctx.beginPath();
  ctx.moveTo(12, 4);
  ctx.lineTo(20, 4);
  ctx.lineTo(26, 12);
  ctx.lineTo(26, 20);
  ctx.lineTo(20, 27);
  ctx.lineTo(12, 27);
  ctx.lineTo(6, 20);
  ctx.lineTo(6, 12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = toHex(PULSE_CORE_INNER_COLOR);
  ctx.beginPath();
  ctx.moveTo(13, 9);
  ctx.lineTo(19, 9);
  ctx.lineTo(22, 13);
  ctx.lineTo(22, 19);
  ctx.lineTo(19, 22);
  ctx.lineTo(13, 22);
  ctx.lineTo(10, 19);
  ctx.lineTo(10, 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = toHex(PULSE_CORE_OUTER_COLOR);
  ctx.fillRect(13, 11, 3, 3);

  if (!scene.textures.addCanvas(TEX_KEY.pulseCore, canvas)) {
    throw new Error(`Failed to create texture: ${TEX_KEY.pulseCore}`);
  }
}

export function buildChronoCrystalSheet(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.chronoCrystal)) return;
  const canvas = document.createElement('canvas');
  canvas.width = CHRONO_CRYSTAL_SPRITE_W;
  canvas.height = CHRONO_CRYSTAL_SPRITE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  ctx.fillStyle = toHex(CHRONO_CRYSTAL_OUTLINE_COLOR);
  ctx.beginPath();
  ctx.moveTo(14, 1);
  ctx.lineTo(25, 8);
  ctx.lineTo(22, 20);
  ctx.lineTo(14, 27);
  ctx.lineTo(6, 20);
  ctx.lineTo(3, 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = toHex(CHRONO_CRYSTAL_COLOR);
  ctx.beginPath();
  ctx.moveTo(14, 3);
  ctx.lineTo(22, 9);
  ctx.lineTo(19, 19);
  ctx.lineTo(14, 24);
  ctx.lineTo(9, 19);
  ctx.lineTo(6, 9);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = toHex(CHRONO_CRYSTAL_OUTLINE_COLOR);
  ctx.fillRect(10, 8, 2, 7);
  ctx.fillRect(13, 12, 2, 2);
  ctx.fillRect(14, 13, 5, 2);
  ctx.fillRect(9, 6, 2, 2);

  if (!scene.textures.addCanvas(TEX_KEY.chronoCrystal, canvas)) {
    throw new Error(`Failed to create texture: ${TEX_KEY.chronoCrystal}`);
  }
}

export function buildPulseBoltSheet(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.pulseBolt)) return;
  const canvas = document.createElement('canvas');
  canvas.width = PULSE_BOLT_SPRITE_W;
  canvas.height = PULSE_BOLT_SPRITE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  ctx.fillStyle = toHex(PULSE_BOLT_COLOR);
  ctx.beginPath();
  ctx.moveTo(8, 1);
  ctx.lineTo(15, 8);
  ctx.lineTo(8, 15);
  ctx.lineTo(1, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = toHex(PULSE_BOLT_HIGHLIGHT_COLOR);
  ctx.fillRect(7, 4, 2, 8);
  ctx.fillRect(4, 7, 8, 2);
  ctx.fillRect(10, 4, 2, 2);

  if (!scene.textures.addCanvas(TEX_KEY.pulseBolt, canvas)) {
    throw new Error(`Failed to create texture: ${TEX_KEY.pulseBolt}`);
  }
}

/** ゲーム背景タイル: 暗いワークショップの内壁 + ギアシルエット。 */
// 背景タイルの基調色（時計工房：沈んだ青）。継ぎ目を消すためタイルは平坦ベース＋ラップ配置。
const BG_TILE_BASE = '#16273f';

/** モチーフをタイル境界でラップ描画する（上下左右 8 近傍へ複製）。端をまたぐ絵が反対側に出てシームレスになる。 */
function tileWrap(ctx: CanvasRenderingContext2D, W: number, H: number, fn: (c: CanvasRenderingContext2D) => void): void {
  for (const dx of [-W, 0, W]) {
    for (const dy of [-H, 0, H]) {
      ctx.save();
      ctx.translate(dx, dy);
      fn(ctx);
      ctx.restore();
    }
  }
}

export function buildBackgroundTile(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.bgTile)) return;
  const W = 320, H = 180; // 横 320 は 80 の倍数、縦 180 は 30 の倍数（目地が両軸でタイルする）
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  // 平坦ベース（明暗グラデは GameScene のオーバーレイ側で付与＝タイルに焼かない）
  ctx.fillStyle = BG_TILE_BASE;
  ctx.fillRect(0, 0, W, H);

  // レンガ目地（両軸でタイルする周期: 横 80 / 縦 30）
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let y = 0; y < H; y += 30) ctx.fillRect(0, y, W, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  for (let y = 0; y < H; y += 30) ctx.fillRect(0, y + 1, W, 1);
  for (let row = 0; row < H / 30; row++) {
    const offset = (row % 2) * 40;
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    for (let x = offset; x < W; x += 80) ctx.fillRect(x, row * 30, 1, 30);
  }

  // ギアシルエット（遠景・ラップ配置でシームレス）
  tileWrap(ctx, W, H, (c) => {
    drawBgGear(c, 58, 60, 40, 10);
    drawBgGear(c, 230, 36, 26, 8);
    drawBgGear(c, 286, 132, 30, 9);
    drawBgGear(c, 150, 150, 22, 8);
  });

  // ランプの環境光グロー（真鍮/琥珀・ラップ配置）
  tileWrap(ctx, W, H, (c) => {
    bgGlow(c, 40, 26, 70, 48);
    bgGlow(c, 270, 96, 60, 44);
  });

  if (!scene.textures.addCanvas(TEX_KEY.bgTile, canvas)) {
    throw new Error(`Failed to create texture: ${TEX_KEY.bgTile}`);
  }
}

/**
 * 背景オーバーレイ（非タイル）。上下を沈ませるビネットで奥行きを出し、
 * 上部中央に暖色（真鍮ランプ）のグローを置いて時計工房の雰囲気を作る。
 * 画面全体に引き伸ばして 1 枚だけ重ねる（タイルしないので継ぎ目は出ない）。
 */
export function buildBackgroundOverlay(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.bgOverlay)) return;
  const W = 256, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  // 縦ビネット（上やや沈め / 中央クリア / 下を強めに沈める）
  const v = ctx.createLinearGradient(0, 0, 0, H);
  v.addColorStop(0.0, 'rgba(6,10,22,0.55)');
  v.addColorStop(0.22, 'rgba(6,10,22,0.0)');
  v.addColorStop(0.68, 'rgba(4,7,16,0.0)');
  v.addColorStop(1.0, 'rgba(3,5,12,0.62)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  // 左右ビネット（端を軽く落として中央へ視線を誘導）
  const hgrad = ctx.createLinearGradient(0, 0, W, 0);
  hgrad.addColorStop(0.0, 'rgba(3,5,12,0.35)');
  hgrad.addColorStop(0.5, 'rgba(3,5,12,0.0)');
  hgrad.addColorStop(1.0, 'rgba(3,5,12,0.35)');
  ctx.fillStyle = hgrad;
  ctx.fillRect(0, 0, W, H);

  // 上部中央の暖色グロー（ランプ光）
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.14, 0, W * 0.5, H * 0.14, W * 0.5);
  glow.addColorStop(0, 'rgba(214,150,60,0.20)');
  glow.addColorStop(1, 'rgba(214,150,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  if (!scene.textures.addCanvas(TEX_KEY.bgOverlay, canvas)) {
    throw new Error(`Failed to create texture: ${TEX_KEY.bgOverlay}`);
  }
}

function drawBgGear(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, teeth: number): void {
  const path = () => {
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2;
      const rad = i % 2 === 0 ? r * 1.22 : r;
      if (i === 0) ctx.moveTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
      else ctx.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
    }
    ctx.closePath();
  };
  // 本体（ベースよりわずかに明るい青で立体感）
  path();
  ctx.fillStyle = 'rgba(40,62,96,0.55)';
  ctx.fill();
  // 真鍮の縁取り（世界観のアクセント）
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(150,110,55,0.30)';
  ctx.stroke();
  // 中央のハブ
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = BG_TILE_BASE;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(150,110,55,0.25)';
  ctx.stroke();
}

function bgGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rw: number, rh: number): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rw, rh));
  g.addColorStop(0, 'rgba(200,130,20,0.18)');
  g.addColorStop(1, 'rgba(200,130,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - rw, cy - rh, rw * 2, rh * 2);
}

export function buildParticleTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.particle)) return;
  const size = PARTICLE_DOT_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  // 白い円ドット。各演出側で tint を掛けて着色する（design §3.8）。
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  if (!scene.textures.addCanvas(TEX_KEY.particle, canvas)) {
    throw new Error(`Failed to create texture: ${TEX_KEY.particle}`);
  }
}

const ENEMY_DRAW = 176; // 44×4 高解像度描画キャンバス

export function buildEnemySheet(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.enemySheet)) return;
  const frameW = ENEMY_SPRITE_W; // 44
  const frameH = ENEMY_SPRITE_H; // 44
  const frames: EnemyFrame[] = ['enemy_walk1', 'enemy_walk2', 'enemy_walk3'];
  const canvas = document.createElement('canvas');
  canvas.width = frameW * frames.length;
  canvas.height = frameH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.imageSmoothingEnabled = true;

  const tmp = document.createElement('canvas');
  tmp.width = ENEMY_DRAW;
  tmp.height = ENEMY_DRAW;
  const tmpCtx = tmp.getContext('2d');
  if (!tmpCtx) throw new Error('canvas 2d context unavailable');
  tmpCtx.imageSmoothingEnabled = true;

  frames.forEach((frame, i) => {
    tmpCtx.clearRect(0, 0, ENEMY_DRAW, ENEMY_DRAW);
    drawEnemyFrame(tmpCtx, frame);
    ctx.drawImage(tmp, 0, 0, ENEMY_DRAW, ENEMY_DRAW, i * frameW, 0, frameW, frameH);
  });

  const tex = scene.textures.addCanvas(TEX_KEY.enemySheet, canvas);
  if (!tex) throw new Error(`Failed to create texture: ${TEX_KEY.enemySheet}`);
  frames.forEach((name, i) => tex.add(name, 0, i * frameW, 0, frameW, frameH));
}

/**
 * チク（CHIKU）— 高解像度（128×192）でゼロから再設計。
 * 曲線・グラデーション・ハイライト・輪郭線で描き、antialias で滑らかに縮小する。
 * デザイン原則: 「巨大ゴーグルが顔」のシルエット + 赤いスカーフの個性。
 */
/**
 * チク（CHIKU）— 「歯車仕掛けの少年職人」。
 * 人型・頭身高め。識別点は (1) 背中で回る大歯車（ぜんまい）(2) 片眼のモノクル。
 * 旧デザイン（ゴーグルの小人）からシルエットごと一新（元キャラ温存しない方針）。
 */
function drawChikuFrame(ctx: CanvasRenderingContext2D, ox: number, frame: PlayerFrame): void {
  const bs = (frame === 'idle_b') ? 3 : 0; // 呼吸の上下動（足には適用しない）
  ctx.save();
  ctx.translate(ox, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  drawChikuFeet(ctx, frame);

  ctx.save();
  ctx.translate(0, bs);
  drawChikuBackGear(ctx, frame); // 背中の大歯車（最背面・フレームで回転）
  drawChikuJacket(ctx);
  drawChikuNeckerchief(ctx);     // 赤の差し色
  drawChikuArms(ctx, frame);
  drawChikuHead(ctx);
  drawChikuMonocle(ctx);         // 片眼のモノクル（識別点）
  drawChikuCap(ctx);             // 後ろに傾けたキャップ
  ctx.restore();

  ctx.restore();
}

/** 中心原点の歯車パスを作る（fill/stroke は呼び出し側）。 */
function gearPath(ctx: CanvasRenderingContext2D, r: number, teeth: number): void {
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? r : r * 0.78;
    const px = rad * Math.cos(a);
    const py = rad * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** フレーム毎の背中歯車の回転角（歩行で回って見える）。 */
function frameSpin(frame: PlayerFrame): number {
  switch (frame) {
    case 'idle': return 0;
    case 'idle_b': return 0.15;
    case 'walk1': return 0.6;
    case 'walk2': return 1.1;
    case 'walk3': return 1.6;
    case 'jump': return 2.1;
    default: return 0;
  }
}

function drawChikuBackGear(ctx: CanvasRenderingContext2D, frame: PlayerFrame): void {
  ctx.save();
  ctx.translate(92, 104); // 右肩の背後にのぞく
  ctx.rotate(frameSpin(frame));
  // 歯車本体（真鍮グラデ）
  gearPath(ctx, 30, 9);
  const g = ctx.createLinearGradient(-30, -30, 30, 30);
  g.addColorStop(0, shade(PLAYER_BRASS_COLOR, 1.25));
  g.addColorStop(1, shade(PLAYER_BRASS_COLOR, 0.6));
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = shade(PLAYER_BRASS_COLOR, 0.4); ctx.stroke();
  // スポーク
  ctx.strokeStyle = shade(PLAYER_BRASS_COLOR, 0.5);
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(-22 * Math.cos(a), -22 * Math.sin(a));
    ctx.lineTo(22 * Math.cos(a), 22 * Math.sin(a));
    ctx.stroke();
  }
  // ハブ
  ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fillStyle = shade(PLAYER_BRASS_COLOR, 0.85); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = shade(PLAYER_BRASS_COLOR, 1.4); ctx.stroke();
  ctx.restore();
}

function drawShoe(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  // 純色ベース（E2E が靴色 PLAYER_SHOE_COLOR を検出するため大部分を純色に保つ）
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.fillStyle = toHex(PLAYER_SHOE_COLOR);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = shade(PLAYER_SHOE_COLOR, 0.5);
  ctx.stroke();
  // ソール影（最下部は純色のまま残し、地面接地を E2E が検出できるよう少し上に置く）
  ctx.fillStyle = shade(PLAYER_SHOE_COLOR, 0.6);
  roundRectPath(ctx, x + 2, y + h - 11, w - 4, 4, 2);
  ctx.fill();
  // 甲のハイライト
  ctx.fillStyle = shade(PLAYER_SHOE_COLOR, 1.35);
  roundRectPath(ctx, x + 4, y + 3, w - 12, 4, 2);
  ctx.fill();
}

function drawChikuFeet(ctx: CanvasRenderingContext2D, frame: PlayerFrame): void {
  if (frame === 'walk1') {
    drawShoe(ctx, 34, 160, 32, 30); // 左足（前・大きく踏み出す）
    drawShoe(ctx, 70, 166, 28, 24); // 右足（後・持ち上がり）
  } else if (frame === 'walk2') {
    drawShoe(ctx, 30, 166, 28, 24);
    drawShoe(ctx, 64, 160, 32, 30);
  } else if (frame === 'walk3') {
    drawShoe(ctx, 38, 162, 26, 28);
    drawShoe(ctx, 66, 162, 26, 28);
  } else if (frame === 'jump') {
    drawShoe(ctx, 36, 154, 28, 26);
    drawShoe(ctx, 66, 160, 28, 28);
  } else { // idle / idle_b
    drawShoe(ctx, 40, 162, 26, 28);
    drawShoe(ctx, 66, 162, 26, 28);
  }
}

function drawChikuJacket(ctx: CanvasRenderingContext2D): void {
  // 作業ジャケット（ダークティール・台形シルエット）
  ctx.beginPath();
  ctx.moveTo(44, 96);
  ctx.lineTo(84, 96);
  ctx.quadraticCurveTo(92, 122, 90, 150);
  ctx.lineTo(38, 150);
  ctx.quadraticCurveTo(36, 122, 44, 96);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 96, 0, 150);
  g.addColorStop(0, shade(PLAYER_COAT_COLOR, 1.3));
  g.addColorStop(1, shade(PLAYER_COAT_COLOR, 0.62));
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = shade(PLAYER_COAT_COLOR, 0.4); ctx.stroke();
  // 前合わせ
  ctx.strokeStyle = shade(PLAYER_COAT_COLOR, 0.45);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(64, 98); ctx.lineTo(64, 148); ctx.stroke();
  // ブラスボタン 3 個
  for (let i = 0; i < 3; i++) {
    const by = 108 + i * 13;
    ctx.beginPath(); ctx.arc(64, by, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = toHex(PLAYER_BRASS_COLOR); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = shade(PLAYER_BRASS_COLOR, 0.6); ctx.stroke();
  }
  // 工具ベルト（真鍮バックル）
  ctx.fillStyle = shade(PLAYER_SHOE_COLOR, 0.9);
  roundRectPath(ctx, 40, 138, 48, 9, 3); ctx.fill();
  ctx.fillStyle = toHex(PLAYER_BRASS_COLOR);
  roundRectPath(ctx, 59, 138, 10, 9, 2); ctx.fill();
}

function drawChikuNeckerchief(ctx: CanvasRenderingContext2D): void {
  // 首元の赤いネッカチーフ（差し色 + 結び目）
  ctx.beginPath();
  ctx.moveTo(48, 92); ctx.lineTo(80, 92);
  ctx.lineTo(70, 102); ctx.lineTo(58, 102);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 88, 0, 104);
  g.addColorStop(0, shade(PLAYER_SCARF_COLOR, 1.3));
  g.addColorStop(1, shade(PLAYER_SCARF_COLOR, 0.8));
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = shade(PLAYER_SCARF_COLOR, 0.5); ctx.stroke();
  // 結び目
  ctx.beginPath(); ctx.arc(64, 98, 4, 0, Math.PI * 2);
  ctx.fillStyle = shade(PLAYER_SCARF_COLOR, 1.15); ctx.fill();
  // 垂れ
  ctx.beginPath();
  ctx.moveTo(62, 100); ctx.lineTo(58, 116); ctx.lineTo(67, 112); ctx.closePath();
  ctx.fillStyle = shade(PLAYER_SCARF_COLOR, 0.85); ctx.fill();
}

function drawChikuHead(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 36, 0, 90);
  g.addColorStop(0, shade(PLAYER_SKIN_COLOR, 1.06));
  g.addColorStop(1, shade(PLAYER_SKIN_COLOR, 0.84));
  roundRectPath(ctx, 42, 36, 46, 52, 20);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = shade(PLAYER_SKIN_COLOR, 0.55); ctx.stroke();
  // 耳
  ctx.beginPath(); ctx.arc(43, 64, 5, 0, Math.PI * 2);
  ctx.fillStyle = shade(PLAYER_SKIN_COLOR, 0.95); ctx.fill();
  // 前髪（茶・キャップからのぞく）
  ctx.fillStyle = shade(PLAYER_SHOE_COLOR, 1.1);
  ctx.beginPath();
  ctx.moveTo(44, 48);
  ctx.quadraticCurveTo(52, 38, 70, 42);
  ctx.quadraticCurveTo(60, 46, 56, 54);
  ctx.quadraticCurveTo(50, 50, 44, 54);
  ctx.closePath(); ctx.fill();
  // 頬の赤み
  ctx.fillStyle = 'rgba(228,118,88,0.35)';
  ctx.beginPath(); ctx.ellipse(52, 74, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(78, 74, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  // 左目（普通の点目。右目はモノクル側で描く）
  ctx.fillStyle = '#23303a';
  ctx.beginPath(); ctx.arc(54, 66, 3, 0, Math.PI * 2); ctx.fill();
  // 口（笑顔の弧）
  ctx.strokeStyle = 'rgba(120,60,40,0.9)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(64, 74, 7, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
}

function drawChikuMonocle(ctx: CanvasRenderingContext2D): void {
  const cx = 76, cy = 66;
  // レンズ（ティールの発光ガラス）
  const lg = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 10);
  lg.addColorStop(0, shade(PLAYER_GOGGLE_LENS_COLOR, 1.4));
  lg.addColorStop(0.6, toHex(PLAYER_GOGGLE_LENS_COLOR));
  lg.addColorStop(1, shade(PLAYER_GOGGLE_LENS_COLOR, 0.5));
  ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = lg; ctx.fill();
  // ブラスのリム
  ctx.lineWidth = 3; ctx.strokeStyle = toHex(PLAYER_BRASS_COLOR);
  ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = shade(PLAYER_BRASS_COLOR, 1.4);
  ctx.beginPath(); ctx.arc(cx, cy, 11.5, 0, Math.PI * 2); ctx.stroke();
  // 瞳
  ctx.fillStyle = '#08222a';
  ctx.beginPath(); ctx.arc(cx + 1, cy + 1, 3, 0, Math.PI * 2); ctx.fill();
  // グレア
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath(); ctx.ellipse(cx - 3, cy - 4, 3, 2, -0.6, 0, Math.PI * 2); ctx.fill();
  // 鎖（耳元から垂らす）
  ctx.strokeStyle = shade(PLAYER_BRASS_COLOR, 0.9);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx + 6, cy + 8); ctx.quadraticCurveTo(88, 84, 84, 96); ctx.stroke();
}

function drawSmallGear(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, teeth: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? r : r * 0.72;
    const px = cx + rad * Math.cos(a);
    const py = cy + rad * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawChikuCap(ctx: CanvasRenderingContext2D): void {
  // 後ろに傾けたニュースボーイ風キャップ（ネイビー）。前髪を残して浅くかぶる。
  const cg = ctx.createLinearGradient(0, 24, 0, 50);
  cg.addColorStop(0, shade(PLAYER_COLOR, 1.3));
  cg.addColorStop(1, shade(PLAYER_COLOR, 0.7));
  // クラウン（丸み）
  ctx.beginPath();
  ctx.moveTo(46, 50);
  ctx.quadraticCurveTo(44, 26, 66, 24);
  ctx.quadraticCurveTo(88, 24, 88, 48);
  ctx.quadraticCurveTo(70, 42, 46, 50);
  ctx.closePath();
  ctx.fillStyle = cg; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = shade(PLAYER_COLOR, 0.4); ctx.stroke();
  // つば（前方へ短く）
  ctx.beginPath();
  ctx.moveTo(44, 49); ctx.quadraticCurveTo(34, 50, 32, 54);
  ctx.quadraticCurveTo(40, 54, 48, 52);
  ctx.closePath();
  ctx.fillStyle = shade(PLAYER_COLOR, 0.55); ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = shade(PLAYER_COLOR, 0.4); ctx.stroke();
  // 歯車バッジ
  drawSmallGear(ctx, 74, 34, 7, 8, toHex(PLAYER_BRASS_COLOR));
  ctx.fillStyle = shade(PLAYER_BRASS_COLOR, 0.5);
  ctx.beginPath(); ctx.arc(74, 34, 2.5, 0, Math.PI * 2); ctx.fill();
  // てっぺんのつまみ
  ctx.beginPath(); ctx.arc(66, 24, 3, 0, Math.PI * 2);
  ctx.fillStyle = shade(PLAYER_COLOR, 0.6); ctx.fill();
  // ハイライト
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRectPath(ctx, 54, 28, 16, 5, 2); ctx.fill();
}

function drawOneArm(ctx: CanvasRenderingContext2D, sx: number, sy: number, hx: number, hy: number): void {
  // 袖（太い線）
  ctx.lineCap = 'round';
  ctx.strokeStyle = shade(PLAYER_COAT_COLOR, 0.95);
  ctx.lineWidth = 13;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
  // 袖ハイライト
  ctx.strokeStyle = shade(PLAYER_COAT_COLOR, 1.25);
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(sx - 2, sy); ctx.lineTo(hx - 2, hy); ctx.stroke();
  // ブラスカフス
  ctx.strokeStyle = toHex(PLAYER_BRASS_COLOR);
  ctx.lineWidth = 13;
  ctx.beginPath(); ctx.moveTo(hx, hy - 4); ctx.lineTo(hx, hy); ctx.stroke();
  // 手（肌）
  ctx.beginPath(); ctx.arc(hx, hy + 5, 6, 0, Math.PI * 2);
  ctx.fillStyle = toHex(PLAYER_SKIN_COLOR); ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = shade(PLAYER_SKIN_COLOR, 0.6); ctx.stroke();
}

function drawChikuArms(ctx: CanvasRenderingContext2D, frame: PlayerFrame): void {
  const lsx = 42, rsx = 86, sy = 100;
  let lhx = 36, lhy = 130, rhx = 92, rhy = 130;
  if (frame === 'walk1') { lhx = 34; lhy = 118; rhx = 94; rhy = 140; }
  else if (frame === 'walk2') { lhx = 34; lhy = 140; rhx = 94; rhy = 118; }
  else if (frame === 'jump') { lhx = 24; lhy = 70; rhx = 104; rhy = 70; }
  drawOneArm(ctx, lsx, sy, lhx, lhy);
  drawOneArm(ctx, rsx, sy, rhx, rhy);
}

function drawPlayerFrame(ctx: CanvasRenderingContext2D, ox: number, frame: PlayerFrame): void {
  drawChikuFrame(ctx, ox, frame);
}

function drawEnemyLeg(ctx: CanvasRenderingContext2D, x: number, topY: number, footY: number): void {
  // 脚（太い線）
  ctx.lineCap = 'round';
  ctx.strokeStyle = shade(ENEMY_DARK_COLOR, 0.85);
  ctx.lineWidth = 16;
  ctx.beginPath(); ctx.moveTo(x, topY); ctx.lineTo(x, footY); ctx.stroke();
  // 脚ハイライト
  ctx.strokeStyle = shade(ENEMY_DARK_COLOR, 1.4);
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x - 3, topY); ctx.lineTo(x - 3, footY); ctx.stroke();
  // 足（接地パッド）
  roundRectPath(ctx, x - 14, footY, 30, 12, 5);
  const fg = ctx.createLinearGradient(0, footY, 0, footY + 12);
  fg.addColorStop(0, shade(ENEMY_DARK_COLOR, 1.1));
  fg.addColorStop(1, shade(ENEMY_DARK_COLOR, 0.55));
  ctx.fillStyle = fg; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = shade(ENEMY_DARK_COLOR, 0.4); ctx.stroke();
}

/** 単眼（サイクロプス）の発光レンズ。敵の識別点。 */
function drawCyclopsEye(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  // ソケット（ダーク金属）
  ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.fillStyle = shade(ENEMY_DARK_COLOR, 0.5); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = toHex(ENEMY_COLOR); ctx.stroke();
  // 発光レンズ
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
  g.addColorStop(0, '#eafff9');
  g.addColorStop(0.35, '#7df2e2');
  g.addColorStop(0.72, toHex(ENEMY_ACCENT_COLOR));
  g.addColorStop(1, shade(ENEMY_ACCENT_COLOR, 0.45));
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  // 細い縦の瞳（不気味さ）
  ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.22, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#04201e'; ctx.fill();
  // ハイライト
  ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy - r * 0.4, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
}

/** 側面のピンサー（爪）腕。menace と識別性を上げる。 */
function drawPincer(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 1 | -1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  // 上爪
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.quadraticCurveTo(26, -4, 30, -16);
  ctx.quadraticCurveTo(22, -8, 4, -6); ctx.closePath();
  ctx.fillStyle = toHex(ENEMY_COLOR); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = shade(ENEMY_DARK_COLOR, 0.7); ctx.stroke();
  // 下爪
  ctx.beginPath();
  ctx.moveTo(0, 6); ctx.quadraticCurveTo(24, 8, 28, 18);
  ctx.quadraticCurveTo(20, 12, 4, 10); ctx.closePath();
  ctx.fillStyle = shade(ENEMY_COLOR, 0.85); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = shade(ENEMY_DARK_COLOR, 0.7); ctx.stroke();
  // 関節リベット
  ctx.beginPath(); ctx.arc(2, 3, 4, 0, Math.PI * 2);
  ctx.fillStyle = shade(ENEMY_COLOR, 1.2); ctx.fill();
  ctx.restore();
}

function drawEnemyFrame(ctx: CanvasRenderingContext2D, frame: EnemyFrame): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // ---- 脚（フレームで上下動）----
  if (frame === 'enemy_walk1') {
    drawEnemyLeg(ctx, 62, 142, 158);
    drawEnemyLeg(ctx, 114, 142, 148);
  } else if (frame === 'enemy_walk3') {
    drawEnemyLeg(ctx, 62, 142, 148);
    drawEnemyLeg(ctx, 114, 142, 158);
  } else {
    drawEnemyLeg(ctx, 62, 142, 153);
    drawEnemyLeg(ctx, 114, 142, 153);
  }

  // ---- ぜんまいキー（頭頂部）----
  ctx.strokeStyle = shade(ENEMY_DARK_COLOR, 0.95);
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(88, 34); ctx.lineTo(88, 6); ctx.stroke();
  ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(77, 9, 10, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(99, 9, 10, 0, Math.PI * 2); ctx.stroke();

  // ---- ピンサー腕（本体の後ろ・両側）----
  drawPincer(ctx, 36, 112, -1);
  drawPincer(ctx, 140, 112, 1);

  // ---- 胴体（前傾した暗い金属の装甲。台形で猫背シルエット）----
  ctx.beginPath();
  ctx.moveTo(50, 96); ctx.lineTo(126, 96);
  ctx.quadraticCurveTo(140, 124, 132, 148);
  ctx.lineTo(44, 148);
  ctx.quadraticCurveTo(36, 124, 50, 96);
  ctx.closePath();
  const bodyG = ctx.createLinearGradient(0, 96, 0, 148);
  bodyG.addColorStop(0, shade(ENEMY_DARK_COLOR, 1.5));
  bodyG.addColorStop(1, shade(ENEMY_DARK_COLOR, 0.8));
  ctx.fillStyle = bodyG; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = toHex(ENEMY_COLOR); ctx.stroke();
  // 胸の歯車（露出した機構）
  drawSmallGear(ctx, 88, 124, 13, 9, toHex(ENEMY_COLOR));
  ctx.beginPath(); ctx.arc(88, 124, 5, 0, Math.PI * 2);
  ctx.fillStyle = shade(ENEMY_DARK_COLOR, 0.9); ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = shade(ENEMY_COLOR, 1.2); ctx.stroke();
  // リベット
  for (const [bx, by] of [[52, 104], [124, 104]] as [number, number][]) {
    ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = toHex(ENEMY_COLOR); ctx.fill();
  }

  // ---- 頭部ハウジング（台形・暗い金属）----
  ctx.beginPath();
  ctx.moveTo(60, 96); ctx.lineTo(116, 96);
  ctx.lineTo(110, 44); ctx.quadraticCurveTo(88, 36, 66, 44);
  ctx.closePath();
  const headG = ctx.createLinearGradient(0, 40, 0, 96);
  headG.addColorStop(0, shade(ENEMY_DARK_COLOR, 1.35));
  headG.addColorStop(1, shade(ENEMY_DARK_COLOR, 0.75));
  ctx.fillStyle = headG; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = toHex(ENEMY_COLOR); ctx.stroke();

  // ---- 単眼（識別点）----
  drawCyclopsEye(ctx, 88, 70, 20);

  // ---- 角張った眉（怒り顔の menace）----
  ctx.fillStyle = toHex(ENEMY_COLOR);
  ctx.beginPath();
  ctx.moveTo(60, 50); ctx.lineTo(82, 60); ctx.lineTo(80, 66); ctx.lineTo(60, 58); ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(116, 50); ctx.lineTo(94, 60); ctx.lineTo(96, 66); ctx.lineTo(116, 58); ctx.closePath();
  ctx.fill();
}

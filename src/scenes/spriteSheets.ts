import Phaser from 'phaser';
import {
  TEX_KEY,
  PLAYER_COLOR, PLAYER_SKIN_COLOR, PLAYER_SHIRT_COLOR, PLAYER_VEST_COLOR,
  PLAYER_BRASS_COLOR, PLAYER_GOGGLE_LENS_COLOR, PLAYER_SHOE_COLOR,
  ENEMY_COLOR, ENEMY_DARK_COLOR,
  PLAYER_SPRITE_W, PLAYER_SPRITE_H,
  ENEMY_SPRITE_W, ENEMY_SPRITE_H,
  MUSHROOM_SPRITE_W, MUSHROOM_SPRITE_H,
  MUSHROOM_CAP_COLOR, MUSHROOM_DOT_COLOR,
  MUSHROOM_STEM_COLOR, MUSHROOM_STEM_DARK_COLOR,
  FIREFLOWER_SPRITE_W, FIREFLOWER_SPRITE_H,
  FIREFLOWER_PETAL_COLOR, FIREFLOWER_CENTER_COLOR,
  FIREFLOWER_STEM_COLOR, FIREFLOWER_LEAF_COLOR,
  STAR_SPRITE_W, STAR_SPRITE_H,
  STAR_COLOR, STAR_OUTLINE_COLOR,
  FIREBALL_COLOR, FIREBALL_HIGHLIGHT_COLOR
} from '../config/gameConfig';

type PlayerFrame = 'idle' | 'walk1' | 'walk2' | 'jump';
type EnemyFrame  = 'enemy_walk1' | 'enemy_walk2';

function toHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

// drawPlayerFrame は常に 32×48 の座標空間で描画する。
// フレームサイズが異なる場合は一時キャンバスで描いて drawImage でスケーリングする。
const PLAYER_DRAW_W = 32;
const PLAYER_DRAW_H = 48;

export function buildPlayerSheet(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.playerSheet)) return;
  const frameW = PLAYER_SPRITE_W;
  const frameH = PLAYER_SPRITE_H;
  const canvas = document.createElement('canvas');
  canvas.width  = frameW * 4;
  canvas.height = frameH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.imageSmoothingEnabled = false;

  const tmp = document.createElement('canvas');
  tmp.width  = PLAYER_DRAW_W;
  tmp.height = PLAYER_DRAW_H;
  const tmpCtx = tmp.getContext('2d');
  if (!tmpCtx) throw new Error('canvas 2d context unavailable');
  tmpCtx.imageSmoothingEnabled = false;

  const frames: PlayerFrame[] = ['idle', 'walk1', 'walk2', 'jump'];
  frames.forEach((frame, i) => {
    tmpCtx.clearRect(0, 0, PLAYER_DRAW_W, PLAYER_DRAW_H);
    drawPlayerFrame(tmpCtx, 0, frame);
    ctx.drawImage(tmp, 0, 0, PLAYER_DRAW_W, PLAYER_DRAW_H, i * frameW, 0, frameW, frameH);
    drawPlayerSoleSeal(ctx, i * frameW, frame);
  });

  const tex = scene.textures.addCanvas(TEX_KEY.playerSheet, canvas);
  if (!tex) throw new Error(`Failed to create texture: ${TEX_KEY.playerSheet}`);
  frames.forEach((name, i) => tex.add(name, 0, i * frameW, 0, frameW, frameH));
}

export function buildMushroomSheet(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.mushroom)) return;
  const W = MUSHROOM_SPRITE_W;
  const H = MUSHROOM_SPRITE_H;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  // 柄（下半分の中央矩形）
  ctx.fillStyle = toHex(MUSHROOM_STEM_COLOR);
  ctx.fillStyle = toHex(MUSHROOM_STEM_DARK_COLOR);
  ctx.fillRect(12, 12, 8, 18);
  ctx.fillRect(7, 16, 18, 4);
  ctx.fillStyle = toHex(MUSHROOM_STEM_COLOR);
  ctx.fillRect(14, 10, 4, 20);
  ctx.fillRect(9, 17, 14, 2);
  ctx.fillStyle = toHex(MUSHROOM_CAP_COLOR);
  ctx.fillRect(8, 5, 16, 5);

  // 傘（赤いドーム = 段階的に幅を広げた矩形 3 段）
  ctx.fillStyle = toHex(MUSHROOM_CAP_COLOR);
  ctx.fillRect(5, 8, 22, 5);
  ctx.fillRect(3, 12, 26, 4);
  ctx.fillRect(5, 16, 22, 3);

  // 水玉（白）
  ctx.fillStyle = toHex(MUSHROOM_DOT_COLOR);
  ctx.fillStyle = toHex(MUSHROOM_DOT_COLOR);
  ctx.fillRect(12, 8, 3, 3);
  ctx.fillRect(18, 8, 3, 3);
  ctx.fillRect(15, 13, 3, 2);

  if (!scene.textures.addCanvas(TEX_KEY.mushroom, canvas)) {
    throw new Error(`Failed to create texture: ${TEX_KEY.mushroom}`);
  }
}

export function buildFireflowerSheet(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.fireflower)) return;
  const canvas = document.createElement('canvas');
  canvas.width = FIREFLOWER_SPRITE_W;
  canvas.height = FIREFLOWER_SPRITE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  // 茎
  ctx.fillStyle = toHex(FIREFLOWER_STEM_COLOR);
  ctx.fillRect(15, 18, 2, 12);
  // 葉左
  ctx.fillStyle = toHex(FIREFLOWER_LEAF_COLOR);
  ctx.fillRect(10, 22, 5, 2);
  // 葉右
  ctx.fillRect(17, 22, 5, 2);
  // 花びら上
  ctx.fillStyle = toHex(FIREFLOWER_PETAL_COLOR);
  ctx.fillRect(13, 2, 6, 6);
  // 花びら左上
  ctx.fillRect(6, 6, 6, 6);
  // 花びら右上
  ctx.fillRect(20, 6, 6, 6);
  // 花びら左下
  ctx.fillRect(8, 13, 5, 5);
  // 花びら右下
  ctx.fillRect(19, 13, 5, 5);
  // 花芯
  ctx.fillStyle = toHex(FIREFLOWER_CENTER_COLOR);
  ctx.fillRect(13, 8, 6, 6);

  if (!scene.textures.addCanvas(TEX_KEY.fireflower, canvas)) {
    throw new Error(`Failed to create texture: ${TEX_KEY.fireflower}`);
  }
}

export function buildStarSheet(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.star)) return;
  const canvas = document.createElement('canvas');
  canvas.width = STAR_SPRITE_W;
  canvas.height = STAR_SPRITE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  // 輪郭層
  ctx.fillStyle = toHex(STAR_OUTLINE_COLOR);
  ctx.fillRect(11, 1, 6, 6);   // 上の点
  ctx.fillRect(1, 9, 26, 6);   // 横バンド
  ctx.fillRect(3, 14, 7, 12);  // 左下脚
  ctx.fillRect(18, 14, 7, 12); // 右下脚
  // 本体層
  ctx.fillStyle = toHex(STAR_COLOR);
  ctx.fillRect(12, 2, 4, 5);   // 上の点
  ctx.fillRect(2, 10, 24, 4);  // 横バンド
  ctx.fillRect(4, 14, 5, 11);  // 左下脚
  ctx.fillRect(19, 14, 5, 11); // 右下脚
  // ハイライト
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(13, 5, 2, 2);

  if (!scene.textures.addCanvas(TEX_KEY.star, canvas)) {
    throw new Error(`Failed to create texture: ${TEX_KEY.star}`);
  }
}

export function buildFireballSheet(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.fireball)) return;
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  // 外側オレンジ円
  ctx.fillStyle = toHex(FIREBALL_COLOR);
  ctx.beginPath();
  ctx.arc(8, 8, 7, 0, Math.PI * 2);
  ctx.fill();
  // 中心黄ハイライト
  ctx.fillStyle = toHex(FIREBALL_HIGHLIGHT_COLOR);
  ctx.beginPath();
  ctx.arc(8, 8, 3, 0, Math.PI * 2);
  ctx.fill();

  if (!scene.textures.addCanvas(TEX_KEY.fireball, canvas)) {
    throw new Error(`Failed to create texture: ${TEX_KEY.fireball}`);
  }
}

export function buildEnemySheet(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.enemySheet)) return;
  const frameW = ENEMY_SPRITE_W; // 44
  const frameH = ENEMY_SPRITE_H; // 44
  const canvas = document.createElement('canvas');
  canvas.width  = frameW * 2;
  canvas.height = frameH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  const frames: EnemyFrame[] = ['enemy_walk1', 'enemy_walk2'];
  frames.forEach((frame, i) => drawEnemyFrame(ctx, i * frameW, frame));

  const tex = scene.textures.addCanvas(TEX_KEY.enemySheet, canvas);
  if (!tex) throw new Error(`Failed to create texture: ${TEX_KEY.enemySheet}`);
  frames.forEach((name, i) => tex.add(name, 0, i * frameW, 0, frameW, frameH));
}

function drawChikuFrame(ctx: CanvasRenderingContext2D, ox: number, frame: PlayerFrame): void {
  ctx.fillStyle = toHex(PLAYER_SHIRT_COLOR);
  ctx.fillRect(ox + 5, 21, 22, 11);

  ctx.fillStyle = toHex(PLAYER_VEST_COLOR);
  ctx.fillRect(ox + 8, 21, 16, 13);
  ctx.fillRect(ox + 6, 24, 4, 8);
  ctx.fillRect(ox + 22, 24, 4, 8);

  ctx.fillStyle = toHex(PLAYER_BRASS_COLOR);
  ctx.fillRect(ox + 14, 24, 2, 2);
  ctx.fillRect(ox + 18, 24, 2, 2);
  ctx.fillRect(ox + 15, 29, 4, 2);

  ctx.fillStyle = toHex(PLAYER_COLOR);
  ctx.fillRect(ox + 7, 4, 18, 5);
  ctx.fillRect(ox + 5, 8, 22, 3);
  ctx.fillRect(ox + 22, 10, 6, 2);

  ctx.fillStyle = toHex(PLAYER_SKIN_COLOR);
  ctx.fillRect(ox + 8, 11, 16, 10);

  ctx.fillStyle = toHex(PLAYER_BRASS_COLOR);
  ctx.fillRect(ox + 7, 10, 18, 3);
  ctx.fillRect(ox + 10, 12, 6, 5);
  ctx.fillRect(ox + 17, 12, 6, 5);

  ctx.fillStyle = toHex(PLAYER_GOGGLE_LENS_COLOR);
  ctx.fillRect(ox + 11, 13, 4, 3);
  ctx.fillRect(ox + 18, 13, 4, 3);

  ctx.fillStyle = toHex(0x2b2118);
  ctx.fillRect(ox + 16, 18, 5, 2);

  if (frame === 'idle') {
    ctx.fillStyle = toHex(PLAYER_SHOE_COLOR);
    ctx.fillRect(ox + 10, 37, 6, 11);
    ctx.fillRect(ox + 16, 37, 6, 11);
    drawChikuHands(ctx, ox, 27, 27);
  } else if (frame === 'walk1') {
    ctx.fillStyle = toHex(PLAYER_SHOE_COLOR);
    ctx.fillRect(ox + 8, 37, 6, 11);
    ctx.fillRect(ox + 18, 39, 6, 9);
    drawChikuHands(ctx, ox, 25, 29);
  } else if (frame === 'walk2') {
    ctx.fillStyle = toHex(PLAYER_SHOE_COLOR);
    ctx.fillRect(ox + 8, 39, 6, 9);
    ctx.fillRect(ox + 18, 37, 6, 11);
    drawChikuHands(ctx, ox, 29, 25);
  } else if (frame === 'jump') {
    ctx.fillStyle = toHex(PLAYER_SHOE_COLOR);
    ctx.fillRect(ox + 9, 35, 6, 13);
    ctx.fillRect(ox + 17, 35, 6, 13);
    drawChikuHands(ctx, ox, 19, 19);
  }
}

function drawChikuHands(ctx: CanvasRenderingContext2D, ox: number, leftY: number, rightY: number): void {
  ctx.fillStyle = toHex(PLAYER_SHIRT_COLOR);
  ctx.fillRect(ox + 3, leftY, 4, 4);
  ctx.fillRect(ox + 25, rightY, 4, 4);
  ctx.fillStyle = toHex(PLAYER_SKIN_COLOR);
  ctx.fillRect(ox + 2, leftY + 3, 4, 3);
  ctx.fillRect(ox + 26, rightY + 3, 4, 3);
}

function drawPlayerFrame(ctx: CanvasRenderingContext2D, ox: number, frame: PlayerFrame): void {
  drawChikuFrame(ctx, ox, frame);
}

function drawPlayerSoleSeal(ctx: CanvasRenderingContext2D, frameX: number, frame: PlayerFrame): void {
  const scaleX = PLAYER_SPRITE_W / PLAYER_DRAW_W;
  const scaleY = PLAYER_SPRITE_H / PLAYER_DRAW_H;
  const soleY = PLAYER_SPRITE_H - Math.ceil(3 * scaleY);
  const soleH = PLAYER_SPRITE_H - soleY;
  const sourceRects = frame === 'jump'
    ? [{ x: 9, w: 14 }]
    : frame === 'idle'
      ? [{ x: 10, w: 12 }]
      : [{ x: 8, w: 16 }];

  ctx.fillStyle = toHex(PLAYER_SHOE_COLOR);
  for (const rect of sourceRects) {
    ctx.fillRect(
      frameX + Math.floor(rect.x * scaleX),
      soleY,
      Math.ceil(rect.w * scaleX),
      soleH
    );
  }
}

function drawEnemyFrame(ctx: CanvasRenderingContext2D, ox: number, frame: EnemyFrame): void {
  // --- 共通パーツ ---
  // 頭部
  ctx.fillStyle = toHex(ENEMY_COLOR);
  ctx.fillRect(ox + 6, 4, 32, 24);

  // 頭部下端ライン
  ctx.fillStyle = toHex(ENEMY_DARK_COLOR);
  ctx.fillRect(ox + 4, 26, 36, 3);

  // 目白左
  ctx.fillStyle = toHex(0xffffff);
  ctx.fillRect(ox + 10, 12, 6, 8);
  // 目白右
  ctx.fillRect(ox + 28, 12, 6, 8);

  // 瞳左
  ctx.fillStyle = toHex(0x000000);
  ctx.fillRect(ox + 13, 14, 3, 4);
  // 瞳右
  ctx.fillRect(ox + 29, 14, 3, 4);

  // 牙左
  ctx.fillStyle = toHex(0xffffff);
  ctx.fillRect(ox + 12, 22, 4, 3);
  // 牙右
  ctx.fillRect(ox + 28, 22, 4, 3);

  // --- フレーム別差分（足のみ）---
  ctx.fillStyle = toHex(ENEMY_DARK_COLOR);
  if (frame === 'enemy_walk1') {
    // 左足
    ctx.fillRect(ox + 4, 30, 10, 11);
    // 右足
    ctx.fillRect(ox + 30, 31, 10, 10);
  } else if (frame === 'enemy_walk2') {
    // 左足
    ctx.fillRect(ox + 4, 31, 10, 10);
    // 右足
    ctx.fillRect(ox + 30, 30, 10, 11);
  }
}

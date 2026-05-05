import Phaser from 'phaser';
import {
  TEX_KEY,
  PLAYER_COLOR, PLAYER_SKIN_COLOR, PLAYER_OVERALL_COLOR, PLAYER_SHOE_COLOR,
  ENEMY_COLOR, ENEMY_DARK_COLOR,
  PLAYER_SPRITE_W, PLAYER_SPRITE_H,
  ENEMY_SPRITE_W, ENEMY_SPRITE_H
} from '../config/gameConfig';

type PlayerFrame = 'idle' | 'walk1' | 'walk2' | 'jump';
type EnemyFrame  = 'enemy_walk1' | 'enemy_walk2';

function toHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

export function buildPlayerSheet(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.playerSheet)) return;
  const frameW = PLAYER_SPRITE_W; // 32
  const frameH = PLAYER_SPRITE_H; // 48
  const canvas = document.createElement('canvas');
  canvas.width  = frameW * 4;
  canvas.height = frameH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  const frames: PlayerFrame[] = ['idle', 'walk1', 'walk2', 'jump'];
  frames.forEach((frame, i) => drawPlayerFrame(ctx, i * frameW, frame));

  const tex = scene.textures.addCanvas(TEX_KEY.playerSheet, canvas);
  if (!tex) throw new Error(`Failed to create texture: ${TEX_KEY.playerSheet}`);
  frames.forEach((name, i) => tex.add(name, 0, i * frameW, 0, frameW, frameH));
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

function drawPlayerFrame(ctx: CanvasRenderingContext2D, ox: number, frame: PlayerFrame): void {
  // --- 共通パーツ ---
  // 帽子上面
  ctx.fillStyle = toHex(PLAYER_COLOR);
  ctx.fillRect(ox + 7, 4, 18, 4);
  // 帽子つば
  ctx.fillRect(ox + 4, 8, 24, 3);

  // 顔（肌）
  ctx.fillStyle = toHex(PLAYER_SKIN_COLOR);
  ctx.fillRect(ox + 8, 11, 16, 10);

  // 目
  ctx.fillStyle = toHex(0x000000);
  ctx.fillRect(ox + 16, 13, 2, 3);

  // ひげ
  ctx.fillStyle = toHex(0x000000);
  ctx.fillRect(ox + 11, 19, 10, 2);

  // 体（オーバーオール）
  ctx.fillStyle = toHex(PLAYER_OVERALL_COLOR);
  ctx.fillRect(ox + 6, 21, 20, 10);

  // 体（シャツ袖左）
  ctx.fillStyle = toHex(PLAYER_COLOR);
  ctx.fillRect(ox + 4, 22, 6, 6);
  // 体（シャツ袖右）
  ctx.fillRect(ox + 22, 22, 6, 6);

  // ボタン左
  ctx.fillStyle = toHex(0xf0d000);
  ctx.fillRect(ox + 11, 27, 2, 2);
  // ボタン右
  ctx.fillRect(ox + 19, 27, 2, 2);

  // --- フレーム別差分（足・手）---
  if (frame === 'idle') {
    // 左足
    ctx.fillStyle = toHex(PLAYER_SHOE_COLOR);
    ctx.fillRect(ox + 10, 37, 6, 9);
    // 右足
    ctx.fillRect(ox + 16, 37, 6, 9);
    // 両手
    ctx.fillStyle = toHex(PLAYER_SKIN_COLOR);
    ctx.fillRect(ox + 2, 27, 4, 4);
    ctx.fillRect(ox + 26, 27, 4, 4);

  } else if (frame === 'walk1') {
    // 左足前
    ctx.fillStyle = toHex(PLAYER_SHOE_COLOR);
    ctx.fillRect(ox + 8, 37, 6, 9);
    // 右足
    ctx.fillRect(ox + 18, 39, 6, 7);
    // 手
    ctx.fillStyle = toHex(PLAYER_SKIN_COLOR);
    ctx.fillRect(ox + 2, 25, 4, 4);
    ctx.fillRect(ox + 26, 29, 4, 4);

  } else if (frame === 'walk2') {
    // 左足
    ctx.fillStyle = toHex(PLAYER_SHOE_COLOR);
    ctx.fillRect(ox + 8, 39, 6, 7);
    // 右足前
    ctx.fillRect(ox + 18, 37, 6, 9);
    // 手
    ctx.fillStyle = toHex(PLAYER_SKIN_COLOR);
    ctx.fillRect(ox + 2, 29, 4, 4);
    ctx.fillRect(ox + 26, 25, 4, 4);

  } else if (frame === 'jump') {
    // 両足
    ctx.fillStyle = toHex(PLAYER_SHOE_COLOR);
    ctx.fillRect(ox + 9, 35, 6, 7);
    ctx.fillRect(ox + 17, 35, 6, 7);
    // 両手上
    ctx.fillStyle = toHex(PLAYER_SKIN_COLOR);
    ctx.fillRect(ox + 2, 19, 4, 4);
    ctx.fillRect(ox + 26, 19, 4, 4);
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

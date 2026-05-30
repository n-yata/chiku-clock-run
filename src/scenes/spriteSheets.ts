import Phaser from 'phaser';
import {
  TEX_KEY,
  PLAYER_COLOR, PLAYER_SKIN_COLOR, PLAYER_SHIRT_COLOR, PLAYER_VEST_COLOR,
  PLAYER_BRASS_COLOR, PLAYER_GOGGLE_LENS_COLOR, PLAYER_SHOE_COLOR,
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
export function buildBackgroundTile(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_KEY.bgTile)) return;
  const W = 320, H = 180;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');

  // 暗い石壁のグラデーション
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0a081a');
  grad.addColorStop(1, '#140c08');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 石積みの横目地
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let y = 24; y < H; y += 24) {
    ctx.fillRect(0, y, W, 1);
  }
  // 縦目地（互い違い）
  for (let row = 0; row < H / 24; row++) {
    const offset = (row % 2) * 40;
    for (let x = offset; x < W; x += 80) {
      ctx.fillRect(x, row * 24, 1, 24);
    }
  }

  // ギアシルエット（遠景）
  drawBgGear(ctx, 55,  80, 38, 10, 'rgba(18,12,36,0.9)');
  drawBgGear(ctx, 225, 48, 24,  8, 'rgba(16,10,30,0.85)');
  drawBgGear(ctx, 285, 148, 20, 8, 'rgba(14,10,26,0.85)');

  // パイプ（縦）
  ctx.fillStyle = 'rgba(35,20,55,0.7)';
  ctx.fillRect(130, 0, 7, H);
  ctx.fillStyle = 'rgba(60,35,90,0.4)';
  ctx.fillRect(131, 0, 2, H);

  // ランプの環境光グロー
  bgGlow(ctx, 38, 28, 55, 38);
  bgGlow(ctx, 268, 88, 42, 32);

  if (!scene.textures.addCanvas(TEX_KEY.bgTile, canvas)) {
    throw new Error(`Failed to create texture: ${TEX_KEY.bgTile}`);
  }
}

function drawBgGear(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, teeth: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? r * 1.22 : r;
    if (i === 0) ctx.moveTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
    else ctx.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0a081a';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
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
  // Winding key and square clockwork casing.
  ctx.fillStyle = toHex(ENEMY_DARK_COLOR);
  ctx.fillRect(ox + 20, 4, 4, 8);
  ctx.fillRect(ox + 11, 2, 22, 3);
  ctx.fillRect(ox + 11, 2, 3, 7);
  ctx.fillRect(ox + 30, 2, 3, 7);
  ctx.fillRect(ox + 4, 12, 36, 22);

  ctx.fillStyle = toHex(ENEMY_COLOR);
  ctx.fillRect(ox + 7, 14, 30, 17);
  ctx.fillRect(ox + 15, 4, 14, 3);

  ctx.fillStyle = toHex(ENEMY_ACCENT_COLOR);
  ctx.fillRect(ox + 10, 18, 5, 5);
  ctx.fillRect(ox + 29, 18, 5, 5);
  ctx.fillRect(ox + 17, 17, 10, 3);
  ctx.fillRect(ox + 20, 20, 4, 7);
  ctx.fillRect(ox + 17, 24, 3, 3);

  ctx.fillStyle = toHex(ENEMY_DARK_COLOR);
  ctx.fillRect(ox + 7, 31, 30, 3);
  ctx.fillStyle = toHex(ENEMY_DARK_COLOR);
  if (frame === 'enemy_walk1') {
    ctx.fillRect(ox + 6, 34, 11, 7);
    ctx.fillRect(ox + 27, 35, 11, 6);
    ctx.fillRect(ox + 4, 40, 14, 2);
    ctx.fillRect(ox + 26, 40, 14, 2);
  } else if (frame === 'enemy_walk2') {
    ctx.fillRect(ox + 6, 35, 11, 6);
    ctx.fillRect(ox + 27, 34, 11, 7);
    ctx.fillRect(ox + 4, 40, 14, 2);
    ctx.fillRect(ox + 26, 40, 14, 2);
  }
}

// ゲーム全体の物理・寸法・閾値・テクスチャキーを集約。
// 数値リテラルの直書き禁止 — シーン側はここから import すること。

export const VIEWPORT_WIDTH = 960;
export const VIEWPORT_HEIGHT = 540;
export const TILE_SIZE = 32;

export const GRAVITY_Y = 800;
export const PLAYER_SPEED = 200;
export const JUMP_VELOCITY = -450;

export const PLAYER_SPRITE_W = 32;
export const PLAYER_SPRITE_H = 48;
export const GOAL_SPRITE_W = 32;
export const GOAL_SPRITE_H = 64;

export const FALL_THRESHOLD_Y = VIEWPORT_HEIGHT + 200;

export const BG_COLOR = '#5c94fc';

export const PLAYER_COLOR = 0xc0392b;
export const GROUND_COLOR = 0x8b4513;
export const GOAL_COLOR = 0xffd700;

export const TEX_KEY = {
  player: 'player',
  ground: 'ground',
  goal: 'goal'
} as const;

export const CAMERA_LERP_X = 0.1;
export const CAMERA_LERP_Y = 0.1;

export const TOUCH_HOLD_MS = 180;

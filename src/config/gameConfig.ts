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
  goal: 'goal',
  enemy: 'enemy',
  coin: 'coin'
} as const;

export const CAMERA_LERP_X = 0.1;
export const CAMERA_LERP_Y = 0.1;

// --- タッチ操作 (mobile-controls-responsive スプリント) ---
/** 左ゾーンのスライド判定しきい値 (px)。基準Xからこの値を超えた時点で左右移動を開始する。 */
export const TOUCH_SLIDE_THRESHOLD_PX = 12;
/** タッチゾーン分割比率。0.5 で画面中央、左 < 0.5 が移動、>= 0.5 がジャンプ。 */
export const TOUCH_ZONE_SPLIT_RATIO = 0.5;

// --- v0.2: 敵 (Enemy) ---
export const ENEMY_SPRITE_W = 28;
export const ENEMY_SPRITE_H = 28;
export const ENEMY_COLOR = 0x8b572a;
export const ENEMY_SPEED = 60;
export const STOMP_BOUNCE_VELOCITY = -280;
export const STOMP_TOLERANCE_PX = 6;

// --- v0.2: コイン (Coin) ---
export const COIN_SPRITE_W = 16;
export const COIN_SPRITE_H = 16;
export const COIN_COLOR = 0xf1c40f;

// --- v0.2: ミス演出 ---
export const MISS_FLASH_MS = 150;
export const MISS_FLASH_COLOR = 0xffffff;

// --- v0.2: HUD ---
export const HUD_FONT_SIZE = '18px';
export const HUD_FONT_COLOR = '#ffffff';
export const HUD_STROKE_COLOR = '#000000';
export const HUD_STROKE_THICKNESS = 4;
export const HUD_COIN_LABEL = 'コイン';
export const HUD_COIN_X = 16;
export const HUD_COIN_Y = 40;

// --- v0.3: BGM / SE ---

export type SeWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface SeStep {
  freqStart: number;
  freqEnd: number;
  durationSec: number;
  attackSec: number;
  peakGain: number;
  waveform: SeWaveform;
  /** 前ステップ開始からの相対オフセット秒。0 で同時発火。 */
  offsetSec: number;
}

export interface SeDefinition {
  steps: ReadonlyArray<SeStep>;
}

export const AUDIO_MASTER_GAIN = 0.5;
export const AUDIO_BGM_GAIN = 0.6;

export const SE_PARAMS: Record<'jump' | 'coin' | 'stomp' | 'miss' | 'goal', SeDefinition> = {
  jump: {
    steps: [
      { freqStart: 440, freqEnd: 880, durationSec: 0.12, attackSec: 0.005, peakGain: 0.3, waveform: 'square', offsetSec: 0 }
    ]
  },
  coin: {
    steps: [
      { freqStart: 988,  freqEnd: 988,  durationSec: 0.07, attackSec: 0.002, peakGain: 0.3, waveform: 'square', offsetSec: 0 },
      { freqStart: 1568, freqEnd: 1568, durationSec: 0.07, attackSec: 0.002, peakGain: 0.3, waveform: 'square', offsetSec: 0.07 }
    ]
  },
  stomp: {
    steps: [
      { freqStart: 220, freqEnd: 110, durationSec: 0.10, attackSec: 0.002, peakGain: 0.4, waveform: 'square', offsetSec: 0 }
    ]
  },
  miss: {
    steps: [
      { freqStart: 330, freqEnd: 110, durationSec: 0.50, attackSec: 0.010, peakGain: 0.35, waveform: 'sawtooth', offsetSec: 0 }
    ]
  },
  goal: {
    steps: [
      { freqStart: 523,  freqEnd: 523,  durationSec: 0.15, attackSec: 0.005, peakGain: 0.35, waveform: 'square', offsetSec: 0 },
      { freqStart: 659,  freqEnd: 659,  durationSec: 0.15, attackSec: 0.005, peakGain: 0.35, waveform: 'square', offsetSec: 0.15 },
      { freqStart: 784,  freqEnd: 784,  durationSec: 0.15, attackSec: 0.005, peakGain: 0.35, waveform: 'square', offsetSec: 0.30 },
      { freqStart: 1047, freqEnd: 1047, durationSec: 0.20, attackSec: 0.005, peakGain: 0.40, waveform: 'square', offsetSec: 0.45 }
    ]
  }
};

/** BGM の 1 ステップあたりのミリ秒（BPM=120, 16分音符相当）。 */
export const BGM_STEP_MS = 125;
/** BGM 各ノートの実音長（ms）。STEP_MS より短くしてレガート防止。 */
export const BGM_NOTE_DURATION_MS = 100;
/** BGM 1 ノートのピーク gain。SE より大幅に小さくして BGM がSEをマスクしない。 */
export const BGM_NOTE_PEAK_GAIN = 0.08;
/** BGM ノートのアタック時間（秒）。 */
export const BGM_NOTE_ATTACK_SEC = 0.005;
/** BGM ノートの波形。 */
export const BGM_WAVEFORM: SeWaveform = 'square';
/** BGM ループパターン（Hz）。16 ステップの矩形波アルペジオ。 */
export const BGM_PATTERN: ReadonlyArray<number> = [
  523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, 523.25, 987.77,
  523.25, 659.25, 783.99, 880.00,  783.99, 659.25, 523.25, 783.99
];
/** ゴール時の BGM フェードアウト時間（ms）。 */
export const BGM_FADE_OUT_MS = 1500;

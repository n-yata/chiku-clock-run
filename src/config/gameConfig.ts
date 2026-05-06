// ゲーム全体の物理・寸法・閾値・テクスチャキーを集約。
// 数値リテラルの直書き禁止 — シーン側はここから import すること。

export const VIEWPORT_WIDTH = 960;
export const VIEWPORT_HEIGHT = 540;
export const TILE_SIZE = 32;

export const GRAVITY_Y = 800;
export const PLAYER_SPEED = 200;
export const JUMP_VELOCITY = -450;

export const PLAYER_SPRITE_W = 40;
export const PLAYER_SPRITE_H = 56;
export const GOAL_SPRITE_W = 32;
export const GOAL_SPRITE_H = 64;

export const FALL_THRESHOLD_Y = VIEWPORT_HEIGHT + 200;

export const BG_COLOR = '#5c94fc';

export const PLAYER_COLOR = 0xc0392b;
export const PLAYER_SKIN_COLOR    = 0xffd6a8;
export const PLAYER_OVERALL_COLOR = 0x2e3aa8;
export const PLAYER_SHOE_COLOR    = 0x6b4226;
export const GROUND_COLOR = 0x8b4513;
export const GOAL_COLOR = 0xffd700;

export type PlayerState = 'small' | 'big' | 'fire';

export const TEX_KEY = {
  playerSheet: 'player_sheet',
  ground: 'ground',
  goal: 'goal',
  enemySheet: 'enemy_sheet',
  coin: 'coin',
  mushroom: 'mushroom',
  fireflower: 'fireflower',
  star: 'star',
  fireball: 'fireball'
} as const;

export const ANIM_KEY = {
  playerIdle: 'player_idle',
  playerWalk: 'player_walk',
  playerJump: 'player_jump',
  enemyWalk:  'enemy_walk'
} as const;

export const PLAYER_ANIM_WALK_FPS = 8;
export const ENEMY_ANIM_WALK_FPS = 6;

export const CAMERA_LERP_X = 0.1;
export const CAMERA_LERP_Y = 0.1;

// --- タッチ操作 (mobile-controls-responsive スプリント) ---
/** 左ゾーンのスライド判定しきい値 (px)。基準Xからこの値を超えた時点で左右移動を開始する。 */
export const TOUCH_SLIDE_THRESHOLD_PX = 12;
/** タッチゾーン分割比率。0.5 で画面中央、左 < 0.5 が移動、>= 0.5 がジャンプ。 */
export const TOUCH_ZONE_SPLIT_RATIO = 0.5;

// --- v0.2: 敵 (Enemy) ---
export const ENEMY_SPRITE_W = 44;
export const ENEMY_SPRITE_H = 44;
export const ENEMY_COLOR = 0x8b572a;
export const ENEMY_DARK_COLOR = 0x5a3818;
export const ENEMY_SPEED = 60;
export const STOMP_BOUNCE_VELOCITY = -280;

// --- v0.2: コイン (Coin) ---
export const COIN_SPRITE_W = 32;
export const COIN_SPRITE_H = 32;
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

export const SE_PARAMS: Record<'jump' | 'coin' | 'stomp' | 'miss' | 'goal' | 'mushroom' | 'powerup' | 'fireball' | 'star', SeDefinition> = {
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
  },
  mushroom: {
    steps: [
      { freqStart: 523,  freqEnd: 523,  durationSec: 0.08, attackSec: 0.003, peakGain: 0.30, waveform: 'square', offsetSec: 0    },
      { freqStart: 659,  freqEnd: 659,  durationSec: 0.08, attackSec: 0.003, peakGain: 0.30, waveform: 'square', offsetSec: 0.08 },
      { freqStart: 784,  freqEnd: 784,  durationSec: 0.10, attackSec: 0.003, peakGain: 0.32, waveform: 'square', offsetSec: 0.16 },
      { freqStart: 1047, freqEnd: 1319, durationSec: 0.18, attackSec: 0.003, peakGain: 0.35, waveform: 'square', offsetSec: 0.26 }
    ]
  },
  powerup: {
    steps: [
      { freqStart: 523,  freqEnd: 523,  durationSec: 0.06, attackSec: 0.003, peakGain: 0.30, waveform: 'square', offsetSec: 0.00 },
      { freqStart: 659,  freqEnd: 659,  durationSec: 0.06, attackSec: 0.003, peakGain: 0.30, waveform: 'square', offsetSec: 0.06 },
      { freqStart: 784,  freqEnd: 784,  durationSec: 0.06, attackSec: 0.003, peakGain: 0.32, waveform: 'square', offsetSec: 0.12 },
      { freqStart: 1047, freqEnd: 1047, durationSec: 0.06, attackSec: 0.003, peakGain: 0.34, waveform: 'square', offsetSec: 0.18 },
      { freqStart: 1568, freqEnd: 1976, durationSec: 0.20, attackSec: 0.003, peakGain: 0.38, waveform: 'square', offsetSec: 0.24 }
    ]
  },
  fireball: {
    steps: [
      { freqStart: 880, freqEnd: 1760, durationSec: 0.08, attackSec: 0.002, peakGain: 0.25, waveform: 'square', offsetSec: 0 }
    ]
  },
  star: {
    steps: [
      { freqStart: 784,  freqEnd: 784,  durationSec: 0.05, attackSec: 0.002, peakGain: 0.28, waveform: 'square',   offsetSec: 0.00 },
      { freqStart: 988,  freqEnd: 988,  durationSec: 0.05, attackSec: 0.002, peakGain: 0.28, waveform: 'square',   offsetSec: 0.05 },
      { freqStart: 1175, freqEnd: 1175, durationSec: 0.05, attackSec: 0.002, peakGain: 0.30, waveform: 'square',   offsetSec: 0.10 },
      { freqStart: 1568, freqEnd: 1568, durationSec: 0.05, attackSec: 0.002, peakGain: 0.32, waveform: 'square',   offsetSec: 0.15 },
      { freqStart: 1976, freqEnd: 2349, durationSec: 0.25, attackSec: 0.002, peakGain: 0.36, waveform: 'triangle', offsetSec: 0.20 }
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

// --- v0.4: ステージ進行 ---
/** クリア後、次ステージ遷移のフェードアウト開始までの待ち時間 (ms) */
export const STAGE_CLEAR_DELAY_MS = 1200;
/** カメラフェードイン/アウト時間 (ms) */
export const STAGE_FADE_MS = 600;
/** true にすると window.location.reload() 経路を使う（床貫通バグ再発時のフォールバック） */
export const USE_HARD_RELOAD_FALLBACK = false;
/** reload フォールバック時にステージ番号を退避する sessionStorage キー */
export const STAGE_INDEX_STORAGE_KEY = 'mario-game.stageIndex';
/** HUD ステージ表示の Y 座標（px） */
export const HUD_STAGE_Y = 16;
/** HUD ステージ表示ラベル */
export const HUD_STAGE_LABEL = 'STAGE';

// --- v0.5: タイトル画面 ---
export const GAME_TITLE = 'MARIO-LIKE GAME';
export const TITLE_FONT_FAMILY = 'system-ui, sans-serif';
export const TITLE_FONT_SIZE = '72px';
export const TITLE_FONT_COLOR = '#ffffff';
export const TITLE_STROKE_COLOR = '#000000';
export const TITLE_STROKE_THICKNESS = 8;
export const TITLE_PROMPT_TEXT = 'Press SPACE / Tap to Start';
export const TITLE_PROMPT_FONT_SIZE = '24px';
export const TITLE_PROMPT_OFFSET_Y = 80;
export const TITLE_PROMPT_BLINK_MS = 500;
export const ALL_CLEAR_TO_TITLE_DELAY_MS = 2500;

// --- v0.9: ライフ / パワーアップ ---
export const INITIAL_LIVES = 3;
export const MIN_LIVES = 0;
export const INVINCIBLE_MS = 1500;
export const INVINCIBLE_BLINK_MS = 100;
export const BIG_SCALE = 1.5;
export const MUSHROOM_SPRITE_W = 32;
export const MUSHROOM_SPRITE_H = 32;
export const MUSHROOM_CAP_COLOR = 0xe53935;
export const MUSHROOM_DOT_COLOR = 0xffffff;
export const MUSHROOM_STEM_COLOR = 0xfff1c1;
export const MUSHROOM_STEM_DARK_COLOR = 0xc9a96e;
export const STAGE_MUSHROOM_MIN = 0;
export const STAGE_MUSHROOM_MAX = 5;
export const HUD_LIFE_LABEL = 'ライフ';
export const HUD_LIFE_HEART = '♥';
export const HUD_LIFE_X = 16;
export const HUD_LIFE_Y = 64;
export const HUD_INSTRUCTION_Y = 88;
export const GAME_OVER_TEXT = 'GAME OVER';
export const GAME_OVER_TO_TITLE_DELAY_MS = 2500;

// --- v1.0: ファイアフラワー / スター ---
export const FIREBALL_SPEED_X = 360;
export const FIREBALL_SPEED_Y = -180;
export const FIREBALL_BOUNCE_Y = 0.7;
export const FIREBALL_BOUNCE_COUNT = 3;
export const FIREBALL_LIFETIME_MS = 2500;
export const FIREBALL_MAX_COUNT = 2;
export const FIREBALL_COOLDOWN_MS = 200;
export const FIREBALL_SPRITE_W = 16;
export const FIREBALL_SPRITE_H = 16;
export const FIREBALL_BODY_W = 12;
export const FIREBALL_BODY_H = 12;
export const FIREBALL_COLOR = 0xff7a00;
export const FIREBALL_HIGHLIGHT_COLOR = 0xffe066;
export const STAR_INVINCIBLE_MS = 8000;
export const STAR_BLINK_MS = 80;
export const STAR_END_WARNING_MS = 1500;
export const STAR_SPRITE_W = 28;
export const STAR_SPRITE_H = 28;
export const STAR_COLOR = 0xffd23f;
export const STAR_OUTLINE_COLOR = 0xb37700;
export const FIREFLOWER_SPRITE_W = 32;
export const FIREFLOWER_SPRITE_H = 32;
export const FIREFLOWER_PETAL_COLOR = 0xff5252;
export const FIREFLOWER_CENTER_COLOR = 0xffe066;
export const FIREFLOWER_STEM_COLOR = 0x2e8b57;
export const FIREFLOWER_LEAF_COLOR = 0x4caf50;
export const PLAYER_FIRE_TINT = 0xffe0a0;
export const STAGE_FIREFLOWER_MIN = 0;
export const STAGE_FIREFLOWER_MAX = 3;
export const STAGE_STAR_MIN = 0;
export const STAGE_STAR_MAX = 2;
export const DOUBLE_TAP_MS = 300;
export const HUD_FIRE_LABEL = 'PC: ←/→ Space/↑ R  [FIRE: Z]   スマホ: スライド移動 / 右タップジャンプ / 右ダブルタップFIRE';

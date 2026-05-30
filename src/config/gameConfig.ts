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
export const BEACON_SPRITE_W = 32;
export const BEACON_SPRITE_H = 64;

export const FALL_THRESHOLD_Y = VIEWPORT_HEIGHT + 200;

export const BG_COLOR = '#5c94fc';

export const PLAYER_COLOR = 0x2f5d50;
export const PLAYER_SKIN_COLOR    = 0xffd6a8;
export const PLAYER_OVERALL_COLOR = 0x345f46;
export const PLAYER_SHIRT_COLOR = 0xf4f1e8;
export const PLAYER_VEST_COLOR = 0x345f46;
export const PLAYER_BRASS_COLOR = 0xc9973a;
export const PLAYER_GOGGLE_LENS_COLOR = 0x8ed4d8;
export const PLAYER_SHOE_COLOR    = 0x6b4226;
export const GROUND_COLOR = 0x8b4513;
export const BEACON_COLOR = 0x42c5bb;

export type PlayerState = 'small' | 'big' | 'fire';

export const TEX_KEY = {
  playerSheet: 'player_sheet',
  ground: 'ground',
  beacon: 'beacon',
  enemySheet: 'enemy_sheet',
  gearBit: 'gear_bit',
  springCoil: 'spring_coil',
  pulseCore: 'pulse_core',
  chronoCrystal: 'chrono_crystal',
  pulseBolt: 'pulse_bolt',
  /** 演出用パーティクル（白い小ドット）。tint で各演出色に着色する。 */
  particle: 'particle_dot'
} as const;

export const ANIM_KEY = {
  playerIdle: 'player_idle',
  playerWalk: 'player_walk',
  playerJump: 'player_jump',
  winderWalk: 'winder_walk'
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
export const ENEMY_ACCENT_COLOR = 0x5ecabc;
export const ENEMY_SPEED = 60;
export const STOMP_BOUNCE_VELOCITY = -280;

// --- v0.2: 歯車片 (Gear Bit) ---
export const GEAR_BIT_SPRITE_W = 32;
export const GEAR_BIT_SPRITE_H = 32;
export const GEAR_BIT_COLOR = 0xc9973a;

// --- v0.2: ミス演出 ---
export const MISS_FLASH_MS = 150;
export const MISS_FLASH_COLOR = 0xffffff;

// --- v0.2: HUD ---
export const HUD_FONT_SIZE = '18px';
export const HUD_FONT_COLOR = '#ffffff';
export const HUD_STROKE_COLOR = '#000000';
export const HUD_STROKE_THICKNESS = 4;
export const HUD_GEAR_LABEL = '歯車片';
export const HUD_GEAR_X = 16;
export const HUD_GEAR_Y = 40;

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

export const SE_PARAMS: Record<'jump' | 'land' | 'gearBit' | 'stomp' | 'miss' | 'beacon' | 'springCoil' | 'pulseCore' | 'pulseBolt' | 'chronoCrystal', SeDefinition> = {
  jump: {
    steps: [
      { freqStart: 440, freqEnd: 880, durationSec: 0.12, attackSec: 0.005, peakGain: 0.3, waveform: 'square', offsetSec: 0 }
    ]
  },
  land: {
    // 着地の軽い「トッ」という低めの短打音。ジャンプ音とかぶらないよう控えめに。
    steps: [
      { freqStart: 200, freqEnd: 90, durationSec: 0.08, attackSec: 0.002, peakGain: 0.22, waveform: 'square', offsetSec: 0 }
    ]
  },
  gearBit: {
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
  beacon: {
    steps: [
      { freqStart: 523,  freqEnd: 523,  durationSec: 0.15, attackSec: 0.005, peakGain: 0.35, waveform: 'square', offsetSec: 0 },
      { freqStart: 659,  freqEnd: 659,  durationSec: 0.15, attackSec: 0.005, peakGain: 0.35, waveform: 'square', offsetSec: 0.15 },
      { freqStart: 784,  freqEnd: 784,  durationSec: 0.15, attackSec: 0.005, peakGain: 0.35, waveform: 'square', offsetSec: 0.30 },
      { freqStart: 1047, freqEnd: 1047, durationSec: 0.20, attackSec: 0.005, peakGain: 0.40, waveform: 'square', offsetSec: 0.45 }
    ]
  },
  springCoil: {
    steps: [
      { freqStart: 523,  freqEnd: 523,  durationSec: 0.08, attackSec: 0.003, peakGain: 0.30, waveform: 'square', offsetSec: 0    },
      { freqStart: 659,  freqEnd: 659,  durationSec: 0.08, attackSec: 0.003, peakGain: 0.30, waveform: 'square', offsetSec: 0.08 },
      { freqStart: 784,  freqEnd: 784,  durationSec: 0.10, attackSec: 0.003, peakGain: 0.32, waveform: 'square', offsetSec: 0.16 },
      { freqStart: 1047, freqEnd: 1319, durationSec: 0.18, attackSec: 0.003, peakGain: 0.35, waveform: 'square', offsetSec: 0.26 }
    ]
  },
  pulseCore: {
    steps: [
      { freqStart: 523,  freqEnd: 523,  durationSec: 0.06, attackSec: 0.003, peakGain: 0.30, waveform: 'square', offsetSec: 0.00 },
      { freqStart: 659,  freqEnd: 659,  durationSec: 0.06, attackSec: 0.003, peakGain: 0.30, waveform: 'square', offsetSec: 0.06 },
      { freqStart: 784,  freqEnd: 784,  durationSec: 0.06, attackSec: 0.003, peakGain: 0.32, waveform: 'square', offsetSec: 0.12 },
      { freqStart: 1047, freqEnd: 1047, durationSec: 0.06, attackSec: 0.003, peakGain: 0.34, waveform: 'square', offsetSec: 0.18 },
      { freqStart: 1568, freqEnd: 1976, durationSec: 0.20, attackSec: 0.003, peakGain: 0.38, waveform: 'square', offsetSec: 0.24 }
    ]
  },
  pulseBolt: {
    steps: [
      { freqStart: 880, freqEnd: 1760, durationSec: 0.08, attackSec: 0.002, peakGain: 0.25, waveform: 'square', offsetSec: 0 }
    ]
  },
  chronoCrystal: {
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
export const STAGE_INDEX_STORAGE_KEY = 'chiku-clock-run.stageIndex';
export const LEGACY_STAGE_INDEX_STORAGE_KEY = 'mario-game.stageIndex';
/** HUD ステージ表示の Y 座標（px） */
export const HUD_STAGE_Y = 16;
/** HUD ステージ表示ラベル */
export const HUD_STAGE_LABEL = 'STAGE';

// --- v0.5: タイトル画面 ---
export const GAME_TITLE = 'CHIKU CLOCK RUN';
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
export const MAX_LIVES = 99;
export const INVINCIBLE_MS = 1500;
export const INVINCIBLE_BLINK_MS = 100;
export const BIG_SCALE = 1.5;
export const SPRING_COIL_SPRITE_W = 32;
export const SPRING_COIL_SPRITE_H = 32;
export const SPRING_COIL_BRASS_COLOR = 0xc9973a;
export const SPRING_COIL_HIGHLIGHT_COLOR = 0xf4d58d;
export const SPRING_COIL_DARK_COLOR = 0x6f5628;
export const STAGE_SPRING_COIL_MIN = 0;
export const STAGE_SPRING_COIL_MAX = 5;
export const HUD_LIFE_LABEL = 'ライフ';
export const HUD_LIFE_HEART = '♥';
export const HUD_LIFE_X = 16;
export const HUD_LIFE_Y = 64;
export const HUD_INSTRUCTION_Y = 88;
export const GAME_OVER_TEXT = 'GAME OVER';
export const GAME_OVER_TO_TITLE_DELAY_MS = 2500;

// --- v1.0: パルスコア / クロノクリスタル ---
export const PULSE_BOLT_SPEED_X = 360;
export const PULSE_BOLT_SPEED_Y = -180;
export const PULSE_BOLT_BOUNCE_Y = 0.7;
export const PULSE_BOLT_BOUNCE_COUNT = 3;
export const PULSE_BOLT_LIFETIME_MS = 2500;
export const PULSE_BOLT_MAX_COUNT = 2;
export const PULSE_BOLT_COOLDOWN_MS = 200;
export const PULSE_BOLT_SPRITE_W = 16;
export const PULSE_BOLT_SPRITE_H = 16;
export const PULSE_BOLT_BODY_W = 12;
export const PULSE_BOLT_BODY_H = 12;
export const PULSE_BOLT_COLOR = 0x40dce5;
export const PULSE_BOLT_HIGHLIGHT_COLOR = 0xe2fdff;
export const CHRONO_INVINCIBLE_MS = 8000;
export const CHRONO_BLINK_MS = 80;
export const CHRONO_END_WARNING_MS = 1500;
export const CHRONO_CRYSTAL_SPRITE_W = 28;
export const CHRONO_CRYSTAL_SPRITE_H = 28;
export const CHRONO_CRYSTAL_COLOR = 0x4fcad1;
export const CHRONO_CRYSTAL_OUTLINE_COLOR = 0x18545d;
export const PULSE_CORE_SPRITE_W = 32;
export const PULSE_CORE_SPRITE_H = 32;
export const PULSE_CORE_OUTER_COLOR = 0x16737a;
export const PULSE_CORE_INNER_COLOR = 0x7ff7ef;
export const PULSE_CORE_WIRE_COLOR = 0xc9973a;
export const PLAYER_FIRE_TINT = 0xffe0a0;
export const STAGE_PULSE_CORE_MIN = 0;
export const STAGE_PULSE_CORE_MAX = 3;
export const STAGE_CHRONO_CRYSTAL_MIN = 0;
export const STAGE_CHRONO_CRYSTAL_MAX = 2;
export const DOUBLE_TAP_MS = 300;
export const HUD_PULSE_LABEL = 'PC: ←/→ Space/↑ R  [PULSE: Z]   スマホ: スライド移動 / 右タップジャンプ / 右ダブルタップPULSE';

// --- アニメーション追加: やられ演出 ---
/** プレイヤー死亡時の上方向初速 (px/s)。負値で上方向。 */
export const PLAYER_DEATH_BOUNCE_VY = -280;
/** プレイヤー死亡アニメーション開始からライフ処理までの遅延 (ms)。 */
export const PLAYER_DEATH_FALL_MS = 800;
/** 敵死亡アニメーションの落下距離 (px)。 */
export const ENEMY_DEATH_FALL_DISTANCE = 200;
/** 敵死亡アニメーションの持続時間 (ms)。 */
export const ENEMY_DEATH_FALL_MS = 500;

// =====================================================================
// UI ブラッシュアップスプリント (20260530-ui-brushup-sprint)
// 値の確定根拠は .steering/20260530-ui-brushup-sprint/decisions.md を参照。
// =====================================================================

// --- ゲームフィール: ジャンプ ---
/** コヨーテタイム (ms)。接地を離れてからこの時間内はジャンプを受け付ける。 */
export const COYOTE_TIME_MS = 100;
/** ジャンプ入力バッファ (ms)。着地前のこの時間内の入力を着地時に発火する。 */
export const JUMP_BUFFER_MS = 120;
/** 可変ジャンプ: 上昇中にジャンプ入力を離した際の Y 速度減衰率。 */
export const JUMP_CUT_MULTIPLIER = 0.45;
/** 可変ジャンプの最小上昇速度 (px/s, 負値)。これより遅くは切り詰めない下限。 */
export const MIN_JUMP_VELOCITY = -180;
/** 着地演出を発火する最小落下速度 (px/s)。これ未満の軽い着地では演出しない。 */
export const LAND_MIN_FALL_VELOCITY = 260;

// --- カメラ: デッドゾーン / 先読み ---
/** カメラデッドゾーンの幅 (px, ビューポート基準)。 */
export const CAMERA_DEADZONE_W = 220;
/** カメラデッドゾーンの高さ (px, ビューポート基準)。 */
export const CAMERA_DEADZONE_H = 160;
/** 進行方向の先読み量 (px)。プレイヤーの向き先へカメラをずらす最大値。 */
export const CAMERA_LOOKAHEAD_X = 110;
/** 先読みオフセットの補間係数 (0..1)。小さいほど滑らか。 */
export const CAMERA_LOOKAHEAD_LERP = 0.05;

// --- 画面シェイク / ヒットストップ ---
/** 敵踏み時のシェイク継続時間 (ms) と強度 (0..1 相当の割合)。 */
export const SHAKE_STOMP_MS = 90;
export const SHAKE_STOMP_INTENSITY = 0.006;
/** 着地時のシェイク継続時間 (ms) と強度。 */
export const SHAKE_LAND_MS = 55;
export const SHAKE_LAND_INTENSITY = 0.003;
/** ゴール時のシェイク継続時間 (ms) と強度。 */
export const SHAKE_GOAL_MS = 240;
export const SHAKE_GOAL_INTENSITY = 0.008;
/** 敵踏み時のヒットストップ（物理一時停止）時間 (ms)。 */
export const HITSTOP_MS = 70;

// --- タッチ: 仮想ボタン視覚フィードバック ---
/** タッチのスライド判定しきい値の改善値 (px)。P1 で TOUCH_SLIDE_THRESHOLD_PX を置換する。 */
export const TOUCH_SLIDE_THRESHOLD_PX_V2 = 18;
/** 仮想ジャンプボタンの半径 (px)。 */
export const TOUCH_BUTTON_RADIUS = 46;
/** 仮想ジャンプボタンの画面右下からのマージン (px)。 */
export const TOUCH_BUTTON_MARGIN_X = 92;
export const TOUCH_BUTTON_MARGIN_Y = 92;
/** 仮想ボタンの通常時アルファ。 */
export const TOUCH_BUTTON_BASE_ALPHA = 0.18;
/** 仮想ボタンの押下時アルファ。 */
export const TOUCH_BUTTON_FEEDBACK_ALPHA = 0.5;
/** 仮想ボタンの塗り色。 */
export const TOUCH_BUTTON_COLOR = 0xffffff;

// --- パーティクル ---
/** パーティクルテクスチャの 1 辺サイズ (px)。 */
export const PARTICLE_DOT_SIZE = 6;
/** 歯車片取得バースト: 数・寿命(ms)・速度・色。 */
export const PARTICLE_GEAR = { count: 10, lifespanMs: 380, speedMin: 60, speedMax: 160, tint: 0xc9973a, scale: 0.9 } as const;
/** 敵消滅バースト。 */
export const PARTICLE_ENEMY = { count: 12, lifespanMs: 420, speedMin: 80, speedMax: 200, tint: 0x5ecabc, scale: 1.0 } as const;
/** 着地土煙。 */
export const PARTICLE_DUST = { count: 7, lifespanMs: 300, speedMin: 30, speedMax: 90, tint: 0xead9b0, scale: 0.8 } as const;
/** パルス弾衝突バースト。 */
export const PARTICLE_PULSE = { count: 8, lifespanMs: 300, speedMin: 70, speedMax: 170, tint: 0x40dce5, scale: 0.8 } as const;
/** クリア星バースト。 */
export const PARTICLE_CELEBRATE = { count: 24, lifespanMs: 900, speedMin: 120, speedMax: 320, tint: 0xffe066, scale: 1.2 } as const;

// --- UI 集約: フォント・文言・スタイル ---
/** UI 全体の標準フォントファミリ。 */
export const UI_FONT_FAMILY = 'system-ui, sans-serif';
/** 操作説明（通常時）。 */
export const INSTRUCTION_TEXT = 'PC: ←/→ Space/↑ R   スマホ: 左スライドで左右移動 / 右タップでジャンプ';
/** 操作説明のフォントサイズ・色。 */
export const INSTRUCTION_FONT_SIZE = '16px';
export const INSTRUCTION_FONT_COLOR = '#ffffff';
/** 操作説明を表示してからフェードアウト開始までの時間 (ms)。 */
export const INSTRUCTION_HOLD_MS = 4000;
/** 操作説明のフェードアウト時間 (ms)。 */
export const INSTRUCTION_FADE_MS = 600;

/** 中央メッセージ（STAGE CLEAR / ALL CLEAR / GAME OVER）共通スタイル。 */
export const CENTER_MSG_FONT_SIZE = '44px';
export const CENTER_MSG_STROKE_COLOR = '#000000';
export const CENTER_MSG_STROKE_THICKNESS = 6;
export const STAGE_CLEAR_COLOR = '#ffffff';
export const ALL_CLEAR_COLOR = '#ffff00';
export const ALL_CLEAR_SUFFIX = 'タイトルへ戻ります...';
export const GAME_OVER_FONT_SIZE = '64px';
export const GAME_OVER_COLOR = '#ff3030';
export const GAME_OVER_STROKE_THICKNESS = 8;

/** 再開/次へプロンプト文言・スタイル・点滅間隔。 */
export const PROMPT_RESTART_TEXT = 'タップ / キーでもう一度';
export const PROMPT_NEXT_TEXT = 'タップ / キーで次へ';
export const PROMPT_TITLE_TEXT = 'タップ / キーでタイトルへ';
export const PROMPT_FONT_SIZE = '22px';
export const PROMPT_FONT_COLOR = '#ffffff';
export const PROMPT_BLINK_MS = 500;
export const PROMPT_OFFSET_Y = 80;

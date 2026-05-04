import {
  AUDIO_BGM_GAIN,
  AUDIO_MASTER_GAIN,
  BGM_NOTE_ATTACK_SEC,
  BGM_NOTE_DURATION_MS,
  BGM_NOTE_PEAK_GAIN,
  BGM_PATTERN,
  BGM_STEP_MS,
  BGM_WAVEFORM,
  SE_PARAMS,
  type SeDefinition,
  type SeWaveform
} from '../config/gameConfig';

export type SeKey = 'jump' | 'coin' | 'stomp' | 'miss' | 'goal';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmTimer: number | null = null;
  private bgmStopTimer: number | null = null;
  private bgmStep = 0;
  private bgmPending = false;
  private unlocked = false;

  /** 最初のユーザー入力時に 1 回だけ呼ぶ。冪等。失敗してもゲームは続行。 */
  unlock(): void {
    if (this.unlocked) return;
    try {
      const AudioContextClass =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = AUDIO_MASTER_GAIN;
      this.masterGain.connect(this.ctx.destination);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = AUDIO_BGM_GAIN;
      this.bgmGain.connect(this.masterGain);
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      this.unlocked = true;
      if (this.bgmPending) {
        this.bgmPending = false;
        this.startBgm();
      }
    } catch {
      this.unlocked = false;
    }
  }

  /** SE を再生。unlock 前は no-op。 */
  playSe(key: SeKey): void {
    if (!this.ctx || !this.masterGain) return;
    this.playDefinition(SE_PARAMS[key], this.masterGain);
  }

  /** BGM ループ開始。unlock 前は pending フラグを立て、unlock 時に開始。 */
  startBgm(): void {
    if (!this.ctx) {
      this.bgmPending = true;
      return;
    }
    if (this.bgmTimer !== null) return;
    this.bgmStep = 0;
    this.bgmTimer = window.setInterval(() => { this.tickBgm(); }, BGM_STEP_MS);
  }

  /** BGM 停止。fadeMs=0 で即停止、>0 で線形フェードアウト後停止。 */
  stopBgm(fadeMs = 0): void {
    if (this.bgmTimer === null) return;
    if (this.bgmStopTimer !== null) {
      window.clearTimeout(this.bgmStopTimer);
      this.bgmStopTimer = null;
    }
    if (fadeMs > 0 && this.ctx && this.bgmGain) {
      const now = this.ctx.currentTime;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
      this.bgmGain.gain.linearRampToValueAtTime(0.0001, now + fadeMs / 1000);
      this.bgmStopTimer = window.setTimeout(() => { this.haltBgmTimer(); }, fadeMs);
    } else {
      this.haltBgmTimer();
    }
  }

  /** GameScene のシャットダウン時に呼ぶ。全タイマー・グラフを停止。 */
  destroy(): void {
    this.haltBgmTimer();
    if (this.bgmStopTimer !== null) {
      window.clearTimeout(this.bgmStopTimer);
      this.bgmStopTimer = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.masterGain = null;
    this.bgmGain = null;
  }

  private haltBgmTimer(): void {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private tickBgm(): void {
    if (!this.ctx || !this.bgmGain) return;
    const freq = BGM_PATTERN[this.bgmStep % BGM_PATTERN.length];
    if (freq !== undefined) {
      this.scheduleNote(freq, BGM_NOTE_DURATION_MS / 1000, BGM_NOTE_PEAK_GAIN, BGM_WAVEFORM, this.bgmGain);
    }
    this.bgmStep++;
  }

  private scheduleNote(
    freq: number,
    durationSec: number,
    peakGain: number,
    waveform: SeWaveform,
    destination: AudioNode
  ): void {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = waveform;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + BGM_NOTE_ATTACK_SEC);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(now);
      osc.stop(now + durationSec + 0.02);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch {
      // 音が鳴らなくてもゲームプレイには支障なし
    }
  }

  private playDefinition(def: SeDefinition, destination: AudioNode): void {
    if (!this.ctx) return;
    let baseTime = this.ctx.currentTime;
    for (const step of def.steps) {
      const startTime = baseTime + step.offsetSec;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = step.waveform;
        osc.frequency.setValueAtTime(step.freqStart, startTime);
        if (step.freqEnd !== step.freqStart) {
          osc.frequency.linearRampToValueAtTime(step.freqEnd, startTime + step.durationSec);
        }
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(step.peakGain, startTime + step.attackSec);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + step.durationSec);
        osc.connect(gain);
        gain.connect(destination);
        osc.start(startTime);
        osc.stop(startTime + step.durationSec + 0.02);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      } catch {
        // 音が鳴らなくてもゲームプレイには支障なし
      }
    }
  }
}

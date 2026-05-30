import Phaser from 'phaser';
import {
  TEX_KEY,
  PARTICLE_GEAR,
  PARTICLE_ENEMY,
  PARTICLE_DUST,
  PARTICLE_PULSE,
  PARTICLE_CELEBRATE
} from '../config/gameConfig';

interface BurstConfig {
  readonly count: number;
  readonly lifespanMs: number;
  readonly speedMin: number;
  readonly speedMax: number;
  readonly tint: number;
  readonly scale: number;
}

/**
 * 単発バーストのパーティクル演出を担当（design §3.8）。
 * 各演出は short-lived emitter を生成し、explode 後に自動破棄する。
 * 常時稼働の emitter を持たないことで 60fps を維持する（design §11）。
 */
export class ParticleManager {
  constructor(private readonly scene: Phaser.Scene) {}

  /** 歯車片取得バースト。 */
  burstGear(x: number, y: number): void {
    this.burst(x, y, PARTICLE_GEAR);
  }

  /** 敵消滅バースト。 */
  burstEnemy(x: number, y: number): void {
    this.burst(x, y, PARTICLE_ENEMY);
  }

  /** 着地土煙。地面に沿って横へ広がるよう重力を弱める。 */
  dust(x: number, y: number): void {
    this.burst(x, y, PARTICLE_DUST, { gravityY: 120, angleMin: 200, angleMax: 340 });
  }

  /** パルス弾衝突バースト。 */
  burstPulse(x: number, y: number): void {
    this.burst(x, y, PARTICLE_PULSE);
  }

  /** クリア星バースト（上方向に華やかに散る）。 */
  celebrate(x: number, y: number): void {
    this.burst(x, y, PARTICLE_CELEBRATE, { gravityY: 260 });
  }

  private burst(
    x: number,
    y: number,
    cfg: BurstConfig,
    extra?: { gravityY?: number; angleMin?: number; angleMax?: number }
  ): void {
    if (!this.scene.textures.exists(TEX_KEY.particle)) return;
    const emitter = this.scene.add.particles(x, y, TEX_KEY.particle, {
      lifespan: cfg.lifespanMs,
      speed: { min: cfg.speedMin, max: cfg.speedMax },
      scale: { start: cfg.scale, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: cfg.tint,
      gravityY: extra?.gravityY ?? 0,
      angle: extra?.angleMin !== undefined && extra?.angleMax !== undefined
        ? { min: extra.angleMin, max: extra.angleMax }
        : undefined,
      emitting: false
    });
    emitter.setDepth(50);
    emitter.explode(cfg.count, x, y);
    // emitter は寿命経過後に破棄してリークを防ぐ。
    this.scene.time.delayedCall(cfg.lifespanMs + 120, () => emitter.destroy());
  }
}

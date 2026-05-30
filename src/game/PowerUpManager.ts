import Phaser from 'phaser';
import {
  TILE_SIZE,
  INVINCIBLE_MS,
  INVINCIBLE_BLINK_MS,
  CHRONO_BLINK_MS,
  CHRONO_END_WARNING_MS,
  CHRONO_INVINCIBLE_MS
} from '../config/gameConfig';

/**
 * パワーアップ系の状態機械を担当（design §3.5）。
 * - 無敵（ダメージ後の点滅・無敵時間）
 * - クロノシールド（一定時間無敵 + 接触で敵を倒す）
 * - 被弾時の地面スナップ
 * playerState 本体と applyPlayerState の表示更新は GameScene 側ファサードに残す（D-004）。
 */
export class PowerUpManager {
  private invincibleState = false;
  private chronoShieldState = false;
  private invincibleTimer: Phaser.Time.TimerEvent | null = null;
  private blinkTween: Phaser.Tweens.Tween | null = null;
  private chronoTimer: Phaser.Time.TimerEvent | null = null;
  private chronoWarningTimer: Phaser.Time.TimerEvent | null = null;
  private chronoBlinkTween: Phaser.Tweens.Tween | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly groundMask: ReadonlyArray<ReadonlyArray<boolean>>,
    /** クロノシールド終了時に呼ぶ。GameScene が tint を現状態へ復帰させる。 */
    private readonly onChronoEnd: () => void
  ) {}

  get isInvincible(): boolean {
    return this.invincibleState;
  }

  get isChronoShielded(): boolean {
    return this.chronoShieldState;
  }

  startInvincible(): void {
    this.invincibleTimer?.remove(false);
    this.blinkTween?.stop();
    this.player.setAlpha(1);
    this.invincibleState = true;

    this.blinkTween = this.scene.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: INVINCIBLE_BLINK_MS,
      yoyo: true,
      repeat: -1
    });

    this.invincibleTimer = this.scene.time.delayedCall(INVINCIBLE_MS, () => {
      this.blinkTween?.stop();
      this.blinkTween = null;
      this.player.setAlpha(1);
      this.invincibleState = false;
      this.invincibleTimer = null;
    });
  }

  startChronoShield(): void {
    this.chronoTimer?.remove(false);
    this.chronoWarningTimer?.remove(false);
    this.chronoBlinkTween?.stop();
    this.chronoShieldState = true;
    this.chronoBlinkTween = this.scene.tweens.add({
      targets: this.player,
      alpha: 0.6,
      duration: CHRONO_BLINK_MS,
      yoyo: true,
      repeat: -1
    });
    this.chronoWarningTimer = this.scene.time.delayedCall(
      CHRONO_INVINCIBLE_MS - CHRONO_END_WARNING_MS,
      () => {
        this.chronoBlinkTween?.stop();
        this.chronoBlinkTween = this.scene.tweens.add({
          targets: this.player,
          alpha: 0.4,
          duration: CHRONO_BLINK_MS / 2,
          yoyo: true,
          repeat: -1
        });
      }
    );
    this.chronoTimer = this.scene.time.delayedCall(CHRONO_INVINCIBLE_MS, () => this.endChronoShield());
  }

  endChronoShield(): void {
    this.chronoShieldState = false;
    this.chronoBlinkTween?.stop();
    this.chronoBlinkTween = null;
    this.chronoWarningTimer = null;
    this.chronoTimer = null;
    this.player.setAlpha(1);
    this.onChronoEnd();
  }

  /** 被弾でサイズが縮んだ際、近傍の地面に足元をスナップさせる。 */
  snapToNearbyGround(): void {
    const groundTop = this.findNearbyGroundTopUnderPlayer();
    if (groundTop === null) return;
    this.setPlayerBodyBottom(groundTop);
    this.player.setVelocityY(0);
  }

  private setPlayerBodyBottom(bottom: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      this.player.setY(this.player.y + bottom - body.bottom);
      body.updateFromGameObject();
      return;
    }
    this.player.setY(bottom - this.player.displayHeight * (1 - this.player.originY));
  }

  private findNearbyGroundTopUnderPlayer(): number | null {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return null;

    const probeXs = [body.left + 1, body.center.x, body.right - 1];
    let nearest: { top: number; distance: number } | null = null;

    for (const x of probeXs) {
      const col = Math.floor(x / TILE_SIZE);
      if (col < 0) continue;
      for (let row = 0; row < this.groundMask.length; row++) {
        if (!this.groundMask[row]?.[col]) continue;
        const top = row * TILE_SIZE;
        const distance = body.bottom - top;
        if (distance < -2 || distance > TILE_SIZE + 4) continue;
        if (!nearest || distance < nearest.distance) {
          nearest = { top, distance };
        }
      }
    }

    return nearest?.top ?? null;
  }

  /** タイマー・tween を破棄（shutdown 時）。 */
  destroy(): void {
    this.invincibleTimer?.remove(false);
    this.invincibleTimer = null;
    this.blinkTween?.stop();
    this.blinkTween = null;
    this.chronoTimer?.remove(false);
    this.chronoTimer = null;
    this.chronoWarningTimer?.remove(false);
    this.chronoWarningTimer = null;
    this.chronoBlinkTween?.stop();
    this.chronoBlinkTween = null;
  }
}

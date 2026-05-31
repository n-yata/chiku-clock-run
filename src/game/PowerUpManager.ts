import Phaser from 'phaser';
import { INVINCIBLE_MS, INVINCIBLE_BLINK_MS } from '../config/gameConfig';

/**
 * 被弾後の無敵（i-frame）を担当する。
 * 強化アイテム（big / fire / クロノシールド）は廃止済みのため、
 * 残るパワーアップ的挙動は「被弾直後の一定時間の点滅＋無敵」のみ。
 */
export class PowerUpManager {
  private invincibleState = false;
  private invincibleTimer: Phaser.Time.TimerEvent | null = null;
  private blinkTween: Phaser.Tweens.Tween | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite
  ) {}

  get isInvincible(): boolean {
    return this.invincibleState;
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

  /** タイマー・tween を破棄（shutdown 時）。 */
  destroy(): void {
    this.invincibleTimer?.remove(false);
    this.invincibleTimer = null;
    this.blinkTween?.stop();
    this.blinkTween = null;
  }
}

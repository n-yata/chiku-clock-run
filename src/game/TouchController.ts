import Phaser from 'phaser';
import {
  DOUBLE_TAP_MS,
  TOUCH_ZONE_SPLIT_RATIO,
  TOUCH_SLIDE_THRESHOLD_PX_V2,
  type PlayerState
} from '../config/gameConfig';

/**
 * TouchController が参照するゲーム状態とアクション（design §3.3）。
 * GameScene 側のフラグ/メソッドへ疎結合にアクセスするためのホスト契約。
 */
export interface TouchHost {
  readonly isMissed: boolean;
  readonly isCleared: boolean;
  readonly playerState: PlayerState;
  unlockAudio(): void;
  shootPulseBolt(): void;
}

/**
 * タッチ操作（左ゾーン=スライド移動 / 右ゾーン=ジャンプ・ダブルタップ発射）を担当。
 * 既存 setupTouchControls / handlePointer* を移管し、仮想ボタンの視覚 FB を追加。
 */
export class TouchController {
  private left = false;
  private right = false;
  private jumpRequested = false;

  private jumpPointerId: number | null = null;
  private movePointerId: number | null = null;
  private touchMoveBaseX: number | null = null;
  private lastTapRightAt = 0;
  private advanceTapRequested = false;

  constructor(private readonly scene: Phaser.Scene, private readonly host: TouchHost) {}

  /** ポインタ購読を開始する。 */
  start(): void {
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
    this.scene.input.on('pointerupoutside', this.handlePointerUp, this);
  }

  /** 左移動入力。 */
  get isLeft(): boolean {
    return this.left;
  }

  /** 右移動入力。 */
  get isRight(): boolean {
    return this.right;
  }

  /** ジャンプ入力を 1 回だけ取り出す（取得でリセット）。 */
  consumeJump(): boolean {
    if (!this.jumpRequested) return false;
    this.jumpRequested = false;
    return true;
  }

  /** 仮想ジャンプボタンを押し続けているか（可変ジャンプ用）。 */
  get isJumpHeld(): boolean {
    return this.jumpPointerId !== null;
  }

  /** クリア / ゲームオーバー待ち中の前倒しタップを 1 回だけ取り出す。 */
  consumeAdvanceTap(): boolean {
    if (!this.advanceTapRequested) return false;
    this.advanceTapRequested = false;
    return true;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.scene.input.off('pointerupoutside', this.handlePointerUp, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.host.unlockAudio();
    if (this.host.isMissed || this.host.isCleared) {
      // クリア / ゲームオーバー待ち中はタップで遷移を前倒しできるよう要求を立てる。
      this.advanceTapRequested = true;
      return;
    }

    const splitX = this.scene.scale.width * TOUCH_ZONE_SPLIT_RATIO;
    if (pointer.x < splitX) {
      // 左ゾーン: スライド移動
      if (this.movePointerId === null) {
        this.movePointerId = pointer.id;
        this.touchMoveBaseX = pointer.x;
        this.left = false;
        this.right = false;
      }
    } else {
      // 右ゾーン
      const now = this.scene.time.now;
      const isDoubleTap = (now - this.lastTapRightAt) <= DOUBLE_TAP_MS;
      this.lastTapRightAt = now;

      if (isDoubleTap && this.host.playerState === 'fire') {
        this.host.shootPulseBolt();
        return;
      }

      if (this.jumpPointerId === null) {
        this.jumpPointerId = pointer.id;
        this.jumpRequested = true;
      }
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.host.isMissed || this.host.isCleared) return;
    if (pointer.id !== this.movePointerId) return;
    if (this.touchMoveBaseX === null) return;

    const dx = pointer.x - this.touchMoveBaseX;
    if (dx > TOUCH_SLIDE_THRESHOLD_PX_V2) {
      this.left = false;
      this.right = true;
    } else if (dx < -TOUCH_SLIDE_THRESHOLD_PX_V2) {
      this.left = true;
      this.right = false;
    } else {
      this.left = false;
      this.right = false;
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.jumpPointerId) {
      this.jumpPointerId = null;
    }
    if (pointer.id === this.movePointerId) {
      this.movePointerId = null;
      this.touchMoveBaseX = null;
      this.left = false;
      this.right = false;
    }
  }
}

import Phaser from 'phaser';
import {
  ANIM_KEY,
  PLAYER_SPEED,
  JUMP_VELOCITY,
  COYOTE_TIME_MS,
  JUMP_BUFFER_MS,
  JUMP_CUT_MULTIPLIER,
  MIN_JUMP_VELOCITY,
  LAND_MIN_FALL_VELOCITY
} from '../config/gameConfig';

/** 1 フレーム分の入力状態。 */
export interface InputState {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpJustPressed: boolean;
}

/** PlayerController から外部へ通知するコールバック（SE・演出の発火点）。 */
export interface PlayerCallbacks {
  /** ジャンプ踏み切り時。 */
  onJump(): void;
  /** 着地時。fallVelocity は着地直前の落下速度 (px/s)。 */
  onLand(fallVelocity: number, x: number, y: number): void;
}

/**
 * プレイヤーの移動・ジャンプ・アニメ・向きと、ゲームフィール改善
 * （コヨーテタイム / 入力バッファ / 可変ジャンプ / 着地検出）を担当（design §3.2）。
 */
export class PlayerController {
  private lastOnGroundAt = Number.NEGATIVE_INFINITY;
  private jumpRequestedAt = Number.NEGATIVE_INFINITY;
  private jumpConsumed = false;
  private jumpCut = false;
  private prevVelocityY = 0;
  private wasOnGround = true;
  private controlEnabled = true;

  constructor(
    private readonly sprite: Phaser.Physics.Arcade.Sprite,
    private readonly callbacks: PlayerCallbacks
  ) {}

  get onGround(): boolean {
    return this.sprite.body?.blocked.down ?? false;
  }

  /** クリア/ミス時に入力を殺す。 */
  setControlEnabled(enabled: boolean): void {
    this.controlEnabled = enabled;
  }

  update(time: number, input: InputState): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    const onGround = body.blocked.down;

    if (!this.controlEnabled) {
      this.sprite.setVelocityX(0);
      this.prevVelocityY = body.velocity.y;
      this.wasOnGround = onGround;
      return;
    }

    // --- 着地検出（速度がゼロ化される前のフレームをまたいで判定）---
    if (!this.wasOnGround && onGround) {
      const fallVelocity = this.prevVelocityY;
      if (fallVelocity >= LAND_MIN_FALL_VELOCITY) {
        this.callbacks.onLand(fallVelocity, this.sprite.x, body.bottom);
      }
    }

    // --- 接地状態の追跡（コヨーテ用）---
    if (onGround) {
      this.lastOnGroundAt = time;
      this.jumpConsumed = false;
      this.jumpCut = false;
    }

    // --- 水平移動 ---
    if (input.left) {
      this.sprite.setVelocityX(-PLAYER_SPEED);
    } else if (input.right) {
      this.sprite.setVelocityX(PLAYER_SPEED);
    } else {
      this.sprite.setVelocityX(0);
    }

    // --- ジャンプ入力バッファ ---
    if (input.jumpJustPressed) {
      this.jumpRequestedAt = time;
    }

    // --- ジャンプ発火（バッファ内 + コヨーテ内 + 未消費）---
    const bufferedJump = time - this.jumpRequestedAt <= JUMP_BUFFER_MS;
    const canCoyote = time - this.lastOnGroundAt <= COYOTE_TIME_MS;
    if (bufferedJump && canCoyote && !this.jumpConsumed) {
      this.sprite.setVelocityY(JUMP_VELOCITY);
      this.jumpConsumed = true;
      this.jumpCut = false;
      this.jumpRequestedAt = Number.NEGATIVE_INFINITY;
      this.lastOnGroundAt = Number.NEGATIVE_INFINITY;
      this.callbacks.onJump();
    }

    // --- 可変ジャンプ高さ（上昇中にボタンを離したら上昇を切り詰める）---
    if (!input.jumpHeld && !this.jumpCut && body.velocity.y < 0) {
      this.jumpCut = true;
      if (body.velocity.y < MIN_JUMP_VELOCITY) {
        this.sprite.setVelocityY(Math.max(body.velocity.y * JUMP_CUT_MULTIPLIER, MIN_JUMP_VELOCITY));
      }
    }

    this.updateAnimation(onGround, body.velocity.x);

    this.prevVelocityY = body.velocity.y;
    this.wasOnGround = onGround;
  }

  private updateAnimation(onGround: boolean, vx: number): void {
    if (!onGround) {
      this.sprite.anims.play(ANIM_KEY.playerJump, true);
    } else if (Math.abs(vx) > 0.1) {
      this.sprite.anims.play(ANIM_KEY.playerWalk, true);
    } else {
      this.sprite.anims.play(ANIM_KEY.playerIdle, true);
    }

    if (vx < -0.1) this.sprite.setFlipX(true);
    else if (vx > 0.1) this.sprite.setFlipX(false);
  }
}

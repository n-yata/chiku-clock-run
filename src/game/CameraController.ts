import Phaser from 'phaser';
import {
  CAMERA_LERP_X,
  CAMERA_LERP_Y,
  CAMERA_DEADZONE_W,
  CAMERA_DEADZONE_H,
  CAMERA_LOOKAHEAD_X,
  CAMERA_LOOKAHEAD_LERP,
  VIEWPORT_WIDTH,
  VIEWPORT_HEIGHT
} from '../config/gameConfig';

/**
 * メインカメラの追従・ズーム・先読み・シェイクを担当（design §3.9）。
 * ズーム計算と HUD レイアウトは分離（HUD は HudManager）。
 */
export class CameraController {
  private lookaheadOffset = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Phaser.Physics.Arcade.Sprite,
    private readonly world: { readonly w: number; readonly h: number }
  ) {}

  /** 追従開始。setBounds + startFollow + setDeadzone。 */
  start(): void {
    const cam = this.scene.cameras.main;
    cam.setBounds(0, 0, this.world.w, this.world.h);
    cam.startFollow(this.player, true, CAMERA_LERP_X, CAMERA_LERP_Y);
    cam.setDeadzone(CAMERA_DEADZONE_W, CAMERA_DEADZONE_H);
  }

  /** ビューポート比からズーム倍率を算出して適用する（既存 updateAll のズーム計算）。 */
  applyZoom(): void {
    const zoom = Math.min(
      this.scene.scale.width / VIEWPORT_WIDTH,
      this.scene.scale.height / VIEWPORT_HEIGHT
    );
    this.scene.cameras.main.setZoom(zoom);
  }

  /** 進行方向に応じてカメラ先読みオフセットを補間する。静止時は 0 に戻る。 */
  update(): void {
    const vx = this.player.body?.velocity.x ?? 0;
    const target = vx > 1 ? CAMERA_LOOKAHEAD_X : vx < -1 ? -CAMERA_LOOKAHEAD_X : 0;
    this.lookaheadOffset += (target - this.lookaheadOffset) * CAMERA_LOOKAHEAD_LERP;
    this.scene.cameras.main.setFollowOffset(-this.lookaheadOffset, 0);
  }

  /** 画面シェイク。intensity は Phaser の 0..1 相当の割合。 */
  shake(durationMs: number, intensity: number): void {
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  /** フェードイン。 */
  fadeIn(durationMs: number): void {
    this.scene.cameras.main.fadeIn(durationMs);
  }
}

import Phaser from 'phaser';
import {
  ENEMY_SPEED,
  ENEMY_SPRITE_W,
  ENEMY_SPRITE_H,
  TILE_SIZE,
  ENEMY_DEATH_FALL_DISTANCE,
  ENEMY_DEATH_FALL_MS
} from '../config/gameConfig';
import { GameEvents } from './events';

type EnemyDir = -1 | 1;

/**
 * 敵の AI（段差端反転・壁反転）と撃破アニメーションを担当（design §3.4）。
 * 撃破時に scene.events で EnemyKilled を発火し、演出側へ通知する。
 */
export class EnemyManager {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly group: Phaser.Physics.Arcade.Group,
    private readonly groundMask: ReadonlyArray<ReadonlyArray<boolean>>
  ) {}

  /** 毎フレームの敵 AI 更新（既存 updateEnemyAi）。 */
  update(): void {
    this.group.children.iterate((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return true;
      const body = enemy.body as Phaser.Physics.Arcade.Body | null;
      if (!body) return true;

      let dir = (enemy.getData('dir') as EnemyDir | undefined) ?? -1;

      if (dir < 0 && body.blocked.left) dir = 1;
      else if (dir > 0 && body.blocked.right) dir = -1;

      // 段差端で反転: 進行方向の足元タイル (前方ピクセル + 1) が地面でなければ反転。
      // 着地中のみ判定する (空中で前方タイルが空でも落下中は反転しない)。
      if (body.blocked.down) {
        const probeX = enemy.x + dir * (ENEMY_SPRITE_W / 2 + 1);
        const probeY = enemy.y + ENEMY_SPRITE_H / 2 + 1;
        const probeCol = Math.floor(probeX / TILE_SIZE);
        const probeRow = Math.floor(probeY / TILE_SIZE);
        const inBounds =
          probeRow >= 0 &&
          probeRow < this.groundMask.length &&
          probeCol >= 0 &&
          probeCol < (this.groundMask[probeRow]?.length ?? 0);
        if (inBounds && !this.groundMask[probeRow][probeCol]) {
          dir = (dir === 1 ? -1 : 1) as EnemyDir;
        }
      }

      enemy.setData('dir', dir);
      // 速度を毎フレーム強制し、衝突後の速度ゼロ化事故を防ぐ
      enemy.setVelocityX(dir * ENEMY_SPEED);
      enemy.setFlipX(dir > 0);
      return true;
    });
  }

  /** 敵を撃破してやられアニメーションを再生し、EnemyKilled を発火する。 */
  kill(enemy: Phaser.Physics.Arcade.Sprite): void {
    const x = enemy.x;
    const y = enemy.y;
    enemy.disableBody(true, false);
    enemy.setFlipY(true);
    this.scene.tweens.add({
      targets: enemy,
      y: enemy.y + ENEMY_DEATH_FALL_DISTANCE,
      alpha: 0,
      duration: ENEMY_DEATH_FALL_MS,
      ease: 'Quad.easeIn',
      onComplete: () => { enemy.destroy(); }
    });
    this.scene.events.emit(GameEvents.EnemyKilled, { x, y });
  }
}

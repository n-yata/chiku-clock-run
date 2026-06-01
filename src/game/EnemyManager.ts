import Phaser from 'phaser';
import {
  ANIM_KEY,
  ENEMY_SPEED,
  ENEMY_SPRITE_W,
  ENEMY_SPRITE_H,
  BOMB_SPRITE_W,
  TILE_SIZE,
  ENEMY_DEATH_FALL_DISTANCE,
  ENEMY_DEATH_FALL_MS,
  FLYER_SPEED,
  FLYER_BOB_AMP_PX,
  FLYER_BOB_OMEGA,
  FLYER_BOB_K,
  FLYER_PATROL_HALF_PX,
  BOMB_SPEED,
  BOMB_DETECT_PX,
  BOMB_DETECT_Y_PX,
  BOMB_FUSE_TRIGGER_PX,
  BOMB_FUSE_MS
} from '../config/gameConfig';
import type { EnemyType, EnemyDir } from '../stages/stage01';
import { GameEvents } from './events';

type BombState = 'idle' | 'chase' | 'fuse';

/**
 * 敵 AI と撃破/自爆演出を担当（design §3.4, 20260601-enemy-types §4）。
 * 単一グループに winder / flyer / bomb が混在し、スプライト data の `type` で挙動を分岐する。
 * 撃破時に EnemyKilled、自爆時に EnemyExploded を scene.events で発火し、演出/ダメージ側へ通知する。
 */
export class EnemyManager {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly group: Phaser.Physics.Arcade.Group,
    private readonly groundMask: ReadonlyArray<ReadonlyArray<boolean>>,
    private readonly player: Phaser.Physics.Arcade.Sprite
  ) {}

  /** 毎フレームの敵 AI 更新。type 別に分岐する。 */
  update(): void {
    const now = this.scene.time.now;
    this.group.children.iterate((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return true;
      const body = enemy.body as Phaser.Physics.Arcade.Body | null;
      if (!body) return true;

      const type = (enemy.getData('type') as EnemyType | undefined) ?? 'winder';
      switch (type) {
        case 'flyer':
          this.updateFlyer(enemy, body, now);
          break;
        case 'bomb':
          this.updateBomb(enemy, body, now);
          break;
        default:
          this.updateWinder(enemy, body);
      }
      return true;
    });
  }

  /** 巻きネジ機: 段差端反転・壁反転で水平歩行（既存挙動）。 */
  private updateWinder(enemy: Phaser.Physics.Arcade.Sprite, body: Phaser.Physics.Arcade.Body): void {
    let dir = (enemy.getData('dir') as EnemyDir | undefined) ?? -1;

    if (dir < 0 && body.blocked.left) dir = 1;
    else if (dir > 0 && body.blocked.right) dir = -1;

    // 段差端で反転: 進行方向の足元タイルが地面でなければ反転（着地中のみ判定）。
    if (body.blocked.down && !this.groundAhead(enemy, dir)) {
      dir = (dir === 1 ? -1 : 1) as EnemyDir;
    }

    enemy.setData('dir', dir);
    enemy.setVelocityX(dir * ENEMY_SPEED);
    enemy.setFlipX(dir > 0);
  }

  /** 時計トンボ: 重力無効・水平巡回（範囲端/壁で反転）＋上下サイン揺れ（P 制御）。 */
  private updateFlyer(enemy: Phaser.Physics.Arcade.Sprite, body: Phaser.Physics.Arcade.Body, now: number): void {
    let dir = (enemy.getData('dir') as EnemyDir | undefined) ?? -1;
    const originX = (enemy.getData('originX') as number | undefined) ?? enemy.x;
    const originY = (enemy.getData('originY') as number | undefined) ?? enemy.y;
    const phase = (enemy.getData('phase') as number | undefined) ?? 0;

    // 反転条件: 壁ブロック（現配置は open air のため通常は発火しない。壁に囲んだ配置時の保険）
    // または巡回範囲端（原点 ± FLYER_PATROL_HALF_PX）。
    if (dir < 0 && (body.blocked.left || enemy.x <= originX - FLYER_PATROL_HALF_PX)) dir = 1;
    else if (dir > 0 && (body.blocked.right || enemy.x >= originX + FLYER_PATROL_HALF_PX)) dir = -1;

    enemy.setData('dir', dir);
    enemy.setVelocityX(dir * FLYER_SPEED);
    enemy.setFlipX(dir > 0);

    // 上下: 目標 Y へ P 制御で追従（ドリフト自己補正で床へ沈まない）。
    const targetY = originY + FLYER_BOB_AMP_PX * Math.sin(FLYER_BOB_OMEGA * now + phase);
    enemy.setVelocityY((targetY - enemy.y) * FLYER_BOB_K);
  }

  /** チクタク爆弾: idle → chase（追尾・崖際停止）→ fuse（導火）→ explode（自爆）。 */
  private updateBomb(enemy: Phaser.Physics.Arcade.Sprite, body: Phaser.Physics.Arcade.Body, now: number): void {
    let state = (enemy.getData('state') as BombState | undefined) ?? 'idle';
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;

    if (state === 'fuse') {
      enemy.setVelocityX(0);
      const fuseStart = (enemy.getData('fuseStart') as number | undefined) ?? now;
      if (now - fuseStart >= BOMB_FUSE_MS) {
        this.explode(enemy);
      }
      return;
    }

    // idle/chase 共通の検知
    const inRange = Math.abs(dx) < BOMB_DETECT_PX && Math.abs(dy) < BOMB_DETECT_Y_PX;
    if (state === 'idle') {
      enemy.setVelocityX(0);
      if (inRange) state = 'chase';
    }

    if (state === 'chase') {
      // 至近 + 接地で導火開始
      if (Math.abs(dx) < BOMB_FUSE_TRIGGER_PX && body.blocked.down) {
        enemy.setData('state', 'fuse');
        enemy.setData('fuseStart', now);
        enemy.setVelocityX(0);
        enemy.anims.play(ANIM_KEY.bombTick, true);
        return;
      }
      const dir: EnemyDir = dx < 0 ? -1 : 1;
      // 崖際/壁では落下・めり込みを避けて停止（追尾は中断）。
      const blockedAhead = (dir < 0 && body.blocked.left) || (dir > 0 && body.blocked.right);
      if (body.blocked.down && (!this.groundAhead(enemy, dir, BOMB_SPRITE_W / 2) || blockedAhead)) {
        enemy.setVelocityX(0);
      } else {
        enemy.setVelocityX(dir * BOMB_SPEED);
      }
      enemy.setFlipX(dir > 0);
    }

    enemy.setData('state', state);
  }

  /**
   * 進行方向 dir の足元前方タイルが地面か。着地中の段差端判定に使う。
   * halfW はスプライト半幅（前方プローブ距離の基準）。種別ごとに実寸を渡す。
   */
  private groundAhead(enemy: Phaser.Physics.Arcade.Sprite, dir: EnemyDir, halfW = ENEMY_SPRITE_W / 2): boolean {
    const probeX = enemy.x + dir * (halfW + 1);
    const probeY = enemy.y + ENEMY_SPRITE_H / 2 + 1;
    const probeCol = Math.floor(probeX / TILE_SIZE);
    const probeRow = Math.floor(probeY / TILE_SIZE);
    const inBounds =
      probeRow >= 0 &&
      probeRow < this.groundMask.length &&
      probeCol >= 0 &&
      probeCol < (this.groundMask[probeRow]?.length ?? 0);
    return inBounds ? this.groundMask[probeRow][probeCol] : false;
  }

  /** 敵を撃破してやられアニメーションを再生し、EnemyKilled を発火する（踏みつけ共通）。 */
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

  /** チクタク爆弾を自爆させ、EnemyExploded を発火して即時破棄する。範囲ダメージ判定は GameScene 側。 */
  explode(enemy: Phaser.Physics.Arcade.Sprite): void {
    if (!enemy.active) return;
    const x = enemy.x;
    const y = enemy.y;
    enemy.disableBody(true, false);
    this.scene.events.emit(GameEvents.EnemyExploded, { x, y });
    enemy.destroy();
  }
}

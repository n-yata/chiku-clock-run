import Phaser from 'phaser';

/** 衝突判定に使うゲームオブジェクト群。 */
export interface CollisionTargets {
  player: Phaser.Physics.Arcade.Sprite;
  ground: Phaser.Physics.Arcade.StaticGroup;
  goal: Phaser.Physics.Arcade.Sprite;
  enemies: Phaser.Physics.Arcade.Group;
  gearBits: Phaser.Physics.Arcade.StaticGroup;
}

/** overlap/collider のコールバック群（本体は GameScene 側ファサードに残す, D-004）。 */
export interface CollisionHandlers {
  onGoalHit: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback;
  onEnemyOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback;
  onGearBitOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback;
}

/**
 * physics.add.overlap / collider の登録を一元化する（design §3.6, 既存 create L223-235）。
 * ゴールを先に登録し、onEnemyOverlap 冒頭の isCleared ガードと併用する二重保証を維持する。
 * context は呼び出し元（GameScene）を渡し、既存のアロー関数バインドと整合させる（D-005）。
 */
export class CollisionHandler {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly context: object
  ) {}

  /**
   * 衝突を登録する。プレイヤー死亡演出で破棄するため player↔ground の collider を返す。
   */
  register(t: CollisionTargets, h: CollisionHandlers): Phaser.Physics.Arcade.Collider {
    const physics = this.scene.physics;
    const playerGroundCollider = physics.add.collider(t.player, t.ground);
    physics.add.collider(t.enemies, t.ground);

    // overlap 登録順は二重保証 (design.md §3.4.3 Q5):
    // ゴールを先に登録し、onEnemyOverlap 冒頭の isCleared ガードと併用する。
    physics.add.overlap(t.player, t.goal, h.onGoalHit, undefined, this.context);
    physics.add.overlap(t.player, t.enemies, h.onEnemyOverlap, undefined, this.context);
    physics.add.overlap(t.player, t.gearBits, h.onGearBitOverlap, undefined, this.context);

    return playerGroundCollider;
  }
}

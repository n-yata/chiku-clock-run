// GameScene と各マネージャ間の疎結合連携に使うイベント名定義。
// 発火側（CollisionHandler / PlayerController 等）と購読側（ParticleManager /
// CameraController / HudManager）を文字列契約で分離する（design D-003）。
// scene.events（Phaser.Events.EventEmitter）経由で emit / on する。

export const GameEvents = {
  /** プレイヤー着地。payload: fallVelocity (px/s) と着地座標 {x,y}。 */
  PlayerLand: 'player:land',
  /** 敵撃破。payload: 撃破座標 {x,y}。 */
  EnemyKilled: 'enemy:killed',
  /** チクタク爆弾の自爆。payload: 爆発座標 {x,y}。範囲ダメージ判定は購読側（GameScene）。 */
  EnemyExploded: 'enemy:exploded',
  /** 歯車片取得。payload: 取得座標 {x,y}。 */
  GearCollected: 'gear:collected',
  /** ゴール到達。payload: ゴール座標 {x,y}。 */
  Goal: 'goal'
} as const;

export type GameEvent = typeof GameEvents[keyof typeof GameEvents];

/** イベント payload の共通形（座標つき演出イベント）。 */
export interface PointPayload {
  x: number;
  y: number;
}

/** PlayerLand の payload。 */
export interface LandPayload extends PointPayload {
  fallVelocity: number;
}

# design.md — アニメーション追加

## 設計方針

新規アセット・スプライトシート変更なし。Phaser の Tween / Physics をそのまま活用する。

---

## 敵のやられアニメーション

### トリガー箇所

| 場所 | 現行コード |
|------|-----------|
| `onEnemyOverlap` 踏み判定 | `eSprite.disableBody(true, true)` |
| `onEnemyOverlap` クロノシールド | `eSprite.disableBody(true, true)` |
| `onPulseBoltEnemyOverlap` | `eSprite.disableBody(true, true)` |

### 実装（`killEnemyWithAnimation(enemy)`）

1. `enemy.disableBody(true, false)` — 物理ボディ無効化・active=false・sprite は visible のまま
2. `enemy.setFlipY(true)` — ひっくり返りを表現
3. Tween: `y += ENEMY_DEATH_FALL_DISTANCE`, `alpha → 0`, `duration = ENEMY_DEATH_FALL_MS`, `ease: 'Quad.easeIn'`
4. Tween 完了後: `enemy.destroy()`

### 定数

```ts
ENEMY_DEATH_FALL_DISTANCE = 200  // 落下距離 (px)
ENEMY_DEATH_FALL_MS       = 500  // アニメーション時間 (ms)
```

---

## プレイヤーのやられアニメーション

### 対象ケース

- `handleMiss('enemy')` かつミス確定（small + 敵接触）のみ
- `handleMiss('fall')` はプレイヤーがすでに画面外 → 既存の即時処理を維持

### 実装

1. `playerGroundCollider` を class フィールドとして保持
   - `create()` で `this.playerGroundCollider = this.physics.add.collider(this.player, built.ground)`
2. `playPlayerDeathAnimation()` メソッド:
   - `this.playerGroundCollider?.destroy()` — 地面貫通を許可
   - `this.playerGroundCollider = null`
   - `this.player.setFlipY(true)` — 上下反転
   - `this.player.anims.play(ANIM_KEY.playerJump, true)` — jump フレームで演出
   - `this.player.setVelocity(0, PLAYER_DEATH_BOUNCE_VY)` — 上方向に弾ませる
3. `handleMiss` の末尾:
   - `enemy` 理由: `playPlayerDeathAnimation()` → `delayedCall(PLAYER_DEATH_FALL_MS, decrementLifeAndContinue)`
   - `fall` 理由: 既存の `setTint + setVelocity(0,0) + decrementLifeAndContinue()` を維持

### 定数

```ts
PLAYER_DEATH_BOUNCE_VY = -280  // 上方向弾みの初速 (px/s)
PLAYER_DEATH_FALL_MS   = 800   // アニメーション開始〜ライフ処理までの遅延 (ms)
```

---

## 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `src/config/gameConfig.ts` | 定数 4 件追加 |
| `src/scenes/GameScene.ts` | フィールド追加・メソッド追加・既存メソッド変更 |
| `src/scenes/animations.ts` | 変更なし |
| `src/scenes/spriteSheets.ts` | 変更なし |

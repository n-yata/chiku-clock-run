# 設計書

## アーキテクチャ概要

既存の Phaser 3 シーン構成・コンポーネント分割を踏襲する。新規コンポーネントは追加せず、
既存クラス（`BossController` / `BossScene` / `GameScene` / `CollisionHandler`）と既存生成パターン
（歯車片 `'C'` / 敵踏み）に乗せて低リスクに実装する。

```
[ボス戦]
BossScene (overlap登録/被弾/演出/遷移)
   └─ BossController (状態機械: intro→attack⇄stagger→defeated, 振り子/歯車雨)
        bob を踏みつけ対象に。core は撤去。

[回復アイテム]
stageXX.ts (タイル 'H')
   → GameScene.buildStage (パース/検証) → buildHealItems (static group)
   → CollisionHandler.register (overlap)
   → GameScene.onHealItemOverlap (ライフ+1/上限3/HUD更新/消費)
BootScene.create → spriteSheets.buildHealItemTexture (procedural canvas)
```

## コンポーネント設計

### 1. BossController（状態機械の再構成）

**責務**:
- ボスの状態機械を `intro | attack | stagger | defeated` で駆動する（`vulnerable` を `stagger` に置換）。
- 振り子の錘 `bob`・落下歯車 `gearRain` を生成・駆動する。弱点コア `core` は撤去。
- 踏みつけ成立（`BossScene` が判定）→ `hit()` で HP を減らし、よろけ→攻撃復帰を制御する。

**実装の要点**:
- `core`・`exposeCore`/`retractCore`・`corePulse`/`coreMoveTween`・`isVulnerable` を削除。
  （`TEX_KEY.bossCore` と `BOSS_CORE_*` 定数は `spriteSheets.buildBossTextures` が参照するため**定数は残す**。
   ゲーム内のコアスプライト生成・使用のみ撤去する。）
- 状態:
  - `attack`: `bob` の body を有効化し振らせる（既存 `updatePendulum`）。錘が踏める対象であることを示す
    ため軽いスケール脈動 tween（`bobPulse`、周期は `BOSS_CORE_PULSE_MS` 流用）を付与。歯車雨も継続。
  - `stagger`（旧 vulnerable）: `bob` を支点上に格納し body 無効・点滅。`BOSS_STAGGER_MS` 経過で `attack` へ。
  - `defeated`: 振り子のパークをやめ、`collapse()`（後述）に委ねる。歯車雨は cull のみ。
- `hit()`: ガードを `state === 'attack'` に変更。成功時 `damageTaken++` / `hp--` / `onHpChanged`。
  HP>0 なら `enterStagger()`、HP<=0 なら `enterDefeated()` + `onDefeated()`。
- `collapse()`（新規・撃破演出用）: tween を全停止、`bob` を床付近へ落下 tween（Bounce）＋回転、`arm` をクリア。

### 2. BossScene（overlap・被弾・演出）

**責務**:
- `bob` への overlap で踏みつけ/被弾を判定し、`boss.hit()` か `handleMiss('enemy')` を呼ぶ。
- 登場・撃破演出を再生し、撃破後 EndingScene へ遷移する。

**実装の要点**:
- `onHazardOverlap`（bob overlap）を**踏みつけ判定付き**に書き換え（`onEnemyOverlap` と同型）:
  - `onTop = pBody.center.y <= bobBody.center.y` かつ `velocity.y > 0` → `particles.burstEnemy` +
    `setVelocityY(STOMP_BOUNCE_VELOCITY)` + `playSe('stomp')` + `applyHitstop()` + `boss.hit()`。
  - それ以外 → `isInvincible` でなければ `handleMiss('enemy')`。
- `core` 関連を撤去: `onCoreOverlap` 削除、`overlap(player, boss.core, ...)` 登録（L182）削除。
- 大時計 Graphics をフィールド `bossClock` 化（`drawBossClock` のローカル `g` を保持）し、撃破時にフェード可能にする。
- `onBossDefeated` 強化: 既存（shake/バースト/celebrate/VICTORY/pendingAdvance）に加え、
  `cameras.main.flash`、`time.timeScale` による短いスロー（終了後 1.0 へ復帰）、バースト増量・拡散、
  `bossClock` の alpha フェード tween、`boss.collapse()` 呼び出しを追加。遷移フローは不変。
- 登場強化: `showIntroBanner`/`create` に intro SE（`playSe('beacon')`）・軽いカメラ揺れ・短いフラッシュを追加。

### 3. GameScene（回復アイテム）

**責務**:
- `'H'` をパース・検証し `healItems` static group を生成、overlap を登録、取得でライフ回復する。

**実装の要点**:
- `buildStage`: `ch === 'H'` 分岐で `healPositions` 収集。`healPositions.length === 1` を検証（不一致は throw）。
- `buildHealItems(positions)`: `buildGearBits` と同型。`TEX_KEY.healItem` で static sprite を生成、
  `setDisplaySize(HEAL_ITEM_SPRITE_W/H)` + `refreshBody()`。
- `onHealItemOverlap`（`onGearBitOverlap` と同型）:
  - `if (this.isCleared || this.isMissed) return;`
  - `if (this.lives < INITIAL_LIVES) { this.lives++; this.hud.setLives(this.lives); }`（上限3キャップ）
  - `particles.celebrate(x, y)` + `audio.playSe('beacon')` + `sprite.disableBody(true, true)`。
- `BuiltStage` に `healItems` を追加。`init`/`create` のフィールド配線、`CollisionTargets`/`register` 接続、
  `fullRestart`/teardown のグループ掃除（`gearBits.clear(true, true)` と同様）に `healItems` を追加。

### 4. CollisionHandler

**責務**: `healItems` の overlap 登録を一元管理に追加する。

**実装の要点**:
- `CollisionTargets` に `healItems: Phaser.Physics.Arcade.StaticGroup` を追加。
- `CollisionHandlers` に `onHealItemOverlap` を追加。
- `register` に `physics.add.overlap(t.player, t.healItems, h.onHealItemOverlap, undefined, this.context)` を追加。

### 5. アセット（spriteSheets / BootScene / gameConfig）

**責務**: 回復アイテムのテクスチャを procedural canvas で生成・登録する。

**実装の要点**:
- `gameConfig.TEX_KEY` に `healItem: 'heal_item'` を追加。`HEAL_ITEM_SPRITE_W/H = 28` を追加。
- `spriteSheets.buildHealItemTexture(scene)`（`buildParticleTexture` と同型の canvas 生成）:
  真鍮の歯車枠＋ルビーのハート（時計世界観）。高解像度で描いてダウンスケール。
- `BootScene.create` に `buildHealItemTexture(this)` を追加。
- `gameConfig` のボス定数に `BOSS_STAGGER_MS = 1000` を追加（`BOSS_VULN_MS` は不使用となるが定数は残置）。

## データフロー

### 振り子踏みでボスにダメージ
```
1. attack 中、bob の body 有効・振動
2. プレイヤーが上から bob に重なる (velocity.y>0, center上)
3. BossScene.onHazardOverlap が stomp 判定 → bounce/hitstop/SE
4. boss.hit() → hp-- / onHpChanged → HPバー更新
5. hp>0: enterStagger（bob 無効・点滅, BOSS_STAGGER_MS）→ attack(ω 加速)
   hp<=0: enterDefeated + onDefeated → 撃破演出 → EndingScene
```

### 回復アイテム取得
```
1. stageXX の 'H' を buildStage がパース → buildHealItems が static sprite 生成
2. プレイヤーが重なる → CollisionHandler 登録の overlap 発火
3. onHealItemOverlap: lives<3 なら lives++ → hud.setLives
4. celebrate + playSe('beacon') + disableBody（消費）
```

## エラーハンドリング戦略

### カスタムエラークラス
新規なし。既存の `buildStage` のバリデーション throw（`Stage ...: ...`）と同方式。

### エラーハンドリングパターン
- `'H'` の個数が1でない場合は `buildStage` で明示的に throw（早期失敗）。
- 物理ステップ中の sprite 破棄は既存方針（`disableBody` 後に処理）に従い、回復は static のため
  `disableBody(true, true)` で安全に消費する（歯車片と同じ）。

## テスト戦略

### ユニットテスト
- 本リポジトリに unit/lint のスクリプトは無い（`package.json`: `typecheck` / `build` / `test:e2e`）。
- 型レベル整合は `npm run typecheck` で担保する。

### 統合テスト
- `npm run build`（tsc + vite）でビルド通過を確認。
- 既存の stage バリデーションロジック（`stageValidation.ts`）に `'H'` が影響しないことを確認。
- 実機（`npm run dev`）で受け入れ条件を手動確認。

## 依存ライブラリ

新規追加なし（Phaser 3 のみ）。

## ディレクトリ構造

```
変更:
  src/config/gameConfig.ts        # TEX_KEY.healItem, HEAL_ITEM_SPRITE_*, BOSS_STAGGER_MS
  src/scenes/spriteSheets.ts      # buildHealItemTexture
  src/scenes/BootScene.ts         # buildHealItemTexture 呼び出し
  src/game/BossController.ts      # 状態機械再構成・core撤去・collapse
  src/scenes/BossScene.ts         # bob踏み判定・core撤去・演出強化・clockフィールド化
  src/game/CollisionHandler.ts    # healItems overlap
  src/scenes/GameScene.ts         # buildHealItems / onHealItemOverlap / 配線
  src/stages/stage01.ts           # TileChar に 'H'、コメント、配置
  src/stages/stage02.ts           # 'H' 配置
  src/stages/stage03.ts           # 'H' 配置
ドキュメント（振り返り後）:
  docs/functional-design.md, docs/glossary.md
```

## 実装の順序

1. gameConfig 定数追加（TEX_KEY.healItem / サイズ / BOSS_STAGGER_MS）
2. spriteSheets.buildHealItemTexture + BootScene 登録
3. CollisionHandler に healItems 配線
4. GameScene: buildStage パース/検証・buildHealItems・onHealItemOverlap・フィールド/teardown 配線
5. stage01 TileChar 拡張 + 各ステージへ 'H' 配置
6. BossController: core撤去・stagger化・hit/collapse
7. BossScene: bob踏み判定・core撤去・clockフィールド化・登場/撃破演出強化
8. typecheck / build / 実機確認

## セキュリティ考慮事項
- 外部入力・通信・シークレットは扱わない（静的フロントエンド）。ハードコーディング規約に従い、
  追加値は `gameConfig.ts` の定数に集約する（マジックナンバーをロジックに埋めない）。

## パフォーマンス考慮事項
- 回復アイテムは1ステージ1個・static body のため負荷増は無視可能。
- 撃破演出の追加 tween/パーティクルは一時的かつ撃破時のみ。スロー（timeScale）は必ず 1.0 へ復帰させる。

## 将来の拡張性
- `'H'` のパース/生成を歯車片と同じ枠組みにすることで、将来の収集物追加が容易。
- ボス状態機械を `stagger` 化したことで、将来の追加攻撃フェーズ挿入が容易。

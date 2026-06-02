# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: 回復アイテム「予備ゼンマイ」

- [x] 定数追加（`src/config/gameConfig.ts`）
  - [x] `TEX_KEY.healItem = 'heal_item'`
  - [x] `HEAL_ITEM_SPRITE_W = 28` / `HEAL_ITEM_SPRITE_H = 28`
- [x] テクスチャ生成（`src/scenes/spriteSheets.ts`）
  - [x] `buildHealItemTexture(scene)` を追加（真鍮歯車枠＋ルビーのハート、canvas）
- [x] BootScene 登録（`src/scenes/BootScene.ts`）
  - [x] import と `buildHealItemTexture(this)` 呼び出しを追加
- [x] 衝突登録（`src/game/CollisionHandler.ts`）
  - [x] `CollisionTargets.healItems` / `CollisionHandlers.onHealItemOverlap` 追加
  - [x] `register` に `overlap(player, healItems, onHealItemOverlap)` 追加
- [x] GameScene 配線（`src/scenes/GameScene.ts`）
  - [x] `BuiltStage` と フィールドに `healItems` 追加
  - [x] `buildStage` で `'H'` パース + ちょうど1個の検証
  - [x] `buildHealItems(positions)` 追加（buildGearBits 同型）
  - [x] `onHealItemOverlap` 追加（lives+1/上限3/HUD更新/celebrate/SE/disableBody）
  - [x] `register` 呼び出しへ healItems 接続、teardown/fullRestart のグループ掃除に追加
- [x] ステージ配置
  - [x] `stage01.ts`: `TileChar` に `'H'` 追加 + ヘッダコメント追記 + `'H'` を1つ配置
  - [x] `stage02.ts`: `'H'` を1つ配置
  - [x] `stage03.ts`: `'H'` を1つ配置

## フェーズ2: ボス戦リワーク（踏みつけ対象の変更）

- [x] 定数（`src/config/gameConfig.ts`）
  - [x] `BOSS_STAGGER_MS = 1000` を追加（`BOSS_VULN_MS` は残置・不使用）
- [x] `BossController.ts` 状態機械の再構成
  - [x] `BossState` を `intro|attack|stagger|defeated` に変更
  - [x] `core`/`exposeCore`/`retractCore`/`corePulse`/`coreMoveTween`/`isVulnerable` 撤去
  - [x] `attack` 中に `bob` のスケール脈動 tween（踏める対象の示唆）を付与、stagger で停止
  - [x] `enterStagger`（bob 格納・body無効・点滅, `BOSS_STAGGER_MS`）→ `attack` 復帰
  - [x] `hit()` のガードを `state==='attack'` に変更し成功時 `enterStagger()`
  - [x] `defeated` 時はパークせず、`collapse()`（bob 落下 tween＋回転、arm クリア）を追加
- [x] `BossScene.ts` 踏み判定とコア撤去
  - [x] `onHazardOverlap`→`onBobOverlap` を stomp 判定付きに書き換え（onEnemyOverlap 同型）
  - [x] `onCoreOverlap` 削除、`overlap(player, boss.core, ...)` 登録削除
  - [x] `boss.core` 参照を排除（型・shutdown 含む）

## フェーズ3: ボス演出強化（`src/scenes/BossScene.ts`）

- [x] 大時計 Graphics をフィールド `bossClock` 化（`drawBossClock`）
- [x] 撃破演出強化（`onBossDefeated`）
  - [x] バースト増量(5→9)・拡散、`cameras.main.flash`、物理スロー（→1.0復帰, shutdownでも保険）
  - [x] `bossClock` の alpha フェード tween、`boss.collapse()` 呼び出し
  - [x] 既存の VICTORY / celebrate / pendingAdvance / EndingScene 遷移を維持
- [x] 登場演出強化（`showIntroBanner`/`create`）
  - [x] intro SE（`playSe('beacon')`）・軽いカメラ揺れ・短いフラッシュを追加

## フェーズ4: 品質チェックと修正

- [x] 型エラーがないことを確認（`npm run typecheck`）
- [x] ビルドが成功することを確認（`npm run build`）
  - 注: 本リポジトリに `npm test` / `npm run lint` は無い（`package.json` 参照）。型＋ビルドで担保。

## フェーズ5: ドキュメント更新
- [x] `docs/functional-design.md` のタイル文字表に `'H'`（予備ゼンマイ）を追記＋`BuiltStage.healItems`＋ボス状態機械（`intro|attack|stagger|defeated`・振り子踏み）更新
- [x] `docs/glossary.md` に「予備ゼンマイ」を追記
- [x] 実装後の振り返り（このファイル下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-03

### 計画と実績の差分

**計画と異なった点**:
- ボス撃破演出のスローモーションは当初 `this.time.timeScale` も絞る想定だったが、タイマー/トゥイーン
  （= リセット用 delayedCall 自身）まで遅延して不安定になるため、**物理（`physics.world.timeScale`）のみ**を
  スローにし、タイマー/トゥイーンは通常速度に保つ方式へ変更した。`shutdown` でも `timeScale=1` 復帰の保険を追加。
- `BOSS_CORE_*` 定数・`TEX_KEY.bossCore` テクスチャは `spriteSheets.buildBossTextures` が参照しているため
  **削除せず残置**。ゲーム内のコアスプライト生成・使用のみ撤去した（不要な広域変更を避けるため）。
- 錘が「踏める対象」であることの示唆として、攻撃中に `bob` のスケール脈動 tween を追加（計画の補強）。

**新たに必要になったタスク**:
- 実装検証（ギュレル）指摘の対称性改善: `onGearRainOverlap` に無敵チェックを追加（無敵中の落下歯車の無駄消費を防止）。
- `hit()` 戻り値の意味をコメントで明確化。

**技術的理由でスキップしたタスク**: なし（全タスク完了）。

### 学んだこと

**技術的な学び**:
- Arcade Physics の `world.timeScale` は値が大きいほど遅くなる（実質「逆数」的）。シーンの `time.timeScale` を
  絞ると、その復帰用タイマー自身も遅延するため、スロー演出は物理側だけに限定するのが安全。
- 既存の収集物（歯車片 `'C'`）・敵踏み（`onEnemyOverlap`）の実装パターンに完全準拠したことで、回復アイテムと
  ボス踏みを最小差分・低リスクで追加できた。新規コンポーネントは不要だった。
- `stageValidation.ts` はタイル文字を限定カウントする設計のため、新タイル `'H'` を空中セルに置く限り
  クリアランス/難易度検査に影響しない。

**プロセス上の改善点**:
- `/plan-feature` の `idea.md` を起点に requirements→design→tasklist を起こしたことで、ヒアリング済みの
  決定事項（踏み仕様・回復量・配置）がブレずに実装まで一貫した。

### 次回への改善提案
- 振り子踏みは従来のコア踏みより難度が上がるため、`BOSS_PENDULUM_OMEGA_BY_PHASE`・`BOSS_PENDULUM_AMP_RAD`・
  `BOSS_STAGGER_MS` を**実機（`npm run dev`）でプレイ調整**するのが望ましい（本実装は妥当な既定値を採用）。
- 本リポジトリは unit/lint が無く型＋ビルドのみ。`pendulumPosition` 等の純関数は将来ユニットテスト追加の好適点。
- 回復アイテムの配置列は走路終盤/中盤に置いたが、難所の直前など「効果的な位置」へのチューニング余地あり。

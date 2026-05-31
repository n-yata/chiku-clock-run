# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: 設定定数の追加

- [x] gameConfig に `ENDING_*` 定数を追加
  - [x] 空の色（夜/曇り・晴れ・太陽）
  - [x] 時計の色（真鍮・文字盤夜/昼・針）
  - [x] 歯車の色（本体・暗部）
  - [x] タイミング（各フェーズ・タイトル復帰遅延）
  - [x] 文言（HAPPY END・サブタイトル・歯車プレフィックス・スキップ案内）

## フェーズ2: EndingScene の新規作成

- [x] `src/scenes/EndingScene.ts` を作成（クラス雛形・key 登録・init/create/shutdown）
- [x] 背景（空）Graphics と夜→晴れグラデーション tween
- [x] 大時計 Graphics（文字盤・針）と始動アニメーション（針が回りだす）
- [x] 歯車 Graphics の飛来＆噛み合いアニメーション
- [x] チク sprite 登場 + 祝祭パーティクル
- [x] テキスト（HAPPY END / 集めた歯車 / サブタイトル / スキップ案内）と layout()
- [x] 演出タイムライン（5 フェーズの delayedCall 連結）
- [x] スキップ（キー/タップ）と自動タイトル復帰（ワンショット多重遷移防止）
- [x] AudioManager 生成・unlock・演出 SE・SHUTDOWN 破棄

## フェーズ3: シーン登録と GameScene 改修

- [x] `main.ts` の scene 配列に EndingScene を登録
- [x] GameScene に歯車累計フィールド（priorGearsCollected/Total）と init 受け取りを追加
- [x] transitionToStage / fullRestart で累計を引き継ぐ
- [x] showAllClear を EndingScene 遷移に置換し、不要 import を整理

## フェーズ4: 永続ドキュメント更新

- [x] `docs/repository-structure.md` に EndingScene を追記

## フェーズ5: 品質チェックと修正

- [x] 型エラーがないことを確認（`npm run typecheck`）
- [x] ~~リントエラーがないことを確認（`npm run lint`）~~（技術的理由でスキップ: 本プロジェクトに lint スクリプトは未定義。型チェックで担保）
- [x] ビルドが成功することを確認（`npm run build`）
- [x] 既存 E2E がグリーンであることを確認（`npm run test:e2e` 全7件 pass）
- [x] implementation-validator による品質検証（Critical 0 / High 指摘2件は対応済み）

## フェーズ6: 振り返り

- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-05-31

### 計画と実績の差分

**計画と異なった点**:
- `npm run lint` は本プロジェクトに **スクリプトが存在しない**（package.json 未定義）。型チェック（tsc）で品質を担保する方針に変更し、tasklist では技術的理由を明記してスキップ扱いとした。
- フェーズタイミングを実装後に微調整。歯車飛来完了（≈3980ms）より時計始動（当初3900ms）が早く、因果が崩れていたため `ENDING_CLOCK_START_MS` を 4200、`ENDING_SKY_CLEAR_MS` を 4900 に後ろ倒しした。

**新たに必要になったタスク**:
- implementation-validator（ギュレル）の High 指摘2件への対応:
  1. 演出に関わる `time.delayedCall`（finale の burstGear / goToTitle）を `this.schedule()` 経由にし、`timers` 配列で一元管理。SHUTDOWN/スキップで確実に停止できるようにした。
  2. `onShutdown` に input リスナー（keydown / pointerdown の onSkip）の off を追加。`scale` resize のみ off していた非対称を解消。
- 文言重複の解消: `集めた歯車 歯車片: n / m` → `集めた歯車: n / m`（`HUD_GEAR_LABEL` 連結をやめ import も削除）。

**技術的理由でスキップしたタスク**:
- リント（`npm run lint`）: スクリプト未定義のため実行不能。型チェックで代替。

### 学んだこと

**技術的な学び**:
- RESIZE モード下の演出は、tween 対象を「角度 / alpha / scale」に限定し、**位置は layout() に一元化**すると座標飛びを避けられる（TitleScene の設計を踏襲）。
- 独立シーンでは、テクスチャ/アニメは `textures.exists` ガード付きの冪等ビルダで **防御的に生成**しておくと単独起動でも壊れない。
- 「演出に関わる遅延処理は配列で一元管理してまとめて停止する」設計ルールは、`enterFinale` のような後追いの delayedCall も含めて貫かないと、レース時の漏れになる。

**プロセス上の改善点**:
- add-feature の完全自動モードで requirements→design→tasklist→実装→検証→修正まで一気通貫。tasklist をフェーズ単位でリアルタイム更新したことで進捗が追いやすかった。

### 次回への改善提案
- 全クリア導線（3ステージ走破）を要する演出は E2E が重いため、EndingScene 単体起動の軽量スモークテスト（シーン start → finale 到達 → TitleScene 遷移）を別途用意すると回帰検知しやすい。
- テキスト縁取り色など、シーンに残るハードコード色を将来 config へ集約する余地あり（TitleScene と共通の前例踏襲のため今回は据え置き）。

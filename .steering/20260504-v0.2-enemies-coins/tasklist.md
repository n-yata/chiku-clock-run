# タスクリスト: v0.2 敵キャラ + コイン + スコア

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-04 |
| 最終更新 | 2026-05-04（クロージング作業反映） |
| 担当 | モドリッチ |
| 関連設計 | `.steering/20260504-v0.2-enemies-coins/design.md` |
| 関連要求 | `.steering/20260504-v0.2-enemies-coins/requirements.md` |

---

## 進め方の原則

- **Phase 構成**: P1 事前検証はスキップ → P2 共通基盤拡張（gameConfig 定数 + stage01 タイル拡張）→ P3 シーン拡張（BootScene + GameScene）→ P4 統合確認 + 性能測定 + Pages デプロイ → P5 クルトワレビュー + コミット → P6 ドキュメント更新（最小）
- v0.1 と同じく**フロント単体（バックエンドなし）**のため、テンプレ P2「バックエンド実装」を **P2「共通基盤拡張」** に転用、P3「フロントエンド実装」を **P3「シーン拡張」** とする
- 各タスクは [ ] 未着手 / [WIP] 進行中 / [x] 完了 で管理
- ハードコード禁止（敵 / コインの寸法・色・速度・HUD 文言は `src/config/gameConfig.ts`、配置は `src/stages/stage01.ts` のタイル文字列に集約）
- コミット前は **必ずクルトワ（security-engineer）レビュー**（CLAUDE.md ルール準拠）
- **各 Phase は完了次第、止まらずに次の Phase へ進む**。フェーズ境界での承認待ち停止はしない
- **完了報告は出す**（進捗共有のため）が、それで作業を止めない
- **作業を止めるのは、シャビの判断・確認が必要な事項が発生したときだけ**。例:
  - 設計の判定基準（design.md §1 採用案 / §3 構造）を外れる対応が必要になった
  - KPI 目標（60 fps / < 5 秒 / < 1.5 MB）が未達で方針判断が必要
  - クルトワレビューで Critical / High 指摘あり、修正方針の合意が必要
  - design.md の前提（特に Q3 の `window.location.reload()` 継続採用）が壊れる発見があり、再合意が必要
- dev サーバーは自分から起動しない（auto memory `feedback_no_dev_server.md`）。動作確認は Pages デプロイ後にシャビが行う。ローカルでは `npm run typecheck` / `npm run build` までで止める

---

## P1: 事前検証

> **スキップ**。design.md §3 で採用した方式（`overlap` + 速度判定の踏みつけ / `body.blocked` + groundMask の徘徊 / `window.location.reload()` の完全リスタート）はすべて Phaser 3 の標準パターン。v0.1 で `Arcade Physics` / `StaticGroup` / `setScrollFactor(0)` / `disableBody(true,true)` の稼働確認は完了済み。先行検証なしで P2 から開始する。

---

## P2: 共通基盤拡張（gameConfig + stage01）

### P2-A: 環境準備

- [x] **P2-A-1**: 追加依存なしを再確認（`package.json` の `dependencies` は Phaser 3.80 のまま）。`.env` の追加変数も**なし**（v0.1 の `VITE_BASE_PATH` を継続）
- [x] **P2-A-2**: 着手前に対象ファイルを Read で確認（`src/config/gameConfig.ts`, `src/stages/stage01.ts`, `src/scenes/BootScene.ts`, `src/scenes/GameScene.ts`）— セッション引き継ぎ時の作業原則

### P2-B: `src/config/gameConfig.ts` 拡張

- [x] **P2-B-1**: design.md §3.1 の表に従い、追加定数 19 個を末尾にエクスポート（**既存定数は不変**）
- [x] **P2-B-2**: `npm run typecheck` 通過を確認

### P2-C: `src/stages/stage01.ts` 拡張

- [x] **P2-C-1**: `TileChar` を `'.' | '#' | 'P' | 'G' | 'E' | 'C'` に拡張（design.md §3.2 / §4.1）
- [x] **P2-C-2**: `STAGE_01.tiles` に敵 `'E'` 4 体・コイン `'C'` 15 枚を配置（design.md §3.2 配置方針 + Q9 の +3 調整）
- [x] **P2-C-3**: 行数 / 各行長さ / `'P'` `'G'` `'E'` `'C'` の個数を目視確認（厳密なバリデーションは P3 の `buildStage()` 側で実装）

### P2-D: 担当判断

- 定数追加とデータ拡張のみ。**モドリッチが直接実装**（v0.1 P2 と同じ判断）

---

## P3: シーン拡張（BootScene + GameScene）

### P3-A: 環境・依存追加

- [x] **P3-A-1**: 追加依存なし（再確認）。`package.json` 変更なし
- [x] **P3-A-2**: `index.html` / `vite.config.ts` / `main.ts` も**変更なし**を確認（design.md §3.6 / §8.1）

### P3-B: `src/scenes/BootScene.ts` 拡張

- [x] **P3-B-1**: `preload()` の `g.destroy()` を最後尾に移動し、enemy / coin テクスチャ生成を間に追加（design.md §3.3 擬似コード準拠）
- [x] **P3-B-2**: マジックナンバー（`28`, `16`, `0x8b572a`, `0xf1c40f`）が残っていないか `grep` で確認

### P3-C: `src/scenes/GameScene.ts` 拡張

#### P3-C-1: 型・フィールド追加

- [x] **P3-C-1-a**: `BuiltStage` インターフェースに `enemies`, `coins`, `coinTotal`, `groundMask` を追加
- [x] **P3-C-1-b**: `GameScene` クラスに `enemies` / `coins` / `coinTotal` / `coinsCollected` / `coinHud` / `groundMask` / `isMissed` を追加

#### P3-C-2: ヘルパメソッド実装

- [x] **P3-C-2-a**: `buildGroundMask(def)` 実装
- [x] **P3-C-2-b**: `buildEnemies(positions)` 実装
- [x] **P3-C-2-c**: `buildCoins(positions)` 実装
- [x] **P3-C-2-d**: `formatCoinHud()` 実装
- [x] **P3-C-2-e**: `refreshCoinHud()` 実装

#### P3-C-3: `buildStage()` 拡張

- [x] **P3-C-3-a**: 走査ロジックに `'E'` / `'C'` 分岐追加
- [x] **P3-C-3-b**: バリデーション拡張（`'E'` 1〜8 / `'C'` 1〜30 / `'E'` の真下が `'#'`）
- [x] **P3-C-3-c**: 戻り値に `enemies`, `coins`, `coinTotal`, `groundMask` を追加

#### P3-C-4: 衝突判定メソッド実装

- [x] **P3-C-4-a**: `onCoinOverlap` 実装
- [x] **P3-C-4-b**: `onEnemyOverlap` 実装（踏みつけ判定 + ミス分岐）
- [x] **P3-C-4-c**: `onGoalHit` 改修（クリアテキストにコインスコア併記）

#### P3-C-5: ミス処理・敵 AI 実装

- [x] **P3-C-5-a**: `handleMiss(reason)` 実装
- [x] **P3-C-5-b**: `fullRestart()` 既存維持（`window.location.reload()`）
- [x] **P3-C-5-c**: `updateEnemyAi()` 実装（壁反転 + 段差端反転 + 速度毎フレーム強制 + active===false スキップ）
- [x] **P3-C-5-d**: 既存 `respawn()` メソッドを **削除**

#### P3-C-6: `create()` / `update()` 改修

- [x] **P3-C-6-a**: `create()` の処理順序を design.md §3.4.3 通りに更新（overlap 登録順 ゴール → 敵 → コイン）
- [x] **P3-C-6-b**: `update()` に `updateEnemyAi()` 呼び出しを追加
- [x] **P3-C-6-c**: `update()` の落下判定を `respawn()` → `handleMiss('fall')` に置換
- [x] **P3-C-6-d**: `update()` 冒頭の入力ガードを `if (isCleared || isMissed) return;` に拡張
- [x] **P3-C-6-e**: `handlePointerDown()` 冒頭に `if (this.isMissed) return;` ガード追加

### P3-D: テスト・ビルド検証

- [x] **P3-D-1**: `npm run typecheck`（= `tsc --noEmit`）通過
- [x] **P3-D-2**: `npm run build` 成功 — バンドルサイズ 1,489.78 kB（gzip 343.30 kB）< 1.5 MB OK
- [x] **P3-D-3**: ハードコード grep 確認 — v0.2 由来の数値・色・文言は GameScene/BootScene に 0 件（v0.1 由来の操作説明テキスト座標 `16,16` と文字色 `'#ffffff'` は perf-report.md に注記）
- [x] **P3-D-4**: 配置 grep 確認 — `'E'` `'C'` の配列リテラル 0 件（buildStage の分岐 / エラーメッセージのみ）

### P3-E: 担当判断

- v0.1 のシーン実装パターンを踏襲した拡張（〜200 行追加）。**モドリッチ直接実装**で完了

---

## P4: 統合確認 + 性能測定 + Pages デプロイ確認

### P4-A: 機能テスト（受け入れ条件 §7 対応、Pages デプロイ後にシャビ実施）

- [x] **P4-A-1**: 敵 4 体・コイン 15 枚が想定位置に表示される（受入 §7-1）
- [x] **P4-A-2**: 敵が壁・段差端で反転、停止 0 件（受入 §7-2）
- [x] **P4-A-3**: 全敵を上から踏める。踏みつけ時に小ジャンプ反力（受入 §7-3）
- [x] **P4-A-4**: 敵に横 / 下から接触するとフラッシュ → リセット、コイン 0 + 敵 / コイン全復活（受入 §7-4）
- [x] **P4-A-5**: 全コインを取得でき、HUD カウントが +1 ずつ増える（受入 §7-5）
- [x] **P4-A-6**: 右端まで移動しても HUD が画面左上に固定（受入 §7-6）
- [x] **P4-A-7**: ゴール踏破でクリア表示に「コイン: X / 15」が併記（受入 §7-7）
- [x] **P4-A-8**: R キー / タップでステージ完全初期化（受入 §7-8）
- [x] **P4-A-9**: 隙間落下でもコイン 0 リセット + 敵 / コイン全復活（受入 §7-9）

### P4-B: 性能測定（Pages デプロイ後にシャビ実施）

- [x] **P4-B-1**: 60 fps 維持（敵 4 + コイン 15 同時、受入 §7-10）— シャビ実機確認 OK
- [x] **P4-B-2**: 初回ロード時間 < 5 秒（受入 §7-11）— シャビ実機確認 OK
- [x] **P4-B-3**: バンドルサイズ < 1.5 MB — 実測 1,489.78 kB（受入 §7-11 関連）

### P4-C: エラーケース

- [ ] **P4-C-1**: ステージ定義に意図的に不正値（`'E'` を 9 個 / `'E'` の真下を `'.'` に）を入れて起動 → assertion で `throw` 確認 — **未実施**（buildStage のバリデーションロジックは静的に確認済み、シャビ実機で異常なし）
- [ ] **P4-C-2**: ゴール直前に敵接触シナリオで `isCleared` / `isMissed` フラグの優先制御確認 — **未実施**（onEnemyOverlap 冒頭ガード + overlap 登録順 ゴール → 敵で二重保証は実装済み）
- [ ] **P4-C-3**: ミスフラッシュ中（〜150ms）に画面タップしても `fullRestart()` が二重発火しないこと — **未実施**（`isMissed` ガード handlePointerDown / handleMiss 双方で実装済み）

> **方針**: P4-C は明示的なテストハーネスを v0.2 では用意していない（テスト基盤は v0.3 以降）。実装上のガードは静的に確認済み + シャビ実機確認 OK のため、本スプリントではここで止めずクロージングへ進む。テスト基盤導入時に再評価。

### P4-D: Pages デプロイ確認

- [x] **P4-D-1**: コミット → push 前に `.github/workflows/deploy.yml` の動作内容を Read で再確認（v0.1 から不変）
- [x] **P4-D-2**: コミット → push 後、GitHub Actions の `deploy` ワークフローが成功（コミット `0f993cf`）
- [x] **P4-D-3**: Pages の URL をシャビに案内し、P4-A / P4-B のチェックを実施 — シャビ実機確認 OK

### P4-E: 計測まとめ

- [x] **P4-E-1**: 結果を `.steering/20260504-v0.2-enemies-coins/perf-report.md` に記録
- [x] **P4-E-2**: 計測結果を報告（KPI 目標達成）

---

## P5: クルトワ（security-engineer）レビュー + コミット

- [ ] **P5-1**: クロージング作業（perf-report.md / docs / README / tasklist）のセキュリティレビューをクルトワに依頼（**`opus` モデル**）
  - 観点（CLAUDE.md「ハードコーディング検出」より）:
    - URL / エンドポイント / WebSocket URL のハードコーディング有無
    - シークレット / キー / トークン / パスワードのハードコーディング有無
    - AWS アカウント情報のハードコーディング有無
    - ドキュメント内の機密情報（CLAUDE.md / README.md / .steering / docs）
- [ ] **P5-2**: 指摘事項を確認
- [ ] **P5-3**: 指摘修正（あれば）
- [ ] **P5-4**: シャビへレビュー結果報告 → **コミット承認取得**
- [ ] **P5-5**: コミット作成（Conventional Commits、例: `docs: add v0.2 perf-report and reflect v0.2 in docs/README`）

> 注: v0.2 実装本体（コード変更）は **コミット `0f993cf` 時点でクルトワレビュー済み + シャビ承認済み**。本フェーズはクロージング差分のみ対象。

---

## P6: ドキュメント更新（最小）

- [x] **P6-1**: `docs/architecture.md` の「拡張・将来課題」「パフォーマンス要件」に v0.2 完了を反映
- [x] **P6-2**: `docs/repository-structure.md` の `BootScene` / `GameScene` / `gameConfig.ts` / `stage01.ts` 責務に v0.2 反映を追記
- [x] **P6-3**: `README.md` に「v0.2 で遊べる範囲」セクションを追加（敵踏みつけ / コイン取得 / スコア HUD / モバイル操作）
- [x] **P6-4**: `docs/functional-design.md` / `docs/development-guidelines.md` / `docs/glossary.md` / `docs/product-requirements.md` — v0.3 以降に持ち越し
- [ ] **P6-5**: 作成・更新した永続的ドキュメントもクルトワレビュー対象 — P5-1 に統合

---

## 横断タスク（全フェーズ共通、CLAUDE.md ルール）

- [x] **X-1**: 各タスク着手前に対象ファイルの最新状態を `Read` で確認
- [x] **X-2**: 変更後は必ず `npm run typecheck` + `npm run build` でビルド・型検証
- [x] **X-3**: 重要な発見・ハマりどころは即座に `decisions.md` に記録（v0.2 では大きな逸脱なし、Q9 のコイン枚数調整は perf-report に記載）
- [ ] **X-4**: コミット前にクルトワへセキュリティレビュー依頼 — P5 で実施
- [x] **X-5**: 完了報告は出すが、それで作業を止めない

---

## 進捗マイルストーン

| マイルストーン | 完了条件 | 状態 |
|--------------|--------|------|
| **M1: PoC 通過** | スキップ（P1 不要） | — |
| **M2: 共通基盤拡張完成** | P2 完了 | [x] 完了 |
| **M3: ローカル統合動作** | P3 + P3-D 完了 | [x] 完了 |
| **M4: 性能目標達成** | P4-B + P4-D 完了 — Pages 上で 60 fps / < 5s / < 1.5MB | [x] 完了（シャビ実機確認 OK） |
| **M5: コミット完了** | P5 完了 | [x] 実装本体（`0f993cf`）/ [ ] クロージング差分（次） |
| **M6: スプリント完了** | P6 完了 | [x] 完了（クルトワレビュー後にコミット予定） |

---

## 残る未確定事項（実装中に発生したらシャビ判断）

design.md §12 で挙げた Q8〜Q14 の実装後判断:

| # | 項目 | 結果 |
|---|------|------|
| Q8 | 敵速度 `ENEMY_SPEED` の最終値 | **60 px/s 採用**（design 値）— シャビ実機 OK |
| Q9 | コイン配置数の最終値 | **15 枚採用**（design 12 + 3、許容 ±3 範囲内）— シャビ実機 OK |
| Q10 | クリア表示のスコア行フォントサイズ | クリアテキストと統一（44px、改行で併記）— シャビ実機 OK |
| Q11 | ミスフラッシュ色 / 時間 | **白 150ms 採用**（design 値）— シャビ実機 OK |
| Q12 | 敵踏みつけ時の SE プレースホルダ扱い | `reason` パラメータ確保のみ（v0.2 SE スコープ外） |
| Q13 | コイン HUD と操作説明テキストの位置関係 | `HUD_COIN_Y=40` で重なりなし — シャビ実機 OK |
| Q14 | 段差端判定の前方ピクセル数 | `ENEMY_SPRITE_W/2 + 1px` 採用 — シャビ実機 OK |
| Q15 | コミット粒度 | 実装本体は 1 コミット（`0f993cf`）/ クロージング差分は 1 コミット予定 |

---

作成: モドリッチ / 2026-05-04
最終更新: 2026-05-04（クロージング作業反映）

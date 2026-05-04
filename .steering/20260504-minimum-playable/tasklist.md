# タスクリスト: 最小プレイ可能版 v0.1

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-04 |
| 担当 | モドリッチ |
| 関連設計 | `.steering/20260504-minimum-playable/design.md` |
| 関連要求 | `.steering/20260504-minimum-playable/requirements.md` |

---

## 進め方の原則

- **Phase 構成**: P1 事前検証はスキップ → P2 共通基盤（定数・ステージ定義）→ P3 シーン実装（BootScene / GameScene）→ P4 統合確認 + 性能測定 + Pages デプロイ → P5 クルトワレビュー + コミット → P6 ドキュメント整備
- 本プロジェクトはフロント単体（バックエンドなし）のため、テンプレの P2「バックエンド実装」を **P2「共通基盤実装」** に転用、P3「フロントエンド実装」を **P3「シーン実装」** とする
- 各タスクは [ ] 未着手 / [WIP] 進行中 / [x] 完了 で管理
- ハードコード禁止（物理定数・ステージ定義はすべて `src/config/gameConfig.ts` / `src/stages/stage01.ts` に集約）
- コミット前は **必ずクルトワ（security-engineer）レビュー**（CLAUDE.md ルール準拠）
- **各 Phase は完了次第、止まらずに次の Phase へ進む**。フェーズ境界での承認待ち停止はしない
- **完了報告は出す**（進捗共有のため）が、それで作業を止めない
- **作業を止めるのは、シャビの判断・確認が必要な事項が発生したときだけ**。例:
  - 設計の判定基準を外れた / 想定外の制約が発覚した
  - KPI 目標が未達で方針判断が必要
  - クルトワレビューで Critical / High 指摘あり、修正方針の合意が必要
  - design.md の前提が壊れる発見があり、再合意が必要

---

## P1: 事前検証

> **スキップ**。既存技術スタック（TypeScript + Vite + Phaser 3.80）で未知要素なし。`generateTexture` 方式・Arcade Physics・Scene 遷移はスキャフォールド時点で稼働確認済み。先行検証なしで P2 から開始する。

---

## P2: 共通基盤実装（定数・ステージ定義）

### P2-A: 環境準備

- [ ] **P2-A-1**: 追加依存なしを確認（`package.json` の `dependencies` は Phaser 3.80 のみのまま）。`.env` の追加変数も**なし**（base パスは既存 `VITE_BASE_PATH` を維持、design.md §4.3）
- [ ] **P2-A-2**: 新規ディレクトリ作成（`mkdir -p src/config src/stages`）

### P2-B: `src/config/gameConfig.ts` 新規作成

- [ ] **P2-B-1**: design.md §3.1.1 の表に従い、以下を export
  - `VIEWPORT_WIDTH=960`, `VIEWPORT_HEIGHT=540`, `TILE_SIZE=32`
  - `GRAVITY_Y=800`, `PLAYER_SPEED=200`, `JUMP_VELOCITY=-450`
  - `PLAYER_SPRITE_W=32`, `PLAYER_SPRITE_H=48`, `GOAL_SPRITE_W=32`, `GOAL_SPRITE_H=64`
  - `FALL_THRESHOLD_Y = VIEWPORT_HEIGHT + 200`
  - `BG_COLOR='#5c94fc'`
  - `TEX_KEY = { player: 'player', ground: 'ground', goal: 'goal' } as const`
- [ ] **P2-B-2**: `tsc --noEmit` で型エラーなしを確認

### P2-C: `src/stages/stage01.ts` 新規作成

- [ ] **P2-C-1**: design.md §3.1.2 / §4.1 に従い、以下を定義
  - `type TileChar = '.' | '#' | 'P' | 'G'`
  - `interface StageDefinition { id: string; cols: number; rows: number; tiles: readonly string[]; }`
  - `STAGE_01: StageDefinition` 定数（初期値: `cols=120, rows=17` 程度、段差 2〜3 段、隙間 1〜2 箇所、`'P'` を左 1/3 以内に 1 個、`'G'` を右端付近に 1 個）
- [ ] **P2-C-2**: 行数 / 各行長さ / `'P'` `'G'` 個数を目視確認（バリデーションは P3 の `buildStage()` 側で実装）

### P2-D: 担当判断

- フロントエンジニア（エンバペ）に依頼するほど複雑ではない定数・データ定義のため、**モドリッチが直接実装**

---

## P3: シーン実装（BootScene 改修 + GameScene 拡張）

### P3-A: 環境・依存追加

- [ ] **P3-A-1**: 追加依存なし（再確認）。`package.json` 変更なし
- [ ] **P3-A-2**: `frontend/.env.example` 相当の追加なし（本プロジェクトはルート単体構成、`.env` 自体を持たない）

### P3-B: `src/main.ts` の定数外出し

- [ ] **P3-B-1**: 数値リテラル（`960` / `540` / `800` / `'#5c94fc'`）を `gameConfig` import に置換（design.md §3.2 のスケッチ準拠）
- [ ] **P3-B-2**: `tsc --noEmit` で型エラーなしを確認

### P3-C: `src/scenes/BootScene.ts` 改修

- [ ] **P3-C-1**: `generateTexture` の寸法・色を `gameConfig` 参照に置換（design.md §3.1.3）
  - プレイヤー: `PLAYER_SPRITE_W × PLAYER_SPRITE_H`、色 `0xff3b30`、キー `TEX_KEY.player`
  - 地面: `TILE_SIZE × TILE_SIZE`（**現状は `64×32` だが `TILE_SIZE=32` 統一に変更**）、色 `0x8b4513`、キー `TEX_KEY.ground`
  - ゴール: `GOAL_SPRITE_W × GOAL_SPRITE_H`、色 `0xffd700`、キー `TEX_KEY.goal`（**新規追加**）
- [ ] **P3-C-2**: マジックナンバー（`32`, `48`, `64`）が残っていないか `grep` で確認

### P3-D: `src/scenes/GameScene.ts` 拡張

- [ ] **P3-D-1**: ローカル定数 `PLAYER_SPEED` / `JUMP_VELOCITY` を削除、`gameConfig` import に置換
- [ ] **P3-D-2**: `buildStage(def: StageDefinition)` ヘルパ実装（design.md §3.1.4 / §4.2）
  - assertion: `tiles.length === rows` / 各行長さ === `cols` / `'P'` 個数 === 1 / `'G'` 個数 === 1 / `'P'` が左 1/3 以内
  - 走査: `'#'` を `staticGroup` で地面 sprite、`'P'` をスポーン座標として保持、`'G'` を Overlap 用透明寄り sprite として配置
  - 戻り値: `{ ground: Phaser.Physics.Arcade.StaticGroup, spawnX: number, spawnY: number, goal: Phaser.Physics.Arcade.Sprite }`
- [ ] **P3-D-3**: `create()` で `buildStage(STAGE_01)` 呼び出しに置換（既存の `for (let x = 0; x < 960; x += 64)` 削除）
- [ ] **P3-D-4**: カメラ・ワールド境界設定（design.md §3.1.4 設計上の重要点）
  - `this.physics.world.setBounds(0, 0, cols * TILE_SIZE, rows * TILE_SIZE)`
  - `this.cameras.main.setBounds(0, 0, cols * TILE_SIZE, rows * TILE_SIZE)`
  - `this.cameras.main.startFollow(this.player, true, 0.1, 0.1)`
- [ ] **P3-D-5**: ゴール Overlap 登録 — `this.physics.add.overlap(this.player, goal, this.onGoalHit, undefined, this)`
- [ ] **P3-D-6**: 落下リスポーン — `update()` で `this.player.y > FALL_THRESHOLD_Y` なら `this.respawn()`
- [ ] **P3-D-7**: クリア表示・操作無効化
  - `isCleared: boolean` フィールド追加
  - `onGoalHit()`: `isCleared = true`、`setVelocity(0, 0)`、画面中央に「クリア！」「R で最初から」を `setScrollFactor(0)` で表示
  - `update()` 冒頭で `isCleared` なら左右・ジャンプ入力を無視
- [ ] **P3-D-8**: R キーリスタート — `addKey('R')` + `Phaser.Input.Keyboard.JustDown` で `this.scene.restart()`
- [ ] **P3-D-9**: 操作説明テキストに「R: リスタート」を追記（design.md §10.2 Q9 採用方針）

### P3-E: テスト・ビルド検証

- [ ] **P3-E-1**: `npm run typecheck`（= `tsc --noEmit`）通過
- [ ] **P3-E-2**: `npm run build` 成功 — バンドルサイズ確認（< 1.5 MB 目安、design.md §9.2）
- [ ] **P3-E-3**: `npm run dev` でローカル起動 → ブラウザで動作確認（手動の golden path: 起動 → 移動 → ジャンプ → ゴール → R）
- [ ] **P3-E-4**: ハードコード grep 確認 — `grep -nE "(\\b200\\b|-450|\\b800\\b|\\b960\\b)" src/scenes/*.ts src/main.ts` が0 件（数値の出処は全て `gameConfig`）

### P3-F: 担当判断

- Scene 実装はフロントの中核ロジック。**エンバペ（frontend-engineer）に委譲**を検討するが、design.md が詳細すぎる + 規模が小さい（〜200 行程度）ため、**モドリッチ直接実装**で進める。実装中に詰まったら都度エンバペに相談する

---

## P4: 統合確認 + 性能測定 + Pages デプロイ確認

### P4-A: 機能テスト（受け入れ条件 §7 対応）

- [ ] **P4-A-1**: ローカル `npm run dev` で「ゴールデンパス」を **3 回** 動作確認 — 起動 → 移動 → 段差越え → 隙間ジャンプ → ゴール → クリア表示 → R リスタート
- [ ] **P4-A-2**: 隙間落下 → 即時リスポーン（< 1 秒）を確認（受入条件「3 秒以内」を余裕で達成）
- [ ] **P4-A-3**: クリア表示中に左右・ジャンプキーを押しても動かないこと、R で再プレイ可能なことを確認
- [ ] **P4-A-4**: プレイ中の R キー（クリア前）でも `scene.restart()` が動作することを確認
- [ ] **P4-A-5**: カメラがプレイヤーを横追従することを目視 + DevTools コンソールで `this.cameras.main.scrollX` 増加を確認

### P4-B: 性能測定

- [ ] **P4-B-1**: Chrome DevTools Performance タブで 5 秒間記録 → 平均 60 fps 維持を確認（design.md §9.2）
- [ ] **P4-B-2**: DevTools Network `Disable cache` ON で初回ロード時間 < 5 秒 を確認（ローカル `npm run preview` で測定、Pages 上での再測定は P4-D で）
- [ ] **P4-B-3**: バンドルサイズ確認 — `npm run build` 後の `dist/assets/*.js` が < 1.5 MB

### P4-C: エラーケース

- [ ] **P4-C-1**: ステージ定義に意図的に不正値（`'P'` を 2 個）を入れて起動 → assertion で `throw` することを確認、その後元に戻す
- [ ] **P4-C-2**: 連続でゴールに突入 → R 押下を 3 回繰り返し、状態漏れ（クリアテキスト残存・操作不能化）が発生しないことを確認

### P4-D: Pages デプロイ確認（**本スプリント初通し**）

- [ ] **P4-D-1**: `git push` 前に `.github/workflows/deploy.yml` の動作内容を Read で再確認
- [ ] **P4-D-2**: コミット → push 後、GitHub Actions の `deploy` ワークフローが成功することを確認（`gh run list` / `gh run view`）
- [ ] **P4-D-3**: Pages の URL（`https://<owner>.github.io/mario-game/`）を開き、ローカルと同じ挙動を確認
- [ ] **P4-D-4**: Pages 上で初回ロード時間 < 5 秒、60 fps 維持を再確認

### P4-E: 計測まとめ

- [ ] **P4-E-1**: 結果を `.steering/20260504-minimum-playable/perf-report.md` に簡潔に記録
  - Before（初期スキャフォールド: 1 画面・スクロールなし）→ After（v0.1: 横スクロール 1 ステージ踏破可）
  - fps / 初回ロード / バンドルサイズの実測値
- [ ] **P4-E-2**: 計測結果を報告
  - KPI 目標を達成していれば次フェーズへ自動継続
  - **未達なら止めてシャビに確認**（design.md §9.3 のフォールバック案を提示）

---

## P5: クルトワ（security-engineer）レビュー + コミット

- [ ] **P5-1**: 変更ファイルすべてのセキュリティレビューをクルトワに依頼（**`opus` モデルで起動** — CLAUDE.md ルール）
  - 観点（CLAUDE.md「ハードコーディング検出」より）:
    - URL / エンドポイント / WebSocket URL のハードコーディング有無 → 本スプリントでは外部通信なしを再確認
    - シークレット / キー / トークン / パスワードのハードコーディング有無 → 本スプリントでは発生しない想定だが要再確認
    - AWS アカウント情報のハードコーディング有無 → 本プロジェクトは AWS 不使用、念のため確認
    - ドキュメント内の機密情報 → CLAUDE.md / README.md / .steering / docs に実 URL や鍵がないか
  - 観点（一般）:
    - CSP の妥当性（`index.html` の `<meta>` 設定）
    - GitHub Pages のデフォルト設定への依存ポイント
    - 入力サニタイズ（キーボード入力のみだが念のため）
    - XSS（Phaser Text 表示時、ステージ ID やテキストにユーザー入力混入なし確認）
    - ステージ定義 assertion の漏れ
- [ ] **P5-2**: 指摘事項を確認
  - Critical / High なし → 自動で次のタスクへ進む
  - **Critical / High あり → 止めてシャビに確認**（修正方針の合意）
- [ ] **P5-3**: 指摘修正（あれば）
- [ ] **P5-4**: シャビへレビュー結果報告 → コミット承認取得（CLAUDE.md「コミット前のセキュリティレビュー」必須ルールに従い、コミット前は必ず止まる）
- [ ] **P5-5**: コミット作成（メッセージ規約は `docs/development-guidelines.md` の Git 規約を参照、ただし v0.1 では当ファイル未整備のため一般的な Conventional Commits を採用: `feat: implement minimum playable v0.1 (stage scroll, goal, restart)`）

---

## P6: ドキュメント更新

> 実装完了 + 動作確認後にまとめて更新。Q5 採用方針（**案 A: 2 本のみ薄く**）に従う。

- [ ] **P6-1**: `docs/architecture.md` を新規作成（`docs/template/architecture.md` を雛形に。各章 2〜3 行の薄さで、design.md §10.2 Q10 方針）
  - 含める内容: 技術スタック（TS / Vite / Phaser 3）、通信経路（ブラウザ単体・バックエンドなし）、パフォーマンス要件（60 fps / < 5s / < 100ms）、セキュリティ方針（CSP・外部通信なし）
- [ ] **P6-2**: `docs/repository-structure.md` を新規作成（`docs/template/repository-structure.md` を雛形に）
  - 含める内容: `src/main.ts` / `src/scenes/` / `src/config/` / `src/stages/` / `index.html` / `vite.config.ts` / `.github/workflows/` の責務一行記述
- [ ] **P6-3**: `docs/functional-design.md` — **本スプリントでは作成しない**（v0.2 以降に送る、Q5 案 A 方針）
- [ ] **P6-4**: `docs/development-guidelines.md` — **本スプリントでは作成しない**（v0.2 以降に送る）
- [ ] **P6-5**: `docs/glossary.md` / `docs/product-requirements.md` — **本スプリントでは作成しない**（v0.2 以降に送る）
- [ ] **P6-6**: `README.md` のクイックスタート以降に「v0.1 で遊べる範囲」「操作方法（←/→/Space/↑/R）」を 5〜10 行追記
- [ ] **P6-7**: 作成した永続的ドキュメントもクルトワレビュー対象（CLAUDE.md ルール: ドキュメント内機密情報チェック）→ P5 のレビューに含めるか、P6 完了後に追加レビューを実施

---

## 横断タスク（全フェーズ共通、CLAUDE.md ルール）

- [ ] **X-1**: 各タスク着手前に対象ファイルの最新状態を `Read` で確認（セッション引き継ぎ時の作業原則）
- [ ] **X-2**: 変更後は必ず `npm run typecheck` + `npm run build` でビルド・型検証
- [ ] **X-3**: 重要な発見・ハマりどころは即座に `.steering/20260504-minimum-playable/decisions.md` に記録（恒久化が必要なら P6 で `docs/development-guidelines.md` への反映を検討、ただし当該ファイルは本スプリントで作らないため v0.2 に持ち越し）
- [ ] **X-4**: コミット前にクルトワへセキュリティレビュー依頼（CLAUDE.md 必須ルール）
- [ ] **X-5**: 完了報告は出すが、それで作業を止めない。**判断・確認が必要な事項が発生したときのみ作業を止めてシャビに確認**

---

## 進捗マイルストーン

| マイルストーン | 完了条件 |
|--------------|--------|
| **M1: PoC 通過** | スキップ（P1 不要） |
| **M2: 共通基盤完成** | P2 完了 — `gameConfig.ts` / `stage01.ts` が存在、`tsc --noEmit` 通過 |
| **M3: ローカル統合動作** | P3 + P4-A 完了 — ローカルでゴールデンパスが 3 回連続成功 |
| **M4: 性能目標達成** | P4-B + P4-D 完了 — Pages 上で 60 fps / < 5s / < 1.5MB を実測達成 |
| **M5: コミット完了** | P5 完了 — クルトワレビュー合格 + コミット作成 |
| **M6: スプリント完了** | P6 完了 — `docs/architecture.md` + `docs/repository-structure.md` + `README.md` 追記済み |

---

## 残る未確定事項（実装中に発生したらシャビ判断）

| # | 項目 | トリガ |
|---|------|------|
| Q6 | ステージ寸法最終値（`cols`, `rows`） | プレイテストで「短すぎ / 長すぎ」と感じた場合。初期 `cols=120, rows=17`、±20% 調整は実装中許容 |
| Q7 | カメラ lerp パラメータ | 追従が硬すぎ / 緩すぎる場合。初期 `(0.1, 0.1)` |
| Q8 | クリアテキストのフォントサイズ・配色 | 視認性に問題があった場合。初期 `48px / #ffffff / 黒縁取り` |
| Q9 | 操作説明テキストの表示内容 | 「R: リスタート」を最初から表示（採用済）/ クリア後のみ。初期は **両方表示** |
| Q10 | `docs/` 2 本の章立て深さ | テンプレ全章 vs 最低限のみ。初期方針: **テンプレ全章だが各章 2〜3 行の薄さ** |
| Q11 | コミット粒度 | 1 コミット（feat: implement v0.1）か、Phase ごとに分割か。初期方針: **1 コミットで一括**（初回スプリントのため動線確認優先）。Phase 分割が必要ならシャビ判断 |

---

作成: モドリッチ / 2026-05-04

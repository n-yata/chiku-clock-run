# タスクリスト: スマホ操作改善 & レスポンシブ対応

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-04 |
| 担当 | モドリッチ |
| 関連設計 | `.steering/20260504-mobile-controls-responsive/design.md` |
| 関連要求 | `.steering/20260504-mobile-controls-responsive/requirements.md` |

---

## 進め方の原則

- **定数変更 → GameScene 実装 → index.html → ビルド検証 → セキュリティレビュー → コミット → ドキュメント更新**
- 各タスクは [ ] 未着手 / [WIP] 進行中 / [x] 完了 で管理
- ハードコード禁止（定数はすべて `src/config/gameConfig.ts` に集約）
- コミット前は **必ずクルトワ（security-engineer）レビュー**（CLAUDE.md ルール準拠）
- **各フェーズは完了次第、止まらずに次のフェーズへ進む**
- **作業を止めるのは、シャビの判断・確認が必要な事項が発生したときだけ**

---

## P1: 定数変更（`src/config/gameConfig.ts`）

- [ ] **P1-1**: `TOUCH_HOLD_MS` を削除する
- [ ] **P1-2**: 以下の定数を追加する（design.md §3.2）
  - `TOUCH_SLIDE_THRESHOLD_PX = 12`
  - `TOUCH_ZONE_SPLIT_RATIO = 0.5`
- [ ] **P1-3**: 型チェック通過確認（`npm run typecheck`）
  - `TOUCH_HOLD_MS` を参照していた `GameScene.ts` のコンパイルエラーを確認し、P2 で解消することを確認する

---

## P2: GameScene.ts — タッチ操作ロジック刷新

### P2-A: 状態変数の変更（design.md §3.3）

- [ ] **P2-A-1**: 以下の状態変数を **削除** する
  - `touchHoldTriggered: boolean`
  - `touchHoldTimer?: Phaser.Time.TimerEvent`
  - `touchPointerSide: TouchSide`
  - 型エイリアス `type TouchSide = 'left' | 'right' | null`
- [ ] **P2-A-2**: 以下の状態変数を **追加** する
  - `jumpPointerId: number | null`
  - `movePointerId: number | null`
  - `touchMoveBaseX: number | null`
- [ ] **P2-A-3**: `create()` 内の初期化コードを新変数に合わせて更新する（削除変数を除去・追加変数を null 初期化）

### P2-B: `setupTouchControls()` の変更（design.md §3.4.1）

- [ ] **P2-B-1**: `this.input.addPointer(2)` を `create()` 末尾・`setupTouchControls()` 呼び出し前に追加する（マルチポインタ確保 — 忘れると両手操作が片方しか拾われない）
- [ ] **P2-B-2**: `pointermove` イベントの購読を追加する
  - `this.input.on('pointermove', this.handlePointerMove, this);`

### P2-C: `handlePointerDown()` の刷新（design.md §3.4.2）

- [ ] **P2-C-1**: 長押しタイマー関連コードをすべて削除する（`touchHoldTimer`・`touchHoldTriggered`）
- [ ] **P2-C-2**: ゾーン判定ロジックを実装する
  - `pointer.x < scale.width * TOUCH_ZONE_SPLIT_RATIO` → 左ゾーン（移動）
  - `pointer.x >= scale.width * TOUCH_ZONE_SPLIT_RATIO` → 右ゾーン（ジャンプ）
- [ ] **P2-C-3**: 左ゾーン処理: `movePointerId === null` の場合のみ `movePointerId = pointer.id`・`touchMoveBaseX = pointer.x`・`touchLeft = false`・`touchRight = false` をセット（先勝ちロック）
- [ ] **P2-C-4**: 右ゾーン処理: `jumpPointerId === null` の場合のみ `jumpPointerId = pointer.id`・`touchJumpRequested = true` をセット（先勝ちロック）

### P2-D: `handlePointerMove()` の新規実装（design.md §3.4.3）

- [ ] **P2-D-1**: `handlePointerMove(pointer: Phaser.Input.Pointer): void` を新規実装する
  - `isMissed || isCleared` の場合は早期 return
  - `pointer.id !== movePointerId` の場合は早期 return
  - `touchMoveBaseX === null` の場合は早期 return（安全ガード）
  - `dx = pointer.x - touchMoveBaseX` を計算する
  - `dx > TOUCH_SLIDE_THRESHOLD_PX` → `touchRight = true`・`touchLeft = false`
  - `dx < -TOUCH_SLIDE_THRESHOLD_PX` → `touchLeft = true`・`touchRight = false`
  - しきい値内 → `touchLeft = false`・`touchRight = false`

### P2-E: `handlePointerUp()` の刷新（design.md §3.4.4）

- [ ] **P2-E-1**: 長押し関連コードを削除する（`touchHoldTriggered` チェック・タイマー解除）
- [ ] **P2-E-2**: `pointer.id === jumpPointerId` の場合 → `jumpPointerId = null`
- [ ] **P2-E-3**: `pointer.id === movePointerId` の場合 → `movePointerId = null`・`touchMoveBaseX = null`・`touchLeft = false`・`touchRight = false`
- [ ] **P2-E-4**: `touchJumpRequested` の誤リセット（旧コード）が残っていないことを確認する

### P2-F: インストラクションテキストの更新（design.md §3.5）

- [ ] **P2-F-1**: `create()` 内のインストラクション文言を更新する
  - 旧: `'PC: ←/→ Space/↑ R   スマホ: 画面左右の長押しで移動 / タップでジャンプ'`
  - 新: `'PC: ←/→ Space/↑ R   スマホ: 左スライドで左右移動 / 右タップでジャンプ'`

---

## P3: `index.html` — レスポンシブ対応（design.md §3.6）

- [ ] **P3-1**: `<meta name="viewport">` を更新する
  - `user-scalable=no, minimum-scale=1.0, maximum-scale=1.0` を追加する
- [ ] **P3-2**: `<style>` 内に `#rotate-notice` の CSS を追加する（design.md §3.6.2）
  - `display: none`（既定）、`position: fixed`、`inset: 0`、`z-index: 10`、背景黒・文字白
  - `@media (orientation: portrait)` で `#rotate-notice { display: flex; }` / `#game { visibility: hidden; }`
  - `@media (orientation: landscape)` で `#rotate-notice { display: none; }` / `#game { visibility: visible; }`
- [ ] **P3-3**: `<body>` 内に `<div id="rotate-notice">` を追加する（design.md §3.6.3）
  - テキストはリテラルのみ（`端末を横向きにしてプレイしてください / Please rotate your device.`）
  - CSP への影響なしを確認する

---

## P4: ビルド検証

- [ ] **P4-1**: 型チェック通過（`npm run typecheck`）
  - 削除した変数・型への参照が残っていないことを確認する
- [ ] **P4-2**: 本番ビルド成功（`npm run build`）
  - バンドルサイズが前バージョン（1,490 kB）から大幅増加していないことを確認する

---

## P5: クルトワ（security-engineer）レビュー + コミット

- [ ] **P5-1**: 変更ファイル（`src/config/gameConfig.ts` / `src/scenes/GameScene.ts` / `index.html`）のセキュリティレビューをクルトワに依頼する
  - XSS・インジェクション・CSP 整合性・ハードコーディング検出を必ず含める
- [ ] **P5-2**: 指摘事項を確認する
  - Critical / High なし → 次タスクへ進む
  - **Critical / High あり → 止めてシャビに確認**（修正方針の合意）
- [ ] **P5-3**: 指摘修正（あれば）
- [ ] **P5-4**: シャビへレビュー結果を報告してコミット承認を取得する（CLAUDE.md 必須ルール）
- [ ] **P5-5**: コミット作成

---

## P6: ドキュメント更新

- [ ] **P6-1**: `docs/architecture.md` の入力仕様欄を新ゾーンモデルに更新する（design.md §8.2）
  - 「タッチ操作: 左ジャンプゾーン / 右スライド移動ゾーン、マルチポインタ対応」を記載する
- [ ] **P6-2**: `docs/glossary.md`（存在する場合）に「ジャンプゾーン」「移動ゾーン」「スライドしきい値」を追加する（任意）

---

## 横断タスク（全フェーズ共通）

- [ ] **X-1**: 各タスク着手前に対象ファイルの最新状態を Read で確認する（セッション引き継ぎ時の作業原則）
- [ ] **X-2**: P4 ビルド後は必ず `npm run typecheck` / `npm run build` で確認する
- [ ] **X-3**: 重要な発見・ハマりどころは即座に `decisions.md` に記録する

---

## 進捗マイルストーン

| マイルストーン | 完了条件 |
|--------------|--------|
| **M1: 定数変更完了** | `TOUCH_HOLD_MS` 削除・新定数追加・型チェック通過 |
| **M2: 実装完了** | GameScene.ts / index.html の全変更完了 |
| **M3: ビルド通過** | `npm run typecheck` / `npm run build` 成功 |
| **M4: セキュリティ合格** | クルトワ Critical/High なし |
| **M5: コミット完了** | シャビ承認 → コミット作成 |
| **M6: スプリント完了** | docs 更新・シャビ動作確認完了 |

---

## 残る未確定事項

| # | 項目 | トリガ |
|---|------|------|
| Q1 | `TOUCH_SLIDE_THRESHOLD_PX = 12` の体感調整 | GitHub Pages 実機検証でスライドが過敏 / 鈍感と判断した場合 |

---

作成: モドリッチ / 2026-05-04

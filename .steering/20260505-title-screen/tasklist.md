# タスクリスト: タイトル画面の追加

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-05 |
| 担当 | モドリッチ |
| 関連設計 | `.steering/20260505-title-screen/design.md` |
| 関連要求 | `.steering/20260505-title-screen/requirements.md` |

---

## 進め方の原則

- **定数追加（gameConfig） → TitleScene 新規 → 既存シーン改修 → ビルド検証 → クルトワレビュー → コミット → ドキュメント更新**
- 各タスクは [ ] 未着手 / [WIP] 進行中 / [x] 完了 で管理
- ハードコード禁止（タイトル文言・点滅周期・遷移待ち時間はすべて `gameConfig.ts` に集約）
- コミット前は **必ずクルトワ（security-engineer）レビュー**（CLAUDE.md ルール準拠）
- **各 Phase は完了次第、止まらずに次の Phase へ進む**
- **作業を止めるのは、シャビの判断・確認が必要な事項が発生したときだけ**

---

## P2: 定数追加（gameConfig.ts）

- [ ] **P2-1**: `src/config/gameConfig.ts` 末尾に `// --- v0.5: タイトル画面 ---` セクションを追加（design.md §4）
  - `GAME_TITLE = 'MARIO-LIKE GAME'`
  - `TITLE_FONT_FAMILY`, `TITLE_FONT_SIZE`, `TITLE_FONT_COLOR`
  - `TITLE_STROKE_COLOR`, `TITLE_STROKE_THICKNESS`
  - `TITLE_PROMPT_TEXT`, `TITLE_PROMPT_FONT_SIZE`, `TITLE_PROMPT_OFFSET_Y`, `TITLE_PROMPT_BLINK_MS`
  - `ALL_CLEAR_TO_TITLE_DELAY_MS`

---

## P3: フロントエンド実装

### P3-A: TitleScene 新規作成

- [ ] **P3-A-1**: `src/scenes/TitleScene.ts` を新規作成（design.md §3.1 の skeleton 準拠）
  - `create()`: 背景色・zoom リセット・テキスト 2 つ生成・点滅 Tween・入力リスナ登録・resize リスナ登録
  - `layout()`: `this.scale.width/2`, `this.scale.height/2` 基準の冪等な配置関数
  - `startGame()`: `isStarting` フラグで多重発火防止 → `scene.start('GameScene', { stageIndex: 0 })`
  - `onShutdown()`: resize リスナ off・Tween stop

### P3-B: main.ts 変更

- [ ] **P3-B-1**: `src/main.ts` に `TitleScene` を import し、`scene` 配列を `[BootScene, TitleScene, GameScene]` に変更

### P3-C: BootScene 変更

- [ ] **P3-C-1**: `src/scenes/BootScene.ts` の `create()` を確認・変更
  - `sessionStorage` キー未セット時の遷移先を `GameScene` → `TitleScene` に変更
  - キーセット時（リロードフォールバック）は `GameScene` 直行を維持

### P3-D: GameScene 変更

- [ ] **P3-D-1**: `src/scenes/GameScene.ts` の全クリア後処理を変更
  - `showAllClear()` のテキスト文言を「タイトルへ戻ります...」に変更
  - `time.delayedCall(ALL_CLEAR_TO_TITLE_DELAY_MS, () => this.scene.start('TitleScene'))` を追加（自動遷移）
- [ ] **P3-D-2**: `restartFromTop()` の遷移先を変更
  - `scene.restart({ stageIndex: 0 })` → `scene.start('TitleScene')` に変更（R キー手動リスタートもタイトル経由に統一）

### P3-E: ビルド検証

- [ ] **P3-E-1**: `tsc --noEmit` で型エラーがないことを確認
- [ ] **P3-E-2**: `npm run build` が成功し、バンドルサイズが要件（1.5 MB 以下）を満たすことを確認

---

## P4: 統合テスト（受け入れ条件 §7 対応）

- [ ] **P4-1**: ビルド成果物を手元で確認 — URL アクセス → `BootScene` → `TitleScene` 表示を確認
- [ ] **P4-2**: タイトルテキストとプロンプトが画面中央に表示されることを確認
- [ ] **P4-3**: プロンプトが点滅（約 1 秒周期）することを確認
- [ ] **P4-4**: Space / Enter キーで `GameScene`（ステージ 1）に遷移することを確認
- [ ] **P4-5**: ウィンドウリサイズ時にレイアウトが中央を維持することを確認
- [ ] **P4-6**: ステージ 3 クリア後に `TitleScene` に自動遷移することを確認（2.5 秒待機）
- [ ] **P4-7**: R キー押下でタイトルに戻ることを確認
- [ ] **P4-8**: 既存ゲームプレイ（敵・コイン・ステージ進行・BGM/SE）が正常に動作することを確認

---

## P5: クルトワ（security-engineer）レビュー + コミット

- [ ] **P5-1**: 変更ファイル全てのセキュリティレビューをクルトワに依頼
  - 対象: `TitleScene.ts`（新規）、`main.ts`、`BootScene.ts`、`GameScene.ts`、`gameConfig.ts`
  - 確認観点: XSS（`add.text` への外部入力混入なし）、ハードコーディング検出、CSP 互換性
- [ ] **P5-2**: 指摘事項を確認
  - Critical / High なし → 次のタスクへ自動継続
  - **Critical / High あり → 止めてシャビに確認**
- [ ] **P5-3**: 指摘修正（あれば）
- [ ] **P5-4**: シャビへレビュー結果報告 → **コミット承認取得**（必ず止まる）
- [ ] **P5-5**: コミット作成・GitHub Pages へ push

---

## P6: ドキュメント更新

- [ ] **P6-1**: `docs/functional-design.md` のシーン遷移図を更新（`BootScene → TitleScene → GameScene` フローを追記）
- [ ] **P6-2**: `docs/repository-structure.md` に `src/scenes/TitleScene.ts` を追記
- [ ] **P6-3**: `docs/product-requirements.md` の F-013（タイトル画面）を「完了」に更新

---

## 横断タスク（全フェーズ共通、CLAUDE.md ルール）

- [ ] **X-1**: 各タスク着手前に対象ファイルの最新状態を `Read` で確認（セッション引き継ぎ時の作業原則）
- [ ] **X-2**: 変更後は必ず `tsc --noEmit` + `npm run build` で検証
- [ ] **X-3**: 重要な発見・ハマりどころは即座に `decisions.md` に記録
- [ ] **X-4**: コミット前にクルトワへセキュリティレビュー依頼（CLAUDE.md 必須ルール）

---

## 進捗マイルストーン

| マイルストーン | 完了条件 |
|--------------|--------|
| **M1: 定数追加完了** | `gameConfig.ts` に `TITLE_*` 定数 + `ALL_CLEAR_TO_TITLE_DELAY_MS` が追加されビルド通過 |
| **M2: TitleScene 動作** | `TitleScene` が表示され、Space/Enter/Tap でゲームに遷移できる |
| **M3: 統合動作確認** | ステージ 3 クリア後にタイトルへ戻り、全受け入れ条件を満たす |
| **M4: コミット完了** | クルトワレビュー通過・シャビ承認・コミット・push 完了 |
| **M5: スプリント完了** | ドキュメント更新完了 |

---

## 残る未確定事項（実装中に発生したらシャビ判断）

| # | 項目 | トリガ |
|---|------|------|
| Q3 | `GAME_TITLE` の正式文言 | 仮値 `'MARIO-LIKE GAME'` で実装。変更したい場合は定数値のみ更新 |
| Q5 | `ALL_CLEAR_TO_TITLE_DELAY_MS` の最適値 | 実機プレイで「長すぎ/短すぎ」と感じた場合に `gameConfig.ts` の値を調整 |

---

作成: モドリッチ / 2026-05-05

# タスクリスト: add-stages

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-05 |
| 担当 | モドリッチ |
| 関連設計 | `.steering/20260505-add-stages/design.md` |
| 関連要求 | `.steering/20260505-add-stages/requirements.md` |

---

## 進め方の原則

- **定数追加 → ステージデータ → index → GameScene 改修 → BootScene → 統合検証 → レビュー → コミット**
- 各タスクは [ ] 未着手 / [WIP] 進行中 / [x] 完了 で管理
- ハードコード禁止: 遷移ウェイト・フェード時間等は `gameConfig.ts` に集約
- コミット前は **必ずクルトワ（security-engineer）レビュー**（CLAUDE.md ルール準拠）
- 各 Phase は完了次第、止まらずに次の Phase へ進む
- **作業を止めるのは**、床貫通バグの再発 / クルトワ Critical+High 指摘 / 想定外の制約が発覚したとき**のみ**

---

## P1: ステージデータ整備

### P1-A: gameConfig.ts に定数追加

- [ ] **P1-A-1**: `src/config/gameConfig.ts` に以下 6 定数を追記（design.md §3.4）
  - `STAGE_CLEAR_DELAY_MS = 1200`（クリア表示からフェードアウト開始までのウェイト）
  - `STAGE_FADE_MS = 600`（カメラフェードイン/アウト時間）
  - `USE_HARD_RELOAD_FALLBACK = false`（床貫通再発時のトグル）
  - `STAGE_INDEX_STORAGE_KEY = 'mario-game.stageIndex'`（sessionStorage キー）
  - `HUD_STAGE_Y = 16`（STAGE HUD の Y 座標）
  - `HUD_STAGE_LABEL = 'STAGE'`

### P1-B: ステージファイル新規作成

- [ ] **P1-B-1**: `src/stages/stage02.ts` を作成（design.md §3.2）
  - cols=140, rows=17, スポーン col=2 row=15, ゴール col=137 row=14
  - 隙間 3 箇所, 空中足場 2 箇所, 敵 5 体（全員真下 `#` 必須）, コイン 18 枚
  - 完了条件: `npm run build` 成功、`buildStage()` バリデーション通過
- [ ] **P1-B-2**: `src/stages/stage03.ts` を作成（design.md §3.2）
  - cols=160, rows=17, スポーン col=2 row=15, ゴール col=157 row=14
  - 隙間 4 箇所, 長い空中足場 3 箇所, 敵 8 体（全員真下 `#` 必須）, コイン 22 枚
  - 完了条件: `npm run build` 成功、`buildStage()` バリデーション通過

### P1-C: ステージ集約 index.ts 作成

- [ ] **P1-C-1**: `src/stages/index.ts` を新規作成（design.md §3.1）
  - `STAGES: ReadonlyArray<StageDefinition>` を export
  - `getStage(index)` — 範囲外は 0 にクランプし `console.warn`
  - `nextStageIndex(current)` — 最終面は `null` を返す
  - `StageDefinition` 型の再エクスポート
  - 完了条件: `npm run build` 成功

---

## P2: GameScene 改修

### P2-A: データ駆動化（init + create）

- [ ] **P2-A-1**: `GameScene` に `private stageIndex = 0` / `private stage!: StageDefinition` フィールドを追加
- [ ] **P2-A-2**: `init(data: { stageIndex?: number })` メソッドを新設
  - `getStage(data?.stageIndex ?? 0)` で `this.stage` / `this.stageIndex` をセット（design.md §3.3.1）
- [ ] **P2-A-3**: `create()` の `const stage = STAGE_01` を `const stage = this.stage` に置換
- [ ] **P2-A-4**: `create()` 末尾に STAGE HUD 用 Text を追加（"STAGE n / N"、`HUD_STAGE_Y` 位置、`setScrollFactor(0)`）
- [ ] **P2-A-5**: `create()` 末尾に `cameras.main.fadeIn(STAGE_FADE_MS)` を追加（ステージ開始時のフェードイン）

### P2-B: ゴール後の遷移制御

- [ ] **P2-B-1**: `teardownPhysics()` を新設（design.md §3.3.4）
  - `this.physics.world.colliders.destroy()`
  - `this.coins.clear(true, true)`
  - `this.enemies.clear(true, true)`
- [ ] **P2-B-2**: `transitionToStage(index)` を新設（design.md §3.3.4）
  - `USE_HARD_RELOAD_FALLBACK` が `true` の場合: `sessionStorage.setItem` → `window.location.reload()`
  - `false` の場合: `teardownPhysics()` → `scene.restart({ stageIndex: index })`
- [ ] **P2-B-3**: `onGoalHit` を改修（design.md §3.3.3）
  - `nextStageIndex(this.stageIndex)` で次ステージ番号を取得
  - 次ステージあり: "STAGE n CLEAR!" を表示 → `STAGE_CLEAR_DELAY_MS` 待機 → `cameras.main.fadeOut(STAGE_FADE_MS)` → `camerafadeoutcomplete` イベントで `transitionToStage(next)` 呼び出し
  - セーフティタイマー: `STAGE_FADE_MS + 200ms` 後に強制遷移（カメライベント不発時の保険）
  - 次ステージなし（最終面）: `showAllClear()` を呼ぶ（R / タップで `restartFromTop()`）

### P2-C: ALL CLEAR 表示 + ミス / リスタート改修

- [ ] **P2-C-1**: `showStageClear()` を新設（"STAGE n CLEAR!" テキスト表示）
- [ ] **P2-C-2**: `showAllClear()` を新設
  - "ALL CLEAR！" テキスト表示（`setScrollFactor(0)`）
  - `isCleared = true` のまま待機（R / タップ → `restartFromTop()`）
- [ ] **P2-C-3**: `restartFromTop()` を新設
  - `teardownPhysics()` → `scene.restart({ stageIndex: 0 })`
- [ ] **P2-C-4**: `fullRestart()` を改修（design.md §3.3.5）
  - `teardownPhysics()` を事前に呼び出し
  - `USE_HARD_RELOAD_FALLBACK` が `true` の場合: `sessionStorage.setItem(STAGE_INDEX_STORAGE_KEY, this.stageIndex)` → `reload()`
  - `false` の場合: `scene.restart({ stageIndex: this.stageIndex })`
- [ ] **P2-C-5**: `handlePointerDown` の `isCleared` 分岐を改修
  - `isCleared` 状態のタップが `fullRestart()` でなく `restartFromTop()` を呼ぶよう変更（ALL CLEAR 後は stage1 に戻る）
  - ただし ALL CLEAR 前（通常クリア待機中）はタップを無視する設計にする（遷移は自動タイマーで行うため）

---

## P3: BootScene 改修

- [ ] **P3-1**: `BootScene.create()` に `sessionStorage` 読み出し処理を追加（design.md §3.3.4）
  - `try/catch` で囲む（プライベートブラウジング等で `sessionStorage` 利用不可な場合に備える）
  - 取得値を `Number.parseInt` + 範囲チェック後に `scene.start('GameScene', { stageIndex: N })` へ渡す
  - 読み出し後は `sessionStorage.removeItem(STAGE_INDEX_STORAGE_KEY)` でキーを削除

---

## P4: 統合検証

### P4-A: ビルド確認

- [ ] **P4-A-1**: `npm run build` が成功し、TypeScript エラーなし

### P4-B: ゴールデンパス検証（手動）

- [ ] **P4-B-1**: stage1 ゴール到達 → 自動でフェードアウト → stage2 が開始 → HUD が "STAGE 2 / 3" になる
- [ ] **P4-B-2**: stage2 ゴール到達 → stage3 に遷移 → HUD が "STAGE 3 / 3" になる
- [ ] **P4-B-3**: stage3 ゴール到達 → "ALL CLEAR！" 表示 → R 押下 で stage1 が再スタート → HUD が "STAGE 1 / 3" になる

### P4-C: ミス・リスタート検証（手動）

- [ ] **P4-C-1**: stage2 でコイン数枚取得後ミス → stage2 が再起動 → HUD コインが `0 / 18` に戻る
- [ ] **P4-C-2**: stage1 でコイン取得後ゴール → stage2 開始時 HUD コインが `0 / 18` になる（ステージ間リセット確認）

### P4-D: 床貫通バグ検証（design.md §3.5 Phase 1 判定）

- [ ] **P4-D-1**: stage1 で連続 5 回ミス → 各再起動後に床に正常に立てること（貫通なし）
- [ ] **P4-D-2**: stage1 → 2 → 3 を 3 周連続クリア → 各ステージ開始後に床に正常に立てること
- **床貫通が 1 回でも再発した場合は作業を止めてシャビに確認**。`USE_HARD_RELOAD_FALLBACK = true` 切り替えの判断を仰ぐ

### P4-E: パフォーマンス検証（手動）

- [ ] **P4-E-1**: stage3（cols=160, 敵 8 体）で 30 秒プレイ → Chrome DevTools Performance で平均 FPS ≥ 58 を確認

### P4-F: BGM / SE 検証（手動）

- [ ] **P4-F-1**: 全ステージで BGM ループ / コイン SE / ジャンプ SE / ゴール SE / ミス SE が正常に再生される
- [ ] **P4-F-2**: ステージ遷移時に BGM が一旦停止し、次ステージ開始後に再開する

---

## P5: クルトワ（security-engineer）レビュー + コミット

- [ ] **P5-1**: 変更ファイルすべてのセキュリティレビューをクルトワに依頼
  - 対象: `gameConfig.ts` / `GameScene.ts` / `BootScene.ts` / `stages/index.ts` / `stages/stage02.ts` / `stages/stage03.ts`
  - 観点: ハードコーディング（URL / シークレット）なし確認、`sessionStorage` の読み書きが数値のみであること、XSS 余地なし
- [ ] **P5-2**: 指摘確認
  - Critical / High なし → 次へ
  - **Critical / High あり → 止めてシャビに確認**
- [ ] **P5-3**: 指摘修正（あれば）
- [ ] **P5-4**: シャビへレビュー結果報告 → コミット承認取得
- [ ] **P5-5**: コミット作成

---

## P6: ドキュメント更新

- [ ] **P6-1**: `docs/product-requirements.md` の F-012「複数ステージ」ステータスを Could → 実装済みに更新
- [ ] **P6-2**: `docs/repository-structure.md` に `src/stages/index.ts` / `stage02.ts` / `stage03.ts` を追記
- [ ] **P6-3**: `decisions.md` に Phase 1 / Phase 2 の判定結果（床貫通の再発有無）を記録

---

## 横断タスク

- [ ] **X-1**: 各タスク着手前に対象ファイルの最新状態を `Read` で確認
- [ ] **X-2**: 実装後は `npm run build` で型チェック・ビルド成功を確認
- [ ] **X-3**: 床貫通 Phase 判定・予期しない発見は即座に `decisions.md` に記録

---

## 進捗マイルストーン

| マイルストーン | 完了条件 |
|--------------|--------|
| **M1: データ整備完了** | P1 全完了・`npm run build` 成功 |
| **M2: GameScene 改修完了** | P2・P3 全完了・型エラーなし |
| **M3: 統合動作確認** | P4-B / P4-C ゴールデンパス通過 |
| **M4: 床貫通ゼロ確認** | P4-D 通過（Phase 1 判定 OK） |
| **M5: コミット完了** | P5 完了・クルトワ Critical/High なし |
| **M6: スプリント完了** | P6 完了・decisions.md 記録済み |

---

## 残る未確定事項（実装中にシャビ判断が必要になる可能性）

| # | 項目 | トリガ |
|---|------|------|
| Q1 | 床貫通バグが P4-D で再発した場合の方針 | Phase 1（明示破棄）で 1 回でも貫通が再現した時点で止まってシャビに確認 |
| Q2 | stage03 で FPS が 58 を下回った場合の調整 | P4-E で目標未達の場合、敵数削減 / 足場短縮をシャビと協議 |

---

作成: モドリッチ / 2026-05-05

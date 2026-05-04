# タスクリスト: BGM / SE 追加

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-04 |
| 担当 | モドリッチ |
| 関連設計 | `.steering/20260504-bgm-se/design.md` |
| 関連要求 | `.steering/20260504-bgm-se/requirements.md` |

---

## 進め方の原則

- **Phase 構成**: P1 事前検証はスキップ → P2 共通基盤（gameConfig 定数追加 + AudioManager 新規）→ P3 GameScene 統合 → P4 ビルド検証 + Pages デプロイ確認 → P5 クルトワレビュー + コミット → P6 ドキュメント更新
- 各タスクは [ ] 未着手 / [WIP] 進行中 / [x] 完了 で管理
- **ハードコード禁止**: SE パラメータ（周波数・持続時間・波形）・BGM パターン・音量は全て `src/config/gameConfig.ts` に集約。`AudioManager.ts` 内に数値リテラルを置かない
- コミット前は **必ずクルトワ（security-engineer）レビュー**（CLAUDE.md ルール準拠）
- **各 Phase は完了次第、止まらずに次の Phase へ進む**。フェーズ境界での承認待ち停止はしない
- **完了報告は出す**（進捗共有のため）が、それで作業を止めない
- **作業を止めるのは、シャビの判断・確認が必要な事項が発生したときだけ**。例:
  - design.md §3（コンポーネント設計）の構造から外れる対応が必要になった
  - KPI 目標（60 fps / バンドル < 1.5 MB）が未達で方針判断が必要
  - クルトワレビューで Critical / High 指摘あり、修正方針の合意が必要
  - Q5〜Q7（音量・unlock タイミング・タブ非アクティブ）について実機で問題が発覚し、再設計が必要
- dev サーバーは自分から起動しない（auto memory）。動作確認は Pages デプロイ後にシャビが行う。ローカルでは `npm run typecheck` / `npm run build` までで止める

---

## P1: 事前検証

> **スキップ**。Web Audio API はすべての対象ブラウザ（Chrome / Edge / Firefox / Safari 最新版）でサポート済み。`OscillatorNode` + `GainNode` による短命グラフ方式は Phaser 3 プロジェクトで追加依存なしに使用できる標準パターン。バルベルデが design.md §3 で詳細設計を確定済みのため、先行検証なしで P2 から開始する。

---

## P2: 共通基盤（gameConfig.ts + AudioManager.ts）

### P2-A: 環境準備

- [ ] **P2-A-1**: 追加 npm 依存なしを再確認（`package.json` の `dependencies` は Phaser 3 のまま）。`.env` への追加変数も**なし**（音声パラメータは `gameConfig.ts` のコンパイル時定数として管理）
- [ ] **P2-A-2**: 着手前に対象ファイルを Read で確認（`src/config/gameConfig.ts`, `src/scenes/GameScene.ts`, `src/scenes/BootScene.ts`）— セッション引き継ぎ時の作業原則

### P2-B: `src/config/gameConfig.ts` 末尾追記

- [ ] **P2-B-1**: 以下の型定義を末尾に追加（design.md §3.3）
  - `SeWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle'`
  - `SeStep` インターフェース（`freqStart`, `freqEnd`, `durationSec`, `attackSec`, `peakGain`, `waveform`, `offsetSec`）
  - `SeDefinition` インターフェース（`steps: ReadonlyArray<SeStep>`）
- [ ] **P2-B-2**: 音量定数を追加（`AUDIO_MASTER_GAIN = 0.5`, `AUDIO_BGM_GAIN = 0.6`）
- [ ] **P2-B-3**: `SE_PARAMS` を追加（`jump` / `coin` / `stomp` / `miss` / `goal` の 5 種、design.md §3.3 の値通り）
- [ ] **P2-B-4**: BGM 定数を追加（`BGM_STEP_MS = 125`, `BGM_NOTE_DURATION_MS = 100`, `BGM_NOTE_PEAK_GAIN = 0.08`, `BGM_WAVEFORM`, `BGM_PATTERN`, `BGM_FADE_OUT_MS = 1500`）
- [ ] **P2-B-5**: `npm run typecheck` で型エラーがないことを確認

### P2-C: `src/audio/AudioManager.ts` 新規作成

- [ ] **P2-C-1**: `src/audio/` ディレクトリを作成し、`AudioManager.ts` を新規作成
- [ ] **P2-C-2**: クラスフィールドを実装（`ctx`, `masterGain`, `bgmGain`, `bgmTimer`, `bgmStep`, `bgmPending`, `bgmStopTimer`, `unlocked`）— design.md §3.1 内部構造
- [ ] **P2-C-3**: `unlock()` を実装（遅延 AudioContext 生成・`webkitAudioContext` フォールバック・冪等チェック・`bgmPending` 解消・try/catch で失敗を no-op 化）— design.md §4.2
- [ ] **P2-C-4**: `playSe(key: SeKey)` を実装（短命 OscillatorNode + GainNode、AD エンベロープ、`coin`/`goal` の複数ステップは `offsetSec` で時間差発火）— design.md §3.1 擬似コード
- [ ] **P2-C-5**: `startBgm()` を実装（多重起動防止・`bgmPending` フラグ・`setInterval` 駆動シーケンサ）— design.md §3.1 BGM ループ構造
- [ ] **P2-C-6**: `tickBgm()` プライベートメソッドを実装（`BGM_PATTERN` 配列から周波数を取得し短命ノートをスケジュール）
- [ ] **P2-C-7**: `stopBgm(fadeMs?: number)` を実装（`fadeMs > 0` の場合は `linearRampToValueAtTime` でフェードアウト後タイマー停止、`fadeMs = 0` で即停止）
- [ ] **P2-C-8**: `destroy()` を実装（`clearInterval`・`clearTimeout`・AudioContext.close()）
- [ ] **P2-C-9**: `AudioManager.ts` 内に数値リテラルが残っていないか grep で確認（`gameConfig.ts` の定数のみ使用していること）

### P2-D: 担当判断

- 定数追加・新規モジュール作成のみ。Phaser 非依存の純粋クラスで v0.2 の `buildEnemies`/`buildCoins` と同規模。**モドリッチが直接実装**

---

## P3: GameScene.ts 統合

### P3-A: 環境・依存確認

- [ ] **P3-A-1**: `index.html` / `vite.config.ts` / `main.ts` / `BootScene.ts` は**変更なし**を確認（design.md §8.1）
- [ ] **P3-A-2**: `GameScene.ts` の現在の状態を Read で確認（セッション引き継ぎ時の作業原則）

### P3-B: `GameScene.ts` メンバ・初期化追加

- [ ] **P3-B-1**: `private audio!: AudioManager;` フィールドを追加
- [ ] **P3-B-2**: `create()` 末尾に `AudioManager` 生成・`startBgm()` 呼び出し・unlock リスナー登録（PC 用 `keyboard.once('keydown', ...)` を追加）— design.md §3.2

### P3-C: SE フックポイント追加（9 箇所）

- [ ] **P3-C-1**: `setupTouchControls()` の `pointerdown` ハンドラ先頭に `this.audio.unlock()` を追加（iOS Safari unlock）
- [ ] **P3-C-2**: `update()` のジャンプ判定内（`setVelocityY(JUMP_VELOCITY)` 直後）に `this.audio.playSe('jump')` を追加。**`onGround` 条件内のみ**（空中では鳴らさない）
- [ ] **P3-C-3**: `onCoinOverlap` の `coinsCollected++` 直後に `this.audio.playSe('coin')` を追加
- [ ] **P3-C-4**: `onEnemyOverlap` の踏みつけ確定ブランチ（`isStomp === true`）内に `this.audio.playSe('stomp')` を追加
- [ ] **P3-C-5**: `handleMiss()` の多重ガード後（`isMissed = true` の直後）に `this.audio.playSe('miss')` を追加
- [ ] **P3-C-6**: `onGoalHit` の `isCleared` ガード後に `this.audio.playSe('goal')` と `this.audio.stopBgm(BGM_FADE_OUT_MS)` を追加
- [ ] **P3-C-7**: `events.once('shutdown', ...)` で `this.audio.destroy()` を呼ぶクリーンアップを追加

### P3-D: ビルド・型検証

- [ ] **P3-D-1**: `npm run typecheck`（`tsc --noEmit`）通過
- [ ] **P3-D-2**: `npm run build` 成功 — バンドルサイズが前バージョン（1,490 kB）から **+10 kB 以内**（設計値 +2〜4 kB）に収まることを確認。**1.5 MB 上限未達なら即停止してシャビに確認**
- [ ] **P3-D-3**: ハードコード grep 確認 — `AudioManager.ts` 内に数値リテラルが 0 件（`gameConfig.ts` インポートのみ）

### P3-E: 担当判断

- `GameScene.ts` への呼び出し追加は 9 箇所、各 1〜2 行。既存ロジック変更なし。**モドリッチが直接実装**

---

## P4: ビルド検証 + Pages デプロイ確認

### P4-A: 機能テスト（受け入れ条件 §7 対応、Pages デプロイ後にシャビ実施）

- [ ] **P4-A-1**: ジャンプ時に SE が鳴る（PC: Space/↑、スマホ: 右タップ）
- [ ] **P4-A-2**: コイン取得時に明るい 2 段音 SE が鳴る
- [ ] **P4-A-3**: 敵踏みつけ撃破時に低いドン音 SE が鳴る
- [ ] **P4-A-4**: 敵接触ミス・落下ミス両方で下降音 SE が鳴る
- [ ] **P4-A-5**: ゴール達成時に C-E-G-C のファンファーレ SE が鳴り、BGM が 1.5 秒でフェードアウトする
- [ ] **P4-A-6**: ステージ開始後、最初の入力（キー押下 / タップ）直後から BGM がループ再生される
- [ ] **P4-A-7**: ミス → リスタート後、再び最初の入力で BGM が再開される
- [ ] **P4-A-8**: 既存機能（敵 AI・コイン・HUD・タッチ操作・レスポンシブ）が引き続き正常動作する

### P4-B: 性能測定（Pages デプロイ後にシャビ実施）

- [ ] **P4-B-1**: 60 fps 維持（BGM ループ中も変化なし）
- [ ] **P4-B-2**: バンドルサイズ < 1.5 MB（`vite build` 出力で確認）

### P4-C: エラーケース

- [ ] **P4-C-1**: iOS Safari または古いブラウザで AudioContext 生成失敗の場合、音なしでゲームが続行することを確認（実機がなければ静的コード確認で代替）
- [ ] **P4-C-2**: unlock 前（ページロード直後、まだキー/タップなし）の状態で SE イベントが発火しても例外が出ないことを確認（`ctx === null` の early return を静的確認）

### P4-D: Pages デプロイ確認

- [ ] **P4-D-1**: コミット → push 後、GitHub Actions の `deploy` ワークフローが成功することを確認
- [ ] **P4-D-2**: Pages の URL をシャビに案内し、P4-A / P4-B のチェックを実施

### P4-E: 計測まとめ

- [ ] **P4-E-1**: 結果を `.steering/20260504-bgm-se/perf-report.md` に記録（バンドルサイズ実測値・音声 SE 体感・BGM ループ確認）
- [ ] **P4-E-2**: 計測結果を報告（KPI 目標達成を確認）

---

## P5: クルトワ（security-engineer）レビュー + コミット

- [ ] **P5-1**: 変更ファイル（`src/config/gameConfig.ts`, `src/audio/AudioManager.ts`, `src/scenes/GameScene.ts`）のセキュリティレビューをクルトワに依頼（**`opus` モデル**）
  - 観点（CLAUDE.md「ハードコーディング検出」より）:
    - URL / エンドポイント / WebSocket URL のハードコーディング有無
    - シークレット / キー / トークン / パスワードのハードコーディング有無
    - AWS アカウント情報のハードコーディング有無
    - CSP `default-src 'self'` を壊す外部フェッチが追加されていないか
    - `eval` / `new Function` / `innerHTML` 等の危険な動的コード実行がないか
    - XSS につながる動的文字列挿入がないか
- [ ] **P5-2**: 指摘事項を確認
  - Critical / High なし → 次タスクへ進む
  - **Critical / High あり → 止めてシャビに確認**（修正方針の合意）
- [ ] **P5-3**: 指摘修正（あれば）
- [ ] **P5-4**: シャビへレビュー結果報告 → **コミット承認取得**（CLAUDE.md 必須ルール）
- [ ] **P5-5**: コミット作成（Conventional Commits 例: `feat: add BGM and SE via Web Audio API`）

---

## P6: ドキュメント更新（最小）

- [ ] **P6-1**: `docs/architecture.md` の「テクノロジースタック」と「拡張・将来課題」に音声レイヤ（AudioManager / Web Audio API）を追記
- [ ] **P6-2**: `docs/repository-structure.md` に `src/audio/AudioManager.ts` の責務を追記
- [ ] **P6-3**: `docs/functional-design.md` に AudioManager のシーケンス図（design.md §2.1 の Mermaid）を反映（任意、工数が大きければ v0.4 に持ち越し可）
- [ ] **P6-4**: `docs/glossary.md` に「AudioManager」「SE（サウンドエフェクト）」「BGM」を追加（未掲載の場合）
- [ ] **P6-5**: 更新した永続的ドキュメントもクルトワレビュー対象 — P5-1 に統合可

---

## 横断タスク（全フェーズ共通、CLAUDE.md ルール）

- [ ] **X-1**: 各タスク着手前に対象ファイルの最新状態を `Read` で確認（セッション引き継ぎ時の作業原則）
- [ ] **X-2**: 変更後は必ず `npm run typecheck` + `npm run build` でビルド・型検証
- [ ] **X-3**: 重要な発見・ハマりどころは即座に `decisions.md` に記録（最初から作らない、発生時に作成）
- [ ] **X-4**: コミット前にクルトワへセキュリティレビュー依頼 — P5 で実施
- [ ] **X-5**: 完了報告は出すが、それで作業を止めない

---

## 進捗マイルストーン

| マイルストーン | 完了条件 | 状態 |
|--------------|--------|------|
| **M1: PoC 通過** | スキップ（P1 不要） | — |
| **M2: 共通基盤完成** | P2 完了（型チェック通過） | [ ] |
| **M3: ローカル統合ビルド** | P3 + P3-D 完了（typecheck / build 成功） | [ ] |
| **M4: 性能目標達成** | P4-B + P4-D 完了（60 fps / < 1.5 MB、Pages 上で確認） | [ ] |
| **M5: コミット完了** | P5 完了（クルトワ OK + シャビ承認） | [ ] |
| **M6: スプリント完了** | P6 完了 | [ ] |

---

## 残る未確定事項（実装中に発生したらシャビ判断）

| # | 項目 | トリガ |
|---|------|------|
| Q5 | `AUDIO_MASTER_GAIN = 0.5` の体感調整 | Pages 実機確認で音が大きすぎ / 小さすぎと感じた場合 |
| Q6 | BGM 開始まで完全無音の UX 許容性 | 「最初のキー押下まで BGM が流れない」ことを実機で不自然と感じた場合 |
| Q7 | タブ非アクティブ時の BGM 挙動 | ブラウザが AudioContext を自動 suspend して復帰後によれた場合 |

---

作成: モドリッチ / 2026-05-04

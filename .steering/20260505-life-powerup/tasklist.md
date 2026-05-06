# タスクリスト: ライフ / パワーアップシステム

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-05 |
| 担当 | モドリッチ |
| 関連設計 | `.steering/20260505-life-powerup/design.md` |
| 関連要求 | `.steering/20260505-life-powerup/requirements.md` |

---

## 進め方の原則

- **定数追加 → テクスチャ/SE → buildStage 拡張 → GameScene 改修 → ステージデータ → 統合検証 → レビュー → コミット**
- 各タスクは [ ] 未着手 / [WIP] 進行中 / [x] 完了 で管理
- ハードコード禁止: 初期ライフ数・無敵時間・スケール等は `gameConfig.ts` に集約
- コミット前は **必ずクルトワ（security-engineer）レビュー**（CLAUDE.md ルール準拠）
- **各 Phase は完了次第、止まらずに次の Phase へ進む**
- **作業を止めるのは**、床貫通等の致命的バグ再発 / クルトワ Critical+High 指摘 / 想定外の制約発覚のみ

---

## P1: 定数・型の追加（`gameConfig.ts`）

- [ ] **P1-1**: `src/config/gameConfig.ts` に以下の定数を追記（design.md §3.1）
  - `INITIAL_LIVES = 3`
  - `MIN_LIVES = 0`
  - `INVINCIBLE_MS = 1500`
  - `INVINCIBLE_BLINK_MS = 100`
  - `BIG_SCALE = 1.5`
  - `MUSHROOM_SPRITE_W = 32`
  - `MUSHROOM_SPRITE_H = 32`
  - `MUSHROOM_CAP_COLOR = 0xe53935`
  - `MUSHROOM_DOT_COLOR = 0xffffff`
  - `MUSHROOM_STEM_COLOR = 0xfff1c1`
  - `MUSHROOM_STEM_DARK_COLOR = 0xc9a96e`
  - `STAGE_MUSHROOM_MIN = 0`
  - `STAGE_MUSHROOM_MAX = 5`
  - `HUD_LIFE_LABEL = 'ライフ'`
  - `HUD_LIFE_HEART = '♥'`
  - `HUD_LIFE_X = 16`
  - `HUD_LIFE_Y = 64`
  - `HUD_INSTRUCTION_Y = 88`（既存 `HUD_COIN_Y + 24` のマジック解消も兼ねる）
  - `GAME_OVER_TEXT = 'GAME OVER'`
  - `GAME_OVER_TO_TITLE_DELAY_MS = 2500`
- [ ] **P1-2**: `TEX_KEY` に `mushroom: 'mushroom'` を追加
- [ ] **P1-3**: `SE_PARAMS` の型を `'mushroom'` を含む union に拡張し、キノコ SE 定義を追加（design.md §3.1 の音定義）
- [ ] **P1-4**: `npm run build` でエラーなしを確認

---

## P2: キノコテクスチャ生成

- [ ] **P2-1**: `src/scenes/spriteSheets.ts` に `buildMushroomSheet(scene)` を追加（design.md §3.3）
  - `addCanvas` で 32×32 px テクスチャを生成
  - 傘（赤）+ 水玉（白）+ 柄（ベージュ + シェード）を Canvas 2D API で描画
  - `scene.textures.exists(TEX_KEY.mushroom)` ガードで二重生成防止
- [ ] **P2-2**: `src/scenes/BootScene.ts` の `create()` に `buildMushroomSheet(this)` を追加
- [ ] **P2-3**: `npm run build` でエラーなしを確認

---

## P3: AudioManager の SeKey 拡張

- [ ] **P3-1**: `src/audio/AudioManager.ts` の `SeKey` union 型に `'mushroom'` を追加
  - `SE_PARAMS` を参照している型定義を合わせて更新
- [ ] **P3-2**: `npm run build` でエラーなしを確認

---

## P4: `buildStage()` 拡張（タイル `M` 対応）

- [ ] **P4-1**: `src/scenes/GameScene.ts` の `BuiltStage` インターフェースに `mushrooms: Phaser.Physics.Arcade.StaticGroup` を追加
- [ ] **P4-2**: `buildStage()` 内のタイル走査ループに `'M'` 分岐を追加し `mushroomPositions` を収集
- [ ] **P4-3**: `buildStage()` にバリデーションを追加（`STAGE_MUSHROOM_MIN..STAGE_MUSHROOM_MAX`）
- [ ] **P4-4**: `buildMushrooms(positions)` メソッドを新設（コイン同様タイル中心配置・`refreshBody()` 呼び出し）
- [ ] **P4-5**: `buildStage()` 戻り値に `mushrooms` を含める
- [ ] **P4-6**: `npm run build` でエラーなしを確認

---

## P5: `GameScene` 改修（メイン実装）

### P5-A: フィールド追加・`init` 拡張

- [ ] **P5-A-1**: 新規フィールドを追加（design.md §3.2.1）
  - `private lives = INITIAL_LIVES`
  - `private playerState: 'small' | 'big' | 'invincible' = 'small'`
  - `private mushrooms!: Phaser.Physics.Arcade.StaticGroup`
  - `private lifeHud!: Phaser.GameObjects.Text`
  - `private invincibleTimer: Phaser.Time.TimerEvent | null = null`
  - `private blinkTween: Phaser.Tweens.Tween | null = null`
- [ ] **P5-A-2**: `init(data)` シグネチャを `{ stageIndex?: number; lives?: number }` に拡張し、`this.lives = Math.max(MIN_LIVES, data?.lives ?? INITIAL_LIVES)` を追加

### P5-B: `create()` 改修

- [ ] **P5-B-1**: `create()` の初期化ブロックに `playerState = 'small'` を追加
- [ ] **P5-B-2**: `built.mushrooms` を `this.mushrooms` にセット
- [ ] **P5-B-3**: `physics.add.overlap(this.player, this.mushrooms, this.onMushroomOverlap, ...)` を登録
- [ ] **P5-B-4**: ライフ HUD テキスト（`lifeHud`）を `create()` に追加（`setScrollFactor(0)`）
- [ ] **P5-B-5**: `shutdown` イベントで `invincibleTimer?.remove(false)` / `blinkTween?.stop()` をクリーンアップ登録
- [ ] **P5-B-6**: `teardownPhysics()` に `this.mushrooms?.clear(true, true)` を追加

### P5-C: 新規メソッド追加

- [ ] **P5-C-1**: `onMushroomOverlap` コールバックを追加（disableBody → `audio.playSe('mushroom')` → `powerUp()`）
- [ ] **P5-C-2**: `powerUp()` を追加（`small` のみ有効、`setDisplaySize`・`body.setSize` を `BIG_SCALE` 倍）
- [ ] **P5-C-3**: `powerDown(reason: 'enemy' | 'fall')` を追加（`setDisplaySize`・`body.setSize` を元サイズに戻す）
- [ ] **P5-C-4**: `startInvincible()` を追加（既存タイマー/tween 停止 → `tweens.add({ alpha, yoyo, repeat:-1 })` → `delayedCall(INVINCIBLE_MS)` で解除）
- [ ] **P5-C-5**: `decrementLifeAndContinue()` を追加（ライフ −1 → `refreshLifeHud` → lives=0 なら `showGameOver` / else `fullRestart`）
- [ ] **P5-C-6**: `showGameOver()` を追加（テキスト表示 → `stopBgm` → `delayedCall` でタイトルへ）
- [ ] **P5-C-7**: `formatLifeHud()` / `refreshLifeHud()` を追加

### P5-D: 既存メソッド改修

- [ ] **P5-D-1**: `handleMiss()` を再構成（design.md §3.2.5）
  - `'enemy'` + `'big'` → `powerDown('enemy')` + SE → return（ライフ減算なし）
  - `'enemy'` + `'invincible'` → 早期 return
  - それ以外（小+敵 / 大+落下 / 小+落下）→ `isMissed=true` → ビッグ時サイズリセット → `audio.playSe('miss')` → `decrementLifeAndContinue()`
- [ ] **P5-D-2**: `onEnemyOverlap` を改修（`playerState` に応じた分岐。stomp は従来通り）
- [ ] **P5-D-3**: `fullRestart()` を改修（`scene.restart({ stageIndex: this.stageIndex, lives: this.lives })`）
- [ ] **P5-D-4**: `transitionToStage(index)` を改修（`scene.restart({ stageIndex: index, lives: this.lives })`）
- [ ] **P5-D-5**: `updateHudPositions()` を改修（`lifeHud` 位置更新追加・`instructionText` の Y を `HUD_INSTRUCTION_Y` 基準に変更）

### P5-E: ビルド確認

- [ ] **P5-E-1**: `npm run build` で TypeScript エラーなしを確認

---

## P6: `TitleScene` 改修

- [ ] **P6-1**: `TitleScene.ts` のゲーム開始処理を `scene.start('GameScene', { stageIndex: 0, lives: INITIAL_LIVES })` に更新（`INITIAL_LIVES` を import）
- [ ] **P6-2**: `npm run build` でエラーなしを確認

---

## P7: ステージデータへのキノコ配置

- [ ] **P7-1**: `src/stages/stage01.ts` に `M` を 1 個配置（design.md §3.5 の位置を参考に調整）
  - 配置後 `buildStage()` バリデーション通過を `npm run build` で確認
- [ ] **P7-2**: `src/stages/stage02.ts` に `M` を 2 個配置（design.md §3.5 の位置を参考に調整）
  - 配置後 `buildStage()` バリデーション通過を `npm run build` で確認
- [ ] **P7-3**: `src/stages/stage03.ts` に `M` を 3 個配置（design.md §3.5 の位置を参考に調整）
  - 配置後 `buildStage()` バリデーション通過を `npm run build` で確認

---

## P8: 統合検証（手動）

### P8-A: ゴールデンパス

- [ ] **P8-A-1**: タイトル → ゲーム開始 → HUD に「ライフ: ♥ × 3」が表示される
- [ ] **P8-A-2**: 落下ミス → HUD が「♥ × 2」に更新 → 同ステージ再スタート
- [ ] **P8-A-3**: stage1 でミス後クリア → stage2 開始時にライフ 2 が引き継がれる
- [ ] **P8-A-4**: 3 回連続ミス（ライフ 0）→ "GAME OVER" 表示 → タイトルへ遷移

### P8-B: キノコパワーアップ

- [ ] **P8-B-1**: キノコに触れる → スプライト 1.5 倍に拡大 + `mushroom` SE 再生
- [ ] **P8-B-2**: 「大」状態で敵接触 → 小に戻る（ライフ変わらない）+ 点滅無敵
- [ ] **P8-B-3**: 無敵点滅中に再度敵接触 → ライフ変化なし（多重ダメージ防止）
- [ ] **P8-B-4**: 「大」状態で落下 → ライフ −1 + サイズ初期化 → リスポーン

### P8-C: 既存機能リグレッション

- [ ] **P8-C-1**: 3 ステージ通しプレイで BGM・コイン SE・ゴール SE が正常再生される
- [ ] **P8-C-2**: タッチ操作（スライド移動・タップジャンプ）が正常動作する
- [ ] **P8-C-3**: タイトル画面 → ゲーム → ALL CLEAR → タイトルの全フローが通る
- [ ] **P8-C-4**: 連続 5 回ミス再起動で床貫通バグが起きないこと

### P8-D: パフォーマンス

- [ ] **P8-D-1**: stage03（敵 8 体 + キノコ 3 個）で 30 秒プレイ → Chrome DevTools で平均 FPS ≥ 58

---

## P9: クルトワ（security-engineer）レビュー + コミット

- [ ] **P9-1**: 変更ファイルすべてのセキュリティレビューをクルトワに依頼
  - 対象: `gameConfig.ts` / `GameScene.ts` / `BootScene.ts` / `spriteSheets.ts` / `TitleScene.ts` / `AudioManager.ts` / `stage01.ts` / `stage02.ts` / `stage03.ts`
  - 観点: ハードコーディングなし確認（URL/シークレット）・`lives` 値のクランプによる負数注入対策・XSS 余地なし
- [ ] **P9-2**: 指摘確認
  - Critical / High なし → 次へ
  - **Critical / High あり → 止めてシャビに確認**
- [ ] **P9-3**: 指摘修正（あれば）
- [ ] **P9-4**: シャビへレビュー結果報告 → コミット承認取得
- [ ] **P9-5**: コミット作成 + push

---

## P10: ドキュメント更新

- [ ] **P10-1**: `docs/product-requirements.md` の F-014「ライフ / パワーアップ」ステータスを実装済みに更新
- [ ] **P10-2**: `docs/repository-structure.md` に変更なし（新規ファイルなし。確認のみ）
- [ ] **P10-3**: `docs/architecture.md` / `docs/functional-design.md` への影響を確認し、必要なら更新

---

## 横断タスク

- [ ] **X-1**: 各タスク着手前に対象ファイルの最新状態を `Read` で確認
- [ ] **X-2**: 各フェーズ後に `npm run build` でビルド成功を確認
- [ ] **X-3**: 想定外の発見（body.setSize の挙動など）は即座に `decisions.md` に記録

---

## 進捗マイルストーン

| マイルストーン | 完了条件 |
|--------------|--------|
| **M1: 定数・型基盤完了** | P1〜P3 完了・`npm run build` 成功 |
| **M2: buildStage 拡張完了** | P4 完了・バリデーション通過 |
| **M3: GameScene 実装完了** | P5〜P6 完了・型エラーなし |
| **M4: ステージデータ完了** | P7 完了・全ステージ `buildStage` 通過 |
| **M5: 統合動作確認** | P8 全項目通過 |
| **M6: コミット完了** | P9 完了・クルトワ Critical/High なし |
| **M7: スプリント完了** | P10 完了 |

---

## 残る未確定事項（実装中に発生したらシャビ判断）

| # | 項目 | トリガ |
|---|------|------|
| Q5 | 「大→小」移行時の SE: `stomp` 流用 or `mushroom_down` 新設 | プレイテスト後に違和感があれば |
| Q6 | ゲームオーバー時の BGM: `BGM_FADE_OUT_MS` フェード or 即停止 | プレイテスト後にやられ感が弱ければ |
| Q7 | 無敵中に別キノコに触れた場合: 消費するか/しないか | 実装中に挙動を決める（設計上は「消費するが state 据え置き」） |

---

作成: モドリッチ / 2026-05-05

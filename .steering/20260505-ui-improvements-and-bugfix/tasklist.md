# タスクリスト: ui-improvements-and-bugfix

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-05 |
| 担当 | モドリッチ |
| 関連設計 | `.steering/20260505-ui-improvements-and-bugfix/design.md` |
| 関連要求 | `.steering/20260505-ui-improvements-and-bugfix/requirements.md` |

---

## 進め方の原則

- **定数変更 → ヘルパー新規作成 → BootScene/GameScene 改修 → 動作検証 → クルトワレビュー → コミット**
- 各タスクは [ ] 未着手 / [WIP] 進行中 / [x] 完了 で管理
- ハードコード禁止: 色・サイズ・FPS 等の新規定数はすべて `gameConfig.ts` に集約
- コミット前は **必ずクルトワ（security-engineer）レビュー**（CLAUDE.md ルール準拠）
- **各フェーズは完了次第、止まらずに次へ進む**
- **作業を止めるのは、設計前提が崩れた／クルトワ Critical/High 指摘が出た／シャビの目視確認が必要な見た目の判断が生じたときのみ**

---

## P1: 定数・設定変更（`src/config/gameConfig.ts`）

- [ ] **P1-1**: `TEX_KEY` に `playerSheet: 'player_sheet'`、`enemySheet: 'enemy_sheet'` を追加。既存 `player` / `enemy` は削除
- [ ] **P1-2**: `ANIM_KEY` 定数オブジェクト新設（`playerIdle` / `playerWalk` / `playerJump` / `enemyWalk`）
- [ ] **P1-3**: `COIN_SPRITE_W / H` を 24 → 32 に変更
- [ ] **P1-4**: `ENEMY_SPRITE_W / H` を 36 → 44 に変更
- [ ] **P1-5**: `PLAYER_ANIM_WALK_FPS = 8`、`ENEMY_ANIM_WALK_FPS = 6` を追加
- [ ] **P1-6**: 色定数追加: `PLAYER_SKIN_COLOR = 0xffd6a8`、`PLAYER_OVERALL_COLOR = 0x2e3aa8`、`PLAYER_SHOE_COLOR = 0x6b4226`、`ENEMY_DARK_COLOR = 0x5a3818`
- [ ] **P1-7**: `STOMP_TOLERANCE_PX` を削除（未使用化のため、design.md §7.3）
- [ ] **P1-8**: `tsc --noEmit` でビルドエラーがないことを確認

---

## P2: スプライトシート生成ヘルパー新規作成（`src/scenes/spriteSheets.ts`）

- [ ] **P2-1**: ファイル新規作成。`buildPlayerSheet(scene)` / `buildEnemySheet(scene)` / `drawPlayerFrame` / `drawEnemyFrame` を実装（design.md §3.1）
  - `document.createElement('canvas')` でローカル生成
  - `getContext('2d')` が null の場合は `throw new Error('canvas 2d context unavailable')`
  - `scene.textures.exists(key)` チェックで冪等性を保証（再起動時の二重登録防止）
  - `textures.addCanvas` 後に `texture.add(name, 0, x, y, w, h)` で各フレーム登録
- [ ] **P2-2**: プレイヤーシート（128×48、4フレーム）の描画実装（design.md §4.2）
  - idle: 両足中央・両手体側面
  - walk1: 左足前・右足後ろ・手逆位相
  - walk2: 右足前・左足後ろ・手逆位相（walk1 鏡像）
  - jump: 両足短く内側・両手上方向
- [ ] **P2-3**: 敵シート（88×44、2フレーム）の描画実装（design.md §5.2）
  - enemy_walk1: 左足前気味
  - enemy_walk2: 右足前気味
- [ ] **P2-4**: `tsc --noEmit` でビルドエラーがないことを確認

---

## P3: アニメーション定義ヘルパー新規作成（`src/scenes/animations.ts`）

- [ ] **P3-1**: ファイル新規作成。`registerAnimations(scene)` を実装（design.md §3.2）
  - `scene.anims.exists(ANIM_KEY.playerIdle)` で冪等チェック
  - `player_idle`: idle フレーム、frameRate 1、repeat -1
  - `player_walk`: walk1 → walk2、frameRate 8、repeat -1
  - `player_jump`: jump フレーム、frameRate 1、repeat 0
  - `enemy_walk`: enemy_walk1 → enemy_walk2、frameRate 6、repeat -1
- [ ] **P3-2**: `tsc --noEmit` でビルドエラーがないことを確認

---

## P4: BootScene 改修（`src/scenes/BootScene.ts`）

- [ ] **P4-1**: `playerUrl` / `enemyUrl` の import を削除
- [ ] **P4-2**: `preload()` から `this.load.image(TEX_KEY.player, ...)` / `this.load.image(TEX_KEY.enemy, ...)` を削除
- [ ] **P4-3**: `create()` 冒頭（stageIndex 復元の前）に `buildPlayerSheet(this)` / `buildEnemySheet(this)` を追加
- [ ] **P4-4**: `tsc --noEmit` でビルドエラーがないことを確認

---

## P5: GameScene 改修（`src/scenes/GameScene.ts`）

### P5-A: プレイヤー生成とアニメーション

- [ ] **P5-A-1**: import に `registerAnimations`（animations.ts）、`TEX_KEY.playerSheet`、`ANIM_KEY` を追加。`STOMP_TOLERANCE_PX` import を削除
- [ ] **P5-A-2**: `create()` のプレイヤー生成を `this.physics.add.sprite(spawnX, spawnY, TEX_KEY.playerSheet, 'idle')` に変更
- [ ] **P5-A-3**: `this.player.setDisplaySize(PLAYER_SPRITE_W, PLAYER_SPRITE_H)` を削除
- [ ] **P5-A-4**: `create()` 末尾に `registerAnimations(this)` と `this.player.anims.play(ANIM_KEY.playerIdle, true)` を追加

### P5-B: アニメーション状態遷移（update）

- [ ] **P5-B-1**: `update()` にアニメ切り替えロジックを追加（design.md §3.4）
  - `!onGround` → `player_jump`
  - `onGround && |vx| > 0.1` → `player_walk`
  - `onGround && |vx| <= 0.1` → `player_idle`
  - `isCleared || isMissed` 時は `player_idle`
- [ ] **P5-B-2**: `update()` に向き反転を追加（`vx < -0.1` で `setFlipX(true)`、`vx > 0.1` で `setFlipX(false)`）

### P5-C: 敵生成とアニメーション

- [ ] **P5-C-1**: `buildEnemies()` の `group.create(cx, cy, TEX_KEY.enemy)` を `group.create(cx, cy, TEX_KEY.enemySheet, 'enemy_walk1')` に変更
- [ ] **P5-C-2**: `enemy.setDisplaySize(ENEMY_SPRITE_W, ENEMY_SPRITE_H)` を削除
- [ ] **P5-C-3**: `enemy.anims.play(ANIM_KEY.enemyWalk, true)` を追加

### P5-D: 敵の向き反転

- [ ] **P5-D-1**: `updateEnemyAi()` で dir 更新後に `enemy.setFlipX(dir > 0)` を追加（design.md §3.3）

### P5-E: 踏みつけ判定バグ修正

- [ ] **P5-E-1**: `onEnemyOverlap` の `isStomp` を `pBody.velocity.y > 0 && pBody.centerY <= eBody.centerY` に置換（design.md §7.1）

### P5-F: ビルド確認

- [ ] **P5-F-1**: `tsc --noEmit` でビルドエラーがないことを確認
- [ ] **P5-F-2**: `npm run build` で本番ビルド成功を確認

---

## P6: 動作確認

- [ ] **P6-1**: `npm run build` 成功後、ビルド成果物を確認
- [ ] **P6-2**: プレイヤーアニメーション確認（移動→walk、ジャンプ→jump、停止→idle、左右反転）
- [ ] **P6-3**: 敵アニメーション確認（歩行ループ、dir 反転時に flipX が変わる）
- [ ] **P6-4**: コイン表示サイズ確認（32×32）
- [ ] **P6-5**: 敵表示サイズ確認（44×44）
- [ ] **P6-6**: 踏みつけバグ確認（高い段差からジャンプ→踏みつけ成立・miss にならない）
- [ ] **P6-7**: 横接触で miss になることを確認
- [ ] **P6-8**: 全ステージで敵の段差端反転が正常に動作することを確認（敵幅拡大の波及確認）
- [ ] **P6-9**: BGM/SE・HUD・タッチ操作・ステージ進行が正常に動作することを確認
- [ ] **P6-10**: Scene 再起動（ミス時リスタート）後もアニメが正常に動作することを確認

---

## P7: クルトワ（security-engineer）レビュー + コミット

- [ ] **P7-1**: 変更ファイル全件のセキュリティレビューをクルトワに依頼
  - ハードコーディング（URL・シークレット・カラーコード直書き）検出
  - XSS 等のクライアントサイドリスク確認
- [ ] **P7-2**: 指摘事項を確認
  - Critical / High なし → 次へ
  - **Critical / High あり → 止めてシャビに確認**
- [ ] **P7-3**: 指摘修正（あれば）
- [ ] **P7-4**: シャビへレビュー結果を報告し、コミット承認を取得してからコミット
- [ ] **P7-5**: コミット作成 + push（GitHub Pages へ反映）

---

## P8: ドキュメント更新

- [ ] **P8-1**: `docs/repository-structure.md` に `src/scenes/spriteSheets.ts` / `src/scenes/animations.ts` の追加を反映
- [ ] **P8-2**: `docs/architecture.md` のフロントエンドスタック説明を更新（アニメーション方式の記述追加）
- [ ] **P8-3**: `docs/development-guidelines.md` にスプライトシート生成方針（Canvas API + generateFrameNames）を追記

---

## 横断タスク（全フェーズ共通）

- [ ] **X-1**: 各タスク着手前に対象ファイルの最新状態を `Read` で確認
- [ ] **X-2**: 各 Phase 完了後に `tsc --noEmit` 実施
- [ ] **X-3**: 設計との乖離・ハマりどころは即座に `decisions.md` に記録

---

## 進捗マイルストーン

| マイルストーン | 完了条件 |
|--------------|--------|
| **M1: 定数・設定完了** | P1 全タスク完了・型エラーなし |
| **M2: ヘルパー実装完了** | P2・P3 完了・型エラーなし |
| **M3: 全改修完了** | P4・P5 完了・本番ビルド成功 |
| **M4: 動作確認完了** | P6 全項目パス |
| **M5: コミット完了** | P7 完了・push 済み |
| **M6: スプリント完了** | P8 完了 |

---

## 残る未確定事項（実装中に発生したらシャビ判断）

| # | 項目 | トリガ |
|---|------|------|
| Q4 | プレイヤーの見た目テイスト | 実装後の目視で「マリオ風」として満足できない場合 |
| Q5 | `STOMP_TOLERANCE_PX` 完全削除 vs 残置 | 他で参照が残っていることが発覚した場合 |
| Q6 | `player.png` / `enemy.png` の即時削除 | 本スプリントでは残置。不要判断が確実になれば削除タスクを追加 |

---

作成: モドリッチ / 2026-05-05

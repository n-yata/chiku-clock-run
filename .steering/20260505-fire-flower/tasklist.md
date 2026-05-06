# タスクリスト: ファイアフラワー / スター追加パワーアップ

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-06 |
| 担当 | モドリッチ |
| 関連設計 | `.steering/20260505-fire-flower/design.md` |
| 関連要求 | `.steering/20260505-fire-flower/requirements.md` |

---

## 進め方の原則

- **定数・型 → スプライト → SE → buildStage 拡張 → GameScene リファクタ → 新機能実装 → ステージデータ → 統合検証 → セキュリティレビュー → コミット → ドキュメント**
- 各タスクは [ ] 未着手 / [WIP] 進行中 / [x] 完了 で管理
- ハードコード禁止: 速度・時間・サイズ・色・配置数制限はすべて `src/config/gameConfig.ts` に集約
- コミット前は **必ずクルトワ（security-engineer）レビュー**（CLAUDE.md ルール準拠）
- **各 Phase は完了次第、止まらずに次の Phase へ進む**
- **作業を止めるのは**:
  - v0.9 の `playerState='invincible'` リファクタで予期しない影響が出た場合
  - ファイアボール物理挙動が設計と大きく異なる場合
  - クルトワ Critical / High 指摘あり
  - design.md の前提が壊れる発見があった場合

---

## P1: 定数・型の追加（`gameConfig.ts`）

- [ ] **P1-1**: `src/config/gameConfig.ts` を Read で確認（現在の末尾を把握）
- [ ] **P1-2**: `PlayerState` 型を追加（design.md §3.1.1）
  ```ts
  export type PlayerState = 'small' | 'big' | 'fire';
  ```
- [ ] **P1-3**: `TEX_KEY` に `fireflower / star / fireball` の 3 キーを追加（design.md §3.1.3）
- [ ] **P1-4**: ファイアボール関連定数を追記（design.md §3.1.2 の表）
  - `FIREBALL_SPEED_X = 360`
  - `FIREBALL_SPEED_Y = -180`
  - `FIREBALL_BOUNCE_Y = 0.7`
  - `FIREBALL_BOUNCE_COUNT = 3`
  - `FIREBALL_LIFETIME_MS = 2500`
  - `FIREBALL_MAX_COUNT = 2`
  - `FIREBALL_COOLDOWN_MS = 200`
  - `FIREBALL_SPRITE_W = 16` / `FIREBALL_SPRITE_H = 16`
  - `FIREBALL_BODY_W = 12` / `FIREBALL_BODY_H = 12`
  - `FIREBALL_COLOR = 0xff7a00` / `FIREBALL_HIGHLIGHT_COLOR = 0xffe066`
- [ ] **P1-5**: スター関連定数を追記
  - `STAR_INVINCIBLE_MS = 8000`
  - `STAR_BLINK_MS = 80`
  - `STAR_END_WARNING_MS = 1500`
  - `STAR_SPRITE_W = 28` / `STAR_SPRITE_H = 28`
  - `STAR_COLOR = 0xffd23f` / `STAR_OUTLINE_COLOR = 0xb37700`
- [ ] **P1-6**: ファイアフラワー関連定数を追記
  - `FIREFLOWER_SPRITE_W = 32` / `FIREFLOWER_SPRITE_H = 32`
  - `FIREFLOWER_PETAL_COLOR = 0xff5252`
  - `FIREFLOWER_CENTER_COLOR = 0xffe066`
  - `FIREFLOWER_STEM_COLOR = 0x2e8b57`
  - `FIREFLOWER_LEAF_COLOR = 0x4caf50`
- [ ] **P1-7**: プレイヤー・タッチ操作関連定数を追記
  - `PLAYER_FIRE_TINT = 0xffe0a0`
  - `STAGE_FIREFLOWER_MIN = 0` / `STAGE_FIREFLOWER_MAX = 3`
  - `STAGE_STAR_MIN = 0` / `STAGE_STAR_MAX = 2`
  - `DOUBLE_TAP_MS = 300`
  - `HUD_FIRE_LABEL = 'FIRE: Z / 右ダブルタップ'`
- [ ] **P1-8**: `SE_PARAMS` の型 union に `'powerup' | 'fireball' | 'star'` を追加し、各 SE 定義を追記（design.md §3.1.4 の音定義参照）
- [ ] **P1-9**: `npm run build` で TypeScript エラーなしを確認

---

## P2: スプライトシート生成（`spriteSheets.ts` + `BootScene.ts`）

- [ ] **P2-1**: `src/scenes/spriteSheets.ts` を Read で確認
- [ ] **P2-2**: `buildFireflowerSheet(scene)` を追加（design.md §3.5.1）
  - 32×32 px、Canvas 2D で茎・葉・花びら5枚・花芯を描画
  - `scene.textures.exists(TEX_KEY.fireflower)` ガードで二重生成防止
- [ ] **P2-3**: `buildStarSheet(scene)` を追加（design.md §3.5.2）
  - 28×28 px、矩形パッチで5角星形を近似（輪郭濃橙 + 本体黄 + 中央白ハイライト）
- [ ] **P2-4**: `buildFireballSheet(scene)` を追加（design.md §3.5.3）
  - 16×16 px、`ctx.arc` でオレンジ円 + 中央黄ハイライト
- [ ] **P2-5**: `src/scenes/BootScene.ts` を Read で確認
- [ ] **P2-6**: `BootScene.create()` に 3 つの `buildXxxSheet(this)` 呼び出しを追加
- [ ] **P2-7**: `npm run build` でエラーなしを確認

---

## P3: AudioManager の SeKey 拡張

- [ ] **P3-1**: `src/audio/AudioManager.ts` を Read で確認
- [ ] **P3-2**: `SeKey` union 型に `'powerup' | 'fireball' | 'star'` を追加
- [ ] **P3-3**: `npm run build` でエラーなしを確認

---

## P4: `buildStage()` 拡張（タイル `F` / `S` 対応）

- [ ] **P4-1**: `src/scenes/GameScene.ts` を Read で確認（現在の buildStage 周辺）
- [ ] **P4-2**: `BuiltStage` インターフェースに `fireflowers` / `stars` フィールドを追加（design.md §3.2.2）
- [ ] **P4-3**: `buildStage()` のタイル走査ループに `'F'` / `'S'` 分岐を追加し位置を収集
- [ ] **P4-4**: `buildStage()` にバリデーション追加（design.md §5.2）
  - `F`: `STAGE_FIREFLOWER_MIN..STAGE_FIREFLOWER_MAX`
  - `S`: `STAGE_STAR_MIN..STAGE_STAR_MAX`
- [ ] **P4-5**: `buildFireflowers(positions)` メソッドを新設（StaticGroup、`refreshBody()`）
- [ ] **P4-6**: `buildStars(positions)` メソッドを新設（同上）
- [ ] **P4-7**: `buildStage()` 戻り値に `fireflowers` / `stars` を追加
- [ ] **P4-8**: `src/stages/index.ts` または `stage01.ts` の `TileChar` union に `'F' | 'S'` を追加
- [ ] **P4-9**: `npm run build` でエラーなしを確認

---

## P5: `GameScene` 主要実装

### P5-A: v0.9 リファクタ + フィールド追加（design.md §3.2.1 / §8.3）

> **重要**: v0.9 の `playerState = 'invincible'` を `isInvincible: boolean` に昇格する破壊的変更。
> `playerState` は `'small' | 'big' | 'fire'` の 3 値のみになる。

- [ ] **P5-A-1**: `private playerState` の型を `PlayerState`（`'small' | 'big' | 'fire'`）に変更
  - `'invincible'` を削除する — 既存の `playerState === 'invincible'` 参照を全て `isInvincible` に書き換える
- [ ] **P5-A-2**: 新規フィールドを追加
  - `private isInvincible = false`
  - `private isStarInvincible = false`
  - `private starTimer: Phaser.Time.TimerEvent | null = null`
  - `private starWarningTimer: Phaser.Time.TimerEvent | null = null`
  - `private starBlinkTween: Phaser.Tweens.Tween | null = null`
  - `private fireflowers!: Phaser.Physics.Arcade.StaticGroup`
  - `private stars!: Phaser.Physics.Arcade.StaticGroup`
  - `private fireballs!: Phaser.Physics.Arcade.Group`
  - `private fireKey!: Phaser.Input.Keyboard.Key`
  - `private fireCooldownUntil = 0`
  - `private lastTapRightAt = 0`
- [ ] **P5-A-3**: `init` シグネチャを `{ stageIndex?: number; lives?: number; playerState?: PlayerState }` に拡張（design.md §3.2.3）
  - 型ガード付き: 不正値は `'small'` フォールバック
- [ ] **P5-A-4**: `startInvincible()` を改修 — `playerState = 'invincible'` の代わりに `isInvincible = true` をセット、タイマー終了で `isInvincible = false`（`playerState` は変更しない）（design.md §3.2.8）
- [ ] **P5-A-5**: `npm run build` でエラーなしを確認

### P5-B: `create()` 改修

- [ ] **P5-B-1**: `create()` 初期化ブロックに `isInvincible / isStarInvincible / fireCooldownUntil / lastTapRightAt` のリセットを追加
- [ ] **P5-B-2**: `built.fireflowers` / `built.stars` をフィールドにセット
- [ ] **P5-B-3**: ファイアボール pool をセットアップ（design.md §3.3）
  ```ts
  this.fireballs = this.physics.add.group({ defaultKey: TEX_KEY.fireball, maxSize: FIREBALL_MAX_COUNT, ... });
  ```
- [ ] **P5-B-4**: `fireKey = addKey('Z')` を登録
- [ ] **P5-B-5**: 3 種の overlap / collider を追加（design.md §3.3）
  - `overlap(player, fireflowers, onFireflowerOverlap)`
  - `overlap(player, stars, onStarOverlap)`
  - `collider(fireballs, ground, onFireballGroundCollide)`
  - `overlap(fireballs, enemies, onFireballEnemyOverlap)`
- [ ] **P5-B-6**: `create()` 末尾の `applyPlayerState(this.playerState)` で開始時の見た目を反映
- [ ] **P5-B-7**: `shutdown` ハンドラに `starTimer` / `starWarningTimer` / `starBlinkTween` クリーンアップを追加
- [ ] **P5-B-8**: `npm run build` でエラーなしを確認

### P5-C: 新規メソッド追加

- [ ] **P5-C-1**: `applyPlayerState(newState: PlayerState)` を実装（design.md §3.2.5）
  - big / fire は `BIG_SCALE` 倍、small は元サイズ
  - `body.setSize` も同時更新
  - fire なら `setTint(PLAYER_FIRE_TINT)`、それ以外は `clearTint()`（スター無敵中は触らない）
  - ファイア取得時に `instructionText` を `HUD_FIRE_LABEL` に書き換え（design.md §3.8）
- [ ] **P5-C-2**: `onFireflowerOverlap` コールバックを追加（disableBody → `playSe('powerup')` → `applyPlayerState('fire')`）
- [ ] **P5-C-3**: `onStarOverlap` コールバックを追加（disableBody → `playSe('star')` → `startStarInvincible()`）
- [ ] **P5-C-4**: `startStarInvincible()` を実装（design.md §3.2.5）
  - 既存タイマー / tween を破棄して延長
  - alpha 点滅 tween 起動
  - `STAR_END_WARNING_MS` 前から点滅高速化（warningTimer）
  - `STAR_INVINCIBLE_MS` 後に `endStarInvincible()` 呼び出し
- [ ] **P5-C-5**: `endStarInvincible()` を実装（フラグ OFF・tween 停止・alpha 1 戻し・`applyPlayerState` 再適用）
- [ ] **P5-C-6**: `tryShootFireball()` を実装（design.md §3.2.5）
  - `playerState !== 'fire'` または `fireCooldownUntil` 未経過なら無視
  - `this.fireballs.get()` で pool から取得（null なら上限到達・無音スキップ）
  - `enableBody`・速度設定・`setData('bounces', 0)`・`setData('expireAt', ...)`
  - `fireCooldownUntil` を更新・`playSe('fireball')`
- [ ] **P5-C-7**: `destroyFireball(fb)` を実装（`disableBody(true, true)` のみ — `destroy()` は呼ばない）
- [ ] **P5-C-8**: `onFireballGroundCollide` コールバックを実装（design.md §3.2.5）
  - `body.blocked.down` なら bounces++ → `FIREBALL_BOUNCE_COUNT` 超過で `destroyFireball`
  - `body.blocked.left || right` なら即 `destroyFireball`
- [ ] **P5-C-9**: `onFireballEnemyOverlap` コールバックを実装（両者 active チェック → 敵 disableBody → `destroyFireball` → `playSe('stomp')`）
- [ ] **P5-C-10**: `npm run build` でエラーなしを確認

### P5-D: 既存メソッド改修

- [ ] **P5-D-1**: `onEnemyOverlap` を改修（design.md §3.2.6）
  - `isInvincible` チェック（早期 return）を追加
  - `isStarInvincible` チェック: 敵即撃破 → stomp SE → return
  - stomp 判定はそのまま維持
  - 接触ダメージは `handleMiss('enemy')` へ（変更なし）
- [ ] **P5-D-2**: `handleMiss('enemy')` を改修（design.md §3.2.7）
  - `isInvincible` チェックを冒頭に追加
  - `playerState === 'fire'` → `applyPlayerState('big')` + `startInvincible()` + stomp SE → return
  - `playerState === 'big'` → `applyPlayerState('small')` + `startInvincible()` + stomp SE → return
  - `playerState === 'small'` → ミス確定（既存ロジック）
- [ ] **P5-D-3**: `handleMiss('fall')` を改修
  - fire / big / small いずれも `applyPlayerState('small')` でサイズ・tint をリセットしてからミス処理
- [ ] **P5-D-4**: `update()` を改修
  - `JustDown(fireKey)` 検知 → `tryShootFireball()`
  - ファイアボール pool の寿命チェック（`expireAt` 超過 or ワールド外 → `destroyFireball`）（design.md §3.3）
- [ ] **P5-D-5**: `handlePointerDown` を改修（design.md §3.7）
  - 右ゾーンタップ時に `lastTapRightAt` との差が `DOUBLE_TAP_MS` 以内 + `playerState === 'fire'` → `tryShootFireball()` してジャンプをスキップ
  - それ以外は既存のジャンプ要求（変更なし）
  - `lastTapRightAt` を毎回更新
- [ ] **P5-D-6**: `fullRestart()` を改修
  - `scene.restart({ stageIndex, lives, playerState: 'small' })`（ライフを失った場合は小リセット）
- [ ] **P5-D-7**: `transitionToStage(index)` を改修
  - `scene.restart({ stageIndex: index, lives, playerState: this.playerState })`（ステージクリア時は状態引き継ぎ）
- [ ] **P5-D-8**: `teardownPhysics()` に `fireflowers / stars / fireballs` の clear を追加
- [ ] **P5-D-9**: `npm run build` でエラーなしを確認

---

## P6: ステージデータへのアイテム配置

> **注**: 設計の指標列（design.md §3.6）を参考に、既存タイル（`#` / `E` / `C` / `M` / `G`）と衝突しない位置に配置する。
> `buildStage()` バリデーション通過を各ステージごとに `npm run build` で確認すること。

- [ ] **P6-1**: `src/stages/stage01.ts` を Read で確認し、`F` を 1 個配置
  - 設計指標: 中盤（col=68 付近）の床上。既存 M・E・C と衝突しないこと
- [ ] **P6-2**: `npm run build` で stage01 バリデーション通過を確認
- [ ] **P6-3**: `src/stages/stage02.ts` を Read で確認し、`F` 1 個 + `S` 1 個を配置
  - F 設計指標: col=50 付近 / S 設計指標: col=100 付近
- [ ] **P6-4**: `npm run build` で stage02 バリデーション通過を確認
- [ ] **P6-5**: `src/stages/stage03.ts` を Read で確認し、`F` 1 個 + `S` 1 個を配置
  - F 設計指標: col=55 付近 / S 設計指標: col=120 付近
- [ ] **P6-6**: `npm run build` で stage03 バリデーション通過を確認

---

## P7: 統合検証（手動）

### P7-A: ファイアフラワー / ファイアボール

- [ ] **P7-A-1**: ファイアフラワー（F）に触れる → スプライトが薄ピンクに変化 + `powerup` SE 再生
- [ ] **P7-A-2**: ファイア状態で Z キー押下 → 前方にオレンジ円が飛ぶ
- [ ] **P7-A-3**: ファイアボールが地面で 3 回以内バウンドして消滅することを確認
- [ ] **P7-A-4**: ファイアボールが敵に命中 → 敵消滅 + ファイアボール消滅 + stomp SE
- [ ] **P7-A-5**: Z 連打で 3 発目は発射されない（2 発上限の確認）
- [ ] **P7-A-6**: ファイア状態で右ゾーンをダブルタップ → ファイアボール投射（タッチ操作確認）
- [ ] **P7-A-7**: ファイア状態 + 敵接触 → big 状態に降格（ライフ HUD 不変・無敵点滅あり）
- [ ] **P7-A-8**: fire → big → small と段階的に降格することを確認

### P7-B: スター（スターマン）

- [ ] **P7-B-1**: スター（S）に触れる → alpha 点滅開始 + `star` SE 再生
- [ ] **P7-B-2**: スター無敵中に敵接触 → 敵消滅（ライフ HUD 不変）
- [ ] **P7-B-3**: `STAR_INVINCIBLE_MS`（8 秒）後に点滅終了、状態が取得前に戻ることを確認
- [ ] **P7-B-4**: 終了 1.5 秒前に点滅が高速化することを確認（警告演出）
- [ ] **P7-B-5**: スター中に再度スター取得 → タイマーがリセットされ無敵が延長される

### P7-C: 状態引き継ぎ・ゲームオーバー

- [ ] **P7-C-1**: ファイア状態でゴール → 次ステージ開始時もファイア（tint + サイズ確認）
- [ ] **P7-C-2**: ゲームオーバー後の再スタート → small 状態で始まる
- [ ] **P7-C-3**: ファイア状態で落下 → ライフ −1 + small 状態でリスポーン

### P7-D: 既存機能リグレッション

- [ ] **P7-D-1**: キノコ取得（small → big）が正常動作する
- [ ] **P7-D-2**: 踏みつけ（stomp）がファイア状態でも有効
- [ ] **P7-D-3**: 3 ステージ通しプレイで BGM・コイン SE・ゴール SE が正常再生
- [ ] **P7-D-4**: タッチ操作（スライド移動・シングルタップジャンプ）が壊れていない
- [ ] **P7-D-5**: 連続 5 回ミス再起動で床貫通バグが起きない

### P7-E: パフォーマンス

- [ ] **P7-E-1**: stage03（敵 8 体 + キノコ 3 個 + F/S 各 1 個 + ファイアボール最大 2 発）で 30 秒プレイ → Chrome DevTools で平均 FPS ≥ 58

---

## P8: クルトワ（security-engineer）レビュー + コミット

- [ ] **P8-1**: 変更ファイルすべてのセキュリティレビューをクルトワに依頼
  - 対象: `gameConfig.ts` / `GameScene.ts` / `BootScene.ts` / `spriteSheets.ts` / `AudioManager.ts` / `stage01.ts` / `stage02.ts` / `stage03.ts` / `stages/index.ts`
  - 観点: ハードコーディングなし確認 / `data.playerState` の型ガード / XSS 余地なし / タイマーリーク対策
- [ ] **P8-2**: 指摘確認
  - Critical / High なし → 次へ
  - **Critical / High あり → 止めてシャビに確認**
- [ ] **P8-3**: 指摘修正（あれば）
- [ ] **P8-4**: シャビへレビュー結果報告 → **コミット承認取得**（必ず止まる）
- [ ] **P8-5**: コミット作成 + push

---

## P9: ドキュメント更新

- [ ] **P9-1**: `docs/product-requirements.md` の F-014 ステータスを更新（ライフ/パワーアップ→v0.9完了、ファイア/スター→v1.0実装済みに）
- [ ] **P9-2**: `docs/repository-structure.md` に変更なし（新規ファイルなし。確認のみ）
- [ ] **P9-3**: `docs/architecture.md` / `docs/functional-design.md` への影響を確認し、必要なら更新

---

## 横断タスク（全フェーズ共通）

- [ ] **X-1**: 各タスク着手前に対象ファイルの最新状態を `Read` で確認（セッション引き継ぎ時の原則）
- [ ] **X-2**: 各 Phase 後に `npm run build` でビルド成功を確認
- [ ] **X-3**: 想定外の発見（ファイアボール物理の挙動差異・タッチ判定の誤作動等）は即座に `decisions.md` に記録

---

## 進捗マイルストーン

| マイルストーン | 完了条件 |
|--------------|--------|
| **M1: 定数・型・スプライト基盤** | P1〜P3 完了・`npm run build` 成功 |
| **M2: buildStage 拡張完了** | P4 完了・F/S バリデーション通過 |
| **M3: GameScene 実装完了** | P5 完了・型エラーなし |
| **M4: ステージデータ完了** | P6 完了・全ステージ buildStage 通過 |
| **M5: 統合動作確認** | P7 全項目通過 |
| **M6: コミット完了** | P8 完了・クルトワ Critical/High なし |
| **M7: スプリント完了** | P9 完了 |

---

## 残る未確定事項（実装中に発生したらシャビ判断）

| # | 項目 | トリガ |
|---|------|------|
| Q7 | スター無敵中の BGM 切り替え（本スプリント外） | プレイテストで高揚感が弱ければ次スプリント検討 |
| Q8 | ファイアボール爆発エフェクト（本スプリント外） | プレイテストで弱く感じれば次スプリント追加 |
| Q9 | F/S の最終配置列（設計は指標、実装時に微調整） | 既存タイルと衝突する場合は decisions.md に記録 |
| Q10 | 停止中プレイヤーのファイアボール発射方向（flipX 準拠） | プレイテストで誤作動があれば修正 |

---

作成: モドリッチ / 2026-05-06

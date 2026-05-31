# 設計 — 強化アイテムの全廃

承認済み requirements に基づく削除・改修の具体設計。方針は「**強化レイヤを完全に削除し、デッドコードを残さない**」。

---

## D-1: 状態機械の撤廃（PlayerState 削除）

- `gameConfig.ts` の `export type PlayerState = 'small'|'big'|'fire'` を**削除**。
- `GameScene`:
  - `playerState` フィールド・`init` の playerState 解決・`applyPlayerState()` を撤廃。
  - プレイヤーは生成時に通常サイズ（`PLAYER_SPRITE_W/H`）で固定。`setDisplaySize` + body サイズ設定 + `playerBaseScale*` 記録を **create() 内の一度きり**の小ヘルパ `setupPlayerSize()` に集約。
  - `scene.restart({...})` 各所から `playerState` を除去（`stageIndex` / `lives` のみ）。
  - `showInstruction` は常に `INSTRUCTION_TEXT`（`HUD_PULSE_LABEL` 分岐を削除）。
- `TouchController` / `TouchHost`: `playerState` getter と `shootPulseBolt` を撤去。

## D-2: 被弾モデル（その場復活 + i-frame）

`handleMiss(reason)` を次の方針へ改修:

- `reason === 'enemy'` かつ被弾後もライフが残る場合（`lives > MIN_LIVES + 1`、すなわち lives ≥ 2）:
  - `lives -= 1` → HUD 更新
  - `powerUps.startInvincible()`（既存 i-frame・点滅）
  - 上方向に小さくノックバック（`PLAYER_HIT_KNOCKBACK_VY` を新設）
  - `miss` SE 再生、`isMissed` は立てず**その場で続行**
- 境界仕様: **最後の 1 ライフ（lives = 1）で敵に被弾した場合はその場復帰せず致命**とする。♥×3 なら「2 回はその場復帰、3 回目で死亡演出 → ゲームオーバー」という一貫挙動。i-frame はその場復帰時の連続死防止として機能する。
- それ以外（敵でライフが尽きる / 落下）:
  - 従来通り `isMissed = true` → 落下死アニメ or 即時 → `decrementLifeAndContinue()`（ライフ 0 で `showGameOver`、残あれば `fullRestart`）
- big/fire ダウングレード分岐（現 666-681）は**削除**。
- `i-frame` 中の敵接触ガード（`isInvincible` チェック）は維持。

## D-3: アイテム生成・当たり判定の撤去

- `BuiltStage` から `springCoils` / `pulseCores` / `chronoCrystals` を削除。
- `buildStage` のタイル解析で `'M'` / `'F'` / `'S'` の分岐・カウント検証を削除。未知タイル例外は `'.'` `'#'` `'P'` `'G'` `'E'` `'C'` のみ許可へ。
- `buildSpringCoils` / `buildPulseCores` / `buildChronoCrystals` メソッドを削除。
- `CollisionHandler.register` の引数から spring/pulseCore/chrono/pulseBolt 群と各ハンドラを削除。
- `onSpringCoilOverlap` / `onPulseCoreOverlap` / `onChronoCrystalOverlap` ハンドラを削除。
- `teardownPhysics` から spring/pulseCore/chrono/pulseBolt の clear を削除。

## D-4: パルス弾（飛び道具）の撤去

- `pulseBolts` group・`fireKey`・`fireCooldownUntil` を削除。
- `tryShootPulseBolt` / `destroyPulseBolt` / `onPulseBoltGroundCollide` / `onPulseBoltEnemyOverlap` を削除。
- `update()` 内の Z キー発射・パルス弾寿命ループを削除。
- `TouchHost.shootPulseBolt` 撤去（D-1）。

## D-5: クロノシールドの撤去（PowerUpManager 簡素化）

- `PowerUpManager`: `startChronoShield` / `endChronoShield` / `isChronoShielded` / chrono 系タイマー・tween を削除。`onChronoEnd` コンストラクタ引数を削除。
- `startInvincible`（i-frame）と `destroy()` は維持。`snapToNearbyGround` は big 縮小が無くなるため**未使用なら削除**（被弾その場復活では縮小スナップ不要）。
- `GameScene` の `isChronoShielded` getter と `onEnemyOverlap` 内の chrono 分岐を削除。`PowerUpManager` コンストラクタ呼び出しから `onChronoEnd` コールバックを除去。

## D-6: スプライト/テクスチャ/SE/イベントの撤去

- `spriteSheets.ts`: `buildSpringCoilSheet` / `buildPulseCoreSheet` / `buildChronoCrystalSheet` / `buildPulseBoltSheet` と関連 import を削除。
- `BootScene.ts`: 上記 build 呼び出しを削除。
- `gameConfig.ts` `TEX_KEY`: `springCoil` / `pulseCore` / `chronoCrystal` / `pulseBolt` を削除。
- `AudioManager.ts` `SeKey`: `springCoil` / `pulseCore` / `pulseBolt` / `chronoCrystal` を削除。`gameConfig` `SE_PARAMS` の該当キーも削除。
- `ParticleManager.ts`: `burstPulse`（パルス命中演出）が未使用化するため削除。
- `gameConfig.ts`: `BIG_SCALE` / `PLAYER_FIRE_TINT` / `PULSE_*` / `SPRING_COIL_*` / `PULSE_CORE_*` / `CHRONO_CRYSTAL_*` / `STAGE_SPRING_COIL_*` / `STAGE_PULSE_CORE_*` / `STAGE_CHRONO_CRYSTAL_*` / `CHRONO_*` / `HUD_PULSE_LABEL` を削除。i-frame 定数（`INVINCIBLE_MS` / `INVINCIBLE_BLINK_MS`）は維持。
- 新設: `PLAYER_HIT_KNOCKBACK_VY`（被弾ノックバック）。
- `events.ts`: パルス専用イベントがあれば削除（`EnemyKilled` / `Goal` は維持）。

## D-7: ステージデータ

- `stage01..03.ts`: タイル行から `'M'` / `'F'` / `'S'` を `'.'`（空き）へ置換。凡例コメントを `'E'`/`'C'` のみへ更新。`TileChar` 型から `'M'|'F'|'S'` を削除。
- アイテム除去で到達性が壊れないか確認（基本は空中配置のため空きにするだけで地形に影響しない想定。低天井等の付随地形は維持で問題ないが、検証で確認）。
- `stageValidation.ts`: fire サイズ前提の経路検証・難易度計測を**通常サイズ基準**へ更新（big/fire 寸法参照を除去）。

## D-8: テスト（E2E）

- 削除: 「fits a fire-size player on every declared critical path landing」「collects clockwork abilities, fires a pulse bolt, and reaches the beacon through gameplay wiring」「preserves fire movement through each stage transition and reaches all clear」。
- 改修: 「keeps maximum-size routes clear and raises difficulty stage by stage」を通常サイズ基準の経路検証へ（`stageValidation` 変更に追従）。
- 追加（任意・低コスト）: 被弾でライフが 1 減りその場で続行する契約を 1 本（`__capturedGame` で enemy overlap を誘発し lives 減少と isMissed=false を検証）。E2E が重い場合は gameplay 既存テストの範囲で担保。
- 既存の sprite/feet/legacy-index/landscape テストは維持（背景・足接地は不変）。

## D-9: ドキュメント同期

- `product-requirements.md`: 機能一覧から強化アイテム（F-00x の該当）・能力系記述を削除し、被弾=ライフ-1 を反映。
- `glossary.md`: ぜんまい / パルスコア / クロノクリスタル / big / fire / パルス弾 等の用語を削除。
- `repository-structure.md`: タイル凡例（M/F/S）・関連ファイル記述・マネージャ一覧（PowerUpManager の役割）を更新。
- `functional-design.md`: 能力・飛び道具・状態機械の記述があれば削除。
- `development-guidelines.md`: E2E ファサード節で能力系の記述があれば更新。

## 検証フロー
- 各フェーズ後 `npm run typecheck` 緑。
- 全フェーズ後 `npm run build` / `npm run test:e2e` 緑。
- `implementation-validator` 検証 → クルトワ（security-engineer）レビュー → コミット。

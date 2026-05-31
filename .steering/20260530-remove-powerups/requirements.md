# 要求内容 — 強化アイテムの全廃

## 背景・目的

シャビの指示により、プレイヤーの強化アイテム（パワーアップ）を全廃し、コア体験を「走る・跳ぶ・踏む・歯車片を集めてゴール」へ単純化する。
大きくなる要素・ファイアボール・無敵シールドといった能力レイヤを取り除き、ルール理解とステージ設計をシンプルにする。

## 廃止対象（シャビ確定事項）

| タイル | アイテム | 効果 | 扱い |
|--------|---------|------|------|
| `'M'` | ぜんまい（SpringCoil） | big 化（1.5倍） | **廃止** |
| `'F'` | パルスコア（PulseCore） | fire 化 + パルス弾発射 | **廃止** |
| `'S'` | クロノクリスタル（ChronoCrystal） | 一時無敵シールド（接触で敵撃破） | **廃止** |

- **3 種すべて廃止**する（シャビ確定）。
- 被弾後の短い無敵時間（i-frame / `startInvincible`）は**残す**（復活直後の理不尽連続死を防ぐため）。

## 仕様変更（被弾モデル）

- これまで: big/fire 時に被弾 → small へ縮小して耐える（サイズバッファ）。small で被弾 → ミス。
- 変更後: プレイヤーは常に通常サイズ（small 相当）。**被弾＝ライフ −1**（既存のライフ制 ♥×3 を維持）。被弾後その場で復活し短い無敵。ライフ 0 でゲームオーバー。
- パルス弾（飛び道具）廃止に伴い、関連入力（キーボード `Z` / スマホ右ダブルタップ）も撤去。

## 受け入れ条件

- [ ] big 化・fire 化・パルス弾・クロノシールドのいずれもゲーム中に発生しない。
- [ ] ステージから `'M'` / `'F'` / `'S'` タイルが除去され、空きマスとして成立する（到達性・ジャンプ可能性を壊さない）。
- [ ] 被弾でライフが 1 減り、その場復活＋短い無敵。ライフ 0 でゲームオーバー。
- [ ] HUD の操作説明から PULSE 関連表記が消える。
- [ ] 強化アイテムのスプライト/テクスチャ/SE/設定の未使用コードが残らない（デッドコード排除）。
- [ ] `npm run typecheck` / `npm run build` / `npm run test:e2e` が緑（能力系 E2E は仕様変更に合わせて削除/書換）。
- [ ] 関連する永続ドキュメント（PRD 機能一覧・用語集・タイル凡例等）を同期。

## 影響範囲（影響分析）

| 領域 | ファイル | 影響 |
|------|---------|------|
| 状態型 | `src/config/gameConfig.ts` | `PlayerState` 型、`BIG_SCALE`、`PLAYER_FIRE_TINT`、`PULSE_BOLT_*`、spring/pulseCore/chronoCrystal の寸法・色、`SE_PARAMS`（springCoil/pulseCore/pulseBolt/chronoCrystal）、`TEX_KEY`（同4種）、`HUD_PULSE_LABEL`、`CHRONO_*` 定数 |
| ゲーム中核 | `src/scenes/GameScene.ts`（最大・125箇所） | 状態機械、アイテム group（springCoils/pulseCores/chronoCrystals）、タイル `M/F/S` からの生成、各 overlap ハンドラ、パルス弾発射（`tryShootPulseBolt`/`pulseBolts`/`fireKey`）、`applyPlayerState`、被弾処理（`handleMiss`）、HUD 操作説明 |
| パワーアップ | `src/game/PowerUpManager.ts` | クロノシールド系を撤去。i-frame（`startInvincible`）は残置。`snapToNearbyGround` の要否を design で判断 |
| スプライト生成 | `src/scenes/spriteSheets.ts` / `src/scenes/BootScene.ts` | `buildSpringCoilSheet`/`buildPulseCoreSheet`/`buildChronoCrystalSheet`/`buildPulseBoltSheet` と登録呼び出しを撤去 |
| 入力 | `src/game/TouchController.ts` | 右ダブルタップ PULSE 発射、`PlayerState` 依存を撤去 |
| 当たり判定 | `src/game/CollisionHandler.ts` | spring/pulseCore/chrono/pulseBolt の overlap 登録を撤去 |
| 演出/音/イベント | `src/game/ParticleManager.ts`（`burstPulse`）/ `src/audio/AudioManager.ts`（`SeKey`）/ `src/game/events.ts` | 未使用化する分を撤去 |
| ステージ | `src/stages/stage01..03.ts` / `index.ts` / `stageValidation.ts` | `M/F/S` タイル除去、`TileChar` 型と凡例コメント更新、fire サイズ前提の経路検証を通常サイズへ |
| テスト | `tests/e2e/game-visual.spec.ts` | 「fits a fire-size player...」「collects clockwork abilities, fires a pulse bolt...」「preserves fire movement...」を削除/書換。「maximum-size routes」検証を通常サイズへ |
| ドキュメント | `docs/product-requirements.md` ほか | 機能一覧（F-00x）・用語集・タイル凡例・マネージャ一覧の同期 |

## スコープ外

- 歯車片（コイン）・巻きネジ障害機（敵）・ゴール・ライフ制そのものの仕様変更。
- ステージ数・地形レイアウトの再設計（アイテムタイルを空きにする以上の地形変更はしない。ただし到達性が壊れる箇所は最小限の地形調整可）。
- 見た目（HUD/背景/キャラ）の変更（前スプリントで完了済み）。

## 留意（CLAUDE.md 準拠）
- 本変更は基本設計（PRD 機能一覧・用語集）に影響するため、永続ドキュメント更新を計画に含める。
- 実装前に各作業ドキュメント（requirements→design→tasklist）をシャビ承認。
- コミット前にクルトワ（security-engineer）レビュー。

# tasklist.md — 新敵タイプ追加（時計トンボ / チクタク爆弾）

## P1: 設定・型・契約

- [x] T1-1: `gameConfig.ts` に TEX_KEY / ANIM_KEY / 寸法・色・速度・しきい値・PARTICLE_EXPLODE / SE_PARAMS.explode / MAX_ENEMIES_PER_STAGE を追加
- [x] T1-2: `stage01.ts` の `TileChar` に `'F'` `'B'` を追加、`EnemyType` 型を定義（export）
- [x] T1-3: `events.ts` に `GameEvents.EnemyExploded` を追加

## P2: スプライト・アニメーション

- [x] T2-1: `spriteSheets.ts` に `buildFlyerSheet`（時計トンボ）を実装
- [x] T2-2: `spriteSheets.ts` に `buildBombSheet`（チクタク爆弾）を実装
- [x] T2-3: `BootScene.ts` で両シートをビルド登録
- [x] T2-4: `animations.ts` に `flyerFly` / `bombIdle` / `bombTick` を登録

## P3: AI・演出ロジック

- [x] T3-1: `EnemyManager` に `player` を受け取り、`update()` を type で分岐（winder/flyer/bomb）
- [x] T3-2: flyer AI（重力無効・水平巡回・上下サイン P 制御）を実装
- [x] T3-3: bomb AI（idle→chase→fuse の状態遷移・崖際停止・導火テレグラフ・explode 発火）を実装
- [x] T3-4: `AudioManager` に `'explode'` SE を追加、`ParticleManager.burstExplosion` を実装

## P4: 配置・衝突・難易度

- [x] T4-1: `GameScene.buildStage` パーサ/バリデーションを `'F'`/`'B'` 対応・上限 20・配置ルール分岐へ拡張
- [x] T4-2: `GameScene.buildEnemies` を type 別の生成（テクスチャ/ボディ/初期 data/anim）へ拡張
- [x] T4-3: `onEnemyOverlap` を bomb 接触自爆対応、`EnemyExploded` ハンドラ（範囲ダメージ/SE/シェイク/バースト）を追加
- [x] T4-4: `stageValidation.measureStageDifficulty` の enemyCount を `'E'+'F'+'B'` 合算へ変更
- [x] T4-5: stage02 に flyer 2 体、stage03 に flyer 2 体 + bomb 2 体を配置

## P5: 検証

- [x] T5-1: `npm run typecheck` を通す
- [x] T5-2: `npm run build` を通す（既存のチャンクサイズ警告のみ。エラーなし）
- [x] T5-3: 難易度進行（score 8<30<42・gaps/elev 非減少）と配置ルールの整合を確認

## P6: 仕上げ

- [x] T6-1: 永続ドキュメント（glossary / functional-design）へ反映（敵 3 種・タイル `F`/`B`・敵カウント合算・AI/衝突分岐）
- [x] T6-2: 振り返りを本ファイルへ追記

---

## 振り返り（2026-06-01 実装完了）

### 計画と実績の差分
- ほぼ計画通り。新規ファイルは作らず既存 11 ファイルへの追記で完了（敵は単一グループ + `data.type` 分岐方針が効いた）。
- 当初 import した `FLYER_SPRITE_H` は飛行敵をタイル中心配置にしたため不要となり削除。
- 実装検証（ギュレル）の指摘で `groundAhead` に `halfW` 引数を追加（爆弾は `BOMB_SPRITE_W/2`）、`EnemyDir` 型を `stage01.ts` へ一元化。

### 学んだこと
- 飛行敵の上下動は速度直接代入だとドリフトするため、目標 Y への P 制御（`FLYER_BOB_K`）が安定。床へ沈まない自己補正になる。
- 範囲ダメージは `EnemyManager` に閉じず `EnemyExploded` イベント経由で GameScene に委譲することで、無敵/クリア/ミス中ガード（既存 `handleMiss`）を二重に持たず再利用できた。
- 新敵を難易度メトリクスの `enemyCount` に合算することで、`validateDifficultyProgression` の単調増加制約を自然に満たせる（score 8<30<42）。

### 検証結果
- `npm run typecheck` / `npm run build`: パス。
- Playwright E2E: 7/7 パス（難易度・クリアランス検証、敵被弾テスト含む）。

### 次回への改善提案
- 敵 AI / メトリクスのユニットテスト基盤（vitest 等）が無いため、現状は E2E と手動検算頼み。テストランナー導入を別途検討。
- 実機での見た目（トンボの羽ばたき・爆弾の導火点滅）はブラウザで最終確認推奨（[[character-redesign-no-preserve]] の原則）。
- `stage0X.minimumScore` は実スコアと乖離（下限の床として意図的）。意味づけをコメント補強済みだが、運用方針は要合意。

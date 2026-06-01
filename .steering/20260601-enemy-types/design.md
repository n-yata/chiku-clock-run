# design.md — 新敵タイプ追加（時計トンボ / チクタク爆弾）

設計責任: バルベルデ（architecture-designer）案をベースにモドリッチが実装設計へ落とし込み。

## 1. 全体方針

- 敵は引き続き **単一の `enemies` グループ**で管理し、各スプライトに `data: type`（`'winder' | 'flyer' | 'bomb'`）を
  持たせて `EnemyManager.update()` 内で AI を分岐する（既存の data 駆動パターンを踏襲）。
- 描画は既存 `spriteSheets.ts` のプロシージャル方式（高解像度キャンバスに描いて実フレームへダウンスケール）を踏襲し、
  新テクスチャ `flyer_sheet` / `bomb_sheet` を追加。`BootScene.create()` でビルド登録。
- 範囲ダメージ等の「プレイヤーへの影響」は `EnemyManager` 内に閉じず、`scene.events`（`EnemyExploded`）で
  `GameScene` に通知し、ダメージ・SE・シェイクは GameScene 側で処理（既存 `EnemyKilled` と同じ疎結合契約）。

## 2. データ構造 / 型

### 2.1 TileChar 拡張（stage01.ts）

```ts
export type TileChar = '.' | '#' | 'P' | 'G' | 'E' | 'F' | 'B' | 'C';
```

### 2.2 敵種別

```ts
export type EnemyType = 'winder' | 'flyer' | 'bomb';
```

スプライト data:
- `type: EnemyType`
- winder/bomb: `dir: -1|1`
- flyer: `originX`, `originY`, `dir`, `phase`
- bomb: `state: 'idle'|'chase'|'fuse'`, `fuseStart: number`

## 3. 配置・バリデーション（GameScene.buildStage）

- パーサで `'F'` / `'B'` を収集。`enemyPositions` を `{col,row,type}` に拡張。
- 上限: 合計敵数を **1..20** に緩和（現行 1..14）。
- `'B'`（と従来 `'E'`）は**真下 `#` 必須**。`'F'` は空中配置（真下チェック対象外）。
- `'F'` の自セルは `.`（パーサが拾うので結果的に保証）。クリアランス検証は `'#'` のみ対象のため
  空中敵は到達走路を侵さない。

## 4. AI 設計（EnemyManager）

`EnemyManager` のコンストラクタに `player: Phaser.Physics.Arcade.Sprite` を追加（追尾・範囲判定に必要）。
`update()` は type で分岐。

### 4.1 winder（既存・不変）
端反転＋壁反転で水平歩行。挙動・速度（`ENEMY_SPEED`）は据え置き。

### 4.2 flyer（時計トンボ）
- `body.allowGravity = false`。
- 水平: `dir` を維持し `setVelocityX(dir * FLYER_SPEED)`。`|x - originX| > FLYER_PATROL_HALF_PX` または
  `body.blocked.left/right` で反転。`setFlipX(dir > 0)`。
- 垂直: 目標 `targetY = originY + FLYER_BOB_AMP_PX * sin(FLYER_BOB_OMEGA * now + phase)` に対し
  P 制御 `setVelocityY((targetY - y) * FLYER_BOB_K)`。ドリフトを自己補正し床へ沈まない。

### 4.3 bomb（チクタク爆弾）
状態遷移（プレイヤー位置 `player.x/y` 参照）:
- `idle`: `setVelocityX(0)`。`|dx| < BOMB_DETECT_PX && |dy| < BOMB_DETECT_Y_PX` で `chase` へ。
- `chase`: プレイヤー方向へ `setVelocityX(sign(dx) * BOMB_SPEED)`。**崖際/壁では停止**（落下防止。前方足元が
  地面でない、または `body.blocked` 時 `setVelocityX(0)`）。`|dx| < BOMB_FUSE_TRIGGER_PX` かつ接地で `fuse` へ。
- `fuse`: 停止し点滅テレグラフ（`bomb_tick` フレーム/赤 tint トグル）。`now - fuseStart >= BOMB_FUSE_MS` で `explode()`。
  検知範囲を外れても導火は止めない（自爆確定）。

`explode(enemy)`: `scene.events.emit(EnemyExploded, {x,y})` → enemy を破棄。
（GameScene 側で範囲ダメージ・SE・シェイク・爆発バーストを実施。）

## 5. 撃破・衝突（GameScene）

- 既存 `onEnemyOverlap`:
  - stomp 判定（`pBody.velocity.y > 0 && pBody.center.y <= eBody.center.y`）成立 → `enemyManager.kill()`（3 種共通。
    bomb はこれで「導火前に解除」）。
  - 非 stomp（横/下から接触）:
    - bomb → `enemyManager.explode()`（接触自爆）＋ `handleMiss('enemy')`。
    - winder/flyer → `handleMiss('enemy')`（従来通り）。
- `EnemyExploded` ハンドラ（GameScene）:
  - `particles.burstExplosion(x, y)` / `audio.playSe('explode')` / `cameras.main.shake(...)`。
  - プレイヤーが `BOMB_BLAST_RADIUS_PX` 内なら `handleMiss('enemy')`（無敵中・クリア/ミス中はガード）。

## 6. 描画（spriteSheets.ts）

### 6.1 buildFlyerSheet（`flyer_sheet`, 48×40）
フレーム `flyer1` / `flyer2`（羽ばたき）。要素: 真鍮の細長い胴体（節）+ 文字盤胸部 + 半透明ティールの歯車羽（上下動）+ 触角 + 尾。

### 6.2 buildBombSheet（`bomb_sheet`, 40×40）
フレーム `bomb_idle` / `bomb_tick`。要素: 暗金属の球体 + 前面の時計文字盤（idle=穏やか / tick=赤く点灯）+ 頭頂のぜんまいキー兼導火 + 火花（tick で強調）+ 小さな脚。

## 7. アニメーション（animations.ts）

- `flyerFly`: flyer1↔flyer2、`FLYER_ANIM_FPS`、repeat -1。
- `bombIdle`: bomb_idle 静止。
- `bombTick`: bomb_idle↔bomb_tick、`BOMB_TICK_FPS`、repeat -1（導火中に再生）。

## 8. 演出（ParticleManager / events / audio）

- `events.ts`: `GameEvents.EnemyExploded`（payload `{x,y}`）追加。
- `ParticleManager.burstExplosion(x,y)`: `PARTICLE_EXPLODE`（橙〜赤・大粒・上方拡散）。
- `AudioManager.SeKey` に `'explode'` 追加、`SE_PARAMS.explode`（低めの破裂音）を定義。

## 9. 難易度メトリクス（stageValidation.ts）

- `measureStageDifficulty.enemyCount` を `'E'+'F'+'B'` の合算へ変更。
- 既存制約（スコア単調増加・gap/elevated 非減少）はそのまま。新敵は加算方向のみなので進行は維持。

## 10. config 追加（gameConfig.ts）

- TEX_KEY: `flyerSheet`, `bombSheet`。
- ANIM_KEY: `flyerFly`, `bombIdle`, `bombTick`。
- 寸法/色: `FLYER_SPRITE_W/H`, `BOMB_SPRITE_W/H`, 各色定数。
- flyer: `FLYER_SPEED`, `FLYER_BOB_AMP_PX`, `FLYER_BOB_OMEGA`, `FLYER_BOB_K`, `FLYER_PATROL_HALF_PX`, `FLYER_ANIM_FPS`。
- bomb: `BOMB_SPEED`, `BOMB_DETECT_PX`, `BOMB_DETECT_Y_PX`, `BOMB_FUSE_TRIGGER_PX`, `BOMB_FUSE_MS`,
  `BOMB_BLAST_RADIUS_PX`, `BOMB_TICK_FPS`, `BOMB_SHAKE_MS/INTENSITY`。
- 敵配置上限 `MAX_ENEMIES_PER_STAGE = 20`。
- `PARTICLE_EXPLODE`。SE: `SE_PARAMS.explode`。

## 11. 配置案（reachability を侵さない）

- stage02: 既存 winder 8 体維持。**flyer 2 体**を空中（row14 付近の `.` セル、走路上空）に追加 → 敵計 10、2 種。
- stage03: 既存 winder 12 体維持。**flyer 2 体 + bomb 2 体**を追加（bomb は床上＝真下 `#`） → 敵計 16、3 種。
- スコア: stage02 ≈ 10+gap*2+elev*2、stage03 はそれを上回る配置とし単調増加を保証（実装時に検証で確認）。

## 12. リスク / 留意

- flyer 配置が高すぎるとジャンプで届かず脅威にならない → 床上 2 タイル前後（row14 帯）に置く。
- bomb の追尾がピットへ落ちないよう崖際停止を必須化。
- 範囲ダメージは無敵/クリア/ミス中ガードを既存 handleMiss に委ねて二重被弾を防ぐ。

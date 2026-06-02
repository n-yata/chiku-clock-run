# 設計書

## アーキテクチャ概要

既存の GameScene と同じ「シーン + 専門マネージャ」構成を踏襲し、ボス固有のロジックを `BossController` に閉じ込める。新規シーン `BossScene` がアリーナ構築・プレイヤー制御・衝突・遷移を統括する。

```
GameScene.showAllClear()
   └─(差し替え)→ scene.start('BossScene', { gearsCollected, gearsTotal, lives })
                     │
   BossScene ────────┤ buildArena()        : 床/壁/足場（プログラム生成）
                     ├ PlayerController     : 既存再利用（移動/ジャンプ）
                     ├ CameraController     : 既存再利用（固定寄りの追従）
                     ├ HudManager           : 既存再利用（ライフ表示）
                     ├ ParticleManager      : 既存再利用（撃破/被弾演出）
                     ├ AudioManager         : 既存再利用（SE/BGM）
                     ├ BossHpBar            : 新規（上部 HP バー Graphics）
                     └ BossController       : 新規（状態機械/攻撃/弱点/被ダメージ）
                            │
                            └─(撃破)→ scene.start('EndingScene', { gearsCollected, gearsTotal })
```

ボス本体（大時計）は `EndingScene` と同じく Graphics（Container）で手続き的に描画する。可動物（振り子の錘・弱点コア・落下歯車）は既存テクスチャ `TEX_KEY.gearBit` を流用した Arcade スプライトで表現し、新規 PNG は追加しない。

## コンポーネント設計

### 1. BossScene（`src/scenes/BossScene.ts`）

**責務**:
- ボスアリーナ（床・左右の壁・足場）をプログラム生成する。
- プレイヤー生成・入力・カメラ・HUD・パーティクル・オーディオの初期化（GameScene の create を縮約して流用）。
- 衝突登録: プレイヤー×床、プレイヤー×振り子錘、プレイヤー×弱点コア、プレイヤー×落下歯車。
- 被弾処理（ライフ減算/ノックバック/ゲームオーバー）と R リスタート、撃破後の EndingScene 遷移。

**実装の要点**:
- `init(data)` で `gearsCollected` / `gearsTotal` / `lives` を受け取り、撃破時にそのまま EndingScene へ渡す。
- アリーナはカメラに収まる固定サイズ（横 = `VIEWPORT_WIDTH` の約 1.4 倍、縦 = `VIEWPORT_HEIGHT`）。床は最下段、左右に壁、ジャンプ到達可能な足場を 2〜3 枚。
- 被弾ロジックは GameScene の `handleMiss` / `decrementLifeAndContinue` / `showGameOver` を縮約移植（無敵・ノックバックは `PowerUpManager` 流用、または簡易フラグで実装）。
- 落下死（FALL_THRESHOLD_Y）はアリーナを閉じる（床全面）ので発生しない想定だが、保険として残す。

### 2. BossController（`src/game/BossController.ts`）

**責務**:
- ボスの状態機械（`intro` → `attack` ⇄ `vulnerable` → `defeated`）を駆動する。
- 攻撃: 振り子スイープ（錘の運動学的更新）と gear rain（落下歯車スポーン）。
- 弱点コアの露出/格納の制御（タイミング窓）。
- HP 管理と被ダメージ受付（`hit()` → HP-1, フェーズ進行, 撃破判定）。

**実装の要点**:
- `update(now)` を BossScene の `update()` から毎フレーム呼ぶ。
- 振り子の錘は重力無効の Arcade スプライト。位置は `pivot + L·(sinθ, cosθ)`, `θ = AMP·sin(ω·t)`。ω はフェーズで増加（`BOSS_PENDULUM_OMEGA_BY_PHASE`）。当たり判定は本体より小さめ（中央寄せ）。
- gear rain は `attack` 中に一定間隔で上端ランダム x から落下歯車をスポーン。重力 ON、床接触 or 画面下端で破棄。
- 弱点コア（光る歯車）は重力無効スプライト。`vulnerable` 開始時に踏める高さ（足場直上）へ tween で降下し、`BOSS_VULN_MS` 経過 or 被弾で上端へ tween 格納し `attack` へ。
- HP/状態はイベントで BossScene へ通知（`scene.events.emit`）。撃破は `BossDefeated` を発火。

### 3. BossHpBar（`src/game/BossHpBar.ts`）

**責務**:
- 画面上部中央にボス HP バー（3 セグメント）を描画・更新する。

**実装の要点**:
- `scrollFactor(0)` の Graphics。`layout()` で画面リサイズに追従。`setHp(current, max)` で再描画。
- ラベル「GRANDFATHER」をバー上に表示。

### 4. 衝突・踏みつけ判定（BossScene 内）

**責務**:
- 弱点コアとの overlap で「踏みつけ（上から/落下中）」と「被弾（横・下）」を判別する。

**実装の要点**:
- GameScene.onEnemyOverlap と同じ判定: `onTop = playerCenter.y <= coreCenter.y` かつ `velocity.y > 0` → 踏みつけ。
- 踏みつけ成立かつ `BossController.isVulnerable` のときのみ `boss.hit()`。露出していない/格納中は無効。
- 振り子錘・落下歯車との overlap は常に被弾（`handleMiss('enemy')`）。

## データフロー

### ボス戦の進行
```
1. stage03 ゴール → GameScene.showAllClear() が BossScene を起動（gears/lives を引き継ぎ）
2. BossScene.create(): アリーナ生成・各マネージャ初期化・BossController 起動（intro）
3. BossController: intro(短時間) → attack（振り子+gear rain, ATTACK_MS）
4. attack 終了 → vulnerable（弱点コア降下, VULN_MS）
5. プレイヤーが弱点コアを踏む → boss.hit() → HP-1, HpBar 更新, フェーズ進行
   - HP>0: 弱点コア格納 → attack（振り子 ω 上昇）へ戻る
   - HP=0: defeated → 崩壊演出 → EndingScene 起動
6. 被弾（振り子/歯車/弱点コア横下）→ ライフ-1（残ありはノックバック+無敵, 0 で GAME OVER → タイトル）
```

## エラーハンドリング戦略

### カスタムエラークラス
- 新規エラークラスは不要。既存方針（テクスチャ生成失敗は throw）に従う。

### エラーハンドリングパターン
- 弱点コア/錘スプライトの破棄は GameScene.explode と同様、物理ステップ中の即時 destroy を避け `delayedCall(0)` で遅延する（衝突走査中の配列変化によるフリーズ防止）。
- シーン `shutdown` で AudioManager / TouchController / タイマー / tween を破棄する。

## テスト戦略

本プロジェクトはランタイムが Phaser（DOM/Canvas 依存）で、既存 `src/game` には単体テストが整備されていない。本スプリントは以下で品質を担保する:

### 型・静的解析
- `npm run typecheck`（型整合）
- `npm run lint`（規約準拠）

### ビルド・手動検証
- `npm run build` 成功
- `npm run dev` で起動し、(a) stage03 クリア→ボス起動 (b) 弱点踏みで HP 減少 (c) 3 回で撃破→エンディング (d) 被弾でライフ減・0 でゲームオーバー、を実画面で確認（character-redesign-no-preserve の教訓: 実画面確認を必須とする）。

### 純粋ロジックの単体テスト（可能な範囲）
- 振り子位置計算 `pendulumPosition(t, params)` を純関数として切り出し、既知の t に対する座標を検証（境界: θ=0 で最下点、θ=±AMP で最大振れ）。

## 依存ライブラリ

新規追加なし（Phaser 3 のみ）。

## ディレクトリ構造

```
src/
  scenes/
    BossScene.ts        # 新規: ボス戦シーン
    GameScene.ts        # 変更: showAllClear() の遷移先を BossScene に差し替え
  game/
    BossController.ts   # 新規: ボス状態機械・攻撃・弱点・HP
    BossHpBar.ts        # 新規: ボス HP バー UI
  config/
    gameConfig.ts       # 変更: ボス関連定数を追加（TEX/色/タイミング/物理）
  main.ts               # 変更: BossScene をシーン登録
.steering/20260602-final-boss/
  requirements.md / design.md / tasklist.md
```

## 実装の順序

1. gameConfig にボス定数を追加
2. BossHpBar（UI 単体・依存少）
3. BossController（状態機械・攻撃・弱点・振り子純関数）
4. BossScene（アリーナ・各マネージャ統合・衝突・遷移）
5. main.ts にシーン登録 / GameScene.showAllClear の遷移差し替え
6. 型/Lint/ビルド + 実画面検証
7. 永続ドキュメント反映

## セキュリティ考慮事項

- 外部通信なし・入力は端末のキーボード/タッチのみ。ハードコードされた URL/シークレットは追加しない（クルトワのコミット前レビュー対象）。
- `sessionStorage` 利用は既存パターン（try/catch でフォールバック）を踏襲。

## パフォーマンス考慮事項

- 落下歯車・パーティクルは短命 emitter / 上限管理し、常時稼働 emitter を作らない（design §11 踏襲）。
- 落下歯車は床接触/画面外で確実に destroy してリークを防ぐ。同時生成数に上限を設ける。

## 将来の拡張性

- `BossController` の状態機械・攻撃テーブルを定数化しておくことで、攻撃パターン追加や 2 体目ボスへの拡張が容易。
- ボスを将来 `STAGES` 的なデータ駆動にしたくなった場合に備え、攻撃パラメータは gameConfig に集約する。

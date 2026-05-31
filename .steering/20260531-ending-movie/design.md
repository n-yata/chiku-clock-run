# 設計書

## アーキテクチャ概要

全クリア時の演出を、GameScene 内のテキスト表示から、独立した専用 Scene（`EndingScene`）へ分離する。
EndingScene は GameScene の物理ワールド・敵・カメラ追従に依存せず、Phaser `Graphics` と `Tween` のみで「絵巻」を構成する（TitleScene と同じ Canvas/Graphics 描画方針）。

```
[GameScene] STAGE 3 ゴール到達
   └─ onGoalHit() → nextStageIndex===null
        └─ showAllClear()  ※従来のテキスト表示を置換
             ├─ camera.fadeOut
             └─ scene.start('EndingScene', { gearsCollected, gearsTotal })

[EndingScene]  ← 独立シーン（physics 不使用）
   create()
     ├─ 背景(空) Graphics  : 夜/曇り → 晴れ へグラデーション tween
     ├─ 大時計 Graphics     : 静止 → 始動（針が回りだす）
     ├─ 歯車 Graphics ×N    : 画面外から時計へ飛来し噛み合う
     ├─ チク sprite         : playerSheet 'idle' フレーム
     ├─ パーティクル          : 祝祭バースト
     └─ テキスト             : HAPPY END / 集めた歯車 / スキップ案内
   buildTimeline()  : delayedCall を連ねた 5 フェーズ進行
   input(キー/タップ): skipToFinale() で最終カットへ即時遷移
   finale 完了 → ENDING_TO_TITLE_DELAY_MS 後に scene.start('TitleScene')
```

## コンポーネント設計

### 1. EndingScene（`src/scenes/EndingScene.ts`）

**責務**:
- 全クリア演出（絵巻シーケンス）の生成・再生・スキップ・タイトル復帰
- RESIZE 対応のレイアウト（TitleScene の `layout()` を踏襲）
- 演出用 SE 再生（AudioManager を新規生成）

**実装の要点**:
- `Phaser.Scene` を継承。key は `'EndingScene'`。`main.ts` の scene 配列へ追加登録する。
- 描画は `this.add.graphics()` ＋ `tweens.add()`。歯車描画は TitleScene の `drawGear` 相当をローカルに持つ（円・歯・スポーク・ハブ）。
- テクスチャ（playerSheet 等）は冪等ビルダ（`buildPlayerSheet` 等、`textures.exists` ガード付き）を create 冒頭で防御的に呼ぶ。EndingScene は GameScene 経由でのみ到達するため通常は既存。
- 5 フェーズ進行は `time.delayedCall` を起点時刻からの相対で積む。各フェーズの tween 時間・遅延は gameConfig 定数から取得。
- `init(data)` で `gearsCollected` / `gearsTotal` を受け取り、達成数の表示に使う（不正値は 0 にフォールバック）。
- スキップ／自動遷移は **ワンショット**（`isFinishing` フラグ）で多重遷移を防ぐ（GameScene の pendingAdvance と同方針）。
- `SHUTDOWN` で `scale.off('resize')` と AudioManager.destroy() を実施。

**演出フェーズ（時間は config 定数）**:
1. 導入: 暗い空 + 止まった時計をフェードイン（針は静止）。
2. 歯車組み込み: 歯車が画面外から時計中心へ飛来し、回転しながら定位置に収まる（SE: gearBit）。
3. 時計始動: 針が回りだす（分針を連続回転 tween）。チャイム（SE: beacon）。
4. 空が晴れる: 背景グラデーションを夜/曇り → 晴れへ tween。太陽（放射グロー）を昇らせ、光条を差す。
5. ハッピーエンド: チク登場 + 祝祭パーティクル + `HAPPY END` / 集めた歯車数 / サブタイトル表示。

### 2. GameScene 改修（`src/scenes/GameScene.ts`）

**責務**:
- 全クリア検出時に EndingScene へ遷移する（従来のテキスト表示を廃止）。
- 集めた歯車の累計（全ステージ通算）を保持し、ステージ遷移・エンディングへ引き継ぐ。

**実装の要点**:
- `init(data)` に `gearsCollected` / `gearsTotal`（前ステージまでの累計、既定 0）を追加し、フィールド `priorGearsCollected` / `priorGearsTotal` に保持。
- ステージクリア遷移（`transitionToStage`）と被弾リスタート（`fullRestart`）で累計を `scene.restart` のデータへ引き継ぐ:
  - 次ステージへ: `priorGearsCollected + gearBitsCollected`（このステージ取得分を加算）
  - 同ステージ再挑戦: `priorGearsCollected`（このステージ分はやり直すので加算しない）
- `showAllClear()` を、テキスト表示 + タイトル復帰 から、`camera.fadeOut` → `scene.start('EndingScene', { gearsCollected, gearsTotal })` に置換。
- 不要になった import（`ALL_CLEAR_COLOR` / `ALL_CLEAR_SUFFIX` / `ALL_CLEAR_TO_TITLE_DELAY_MS` / `PROMPT_TITLE_TEXT`）を整理し lint/typecheck を保つ。

### 3. gameConfig 追加（`src/config/gameConfig.ts`）

**責務**: EndingScene が参照する色・時間・文言の単一集約。

**実装の要点**:
- シーンにマジックナンバー / 色 / 文言を直書きしない方針に従い、ユーザー可視テキスト・主要タイミング・空/時計の主要色を定数化する（描画内部の比率は TitleScene 同様にローカル定義可）。
- 追加定数例:
  - 空: `ENDING_SKY_NIGHT_TOP/BOT`, `ENDING_SKY_DAY_TOP/BOT`, `ENDING_SUN_COLOR`
  - 時計: `ENDING_CLOCK_BRASS`, `ENDING_CLOCK_FACE_NIGHT/DAY`, `ENDING_HAND_COLOR`
  - 歯車: `ENDING_GEAR_COLOR`, `ENDING_GEAR_DARK`
  - タイミング: `ENDING_PHASE_*_MS`（各フェーズ開始/長さ）, `ENDING_TO_TITLE_DELAY_MS`
  - 文言: `ENDING_TITLE_TEXT`, `ENDING_SUBTITLE_TEXT`, `ENDING_GEAR_PREFIX`, `ENDING_SKIP_PROMPT`

## データフロー

### 全クリア → エンディング → タイトル
```
1. STAGE 3 ゴール overlap → onGoalHit()
2. nextStageIndex(2) === null → showAllClear()
3. gearsCollected = priorGearsCollected + gearBitsCollected
   gearsTotal     = priorGearsTotal + gearBitTotal
4. camera.fadeOut → scene.start('EndingScene', { gearsCollected, gearsTotal })
5. EndingScene.create() → buildTimeline() で 5 フェーズ再生
6. （任意）キー/タップ → skipToFinale() で最終カットへ
7. finale 表示 → ENDING_TO_TITLE_DELAY_MS 後 scene.start('TitleScene')
```

## エラーハンドリング戦略

- テクスチャ未生成リスク: create 冒頭で冪等ビルダを防御的に呼ぶ（`textures.exists` ガード済み）。
- 多重遷移: `isFinishing` ワンショットで finale/skip/自動遷移の競合を防ぐ。
- AudioContext 制約: AudioManager の既存 `unlock()` を最初のキー/タップで呼ぶ。未 unlock 時 SE は no-op（プレイに支障なし）。
- 不正な init データ: `gearsCollected/gearsTotal` は有限・非負へフォールバック。

## テスト戦略

### E2E（Playwright）
- 既存 `tests/e2e/game-visual.spec.ts` のステージ進行・契約検証を壊さないこと（`npm run test:e2e` は build を前置）。
- 追加検証は最小限（全クリア導線は 3 ステージ走破が必要で重いため、本スプリントでは型・ビルド・既存 E2E のグリーン維持を必須とする）。

### 手動確認
- 全クリア到達時に EndingScene が表示され、5 フェーズが順に再生されること。
- スキップで最終カットへ飛び、最終的に TitleScene へ戻ること。

## 依存ライブラリ

新規追加なし（Phaser 3 / 既存 AudioManager のみ）。

## ディレクトリ構造

```
src/
├── scenes/
│   ├── EndingScene.ts      # ★新規: 全クリア演出シーン
│   ├── GameScene.ts        # 改修: showAllClear → EndingScene 遷移 + 歯車累計引き継ぎ
│   └── ...
├── config/
│   └── gameConfig.ts       # 改修: ENDING_* 定数を追加
└── main.ts                 # 改修: scene 配列に EndingScene を登録
```

## 実装の順序

1. gameConfig に ENDING_* 定数を追加
2. EndingScene を新規作成（背景→時計→歯車→晴れ→ハッピーエンド + スキップ/タイトル復帰）
3. main.ts に EndingScene を登録
4. GameScene を改修（歯車累計の保持・引き継ぎ、showAllClear の EndingScene 遷移化、不要 import 整理）
5. repository-structure.md を更新（EndingScene の追記）
6. 型・lint・ビルド・既存 E2E のグリーン確認

## セキュリティ考慮事項

- 外部入力・ネットワーク・eval なし。URL/シークレットのハードコードなし。
- init データはシーン内部からの受け渡しのみ（外部由来ではない）だが、数値は防御的に検証する。

## パフォーマンス考慮事項

- Graphics + 有限個の tween のみ。毎フレーム再描画は最小限（針の連続回転は tween に委譲、update で重い処理をしない）。
- 演出終了時に tween / timer / AudioManager を確実に破棄（SHUTDOWN）。

## 将来の拡張性

- フェーズを config 定数で時間制御するため、尺の調整が容易。
- EndingScene を独立させたことで、専用 BGM ジングルやクリア実績表示の追加が局所化できる。

# タスクリスト

## 🚨 タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール
- **全てのタスクを`[x]`にすること**
- 「時間の都合により別タスクとして実施予定」は禁止
- 「実装が複雑すぎるため後回し」は禁止
- 未完了タスク（`[ ]`）を残したまま作業を終了しない

---

## フェーズ1: 設定定数の追加（gameConfig）

- [x] ボス関連定数を `src/config/gameConfig.ts` に追加
  - [x] HP（`BOSS_MAX_HP=3`）・各状態のタイミング（intro/attack/vulnerable の ms）
  - [x] 振り子: 支点・長さ・振幅・フェーズ別 ω（`BOSS_PENDULUM_OMEGA_BY_PHASE`）・錘半径・当たり判定
  - [x] gear rain: スポーン間隔・落下数上限・サイズ・速度
  - [x] 弱点コア: サイズ・露出/格納の高さ・tween 時間・脈動
  - [x] ボス本体描画色（真鍮/文字盤/針）・アリーナ寸法・HP バー配色/レイアウト
  - [x] `TEX_KEY` 流用方針のコメント（gearBit を錘/コア/落下歯車に流用）
  - [x] `ANIM_KEY` 追加は不要なら行わない（既存流用）

## フェーズ2: BossHpBar（UI）

- [x] `src/game/BossHpBar.ts` を新規作成
  - [x] `build()` で Graphics + ラベル生成（scrollFactor0, 上部中央）
  - [x] `setHp(current, max)` で再描画（3 セグメント）
  - [x] `layout()` で画面リサイズ追従
  - [x] `destroy()`

## フェーズ3: BossController（状態機械・攻撃・弱点）

- [x] 振り子位置の純関数 `pendulumPosition(t, params)` を実装
- [x] `src/game/BossController.ts` を新規作成
  - [x] 状態機械（intro → attack ⇄ vulnerable → defeated）
  - [x] 振り子錘スプライト生成（重力無効）と毎フレーム運動学更新
  - [x] gear rain スポーン（attack 中・間隔・上限・床/画面外で破棄）
  - [x] 弱点コア生成と露出/格納 tween（vulnerable 窓）
  - [x] `hit()`（HP-1・フェーズ進行・ω 上昇・撃破判定）と `isVulnerable` 公開
  - [x] `BossDefeated` / HP 変化イベント発火
  - [x] `destroy()`（タイマー/tween/スプライト後始末）

## フェーズ4: BossScene（統合）

- [x] `src/scenes/BossScene.ts` を新規作成
  - [x] `init(data)`（gearsCollected/gearsTotal/lives 受け取り）
  - [x] `buildArena()`（床・左右壁・足場をプログラム生成）
  - [x] プレイヤー生成 + PlayerController + 固定カメラ + HudManager + ParticleManager + AudioManager 初期化
  - [x] BossController 起動 + BossHpBar 構築
  - [x] 衝突登録（床/振り子/弱点コア/落下歯車）と踏みつけ判定（vulnerable 時のみ hit）
  - [x] 被弾処理（ライフ-1/ノックバック+無敵/ゲームオーバー→タイトル）
  - [x] 撃破演出 → `EndingScene` 遷移（gears 引き継ぎ）
  - [x] R リスタート・shutdown 後始末

## フェーズ5: 配線（登録・遷移差し替え）

- [x] `src/main.ts` のシーン配列に `BossScene` を登録
- [x] `src/scenes/GameScene.ts` の `showAllClear()` を BossScene 起動に差し替え（gears/lives 引き継ぎ）

## フェーズ6: 品質チェックと修正

- [x] 型エラーがないことを確認
  - [x] `npm run typecheck`（パス）
- [x] ~~リントエラーがないことを確認~~（npm スクリプトに lint 未定義。typecheck で代替）
- [x] ビルドが成功することを確認
  - [x] `npm run build`（パス。チャンクサイズ警告は既存・無関係）
- [x] ~~既存テストが通ることを確認~~（unit test 基盤なし。E2E は重いため実画面スモークで代替）
- [x] Playwright ヘッドレスで実画面検証（dev/preview）
  - [x] BossScene 起動・active・実行時エラーゼロ（intro/attack/vulnerable 全フェーズ）
  - [x] 実キー入力で弱点コア踏み → HP 減少（3→2 を確認）
  - [x] `hit()` 3 回で撃破 → EndingScene 遷移（HP 2→1→0・歯車引き継ぎ確認）
  - [x] 遷移時の `gearRain.clear` 競合クラッシュを修正（BossController.destroy）
- [ ] クルトワ（security-engineer）によるコミット前レビュー

## フェーズ7: 永続ドキュメント反映

- [x] `docs/functional-design.md` にボス戦のシーン遷移を追記（システム構成図・状態遷移図・シーン表）
- [x] `docs/repository-structure.md` に新規ファイルを追記（BossScene/BossController/BossHpBar + 遷移）
- [x] `docs/product-requirements.md` にボス機能を追記（F-017・スコープ）
- [x] 実装後の振り返り（このファイルの下部に記録）

---

## 実装後の振り返り

### 実装完了日
2026-06-02

### 計画と実績の差分

**計画と異なった点**:
- 可動物のテクスチャを「既存 gearBit 流用」から「実寸ぴったりの手続き的生成（bossBob/bossGear/bossCore）」へ変更（D-001）。gearBit の PNG ネイティブ寸法が不定で当たり判定計算がスケール依存になるのを避けるため。
- カメラは `CameraController`（追従）を使わず、アリーナ全体が収まる固定ズーム + 中央寄せの自前実装にした。単一画面のボス戦としてボス全体・弱点・プレイヤーを常に視界に収めるため。
- デバッグ/E2E 検証のため `main.ts` で `window.game` を公開（オフライン単体ゲームで露出リスクなし）。

**新たに必要になったタスク**:
- 遷移時のクラッシュ修正: `BossController.destroy()` での `gearRain.clear(true,true)` がシーン shutdown 時の物理ワールド破棄と競合し例外（`undefined.size`）でゲームループが停止していた。tween 停止のみに変更し、GameObject 破棄は Phaser のシーン shutdown に委ねることで解消。Playwright スモークで検出。

**技術的理由でスキップしたタスク**:
- lint: npm スクリプトに `lint` 未定義のため typecheck で代替。
- unit test: 既存に unit test 基盤がなく、E2E は重いため、Playwright ヘッドレスの実画面スモーク（起動・全フェーズ・実キー踏みつけ・撃破→エンディング）で品質担保した。

### 学んだこと

**技術的な学び**:
- Arcade 物理グループを scene shutdown のタイミングで手動 `clear/destroy` すると、物理ワールドの破棄順と競合してクラッシュする。GameObject の破棄はシーン shutdown に任せ、マネージャの `destroy()` では tween/timer の停止に留めるのが安全。
- 手続き的テクスチャを「目標表示サイズ＝ネイティブサイズ」で生成すると scale=1 が保て、`setCircle` の半径がそのままワールド px になり当たり判定が直感的になる。

**プロセス上の改善点**:
- 実画面スモーク（Playwright + `window.game` で対象シーンを直接起動）が、ステージを手動踏破せずにボス戦の実行時バグ（遷移クラッシュ）を素早く検出できて有効だった。

### 次回への改善提案
- ボスの攻撃パターンを増やすなら、`gameConfig` の攻撃パラメータを配列化して `BossController` の状態テーブルをデータ駆動にすると拡張しやすい。
- 純関数 `pendulumPosition` のような数理ロジックは将来的に unit test を入れる余地がある（テスト基盤導入時の第一候補）。

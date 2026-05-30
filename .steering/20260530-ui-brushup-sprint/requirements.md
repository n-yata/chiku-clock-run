# 要求内容 — UI・操作性・演出の大規模ブラッシュアップ

## 概要

`CHIKU CLOCK RUN` の遊び心地を一段引き上げる大規模ブラッシュアップ。操作性（ゲームフィール）、UI/UX、演出を改善し、同時に肥大化した `GameScene` を責務分離して保守性を高める。あわせて、縦持ちでも遊べてしまう現状を改め、CSS による強制回転表示で横画面体験を固定する。

## 背景

`GameScene.ts` が 1200 行超に肥大化し、入力・敵 AI・衝突判定・HUD・能力管理・タッチ操作を単一クラスが抱えている。基礎実装（定数集約・ステージ設計・Web Audio 合成）は良好だが、以下の体験的課題が判明した。

- ジャンプにコヨーテタイム・入力バッファ・可変高さが無く操作がシビア。着地感・敵踏みの手応えが薄い。カメラに先読みが無い。
- タッチでリスタートできない。ゲームオーバー / クリア時に操作できない待ち時間がある。操作説明が常時表示で画面を圧迫。UI 文言・スタイルの一部がハードコード。
- パーティクル・画面シェイク・ヒットストップが無く、フィードバックが地味。
- 横画面のみ対応の方針だが、ブラウザ通常表示では縦でも遊べる状態が残っている。

### 横画面方針の転換について（重要）

過去スプリント `20260527-landscape-only` では「ブラウザ API による強制回転 / orientation lock の追加」「縦向き端末への警告オーバーレイ追加」を**スコープ外**と明記し、`manifest` の `orientation: 'landscape'` 宣言のみで方針を表明する設計だった（`20260504-mobile-controls-responsive` で一度導入した縦向きオーバーレイをシャビ判断で削除した経緯による）。

本スプリントでは、シャビの判断により方針を転換し、**CSS による強制回転表示**で縦持ち時も横画面としてプレイ可能にする。これは過去決定の意図的な更新であり、`decisions.md` に記録し、関連 E2E 契約・永続ドキュメントを更新する。

## 影響分析

### 永続ドキュメントへの影響

| 文書 | 影響 | 理由 |
|------|------|------|
| `docs/architecture.md` | 更新必要 | `src/game/` マネージャ群による責務分離、演出（パーティクル/シェイク）、横画面=CSS回転方式を反映 |
| `docs/functional-design.md` | 更新必要 | 操作系（コヨーテ/バッファ/可変ジャンプ）、UI 再開フロー、タッチ閾値、横画面方式を設計へ反映 |
| `docs/repository-structure.md` | 更新必要 | `src/game/` 新ディレクトリと各マネージャの責務、particle テクスチャ追加を反映 |
| `docs/development-guidelines.md` | 更新必要 | E2E 依存ファサード維持ルール、新規 SE キー追加手順を追記 |
| `docs/product-requirements.md` | 更新必要 | 横画面対応を CSS 回転方式へ改訂（landscape-only 記述の更新） |
| `docs/glossary.md` | 更新必要 | コヨーテタイム / ジャンプバッファ / ヒットストップ / デッドゾーン等を追加 |

### 実装への影響

| 対象 | 想定変更 |
|------|----------|
| `src/config/gameConfig.ts` | フィール・カメラ・シェイク・タッチ・パーティクル・UI の定数を追加、既存ハードコード文言/スタイルを集約 |
| `src/game/`（新規） | 8 マネージャクラス + `events.ts` を新設し `GameScene` から責務を分離 |
| `src/scenes/GameScene.ts` | マネージャへ委譲。E2E 依存メソッド/プロパティはファサードとして残す |
| `src/scenes/spriteSheets.ts` / `BootScene.ts` | particle テクスチャ生成を追加 |
| `src/audio/AudioManager.ts` / `gameConfig.ts` | 着地 SE `land` を `SeKey` と `SE_PARAMS` に追加 |
| `index.html` | CSS 強制回転 + 縦横判定 JS を追加 |
| `tests/e2e/game-visual.spec.ts` | 横画面契約テスト（L31-43）を CSS 回転方式に合わせて書き換え |

## 実装対象の機能（5 本柱）

### 1. 操作性・ゲームフィール改善
- コヨーテタイム、ジャンプ入力バッファリング、可変ジャンプ高さ。
- 着地 SE + 軽い着地演出。敵踏み時のヒットストップ。
- 画面シェイク（敵踏み / 着地 / ゴール）。
- カメラのデッドゾーン + 進行方向先読み。
- タッチのスライド感度調整（12px→18px）+ 仮想ボタンの視覚フィードバック。

### 2. UI/UX 改善
- タッチ対応リスタート、ゲームオーバー / クリア時の「タップ/キーで再開・次へ」プロンプト（自動遷移を前倒し可能に）。
- 操作説明を開始時のみ表示 → フェードアウト。
- UI 文言・フォント・色の定数を `gameConfig.ts` に集約。

### 3. 演出強化
- パーティクル（歯車片取得 / 敵消滅 / 着地 / パルス弾衝突 / クリア星）。
- ステージクリア・全クリア・画面遷移の演出強化。

### 4. GameScene 責務分離リファクタ
- `src/game/` に PlayerController / TouchController / EnemyManager / PowerUpManager / CollisionHandler / HudManager / ParticleManager / CameraController を分離。
- 既存挙動を壊さず段階的に抽出。E2E 依存ファサードを `GameScene` に残す。

### 5. 横画面固定（CSS 強制回転方式）
- 縦持ち時にゲーム表示を 90° 回転させ、横画面としてプレイ可能にする。
- `matchMedia('(orientation: portrait)')` 購読で body クラス制御（E2E が禁止する `@media (orientation: portrait)` / `orientationchange` / `rotate-notice` 文字列を避ける実装）。
- Phaser のポインタ座標ズレ対策をプロトタイプ検証して確定。

## 受け入れ条件

### ゲームフィール
- [ ] 短押しで低く、長押しで高く跳ぶ（可変ジャンプ）。
- [ ] 崖を踏み外した直後でも一定時間ジャンプできる（コヨーテタイム）。
- [ ] 着地直前のジャンプ入力が着地時に発火する（入力バッファ）。
- [ ] 着地で SE と土煙、敵踏みでヒットストップと画面シェイクが発生する。
- [ ] カメラが進行方向を先読みする。

### UI/UX
- [ ] タッチでリスタートできる。
- [ ] ゲームオーバー / クリア時にタップ・キーで前倒し遷移できる。
- [ ] 操作説明が開始後にフェードアウトする。
- [ ] UI 文言・スタイルが `gameConfig.ts` に集約されている。

### 演出
- [ ] 歯車片取得 / 敵消滅 / 着地 / パルス弾衝突 / クリアでパーティクルが出る。

### 構造
- [ ] `GameScene` の責務が `src/game/` のマネージャへ分離されている。
- [ ] E2E が参照する `applyPlayerState` / `handleMiss` / `playerState` / `lives` / 各グループ等がファサードとして維持されている。

### 横画面
- [ ] 縦持ち時にゲームが 90° 回転して横画面として表示・操作できる。
- [ ] 回転表示時もタッチ位置がゲーム内座標と一致する。
- [ ] manifest の `orientation: 'landscape'` を維持する。

### 整合
- [ ] `npm run typecheck` / `npm run build` / `npm run test:e2e` が成功する。
- [ ] 横画面契約 E2E が CSS 回転方式に合わせて更新され成功する。
- [ ] 永続ドキュメントが本スプリントの変更を反映する。

## 成功指標
- 操作の手触り・UI・演出が体感で向上し、既存ゲームプレイに回帰が無い。
- `GameScene` の行数が大幅に削減され、責務がマネージャに分離されている。
- 縦持ち端末でも横画面として快適にプレイできる。

## スコープ外
- ゲームバランス（ステージ構成・難易度・能力性能）の変更。
- 新規ステージ・新規キャラクター・新規能力の追加。
- ゲームパッド対応、設定画面、ハイスコア保存。
- PWA / GitHub Pages 配信方式そのものの変更。
- `screen.orientation.lock()` 等のブラウザ強制回転 API の利用（iOS 非対応のため CSS 方式を採用）。

## 参照ドキュメント
- `docs/product-requirements.md` / `functional-design.md` / `architecture.md` / `repository-structure.md` / `development-guidelines.md` / `glossary.md`
- `.steering/20260527-landscape-only/` — 横画面方針の前提と過去決定
- `.steering/20260504-mobile-controls-responsive/decisions.md` — 縦向きオーバーレイ削除の経緯
- `.steering/20260528-アニメーション追加/` — 直近のやられ演出追加
- 承認済みプラン: `~/.claude/plans/ui-iridescent-lovelace.md`

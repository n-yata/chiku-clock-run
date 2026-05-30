# ユビキタス言語定義

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-04 |
| 最終更新 | 2026-05-30 |
| 担当 | モドリッチ |
| ステータス | 承認済み |

> プロジェクトで使用する用語の統一定義。
> コード上の命名・ドキュメント・チャットでの議論すべてで本書に従う。
> 新しい用語が出てきたら **該当カテゴリの末尾に追記** する。

---

## ドメイン用語

| 用語 | 英語 | 定義 |
|------|------|------|
| プレイヤー | Player | ユーザーが操作する時計工房の探索者「チク」。Canvas スプライトで表現する |
| ステージ | Stage | 1 プレイで踏破する 1 つのレベル。タイル 2 次元配列で定義される |
| タイル | Tile | ステージ定義の最小単位（`TILE_SIZE` px × `TILE_SIZE` px）。文字 1 文字が 1 タイルに対応 |
| スポーン位置 | Spawn Position | プレイヤーの初期出現位置。`'P'` タイルで指定。ミス時にはここへ戻る |
| クロックビーコン | Clock Beacon | ステージ最終地点の時計型発信機。`'G'` タイルで指定。プレイヤーが触れるとクリア判定 |
| 巻きネジ障害機 | Winder | ステージ内を徘徊する時計仕掛けの障害機。`'E'` タイルで配置 |
| 歯車片 | Gear Bit | プレイヤーが触れると取得できる収集物。`'C'` タイルで配置 |
| ぜんまい | Spring Coil | 取得するとプレイヤーが成長する能力アイテム。`'M'` タイルで配置 |
| パルスコア | Pulse Core | 取得するとパルス弾を撃てる能力アイテム。`'F'` タイルで配置 |
| クロノクリスタル | Chrono Crystal | 取得すると一定時間ダメージを無効化する能力アイテム。`'S'` タイルで配置 |
| パルス弾 | Pulse Bolt | パルス能力中に発射でき、障害機を停止させる投射物 |
| クリア | Clear | クロックビーコンに触れてステージを完了すること。クリア後は R キー / タッチでリスタート |
| ミス | Miss | 敵に横・下から接触、または落下閾値（`FALL_THRESHOLD_Y`）を超えたときの失敗状態。スポーン位置へリセットされる |
| 踏みつけ | Stomp | プレイヤーが敵の上から落下して当たること。敵を消滅させプレイヤーに反発速度を与える |
| HUD | HUD | 画面上に常時表示される歯車片取得数等の情報。カメラスクロールに追従しない（`setScrollFactor(0)`）|
| スコア | Score | 現行では歯車片取得数を表示する |
| ローカル生成アセット | Generated Asset | 時計工房の意匠に合わせてスクリプトまたは Canvas ビルダーで再現可能に生成する画像・スプライト |
| リスタート | Restart | ステージを初期状態に戻すこと。通常は `scene.restart()` を使い、障害再発時のみ全体リロードへ切り替えられる |
| 落下 | Fall | プレイヤーの Y 座標が `FALL_THRESHOLD_Y` を超えた状態。ミスと同一フローでリセットされる |
| タッチゾーン | Touch Zone | タッチ入力の画面領域区分。左側スライドで移動し、右側タップでジャンプ、能力中は右側ダブルタップで発射する |
| コヨーテタイム | Coyote Time | 崖から足を踏み外した直後（`COYOTE_TIME_MS` 以内）でもジャンプを受け付けるゲームフィール改善技術。空中にいても地面にいるとみなしてジャンプを許容する |
| ジャンプバッファ | Jump Buffer | 着地直前（`JUMP_BUFFER_MS` 以内）のジャンプ入力を保持し、着地と同時に自動発火する技術。タイミングが合わなかったジャンプ操作をカバーする |
| 可変ジャンプ | Variable Jump | ジャンプボタンを早く離すと低く、長押しすると高くなるジャンプ。上昇中にボタンを離すと `vy *= JUMP_CUT_MULTIPLIER` で上昇速度を減衰させ、`MIN_JUMP_VELOCITY` でクランプする |
| ヒットストップ | Hitstop | 敵を踏んだ瞬間に物理演算を `HITSTOP_MS` だけ停止し、手応えを演出するゲームフィール技術。物理のみ停止し、音声・描画は継続する |
| カメラデッドゾーン | Camera Deadzone | プレイヤーがこの矩形内に留まる間はカメラ追従しない領域。小さな動きでカメラが揺れるのを防ぐ（`CAMERA_DEADZONE_W` × `CAMERA_DEADZONE_H`） |
| カメラ先読み | Camera Lookahead | プレイヤーの移動方向に先んじてカメラのフォローオフセットを補間することで、進行方向の視野を広げる技術 |
| マネージャ群 | Manager Classes | `src/game/` 配下の 8 プレーンクラス（`CameraController` / `HudManager` / `ParticleManager` / `TouchController` / `PlayerController` / `EnemyManager` / `PowerUpManager` / `CollisionHandler`）。GameScene から責務を分散受け取りする |
| GameEvents | GameEvents | `src/game/events.ts` の文字列定数オブジェクト。`player:land` / `enemy:killed` / `gear:collected` 等の文字列でマネージャ間の疎結合連携を実現する |

---

## 音声用語

| 用語 | 英語 | 定義 |
|------|------|------|
| SE | Sound Effect | ゲーム内イベント（ジャンプ・歯車片取得・踏みつけ・ミス・ビーコン到達・能力取得）に対応する効果音。`AudioManager.playSe()` で再生 |
| BGM | Background Music | ステージ中ループ再生されるバックグラウンドミュージック。16 ステップの矩形波アルペジオ。`AudioManager.startBgm()` / `stopBgm()` で制御 |
| AudioManager | AudioManager | `src/audio/AudioManager.ts` に実装された音声合成クラス。Web Audio API を使い `OscillatorNode` / `GainNode` の短命グラフで SE と BGM を生成する。Phaser に非依存 |
| AudioContext unlock | AudioContext unlock | iOS Safari では最初のユーザー入力イベントのコールスタック内で `AudioContext` を生成・resume しないと音が出ない制約がある。`AudioManager.unlock()` が最初のキー押下 / タップで呼ばれることでこの制約を回避する |

---

## ソフトウェア用語

| 用語 | 英語 | 定義 |
|------|------|------|
| Phaser 3 | Phaser 3 | 本プロジェクトで採用している 2D ブラウザゲームエンジン。Scene / Physics / Input / Camera を提供 |
| Arcade Physics | Arcade Physics | Phaser の軽量 AABB 物理エンジン。重力・速度・衝突判定を提供する |
| シーン | Scene | Phaser の実行単位。本プロジェクトでは `BootScene`（読込・生成）、`TitleScene`（開始画面）、`GameScene`（ゲームランタイム）の 3 シーン構成 |
| StaticGroup | StaticGroup | 物理的に動かない Sprite の集合（地面・歯車片・能力アイテム）。位置変更後は `refreshBody()` を呼ぶ必要がある |
| Group | Group | 動的に動く Sprite の集合（敵）。毎フレーム物理演算が走る |
| Overlap | Overlap | 物理的に停止させずに接触を検出する Phaser の仕組み。ビーコン判定・歯車片取得・障害機踏みつけに使用 |
| Collider | Collider | 物理的な衝突応答を伴う Phaser の仕組み。プレイヤー・敵と地面の衝突に使用 |
| groundMask | groundMask | ステージ全タイルの地面有無を `boolean[][]` で表したキャッシュ。敵 AI の段差端検出に O(1) で参照 |
| StageDefinition | StageDefinition | ステージを表す TypeScript インターフェース。`id` / `cols` / `rows` / `tiles: string[]` を持つ |
| BuiltStage | BuiltStage | `buildStage()` が `StageDefinition` から構築した実行時オブジェクト群（Phaser Sprite / Group / 座標情報）|
| TileChar | TileChar | タイル文字の型定義。`'.' | '#' | 'P' | 'G' | 'E' | 'C' | 'M' | 'F' | 'S'` のユニオン型 |
| Vite | Vite | フロントエンドビルドツール。HMR 付き開発サーバーと本番ビルド（TypeScript コンパイル含む）を提供 |
| TypeScript | TypeScript | 本プロジェクトの実装言語（JavaScript の型付きスーパーセット）。v5.4 を使用 |

---

## インフラ用語

| 用語 | 英語 | 定義 |
|------|------|------|
| GitHub Pages | GitHub Pages | 静的ファイルのホスティングサービス。`main` push 時に GitHub Actions 経由で自動デプロイされる |
| GitHub Actions | GitHub Actions | CI/CD 実行環境。`main` push トリガで `npm run build` → Pages デプロイを実行 |
| Fastly CDN | Fastly CDN | GitHub Pages の前段に位置する CDN。Gzip / キャッシュを提供（GitHub 標準、設定不要）|
| Dev Container | Dev Container | VS Code Remote Containers による開発環境。Node.js 20 + Claude Code CLI を含む |
| code-tunnel | code-tunnel | Dev Container 内で使用する VS Code CLI。`code-tunnel tunnel` で Remote Tunnel を起動する |

---

## コード上の命名規則

### TypeScript

| コード上の名前 | ルール | 例 |
|-------------|------|-----|
| クラス名 | PascalCase | `BootScene`, `GameScene` |
| インターフェース / 型名 | PascalCase | `StageDefinition`, `BuiltStage`, `TileChar` |
| 定数（単一値） | SCREAMING_SNAKE_CASE | `TILE_SIZE`, `GRAVITY_Y`, `PLAYER_SPEED` |
| 定数（オブジェクト） | SCREAMING_SNAKE_CASE | `TEX_KEY`, `STAGE_01` |
| 変数 / 関数 | camelCase | `buildStage`, `handleMiss`, `groundMask` |
| ファイル名（クラス export） | PascalCase.ts | `BootScene.ts`, `GameScene.ts` |
| ファイル名（定数・データ） | camelCase.ts または lowercase.ts | `gameConfig.ts`, `stage01.ts` |

### 主要な定数・型の意味

| コード上の名前 | 意味 |
|-------------|------|
| `TEX_KEY` | テクスチャキー文字列の定数オブジェクト。`TEX_KEY.player` / `TEX_KEY.ground` 等でキー文字列を参照 |
| `STAGE_01` | ステージ 1 の定義定数（`StageDefinition` 型）。`src/stages/stage01.ts` で定義 |
| `FALL_THRESHOLD_Y` | プレイヤーがこの Y 座標を超えるとミス（落下）判定。`VIEWPORT_HEIGHT + 200` |
| `TOUCH_SLIDE_THRESHOLD_PX` | 左ゾーンのスライド判定しきい値（px）。ベース X からこの値を超えた時点で左右移動を開始する |
| `TOUCH_ZONE_SPLIT_RATIO` | タッチゾーン分割比率（0.5 = 画面中央）。左ゾーン（スライド移動）/ 右ゾーン（ジャンプ）を分ける |
| `STOMP_TOLERANCE_PX` | 踏みつけ判定のトレランス（px）。`player.bottom <= enemy.top + STOMP_TOLERANCE_PX` |
| `STOMP_BOUNCE_VELOCITY` | 踏みつけ成功時にプレイヤーへ与える Y 方向の反発速度 |
| `VITE_BASE_PATH` | GitHub Pages の配信パス（`/<repo>/`）を設定する環境変数。`vite.config.ts` で参照 |

---

## 環境変数

| 名前 | 用途 | デフォルト | 設定先 |
|-----|------|----------|-------|
| `VITE_BASE_PATH` | Vite の `base` パス（GitHub Pages サブパス解決用） | `/` | CI: `.github/workflows/deploy.yml` / ローカル: 省略可 |

---

## 略語・頭字語

| 略語 | 正式名称 | 定義 |
|------|---------|------|
| HUD | Heads-Up Display | 画面上に常時オーバーレイ表示される情報（歯車片数等） |
| CSP | Content Security Policy | ブラウザが外部リソース読み込みを制御するセキュリティポリシー |
| FPS | Frames Per Second | 1 秒あたりの描画フレーム数。本プロジェクトの目標値は 60 fps |
| CDN | Content Delivery Network | 静的コンテンツを地理的に分散配信するネットワーク |
| CI/CD | Continuous Integration / Continuous Delivery | 自動ビルド・自動デプロイの仕組み |
| AABB | Axis-Aligned Bounding Box | 軸方向に揃った矩形による衝突判定（Arcade Physics の基本方式） |
| CSR | Client-Side Rendering | ブラウザ側で描画を完結させる方式。本プロジェクトはこの方式 |

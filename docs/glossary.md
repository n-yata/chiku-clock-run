# ユビキタス言語定義

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-04 |
| 最終更新 | 2026-05-04 |
| 担当 | モドリッチ |
| ステータス | 承認済み |

> プロジェクトで使用する用語の統一定義。
> コード上の命名・ドキュメント・チャットでの議論すべてで本書に従う。
> 新しい用語が出てきたら **該当カテゴリの末尾に追記** する。

---

## ドメイン用語

| 用語 | 英語 | 定義 |
|------|------|------|
| プレイヤー | Player | ユーザーが操作する自機キャラクター。赤い四角のプレースホルダで表現（v0.2 時点） |
| ステージ | Stage | 1 プレイで踏破する 1 つのレベル。タイル 2 次元配列で定義される |
| タイル | Tile | ステージ定義の最小単位（`TILE_SIZE` px × `TILE_SIZE` px）。文字 1 文字が 1 タイルに対応 |
| スポーン位置 | Spawn Position | プレイヤーの初期出現位置。`'P'` タイルで指定。ミス時にはここへ戻る |
| ゴール | Goal | ステージ最終地点のオブジェクト。`'G'` タイルで指定。プレイヤーが触れるとクリア判定 |
| 敵 | Enemy | ステージ内を徘徊する障害キャラクター（クリボー風）。`'E'` タイルで配置 |
| コイン | Coin | プレイヤーが触れると取得できるアイテム。`'C'` タイルで配置 |
| クリア | Clear | ゴールに触れてステージを完了すること。クリア後は R キー / タッチでリスタート |
| ミス | Miss | 敵に横・下から接触、または落下閾値（`FALL_THRESHOLD_Y`）を超えたときの失敗状態。スポーン位置へリセットされる |
| 踏みつけ | Stomp | プレイヤーが敵の上から落下して当たること。敵を消滅させプレイヤーに反発速度を与える |
| HUD | HUD | 画面上に常時表示されるコイン取得数等の情報。カメラスクロールに追従しない（`setScrollFactor(0)`）|
| スコア | Score | v0.2 時点ではコイン取得数のみで集計。敵撃破スコアは v0.3 以降 |
| プレースホルダ | Placeholder | 外部アセット未導入の現状で `BootScene` がプログラム生成する色付き四角テクスチャ |
| リスタート | Restart | ステージを初期状態に戻すこと。`window.location.reload()` によるページ全体のリロードで実現 |
| 落下 | Fall | プレイヤーの Y 座標が `FALL_THRESHOLD_Y` を超えた状態。ミスと同一フローでリセットされる |
| タッチゾーン | Touch Zone | タッチ入力の画面領域区分。画面左半分（ジャンプ）/ 右半分（移動）に分割 |

---

## ソフトウェア用語

| 用語 | 英語 | 定義 |
|------|------|------|
| Phaser 3 | Phaser 3 | 本プロジェクトで採用している 2D ブラウザゲームエンジン。Scene / Physics / Input / Camera を提供 |
| Arcade Physics | Arcade Physics | Phaser の軽量 AABB 物理エンジン。重力・速度・衝突判定を提供する |
| シーン | Scene | Phaser の実行単位。本プロジェクトでは `BootScene`（テクスチャ生成）と `GameScene`（ゲームランタイム）の 2 シーン構成 |
| StaticGroup | StaticGroup | 物理的に動かない Sprite の集合（地面・コイン）。位置変更後は `refreshBody()` を呼ぶ必要がある |
| Group | Group | 動的に動く Sprite の集合（敵）。毎フレーム物理演算が走る |
| Overlap | Overlap | 物理的に停止させずに接触を検出する Phaser の仕組み。ゴール判定・コイン取得・敵踏みつけに使用 |
| Collider | Collider | 物理的な衝突応答を伴う Phaser の仕組み。プレイヤー・敵と地面の衝突に使用 |
| groundMask | groundMask | ステージ全タイルの地面有無を `boolean[][]` で表したキャッシュ。敵 AI の段差端検出に O(1) で参照 |
| StageDefinition | StageDefinition | ステージを表す TypeScript インターフェース。`id` / `cols` / `rows` / `tiles: string[]` を持つ |
| BuiltStage | BuiltStage | `buildStage()` が `StageDefinition` から構築した実行時オブジェクト群（Phaser Sprite / Group / 座標情報）|
| TileChar | TileChar | タイル文字の型定義。`'.' | '#' | 'P' | 'G' | 'E' | 'C'` のユニオン型 |
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
| `TOUCH_HOLD_MS` | タッチが「長押し（移動）」と判定されるまでの時間（ms）。短タップはジャンプとして扱う |
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
| HUD | Heads-Up Display | 画面上に常時オーバーレイ表示される情報（コイン数等） |
| CSP | Content Security Policy | ブラウザが外部リソース読み込みを制御するセキュリティポリシー |
| FPS | Frames Per Second | 1 秒あたりの描画フレーム数。本プロジェクトの目標値は 60 fps |
| CDN | Content Delivery Network | 静的コンテンツを地理的に分散配信するネットワーク |
| CI/CD | Continuous Integration / Continuous Delivery | 自動ビルド・自動デプロイの仕組み |
| AABB | Axis-Aligned Bounding Box | 軸方向に揃った矩形による衝突判定（Arcade Physics の基本方式） |
| CSR | Client-Side Rendering | ブラウザ側で描画を完結させる方式。本プロジェクトはこの方式 |

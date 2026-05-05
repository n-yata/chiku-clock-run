# リポジトリ構造定義書

> 本プロジェクトはフロント単体構成（バックエンドなし）。

## ディレクトリ構成

```
mario-game/
├── src/                          # アプリケーション本体（TypeScript + Phaser 3）
│   ├── main.ts                   # Phaser.Game エントリポイント
│   ├── audio/                    # 音声合成レイヤ（Web Audio API、Phaser 非依存）
│   │   └── AudioManager.ts       # SE 5 種 + BGM ループの合成・再生・iOS unlock
│   ├── scenes/                   # Phaser Scene 群
│   │   ├── BootScene.ts          # プレースホルダ動的生成 → TitleScene へ遷移（リロード復帰時は GameScene 直行）
│   │   ├── TitleScene.ts         # タイトル画面（SPACE/Enter/Tap でゲーム開始、全クリア後に自動遷移で戻り先）
│   │   └── GameScene.ts          # ランタイム（地形構築・操作・カメラ・ゴール・リスタート・音声）
│   ├── config/                   # ゲーム全体の定数集約
│   │   └── gameConfig.ts         # 物理・寸法・閾値・テクスチャキー・SE/BGM パラメータ
│   └── stages/                   # ステージデータ
│       ├── index.ts              # STAGES 配列・getStage / nextStageIndex ユーティリティ
│       ├── stage01.ts            # STAGE_01 定数（StageDefinition 型）
│       ├── stage02.ts            # STAGE_02 定数
│       └── stage03.ts            # STAGE_03 定数
├── scripts/                      # ビルド補助スクリプト（Node.js、標準ライブラリのみ）
│   └── generate-icons.mjs        # PWA アイコン生成（192/512/maskable-512 の RGBA PNG 3 種）
├── public/                       # Vite 静的ファイル（dist/ にそのままコピー）
│   ├── icons/                    # PWA アイコン（generate-icons.mjs で生成）
│   │   ├── icon-192.png          # 192×192 RGBA PNG（通常アイコン）
│   │   ├── icon-512.png          # 512×512 RGBA PNG（通常アイコン）
│   │   └── icon-maskable-512.png # 512×512 RGBA PNG（maskable、80% safe zone 適用）
│   └── assets/
│       └── images/               # スプライト PNG（Kenney "Pixel Platformer" CC0）※src/ に移動済み
│           └── KENNEY_LICENSE.txt  # CC0 ライセンス原文
├── index.html                    # Vite エントリ HTML（CSP `<meta>` 含む）
├── vite.config.ts                # Vite 設定（base パスは VITE_BASE_PATH から取得）
├── tsconfig.json / tsconfig.node.json  # TypeScript 設定
├── package.json                  # 依存（phaser のみ） + scripts
├── docs/                         # 永続的ドキュメント（6 本）
│   ├── product-requirements.md   # プロダクト要件定義書
│   ├── functional-design.md      # 機能設計書
│   ├── architecture.md           # 技術仕様書
│   ├── repository-structure.md   # リポジトリ構造定義書（本ファイル）
│   ├── development-guidelines.md # 開発ガイドライン
│   ├── glossary.md               # ユビキタス言語定義
│   └── template/                 # 永続的ドキュメントのひな形
├── .steering/                    # 作業単位のステアリングファイル
│   ├── template/
│   └── [YYYYMMDD]-[開発タイトル]/  # スプリント単位（requirements/design/tasklist/decisions）
├── .github/
│   └── workflows/
│       └── deploy.yml            # main push → build → GitHub Pages デプロイ
├── .devcontainer/                # Dev Container 定義
├── .claude/                      # Claude Code プロジェクト固有設定（skill 等）
├── CLAUDE.md                     # プロジェクト全体ルール
└── README.md                     # クイックスタート + スクリプト一覧
```

---

## ディレクトリの役割

| ディレクトリ / ファイル | 役割 |
|----------------------|------|
| `src/main.ts` | `Phaser.Game` 起動。`gameConfig` から viewport / 重力 / 背景色を取得 |
| `src/audio/AudioManager.ts` | Web Audio API による SE 5 種（ジャンプ・コイン・踏みつけ・ミス・ゴール）と BGM ループの合成・再生。`unlock()` で iOS Safari の AudioContext 制約に対応。Phaser 非依存の純粋クラス |
| `src/scenes/BootScene.ts` | `Graphics.generateTexture()` でプレイヤー / 地面 / ゴール / 敵 / コインのプレースホルダを生成。通常起動は `TitleScene`、リロードフォールバック時は `GameScene` へ遷移 |
| `src/scenes/TitleScene.ts` | タイトルテキスト + 「Press SPACE / Tap to Start」プロンプト（点滅）を表示。SPACE / Enter / タップで `GameScene` へ遷移。`Scale.RESIZE` 対応の `layout()` で中央配置を維持。全クリア後の自動遷移先 |
| `src/scenes/GameScene.ts` | ステージ構築 / プレイヤー操作 / カメラ追従 / 敵 AI（壁・段差端反転）/ コイン取得 / スコア HUD / ミス演出 + 完全リスタート / ゴール Overlap / R リスタート（→ TitleScene）/ AudioManager 統合 |
| `src/config/gameConfig.ts` | 物理（GRAVITY_Y / PLAYER_SPEED / JUMP_VELOCITY 等）・敵 / コイン物理・ミス演出・HUD スタイル・SE/BGM パラメータ・寸法・閾値・テクスチャキーの単一集約点 |
| `src/stages/stage01.ts` | 1 ステージ分のタイル定義（`'.', '#', 'P', 'G', 'E', 'C'` で構成された 2 次元文字列配列。`'E'` は敵、`'C'` はコイン） |
| `index.html` | Vite エントリ HTML。CSP `<meta>` で `default-src 'self'` 系を設定 |
| `scripts/generate-icons.mjs` | PWA アイコン生成スクリプト。Node.js 標準ライブラリ（`node:zlib` / `node:fs` / `node:path`）のみ使用。`npm run generate-icons` で実行。赤背景（#E52521）+ 白「M」のアイコンを 3 種生成 |
| `public/icons/` | PWA アイコン 3 種。`manifest.webmanifest` から参照される。`generate-icons.mjs` で再生成可能 |
| `vite.config.ts` | `base: process.env.VITE_BASE_PATH ?? '/'`（GitHub Pages 配下用）。`VitePWA` プラグインで manifest / SW を自動生成 |
| `docs/` | 永続的ドキュメント 6 本（`product-requirements.md` / `functional-design.md` / `architecture.md` / `repository-structure.md` / `development-guidelines.md` / `glossary.md`） |
| `docs/template/` | 永続的ドキュメントのひな形 |
| `.steering/[YYYYMMDD]-[開発タイトル]/` | スプリント単位の要求・設計・タスクリスト・決定事項ログ |
| `.steering/template/` | スプリント単位ドキュメントのひな形 |
| `.github/workflows/deploy.yml` | `main` push トリガで `npm run build` → `actions/deploy-pages@v4` |
| `.devcontainer/` | Dev Container（Node.js 20 + Claude Code CLI + code-tunnel） |
| `.claude/` | Claude Code skill（`permanent-doc`, `steering-doc`, `init`, `review`, `security-review`）と settings |

---

## ファイル配置ルール

- 永続的ドキュメントは `docs/` 直下に配置
- 作業単位のドキュメントは `.steering/[YYYYMMDD]-[開発タイトル]/` に配置
- 物理定数・閾値・テクスチャキー・HUD スタイル文字列は `src/config/gameConfig.ts` に集約。シーンファイルにマジックナンバー / 色 / HUD 文言の直書き禁止
- ステージデータは `src/stages/` に 1 ファイル 1 ステージで配置（`stage01.ts` / `stage02.ts` / `stage03.ts`）
- PWA アイコンは `public/icons/` に配置。`scripts/generate-icons.mjs` で再生成可能（`npm run generate-icons`）
- 機密情報を含むファイル（`.env`, シークレット鍵 等）は `.gitignore` 対象（本案件では発生しない想定）

---

## 命名規則

### ステアリングディレクトリ

```
.steering/[YYYYMMDD]-[開発タイトル]/
```

- `YYYYMMDD`: 着手日
- `開発タイトル`: 半角英数字 + ハイフン区切り（例: `minimum-playable`）

### ドキュメントファイル

- 永続的ドキュメント: `kebab-case.md`（例: `architecture.md`, `repository-structure.md`）
- 作業単位ドキュメント: `requirements.md` / `design.md` / `tasklist.md` / `decisions.md` / `perf-report.md` の固定ファイル名

### コードファイル

- TypeScript: `PascalCase.ts`（クラスを export するファイル: 例 `BootScene.ts`）/ `camelCase.ts`（定数モジュール: 例 `gameConfig.ts`）/ `lowercase.ts`（データモジュール: 例 `stage01.ts`）

---

## .gitignore 対象（主なもの）

- ビルド成果物（`dist/`）
- 依存関係ディレクトリ（`node_modules/`）
- 個人環境設定（`.vscode/settings.json` 等）
- 機密ファイル（`.env`, `.env.local`, `*.pem`, `*.key`, `secrets/`）
- Claude Code ローカル設定（`.claude/settings.local.json`）
- キャッシュ・一時ファイル（`.cache/`, `tmp/`, `*.log` 等）

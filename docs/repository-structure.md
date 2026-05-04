# リポジトリ構造定義書

> v0.1 時点での薄いたたき。本プロジェクトはフロント単体構成（バックエンドなし）。

## ディレクトリ構成

```
mario-game/
├── src/                          # アプリケーション本体（TypeScript + Phaser 3）
│   ├── main.ts                   # Phaser.Game エントリポイント
│   ├── scenes/                   # Phaser Scene 群
│   │   ├── BootScene.ts          # プレースホルダ動的生成 → GameScene へ遷移
│   │   └── GameScene.ts          # ランタイム（地形構築・操作・カメラ・ゴール・リスタート）
│   ├── config/                   # ゲーム全体の定数集約
│   │   └── gameConfig.ts         # 物理・寸法・閾値・テクスチャキー
│   └── stages/                   # ステージデータ
│       └── stage01.ts            # StageDefinition 型 + STAGE_01 定数
├── index.html                    # Vite エントリ HTML（CSP `<meta>` 含む）
├── vite.config.ts                # Vite 設定（base パスは VITE_BASE_PATH から取得）
├── tsconfig.json / tsconfig.node.json  # TypeScript 設定
├── package.json                  # 依存（phaser のみ） + scripts
├── docs/                         # 永続的ドキュメント
│   ├── architecture.md
│   ├── repository-structure.md
│   └── template/                 # 永続的ドキュメントのひな形（v0.2 以降で他ファイルを追加）
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
| `src/scenes/BootScene.ts` | `Graphics.generateTexture()` でプレイヤー / 地面 / ゴールのプレースホルダを生成し `GameScene` へ遷移 |
| `src/scenes/GameScene.ts` | ステージ構築 / プレイヤー操作 / カメラ追従 / 落下リスポーン / ゴール Overlap / R リスタート |
| `src/config/gameConfig.ts` | 物理（GRAVITY_Y / PLAYER_SPEED / JUMP_VELOCITY 等）・寸法・閾値・テクスチャキーの単一集約点 |
| `src/stages/stage01.ts` | 1 ステージ分のタイル定義（`'.', '#', 'P', 'G'` で構成された 2 次元文字列配列） |
| `index.html` | Vite エントリ HTML。CSP `<meta>` で `default-src 'self'` 系を設定 |
| `vite.config.ts` | `base: process.env.VITE_BASE_PATH ?? '/'`（GitHub Pages 配下用） |
| `docs/` | 永続的ドキュメント（プロダクト要求・設計・技術仕様・開発ガイドライン）。v0.1 では本ファイル + `architecture.md` のみ |
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
- 物理定数・閾値・テクスチャキーは `src/config/gameConfig.ts` に集約。シーンファイルにマジックナンバー直書き禁止
- ステージデータは `src/stages/` に 1 ファイル 1 ステージで配置（v0.1 は `stage01.ts` のみ）
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

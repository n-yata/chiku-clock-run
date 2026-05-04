# リポジトリ構造定義書

## ディレクトリ構成

```
{{プロジェクトルート}}/
├── frontend/                    # フロントエンド（{{フレームワーク名}}）
│   ├── src/
│   │   ├── components/          # 再利用可能 UI コンポーネント
│   │   ├── pages/ or routes/    # ページ / ルーティング
│   │   ├── hooks/ or composables/ # カスタムフック
│   │   ├── stores/              # 状態管理
│   │   ├── lib/                 # ユーティリティ
│   │   └── types/               # 型定義
│   ├── public/                  # 静的アセット
│   ├── tests/                   # テスト
│   └── package.json
├── backend/                     # バックエンド（{{フレームワーク名}}）
│   ├── src/ or app/
│   │   ├── routes/ or api/      # ルーティング・エンドポイント
│   │   ├── controllers/         # ハンドラ
│   │   ├── services/            # ビジネスロジック
│   │   ├── models/ or entities/ # データモデル
│   │   ├── middlewares/         # ミドルウェア
│   │   └── core/                # 設定・DB 接続・認証
│   ├── migrations/              # DB マイグレーション
│   ├── tests/                   # テスト
│   └── {{依存定義（package.json / pyproject.toml）}}
├── infra/                       # インフラ定義（IaC）
│   ├── {{terraform / cdk / pulumi}}/
│   └── docker/
├── docs/                        # 永続的ドキュメント
│   ├── product-requirements.md
│   ├── functional-design.md
│   ├── architecture.md
│   ├── repository-structure.md
│   ├── development-guidelines.md
│   ├── glossary.md
│   └── template/
├── .steering/                   # 作業単位のステアリングファイル
│   ├── template/
│   └── [YYYYMMDD]-[開発タイトル]/
├── .github/                     # GitHub Actions / Issue Template
│   └── workflows/
├── .claude/                     # Claude Code 設定（skill / settings）
└── CLAUDE.md
```

> 上記はあくまで標準形。モノレポ（Turborepo / Nx）を採用する場合は `apps/` `packages/` 構成、フルスタックフレームワーク（Next.js App Router）の場合は単一ルートに統合するなど、プロジェクト特性に合わせて調整する。

---

## ディレクトリの役割

| ディレクトリ | 役割 |
|------------|------|
| `frontend/` | フロントエンド（UI / ルーティング / 状態管理） |
| `backend/` | バックエンド API（ルーティング / ビジネスロジック / データ層） |
| `infra/` | インフラ定義（Terraform / CDK / Docker Compose 等） |
| `docs/` | 永続的ドキュメント（プロダクト要求・設計・技術仕様・開発ガイドライン） |
| `docs/template/` | `docs/` ファイル新規作成・大幅改訂時のひな形 |
| `.steering/` | 作業単位のステアリングファイル（要求・設計・タスクリスト・決定事項ログ） |
| `.steering/template/` | スプリント単位ドキュメントのひな形 |
| `.github/workflows/` | CI/CD パイプライン定義 |
| `.claude/` | Claude Code のプロジェクト固有設定（skill 定義・permissions） |

---

## ファイル配置ルール

- 永続的ドキュメントは `docs/` 直下に配置
- 作業単位のドキュメントは `.steering/[YYYYMMDD]-[開発タイトル]/` に配置
- 作業中に得た知見は `.steering/` 内に記録し、検証後 `docs/development-guidelines.md` に反映
- 機密情報を含むファイル（`.env`, シークレット鍵 等）は `.gitignore` 対象
- フロントとバックで共有する型定義は `packages/shared/` または `frontend/src/types/api.ts` に配置（プロジェクト方針に従う）

---

## 命名規則

### ステアリングディレクトリ

```
.steering/[YYYYMMDD]-[開発タイトル]/
```

- `YYYYMMDD`: 着手日
- `開発タイトル`: 半角英数字 + ハイフン区切り（例: `add-search-feature`）

### ドキュメントファイル

- 永続的ドキュメント: `kebab-case.md`（例: `product-requirements.md`）
- 作業単位ドキュメント: `requirements.md` / `design.md` / `tasklist.md` / `decisions.md` の固定ファイル名

### コードファイル

- フロントエンド: {{プロジェクト方針（PascalCase コンポーネント / kebab-case ファイル名 等）}}
- バックエンド: {{プロジェクト方針（snake_case / kebab-case 等）}}
- DB マイグレーション: `{{YYYYMMDDHHMMSS}}_{{description}}.sql`

---

## .gitignore 対象（主なもの）

- 機密ファイル（`.env`, `.env.local`, `secrets/`）
- ビルド成果物（`dist/`, `build/`, `.next/`, `__pycache__/` 等）
- 依存関係ディレクトリ（`node_modules/`, `.venv/` 等）
- 個人環境設定（`.vscode/`, `.idea/` 等）
- キャッシュ・一時ファイル（`.cache/`, `tmp/`, `*.log` 等）
- Claude Code ローカル設定（`.claude/settings.local.json`）
# 技術仕様書

## システム概要

| コンポーネント | 役割 |
|--------------|------|
| {{フロントエンド}} | {{役割}} |
| {{バックエンド API}} | {{役割}} |
| {{データベース}} | {{役割}} |
| {{外部 API}} | {{役割}} |
| {{インフラ / ホスティング}} | {{役割}} |

---

## テクノロジースタック

### フロントエンド

- 言語: {{TypeScript X.X / JavaScript ES20XX}}
- フレームワーク: {{React / Vue / Svelte / Next.js / Nuxt 等}}
- ビルドツール: {{Vite / Webpack / Turbopack 等}}
- スタイリング: {{Tailwind CSS / CSS Modules / styled-components 等}}
- 状態管理: {{Redux / Zustand / Pinia / TanStack Query 等}}
- パッケージ管理: {{npm / pnpm / yarn / bun}}
- 主要ライブラリ:
  - `{{lib/name}}` — {{用途}}
  - `{{lib/name}}` — {{用途}}

### バックエンド

- 言語: {{Node.js X.X / Python X.X / Go X.X 等}}
- フレームワーク: {{Express / Fastify / NestJS / FastAPI / Django / Gin 等}}
- ORM / DB クライアント: {{Prisma / TypeORM / SQLAlchemy / Drizzle 等}}
- 主要ライブラリ:
  - {{ライブラリ A}}: {{用途}}
  - {{ライブラリ B}}: {{用途}}
- パッケージ管理: {{npm / poetry / go mod 等}}

### データベース

- メイン DB: {{PostgreSQL / MySQL / MongoDB / DynamoDB 等}} {{バージョン}}
- キャッシュ: {{Redis / Memcached / なし}}
- 検索: {{Elasticsearch / Algolia / なし}}

### 外部 API

- {{API 名 + バージョン / モデル名}}
- {{API 名 + 呼び出し方式}}

### インフラ・ホスティング

- フロントエンド: {{Vercel / Cloudflare Pages / Netlify / S3+CloudFront 等}}
- バックエンド: {{AWS ECS / Cloud Run / Fly.io / Heroku / VPS 等}}
- データベース: {{RDS / Supabase / PlanetScale / Neon 等}}
- CI/CD: {{GitHub Actions / CircleCI / GitLab CI 等}}
- 監視: {{Sentry / Datadog / CloudWatch 等}}

---

## 通信経路

```
ユーザーブラウザ ⇄ {{フロントエンド}}（HTTPS）
                  ⇄ {{バックエンド API}}（REST / GraphQL / WebSocket）
                  ⇄ {{DB / 外部 API}}（{{プロトコル}}）
```

- メイン経路: {{プロトコル選択の理由}}
- 補助経路: {{ヘルスチェック / Webhook / 管理用エンドポイント}}
- CDN: {{使用有無と用途（静的アセット / 画像最適化 等）}}

---

## 技術的制約と要件

- {{ブラウザ要件（Chrome XX+ / Safari XX+ 等）}}
- {{ネットワーク前提（同一オリジン / CORS 設定）}}
- {{リアルタイム性・レスポンス目標}}
- {{エラー復帰の方針（リトライ・サーキットブレーカー）}}

---

## パフォーマンス要件

| 指標 | 目標 | 実測（{{YYYY-MM-DD 時点}}） |
|------|------|--------------------|
| LCP（Largest Contentful Paint） | {{< 2.5s}} | {{実測値}} |
| FID / INP | {{< 100ms / < 200ms}} | {{実測値}} |
| API 平均レスポンスタイム | {{< 200ms}} | {{実測値}} |
| 同時接続数 | {{N 人}} | {{実測値}} |
| {{その他指標}} | {{目標値}} | {{実測値}} |

---

## 開発ツールと手法

| ツール | 用途 |
|-------|------|
| {{ビルドツール}} | {{用途・コマンド例}} |
| {{ローカル起動スクリプト}} | {{用途（例: `npm run dev`）}} |
| {{テストランナー}} | {{用途（例: Vitest / Jest / Pytest）}} |
| {{Lint / Formatter}} | {{ESLint / Prettier / Biome / Ruff 等}} |
| {{型チェック}} | {{tsc / mypy 等}} |
| クルトワ（security-engineer エージェント） | コミット前のセキュリティレビュー（必須） |

---

## セキュリティ方針

- {{シークレット管理（`.env` / Secret Manager / Vault 等）}}
- {{通信暗号化（HTTPS / TLS バージョン）}}
- {{認証・認可方式（OAuth 2.0 / JWT / Session Cookie 等）}}
- {{入力バリデーション・サニタイズの方針}}
- {{CSRF / XSS / SQL インジェクション対策}}
- {{レート制限・DoS 対策}}
- {{CORS ポリシー}}

---

## 拡張・将来課題

- {{将来対応する予定の項目（多言語対応・モバイルアプリ化・エンタープライズ機能 等）}}
- {{差し替え可能性を残しているコンポーネント}}
- {{スケール時の課題（DB シャーディング・キャッシュ層追加 等）}}
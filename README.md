# mario-game

ブラウザで動く 2D 横スクロール・プラットフォーマー（マリオ風アクションゲーム）。
TypeScript + Vite + Phaser 3 で実装し、GitHub Pages で公開する。

開発ルール・ドキュメント構造は [`CLAUDE.md`](./CLAUDE.md) と [`docs/`](./docs/) を参照。

---

## クイックスタート（Dev Container + Remote Tunnel + Claude Code）

シャビが想定している標準フロー。リモートマシン上の Dev Container 内で開発し、
ローカルの VS Code からは Remote Tunnel で接続、Claude Code はコンテナ内で起動する。

### 1. リポジトリを GitHub に作成して push

ローカル（または開発ホスト）で:

```bash
cd mario-game
git init
git add .
git commit -m "chore: initial scaffold from webapp-template"

# GitHub にリポジトリ作成 + push（gh CLI 必要）
gh auth login            # 初回のみ
gh repo create mario-game --public --source=. --remote=origin --push
```

### 2. GitHub Pages を有効化

```bash
# Pages のビルドソースを GitHub Actions に切り替え
gh api -X POST "repos/:owner/mario-game/pages" \
  -f "build_type=workflow" \
  -F "source[branch]=main" \
  -F "source[path]=/"
```

うまく動かない場合は、ブラウザで Settings → Pages → Build and deployment → Source を
**「GitHub Actions」** に手動で切り替える。

`main` への push で `.github/workflows/deploy.yml` が走り、
`https://<owner>.github.io/mario-game/` で公開される。

### 3. Dev Container を起動

VS Code で当ディレクトリを開き、コマンドパレットから
**"Dev Containers: Reopen in Container"** を実行。
初回は `npm install` が走る（数分）。

### 4. コンテナ内で Remote Tunnel を起動

```bash
# 初回は GitHub アカウントでログイン
code-tunnel tunnel --name mario-game-dev
```

表示された URL をローカルの VS Code やブラウザから開けば、
コンテナ内のワークスペースにリモート接続できる。

### 5. Claude Code を起動

```bash
claude
```

### 6. ゲームをローカル確認

```bash
npm run dev
```

`http://localhost:5173/` を Dev Container のポートフォワード越しに開く。

---

## スクリプト一覧

| コマンド | 用途 |
|---------|------|
| `npm run dev` | Vite 開発サーバ起動（HMR あり） |
| `npm run build` | 型チェック + 本番ビルド（`dist/`） |
| `npm run preview` | ビルド成果物をローカルで確認 |
| `npm run typecheck` | TypeScript 型チェックのみ |

---

## デプロイ

`main` への push で自動デプロイ。手動実行は GitHub の Actions タブから
**"Deploy to GitHub Pages"** ワークフローを workflow_dispatch で起動。

---

## 次のステップ

`docs/` 配下 6 ファイル（product-requirements / functional-design / architecture /
repository-structure / development-guidelines / glossary）を `permanent-doc` skill 経由で作成し、
プロダクト要件と設計を確定させてから `.steering/` で初回スプリントを開始する。

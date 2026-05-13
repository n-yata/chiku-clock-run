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

### 6. デプロイ後にブラウザで動作確認

`main` に push すると GitHub Actions → Pages にデプロイされる。
`https://<owner>.github.io/mario-game/` を開いて動作を確認する。

---

## v0.2 で遊べる範囲

- v0.1 の 1 ステージ踏破に加え、**敵キャラ 4 体・コイン 15 枚・スコア HUD** を追加
- 敵を **上から踏むと撃破**（小ジャンプ反力）。横・下から触れると **白フラッシュ → 完全リスタート**
- コインを取ると HUD の「コイン: X / 15」が増える。ゴール時にも取得数が併記される
- 敵 AI は壁と段差端で自動反転。落下ミスでもコインカウントと敵 / コインが全復活
- 操作系・段差 3 段・隙間 2 箇所・ゴール判定は v0.1 から不変

### 操作方法

| キー / 操作 | 動作 |
|-----|------|
| `←` / `→` | 左右移動 |
| `Space` / `↑` | ジャンプ |
| `R` | ステージリスタート（`window.location.reload()` で完全初期化） |
| 画面左半分 / 右半分の長押し | 左 / 右移動（モバイル） |
| 短タップ | ジャンプ（モバイル） |

BGM / SE・複数ステージ・タイトル画面は v0.3 以降で追加予定。

---

## スクリプト一覧

| コマンド | 用途 |
|---------|------|
| `npm run build` | 型チェック + 本番ビルド（`dist/`） |
| `npm run typecheck` | TypeScript 型チェックのみ |
| `npm run test:e2e` | Playwright + Chromium でゲーム画面の canvas 描画を検証 |
| `npm run preview` | ビルド成果物をローカルで確認（必要に応じて） |
| `npm run dev` | Vite 開発サーバ起動（このプロジェクトでは基本使用せず、Pages デプロイ後に動作確認する運用） |

初回のみ Playwright のブラウザを入れる:

```bash
npx playwright install chromium
```

---

## デプロイ

`main` への push で自動デプロイ。手動実行は GitHub の Actions タブから
**"Deploy to GitHub Pages"** ワークフローを workflow_dispatch で起動。

---

## 永続的ドキュメント

- [`docs/architecture.md`](./docs/architecture.md) — 技術スタック・通信経路・パフォーマンス・セキュリティ方針
- [`docs/repository-structure.md`](./docs/repository-structure.md) — ディレクトリ構成・配置ルール

`product-requirements.md` / `functional-design.md` / `development-guidelines.md` / `glossary.md` は v0.3 以降で順次整備する。

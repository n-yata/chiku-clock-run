# CHIKU CLOCK RUN 開発ルール

## 概要

ブラウザで動く、時計工房を舞台にしたオリジナル 2D 横スクロール・プラットフォーマー。
GitHub Pages にデプロイし、誰でも URL を開けばすぐ遊べる Web アプリとして公開する。
開発を進めるうえで遵守すべき標準ルールを定義します。

---

## ドキュメント構造

### 1. 永続的ドキュメント（`docs/`）

アプリケーション全体の「**何を作るか / どう作るか**」を定義する恒久的ドキュメント。
基本設計や方針が変わらない限り更新されない。プロジェクトの「北極星」として機能する。

| ファイル | 役割 |
|---------|------|
| `product-requirements.md` | プロダクト要求定義書 |
| `functional-design.md` | 機能設計書（システム構成・データフロー・通信プロトコル） |
| `architecture.md` | 技術仕様書（テクノロジースタック・パフォーマンス要件） |
| `repository-structure.md` | リポジトリ構造定義書 |
| `development-guidelines.md` | 開発ガイドライン（コーディング規約・テスト規約・ナレッジ蓄積） |
| `glossary.md` | ユビキタス言語定義 |

各ファイルの章立てひな形は `docs/template/` 配下を参照。

### 2. 作業単位のドキュメント（`.steering/[YYYYMMDD]-[開発タイトル]/`）

特定スプリントの「**今回何をするか**」を定義する一時的なステアリングファイル。
スプリント完了後は履歴として保持する。新規スプリントでは新しいディレクトリを作成。

| ファイル | 役割 |
|---------|------|
| `requirements.md` | 今回の要求内容 |
| `design.md` | 変更内容の設計 |
| `tasklist.md` | タスクリスト |
| `decisions.md` | 決定事項ログ（**実装中に判断が発生したら即追記**、最初から作る必要はない） |

各ファイルの章立てひな形は `.steering/template/` 配下を参照。

---

## skill による自動発火

ドキュメント作成・改訂時は、対応する skill が自動で発火してテンプレ参照と運用ルールを適用する。

| skill | 発火条件 |
|-------|---------|
| `permanent-doc` | `docs/` 配下の新規作成・大幅改訂時 |
| `steering-doc` | `.steering/[YYYYMMDD]-[開発タイトル]/` 配下のドキュメント作成・更新時 |

定義は `.claude/skills/{permanent-doc,steering-doc}/SKILL.md` に格納。

---

## 機能追加・修正時の絶対ルール

### 絶対に守ってください！

以下の順序を省略しない。

1. **影響分析** — 永続的ドキュメント（`docs/`）への影響を確認。基本設計に影響するなら `docs/` 更新を計画に含める
2. **ステアリングディレクトリ作成** — `mkdir -p .steering/[YYYYMMDD]-[開発タイトル]`
3. **作業ドキュメント作成** — requirements.md → design.md → tasklist.md の順。1 ファイル作成ごとにシャビ承認を得る
4. **永続的ドキュメント更新** — 必要な場合のみ。実装後の P6 タスクで反映でも可
5. **実装開始** — 承認後に初めてコードを書く。tasklist.md に基づいて進める
6. **品質チェック** — クルトワ（security-engineer）レビュー → コミット

> 詳細手順とテンプレ参照は `steering-doc` skill が自動発火して案内する。

---

## 技術スタック概要

| レイヤ | 採用技術 |
|--------|---------|
| 言語 | TypeScript |
| ビルド/開発サーバ | Vite |
| ゲームエンジン | Phaser 3 |
| ホスティング | GitHub Pages（静的サイト） |
| CI/CD | GitHub Actions（push → build → Pages デプロイ） |
| 開発環境 | Dev Container (Node.js 20) + VS Code Remote Tunnel |

詳細は `docs/architecture.md` を参照。

---

## 詳細ルールの参照先

開発における具体的なルール・規約は永続的ドキュメントを参照すること。

| 知りたいこと | 参照先 |
|------------|--------|
| コーディング規約・ハードコーディング禁止 | `docs/development-guidelines.md` |
| コミット前のセキュリティレビュー | `docs/development-guidelines.md` |
| ナレッジ蓄積ルール | `docs/development-guidelines.md` |
| 図表・ダイアグラムの記載ルール | `docs/development-guidelines.md` |
| フロントエンド（TypeScript / Phaser 3）ルール | `docs/development-guidelines.md` |
| インフラ・CI/CD（GitHub Actions / Pages）ルール | `docs/development-guidelines.md` |
| テスト規約 | `docs/development-guidelines.md` |
| Git 規約 | `docs/development-guidelines.md` |
| 技術スタック・通信経路 | `docs/architecture.md` |
| ディレクトリ構成・ファイル配置 | `docs/repository-structure.md` |
| ドメイン用語の定義 | `docs/glossary.md` |

---

## 注意事項

- ドキュメントの作成・更新は段階的に行い、各段階で承認を得る
- `.steering/` のディレクトリ名は日付と開発タイトルで明確に識別できるようにする
- 永続的ドキュメントと作業単位のドキュメントを混同しない
- バックエンドは持たない。サーバー通信が必要な機能を追加する場合は `docs/architecture.md` の見直しから行う

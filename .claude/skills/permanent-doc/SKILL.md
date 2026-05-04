---
name: permanent-doc
description: |
  Use this skill when creating or making non-trivial updates to permanent documentation under `docs/` for this project.
  The 6 permanent docs are: product-requirements.md / functional-design.md / architecture.md / repository-structure.md / development-guidelines.md / glossary.md.
  Trigger when the user asks to write a new permanent doc from scratch, restructure an existing one, or do a major rewrite (e.g. "プロダクト要件定義書を作って", "architecture.md を全面刷新", "glossary を整理").
  Loads the project standard templates from `docs/template/` and enforces the team authoring rules (章立ての準拠 / 1ファイルごとの承認 / docs と .steering の役割分離 / セキュリティレビュー).
  Do NOT use for minor edits to existing docs (typo fix, single section update, adding a row to a table) — those bypass the skill and proceed with normal Edit.
  Do NOT use for files under `.steering/` (use steering-doc skill instead).
---

# permanent-doc skill

`docs/` 配下の永続的ドキュメント作成・大幅改訂時に発火するスキル。
プロジェクト規約（`CLAUDE.md`）と既存テンプレ（`docs/template/`）に沿って作業を進めること。

---

## 1. 発火条件の確認

### 発火する

- `docs/` 配下のいずれかを **新規作成**
- `docs/` 配下の **大幅改訂**（章立て変更・全面刷新・新規章追加など）
- スプリント完了後の P6 ドキュメント更新で `docs/` への反映が複数章にまたがる場合

### 発火しない

- 既存ドキュメントの誤字修正・1 行追加・1 表 1 行追加
- `.steering/` 配下の編集（→ `steering-doc` skill を使用）
- `CLAUDE.md` の編集（→ 通常の Edit で対応）

判断に迷ったら本スキル発火側に倒してよい（コストはテンプレ Read 数百行のみ）。

---

## 2. 永続的ドキュメント 6 種の役割

CLAUDE.md「永続的ドキュメント（`docs/`）」の定義に厳密に従う。

| ファイル | 役割 | テンプレ |
|---------|------|---------|
| `product-requirements.md` | プロダクト要求定義書（背景・ゴール・スコープ・機能要件・非機能要件・制約・リスク） | `docs/template/product-requirements.md` |
| `functional-design.md` | 機能設計書（システム構成図・データフロー・コンポーネント設計・通信プロトコル・データモデル） | `docs/template/functional-design.md` |
| `architecture.md` | 技術仕様書（テクノロジースタック・通信経路・パフォーマンス要件・セキュリティ方針） | `docs/template/architecture.md` |
| `repository-structure.md` | リポジトリ構造定義書（ディレクトリ構成・ファイル配置ルール・命名規則） | `docs/template/repository-structure.md` |
| `development-guidelines.md` | 開発ガイドライン（コーディング規約・Git 規約・テスト規約・ナレッジ蓄積ルール・ドメイン別ルール） | `docs/template/development-guidelines.md` |
| `glossary.md` | ユビキタス言語定義（ドメイン用語・ソフトウェア用語・インフラ用語・命名規則） | `docs/template/glossary.md` |

---

## 3. 作業前の必須確認

### 3.1 既存ファイルの最新状態を Read する

セッション引き継ぎ時の作業原則（CLAUDE.md グローバルルール）に従い、対象ファイルが既存なら **必ず Read で現在の状態を確認** してから着手する。「前のセッションで修正済み」というサマリーは信頼しない。

### 3.2 関連テンプレを Read する

該当するテンプレを `docs/template/` から読み込み、章立て・トーン・テーブル形式を把握する。

### 3.3 docs / .steering の役割分離を確認

- `docs/`: アプリケーション全体の「**何を作るか / どう作るか**」恒久情報
- `.steering/`: 特定スプリントの「**今回何をするか**」一時情報

スプリント固有の判断・決定事項は **`.steering/` に書く**。`docs/` には恒久ルールに昇格したものだけ反映する（`.steering/.../decisions.md` から `docs/development-guidelines.md` への昇格パスを意識する）。

---

## 4. 作成・改訂のワークフロー

### 4.1 初回セットアップ

6 ファイルを以下の順で作成。**1 ファイルごとにシャビへ確認・承認を求めてから次へ進む**。

1. `product-requirements.md`
2. `functional-design.md`
3. `architecture.md`
4. `repository-structure.md`
5. `development-guidelines.md`
6. `glossary.md`

複数ファイルをまとめて作って後から確認、は禁止。

### 4.2 大幅改訂

- 改訂理由（どのスプリント / どの設計変更に紐づくか）を冒頭で明示
- 章立てを変える場合は既存章との差分を明確にする
- 改訂前の重要事項は履歴として保持する判断（残す / 削る / `decisions.md` に逃がす）をシャビに確認

### 4.3 スプリント完了後の更新（P6 タスク）

- `.steering/[YYYYMMDD]-[開発タイトル]/decisions.md` の中で「恒久ルールに昇格すべきもの」を選定
- 該当するセクション（多くは `development-guidelines.md` のドメイン別ルール）に追記
- 図表・API 仕様・KPI 数値の更新は `functional-design.md` / `architecture.md` に反映

---

## 5. 章立てとプレースホルダの扱い

### 必ず守る

- テンプレの章立て・テーブル形式は原則維持する（既存 `docs/` ファイル群との一貫性のため）
- `{{...}}` プレースホルダはすべて埋めるか、不要なら章ごと削除する
- ドキュメント本文に `{{...}}` を残さない

### 削ってよい

- そのプロジェクトに該当しない章（例: モバイル対応をしないプロダクトで「モバイル要件」セクション）
- 空のテーブル → 行を削除するか「該当なし」と明記

### 追加してよい

- プロジェクト固有のセクションを章末に追加（章立ての変更ではなく追記）
- ドメイン別ルール（`development-guidelines.md`）は積極的に追記する

---

## 6. ハードコーディング禁止の徹底（ドキュメント本文においても）

`docs/` の本文においても以下を禁止:

- 実 URL / 実 API ID / 実アカウント ID の記載 → プレースホルダ（`<API_ID>`, `<REDACTED>`）
- 実シークレット / 実 API キーの記載（例示でも禁止）
- 個人 IP アドレス（`192.168.x.x` のようにマスク）

セキュリティレビュー時にクルトワが本ルールでドキュメントもチェックする前提。

---

## 7. 命名・トーンの統一

- 用語は `docs/glossary.md` に従う。本文中で初出の用語は `docs/glossary.md` を参照リンク
- 担当欄の書き方: モドリッチ（要求・タスクリスト）、バルベルデ（設計）、クルトワ（セキュリティ）
- 日付フォーマット: `YYYY-MM-DD`（ISO 8601）
- ファイル名・パスは backtick で囲む（例: `` `frontend/src/components/Header.tsx` ``）

---

## 8. 完了時のチェックリスト

各ドキュメント作成・改訂後、シャビへ確認を求める前に self-check:

- [ ] テンプレを Read して章立てが踏襲されている
- [ ] `{{...}}` プレースホルダが残っていない
- [ ] `docs/` と `.steering/` の役割分離を侵していない（スプリント固有情報が紛れ込んでいない）
- [ ] 既存ナレッジ・用語との整合（`glossary.md` の用語と一致）
- [ ] 実 URL / 実シークレット / 実アカウント情報が本文に書かれていない
- [ ] 既存ファイルを上書き修正した場合、Read で現状確認してから Edit している
- [ ] 図表とコード・実装の乖離がない（更新が必要な箇所をすべて更新）

self-check が通ったら、シャビに「{{ファイル名}} を作成/更新した。確認をお願い」と報告して承認待ちに入る。

---

## 9. コミット時の追加対応

`docs/` 変更を含むコミットは、CLAUDE.md ルール通り **クルトワ（security-engineer）レビュー必須**。
ドキュメント変更は一見セキュリティ無関係だが、以下を理由にレビュー対象に含める:

- 実 URL / 実シークレットの誤記載検出
- アーキテクチャ変更が新たな攻撃面を生んでいないかの検証
- 開発ガイドラインに書かれたセキュリティルール自体の妥当性確認
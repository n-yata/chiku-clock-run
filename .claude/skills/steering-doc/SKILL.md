---
name: steering-doc
description: |
  Use this skill when creating or editing steering documents under `.steering/[YYYYMMDD]-[開発タイトル]/` for this project.
  Trigger when the user asks to start a new sprint/work, create a steering directory, or write/update requirements.md / design.md / tasklist.md / decisions.md for a new task.
  Loads the project standard templates from `.steering/template/` and enforces the team authoring rules (naming convention, ownership, approval workflow, hardcoding ban, security review gate).
  Do NOT use for editing files under `docs/` (those are permanent docs governed by `docs/development-guidelines.md`).
---

# steering-doc skill

`.steering/` 配下のスプリント単位ドキュメント作成・更新時に発火するスキル。
プロジェクト規約（`CLAUDE.md`）と既存テンプレ（`.steering/template/`）に沿って作業を進めること。

---

## 1. 発火条件の確認

以下のいずれかに該当する場合に本スキルの手順に従う:

- 新スプリント開始（「新しい作業ディレクトリ作って」「機能 X を追加するスプリントを始める」等）
- 既存ステアリングディレクトリへの requirements / design / tasklist / decisions の追加
- 既存ステアリングドキュメントの大幅改訂

該当しない場合（軽微な誤字修正、既存の進捗マーク更新など）は本スキルを発火させずに通常の編集で OK。

---

## 2. ディレクトリ命名規則

```
.steering/[YYYYMMDD]-[開発タイトル]/
```

- `YYYYMMDD`: 着手日（今日の日付）
- `開発タイトル`: 半角英数字 + ハイフン区切り（例: `add-search-feature`, `fix-auth-bug`）
- 例: `.steering/20260503-add-search-feature/`

**作成手順**:

```bash
mkdir -p .steering/[YYYYMMDD]-[開発タイトル]
```

シャビと開発タイトルの合意が取れていない場合は、ディレクトリ作成前に確認すること。

---

## 3. テンプレ読み込み

以下のファイルを **必ず Read で読み込んでから** ドキュメント作成に着手する:

| 用途 | テンプレパス |
|------|-------------|
| 要求書 | `.steering/template/requirements.md` |
| 設計書 | `.steering/template/design.md` |
| タスクリスト | `.steering/template/tasklist.md` |
| 決定事項ログ | `.steering/template/decisions.md` |

テンプレ内の `{{...}}` プレースホルダはすべて埋めるか削除すること。残してはいけない。

---

## 4. 作成順序と承認フロー

CLAUDE.md「機能追加・修正時の手順」に厳密に従う:

1. **requirements.md** を作成 → **シャビに確認・承認を求める** → 次へ
2. **design.md** を作成（バルベルデ＝architecture-designer に依頼）→ **シャビ承認** → 次へ
3. **tasklist.md** を作成 → **シャビ承認** → 実装開始
4. **decisions.md** は最初は作らない。実装中に「設計と異なる対応をした」「予期しない制約に対処した」「将来の人が背景を知らないと困る判断をした」が発生した時点で即作成・追記する

**1 ファイル作成ごとに必ず確認・承認を得る**。複数ファイルをまとめて作って後から確認、は禁止。

---

## 5. 担当の使い分け

各ドキュメントの "担当" 欄は以下を原則とする:

| ドキュメント | 担当 | 備考 |
|-------------|------|------|
| requirements.md | モドリッチ | シャビからのヒアリング結果をまとめる |
| design.md | バルベルデ（architecture-designer） | 原則 `opus` モデルで起動 |
| tasklist.md | モドリッチ | design.md を踏まえて Phase 分割 |
| decisions.md | モドリッチ | 実装中の判断記録 |

設計が複雑な場合は、design.md 作成を architecture-designer サブエージェントに委譲する。シンプルな改修なら自分で書いてもよい。

---

## 6. 永続的ドキュメント（`docs/`）への影響確認

着手前に必ず確認:

- 変更が基本設計に影響する場合は `docs/` 配下も更新対象になる
- 影響先候補: `architecture.md` / `functional-design.md` / `repository-structure.md` / `development-guidelines.md` / `glossary.md`
- requirements.md / design.md にその旨を明記し、tasklist.md の P6（ドキュメント更新フェーズ）に該当タスクを入れる

---

## 7. プレースホルダ埋め込み時の注意

### 必ず埋めるもの

- `{{開発タイトル}}` / `{{YYYYMMDD-開発タイトル}}` / `{{YYYY-MM-DD}}`
- 各章の `{{...}}` 説明文（不要な章は章ごと削除する）
- 受け入れ条件（数値で計測可能な形式が望ましい）

### 残ってよくない記述

- プレースホルダのまま（`{{...}}`）→ 必ず埋めるか削除
- 空のテーブル → 行を削除するか「なし」と明記
- 既存スプリントから流用した固有名詞（前スプリント名・ファイル名）→ 当スプリント用に書き換える

---

## 8. ハードコーディング禁止の徹底（requirements / design 段階で予告）

- URL / エンドポイント / シークレット / クラウドリソース ID は本文に書かない
- 設定値の集約先を **必ず明記**: `.env` / `frontend/.env` / `backend/.env` / Secret Manager / Vault
- design.md の「設計品質チェック」と tasklist.md の「P5 クルトワレビュー」で再度チェックされる前提で書く

---

## 9. 既存ナレッジ参照の習慣

requirements.md / design.md 作成時、auto memory（`MEMORY.md`）と `docs/development-guidelines.md` のドメイン別ルールに既存知見が蓄積されているなら確認する:

- フロントエンド固有の落とし穴
- バックエンド / API 設計のハマりどころ
- DB マイグレーション運用ルール
- インフラ / CI/CD のお作法

該当する知見があれば、requirements.md §6（制約）と design.md §1（設計方針）に明示的にリンクする。

---

## 10. 完了時のチェックリスト

各ドキュメント作成後、シャビへ確認を求める前に self-check:

- [ ] `{{...}}` プレースホルダが残っていない
- [ ] 担当欄が正しい（モドリッチ / バルベルデ）
- [ ] ディレクトリ命名規則 `[YYYYMMDD]-[開発タイトル]/` に従っている
- [ ] 関連既存スプリントへのリンクがある（あれば）
- [ ] 既存ナレッジへの参照が必要な箇所で抜けていない
- [ ] ハードコーディング集約先（`.env` / Secret Manager）に言及している
- [ ] tasklist.md には P5 クルトワレビュー + P6 ドキュメント更新が含まれる

self-check が通ったら、シャビに「○○.md を作成した。確認をお願い」と報告して承認待ちに入る。
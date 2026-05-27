# タスクリスト: 横画面専用化

## タスク完全完了の原則

- 本ファイルの全タスクを完了状態にしてから作業を終了する。
- 実装開始前に該当タスクを `[x]` へ更新し、進行中であることを記録する。
- 技術的理由で不要になったタスクのみ、理由を明記して完了扱いにできる。
- コミットを行う場合は、必ずクルトワの全変更ファイルレビューを実施する。

## P1: Red - 横画面契約の失敗検証

- [x] **P1-1**: orientation 契約テストを追加する
  - [x] PWA manifest が `orientation: "landscape"` であることを検証する
  - [x] DOM に `#rotate-notice` が存在しないことを検証する
  - [x] `src/main.ts` に `orientationchange` 専用処理が存在しないことを検証する
- [x] **P1-2**: 実装前の Red を確認する
  - [x] 現在の manifest `orientation: "any"` または残存 `orientationchange` によりテストが失敗することを確認する

## P2: Green - 横画面専用の実装

- [x] **P2-1**: `vite.config.ts` の PWA manifest を横画面専用へ変更する
  - [x] `orientation: 'landscape'` を指定する
  - [x] `start_url` / `scope` / Service Worker / CSP 関連設定に不要な変更を入れない
- [x] **P2-2**: `src/main.ts` の縦横切替専用処理を削除する
  - [x] `orientationchange` リスナと遅延 `game.scale.refresh()` を削除する
  - [x] 不要になった `game` 変数を整理し、`Scale.RESIZE` 自体は維持する
- [x] **P2-3**: `index.html` が portrait 専用 UI を持たない状態を維持する
  - [x] `#rotate-notice` が存在しないことを確認する
  - [x] `@media (orientation: portrait)` / landscape 用表示切替を追加しない
  - [x] viewport のズーム抑止と CSP は維持する

## P3: 永続ドキュメント同期

- [x] **P3-1**: `docs/product-requirements.md` を横向き専用方針へ更新する
  - [x] F-010 と対応デバイス制約を landscape 専用へ更新する
  - [x] portrait の表示保証を対象外として明確化する
- [x] **P3-2**: `docs/functional-design.md` を現行実装へ同期する
  - [x] 横画面契約と manifest 設定を記録する
  - [x] 残存する `TOUCH_HOLD_MS` ベースの旧タッチ説明を現行ゾーン入力へ置換する
- [x] **P3-3**: `docs/architecture.md` を横画面専用構成へ更新する
  - [x] 縦向きオーバーレイ実装済み記述を削除する
  - [x] PWA orientation の landscape 方針を記録する
- [x] **P3-4**: `docs/development-guidelines.md` に orientation 同期ルールを追記する
  - [x] manifest / `src/main.ts` / E2E / 永続文書を同時確認するルールを記録する
  - [x] 外部リソース・CSP・秘密情報方針を変更しない
- [x] **P3-5**: 配布 manifest 検証の実行責務追加に伴い `docs/repository-structure.md` を同期する（計画差分: `package.json` と既存 E2E の責務が拡張されたため）

## P4: Green - 回帰検証

- [x] **P4-1**: orientation 契約テストが Green になることを確認する
  - [x] manifest landscape、rotate notice 不在、orientationchange 不在を検証する
- [x] **P4-2**: 既存横画面プレイの回帰テストを通す
  - [x] タイトルからゲーム開始と canvas 描画が成立する
  - [x] 能力・ステージ進行・最大プレイヤー通行性・段階難度が維持される
- [x] **P4-3**: ビルド品質確認を実施する
  - [x] `npm run typecheck`
  - [x] `npm run build`
  - [x] `npm run test:e2e`
  - [x] `git diff --check` で対象差分にエラーがない
- [x] **P4-3A**: orientation 契約 spec の別 worker 起動で再発した Phaser E2E タイムアウトを解消する
  - [x] 契約テストを直列実行済みの `game-visual.spec.ts` に統合する
  - [x] 独立 spec による並列 worker の再導入を避ける
- [x] **P4-3B**: ギュレル指摘に対応し、配布 manifest の自動契約検証を実装する
  - [x] `dist/manifest.webmanifest` を JSON として読み、`orientation: "landscape"` を検証する
  - [x] `npm run test:e2e` が事前に本番ビルドを行い、成果物検証を単独実行でも成立させる
- [x] **P4-4**: 横向きローカル画面を Browser で確認する
  - [x] localhost の横向き画面を開いてタイトルまたはゲーム canvas が表示されることを確認する
  - [x] Browser の実行環境で確認不能な場合は、阻害理由を記録し Playwright 検証結果を根拠とする

## P5: 実装レビューと完了記録

- [x] **P5-1**: `implementation-validator` に要求・設計・実装・テスト・文書整合性レビューを依頼する（初回レビューで Medium 2 件を検出し、修正対応中）
  - [x] Critical / High / Medium 指摘を解消する
- [x] ~~**P5-2**: コミットを行う場合のみ、クルトワ（security-engineer）に全変更ファイルのセキュリティレビューを依頼する~~（実行不要: 今回の指示は実装完了までで、コミット作成を含まないため）
  - [x] ~~XSS、インジェクション、認証・認可、CSP、OWASP Top 10 観点を確認する~~（同上）
  - [x] ~~URL / エンドポイント、シークレット / キー、AWS 情報、文書内機密情報のハードコーディング有無を確認する~~（同上）
  - [x] ~~Critical / High 指摘があれば修正して再レビューする~~（同上）
- [x] **P5-3**: 実装後の振り返りを本ファイル末尾へ記録する

---

## 実装後の振り返り

### 実装完了日

2026-05-27

### 計画と実績の差分

- `vite.config.ts` の manifest orientation を `landscape` に変更し、`src/main.ts` から縦横切替専用の `orientationchange` リフレッシュ処理を削除した。
- 既に `index.html` に portrait 用 UI が存在しなかったため、不要な DOM / CSS 編集は行わず、契約テストで非存在を保証した。
- 初期計画では専用 orientation spec を想定したが、別 worker による Phaser E2E のタイムアウト再発を確認したため、既存の serial `game-visual.spec.ts` に統合した。
- ギュレル初回レビューを受け、設定ソースの文字列検査から、生成された `dist/manifest.webmanifest` の JSON 契約検証へ強化した。このため `package.json` と `docs/repository-structure.md` の更新が追加で必要になった。

### 学んだこと

- PWA の表示制約は設定ファイルの記述ではなく、配布される manifest 成果物を検証しなければ契約として十分ではない。
- Phaser を起動する E2E は別 spec の追加でも worker 数が増えるため、既存の serial 実行戦略と整合させる必要がある。
- 過去スプリントの decisions を読むことで、削除済み UI を再編集せず残存コードと文書だけへ変更範囲を限定できた。

### 次回への改善提案

- PWA manifest に関わる変更は、設計時点で生成物検証とテストコマンドの生成順をセットで定義する。
- 画面表示契約の軽量テストを追加する際も、ゲーム E2E の worker / 起動負荷への影響を先に確認する。
- 既存文書が実装済みと記載する UI は、実装ファイルと過去 decisions の双方を照合してから変更対象を決める。

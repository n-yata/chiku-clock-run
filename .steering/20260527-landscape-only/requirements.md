# 要求内容

## 概要

`CHIKU CLOCK RUN` のモバイル表示対応を横画面（landscape）専用へ整理し、縦画面（portrait）向けの対応方針・専用処理・関連記述を削除する。
ゲーム本体の横スクロール体験、タッチ操作、PWA 起動導線は維持しながら、対応画面向きを明確にする。

## 背景

本ゲームは横方向へ移動する 960 x 540 基準のプラットフォーマーであり、プレイ画面は横向き表示に適している。
現在、永続文書では縦向き時の案内オーバーレイを実装済みとして記載している一方、実際の `index.html` には当該オーバーレイが存在せず、`src/main.ts` の `orientationchange` リフレッシュ処理および PWA manifest の `orientation: 'any'` のみが残っている。

画面向きの仕様と実装を一致させ、縦向き表示に対する専用サポートを廃止して、横画面で遊ぶゲームであることを一貫して定義する必要がある。

## 影響分析

### 永続ドキュメントへの影響

| 文書 | 影響 | 理由 |
|------|------|------|
| `docs/product-requirements.md` | 更新必要 | F-010 の縦向きオーバーレイ要件および対応デバイス条件を横向き専用へ変更する |
| `docs/functional-design.md` | 更新必要 | 起動・描画・タッチ操作の対応画面向き制約を設計へ反映する |
| `docs/architecture.md` | 更新必要 | モバイル操作改善の記述と PWA orientation 方針を実装実態へ合わせる |
| `docs/development-guidelines.md` | 更新必要 | 画面向き対応を変更する際のテスト・設定同期ルールを追加する |
| `docs/repository-structure.md` | 更新不要 | ファイル追加・移動・責務変更を予定しない |
| `docs/glossary.md` | 更新不要 | ドメイン用語の変更を伴わない |

### 実装への影響

| 対象 | 想定変更 |
|------|----------|
| `src/main.ts` | 縦横切替を前提とした `orientationchange` 専用リフレッシュ処理を削除する |
| `vite.config.ts` | PWA manifest の対応 orientation を横向き専用として設定する |
| `index.html` | 縦向き案内 UI が存在しないことを確認し、不要な portrait 対応を再導入しない |
| `tests/e2e/` | 横向き viewport でゲームが動作し、縦向き専用 UI / 処理が残っていないことを検証する |

## 実装対象の機能

### 1. 横画面専用の表示サポート

- ゲームの対応画面向きを landscape に限定する。
- インストール済み PWA の orientation 設定は landscape を指定し、`any` を許容しない。
- ブラウザ内で縦向きになった場合に向けた専用オーバーレイ、向き変更専用のリフレッシュ処理、portrait 向けレイアウト保証を持たない。

### 2. タッチ操作とゲーム進行の維持

- 横画面上では既存のタッチ操作（左スライド移動 / 右タップジャンプ / 能力中の右ダブルタップ発射）を維持する。
- デスクトップのキーボード操作、3 ステージ進行、能力、難易度、マップ通行性を変更しない。

### 3. 仕様・実装・テストの整合

- 現行文書に残る縦向きオーバーレイ実装済み記述を削除または横向き専用方針へ更新する。
- 横画面での起動・プレイが既存 E2E で維持されることを確認する。
- portrait 専用の DOM 要素、CSS メディアクエリ、orientation 切替用コードが実装に残存しないことをテストまたは静的確認で担保する。

## 受け入れ条件

### 横画面専用の表示サポート

- [ ] PWA manifest の `orientation` が横向き専用設定になっている。
- [ ] `src/main.ts` に縦横切替のためだけの `orientationchange` 処理が存在しない。
- [ ] `index.html` に portrait 向け案内オーバーレイまたは portrait 専用表示制御が存在しない。
- [ ] 縦画面での遊びやすさ、レイアウト適応、回転案内表示はサポート対象として扱われない。

### 既存ゲームプレイ維持

- [ ] 横向き viewport でタイトル表示からゲーム開始、操作、ステージ進行が成立する。
- [ ] タッチ操作の入力方式と、キーボード操作の入力方式に回帰がない。
- [ ] 既存のマップ通行性・段階難度・能力進行 E2E が引き続き成功する。

### 文書整合

- [ ] `docs/product-requirements.md` が横向き専用の対応方針を示す。
- [ ] `docs/functional-design.md` と `docs/architecture.md` から未実装または廃止対象の縦向き対応記述が除去される。
- [ ] `docs/development-guidelines.md` に、画面向き制約と manifest / E2E の同期ルールが記録される。

## 成功指標

- 対応画面向きが実装・PWA 設定・永続文書のすべてで landscape に統一されている。
- `npm run typecheck`、`npm run build`、`npm run test:e2e` が成功する。
- 横向きプレイに関する既存の操作・進行テストに失敗が発生しない。

## スコープ外

以下はこのフェーズでは実装しない:

- ブラウザ API による強制回転または orientation lock の追加
- 縦向き端末に対する新しい警告オーバーレイや代替 UI の追加
- タッチ操作方式の刷新、仮想ボタンの追加
- ゲーム画面比率、ステージ構成、プレイヤー能力、難易度の変更
- PWA や GitHub Pages 配信方式そのものの変更

## 参照ドキュメント

- `docs/product-requirements.md` - プロダクト要求定義書
- `docs/functional-design.md` - 機能設計書
- `docs/architecture.md` - アーキテクチャ設計書
- `docs/development-guidelines.md` - 開発ガイドライン
- `.steering/20260504-mobile-controls-responsive/` - 既存モバイル画面向き対応の経緯

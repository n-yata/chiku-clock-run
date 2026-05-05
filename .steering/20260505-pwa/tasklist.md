# タスクリスト: PWA 対応

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-05 |
| 担当 | モドリッチ |
| 関連設計 | `.steering/20260505-pwa/design.md` |
| 関連要求 | `.steering/20260505-pwa/requirements.md` |

---

## 進め方の原則

- **アイコン生成 → Vite 設定 → index.html 更新 → ビルド検証 → クルトワレビュー → コミット → ドキュメント更新**
- 各タスクは [ ] 未着手 / [WIP] 進行中 / [x] 完了 で管理
- ハードコーディング禁止: base path は `process.env.VITE_BASE_PATH` 経由のみ（`vite.config.ts` 集約）
- コミット前は **必ずクルトワ（security-engineer）レビュー**（CLAUDE.md ルール準拠）
- 各 Phase は完了次第、止まらずに次へ進む
- **止まるのはシャビの判断が必要な事項が発生したときのみ**（Critical/High 指摘・設計前提の崩壊・Q5〜Q8 の判断を求められた時）

---

## P1: アイコン生成

- [ ] **P1-1**: `scripts/generate-icons.mjs` を新規作成する（design.md §3.2）
  - 192×192 / 512×512 / maskable 512×512 の 3 種を Node 標準ライブラリ（`zlib`・`node:fs`）のみで生成
  - 赤背景 (#E52521) + 白文字「M」のシンプルデザイン（追加依存ゼロ）
- [ ] **P1-2**: `public/icons/` ディレクトリを作成し、スクリプトを実行して 3 PNG を生成・配置する
  - `node scripts/generate-icons.mjs`
  - 出力確認: `public/icons/icon-192.png` / `public/icons/icon-512.png` / `public/icons/icon-maskable-512.png`
- [ ] **P1-3**: 生成した PNG の PNG シグネチャと寸法を Python で検証する
  - 各ファイルが正しい RGBA PNG であることを確認

---

## P2: 依存追加 + Vite 設定

### P2-A: vite-plugin-pwa インストール

- [ ] **P2-A-1**: `npm install -D vite-plugin-pwa` を実行する
- [ ] **P2-A-2**: `package.json` に `"generate-icons": "node scripts/generate-icons.mjs"` を scripts に追加する

### P2-B: vite.config.ts 更新

- [ ] **P2-B-1**: `vite.config.ts` を Read で確認する（現状把握）
- [ ] **P2-B-2**: `vite-plugin-pwa` の `VitePWA` プラグインを追加する（design.md §3.1 設定に基づく）
  - `registerType: 'autoUpdate'`
  - `injectRegister: 'auto'`
  - `workbox.globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}']`
  - `workbox.navigateFallback: 'index.html'`
  - `workbox.cleanupOutdatedCaches: true`
  - manifest: name / short_name / description / lang / theme_color / background_color / display / orientation / start_url / scope / icons 設定
  - base path は `process.env.VITE_BASE_PATH ?? '/'` から自動伝搬（ハードコードなし）

---

## P3: index.html 更新

- [ ] **P3-1**: `index.html` を Read で確認する（現状把握）
- [ ] **P3-2**: `<link rel="manifest">` タグを `<head>` に追加する
  - `href` は相対パス（`manifest.webmanifest`）で記述
- [ ] **P3-3**: `<meta name="theme-color" content="#000000">` を `<head>` に追加する
- [ ] **P3-4**: iOS Safari 向け `<meta name="apple-mobile-web-app-capable" content="yes">` と apple-touch-icon を追加する

---

## P4: ビルド検証

- [ ] **P4-1**: `npx tsc --noEmit` で型エラーがないことを確認する
- [ ] **P4-2**: `npm run build` が成功することを確認する
- [ ] **P4-3**: `dist/` に以下が存在することを確認する
  - `dist/manifest.webmanifest` — plugin 生成
  - `dist/sw.js` — plugin 生成
  - `dist/workbox-*.js` — plugin 生成
  - `dist/icons/*.png` — 3 種のアイコン
- [ ] **P4-4**: `dist/manifest.webmanifest` の内容を確認する
  - `start_url` / `scope` に `/mario-game/` が含まれる（CI ビルド相当の確認）
  - `icons` に 192/512/maskable の 3 件が含まれる
- [ ] **P4-5**: バンドルサイズ増加が < 30 KB gzip であることを確認する（Workbox ランタイム分）

---

## P5: クルトワ（security-engineer）レビュー + コミット

- [ ] **P5-1**: 変更ファイル全てのセキュリティレビューをクルトワに依頼する
  - 対象: `vite.config.ts` / `index.html` / `package.json` / `scripts/generate-icons.mjs` / `public/icons/*.png`
  - 確認観点: base path ハードコーディングなし確認 / CSP 互換性（`script-src 'self'` で SW が許可されること） / manifest に外部 URL なし / アイコン PNG の安全性 / SW スコープが `/mario-game/` に限定されること
- [ ] **P5-2**: 指摘事項を確認する
  - Critical / High なし → 次へ自動継続
  - **Critical / High あり → 止めてシャビに確認**
- [ ] **P5-3**: 指摘修正（あれば）
- [ ] **P5-4**: シャビへレビュー結果報告 → **コミット承認取得**（必ず止まる）
- [ ] **P5-5**: コミット作成・push

---

## P6: ドキュメント更新

- [ ] **P6-1**: `docs/architecture.md` の §拡張・将来課題 に「v0.7 で PWA 対応済み」を追記し、vite-plugin-pwa と SW の記述を追加する
- [ ] **P6-2**: `docs/repository-structure.md` に `public/icons/` / `scripts/` ディレクトリを追記する
- [ ] **P6-3**: `docs/product-requirements.md` の対象外だった PWA 関連項目を更新する

---

## 横断タスク（全フェーズ共通）

- [ ] **X-1**: 各タスク着手前に対象ファイルの最新状態を Read で確認する（セッション引き継ぎ原則）
- [ ] **X-2**: 変更後は必ず `tsc --noEmit` + `npm run build` で検証する
- [ ] **X-3**: 重要な発見・ハマりどころは即座に `decisions.md` に記録する

---

## 進捗マイルストーン

| マイルストーン | 完了条件 |
|--------------|--------|
| **M1: アイコン生成完了** | `public/icons/` に 3 PNG が配置され PNG 検証通過 |
| **M2: ビルド成功** | `tsc --noEmit` 通過 + `npm run build` 成功 + dist/ に manifest / sw.js / アイコン存在 |
| **M3: コミット完了** | クルトワレビュー通過・シャビ承認・コミット・push 完了 |
| **M4: スプリント完了** | ドキュメント更新完了 |

---

## 残る未確定事項（実装中に発生したらシャビ判断）

| # | 項目 | トリガ |
|---|------|------|
| Q5 | アイコン色 / 文字デザイン | 生成結果を見てシャビが変更を希望した場合 |
| Q6 | theme_color 変更 | スプラッシュの見え方確認後に変更希望が出た場合 |
| Q7 | SW キャッシュサイズ超過 | バンドルが Workbox の 2 MiB 上限を超えた場合（現状 ~1.5 MB で問題なし） |

---

作成: モドリッチ / 2026-05-05

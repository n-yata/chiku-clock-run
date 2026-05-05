# 要求書: PWA 対応

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-05 |
| 担当 | モドリッチ |
| 関連スプリント | なし |

---

## 1. 背景

### 1.1 現状

mario-game は GitHub Pages で配信される静的 Web アプリ（Phaser 3 + Vite + TypeScript）。  
現在は URL を開いてブラウザ内でのみプレイ可能で、オフライン利用・ホーム画面追加（インストール）はできない。  
スマートフォンユーザーがホーム画面に追加して、ネイティブアプリに近い体験で遊べる仕組みがない。  
v0.6 時点でスプライト PNG は Vite data URI としてバンドル済みのため、追加アセット配信は最小限で済む。

### 1.2 やりたいこと

Web App Manifest + Service Worker を追加し、ブラウザの「ホーム画面に追加」プロンプトを表示させる。  
インストール後はオフラインでも起動・プレイ可能にする。  
BGM/SE は Web Audio API で合成済みのため、外部音声ファイルの配信問題はない。

---

## 2. ゴール

### 2.1 主目的

- スマートフォン・デスクトップで「インストール（ホーム画面に追加）」プロンプトが表示される
- インストール後、アイコンタップ → スプラッシュ → ゲーム起動まで完全オフラインで動作する

### 2.2 副次目的

- スタンドアロン表示（ブラウザ UI 非表示）でゲーム没入感向上
- Service Worker キャッシュにより 2 回目以降のロードが高速化（バンドル ~1.5MB のキャッシュ）
- ホーム画面アイコン表示でブランディング向上

---

## 3. スコープ

### 3.1 含むもの

- `public/manifest.json` — Web App Manifest（name / short_name / icons / theme_color / display 等）
- `public/sw.js` または `vite-plugin-pwa` 経由のサービスワーカー生成
- アプリアイコン PNG（最低 192×192 と 512×512 の 2 サイズ）
- `index.html` への `<link rel="manifest">` 追加
- Service Worker の Precache 設定（バンドル JS + index.html + アイコン）
- GitHub Pages デプロイ後の動作確認（Android Chrome / iOS Safari の install プロンプト）

### 3.2 含まないもの

- プッシュ通知（将来課題）
- バックグラウンド同期（将来課題）
- スコアリーダーボードなどサーバー同期（バックエンドなし方針を維持）
- アイコンデザインの凝った制作（シンプルなプログラム生成またはテキストベース）

---

## 4. 機能要件

### 4.1 インストール体験フロー

1. ユーザーが `https://n-yata.github.io/mario-game/` を HTTPS で開く
2. ブラウザが Web App Manifest + Service Worker を認識し、インストール条件を満たす
3. Android Chrome: アドレスバー下部に「ホーム画面に追加」バナーが表示される
4. iOS Safari: 「共有」→「ホーム画面に追加」で手動追加可能（iOS は自動プロンプト非対応）
5. インストール後、ホーム画面アイコンから起動すると `display: standalone` モードで表示される

### 4.2 オフライン動作

- Service Worker が `index.html` と バンドル JS（`assets/index-*.js`）を Precache する
- スプライト画像は JS バンドル内に data URI 埋め込み済みなので個別キャッシュ不要
- ネットワーク不通でも起動・全ステージプレイが可能
- キャッシュ戦略: Cache First（静的アセット） / Network First（ナシ — バックエンド接続なし）

### 4.3 既存機能の互換要件

- `Phaser.Scale.RESIZE` モードのレスポンシブ動作を維持
- タッチ操作（左右移動 / ジャンプ）の既存挙動を維持
- GitHub Actions ビルド・デプロイパイプラインへの影響を最小化（追加 npm script のみ）
- CSP（Content-Security-Policy）との整合性を維持する

---

## 5. 非機能要件

### 5.1 パフォーマンス

- Service Worker 登録による初回描画への影響: 体感なし（非同期登録）
- 2 回目以降のロード: キャッシュヒットにより 0 ネットワークリクエストで起動可能
- Lighthouse PWA スコア: 全項目 Pass を目標

### 5.2 信頼性

- Service Worker が登録失敗してもゲーム本体は影響なし（SW 登録は非同期・例外捕捉必須）
- SW 更新時: skipWaiting + clients.claim で即時切り替え

### 5.3 互換性・依存

- フロント: `vite-plugin-pwa`（Vite プラグイン、Workbox ベース）または手書き SW の選択は設計で決定
- 対応ブラウザ: Chrome / Edge（完全対応）、Safari 16.4+（部分対応、install プロンプトなし）
- 追加依存は `vite-plugin-pwa` のみ（必要な場合）— 原則追加依存最小化
- ハードコーディング禁止: GitHub Pages の base path（`/mario-game/`）は環境変数 `VITE_BASE_PATH` から取得する（変更なし）

### 5.4 セキュリティ

- Service Worker スコープ: `/mario-game/` に限定（サブパス外へのリクエスト傍受なし）
- SW ファイルは同一オリジンで配信されるため CORS 問題なし
- CSP の `script-src 'self'` が SW 登録に影響しないことを確認する
- `manifest.json` は外部 URL を含まない（アイコンは同一オリジン）

---

## 6. 制約・前提条件

- GitHub Pages は HTTPS 配信（SW 動作の必須要件）✓
- base path が `/mario-game/`（サブディレクトリ）のため、SW スコープと manifest の `start_url` を正しく設定する必要がある
- iOS Safari は Service Worker を部分サポート（Precache 動作、Push 通知非対応）
- `vite-plugin-pwa` を使う場合は npm 依存が増加するが、バンドルサイズへの影響はビルド時生成のため実行時ゼロ
- クルトワ（security-engineer）レビュー必須（コミット前）
- シャビ承認を各フェーズで取得

---

## 7. 受け入れ条件

- [ ] `https://n-yata.github.io/mario-game/` で Lighthouse PWA 診断が全項目 Pass
- [ ] Android Chrome でインストールプロンプト（「ホーム画面に追加」バナー）が表示される
- [ ] インストール後、機内モードでもゲームが起動・プレイできる（全 3 ステージ）
- [ ] iOS Safari で「共有 → ホーム画面に追加」でインストールでき、standalone モードで起動する
- [ ] 既存ゲームプレイ（移動・ジャンプ・敵・コイン・ゴール・ステージ進行）が正常動作
- [ ] GitHub Actions デプロイパイプラインが正常完了する
- [ ] クルトワ（security-engineer）レビューで Critical/High なし

---

## 8. 未確定事項（design.md でバルベルデと協議）

- Q1. `vite-plugin-pwa` を使うか手書き SW にするか（追加依存 vs. 保守性トレードオフ）
- Q2. アイコン画像の調達方法（Canvas/SVG でプログラム生成 vs. 既存 Kenney アセットの流用 vs. 簡易 PNG 手作り）
- Q3. SW キャッシュ戦略の詳細（Precache のみ vs. Runtime Cache 追加、更新ポリシー）
- Q4. GitHub Pages サブパス（`/mario-game/`）に対する SW スコープ設定の具体的方法

---

作成: モドリッチ / 2026-05-05

# 技術仕様書

> v0.1 時点での薄いたたき。詳細は v0.2 以降で追加。
> 永続的ドキュメントの更新ルールは `CLAUDE.md` 参照。

## システム概要

| コンポーネント | 役割 |
|--------------|------|
| ブラウザクライアント（Phaser 3） | ゲーム描画・入力処理・物理演算をブラウザ単体で完結 |
| GitHub Pages | 静的ホスティング（HTML / JS / 自己完結） |
| GitHub Actions | `main` push トリガで build → Pages デプロイ |

バックエンド・DB・外部 API は持たない。100% 静的サイト。

---

## テクノロジースタック

### フロントエンド

- 言語: TypeScript 5.4
- ゲームエンジン: Phaser 3.80（Arcade Physics）
- ビルドツール: Vite 5.2
- スタイリング: なし（Phaser 内描画）
- 状態管理: なし（シーン内 class フィールドのみ）
- パッケージ管理: npm
- 主要ライブラリ:
  - `phaser` — 2D ゲームエンジン本体（Scene / Physics / Input / Camera）

### バックエンド

なし。

### データベース

なし。

### 外部 API

なし。外部 CDN へのフェッチも行わない。

### インフラ・ホスティング

- フロントエンド: GitHub Pages（`<owner>.github.io/<repo>/`）
- CI/CD: GitHub Actions（`.github/workflows/deploy.yml`）
- 監視: なし（v0.2 以降に検討）

---

## 通信経路

```
ユーザーブラウザ ⇄ GitHub Pages（HTTPS GET：HTML / JS / Source Map）
```

- メイン経路: 静的ファイル配信のみ。WebSocket / fetch は使用しない
- 補助経路: なし
- CDN: GitHub Pages の前段に Fastly（GitHub 標準）

---

## 技術的制約と要件

- 対応ブラウザ: 最新 Chrome / Edge / Firefox / Safari
- ネットワーク前提: 同一オリジン完結（CORS 設定不要）
- リアルタイム性: 60 fps 維持・入力レイテンシ < 100 ms
- エラー復帰: 例外発生時も R キーで `scene.restart()` 可能（CLAUDE.md 信頼性要件）

---

## パフォーマンス要件

| 指標 | 目標 | 実測（2026-05-04 時点） |
|------|------|--------------------|
| 描画 fps | 60 維持 | ローカルビルド OK、ブラウザ実測は要計測 |
| 初回ロード時間 | < 5 秒（GitHub Pages, モダン回線, キャッシュなし） | 要 Pages 環境計測 |
| 入力レイテンシ | < 100 ms（体感） | 要計測 |
| バンドルサイズ（`dist/assets/*.js`） | < 1.5 MB | 1,490 kB（gzip 343 kB, v0.2 時点） |

---

## 開発ツールと手法

| ツール | 用途 |
|-------|------|
| Vite (`npm run dev`) | HMR 付き開発サーバ（ポート 5173） |
| Vite (`npm run build`) | 型チェック + 本番ビルド（`dist/`） |
| TypeScript (`npm run typecheck`) | 型エラー検出（`tsc --noEmit`） |
| Phaser 3 | ゲームエンジン（Scene / Arcade Physics / Camera） |
| GitHub Actions | `main` push 時の build + Pages デプロイ |
| クルトワ（security-engineer エージェント） | コミット前のセキュリティレビュー（必須） |

---

## セキュリティ方針

- シークレット管理: 本案件では発生しない（バックエンド・外部 API なし）。`.env` は `.gitignore` 対象として防御済み
- 通信暗号化: GitHub Pages の HTTPS 配信に依存
- 認証・認可: なし（公開ゲーム）
- 入力バリデーション: キーボード入力のみ。Phaser の `add.text()` に渡す文字列は全てリテラル定数で動的展開なし
- CSP: `index.html` の `<meta http-equiv="Content-Security-Policy">` で `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'` を設定
- ハードコーディング禁止: 物理定数・ステージ定義は `src/config/gameConfig.ts` / `src/stages/stage01.ts` に集約。GitHub Pages base パスのみ `vite.config.ts` 経由で `VITE_BASE_PATH` 環境変数から取得

---

## 拡張・将来課題

- v0.2（実装済み）: 敵キャラクター 4 体（踏みつけ撃破 / 段差端反転 AI）・コイン 15 枚・スコア HUD・ミス演出（白フラッシュ → `window.location.reload()`）
- v0.3 以降: BGM / SE、複数ステージ、タイトル画面、ライフ / パワーアップ
- 複数ステージ追加時: `src/stages/` にファイル追加 + ステージ選択 UI
- ステージ規模拡大時: 2D 配列 → Phaser Tilemap (Tiled エディタ) への移行余地（`StageDefinition` 型をアダプタで吸収）
- アセット差し替え: `BootScene` の `generateTexture()` を `this.load.image()` に置換するだけで対応可（`TEX_KEY` で抽象化済み）

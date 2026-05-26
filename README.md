# CHIKU CLOCK RUN

時計工房を駆け抜ける 2D 横スクロール・プラットフォーマー。
TypeScript + Vite + Phaser 3 で実装し、GitHub Pages に公開する静的 Web アプリケーションです。

開発ルールと設計文書は [`AGENTS.md`](./AGENTS.md) と [`docs/`](./docs/) を参照してください。

## ゲーム内容

- 探検家チクを操作し、巻きネジ障害機を踏み越えてクロックビーコンを目指す
- 歯車片を集め、HUD の取得数を更新する
- ぜんまいで成長し、パルスコアでパルス弾を撃てるようになる
- クロノクリスタルで一定時間ダメージを無効化する
- 3 ステージ、ライフ制、BGM / SE、タイトル画面、PWA オフライン起動に対応

## 操作方法

| キー / 操作 | 動作 |
|---|---|
| `←` / `→` | 左右移動 |
| `Space` / `↑` | ジャンプ |
| `Z` | パルス能力中にパルス弾を発射 |
| `R` | 現在のステージをリスタート |
| 画面左側をスライド | 左右移動（スマートフォン） |
| 画面右側をタップ | ジャンプ（スマートフォン） |
| 画面右側をダブルタップ | パルス能力中にパルス弾を発射（スマートフォン） |

## ローカル実行

```bash
npm install
npm run dev
```

開発サーバーは `http://127.0.0.1:5173` で確認できます。

## スクリプト

| コマンド | 用途 |
|---|---|
| `npm run generate-icons` | 時計モチーフの PWA アイコンとゲーム用小型 PNG を生成 |
| `npm run typecheck` | TypeScript 型チェック |
| `npm run build` | 型チェック + 本番ビルド |
| `npm run test:e2e` | Playwright でゲーム画面と接地挙動を検証 |
| `npm run preview` | ビルド成果物のローカル確認 |

初回の E2E 実行前に Chromium が必要な場合:

```bash
npx playwright install chromium
```

## デプロイ

`main` への push で GitHub Actions がビルドし、GitHub Pages にデプロイします。
配信先のサブパスは `VITE_BASE_PATH` で解決するため、コードにリポジトリ固有 URL を固定しません。

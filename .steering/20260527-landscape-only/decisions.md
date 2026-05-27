# 決定事項ログ

## D-001: orientation 契約テストは既存の serial ゲーム spec に統合する

- 日付: 2026-05-27
- 背景: orientation 契約を独立した `orientation-contract.spec.ts` として追加すると、Playwright の `fullyParallel` 設定により既存の Phaser ゲーム E2E と別 worker で起動された。ゲーム spec は既に並列負荷による不安定化を避けるため serial 化されており、今回もプレイヤー生成待機の 30 秒タイムアウトが再現した。
- 決定: orientation 契約は `tests/e2e/game-visual.spec.ts` に統合し、同 spec の `test.describe.configure({ mode: 'serial' })` 配下で実行する。契約検証はソースファイルの読み取りのみであるため、ゲームの実ブラウザ検証との責務衝突は生じない。

## D-002: manifest 契約はビルド成果物を JSON として検証する

- 日付: 2026-05-27
- 背景: Vite の開発サーバーでは `/manifest.webmanifest` が HTML フォールバックを返し、配布成果物の manifest を検証できなかった。また設定ソースの文字列検索だけでは、生成物の回帰検出として不十分だった。
- 決定: `npm run test:e2e` は `npm run build` を前置し、`tests/e2e/game-visual.spec.ts` が生成済み `dist/manifest.webmanifest` を `JSON.parse()` して `orientation: 'landscape'` を確認する。

## D-003: テスト実行責務の変更を構造文書へ反映する

- 日付: 2026-05-27
- 背景: 要求作成時点では新規ファイル配置を伴わないため `docs/repository-structure.md` の更新は不要と見込んだ。しかし配布 manifest 検証を成立させるため、`package.json` の `test:e2e` と既存 E2E spec の責務が拡張された。
- 決定: ファイル配置の追加はないものの、テスト責務と script の役割を扱う `docs/repository-structure.md` を同期対象へ追加する。

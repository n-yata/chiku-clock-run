# タスクリスト

## タスク完全完了の原則

**このファイルの全タスクが完了するまで作業を継続すること**

### 必須ルール

- 全タスクを `[x]` にする
- 後回しを理由に未完了タスクを残さない
- 設計変更で不要になったタスクのみ、具体的な技術理由を記載して完了扱いにできる
- 実装着手時・完了時に本ファイルへ進捗を反映する

### 実行可能な検証のみを計画

- `package.json` に存在する検証コマンドは `npm run generate-icons` / `npm run typecheck` / `npm run build` / `npm run test:e2e`
- `lint` および unit test script は現状存在しないため、本スプリントの実行タスクには含めない

---

## P1: Red 検証基準の準備

- [x] **P1-1**: `tests/e2e/game-visual.spec.ts` に、歯車片および新しいオリジナル表示物を検証する期待値を追加・更新する
  - [x] 旧 `isCoinPixel` 判定を歯車片のパレット判定へ置き換える
  - [x] 変更対象となるオリジナル表示物の描画または能力状態を、具体的な入力と期待結果で検証する
- [x] **P1-2**: 実装前に更新済み E2E を実行し、新意匠未実装により失敗することを確認する（Red）

## P2: ブランド表示と互換移行

- [x] **P2-1**: `index.html`、`vite.config.ts`、`package.json`、`package-lock.json` の公開表示・パッケージ識別子を `CHIKU CLOCK RUN` / `chiku-clock-run` に更新する
- [x] **P2-2**: `src/config/gameConfig.ts` に新 storage key と旧 key 読取用の互換定数を定義する
- [x] **P2-3**: `src/scenes/BootScene.ts` に新キー優先・旧キー読み取り移行・不正値無視と削除を実装する
- [x] **P2-4**: `src/scenes/GameScene.ts` の保存処理が新 storage key のみに書き込むことを確認・更新する

## P3: PWA アイコンと静的画像アセット

- [x] **P3-1**: `scripts/generate-icons.mjs` を時計・歯車モチーフ生成へ変更する
- [x] **P3-2**: `npm run generate-icons` を実行し、`public/icons/icon-192.png`、`icon-512.png`、`icon-maskable-512.png` を新意匠に更新する
- [x] **P3-3**: 歯車片とクロックビーコンの静的画像を作成し、旧 coin / 赤旗アセットを置換する
  - [x] `src/assets/images/gear-bit.png` を作成する
  - [x] `src/assets/images/beacon.png` を作成する
  - [x] `src/scenes/BootScene.ts` のロード定義を新画像パス・新 texture key に更新する
- [x] **P3-4**: `ground.png` を目視確認し、世界観または既存作品想起の問題があれば時計工房床へ置換する

## P4: Canvas スプライトと設定語彙の置換

- [x] **P4-1**: `src/config/gameConfig.ts` のテクスチャキー、寸法・色・HUD 定数、SE キーを時計工房語彙へ変更する
  - [x] `gearBit` / `beacon` / `springCoil` / `pulseCore` / `chronoCrystal` / `pulseBolt` の識別子を定義する
  - [x] 効果時間・当たり判定・移動値などのゲームバランス定数は維持する
- [x] **P4-2**: `src/scenes/spriteSheets.ts` の能力アイテムと弾の生成関数を独自造形・独自命名へ置換する
  - [x] `buildSpringCoilSheet`
  - [x] `buildPulseCoreSheet`
  - [x] `buildChronoCrystalSheet`
  - [x] `buildPulseBoltSheet`
- [x] **P4-3**: `src/scenes/spriteSheets.ts` の敵描画を巻きネジ障害機の造形へ変更し、既存の茶色きのこ型・牙表現を除去する
- [x] **P4-4**: `src/scenes/BootScene.ts` と `src/scenes/animations.ts` を新しい texture key / build 関数に整合させる

## P5: ランタイムのドメイン語彙置換

- [x] **P5-1**: `src/audio/AudioManager.ts` の `SeKey` を新イベント名へ更新し、既存の音響パラメータを保ったまま再生契約を変更する
- [x] **P5-2**: `src/scenes/GameScene.ts` の収集物を Gear Bit 語彙へ置換する
  - [x] グループ・カウンタ・HUD・ビルド関数・Overlap 関数を更新する
  - [x] クリア表示の収集数表示を新 HUD 用語で維持する
- [x] **P5-3**: `src/scenes/GameScene.ts` の能力アイテムと攻撃処理を Spring Coil / Pulse Core / Chrono Crystal / Pulse Bolt 語彙へ置換する
  - [x] 取得効果、無敵時間、射撃操作、衝突結果を変更前と一致させる
  - [x] 画面操作文言をパルス能力に合わせて更新する
- [x] **P5-4**: `src/stages/stage01.ts`、`stage02.ts`、`stage03.ts` のタイル説明・配置コメントを新語彙へ更新する

## P6: 現在仕様ドキュメントの更新

- [x] **P6-1**: `README.md` を正式タイトル、時計工房設定、現在の能力・収集物・操作へ更新する
- [x] **P6-2**: `AGENTS.md` と `CLAUDE.md` のプロジェクト概要を独自作品として更新する
- [x] **P6-3**: `docs/product-requirements.md` と `docs/functional-design.md` を新ドメイン語彙と現在機能へ更新する
- [x] **P6-4**: `docs/architecture.md` と `docs/repository-structure.md` をアセット・PWA アイコン・新名称へ更新する
- [x] **P6-5**: `docs/development-guidelines.md` と `docs/glossary.md` を新 HUD / スプライト / 用語ルールへ更新する
- [x] **P6-6**: 現在仕様を表す対象から `mario-game`、`Mario-like`、「マリオ風」、「クリボー風」および旧アイテム語彙の不要な残存がないことを `rg` で確認する
  - [x] 旧 `mario-game.stageIndex` は互換読取定数または移行の説明としてのみ存在することを確認する
  - [x] `.steering/` の履歴文書は検査除外とする

## P7: 品質検証とレビュー

- [x] **P7-1**: `npm run generate-icons` を実行し、生成物が新意匠で再現されることを確認する
- [x] **P7-2**: `npm run typecheck` が成功することを確認する
- [x] **P7-3**: `npm run build` が成功することを確認する
- [x] **P7-4**: `npm run test:e2e` が成功し、新しい可視要素と既存プレイ機能を検証できることを確認する
  - [x] ギュレル指摘対応として、ビーコン、ぜんまい、パルスコア / パルス弾、クロノクリスタル、旧 storage key 移行の E2E を追加する
- [x] **P7-4A**: ギュレル指摘対応として、現行実装と矛盾する仕様記述およびバンドル予算を修正する
- [x] **P7-5**: `implementation-validator` に今回の変更ファイルと要求・設計の整合性レビューを依頼し、重大な指摘を解消する
- [x] ~~**P7-6**: コミットを行う場合は、クルトワ（security-engineer）に全変更ファイルのセキュリティレビューを依頼する~~（実行不要: 今回の指示は実装完了までで、コミット作成を含まないため）
  - [x] ~~XSS、インジェクション、認証・認可、CSP、OWASP Top 10 観点を確認する~~（同上）
  - [x] ~~URL / エンドポイント、シークレット / キー、AWS 情報、文書内機密情報のハードコーディング有無を確認する~~（同上）
  - [x] ~~Critical / High 指摘があれば修正して再レビューする~~（同上）

## P8: 振り返り

- [x] **P8-1**: 実装完了日、計画との差分、学んだこと、次回への改善提案を本ファイル末尾に記録する

---

## 実装後の振り返り

### 実装完了日

2026-05-26

### 計画と実績の差分

- 歯車片とクロックビーコンは、既存のアイコン生成スクリプトを拡張して再現可能な PNG として生成した（D-001）。
- ギュレルの検証を受け、能力物・パルス弾・ビーコン・旧 storage key の有効値 / 不正値を実経路で確認する E2E を追加した。
- 旧第三者素材の未使用ライセンスファイルを除去し、公開静的領域に旧アセット由来の痕跡が残らない構成にした。
- 現行機能を反映してバンドル予算を 1.6 MB / gzip 360 KB 目安へ改定し、計測値 1,522.36 kB / gzip 350.61 kB が基準内であることを確認した（D-002）。
- 過去仕様が残っていた三ステージ、BGM / SE、タイトル画面、通常リスタート経路の説明を現行コードへ同期した。

### 学んだこと

- オリジナル化は表示物だけでなく、PWA メタデータ、永続キー、音響イベント名、現行仕様文書まで横断して監査する必要がある。
- 造形をコード生成に寄せると、時計工房パレットの一貫性と生成物の再現性を同時に維持できる。
- 可視要素のテストでも、コールバック直呼びではなく配置・物理 overlap・入力配線を通すことで回帰検出力が上がる。

### 次回への改善提案

- 新機能追加時点で、公開語彙とブランド残存チェックを受入基準へ含める。
- 能力物やステージ遷移を追加した時点で、実プレイ経路を通る E2E を同時に整備する。
- 永続ドキュメントの実装済み範囲とフォールバック方針を、各スプリントの検証項目として確認する。

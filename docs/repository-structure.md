# リポジトリ構造定義書

> 本プロジェクトはフロント単体構成（バックエンドなし）。

## ディレクトリ構成

```
chiku-clock-run/
├── src/                          # アプリケーション本体（TypeScript + Phaser 3）
│   ├── main.ts                   # Phaser.Game エントリポイント
│   ├── audio/                    # 音声合成レイヤ（Web Audio API、Phaser 非依存）
│   │   └── AudioManager.ts       # SE 5 種 + BGM ループの合成・再生・iOS unlock
│   ├── scenes/                   # Phaser Scene 群
│   │   ├── BootScene.ts          # Canvas API でスプライトシート生成 → TitleScene へ遷移（リロード復帰時は GameScene 直行）
│   │   ├── TitleScene.ts         # タイトル画面（SPACE/Enter/Tap でゲーム開始、全クリア後に自動遷移で戻り先）
│   │   ├── GameScene.ts          # ランタイム（地形構築・操作・カメラ・ビーコン・能力・音声）
│   │   ├── spriteSheets.ts       # Canvas API によるスプライトシート生成（プレイヤー 4F・敵 2F）
│   │   └── animations.ts         # Phaser アニメーション定義（player_idle/walk/jump・enemy_walk）
│   ├── config/                   # ゲーム全体の定数集約
│   │   └── gameConfig.ts         # 物理・寸法・閾値・テクスチャキー・SE/BGM パラメータ
│   ├── game/                     # GameScene マネージャ群（プレーンクラス、Scene 非継承）
│   │   ├── events.ts             # GameEvents 定数 + PointPayload / LandPayload 型
│   │   ├── CameraController.ts   # カメラズーム・追従・先読み・シェイク・フェード
│   │   ├── HudManager.ts         # HUD 生成・レイアウト・中央メッセージ・プロンプト
│   │   ├── ParticleManager.ts    # 短命バーストエミッタ（歯車片取得・敵撃破・着地土煙等）
│   │   ├── TouchController.ts    # タッチ入力（スライド移動・仮想ボタン・前倒しタップ）
│   │   ├── PlayerController.ts   # プレイヤー移動・ジャンプ・コヨーテ・バッファ・可変ジャンプ
│   │   ├── EnemyManager.ts       # 敵 AI・壁反転・段差端反転・撃破アニメーション
│   │   ├── PowerUpManager.ts     # 被弾後の無敵（i-frame・点滅）
│   │   └── CollisionHandler.ts   # overlap/collider 登録の一元管理
│   └── stages/                   # ステージデータ
│       ├── index.ts              # STAGES 配列・getStage / nextStageIndex ユーティリティ
│       ├── stage01.ts            # STAGE_01 定数（StageDefinition 型）
│       ├── stage02.ts            # STAGE_02 定数
│       ├── stage03.ts            # STAGE_03 定数
│       └── stageValidation.ts    # 必須ルート通行性・難易度進行の純粋検証
├── scripts/                      # ビルド補助スクリプト（Node.js、標準ライブラリのみ）
│   └── generate-icons.mjs        # 時計 PWA アイコン + 歯車片 / ビーコン PNG 生成
├── tests/
│   └── e2e/
│       └── game-visual.spec.ts   # Playwright による landscape 契約・canvas 描画・ゲーム進行検証
├── public/                       # Vite 静的ファイル（dist/ にそのままコピー）
│   ├── icons/                    # PWA アイコン（generate-icons.mjs で生成）
│   │   ├── icon-192.png          # 192×192 RGBA PNG（通常アイコン）
│   │   ├── icon-512.png          # 512×512 RGBA PNG（通常アイコン）
│   │   └── icon-maskable-512.png # 512×512 RGBA PNG（maskable、80% safe zone 適用）
├── index.html                    # Vite エントリ HTML（CSP `<meta>` 含む）
├── vite.config.ts                # Vite 設定（base パスは VITE_BASE_PATH から取得）
├── playwright.config.ts          # Playwright E2E 設定（Vite dev server 自動起動）
├── tsconfig.json / tsconfig.node.json  # TypeScript 設定
├── package.json                  # 依存・scripts（test:e2e は build 後に配布 manifest と画面を検証）
├── docs/                         # 永続的ドキュメント（6 本）
│   ├── product-requirements.md   # プロダクト要件定義書
│   ├── functional-design.md      # 機能設計書
│   ├── architecture.md           # 技術仕様書
│   ├── repository-structure.md   # リポジトリ構造定義書（本ファイル）
│   ├── development-guidelines.md # 開発ガイドライン
│   ├── glossary.md               # ユビキタス言語定義
│   └── template/                 # 永続的ドキュメントのひな形
├── .steering/                    # 作業単位のステアリングファイル
│   ├── template/
│   └── [YYYYMMDD]-[開発タイトル]/  # スプリント単位（requirements/design/tasklist/decisions）
├── .github/
│   └── workflows/
│       └── deploy.yml            # main push → build → GitHub Pages デプロイ
├── .devcontainer/                # Dev Container 定義
├── .claude/                      # Claude Code プロジェクト固有設定（skill 等）
├── CLAUDE.md                     # プロジェクト全体ルール
└── README.md                     # クイックスタート + スクリプト一覧
```

---

## ディレクトリの役割

| ディレクトリ / ファイル | 役割 |
|----------------------|------|
| `src/main.ts` | `Phaser.Game` 起動。`gameConfig` から viewport / 重力 / 背景色を取得 |
| `src/audio/AudioManager.ts` | Web Audio API による歯車片取得・ビーコン到達等の SE と BGM ループの合成・再生。`unlock()` で iOS Safari の AudioContext 制約に対応 |
| `src/scenes/BootScene.ts` | Canvas API で `buildPlayerSheet` / `buildEnemySheet` を呼びスプライトシートを生成後、通常起動は `TitleScene`、リロードフォールバック時は `GameScene` へ遷移 |
| `src/scenes/TitleScene.ts` | タイトルテキスト + 「Press SPACE / Tap to Start」プロンプト（点滅）を表示。SPACE / Enter / タップで `GameScene` へ遷移。`Scale.RESIZE` 対応の `layout()` で中央配置を維持。全クリア後の自動遷移先 |
| `src/scenes/GameScene.ts` | ステージ構築 / プレイヤー操作 / カメラ追従 / 巻きネジ障害機 AI / 歯車片取得 / 被弾・ライフ / ビーコン Overlap / AudioManager 統合 |
| `src/scenes/spriteSheets.ts` | `document.createElement('canvas')` + `textures.addCanvas` でプレイヤー（4F: idle/walk1/walk2/jump）・敵（2F: walk1/walk2）のスプライトシートを生成。`buildParticleTexture` で `particle_dot`（6px 白円）も生成する。`textures.exists` による冪等チェック付き |
| `src/game/` | GameScene から分離した 8 マネージャクラス。それぞれ `Phaser.Scene` を継承しないプレーンクラスで、コンストラクタで `scene` を受け取る |
| `src/game/events.ts` | `GameEvents` 文字列定数（`player:land` / `enemy:killed` / `gear:collected` 等）+ payload 型。マネージャ間の疎結合連携に使用 |
| `src/scenes/animations.ts` | `registerAnimations(scene)` で `player_idle` / `player_walk` / `player_jump` / `enemy_walk` を Phaser アニメーションマネージャに登録。`anims.exists` による冪等チェック付き |
| `src/config/gameConfig.ts` | 物理・障害機 / 歯車片・HUD・SE/BGM・寸法・テクスチャキーの単一集約点 |
| `src/stages/stage01.ts` | 1 ステージ分のタイル定義。`'E'` は巻きネジ障害機、`'C'` は歯車片 |
| `src/stages/stageValidation.ts` | `criticalPath` の床上クリアランスと、ステージ順の難易度 metrics をテスト用に検証 |
| `index.html` | Vite エントリ HTML。CSP `<meta>` で `default-src 'self'` 系を設定。Phaser Loader 用に `img-src` は `blob:` を許可 |
| `scripts/generate-icons.mjs` | Node.js 標準ライブラリのみで時計文字盤 / 歯車モチーフの PWA アイコンと小型ゲーム PNG を決定的に生成 |
| `public/icons/` | PWA アイコン 3 種。`manifest.webmanifest` から参照される。`generate-icons.mjs` で再生成可能 |
| `vite.config.ts` | `base: process.env.VITE_BASE_PATH ?? '/'`（GitHub Pages 配下用）。`VitePWA` プラグインで landscape 指定の manifest / SW を自動生成。PNG の data URI 化を避けるため `assetsInlineLimit: 0` を設定 |
| `playwright.config.ts` | `npm run test:e2e` 用設定。Chromium と Vite dev server を使って canvas 描画を検証 |
| `package.json` | `test:e2e` で `npm run build` を前置し、生成された `manifest.webmanifest` を含む配布契約検証を成立させる |
| `tests/e2e/` | Playwright E2E テスト。`game-visual.spec.ts` は landscape manifest / portrait UI 不在の契約、canvas 描画、能力とステージ進行を直列で検証 |
| `docs/` | 永続的ドキュメント 6 本（`product-requirements.md` / `functional-design.md` / `architecture.md` / `repository-structure.md` / `development-guidelines.md` / `glossary.md`） |
| `docs/template/` | 永続的ドキュメントのひな形 |
| `.steering/[YYYYMMDD]-[開発タイトル]/` | スプリント単位の要求・設計・タスクリスト・決定事項ログ |
| `.steering/template/` | スプリント単位ドキュメントのひな形 |
| `.github/workflows/deploy.yml` | `main` push トリガで `npm run build` → `actions/deploy-pages@v4` |
| `.devcontainer/` | Dev Container（Node.js 20 + Claude Code CLI + code-tunnel） |
| `.claude/` | Claude Code skill（`permanent-doc`, `steering-doc`, `init`, `review`, `security-review`）と settings |

---

## ファイル配置ルール

- 永続的ドキュメントは `docs/` 直下に配置
- 作業単位のドキュメントは `.steering/[YYYYMMDD]-[開発タイトル]/` に配置
- 物理定数・閾値・テクスチャキー・HUD スタイル文字列は `src/config/gameConfig.ts` に集約。シーンファイルにマジックナンバー / 色 / HUD 文言の直書き禁止
- ステージデータは `src/stages/` に 1 ファイル 1 ステージで配置（`stage01.ts` / `stage02.ts` / `stage03.ts`）
- PWA アイコンは `public/icons/` に配置。`scripts/generate-icons.mjs` で再生成可能（`npm run generate-icons`）
- E2E テストは `tests/e2e/` に配置。スクリーンショットの恒久成果物はコミットしない
- 機密情報を含むファイル（`.env`, シークレット鍵 等）は `.gitignore` 対象（本案件では発生しない想定）

---

## 命名規則

### ステアリングディレクトリ

```
.steering/[YYYYMMDD]-[開発タイトル]/
```

- `YYYYMMDD`: 着手日
- `開発タイトル`: 半角英数字 + ハイフン区切り（例: `minimum-playable`）

### ドキュメントファイル

- 永続的ドキュメント: `kebab-case.md`（例: `architecture.md`, `repository-structure.md`）
- 作業単位ドキュメント: `requirements.md` / `design.md` / `tasklist.md` / `decisions.md` / `perf-report.md` の固定ファイル名

### コードファイル

- TypeScript: `PascalCase.ts`（クラスを export するファイル: 例 `BootScene.ts`）/ `camelCase.ts`（定数モジュール: 例 `gameConfig.ts`）/ `lowercase.ts`（データモジュール: 例 `stage01.ts`）

---

## .gitignore 対象（主なもの）

- ビルド成果物（`dist/`）
- 依存関係ディレクトリ（`node_modules/`）
- 個人環境設定（`.vscode/settings.json` 等）
- 機密ファイル（`.env`, `.env.local`, `*.pem`, `*.key`, `secrets/`）
- Claude Code ローカル設定（`.claude/settings.local.json`）
- キャッシュ・一時ファイル（`.cache/`, `tmp/`, `*.log` 等）

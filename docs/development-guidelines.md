# 開発ガイドライン

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-04 |
| 最終更新 | 2026-05-13 |
| 担当 | モドリッチ |
| ステータス | 承認済み |

---

## コーディング規約

### ハードコーディング禁止

以下はソースコードに直接書かない。

- **物理定数・ゲームパラメータ** → `src/config/gameConfig.ts` に集約（`GRAVITY_Y`, `PLAYER_SPEED`, `JUMP_VELOCITY` 等）
- **スプライト寸法・色・テクスチャキー** → `src/config/gameConfig.ts` に集約（`TEX_KEY.*` で文字列リテラル直書き禁止）
- **HUD スタイル・表示文言** → `src/config/gameConfig.ts` に集約（`HUD_FONT_SIZE`, `HUD_GEAR_LABEL` 等）
- **ステージ定義・タイル配列** → `src/stages/` 配下の各ステージファイルに集約。`GameScene` へのタイル直書き禁止
- **デプロイ先の base パス** → 環境変数 `VITE_BASE_PATH`（`vite.config.ts` 経由）。GitHub Actions の CI で `/${{ github.event.repository.name }}/` を設定
- **API キー / シークレット** → 現状発生しないが、将来発生する場合は `.env`（`.gitignore` 対象）または Secret Manager 経由。`.env` の値は絶対にコードに直書きしない
- **ドキュメント内の機密情報** → プレースホルダ（`<REPO_NAME>`, `<REDACTED>` 等）を使用

### TypeScript 規約

- 命名規則: 定数 `SCREAMING_SNAKE_CASE` / クラス・型 `PascalCase` / 変数・関数 `camelCase` / ファイル名（クラス export）`PascalCase.ts` / ファイル名（定数・データモジュール）`camelCase.ts` または `lowercase.ts`
- `any` 禁止。型が不明な場合は `unknown` + 型ガードを使う
- `interface` vs `type`: データ構造定義は `interface`（拡張性あり）、ユニオン型・交差型・タプルは `type`
- Phaser コールバックの型付け: `Phaser.Types.Physics.Arcade.ArcadePhysicsCallback` 等の公式型を使用
- `import` 順序: 外部ライブラリ（`phaser`）→ 内部モジュール（`../config/...`, `../stages/...`）の順
- `tsc --noEmit`（`npm run typecheck`）を実装完了後に必ず通すこと

### セキュリティ

- Phaser の `add.text()` / `setText()` に渡す文字列はリテラル定数または数値型（`number`）のみ。ユーザー入力文字列を直接渡さない
- 外部アセット・外部 CDN の読み込み禁止（追加依存時は `index.html` の CSP を先に確認）
- `index.html` の CSP `<meta>` は `default-src 'self'` ベースを維持。新しい外部リソース参照が必要になる場合は必ずクルトワ（security-engineer）にレビュー依頼
- 入力として扱うのはキーボードイベント・タッチ座標のみ。座標はゲームロジック内部でのみ使用し外部送信しない

---

## Git 規約

### ブランチ戦略

- **GitHub Flow** を採用: `main` ブランチへの直接 push または短命フィーチャーブランチ + PR
- `main` が常にデプロイ可能な状態を維持する
- ブランチ命名: `feature/<説明>` / `fix/<説明>` / `chore/<説明>`（半角英数字 + ハイフン区切り）

### コミットメッセージ

Conventional Commits 形式を採用:

```
<type>: <summary>

[body（任意）]
```

| プレフィックス | 用途 |
|-------------|------|
| `feat` | 新機能追加 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみの変更 |
| `chore` | ビルド・設定・依存関係の変更 |
| `refactor` | 機能変更なしのリファクタリング |
| `test` | テスト追加・修正 |
| `perf` | パフォーマンス改善 |

- サマリーは 50 文字以内。日本語可
- body には「なぜ変更したか」を書く。コードを読めば分かる「何を変更したか」は省略

### コミット前のセキュリティレビュー

- 全コミット前にクルトワ（security-engineer エージェント）にレビュー依頼（CLAUDE.md 絶対ルール）
- レビュー対象: 変更されたすべてのファイル（XSS・インジェクション・ハードコーディング・CSP 変更の有無）
- Critical / High の指摘があれば修正してからコミットする
- `.env` は `.gitignore` に含まれていることを確認

### Pull Request

- 1 人プロジェクトのため CI 通過（typecheck + build 成功）を確認してからマージ
- コミット前クルトワレビュー完了をコミットコメントに記録する

---

## テスト規約

### 現状

E2E テストとして Playwright を導入済み。`npm run test:e2e` は Vite dev server を自動起動し、Chromium でゲーム画面の canvas 描画を検証する。初回環境では `npx playwright install chromium` を実行する。

### テストを追加する場合の規約

- 実際の機能を検証すること（`expect(true).toBe(true)` のような無意味なアサーション禁止）
- モックは必要最小限。Phaser シーン依存を切り離せる純粋関数（`buildStage()` 等）から先にテスト化する
- 境界値・異常系（不正なタイル定義 / `'P'` が 2 個 / タイル数不一致）も必ずテストする
- テストを通すためだけのハードコード / 本番コードへの `if (testMode)` 分岐は禁止

### テスト分類（将来追加時の方針）

| レイヤ | ツール候補 | 対象 |
|-------|---------|------|
| ユニット | Vitest | `buildStage()` バリデーション / `StageDefinition` 型 / `gameConfig` 定数の整合性 |
| E2E | Playwright | canvas 描画 / 能力・ビーコン進行 / 最大プレイヤーの必須ルート通行性 / ステージ難易度進行 / ミスリスタートの基本フロー |

### ビルド品質チェック（現行の代替手段）

`npm run typecheck && npm run build` が通ることをコミット前に確認する。画面描画に関わる変更では `npm run test:e2e` も実行する。TypeScript のコンパイルエラーと型エラーはゲームロジックの多くのバグを事前に検出できる。

---

## ナレッジ蓄積ルール

作業中に得た知見・教訓は **発見した瞬間に即座に書き込む**。会話の最後やコミット前にまとめて書くのではなく、**発見した瞬間に書く**。

### 書き込み先

- 作業中の知見 → 該当する `.steering/[YYYYMMDD]-[開発タイトル]/decisions.md` に記録
- 検証済みの汎用的な知見 → 本ファイル（`docs/development-guidelines.md`）のドメイン別ルールに直接反映
- 横断的なハマりどころ → auto memory（`MEMORY.md`）にも記録

### 即座に書き込むべきタイミング

- バグの根本原因が判明したとき
- 設計判断で選択肢を比較・決定したとき
- セキュリティレビューで指摘が見つかったとき
- 試行錯誤の末に解決策が判明したとき（失敗した試みも含めて）

### 記録する / しない の判断基準

記録する:
- 次回また同じことで迷いそうな判断
- Phaser のバージョン固有のバグ回避策
- 試行錯誤の末に判明した解決策（失敗した試みも含めて）

記録しない:
- 公式ドキュメントに書いてあること
- コードを読めば自明な内容

---

## 図表・ダイアグラムの記載ルール

### 記載場所

設計図やダイアグラムは、関連する永続的ドキュメント（`docs/`）内に直接記載する。独立した `diagrams/` フォルダは作成しない。

### 記述形式

1. **Mermaid 記法（推奨）** — Markdown に直接埋め込め、GitHub で自動レンダリングされる。バージョン管理が容易
2. **ASCII アート** — シンプルな構成図に使用
3. **画像ファイル** — 複雑なワイヤフレームのみ。`docs/images/` 配下に PNG / SVG で配置

### 図表の更新

- 設計変更時は対応する図表も同時に更新する
- 図表とコードの乖離を防ぐ（特に状態遷移図 / シーン構成図）

---

## ドメイン別ルール

> 本セクションには、プロジェクト固有のハマりどころ・運用ルールを蓄積する。
> 新しい知見が得られたら **該当ドメインの末尾に追記** する。

### フロントエンド（Phaser 3）

#### 'P' / 'G' タイルは「スプライトの足元が乗るセル」

**背景:** `spawnY = spawnRow * TILE_SIZE + TILE_SIZE / 2`（タイル中心配置）にするとプレイヤー足元が床に 8px めり込み、Arcade Physics がめり込みを解消できず地面を貫通して落ち続ける。

**対処:** スプライト下端 = `(row + 1) * TILE_SIZE` になるよう中心 Y を逆算する:

```typescript
spawnY = (spawnRow + 1) * TILE_SIZE - PLAYER_SPRITE_H / 2
beaconY = (goalRow + 1) * TILE_SIZE - BEACON_SPRITE_H / 2
```

これにより `'P'` / `'G'` タイルの意味は「スプライトの足元が乗るセル」に統一される。レベル設計時は、以下の最大プレイヤー用クリアランス規約を併せて守る。

#### 必須ルートは最大プレイヤー用に床上 3 タイルを空ける

**背景:** `big` / `fire` 状態は `PLAYER_SPRITE_H * BIG_SCALE = 56 * 1.5 = 84px` となる。`TILE_SIZE = 32px` では床上 3 タイル分の空間がなければ、能力取得後に低天井へ詰まる。

**対処:** 各 `StageDefinition` に `criticalPath` を宣言し、必須ルートの支持床直上 3 タイル内へ `#` を配置しない。加えて `P` タイルの左右 1 セルを空け、能力状態を維持した遷移後の最大横幅 body が地形へ食い込まないようにする。`src/stages/stageValidation.ts` の `validateCriticalPathClearance()` を Playwright から実行し、マップ変更時に閉塞を検出する。

#### ステージ難易度は契約値で単調増加を検証する

**背景:** ステージ数だけを増やしても、障害機やギャップの要求が同程度では進行による体感差が生まれない。

**対処:** Stage 01 を導入、Stage 02 を中間、Stage 03 を最終難度とし、`measureStageDifficulty()` で障害機数・主床ギャップ数・主床より上のタイル表面から導出した高所区間数を計測する。`validateDifficultyProgression()` により役割の順序と合成 score がステージ順に厳密増加することを E2E で保証する。

#### リスタートは scene.restart() を通常経路とし、全体リロードをフォールバックに保つ

**背景:** 過去に `scene.restart()` 後の床貫通が確認されたため全体リロード経路を用意した。その後、静的 body の `.refreshBody()` と描画・物理寸法の整合を導入し、現在の通常経路は `scene.restart()` に戻している。

**対処:** `USE_HARD_RELOAD_FALLBACK = false` の通常設定では `fullRestart()` と次ステージ遷移は `scene.restart()` を使う。床貫通が再発した場合は同定数を `true` にして `window.location.reload()` と sessionStorage による復帰経路を有効化できる。

#### StaticGroup の Sprite には必ず refreshBody() を呼ぶ

**背景:** `staticGroup.create()` で生成した地面 Sprite は、`BootScene.preload()` で読み込んだ画像テクスチャを参照する。シーン再構築時にテクスチャの寸法取得が遅延するケースがあり、static body のサイズ・位置が正しく確立されない場合がある。

**対処:** `buildStage()` 内で地面 Sprite と beacon Sprite の生成直後に `.refreshBody()` を明示的に呼ぶ。

#### Phaser Loader の画像読み込みには CSP `img-src blob:` が必要

**背景:** `this.load.image()` は内部で画像を blob URL として処理する場合がある。`img-src 'self' data:` のみではブラウザが `blob:` をブロックし、`BootScene` の必須テクスチャ検証で ground / gearBit / beacon が欠落する。

**対処:** `index.html` の CSP は `img-src 'self' data: blob:` を維持する。外部画像の許可ではなく、同一オリジンで取得した画像を Phaser Loader が内部処理するための許可として扱う。

#### プレイヤースプライトの足裏はフレーム下端まで描画する

**背景:** Arcade Physics の body 下端を床に合わせても、スプライト画像内の足裏ピクセルがフレーム下端まで届いていないと、透明余白が拡大表示されて床から浮いて見える。

**対処:** `spriteSheets.ts` のプレイヤー各フレームでは靴の矩形を描画キャンバス下端まで届かせ、スプライトシート生成時は `imageSmoothingEnabled = false` を維持する。接地表現を変更した場合は `tests/e2e/game-visual.spec.ts` の足裏ピクセル検証を更新する。

#### 表示サイズ変更後の body は未スケール寸法で設定する

**背景:** `setDisplaySize()` は Game Object の scale を変更する。直後に `body.setSize(displayWidth, displayHeight)` を呼ぶと Arcade Physics 側で scale が再適用され、big 状態の body が表示より大きくなり、接地位置がずれる。

**対処:** プレイヤーの body サイズは `PLAYER_SPRITE_W` / `PLAYER_SPRITE_H` のような未スケール寸法で設定する。表示倍率は `setDisplaySize()` に集約し、body 下端と visual 下端の一致を E2E で検証する。

#### カメラ境界と物理ワールド境界は両方設定する

`cameras.main.setBounds(...)` と `physics.world.setBounds(...)` の両方をステージ寸法（`cols * TILE_SIZE` × `rows * TILE_SIZE`）に合わせて設定する。片方だけだとカメラがステージ外に出る / `setCollideWorldBounds` が機能しない。

#### Overlap 登録順序: クロックビーコン → 障害機 → 歯車片

ビーコン Overlap を最初に登録することで、クリア接触と障害機・歯車片接触が同フレームに発生した場合、クリアコールバックが先行する。さらに `onEnemyOverlap` / `onGearBitOverlap` の冒頭で `if (this.isCleared || this.isMissed) return;` のガードを入れることで二重発火を防ぐ。

#### 敵の速度は毎フレーム強制セットする

`enemy.setVelocityX(dir * ENEMY_SPEED)` を `update()` 内（`updateEnemyAi()`）で毎フレーム強制する。壁衝突後に Phaser Arcade Physics が速度をゼロ化するケースがあるため、一度設定するだけでは敵が途中で止まる。

#### 敵の段差端検出には groundMask を使う

毎フレーム地形を走査するコストを避けるため、`buildStage()` 時に `boolean[][]` の `groundMask` を生成し、敵 AI の段差端検出に使う。O(1) のルックアップで済む:

```typescript
const probeCol = Math.floor((enemy.x + dir * offset) / TILE_SIZE);
const probeRow = Math.floor((enemy.y + ENEMY_SPRITE_H / 2 + 1) / TILE_SIZE);
if (!groundMask[probeRow]?.[probeCol]) { /* 反転 */ }
```

#### 踏みつけ判定には STOMP_TOLERANCE_PX の余裕を持たせる

厳密な `pBody.bottom <= eBody.top` の等値比較は判定漏れが多い。`STOMP_TOLERANCE_PX`（= 6px）のトレランスを加えた `pBody.bottom <= eBody.top + STOMP_TOLERANCE_PX` で判定する。値は `gameConfig.ts` に集約。

#### タッチ操作はゾーン分割方式（画面左側スライド移動 / 右側タップジャンプ）

現在は左側のスライドで移動し、右側のタップでジャンプする。パルス能力中は右側のダブルタップでパルス弾を発射する。操作方式を変更する場合は関連定数と E2E を併せて更新する。

#### HUD テキストは setScrollFactor(0) でカメラ固定

画面に常時表示する HUD テキスト（歯車片取得数・操作説明）は `setScrollFactor(0)` を呼ぶ。これを忘れるとカメラスクロールに追従してテキストが画面外に出る。クリア表示テキストも同様。

### インフラ / CI/CD

#### GitHub Pages の base パスは VITE_BASE_PATH 環境変数で解決

GitHub Pages は `https://<owner>.github.io/<repo>/` のサブパスで配信される。`vite.config.ts` で `base: process.env.VITE_BASE_PATH ?? '/'` とし、`.github/workflows/deploy.yml` で `VITE_BASE_PATH: /${{ github.event.repository.name }}/` を設定する。この仕組みを変えると Pages でゲームが正常にロードされなくなる。

#### デプロイ確認はシャビが GitHub Pages で実施

手動の実機確認は GitHub Pages にデプロイ後、シャビがスマートフォン含めて行う。自動確認は `npm run test:e2e` を使い、Vite dev server は Playwright の `webServer` から起動する。

### セキュリティ

#### CSP の meta タグを維持する

`index.html` の `<meta http-equiv="Content-Security-Policy">` を削除・緩和しない。現在の設定:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

外部スクリプト / 外部スタイル / 外部画像を追加する場合は、CSP の変更をクルトワ（security-engineer）にレビューしてから実装する。

#### Phaser add.text() に動的文字列を渡す場合は型で保護する

スコア・HUD など動的に更新される文字列は、数値（`number`）を `toString()` または テンプレートリテラルで埋め込む形に限定する。`unknown` 型や外部由来の文字列を直接渡さない。

---

## 注意事項

- ドキュメントの作成・更新は段階的に行い、各段階でシャビの承認を得る
- `.steering/` のディレクトリ名は日付と開発タイトルで明確に識別できるようにする（`YYYYMMDD-kebab-case`）
- 永続的ドキュメント（`docs/`）と作業単位のドキュメント（`.steering/`）を混同しない
- スプリント固有の決定事項は `.steering/...decisions.md` に書く。恒久ルールに昇格したものだけ本ファイルの「ドメイン別ルール」に反映する
- 図表は必要最小限にとどめ、メンテナンスコストを抑える

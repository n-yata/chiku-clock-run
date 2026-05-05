# 要求書: スプライトアセットの導入（プレースホルダ → 外部 PNG）

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-05 |
| 担当 | モドリッチ |
| 関連スプリント | なし（PRD TBD-001「外部アセット導入時期」を解決するスプリント） |

---

## 1. 背景

### 1.1 現状

- v0.5 時点で全スプライトが `BootScene.preload()` 内の `Graphics.generateTexture()` によるプログラム生成プレースホルダ（色付き矩形・円）
- 対象 5 種: プレイヤー（赤矩形 32×48）・地面（茶矩形 32×32）・ゴール（金矩形 32×64）・敵（茶矩形 28×28）・コイン（黄円 16×16）
- 見た目がシンプルすぎるため「ゲームらしさ」に欠ける
- PRD TBD-001「外部アセット（画像 / 音声）の導入時期」が未解決のまま
- `architecture.md` §拡張・将来課題 に「`BootScene` の `generateTexture()` を `this.load.image()` に置換するだけで対応可（`TEX_KEY` で抽象化済み）」と明記済みで、移行余地は設計段階から確保されている

### 1.2 やりたいこと

CC0（著作権放棄）ライセンスの外部 PNG アセットを導入し、全 5 種のスプライトをプレースホルダから差し替える。
アニメーション（スプライトシート連続再生）は今回スコープ外とし、静止画 PNG の差し替えに絞る。

---

## 2. ゴール

### 2.1 主目的

- Before: 色付き矩形・円のプレースホルダ
- After: ドット絵風 PNG スプライトで「マリオ風アクションゲーム」の見た目を実現する
- ゲームプレイ（物理・当たり判定・スコア・BGM/SE）への影響ゼロで差し替えを完了する

### 2.2 副次目的

- PRD TBD-001 を解決し、外部アセット導入ワークフロー（ダウンロード → `public/assets/images/` 配置 → `load.image()` ロード）を確立する
- 将来のアニメーション導入（スプライトシート化）・音声アセット追加の土台を整える
- `TEX_KEY` 定数の有効性を実証し、今後のアセット差し替えが定数変更なしで可能なことを確認する

---

## 3. スコープ

### 3.1 含むもの

- 素材調達: Kenney.nl の CC0 ライセンスプラットフォーマー系アセットから全 5 種の PNG を選定・ダウンロード
- ファイル配置: `public/assets/images/` ディレクトリに PNG を格納（Vite の `public/` 配下として自動配信）
- `src/scenes/BootScene.ts` の `preload()`: `generateTexture()` → `this.load.image()` に切り替え
- `src/config/gameConfig.ts`: アセットパス定数（`ASSET_PATH_*`）を追加してハードコーディングを排除
- スプライト寸法の調整: ロードした PNG の実寸が既存定数（`PLAYER_SPRITE_W/H` 等）と異なる場合、`setDisplaySize()` で表示サイズを合わせるか、定数値を更新する（design.md でバルベルデと協議）
- 影響ドキュメント更新: `docs/architecture.md` / `docs/repository-structure.md` / `docs/product-requirements.md`

### 3.2 含まないもの

- アニメーション（歩行・ジャンプ・踏みつけの連続コマ送り）— 後続スプリントに送る
- 音声アセット（BGM/SE の外部ファイル化）— 現行の Web Audio API 合成を維持
- タイル地面の複数バリエーション（草・岩・砂など）— 後続スプリントに送る
- UI 画像（HUD アイコン・ボタン画像）— 後続スプリントに送る
- 背景画像（空・山並みスクロールなど）— 後続スプリントに送る

---

## 4. 機能要件

### 4.1 アセット調達・配置フロー

1. Kenney.nl の CC0 プラットフォーマーパックから全 5 種（プレイヤー・地面・ゴール・敵・コイン）に対応する PNG を選定
2. `public/assets/images/` に以下のファイル名で配置する（ファイル名は `TEX_KEY` と対応させる）:

| TEX_KEY | ファイル名（予定） |
|---------|----------------|
| `player` | `player.png` |
| `ground` | `ground.png` |
| `goal` | `goal.png` |
| `enemy` | `enemy.png` |
| `coin` | `coin.png` |

3. `public/` 配下は Vite ビルド時にそのまま `dist/` へコピーされるため追加設定不要

### 4.2 BootScene 変更仕様

- `preload()` 内の `this.add.graphics()` による `generateTexture()` 呼び出しを全削除
- `this.load.image(TEX_KEY.player, ASSET_PATH_PLAYER)` 形式に置換（パスは `gameConfig.ts` 定数から取得）
- `create()` の遷移ロジックは無変更

### 4.3 gameConfig.ts 追加定数

- `ASSET_PATH_PLAYER`, `ASSET_PATH_GROUND`, `ASSET_PATH_GOAL`, `ASSET_PATH_ENEMY`, `ASSET_PATH_COIN` を追加
- パス文字列は `'assets/images/player.png'` 形式（Vite の base パスは実行時に付与されるため相対パスで統一）
- マジックナンバー・ハードコーディング禁止（`gameConfig.ts` が唯一の集約点）

### 4.4 既存機能の互換要件

- `TEX_KEY` の値（`'player'` / `'ground'` / `'goal'` / `'enemy'` / `'coin'`）は変更しない（`GameScene.ts` 全体に散在するため）
- `GameScene.ts` のスプライト生成・物理ボディ設定・当たり判定ロジックは無変更
- ゴール・コイン・敵の当たり判定サイズは既存定数（`PLAYER_SPRITE_W/H` 等）を維持する（`setDisplaySize()` で見た目のみ調整する方針を design.md で確認）

---

## 5. 非機能要件

### 5.1 パフォーマンス

- バンドルサイズ: 画像は `dist/assets/images/` に配置されバンドルには含まれないため JS バンドルサイズへの影響なし
- 初回ロード: 全 5 PNG の合計サイズ < 200 KB を目標（ドット絵は軽量なため達成見込み）
- 描画 fps: スプライト差し替えによる fps 低下なし（Phaser の TextureManager は WebGL テクスチャにアップロードするだけ）

### 5.2 信頼性

- 画像ロード失敗時: Phaser は `load.on('loaderror', ...)` でエラーを通知。`BootScene` に最小限のエラーハンドラを追加し、コンソールにログを出す（ゲームを止めるほどの復帰処理は不要）

### 5.3 互換性・依存

- フロント: Phaser 3.80 の `this.load.image()` を使用。追加ライブラリ不要
- ハードコーディング禁止: アセットパスは `src/config/gameConfig.ts` の `ASSET_PATH_*` 定数に集約する

### 5.4 セキュリティ

- CSP: 現行の `img-src 'self' data:` で `public/assets/images/` の PNG 配信は許可済み。変更不要
- 外部 CDN からの読み込みは行わない（同一オリジン完結）

---

## 6. 制約・前提条件

- 素材ライセンス: **CC0（著作権放棄）のみ** を使用する。Kenney.nl は全素材が CC0。帰属表示不要・商用利用可
- Vite の `public/` 静的配信: `public/` 配下のファイルは `import` せずパス参照で使用する（Vite の仕様）
- GitHub Pages の HTTPS 配信: 外部リソースを読まないため CORS 設定は不要
- 実装後はクルトワ（security-engineer）レビュー必須（CLAUDE.md）

---

## 7. 受け入れ条件

- [ ] プレイヤー・地面・ゴール・敵・コインの全 5 種が PNG スプライトで表示される
- [ ] `generateTexture()` を使ったコードが `BootScene.ts` から完全に除去されている
- [ ] アセットパスが `gameConfig.ts` の定数経由で指定されており、直接文字列ハードコードがない
- [ ] ゲームプレイ（移動・ジャンプ・踏みつけ・コイン取得・ゴール・ミス・BGM/SE・ステージ進行・タイトル遷移）が正常に動作する
- [ ] `npm run build` が成功し、`dist/` に PNG が含まれている
- [ ] クルトワ（security-engineer）レビューで Critical/High なし

---

## 8. 未確定事項（design.md でバルベルデと協議）

- Q1. PNG の実寸が既存スプライト定数と異なる場合、`setDisplaySize()` で見た目だけ合わせるか、`gameConfig.ts` の `*_SPRITE_W/H` 定数を実寸に更新するか
- Q2. 使用する具体的な Kenney パック名・ファイルを design.md 段階で確定するか、実装フェーズで決めるか

---

作成: モドリッチ / 2026-05-05

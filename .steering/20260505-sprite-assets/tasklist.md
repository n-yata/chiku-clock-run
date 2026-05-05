# タスクリスト: スプライトアセットの導入（プレースホルダ → 外部 PNG）

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-05 |
| 担当 | モドリッチ |
| 関連設計 | `.steering/20260505-sprite-assets/design.md` |
| 関連要求 | `.steering/20260505-sprite-assets/requirements.md` |

---

## 進め方の原則

- **アセット取得 → 定数追加 → BootScene 差し替え → GameScene 追記 → ビルド検証 → クルトワレビュー → コミット → ドキュメント更新**
- 各タスクは [ ] 未着手 / [WIP] 進行中 / [x] 完了 で管理
- ハードコーディング禁止: アセットパスは `gameConfig.ts` の `ASSET_PATH_*` 定数のみ
- コミット前は **必ずクルトワ（security-engineer）レビュー**（CLAUDE.md ルール）
- 各 Phase は完了次第、止まらずに次へ進む
- **止まるのはシャビの判断が必要な事項が発生したときのみ**

---

## P2: アセット取得・配置

- [ ] **P2-1**: `public/assets/images/` ディレクトリを作成する
- [ ] **P2-2**: Kenney "Pixel Platformer" の zip をダウンロードし、5 ファイルをリネームして配置する（design.md §4.3 のコマンド参照）
  - `player.png` ← `Tiles/Characters/tile_0000.png`
  - `ground.png` ← `Tiles/tile_0000.png`
  - `goal.png`   ← `Tiles/tile_0111.png`
  - `enemy.png`  ← `Tiles/Characters/tile_0024.png`
  - `coin.png`   ← `Tiles/tile_0151.png`
- [ ] **P2-3**: `KENNEY_LICENSE.txt` を `public/assets/images/` に同梱する（Q5 採用）
- [ ] **P2-4**: `du -sb public/assets/images/*.png` で合計サイズが < 200 KB であることを確認する

---

## P3: コード変更

### P3-A: gameConfig.ts — 定数追加

- [ ] **P3-A-1**: `src/config/gameConfig.ts` 末尾に `// --- v0.6: 外部スプライトアセット ---` セクションを追加する
  - `ASSET_PATH_PLAYER = 'assets/images/player.png'`
  - `ASSET_PATH_GROUND = 'assets/images/ground.png'`
  - `ASSET_PATH_GOAL   = 'assets/images/goal.png'`
  - `ASSET_PATH_ENEMY  = 'assets/images/enemy.png'`
  - `ASSET_PATH_COIN   = 'assets/images/coin.png'`

### P3-B: main.ts — pixelArt 設定追加

- [ ] **P3-B-1**: `src/main.ts` の Phaser ゲーム設定に `pixelArt: true` を追加する（Q3 採用。スケーリング時のにじみ防止）

### P3-C: BootScene.ts — generateTexture → load.image に差し替え

- [ ] **P3-C-1**: 対象ファイルを Read で確認してから変更する
- [ ] **P3-C-2**: `preload()` から `add.graphics()` / `generateTexture()` / `g.destroy()` の全コードを削除する
- [ ] **P3-C-3**: `preload()` に `load.on('loaderror', ...)` ハンドラと `load.image()` 5 行を追加する（design.md §3.1 の After コード参照）
- [ ] **P3-C-4**: 不要になった import（`*_COLOR`, `*_SPRITE_W/H`, `TILE_SIZE`, `TEX_KEY` の旧依存分）を整理し、`ASSET_PATH_*` を追加 import する

### P3-D: GameScene.ts — setDisplaySize 追加

- [ ] **P3-D-1**: 対象ファイルを Read で確認し、スプライト生成箇所（player / ground タイル / goal / enemy / coin）を特定する
- [ ] **P3-D-2**: 各スプライト生成直後に `setDisplaySize(W, H)` を 1 行ずつ追加する（design.md §3.4 の表参照）
  - Player: `player.setDisplaySize(PLAYER_SPRITE_W, PLAYER_SPRITE_H)`
  - Ground: `tile.setDisplaySize(TILE_SIZE, TILE_SIZE)`
  - Goal: `goal.setDisplaySize(GOAL_SPRITE_W, GOAL_SPRITE_H)`
  - Enemy: `enemy.setDisplaySize(ENEMY_SPRITE_W, ENEMY_SPRITE_H)`
  - Coin: `coin.setDisplaySize(COIN_SPRITE_W, COIN_SPRITE_H)`

### P3-E: ビルド検証

- [ ] **P3-E-1**: `npx tsc --noEmit` で型エラーがないことを確認する
- [ ] **P3-E-2**: `npm run build` が成功し、`dist/assets/images/` に 5 PNG が含まれることを確認する
  ```bash
  npm run build && ls dist/assets/images/
  ```
- [ ] **P3-E-3**: `grep -rn "generateTexture" src/` が 0 件であることを確認する
- [ ] **P3-E-4**: `grep -rn "assets/images" src/` で `gameConfig.ts` 以外にヒットしないことを確認する

---

## P4: 動作確認

- [ ] **P4-1**: ビルド成果物を確認 — 全 5 スプライト（プレイヤー・地面・ゴール・敵・コイン）が Kenney ピクセルアートで表示されている
- [ ] **P4-2**: プレイヤー操作（移動・ジャンプ）が正常に動作する
- [ ] **P4-3**: 踏みつけ・コイン取得・ゴール到達・ミス演出が正常に動作する
- [ ] **P4-4**: ステージ 1→2→3 の進行と全クリア後のタイトル遷移が正常に動作する
- [ ] **P4-5**: BGM/SE が正常に再生される

---

## P5: クルトワ（security-engineer）レビュー + コミット

- [ ] **P5-1**: 変更ファイル全てのセキュリティレビューをクルトワに依頼する
  - 対象: `gameConfig.ts`（ASSET_PATH_* 追加）、`BootScene.ts`（load.image 差し替え）、`GameScene.ts`（setDisplaySize 追加）、`main.ts`（pixelArt 追加）、`public/assets/images/*.png`
  - 確認観点: アセットパスのハードコーディングなし確認、CSP 互換性、外部 URL 混入なし、CC0 ライセンス同梱確認
- [ ] **P5-2**: 指摘事項を確認する
  - Critical / High なし → 次へ自動継続
  - **Critical / High あり → 止めてシャビに確認**
- [ ] **P5-3**: 指摘修正（あれば）
- [ ] **P5-4**: シャビへレビュー結果報告 → **コミット承認取得**（必ず止まる）
- [ ] **P5-5**: コミット作成・push

---

## P6: ドキュメント更新

- [ ] **P6-1**: `docs/architecture.md` の §拡張・将来課題 で「アセット差し替えは移行余地」と書かれていた箇所を「v0.6 で対応済」に更新し、現行アーキテクチャに外部 PNG 配信の記述を追加する
- [ ] **P6-2**: `docs/repository-structure.md` に `public/assets/images/` ディレクトリを追記する
- [ ] **P6-3**: `docs/product-requirements.md` の TBD-001「外部アセット導入時期」を「v0.6 で対応済」に更新する

---

## 横断タスク（全フェーズ共通）

- [ ] **X-1**: 各タスク着手前に対象ファイルの最新状態を Read で確認する（セッション引き継ぎ原則）
- [ ] **X-2**: 変更後は必ず `tsc --noEmit` + `npm run build` で検証する
- [ ] **X-3**: 重要な発見・ハマりどころは即座に `decisions.md` に記録する

---

## 進捗マイルストーン

| マイルストーン | 完了条件 |
|--------------|--------|
| **M1: アセット配置完了** | `public/assets/images/` に 5 PNG + ライセンスファイルが揃っている |
| **M2: コード差し替え完了** | `tsc --noEmit` 通過・`generateTexture` 0 件・ハードコーディング 0 件 |
| **M3: 動作確認完了** | 全スプライトが PNG で表示され、ゲームプレイ全動線が正常 |
| **M4: コミット完了** | クルトワレビュー通過・シャビ承認・コミット・push 完了 |
| **M5: スプリント完了** | ドキュメント更新完了 |

---

## 残る未確定事項（実装中に発生したらシャビ判断）

| # | 項目 | トリガ |
|---|------|------|
| Q6 | ゴール旗 + ポール合成の必要性 | 旗単体（32×64 拡大）の見た目に違和感がある場合に検討 |
| Q4 | `*_COLOR` 定数の削除タイミング | 今回は温存。デッドコードが気になったら別スプリントで実施 |

---

作成: モドリッチ / 2026-05-05

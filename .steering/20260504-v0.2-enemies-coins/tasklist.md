# タスクリスト: v0.2 敵キャラ + コイン + スコア

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-05-04 |
| 担当 | モドリッチ |
| 関連設計 | `.steering/20260504-v0.2-enemies-coins/design.md` |
| 関連要求 | `.steering/20260504-v0.2-enemies-coins/requirements.md` |

---

## 進め方の原則

- **Phase 構成**: P1 事前検証はスキップ → P2 共通基盤拡張（gameConfig 定数 + stage01 タイル拡張）→ P3 シーン拡張（BootScene + GameScene）→ P4 統合確認 + 性能測定 + Pages デプロイ → P5 クルトワレビュー + コミット → P6 ドキュメント更新（最小）
- v0.1 と同じく**フロント単体（バックエンドなし）**のため、テンプレ P2「バックエンド実装」を **P2「共通基盤拡張」** に転用、P3「フロントエンド実装」を **P3「シーン拡張」** とする
- 各タスクは [ ] 未着手 / [WIP] 進行中 / [x] 完了 で管理
- ハードコード禁止（敵 / コインの寸法・色・速度・HUD 文言は `src/config/gameConfig.ts`、配置は `src/stages/stage01.ts` のタイル文字列に集約）
- コミット前は **必ずクルトワ（security-engineer）レビュー**（CLAUDE.md ルール準拠）
- **各 Phase は完了次第、止まらずに次の Phase へ進む**。フェーズ境界での承認待ち停止はしない
- **完了報告は出す**（進捗共有のため）が、それで作業を止めない
- **作業を止めるのは、シャビの判断・確認が必要な事項が発生したときだけ**。例:
  - 設計の判定基準（design.md §1 採用案 / §3 構造）を外れる対応が必要になった
  - KPI 目標（60 fps / < 5 秒 / < 1.5 MB）が未達で方針判断が必要
  - クルトワレビューで Critical / High 指摘あり、修正方針の合意が必要
  - design.md の前提（特に Q3 の `window.location.reload()` 継続採用）が壊れる発見があり、再合意が必要
- dev サーバーは自分から起動しない（auto memory `feedback_no_dev_server.md`）。動作確認は Pages デプロイ後にシャビが行う。ローカルでは `npm run typecheck` / `npm run build` までで止める

---

## P1: 事前検証

> **スキップ**。design.md §3 で採用した方式（`overlap` + 速度判定の踏みつけ / `body.blocked` + groundMask の徘徊 / `window.location.reload()` の完全リスタート）はすべて Phaser 3 の標準パターン。v0.1 で `Arcade Physics` / `StaticGroup` / `setScrollFactor(0)` / `disableBody(true,true)` の稼働確認は完了済み。先行検証なしで P2 から開始する。

---

## P2: 共通基盤拡張（gameConfig + stage01）

### P2-A: 環境準備

- [ ] **P2-A-1**: 追加依存なしを再確認（`package.json` の `dependencies` は Phaser 3.80 のみのまま）。`.env` の追加変数も**なし**（v0.1 の `VITE_BASE_PATH` を継続）
- [ ] **P2-A-2**: 着手前に対象ファイルを Read で確認（`src/config/gameConfig.ts`, `src/stages/stage01.ts`, `src/scenes/BootScene.ts`, `src/scenes/GameScene.ts`）— セッション引き継ぎ時の作業原則

### P2-B: `src/config/gameConfig.ts` 拡張

- [ ] **P2-B-1**: design.md §3.1 の表に従い、追加定数 19 個を末尾にエクスポート（**既存定数は不変**）
  - 敵物理: `ENEMY_SPEED=60`, `STOMP_BOUNCE_VELOCITY=-280`, `STOMP_TOLERANCE_PX=6`
  - 敵描画: `ENEMY_SPRITE_W=28`, `ENEMY_SPRITE_H=28`, `ENEMY_COLOR=0x8b572a`
  - コイン描画: `COIN_SPRITE_W=16`, `COIN_SPRITE_H=16`, `COIN_COLOR=0xf1c40f`
  - ミス演出: `MISS_FLASH_MS=150`, `MISS_FLASH_COLOR=0xffffff`
  - HUD: `HUD_FONT_SIZE='18px'`, `HUD_FONT_COLOR='#ffffff'`, `HUD_STROKE_COLOR='#000000'`, `HUD_STROKE_THICKNESS=4`, `HUD_COIN_LABEL='コイン'`, `HUD_COIN_X=16`, `HUD_COIN_Y=40`
  - `TEX_KEY` 拡張: `enemy: 'enemy'`, `coin: 'coin'` を追加
- [ ] **P2-B-2**: `npm run typecheck` 通過を確認

### P2-C: `src/stages/stage01.ts` 拡張

- [ ] **P2-C-1**: `TileChar` を `'.' | '#' | 'P' | 'G' | 'E' | 'C'` に拡張（design.md §3.2 / §4.1）
- [ ] **P2-C-2**: `STAGE_01.tiles` に敵 `'E'` 4 体・コイン `'C'` 12 枚を配置（design.md §3.2 配置方針）
  - 制約: `'E'` の真下は `'#'`、`'C'` は地面真上 / ジャンプ届く高さ
  - 既存 `'.'` `'#'` `'P'` `'G'` の位置は維持
- [ ] **P2-C-3**: 行数 / 各行長さ / `'P'` `'G'` `'E'` `'C'` の個数を目視確認（厳密なバリデーションは P3 の `buildStage()` 側で実装）

### P2-D: 担当判断

- 定数追加とデータ拡張のみ。**モドリッチが直接実装**（v0.1 P2 と同じ判断）

---

## P3: シーン拡張（BootScene + GameScene）

### P3-A: 環境・依存追加

- [ ] **P3-A-1**: 追加依存なし（再確認）。`package.json` 変更なし
- [ ] **P3-A-2**: `index.html` / `vite.config.ts` / `main.ts` も**変更なし**を確認（design.md §3.6 / §8.1）

### P3-B: `src/scenes/BootScene.ts` 拡張

- [ ] **P3-B-1**: `preload()` の `g.destroy()` を最後尾に移動し、enemy / coin テクスチャ生成を間に追加（design.md §3.3 擬似コード準拠）
  - 敵: `fillStyle(ENEMY_COLOR)` + `fillRect(0, 0, ENEMY_SPRITE_W, ENEMY_SPRITE_H)` → `generateTexture(TEX_KEY.enemy, ENEMY_SPRITE_W, ENEMY_SPRITE_H)`
  - コイン: `fillStyle(COIN_COLOR)` + `fillCircle(COIN_SPRITE_W/2, COIN_SPRITE_H/2, COIN_SPRITE_W/2)` → `generateTexture(TEX_KEY.coin, COIN_SPRITE_W, COIN_SPRITE_H)`
- [ ] **P3-B-2**: マジックナンバー（`28`, `16`, `0x8b572a`, `0xf1c40f`）が残っていないか `grep` で確認

### P3-C: `src/scenes/GameScene.ts` 拡張

> design.md §3.4 を実装単位に分解。**v0.1 の `respawn()` は削除**し、`handleMiss()` + `fullRestart()` に統合する点に注意。

#### P3-C-1: 型・フィールド追加

- [ ] **P3-C-1-a**: `BuiltStage` インターフェースに `enemies`, `coins`, `coinTotal`, `groundMask` を追加（design.md §3.4.1）
- [ ] **P3-C-1-b**: `GameScene` クラスに以下フィールドを追加（design.md §3.4.2）
  - `enemies`, `coins`, `coinTotal`, `coinsCollected`, `coinHud`, `groundMask`, `isMissed`

#### P3-C-2: ヘルパメソッド実装

- [ ] **P3-C-2-a**: `buildGroundMask(def)` — `mask[row][col] = (def.tiles[row].charAt(col) === '#')`
- [ ] **P3-C-2-b**: `buildEnemies(positions)` — 動的物理 group、足元基準座標、`setData('dir', -1)`、`setVelocityX(-ENEMY_SPEED)`
- [ ] **P3-C-2-c**: `buildCoins(positions)` — `StaticGroup`、タイル中心配置、`refreshBody()`、`{ group, total }` を返す
- [ ] **P3-C-2-d**: `formatCoinHud()` — `` `${HUD_COIN_LABEL}: ${this.coinsCollected} / ${this.coinTotal}` ``
- [ ] **P3-C-2-e**: `refreshCoinHud()` — `this.coinHud.setText(this.formatCoinHud())`

#### P3-C-3: `buildStage()` 拡張

- [ ] **P3-C-3-a**: 走査ロジックに `'E'` / `'C'` 分岐追加（design.md §3.4.6）
- [ ] **P3-C-3-b**: バリデーション拡張
  - `'E'` 個数: 1 〜 8
  - `'C'` 個数: 1 〜 30
  - `'E'` の真下が `'#'` であること（空中浮遊禁止）
- [ ] **P3-C-3-c**: 戻り値に `enemies`, `coins`, `coinTotal`, `groundMask` を追加

#### P3-C-4: 衝突判定メソッド実装

- [ ] **P3-C-4-a**: `onCoinOverlap(player, coin)` — `isCleared || isMissed` ガード → `disableBody(true,true)` + `coinsCollected++` + `refreshCoinHud()`
- [ ] **P3-C-4-b**: `onEnemyOverlap(player, enemy)` — `isCleared || isMissed` ガード → `velocity.y > 0` かつ `player.bottom <= enemy.top + STOMP_TOLERANCE_PX` で踏みつけ判定 → 踏みつけ時は `disableBody` + `setVelocityY(STOMP_BOUNCE_VELOCITY)`、それ以外は `handleMiss('enemy')`
- [ ] **P3-C-4-c**: `onGoalHit()` 既存改修 — クリアテキスト本文に `formatCoinHud()` を改行で併記

#### P3-C-5: ミス処理・敵 AI 実装

- [ ] **P3-C-5-a**: `handleMiss(reason: 'fall' | 'enemy')` — 多重発火ガード → `setTint(MISS_FLASH_COLOR)` + `setVelocity(0,0)` → `time.delayedCall(MISS_FLASH_MS, fullRestart)`
- [ ] **P3-C-5-b**: `fullRestart()` 既存維持 — `window.location.reload()`（Q3 採用案 B）
- [ ] **P3-C-5-c**: `updateEnemyAi()` — 全敵巡回 → 壁衝突反転（`body.blocked.left/right`）→ 段差端反転（進行方向の足元タイルを `groundMask` で参照）→ 毎フレーム `setVelocityX(dir * ENEMY_SPEED)` 強制（速度 0 事故防止）→ `active===false` の敵はスキップ
- [ ] **P3-C-5-d**: 既存 `respawn()` メソッドを **削除**（呼び出し元は `update()` の落下判定 1 箇所のみ）

#### P3-C-6: `create()` / `update()` 改修

- [ ] **P3-C-6-a**: `create()` の処理順序を design.md §3.4.3 通りに更新
  - フィールド初期化（`isMissed=false`, `coinsCollected=0`）
  - `buildStage` の戻り値から `enemies` / `coins` / `coinTotal` を保持
  - collider 登録（`enemies, ground` を追加）
  - overlap 登録順を **ゴール → 敵 → コイン** の順で（Q5 二重保証）
  - HUD 生成（`add.text + setScrollFactor(0)`、design.md §3.1 のスタイル定数を参照）
- [ ] **P3-C-6-b**: `update()` に `updateEnemyAi()` 呼び出しを追加（プレイヤー入力反映の後、落下判定の前）
- [ ] **P3-C-6-c**: `update()` の落下判定を `respawn()` → `handleMiss('fall')` に置換
- [ ] **P3-C-6-d**: `update()` 冒頭の入力ガードを `if (isCleared || isMissed) return;` に拡張
- [ ] **P3-C-6-e**: `handlePointerDown()` 冒頭に `if (this.isMissed) return;` ガード追加（フラッシュ中の誤タップ抑止、design.md §3.6）

### P3-D: テスト・ビルド検証

- [ ] **P3-D-1**: `npm run typecheck`（= `tsc --noEmit`）通過
- [ ] **P3-D-2**: `npm run build` 成功 — バンドルサイズ確認（< 1.5 MB 目安、design.md §9.3）
- [ ] **P3-D-3**: ハードコード grep 確認 — `grep -nE "(\\b60\\b|\\b28\\b|\\b16\\b|-280|\\b150\\b|0x8b572a|0xf1c40f|'コイン'|'#ffffff')" src/scenes/*.ts src/main.ts` が 0 件（数値・色・文言の出処は全て `gameConfig`）
- [ ] **P3-D-4**: 配置 grep 確認 — `grep -nE "'E'|'C'" src/scenes/*.ts` で配列リテラル 0 件（配置は全て `stage01.ts` のタイル文字列経由）

### P3-E: 担当判断

- v0.1 のシーン実装パターンを踏襲した拡張（〜200 行追加）。**モドリッチ直接実装**で進める。複雑な箇所（敵 AI / ミス処理の状態管理）で詰まったらエンバペ（frontend-engineer）に相談する

---

## P4: 統合確認 + 性能測定 + Pages デプロイ確認

> **dev サーバーは自分で起動しない**（auto memory）。ローカルでは `npm run build` までで止め、動作確認は P4-D の Pages デプロイ後にシャビが行う。

### P4-A: 機能テスト（受け入れ条件 §7 対応、Pages デプロイ後にシャビ実施）

> 以下 14 項目はシャビの動作確認チェックリスト。モドリッチは P4-D で URL を案内する。

- [ ] **P4-A-1**: 敵 4 体・コイン 12 枚が想定位置に表示される（受入 §7-1）
- [ ] **P4-A-2**: 敵が壁・段差端で反転、30 秒以上観察して停止 0 件（受入 §7-2）
- [ ] **P4-A-3**: 全敵を上から踏める。踏みつけ時に小ジャンプ反力が出る（受入 §7-3）
- [ ] **P4-A-4**: 敵に横 / 下から接触するとフラッシュ → リセット、コイン取得数 0 + 敵 / コイン全復活（受入 §7-4）
- [ ] **P4-A-5**: 全コインを取得でき、HUD カウントが +1 ずつ増える（受入 §7-5）
- [ ] **P4-A-6**: 右端まで移動しても HUD が画面左上に固定（受入 §7-6）
- [ ] **P4-A-7**: ゴール踏破でクリア表示に「コイン: X / 12」が併記（受入 §7-7）
- [ ] **P4-A-8**: R キー / タップでステージ完全初期化（受入 §7-8）
- [ ] **P4-A-9**: 隙間落下でもコイン 0 リセット + 敵 / コイン全復活（受入 §7-9）

### P4-B: 性能測定（Pages デプロイ後にシャビ実施）

- [ ] **P4-B-1**: Chrome DevTools Performance タブで 5 秒間記録 → 平均 60 fps 維持（敵 4 + コイン 12 同時、受入 §7-10）
- [ ] **P4-B-2**: DevTools Network `Disable cache` ON で初回ロード時間 < 5 秒（受入 §7-11）
- [ ] **P4-B-3**: バンドルサイズ確認 — `npm run build` 後の `dist/assets/*.js` が < 1.5 MB（受入 §7-11 関連）

### P4-C: エラーケース

- [ ] **P4-C-1**: ステージ定義に意図的に不正値（`'E'` を 9 個 / `'E'` の真下を `'.'` に）を入れて起動 → assertion で `throw` することを確認、その後元に戻す
- [ ] **P4-C-2**: ゴールに到達直前に敵に横接触するシナリオで `isCleared` / `isMissed` フラグの優先制御が効くことを確認
- [ ] **P4-C-3**: ミスフラッシュ中（〜150ms）に画面タップしても `fullRestart()` が二重発火しないことを確認

### P4-D: Pages デプロイ確認

- [ ] **P4-D-1**: コミット → push 前に `.github/workflows/deploy.yml` の動作内容を Read で再確認（v0.1 から不変想定）
- [ ] **P4-D-2**: コミット → push 後、GitHub Actions の `deploy` ワークフローが成功することを確認（`gh run list` / `gh run view`）
- [ ] **P4-D-3**: Pages の URL（`https://<owner>.github.io/mario-game/`）をシャビに案内し、P4-A / P4-B のチェックを実施してもらう

### P4-E: 計測まとめ

- [ ] **P4-E-1**: 結果を `.steering/20260504-v0.2-enemies-coins/perf-report.md` に簡潔に記録
  - Before（v0.1: 1 ステージ踏破可、敵 0 / コイン 0）→ After（v0.2: 敵 4 / コイン 12 + HUD + ミス演出）
  - fps / 初回ロード / バンドルサイズの実測値
- [ ] **P4-E-2**: 計測結果を報告
  - KPI 目標を達成していれば次フェーズへ自動継続
  - **未達なら止めてシャビに確認**（design.md §10.3 のフォールバック案を提示）

---

## P5: クルトワ（security-engineer）レビュー + コミット

- [ ] **P5-1**: 変更ファイルすべてのセキュリティレビューをクルトワに依頼（**`opus` モデルで起動** — CLAUDE.md ルール）
  - 観点（CLAUDE.md「ハードコーディング検出」より）:
    - URL / エンドポイント / WebSocket URL のハードコーディング有無 → 本スプリントでも外部通信なしを再確認
    - シークレット / キー / トークン / パスワードのハードコーディング有無 → 本スプリントでも発生しない想定だが要再確認
    - AWS アカウント情報のハードコーディング有無 → 本プロジェクトは AWS 不使用、念のため確認
    - ドキュメント内の機密情報 → CLAUDE.md / README.md / .steering / docs に実 URL や鍵がないか
  - 観点（v0.2 固有）:
    - HUD テキストへの動的文字列挿入が **数値固定** であること（`formatCoinHud()` 経由、文字列連結禁止）
    - 敵 / コインの寸法・色・速度がコード上に直書きされず `gameConfig.ts` 集約
    - 敵 / コインの配置がコード上に直書きされず `stage01.ts` のタイル文字列集約
    - `buildStage()` バリデーション漏れ（未知文字 / 個数違反 / `'E'` の真下チェック）
    - `disableBody(true, true)` の二重発火 / 取りこぼし
    - `isCleared` / `isMissed` ガードの抜け
    - CSP / 外部 CDN 影響なし
- [ ] **P5-2**: 指摘事項を確認
  - Critical / High なし → 自動で次のタスクへ進む
  - **Critical / High あり → 止めてシャビに確認**（修正方針の合意）
- [ ] **P5-3**: 指摘修正（あれば）
- [ ] **P5-4**: シャビへレビュー結果報告 → **コミット承認取得**（CLAUDE.md「コミット前のセキュリティレビュー」必須ルールに従い、コミット前は必ず止まる）
- [ ] **P5-5**: コミット作成（メッセージ規約: Conventional Commits を採用、例: `feat: add enemies, coins, and score HUD (v0.2)`）

---

## P6: ドキュメント更新（最小）

> 実装完了 + 動作確認後にまとめて更新。design.md §8.1 の「追記候補（最小）」方針に従い、構造変更がない箇所は触らない。

- [ ] **P6-1**: `docs/architecture.md` の「拡張・将来課題」節（または該当節）に v0.2 完了反映を 3〜5 行で追記
- [ ] **P6-2**: `docs/repository-structure.md` の `src/scenes/GameScene.ts` 責務に「敵 AI / コイン取得 / HUD / ミス処理」を追記
- [ ] **P6-3**: `README.md` のクイックスタート以降に「v0.2 で遊べる範囲」「敵踏みつけ / コイン取得 / スコア表示」を 3〜5 行追記
- [ ] **P6-4**: `docs/functional-design.md` / `docs/development-guidelines.md` / `docs/glossary.md` / `docs/product-requirements.md` — **本スプリントでも作成しない**（v0.3 以降に送る、v0.1 の Q5 案 A 方針継続）
- [ ] **P6-5**: 作成・更新した永続的ドキュメントもクルトワレビュー対象（CLAUDE.md ルール: ドキュメント内機密情報チェック）→ P5 のレビューに含めるか、P6 完了後に追加レビューを実施

---

## 横断タスク（全フェーズ共通、CLAUDE.md ルール）

- [ ] **X-1**: 各タスク着手前に対象ファイルの最新状態を `Read` で確認（セッション引き継ぎ時の作業原則）
- [ ] **X-2**: 変更後は必ず `npm run typecheck` + `npm run build` でビルド・型検証
- [ ] **X-3**: 重要な発見・ハマりどころは即座に `.steering/20260504-v0.2-enemies-coins/decisions.md` に記録（恒久化が必要なら P6 で `docs/development-guidelines.md` への反映を検討、ただし当該ファイルは本スプリントで作らないため v0.3 に持ち越し）
- [ ] **X-4**: コミット前にクルトワへセキュリティレビュー依頼（CLAUDE.md 必須ルール）
- [ ] **X-5**: 完了報告は出すが、それで作業を止めない。**判断・確認が必要な事項が発生したときのみ作業を止めてシャビに確認**

---

## 進捗マイルストーン

| マイルストーン | 完了条件 |
|--------------|--------|
| **M1: PoC 通過** | スキップ（P1 不要） |
| **M2: 共通基盤拡張完成** | P2 完了 — `gameConfig.ts` に追加定数 19 個、`stage01.ts` に `'E'` 4 体・`'C'` 12 枚配置、`tsc --noEmit` 通過 |
| **M3: ローカル統合動作** | P3 + P3-D 完了 — `npm run build` 成功、ハードコード grep 0 件 |
| **M4: 性能目標達成** | P4-B + P4-D 完了 — Pages 上で 60 fps / < 5s / < 1.5MB をシャビ確認で達成 |
| **M5: コミット完了** | P5 完了 — クルトワレビュー合格 + コミット作成 |
| **M6: スプリント完了** | P6 完了 — `docs/architecture.md` + `docs/repository-structure.md` + `README.md` 追記済み |

---

## 残る未確定事項（実装中に発生したらシャビ判断）

design.md §12 で挙げた Q8〜Q14 のうち、実装中にトリガが発生する可能性があるもの:

| # | 項目 | トリガ |
|---|------|------|
| Q8 | 敵速度 `ENEMY_SPEED` の最終値 | プレイテストで「遅すぎ / 速すぎ」と感じた場合。初期 60、±20 を許容 |
| Q9 | コイン配置数の最終値 | プレイテストでバランスに問題があった場合。初期 12、±3 を許容 |
| Q10 | クリア表示のスコア行フォントサイズ | 視認性次第。クリアテキスト（既存 44px）と統一するか、スコアのみ小さく（28px）するか |
| Q11 | ミスフラッシュ色 / 時間 | 視認性次第。初期 白 150ms、赤 200ms など |
| Q12 | 敵踏みつけ時の SE プレースホルダ扱い | v0.2 では SE 自体がスコープ外、`reason` パラメータはログ目的で確保のみ |
| Q13 | コイン HUD と操作説明テキストの位置関係 | 実機で重なりが見つかった場合、`HUD_COIN_Y` を 40 → 48 に調整 |
| Q14 | 段差端判定の前方ピクセル数 | 足滑り感があれば `ENEMY_SPRITE_W/2 + 1px` から +2px 程度の調整 |
| Q15 | コミット粒度 | 1 コミット（feat: v0.2）か、Phase ごとに分割か。初期方針: **1 コミット一括**（v0.1 と同じ動線優先）。Phase 分割が必要ならシャビ判断 |

---

作成: モドリッチ / 2026-05-04

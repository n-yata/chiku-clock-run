# 決定事項ログ

## 2026-06-03

### D-001: コンティニューはシーンデータで引き継ぐ（永続化なし）
- ゲームオーバー時、タイトルへ `{ continueStage, gearsCollected, gearsTotal }` を `scene.start` データで渡す。
- `continueStage`: 通常ステージ=その index、ボス=`STAGES.length` の番兵、未設定=最初から。
- `USE_HARD_RELOAD_FALLBACK=false` を確認済みのためシーンデータで完結（sessionStorage 不要）。
- セッション跨ぎの永続化はスコープ外。

### D-002: 通常ステージのコンティニューは priorGears を引き継ぐ
- GameScene のゲームオーバーは「そのステージ開始時点の通算歯車（priorGears）」を渡す。
  当該ステージで集めた分は再プレイで取り直しになるため。
- ボスは保持している通算 `gearsCollected/gearsTotal` をそのまま渡す（歯車数保持の要望どおり）。

### D-003: `restartFromTop` は温存し、ゲームオーバー専用 `gameOverToTitle` を新設
- GameScene の `restartFromTop` は R キー／全クリア時の「素でタイトルへ」用途のため温存。
  ゲームオーバー経路のみ `gameOverToTitle`（continue データ付き）に差し替え。

### D-004: エンディングの時計可視化＝歯車を外周配置＋針を最前面
- 中央の大歯車（旧 `GEAR_SPECS[0]`）を撤去し、残り歯車を時計外周（中心からの距離 ≳ CLOCK_RADIUS）へ。
- `stageGroup` の描画順を「文字盤 → 歯車 → 針」に変更し、針を必ず最前面に。
- 文字盤が不透明でも歯車が外周にはみ出して「時計まわりのコグ」として見え、時計本体は完全に視認可能。
- Playwright スクリーンショットで時計の可視を確認。

### D-005: エンディングのテキスト削減
- `ALL_CLEAR_SUFFIX='タイトルへ戻ります...'`（`suffixText`）を撤去。
- 残置: HAPPY END / サブタイトル / 集めた歯車数 / スキッププロンプト（機能）。
- 定数 `ALL_CLEAR_SUFFIX` は gameConfig に残置（他参照が増える可能性に備え破壊的削除を避ける）。

### 検証
- `npm run typecheck` / `npm run build` 緑。
- Playwright 実機:
  - GameScene(stage2) ゲームオーバー→Title が `continueStage=1` / `TAP TO CONTINUE`。
  - BossScene ゲームオーバー→Title が `continueStage=3`(ボス番兵) / 歯車 9/12 保持 / `TAP TO CONTINUE`。
  - EndingScene スクショで時計が見える・「タイトルへ戻ります...」が無いことを確認。PAGEERROR なし。

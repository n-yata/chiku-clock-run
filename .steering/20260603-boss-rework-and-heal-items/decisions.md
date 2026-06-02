# 決定事項ログ

## 2026-06-03 追補（リリース後フィードバック対応）

シャビのプレイフィードバックを受けて3点を修正。

### D-001: 振り子の難易度を下げる
- **判断**: `BOSS_PENDULUM_OMEGA_BY_PHASE` を `[0.0022,0.0028,0.0034]` → `[0.0016,0.0020,0.0024]`（約27%減速）。
- **理由**: 振り子踏み方式は旧コア踏みより踏むタイミングがシビア。速度を落として難易度を緩和。

### D-002: ボス戦ゲームオーバー時のフリーズ修正（重要バグ）
- **症状**: ボス戦で被弾死すると画面がフリーズし、タイトルへ遷移しない。
- **真因**: シーン shutdown ハンドラに追加した `this.physics.world.timeScale = 1` が、
  shutdown 時に Arcade physics プラグインが先に `world` を破棄して null にしているケースで
  `Cannot set properties of null (setting 'timeScale')` を throw → `scene.start('TitleScene')` が
  中断されゲームループが停止していた。Playwright で実機再現して特定（PAGEERROR 確認）。
- **修正**: `if (this.physics?.world) this.physics.world.timeScale = 1;` と null ガード。
  各シーンは独立 world を持つため timeScale リークの実害は無く、存在時のみ安全に復帰させる。
- **影響範囲**: ゲームオーバーに限らず全 BossScene 終了経路（撃破→エンディング、R リスタート）を保護。

### D-003: ステージ3の回復アイテムが取得不能だった配置ミスを修正
- **症状**: stage03 の `'H'` がプレイヤーの届かない位置にあった。
- **真因**: `'H'` を row15 col99 に置いていたが、その真下 row16 がピット（`.`）で、
  プレイヤーが立てず取得できなかった。
- **修正**: 床（row16 が `#`）の真上 col80（中盤の安全地帯）へ移設。
  stage01(col102)/stage02(col124) は床上で問題なしを併せて確認。

### 検証
- `npm run typecheck` / `npm run build` 緑。
- Playwright 実機再現でフリーズ解消を確認（ゲームオーバー→タイトル遷移、PAGEERROR 消滅）。
- 全ステージの `'H'` が床上（reachable）・行長一致を確認。

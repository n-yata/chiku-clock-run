# タスクリスト — UIチープさ抜本改善（リッチ化）

| 項目 | 内容 |
|------|------|
| 関連要求 | `.steering/20260530-ui-richness-overhaul/requirements.md` |
| 関連設計 | `.steering/20260530-ui-richness-overhaul/design.md` |
| 品質コマンド | `npm run typecheck` / `npm run build` / `npm run test:e2e` |
| 現状スクショ | `tmp-shots/01-title〜04-running2.png`（着手前の基準） |

## 🚨 原則
- 各フェーズ完了ごとに `npm run typecheck` 緑 + **スクショで実画面を目視確認**してから次へ。
- 元キャラ温存NG / 解像度上げだけNG / 盲目編集NG を厳守。
- 未完了タスクを残して終了しない。

---

## フェーズ P0: 仕掛り中の差分の扱い（前提整理）
- [x] 現在 uncommitted な `spriteSheets.ts`（プレイヤー高解像度化 + 敵新描画）と `gameConfig.ts`（PLAYER_COAT_COLOR）を確認。P3 のリデザインで上書き/活用する前提で一旦保持（build 緑は確認済み）。敵 `drawEnemyFrame` の引数不整合(TS2554)を高解像度版へ書き換えて build 緑を回復済み。

## フェーズ P1: HUD 全面作り直し（最優先）
- [x] `gameConfig.ts` に HUD パネル定数追加（パネル色/不透明度/角丸/余白/アイコンサイズ）
- [x] ~~UIカメラ導入~~（理由: ParticleManager がバースト毎に遅延生成で UIカメラの ignore 管理が複雑化・二重描画リスク。単一カメラ + setResolution(zoom×dpr) で鮮明化 + setScale(1/zoom) で等倍を実現する方式に変更）
- [x] `HudManager` を書き換え（setResolution 鮮明化 + setScale 等倍 + 行間で重なり解消）
- [x] HUD を半透明角丸パネル（Graphics・真鍮縁）化、STAGE/歯車/ライフ を行重なりなく配置
- [x] 歯車をアイコン（gear_bit テクスチャ）+ 数値表記に、ライフは ♥ グリフ
- [x] 操作説明を配置（開始時のみ表示→フェード）。当初下部中央 → シャビ指摘により**右上・右寄せ**へ変更（左上HUD・下部プレイ帯どちらにも被らない）
- [x] 中央メッセージ/プロンプトも setResolution で鮮明化
- [x] `npm run typecheck` 緑 → スクショ取得し HUD 重なり解消・鮮明化を目視確認（tmp-shots/03）
- [x] `npm run test:e2e` 緑（9/9。プレイヤー足の接地 6→≤4px を drawShoe/drawChikuFeet 微調整で回復）

## フェーズ P2: 背景リッチ化
- [x] 背景テクスチャ生成をシームレス化（`tileWrap` で歯車/グローを8近傍ラップ・目地周期を両軸でタイル化・縦パイプ撤去）
- [x] 明度・コントラスト改善（沈んだ青ベース `#16273f` + 真鍮縁の歯車 + 暖色グロー）
- [x] 多層化（遠景: カメラ背景色 `BG_BASE_COLOR` / 中景: タイル scrollFactor0.15 / 前面: 非タイルオーバーレイ）
- [x] ビネット/暖色グローのオーバーレイ（`buildBackgroundOverlay`・画面固定・relayout で実寸フィット）で一様塗り回避
- [x] `npm run typecheck` 緑 → スクショで継ぎ目消失・世界観向上を目視確認（tmp-shots/03）
- [x] E2E `BACKGROUND` 期待色を実測 (37,47,60) に更新（旧 BG_COLOR 直書きから）→ 9/9 緑

## フェーズ P3: キャラ・敵リデザイン + 演出 juice
- [x] チク（プレイヤー）を新シルエットで再設計（既存温存しない）→ 「歯車仕掛けの少年職人」: モノクル + 背中の回る大歯車 + キャップ + 赤ネッカチーフ + 工具ベルト。E2E 9/9 緑。tmp-shots/crop-player.png で確認
- [x] 敵を新シルエットで再設計（識別性向上）→ 単眼（縦スリット瞳）+ 角張った眉 + ピンサー爪 + 猫背の暗い装甲のぜんまい自動人形。チク（善玉）と明確に差別化。tmp-shots/crop-enemy.png
- [x] 表示サイズ/native解像度の見直し（E2E displayHeight=84 契約と整合: スクワッシュは yoyo で必ず元スケールへ戻すため displaySize を壊さない。native解像度据え置き）
- [x] juice 強化: ジャンプ=縦伸び / 着地=つぶれ（squashStretch・yoyo）、敵撃破=パーティクル増（12→18）+ 既存ヒットストップ、クリア=celebrate 増（24→36）
- [x] `npm run typecheck` 緑 → スクショで個性・演出向上を目視確認（crop-player / crop-enemy）
- [x] `npm run build` / `npm run test:e2e` 緑（9/9）

## フェーズ P4: 仕上げ・品質・コミット
- [x] 一時ファイル `tests/e2e/_shot.spec.ts` と `tmp-shots/` を削除
- [x] 全受け入れ条件の充足確認（HUD重なり解消・鮮明化・背景継ぎ目消失・新シルエット・juice・全緑）
- [x] `npm run typecheck` / `npm run build` / `npm run test:e2e` 緑（9/9）
- [x] クルトワ（security-engineer）レビュー → Critical/High なし＝**コミット可**。Medium 1件（一時ファイル混入リスク）は削除で対応済み。Low（RESIZE 解除漏れ）は既存パターンで本スプリント対象外
- [x] 永続ドキュメント影響確認 → 新規アーキテクチャ/データフロー/プロトコルの追加はなく、既存構造内の見た目・演出刷新のため docs 更新不要と判断
- [x] 実装後の振り返りを本ファイルに記録
- [ ] コミット（commit-push）※シャビ承認後に実施

---

## 実装後の振り返り

### 実装完了日
2026-05-30

### 計画と実績の差分
- **P1 方式変更**: UIカメラ案 → 単一カメラ + setResolution/setScale（DEC-001）。ParticleManager の遅延生成と相性が悪く、より安全な方式へ。
- **操作ガイド位置**: 当初下部中央 → シャビ指摘で右上・右寄せへ。プレイ帯/HUD どちらにも干渉しない最適位置。
- **着手前の盲目編集**: 当初スクショを見ずにキャラ内部だけ描き直しており「変わらない」状態だった。スクショ確認(canvas.screenshot 方式)を導入してから的確に改善できた。

### 学んだこと
- **チープさの主因は絵のディテールではなくレイアウト・継ぎ目・没個性だった**。HUD崩れ/背景継ぎ目/元シルエット温存の3点を潰すのが効いた。
- カメラズーム下の Phaser Text は `setResolution(zoom×dpr)` で鮮明化、`setScale(1/zoom)` で実寸固定できる。
- WebGL の `page.screenshot` は黒抜けする。`canvas.screenshot()`（要素キャプチャ）+ `__capturedGame` でシーン起動するのが確実。
- スクワッシュ&ストレッチは `yoyo` で原スケールへ必ず復帰するので、displaySize 依存の状態管理/E2E 契約(displayHeight=84)を壊さずに juice を足せる。
- 背景はグラデをタイルに焼くと境界で必ず継ぎ目が出る。**平坦シームレスタイル + 非タイルのオーバーレイ**に分離するのが定石。

### 次回への改善提案
- 新機能/改善の着手前に必ず実画面スクショを撮って現状を共有する（盲目編集の再発防止）。
- `GameScene` の RESIZE リスナー解除（Low 指摘）は別タスクで shutdown 時 off を入れると安全。
- キャラの native テクスチャ解像度を上げる案は今回見送り（40×56据え置き）。さらに鮮明化したい場合の候補。

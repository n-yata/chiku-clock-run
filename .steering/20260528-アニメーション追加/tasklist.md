# tasklist.md — アニメーション追加

## 申し送り事項

- **実装完了日**: 2026-05-28
- **計画との差分**: デッドコード（update() 内の到達不能 animation 分岐）を実装中に発見し、同スプリントで削除した。design.md に記載なかった変更だが品質向上に寄与。
- **学んだこと**: `disableBody(true, false)` の使い方（active=false で AI ループからスキップ、visible=true でスプライト描画を維持）が Phaser での death アニメーションの定石。地面コライダーをフィールドで保持しておくと任意タイミングで解除できて柔軟。
- **次回への改善提案**: E2E テストに「敵接触→アニメーション待機→ライフ減算→リスタート」シナリオを追加すること。

## タスク一覧

- [x] T1: `gameConfig.ts` に定数 4 件追加（PLAYER_DEATH_BOUNCE_VY, PLAYER_DEATH_FALL_MS, ENEMY_DEATH_FALL_DISTANCE, ENEMY_DEATH_FALL_MS）
- [x] T2: `GameScene.ts` に `playerGroundCollider` フィールド追加 & `create()` で代入
- [x] T3: `killEnemyWithAnimation()` メソッド実装
- [x] T4: `onEnemyOverlap` の踏み・クロノシールド判定を `killEnemyWithAnimation` に変更
- [x] T5: `onPulseBoltEnemyOverlap` を `killEnemyWithAnimation` に変更
- [x] T6: `playPlayerDeathAnimation()` メソッド実装
- [x] T7: `handleMiss()` の末尾処理を分岐（enemy: アニメ後 decrementLife / fall: 即時）
- [x] T8: `npm run typecheck` と `npm run build` のパスを確認（lint スクリプトは未定義のため build で代替）

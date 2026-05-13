# 決定事項ログ: スプライトアセット表示とプレイヤー足元補正

| 項目 | 内容 |
|------|------|
| 開始日 | 2026-05-13 |
| 関連設計 | `.steering/20260513-fix-sprite-assets-and-player-anchor/design.md` |
| 関連要求 | `.steering/20260513-fix-sprite-assets-and-player-anchor/requirements.md` |

---

## このファイルの目的

実装中に発生した **設計変更 / トラブル対処 / 仕様判断** を時系列で記録する。
`design.md` は最初の合意、`tasklist.md` は進捗管理、`decisions.md` は **「なぜそうしたか」** を残す。

---

## D-1: Phaser Loader 用に CSP の `img-src` へ `blob:` を許可

**日付:** 2026-05-13
**関連:** P2-A / P3 E2E 検証

### Why

- `BootScene` は `this.load.image()` で PNG をロードしている。
- Playwright E2E で、地面・ゴール・コインのロード時に Phaser Loader が blob URL を作成し、`img-src 'self' data:` によってブロックされることが判明した。
- この状態では画像テクスチャが作成されず、地面・コインが表示されない。

### Decision

- `index.html` の Content Security Policy を `img-src 'self' data: blob:` に変更する。
- 画像の配信元は引き続き同一オリジンのローカル静的アセットのみとし、外部 URL は追加しない。

### Consequence

- Phaser Loader が内部生成する blob URL 画像を処理できる。
- E2E で地面・コインの canvas ピクセル検証が通る。
- CSP の許可範囲は画像表示に必要な `blob:` のみに限定する。

---

## D-2: Playwright による canvas ピクセル検証を追加

**日付:** 2026-05-13
**関連:** P3 検証

### Why

- Codex の Browser plugin は存在するが、このセッションでは browser 操作用の実行ツールが露出していなかった。
- 目視に依存せず、ローカル起動時の描画欠落を再発検知できる仕組みが必要だった。

### Decision

- `@playwright/test`, `pngjs`, `@types/pngjs` を dev dependency として追加する。
- `tests/e2e/game-visual.spec.ts` で canvas screenshot を取得し、背景・地面・コインのピクセルを検証する。
- `playwright.config.ts` の `webServer` で Vite dev server を自動起動する。

### Consequence

- `npm run test:e2e` で Chromium を使った画面検証ができる。
- 今回の CSP 問題のような「ビルドは通るがブラウザでは表示されない」不具合を検出できる。
- 初回環境では `npx playwright install chromium` が必要になる。

---

## D-3: プレイヤースプライトの足裏ピクセルをフレーム下端まで描画

**日付:** 2026-05-13
**関連:** P2-B / P3-4

### Why

- `applyPlayerState()` で物理 body の下端は維持できていたが、プレイヤースプライト自体の足裏ピクセルが一部フレーム下端まで届いていなかった。
- そのため当たり判定は床に接していても、透明余白が拡大表示され、見た目では床と足の間に隙間が残った。
- さらに `setDisplaySize()` 後に `body.setSize(displayWidth, displayHeight)` を呼ぶと、Arcade Physics 側で scale が再適用され、big 状態の body 高が 84px ではなく 126px になった。

### Decision

- `spriteSheets.ts` のプレイヤー各フレームで、靴の矩形を `PLAYER_DRAW_H` の下端まで描画する。
- スプライトシート生成時は `imageSmoothingEnabled = false` とし、最終フレーム下端に靴色のソールを明示的に描く。
- `applyPlayerState()` の body サイズは表示後の寸法ではなく、未スケールの `PLAYER_SPRITE_W` / `PLAYER_SPRITE_H` で設定する。
- `tests/e2e/game-visual.spec.ts` に big 状態の body 高・body 下端・足裏ピクセルと地面表面の距離検証を追加し、同じ退行を検出する。

### Consequence

- small / big / fire の表示サイズ変更後も、足裏の見た目が床から浮きにくくなる。
- 物理 body の調整だけでなく、スプライト内の透明余白も接地表現の検証対象になる。
- Phaser の `setDisplaySize()` と Arcade Body の `setSize()` を併用する場合、body 寸法に display 寸法を渡さないルールを明文化する。

---

作成: モドリッチ / 2026-05-13

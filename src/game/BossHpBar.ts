import Phaser from 'phaser';
import {
  UI_FONT_FAMILY,
  HUD_STROKE_COLOR,
  BOSS_HP_BAR_W,
  BOSS_HP_BAR_H,
  BOSS_HP_BAR_Y,
  BOSS_HP_BAR_BG_COLOR,
  BOSS_HP_BAR_BG_ALPHA,
  BOSS_HP_BAR_FILL_COLOR,
  BOSS_HP_BAR_BORDER_COLOR,
  BOSS_HP_BAR_SEG_GAP,
  BOSS_HP_BAR_LABEL,
  BOSS_HP_BAR_LABEL_COLOR
} from '../config/gameConfig';

/**
 * ボス HP バー（画面上部中央）。HP を等幅セグメントで描き、被ダメージで残量が減る。
 * scrollFactor0 + setScale(1/zoom) でカメラズーム下でもスクリーン実寸を保つ（HudManager と同方針）。
 */
export class BossHpBar {
  private graphics!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private current = 0;
  private max = 1;

  constructor(private readonly scene: Phaser.Scene) {}

  /** バーとラベルを生成する。create() 内で 1 回呼ぶ。 */
  build(max: number): void {
    this.max = Math.max(1, Math.floor(max));
    this.current = this.max;

    this.graphics = this.scene.add.graphics().setScrollFactor(0).setDepth(45);
    this.label = this.scene.add
      .text(0, 0, BOSS_HP_BAR_LABEL, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: '18px',
        color: BOSS_HP_BAR_LABEL_COLOR,
        stroke: HUD_STROKE_COLOR,
        strokeThickness: 4,
        align: 'center'
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(46);

    this.layout();
  }

  /** 現在 HP を更新して再描画する。 */
  setHp(current: number, max: number): void {
    this.max = Math.max(1, Math.floor(max));
    this.current = Phaser.Math.Clamp(Math.floor(current), 0, this.max);
    this.layout();
  }

  /** 画面リサイズ/ズーム変更時にバー位置・寸法を描き直す。 */
  layout(): void {
    if (!this.graphics) return;
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom || 1;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const res = Math.max(1, zoom * dpr);

    const hw = this.scene.scale.width / 2;
    const hh = this.scene.scale.height / 2;
    // scrollFactor0 オブジェクトのスクリーン→ワールド変換（ズーム中心）。
    const toWorldX = (sx: number) => (sx - (1 - zoom) * hw) / zoom;
    const toWorldY = (sy: number) => (sy - (1 - zoom) * hh) / zoom;
    const w = (len: number) => len / zoom;

    const barLeftScreen = this.scene.scale.width / 2 - BOSS_HP_BAR_W / 2;
    const x = toWorldX(barLeftScreen);
    const y = toWorldY(BOSS_HP_BAR_Y);
    const barW = w(BOSS_HP_BAR_W);
    const barH = w(BOSS_HP_BAR_H);

    const g = this.graphics;
    g.clear();
    // 背景パネル
    g.fillStyle(BOSS_HP_BAR_BG_COLOR, BOSS_HP_BAR_BG_ALPHA);
    g.fillRoundedRect(x, y, barW, barH, w(4));
    // セグメント（残 HP ぶんを真鍮枠つきで塗る）
    const gap = w(BOSS_HP_BAR_SEG_GAP);
    const segW = (barW - gap * (this.max + 1)) / this.max;
    for (let i = 0; i < this.max; i++) {
      const segX = x + gap + i * (segW + gap);
      const filled = i < this.current;
      g.fillStyle(filled ? BOSS_HP_BAR_FILL_COLOR : BOSS_HP_BAR_BG_COLOR, filled ? 1 : 0.4);
      g.fillRoundedRect(segX, y + gap, segW, barH - gap * 2, w(2));
    }
    // 枠
    g.lineStyle(Math.max(1, w(2)), BOSS_HP_BAR_BORDER_COLOR, 0.9);
    g.strokeRoundedRect(x, y, barW, barH, w(4));

    // ラベル（バー上・中央）
    this.label.setResolution(res);
    this.label.setScale(1 / zoom);
    this.label.setPosition(toWorldX(this.scene.scale.width / 2), toWorldY(BOSS_HP_BAR_Y - 4));
  }

  destroy(): void {
    this.graphics?.destroy();
    this.label?.destroy();
  }
}

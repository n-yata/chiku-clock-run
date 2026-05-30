import Phaser from 'phaser';
import {
  TEX_KEY,
  UI_FONT_FAMILY,
  HUD_FONT_SIZE,
  HUD_FONT_COLOR,
  HUD_STROKE_COLOR,
  HUD_STROKE_THICKNESS,
  HUD_GEAR_LABEL,
  HUD_STAGE_LABEL,
  HUD_LIFE_LABEL,
  HUD_LIFE_HEART,
  HUD_PANEL_X,
  HUD_PANEL_Y,
  HUD_PANEL_PADDING,
  HUD_LINE_GAP,
  HUD_PANEL_COLOR,
  HUD_PANEL_ALPHA,
  HUD_PANEL_RADIUS,
  HUD_PANEL_BORDER_COLOR,
  HUD_PANEL_BORDER_ALPHA,
  HUD_ICON_SIZE,
  HUD_TEXT_LEFT,
  INSTRUCTION_TEXT,
  INSTRUCTION_FONT_SIZE,
  INSTRUCTION_FONT_COLOR,
  INSTRUCTION_HOLD_MS,
  INSTRUCTION_FADE_MS,
  CENTER_MSG_FONT_SIZE,
  CENTER_MSG_STROKE_COLOR,
  CENTER_MSG_STROKE_THICKNESS,
  PROMPT_FONT_SIZE,
  PROMPT_FONT_COLOR,
  PROMPT_BLINK_MS,
  PROMPT_OFFSET_Y
} from '../config/gameConfig';

/** 中央メッセージのスタイル上書き（GAME OVER は大きめ・太め）。 */
export interface CenterMessageStyle {
  color: string;
  fontSize?: string;
  strokeThickness?: number;
}

/**
 * HUD（歯車片 / ステージ / ライフ / 操作説明）の生成・レイアウト・更新を担当
 * （design §3.7）。中央メッセージと再開プロンプトは P5 で追加する。
 */
export class HudManager {
  private panel!: Phaser.GameObjects.Graphics;
  private gearIcon!: Phaser.GameObjects.Image;
  private gearHud!: Phaser.GameObjects.Text;
  private stageHud!: Phaser.GameObjects.Text;
  private lifeHud!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;

  private gearCollected = 0;
  private gearTotal = 0;
  private stageIndex = 0;
  private stageTotal = 1;
  private lives = 0;

  private instructionFadeTimer: Phaser.Time.TimerEvent | null = null;
  private instructionTween: Phaser.Tweens.Tween | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  /** HUD（パネル・アイコン・テキスト）を生成する。create() 内で 1 回呼ぶ。 */
  build(): void {
    // 半透明パネル（最背面）。サイズ・位置は layout() で毎回描き直す。
    this.panel = this.scene.add.graphics().setScrollFactor(0).setDepth(40);

    // 操作説明（右上・右寄せ。HUD は左上なので干渉せず、プレイ帯にも被らない）。
    // 開始時のみ表示してフェードする。
    this.instructionText = this.scene.add
      .text(0, 0, INSTRUCTION_TEXT, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: INSTRUCTION_FONT_SIZE,
        color: INSTRUCTION_FONT_COLOR,
        stroke: HUD_STROKE_COLOR,
        strokeThickness: 4,
        align: 'right'
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(42);

    this.stageHud = this.makeHudText(this.formatStage());
    this.gearHud = this.makeHudText(this.formatGear());
    this.lifeHud = this.makeHudText(this.formatLife());

    // 歯車アイコン（歯車片の行頭）。
    this.gearIcon = this.scene.add
      .image(0, 0, TEX_KEY.gearBit)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(42);
  }

  private makeHudText(initial: string): Phaser.GameObjects.Text {
    return this.scene.add
      .text(0, 0, initial, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: HUD_FONT_SIZE,
        color: HUD_FONT_COLOR,
        stroke: HUD_STROKE_COLOR,
        strokeThickness: HUD_STROKE_THICKNESS
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(42);
  }

  /**
   * HUD をスクリーン左上のパネルに等倍・鮮明で配置する。
   * カメラズーム下でも (a) setResolution で鮮明化し (b) setScale(1/zoom) で
   * スクリーン実寸を一定に保つ。位置は scrollFactor0 + ズーム逆変換で求める。
   */
  layout(): void {
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom || 1;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const res = Math.max(1, zoom * dpr);
    const hw = this.scene.scale.width / 2;
    const hh = this.scene.scale.height / 2;
    // scrollFactor0 オブジェクトのスクリーン→ワールド変換（ズーム中心）。
    const toWorldX = (sx: number) => (sx - (1 - zoom) * hw) / zoom;
    const toWorldY = (sy: number) => (sy - (1 - zoom) * hh) / zoom;
    // スクリーン長 L をワールド長へ（描画後にズームで *zoom され実寸 L になる）。
    const w = (len: number) => len / zoom;

    const rows = [this.stageHud, this.gearHud, this.lifeHud];
    for (const t of rows) {
      t.setResolution(res);
      t.setScale(1 / zoom); // スクリーン実寸 = フォント px に固定
    }

    const pad = HUD_PANEL_PADDING;
    const textLeftX = HUD_PANEL_X + pad + HUD_TEXT_LEFT; // アイコン列ぶん右へ
    // 各行をスクリーン座標で積む（重なり防止）。
    const rowScreenY = [
      HUD_PANEL_Y + pad,
      HUD_PANEL_Y + pad + HUD_LINE_GAP,
      HUD_PANEL_Y + pad + HUD_LINE_GAP * 2
    ];
    rows.forEach((t, i) => t.setPosition(toWorldX(textLeftX), toWorldY(rowScreenY[i])));

    // パネル寸法（スクリーン px）。テキスト実寸（= 各 text.width、scale 1/zoom 適用後の見かけ幅）から算出。
    const maxTextW = Math.max(this.stageHud.width, this.gearHud.width, this.lifeHud.width);
    const panelScreenW = HUD_TEXT_LEFT + maxTextW + pad * 2;
    const panelScreenH = pad * 2 + HUD_LINE_GAP * 2 + HUD_ICON_SIZE + 4;

    this.panel.clear();
    this.panel.fillStyle(HUD_PANEL_COLOR, HUD_PANEL_ALPHA);
    this.panel.lineStyle(Math.max(1, w(2)), HUD_PANEL_BORDER_COLOR, HUD_PANEL_BORDER_ALPHA);
    this.panel.fillRoundedRect(
      toWorldX(HUD_PANEL_X), toWorldY(HUD_PANEL_Y),
      w(panelScreenW), w(panelScreenH), w(HUD_PANEL_RADIUS)
    );
    this.panel.strokeRoundedRect(
      toWorldX(HUD_PANEL_X), toWorldY(HUD_PANEL_Y),
      w(panelScreenW), w(panelScreenH), w(HUD_PANEL_RADIUS)
    );

    // 歯車アイコンを歯車片の行頭に（行の中央へ縦位置を合わせる）。
    this.gearIcon.setDisplaySize(w(HUD_ICON_SIZE), w(HUD_ICON_SIZE));
    this.gearIcon.setPosition(
      toWorldX(HUD_PANEL_X + pad),
      toWorldY(rowScreenY[1] + HUD_ICON_SIZE / 2)
    );

    // 操作説明（右上・右寄せ・鮮明化・等倍）。右端と上端から HUD と同じ余白を取る。
    this.instructionText.setResolution(res);
    this.instructionText.setScale(1 / zoom);
    this.instructionText.setPosition(
      toWorldX(this.scene.scale.width - HUD_PANEL_X),
      toWorldY(HUD_PANEL_Y + HUD_PANEL_PADDING)
    );
  }

  setGear(collected: number, total: number): void {
    this.gearCollected = collected;
    this.gearTotal = total;
    this.gearHud.setText(this.formatGear());
  }

  setStage(index: number, total: number): void {
    this.stageIndex = index;
    this.stageTotal = total;
    this.stageHud.setText(this.formatStage());
  }

  setLives(lives: number): void {
    this.lives = lives;
    this.lifeHud.setText(this.formatLife());
  }

  /**
   * 操作説明を文言つきで表示し、一定時間後にフェードアウトする。
   * 状態変化（通常 / fire）のたびに呼び、再表示 + 再スケジュールする。
   */
  showInstruction(text: string): void {
    if (!this.instructionText) return;
    this.instructionText.setText(text);
    this.instructionText.setAlpha(1);
    this.instructionFadeTimer?.remove(false);
    this.instructionTween?.stop();
    this.instructionFadeTimer = this.scene.time.delayedCall(INSTRUCTION_HOLD_MS, () => {
      this.instructionTween = this.scene.tweens.add({
        targets: this.instructionText,
        alpha: 0,
        duration: INSTRUCTION_FADE_MS
      });
    });
  }

  /** 画面中央メッセージ（STAGE CLEAR / ALL CLEAR / GAME OVER 共通）。 */
  showCenterMessage(text: string, style: CenterMessageStyle): Phaser.GameObjects.Text {
    const res = Math.max(1, (this.scene.cameras.main.zoom || 1) * this.dpr());
    return this.scene.add
      .text(this.scene.scale.width / 2, this.scene.scale.height / 2, text, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: style.fontSize ?? CENTER_MSG_FONT_SIZE,
        color: style.color,
        stroke: CENTER_MSG_STROKE_COLOR,
        strokeThickness: style.strokeThickness ?? CENTER_MSG_STROKE_THICKNESS,
        align: 'center'
      })
      .setResolution(res)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(60);
  }

  private dpr(): number {
    return (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  }

  /** 中央メッセージ下に点滅プロンプト（再開 / 次へ）を表示する。 */
  showPrompt(text: string): Phaser.GameObjects.Text {
    const res = Math.max(1, (this.scene.cameras.main.zoom || 1) * this.dpr());
    const prompt = this.scene.add
      .text(this.scene.scale.width / 2, this.scene.scale.height / 2 + PROMPT_OFFSET_Y, text, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: PROMPT_FONT_SIZE,
        color: PROMPT_FONT_COLOR,
        stroke: CENTER_MSG_STROKE_COLOR,
        strokeThickness: CENTER_MSG_STROKE_THICKNESS,
        align: 'center'
      })
      .setResolution(res)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(60);
    this.scene.tweens.add({
      targets: prompt,
      alpha: { from: 1, to: 0.25 },
      duration: PROMPT_BLINK_MS,
      yoyo: true,
      repeat: -1
    });
    return prompt;
  }

  /** 歯車片 HUD の現在表記。STAGE CLEAR 画面の流用向けに公開。 */
  formatGear(): string {
    return `${HUD_GEAR_LABEL}: ${this.gearCollected} / ${this.gearTotal}`;
  }

  private formatStage(): string {
    return `${HUD_STAGE_LABEL}: ${this.stageIndex + 1} / ${this.stageTotal}`;
  }

  private formatLife(): string {
    return `${HUD_LIFE_LABEL}: ${HUD_LIFE_HEART} × ${this.lives}`;
  }
}

import Phaser from 'phaser';
import {
  UI_FONT_FAMILY,
  HUD_FONT_SIZE,
  HUD_FONT_COLOR,
  HUD_STROKE_COLOR,
  HUD_STROKE_THICKNESS,
  HUD_GEAR_LABEL,
  HUD_GEAR_X,
  HUD_GEAR_Y,
  HUD_STAGE_LABEL,
  HUD_STAGE_Y,
  HUD_LIFE_LABEL,
  HUD_LIFE_HEART,
  HUD_LIFE_X,
  HUD_LIFE_Y,
  HUD_INSTRUCTION_Y,
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

  /** HUD テキストを生成する。create() 内で 1 回呼ぶ。 */
  build(): void {
    this.instructionText = this.scene.add
      .text(0, 0, INSTRUCTION_TEXT, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: INSTRUCTION_FONT_SIZE,
        color: INSTRUCTION_FONT_COLOR
      })
      .setScrollFactor(0);

    this.gearHud = this.makeHudText(this.formatGear());
    this.stageHud = this.makeHudText(this.formatStage());
    this.lifeHud = this.makeHudText(this.formatLife());
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
      .setScrollFactor(0);
  }

  /** カメラズームに合わせて HUD を画面端へ配置する（既存 updateHudPositions）。 */
  layout(): void {
    const cam = this.scene.cameras.main;
    const zoom = cam.zoom;
    const hw = this.scene.scale.width / 2;
    const hh = this.scene.scale.height / 2;
    const toWorldX = (sx: number) => (sx - (1 - zoom) * hw) / zoom;
    const toWorldY = (sy: number) => (sy - (1 - zoom) * hh) / zoom;
    this.stageHud.setPosition(toWorldX(HUD_GEAR_X), toWorldY(HUD_STAGE_Y));
    this.gearHud.setPosition(toWorldX(HUD_GEAR_X), toWorldY(HUD_GEAR_Y));
    this.lifeHud.setPosition(toWorldX(HUD_LIFE_X), toWorldY(HUD_LIFE_Y));
    this.instructionText.setPosition(toWorldX(HUD_LIFE_X), toWorldY(HUD_INSTRUCTION_Y));
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
    return this.scene.add
      .text(this.scene.scale.width / 2, this.scene.scale.height / 2, text, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: style.fontSize ?? CENTER_MSG_FONT_SIZE,
        color: style.color,
        stroke: CENTER_MSG_STROKE_COLOR,
        strokeThickness: style.strokeThickness ?? CENTER_MSG_STROKE_THICKNESS,
        align: 'center'
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
  }

  /** 中央メッセージ下に点滅プロンプト（再開 / 次へ）を表示する。 */
  showPrompt(text: string): Phaser.GameObjects.Text {
    const prompt = this.scene.add
      .text(this.scene.scale.width / 2, this.scene.scale.height / 2 + PROMPT_OFFSET_Y, text, {
        fontFamily: UI_FONT_FAMILY,
        fontSize: PROMPT_FONT_SIZE,
        color: PROMPT_FONT_COLOR,
        stroke: CENTER_MSG_STROKE_COLOR,
        strokeThickness: CENTER_MSG_STROKE_THICKNESS,
        align: 'center'
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
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

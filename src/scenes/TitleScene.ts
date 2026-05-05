import Phaser from 'phaser';
import {
  BG_COLOR,
  GAME_TITLE,
  TITLE_FONT_COLOR,
  TITLE_FONT_FAMILY,
  TITLE_FONT_SIZE,
  TITLE_PROMPT_BLINK_MS,
  TITLE_PROMPT_FONT_SIZE,
  TITLE_PROMPT_OFFSET_Y,
  TITLE_PROMPT_TEXT,
  TITLE_STROKE_COLOR,
  TITLE_STROKE_THICKNESS
} from '../config/gameConfig';

export class TitleScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private blinkTween?: Phaser.Tweens.Tween;
  private isStarting = false;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.isStarting = false;
    this.cameras.main.setBackgroundColor(BG_COLOR);
    this.cameras.main.setZoom(1);

    this.titleText = this.add
      .text(0, 0, GAME_TITLE, {
        fontFamily: TITLE_FONT_FAMILY,
        fontSize: TITLE_FONT_SIZE,
        color: TITLE_FONT_COLOR,
        stroke: TITLE_STROKE_COLOR,
        strokeThickness: TITLE_STROKE_THICKNESS
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.promptText = this.add
      .text(0, 0, TITLE_PROMPT_TEXT, {
        fontFamily: TITLE_FONT_FAMILY,
        fontSize: TITLE_PROMPT_FONT_SIZE,
        color: TITLE_FONT_COLOR,
        stroke: TITLE_STROKE_COLOR,
        strokeThickness: TITLE_STROKE_THICKNESS
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.layout();

    this.blinkTween = this.tweens.add({
      targets: this.promptText,
      alpha: 0,
      duration: TITLE_PROMPT_BLINK_MS,
      yoyo: true,
      repeat: -1
    });

    this.input.keyboard?.once('keydown-SPACE', this.startGame, this);
    this.input.keyboard?.once('keydown-ENTER', this.startGame, this);
    this.input.once('pointerdown', this.startGame, this);

    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  private layout(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.titleText.setPosition(cx, cy);
    this.promptText.setPosition(cx, cy + TITLE_PROMPT_OFFSET_Y);
  }

  private startGame(): void {
    if (this.isStarting) return;
    this.isStarting = true;
    this.scene.start('GameScene', { stageIndex: 0 });
  }

  private onShutdown(): void {
    this.scale.off('resize', this.layout, this);
    this.blinkTween?.stop();
  }
}

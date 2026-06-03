import Phaser from 'phaser';
import { INITIAL_LIVES } from '../config/gameConfig';
import { STAGES } from '../stages/index';

const BRASS   = 0xc9973a;
const BRASS_D = 0x7a5420;
const BRASS_DD= 0x4a2f08;
const AMBER   = 0xffc050;
const BG_TOP  = 0x050810;
const BG_BOT  = 0x150c00;

export class TitleScene extends Phaser.Scene {
  private bgGfx!: Phaser.GameObjects.Graphics;
  private gearBig!: Phaser.GameObjects.Graphics;
  private gearMed!: Phaser.GameObjects.Graphics;
  private gearSml!: Phaser.GameObjects.Graphics;
  private clockFace!: Phaser.GameObjects.Graphics;
  private clockHour!: Phaser.GameObjects.Graphics;
  private clockMin!: Phaser.GameObjects.Graphics;
  private titleChiku!: Phaser.GameObjects.Text;
  private titleClockRun!: Phaser.GameObjects.Text;
  private flavorText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private isStarting = false;

  /** コンティニュー地点。undefined=最初から。0..STAGES.length-1=通常ステージ、STAGES.length=ボス戦。 */
  private continueStage: number | undefined = undefined;
  private continueGearsCollected = 0;
  private continueGearsTotal = 0;

  constructor() {
    super('TitleScene');
  }

  /**
   * ゲームオーバー復帰時にコンティニュー地点と通算歯車を受け取る。
   * 値が無い（最初から / 全クリア後）場合は通常の「最初から」になる。
   */
  init(data?: { continueStage?: number; gearsCollected?: number; gearsTotal?: number }): void {
    const cs = Number(data?.continueStage);
    this.continueStage = Number.isFinite(cs) && cs >= 0 && cs <= STAGES.length ? Math.floor(cs) : undefined;
    const gc = Number(data?.gearsCollected);
    const gt = Number(data?.gearsTotal);
    this.continueGearsCollected = Number.isFinite(gc) && gc >= 0 ? Math.floor(gc) : 0;
    this.continueGearsTotal = Number.isFinite(gt) && gt >= 0 ? Math.floor(gt) : 0;
  }

  private get canContinue(): boolean {
    return this.continueStage !== undefined;
  }

  create(): void {
    this.isStarting = false;
    this.cameras.main.setZoom(1);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // --- 背景 ---
    this.bgGfx = this.add.graphics();

    // --- ギア群（右寄り）---
    this.gearBig = this.add.graphics();
    this.drawGear(this.gearBig, 100, 14, BRASS_D, BRASS_DD);

    this.gearMed = this.add.graphics();
    this.drawGear(this.gearMed, 52, 10, BRASS, BRASS_D);

    this.gearSml = this.add.graphics();
    this.drawGear(this.gearSml, 30, 8, 0x6b4226, 0x3d1f0a);

    // ギア回転アニメーション
    this.tweens.add({ targets: this.gearBig, angle: 360,  duration: 11000, repeat: -1, ease: 'Linear' });
    this.tweens.add({ targets: this.gearMed, angle: -360, duration: 11000 * 52 / 100, repeat: -1, ease: 'Linear' });
    this.tweens.add({ targets: this.gearSml, angle: 360,  duration: 11000 * 30 / 100, repeat: -1, ease: 'Linear' });

    // --- 時計（左寄り）---
    this.clockFace = this.add.graphics();
    this.clockHour = this.add.graphics();
    this.clockMin  = this.add.graphics();
    this.buildClockFace();
    this.buildClockHands();
    this.animateClock();

    // --- テキスト ---
    this.titleChiku = this.add.text(0, 0, 'CHIKU', {
      fontFamily: 'monospace, "Courier New", sans-serif',
      fontSize: '90px',
      color: '#ffc050',
      stroke: '#3a1800',
      strokeThickness: 10,
    }).setOrigin(0.5);

    this.titleClockRun = this.add.text(0, 0, 'CLOCK  RUN', {
      fontFamily: 'monospace, "Courier New", sans-serif',
      fontSize: '40px',
      color: '#e8d0a0',
      stroke: '#2a1000',
      strokeThickness: 6,
      letterSpacing: 8,
    }).setOrigin(0.5);

    this.flavorText = this.add.text(0, 0, '— a clockwork adventure —', {
      fontFamily: '"Courier New", monospace, serif',
      fontSize: '16px',
      color: '#907040',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    const promptLabel = this.canContinue ? '⚙  SPACE / TAP TO CONTINUE  ⚙' : '⚙  SPACE / TAP TO START  ⚙';
    this.promptText = this.add.text(0, 0, promptLabel, {
      fontFamily: 'monospace, "Courier New", sans-serif',
      fontSize: '22px',
      color: '#ffd080',
      stroke: '#1a0800',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.promptText,
      alpha: { from: 1, to: 0.15 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    this.layout();

    // --- 入力 ---
    this.input.keyboard?.once('keydown-SPACE', this.startGame, this);
    this.input.keyboard?.once('keydown-ENTER', this.startGame, this);
    this.input.once('pointerdown', this.startGame, this);

    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  // -----------------------------------------------------------------------
  // ギア描画（Graphics の原点(0,0) を中心に描く → setPosition で配置）
  // -----------------------------------------------------------------------
  private drawGear(g: Phaser.GameObjects.Graphics, outerR: number, teeth: number, color: number, darkColor: number): void {
    const toothH    = outerR * 0.22;
    const arcWidth  = (Math.PI * 2 * outerR / teeth) * 0.55;

    // 歯
    g.fillStyle(color);
    for (let i = 0; i < teeth; i++) {
      const a  = (i / teeth) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const hw = arcWidth / 2;
      const hh = toothH / 2;
      const tx = (outerR + hh) * ca;
      const ty = (outerR + hh) * sa;
      g.fillPoints([
        new Phaser.Geom.Point(tx + ca * (-hh) - sa * (-hw), ty + sa * (-hh) + ca * (-hw)),
        new Phaser.Geom.Point(tx + ca * (-hh) - sa *   hw,  ty + sa * (-hh) + ca *   hw),
        new Phaser.Geom.Point(tx + ca *   hh  - sa *   hw,  ty + sa *   hh  + ca *   hw),
        new Phaser.Geom.Point(tx + ca *   hh  - sa * (-hw), ty + sa *   hh  + ca * (-hw)),
      ], true);
    }

    // 本体円
    g.fillCircle(0, 0, outerR);

    // 内側暗いリング
    g.fillStyle(darkColor);
    g.fillCircle(0, 0, outerR * 0.68);

    // スポーク
    g.fillStyle(color);
    const spokeCount = 6;
    const sw = Math.max(3, outerR * 0.1);
    const sl = outerR * 0.65;
    for (let i = 0; i < spokeCount; i++) {
      const a  = (i / spokeCount) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const pc = Math.cos(a + Math.PI / 2), ps = Math.sin(a + Math.PI / 2);
      g.fillPoints([
        new Phaser.Geom.Point( pc * sw,  ps * sw),
        new Phaser.Geom.Point(-pc * sw, -ps * sw),
        new Phaser.Geom.Point(ca * sl,   sa * sl),
      ], true);
    }

    // 中心ハブ
    g.fillStyle(darkColor);
    g.fillCircle(0, 0, outerR * 0.22);
    g.fillStyle(color);
    g.fillCircle(0, 0, outerR * 0.12);
    g.fillStyle(0x050810);
    g.fillCircle(0, 0, outerR * 0.055);
  }

  // -----------------------------------------------------------------------
  // 時計盤（静的）
  // -----------------------------------------------------------------------
  private buildClockFace(): void {
    const g = this.clockFace;
    const r = 52;
    // 外縁リング
    g.fillStyle(0x1a1000);
    g.fillCircle(0, 0, r + 7);
    g.fillStyle(BRASS);
    g.fillCircle(0, 0, r + 4);
    g.fillStyle(0x070510);
    g.fillCircle(0, 0, r);
    // 時間マーカー
    for (let i = 0; i < 12; i++) {
      const a   = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const big = i % 3 === 0;
      const len = big ? 10 : 5;
      const thk = big ? 3 : 1.5;
      const x1  = (r - 6) * Math.cos(a),         y1 = (r - 6) * Math.sin(a);
      const x2  = (r - 6 - len) * Math.cos(a),  y2 = (r - 6 - len) * Math.sin(a);
      g.lineStyle(thk, BRASS, 1);
      g.strokeLineShape(new Phaser.Geom.Line(x1, y1, x2, y2));
    }
  }

  // -----------------------------------------------------------------------
  // 時計の針（現在時刻で初期角度を設定）
  // -----------------------------------------------------------------------
  private buildClockHands(): void {
    const r = 52;
    const now  = new Date();
    const hAng = ((now.getHours() % 12) / 12 + now.getMinutes() / 720) * 360;
    const mAng = (now.getMinutes() / 60) * 360;

    this.clockHour.fillStyle(BRASS);
    this.clockHour.fillRect(-3, -(r * 0.52), 6, r * 0.54);
    this.clockHour.fillCircle(0, 0, 5);
    this.clockHour.setAngle(hAng);

    this.clockMin.fillStyle(0xffd080);
    this.clockMin.fillRect(-2, -(r * 0.72), 4, r * 0.75);
    this.clockMin.fillCircle(0, 0, 3.5);
    this.clockMin.setAngle(mAng);
  }

  private animateClock(): void {
    const now  = new Date();
    const hAng = ((now.getHours() % 12) / 12 + now.getMinutes() / 720) * 360;
    const mAng = (now.getMinutes() / 60) * 360;
    // 視覚的に分かりやすい速度でゆっくり回す
    this.tweens.add({ targets: this.clockMin,  angle: mAng + 360,  duration: 30000,  repeat: -1, ease: 'Linear' });
    this.tweens.add({ targets: this.clockHour, angle: hAng + 360,  duration: 360000, repeat: -1, ease: 'Linear' });
  }

  // -----------------------------------------------------------------------
  // レイアウト（リサイズ時も呼ばれる）
  // -----------------------------------------------------------------------
  private layout(): void {
    const W  = this.scale.width;
    const H  = this.scale.height;
    const cx = W / 2;

    // 背景再描画
    const g = this.bgGfx;
    g.clear();
    g.fillGradientStyle(BG_TOP, BG_TOP, BG_BOT, BG_BOT, 1);
    g.fillRect(0, 0, W, H);
    // アンバーの底光
    g.fillGradientStyle(BG_BOT, BG_BOT, 0x2a1400, 0x2a1400, 0.7);
    g.fillRect(0, H * 0.55, W, H * 0.45);
    // 区切り線
    g.fillStyle(BRASS_D, 0.4);
    g.fillRect(0, H * 0.55, W, 1);
    // 枠線
    g.lineStyle(1.5, BRASS_D, 0.5);
    g.strokeRect(10, 10, W - 20, H - 20);
    // コーナー装飾
    this.corner(g, 10, 10,       1,  1);
    this.corner(g, W - 10, 10,  -1,  1);
    this.corner(g, 10, H - 10,   1, -1);
    this.corner(g, W - 10, H - 10, -1, -1);

    // ギア配置（右寄り）
    const gx = W * 0.78;
    const gy = H * 0.40;
    this.gearBig.setPosition(gx, gy);
    // 中ギアはビッグと左上でかみ合う角度に
    const meshA1 = -2.4;
    this.gearMed.setPosition(
      gx + (100 + 52 + 5) * Math.cos(meshA1),
      gy + (100 + 52 + 5) * Math.sin(meshA1)
    );
    const meshA2 = 2.0;
    this.gearSml.setPosition(
      gx + (100 + 30 + 4) * Math.cos(meshA2),
      gy + (100 + 30 + 4) * Math.sin(meshA2)
    );

    // 時計配置（左寄り）
    const clkX = W * 0.20;
    const clkY = H * 0.33;
    this.clockFace.setPosition(clkX, clkY);
    this.clockHour.setPosition(clkX, clkY);
    this.clockMin.setPosition(clkX, clkY);

    // テキスト
    this.titleChiku.setPosition(cx, H * 0.52);
    this.titleClockRun.setPosition(cx, H * 0.65);
    this.flavorText.setPosition(cx, H * 0.74);
    this.promptText.setPosition(cx, H * 0.87);
  }

  private corner(g: Phaser.GameObjects.Graphics, x: number, y: number, sx: number, sy: number): void {
    g.lineStyle(2, AMBER, 0.9);
    g.beginPath();
    g.moveTo(x, y + sy * 22);
    g.lineTo(x, y);
    g.lineTo(x + sx * 22, y);
    g.strokePath();
  }

  // -----------------------------------------------------------------------
  // ゲーム開始
  // -----------------------------------------------------------------------
  private startGame(): void {
    if (this.isStarting) return;
    this.isStarting = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.continueStage !== undefined && this.continueStage >= STAGES.length) {
        // ボス戦から再開（歯車数を保持）。
        this.scene.launch('BossScene', {
          lives: INITIAL_LIVES,
          gearsCollected: this.continueGearsCollected,
          gearsTotal: this.continueGearsTotal
        });
      } else {
        // 通常ステージ。コンティニューならそのステージから、無ければ最初から。
        this.scene.launch('GameScene', {
          stageIndex: this.continueStage ?? 0,
          lives: INITIAL_LIVES,
          gearsCollected: this.continueGearsCollected,
          gearsTotal: this.continueGearsTotal
        });
      }
      this.scene.stop();
    });
  }

  private onShutdown(): void {
    this.scale.off('resize', this.layout, this);
  }
}

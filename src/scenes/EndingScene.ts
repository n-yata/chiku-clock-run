import Phaser from 'phaser';
import {
  TEX_KEY,
  UI_FONT_FAMILY,
  INITIAL_LIVES,
  ENDING_SKY_NIGHT_TOP,
  ENDING_SKY_NIGHT_BOT,
  ENDING_SKY_DAY_TOP,
  ENDING_SKY_DAY_BOT,
  ENDING_SUN_COLOR,
  ENDING_RAY_COLOR,
  ENDING_CLOCK_BRASS,
  ENDING_CLOCK_BRASS_DARK,
  ENDING_CLOCK_FACE_NIGHT,
  ENDING_CLOCK_FACE_DAY,
  ENDING_HAND_HOUR_COLOR,
  ENDING_HAND_MIN_COLOR,
  ENDING_GEAR_COLOR,
  ENDING_GEAR_DARK,
  ENDING_FADE_IN_MS,
  ENDING_GEARS_START_MS,
  ENDING_GEAR_FLY_MS,
  ENDING_GEAR_STAGGER_MS,
  ENDING_CLOCK_START_MS,
  ENDING_SKY_CLEAR_MS,
  ENDING_SKY_TWEEN_MS,
  ENDING_FINALE_MS,
  ENDING_TO_TITLE_DELAY_MS,
  ENDING_TITLE_TEXT,
  ENDING_SUBTITLE_TEXT,
  ENDING_GEAR_PREFIX,
  ENDING_SKIP_PROMPT,
  ENDING_TITLE_COLOR,
  ENDING_SUBTITLE_COLOR,
  ALL_CLEAR_SUFFIX,
  ANIM_KEY
} from '../config/gameConfig';
import { AudioManager } from '../audio/AudioManager';
import { ParticleManager } from '../game/ParticleManager';
import { buildPlayerSheet, buildParticleTexture } from './spriteSheets';
import { registerAnimations } from './animations';

/** 時計の表示半径（描画基準）。 */
const CLOCK_RADIUS = 84;
/** 飛来する歯車のレイアウト（時計中心からのオフセットと寸法）。 */
interface GearSpec {
  dx: number;       // 時計中心からの X オフセット（描画基準座標）
  dy: number;       // 時計中心からの Y オフセット
  radius: number;   // 歯車外径
  teeth: number;    // 歯数
  spinMs: number;   // 1 回転にかける時間（小さいほど速い）
  dir: 1 | -1;      // 回転方向
}
const GEAR_SPECS: ReadonlyArray<GearSpec> = [
  { dx: 0,    dy: 0,    radius: 30, teeth: 10, spinMs: 9000,  dir: 1 },
  { dx: -64,  dy: -36,  radius: 22, teeth: 8,  spinMs: 6500,  dir: -1 },
  { dx: 60,   dy: -44,  radius: 18, teeth: 8,  spinMs: 5200,  dir: 1 },
  { dx: 54,   dy: 40,   radius: 16, teeth: 7,  spinMs: 4200,  dir: -1 },
  { dx: -56,  dy: 44,   radius: 14, teeth: 7,  spinMs: 3600,  dir: 1 }
];

/**
 * 全クリア演出シーン（20260531-ending-movie）。
 * 集めた歯車で止まった大時計を修理し、時計が動き出し、曇り空が晴れて
 * ハッピーエンドに至る「絵巻」を Graphics + Tween で再生する。
 * GameScene の物理ワールド・敵・カメラには依存しない独立シーン。
 */
export class EndingScene extends Phaser.Scene {
  private gearsCollected = 0;
  private gearsTotal = 0;

  private skyNight!: Phaser.GameObjects.Graphics; // 夜/曇りの空（常時不透明・最背面）
  private skyDay!: Phaser.GameObjects.Graphics;   // 晴れの空（alpha 0→1 で重ねる）
  private sun!: Phaser.GameObjects.Graphics;       // 昇る太陽
  private rays!: Phaser.GameObjects.Graphics;      // 光条（ゆっくり回転）
  private stageGroup!: Phaser.GameObjects.Container; // 時計+歯車（中央配置の入れ物）
  private clockFaceNight!: Phaser.GameObjects.Graphics;
  private clockFaceDay!: Phaser.GameObjects.Graphics; // alpha 0→1 で明るい文字盤へ
  private clockHour!: Phaser.GameObjects.Graphics;
  private clockMin!: Phaser.GameObjects.Graphics;
  private gears: Phaser.GameObjects.Graphics[] = [];
  private chiku!: Phaser.GameObjects.Sprite;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private gearText!: Phaser.GameObjects.Text;
  private suffixText!: Phaser.GameObjects.Text;
  private skipText!: Phaser.GameObjects.Text;

  private audio!: AudioManager;
  private particles!: ParticleManager;

  private timers: Phaser.Time.TimerEvent[] = [];
  private gearsRevealed = false;
  private clockStarted = false;
  private skyCleared = false;
  private finaleEntered = false;

  constructor() {
    super('EndingScene');
  }

  init(data: { gearsCollected?: number; gearsTotal?: number }): void {
    const c = Number(data?.gearsCollected);
    const t = Number(data?.gearsTotal);
    this.gearsCollected = Number.isFinite(c) && c >= 0 ? Math.floor(c) : 0;
    this.gearsTotal = Number.isFinite(t) && t >= 0 ? Math.floor(t) : 0;
  }

  create(): void {
    // 状態リセット（シーン再利用に備える）。
    this.gears = [];
    this.timers = [];
    this.gearsRevealed = false;
    this.clockStarted = false;
    this.skyCleared = false;
    this.finaleEntered = false;

    // テクスチャ/アニメーションは GameScene 経由で既存のはずだが、冪等ビルダで防御的に用意する。
    buildPlayerSheet(this);
    buildParticleTexture(this);
    registerAnimations(this);

    this.cameras.main.setZoom(1);
    this.cameras.main.fadeIn(ENDING_FADE_IN_MS, 0, 0, 0);

    // --- 空（夜→晴れ）---
    this.skyNight = this.add.graphics().setDepth(-20);
    this.skyDay = this.add.graphics().setDepth(-19).setAlpha(0);

    // --- 太陽 + 光条（晴れフェーズで現れる）---
    this.rays = this.add.graphics().setDepth(-18).setAlpha(0);
    this.buildRays(this.rays);
    this.sun = this.add.graphics().setDepth(-17).setAlpha(0).setScale(0.2);
    this.buildSun(this.sun);

    // --- 時計 + 歯車（中央の入れ物）---
    this.stageGroup = this.add.container(0, 0).setDepth(0);
    this.clockFaceNight = this.add.graphics();
    this.clockFaceDay = this.add.graphics().setAlpha(0);
    this.clockHour = this.add.graphics();
    this.clockMin = this.add.graphics();
    this.buildClockFace(this.clockFaceNight, ENDING_CLOCK_FACE_NIGHT);
    this.buildClockFace(this.clockFaceDay, ENDING_CLOCK_FACE_DAY);
    this.buildClockHands();
    this.stageGroup.add([this.clockFaceNight, this.clockFaceDay, this.clockHour, this.clockMin]);

    // 歯車（初期は不可視・縮小。歯車組み込みフェーズで pop してくる）。
    GEAR_SPECS.forEach((spec) => {
      const g = this.add.graphics().setPosition(spec.dx, spec.dy).setAlpha(0).setScale(0.1);
      this.drawGear(g, spec.radius, spec.teeth, ENDING_GEAR_COLOR, ENDING_GEAR_DARK);
      this.gears.push(g);
      this.stageGroup.add(g);
    });

    // --- チク（ハッピーエンドで登場）---
    this.chiku = this.add.sprite(0, 0, TEX_KEY.playerSheet, 'idle').setDepth(5).setAlpha(0);
    this.chiku.anims.play(ANIM_KEY.playerIdle, true);

    // --- テキスト ---
    this.titleText = this.add.text(0, 0, ENDING_TITLE_TEXT, {
      fontFamily: UI_FONT_FAMILY,
      fontSize: '64px',
      color: ENDING_TITLE_COLOR,
      stroke: '#3a2400',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5).setDepth(60).setAlpha(0);

    this.subtitleText = this.add.text(0, 0, ENDING_SUBTITLE_TEXT, {
      fontFamily: UI_FONT_FAMILY,
      fontSize: '24px',
      color: ENDING_SUBTITLE_COLOR,
      stroke: '#2a1800',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5).setDepth(60).setAlpha(0);

    this.gearText = this.add.text(0, 0, this.formatGear(), {
      fontFamily: UI_FONT_FAMILY,
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5).setDepth(60).setAlpha(0);

    this.suffixText = this.add.text(0, 0, ALL_CLEAR_SUFFIX, {
      fontFamily: UI_FONT_FAMILY,
      fontSize: '18px',
      color: '#d8c89a',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5).setDepth(60).setAlpha(0);

    this.skipText = this.add.text(0, 0, ENDING_SKIP_PROMPT, {
      fontFamily: UI_FONT_FAMILY,
      fontSize: '18px',
      color: '#9fb0c0',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: this.skipText, alpha: { from: 0.85, to: 0.2 }, duration: 700, yoyo: true, repeat: -1 });

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);

    // --- 音声 ---
    this.audio = new AudioManager();
    this.input.keyboard?.once('keydown', () => this.audio.unlock());
    this.input.once('pointerdown', () => this.audio.unlock());
    this.particles = new ParticleManager(this);

    // --- 演出タイムライン ---
    this.buildTimeline();

    // --- スキップ入力 ---
    this.input.keyboard?.on('keydown', this.onSkip, this);
    this.input.on('pointerdown', this.onSkip, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  // -----------------------------------------------------------------------
  // タイムライン（各フェーズを create からの相対時刻で起動）
  // -----------------------------------------------------------------------
  private buildTimeline(): void {
    this.schedule(ENDING_GEARS_START_MS, () => this.revealGears(false));
    this.schedule(ENDING_CLOCK_START_MS, () => this.startClock(false));
    this.schedule(ENDING_SKY_CLEAR_MS, () => this.clearSky(false));
    this.schedule(ENDING_FINALE_MS, () => this.enterFinale());
  }

  private schedule(delayMs: number, fn: () => void): void {
    this.timers.push(this.time.delayedCall(delayMs, fn));
  }

  /** 歯車を時計に組み込む（pop イン + 連続回転）。 */
  private revealGears(immediate: boolean): void {
    if (this.gearsRevealed) return;
    this.gearsRevealed = true;
    this.gears.forEach((g, i) => {
      const spec = GEAR_SPECS[i];
      this.tweens.killTweensOf(g);
      if (immediate) {
        g.setAlpha(1).setScale(1);
      } else {
        this.tweens.add({
          targets: g,
          alpha: 1,
          scale: 1,
          delay: i * ENDING_GEAR_STAGGER_MS,
          duration: ENDING_GEAR_FLY_MS,
          ease: 'Back.easeOut',
          onStart: () => this.audio.playSe('gearBit')
        });
      }
      // 連続回転（角度 tween は画面サイズに依存しない）。
      this.tweens.add({
        targets: g,
        angle: spec.dir * 360,
        duration: spec.spinMs,
        repeat: -1,
        ease: 'Linear',
        delay: immediate ? 0 : i * ENDING_GEAR_STAGGER_MS
      });
    });
  }

  /** 時計を始動させる（針が回りだす + 文字盤が明るくなる）。 */
  private startClock(immediate: boolean): void {
    if (this.clockStarted) return;
    this.clockStarted = true;
    this.audio.playSe('beacon');
    this.tweens.killTweensOf(this.clockFaceDay);
    if (immediate) {
      this.clockFaceDay.setAlpha(1);
    } else {
      this.tweens.add({ targets: this.clockFaceDay, alpha: 1, duration: 900, ease: 'Quad.easeIn' });
    }
    // 分針は速く、時針はゆっくり連続回転（角度 tween）。
    this.tweens.add({ targets: this.clockMin, angle: 360, duration: 2400, repeat: -1, ease: 'Linear' });
    this.tweens.add({ targets: this.clockHour, angle: 360, duration: 14400, repeat: -1, ease: 'Linear' });
  }

  /** 空を晴れさせる（晴れレイヤ・太陽・光条をフェードイン）。 */
  private clearSky(immediate: boolean): void {
    if (this.skyCleared) return;
    this.skyCleared = true;
    this.tweens.killTweensOf(this.skyDay);
    this.tweens.killTweensOf(this.sun);
    this.tweens.killTweensOf(this.rays);
    if (immediate) {
      this.skyDay.setAlpha(1);
      this.sun.setAlpha(1).setScale(1);
      this.rays.setAlpha(0.5);
    } else {
      this.tweens.add({ targets: this.skyDay, alpha: 1, duration: ENDING_SKY_TWEEN_MS, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: this.sun, alpha: 1, scale: 1, duration: ENDING_SKY_TWEEN_MS, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: this.rays, alpha: 0.5, duration: ENDING_SKY_TWEEN_MS, ease: 'Quad.easeOut' });
    }
    // 光条のゆっくりした回転（常時）。
    this.tweens.add({ targets: this.rays, angle: 360, duration: 60000, repeat: -1, ease: 'Linear' });
  }

  /** ハッピーエンド（チク登場 + 祝祭 + テキスト）。完了後タイトルへ。 */
  private enterFinale(): void {
    if (this.finaleEntered) return;
    this.finaleEntered = true;

    // チク登場（pop イン）。
    this.tweens.killTweensOf(this.chiku);
    this.tweens.add({ targets: this.chiku, alpha: 1, scale: { from: 0.4, to: 1 }, duration: 500, ease: 'Back.easeOut' });

    // テキスト（順にフェードイン）。
    this.tweens.add({ targets: this.titleText, alpha: 1, duration: 600, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: this.subtitleText, alpha: 1, delay: 250, duration: 600 });
    this.tweens.add({ targets: this.gearText, alpha: 1, delay: 450, duration: 600 });
    this.tweens.add({ targets: this.suffixText, alpha: 0.9, delay: 700, duration: 600 });

    // 祝祭バースト（時計まわりとチクの周辺）。
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.particles.celebrate(cx, cy - CLOCK_RADIUS * 0.5);
    this.audio.playSe('beacon');
    // 演出に関わる遅延は timers 配列で一元管理し、SHUTDOWN で確実に止める。
    this.schedule(260, () => this.particles.burstGear(cx, cy));

    // 自動でタイトルへ。
    this.schedule(ENDING_TO_TITLE_DELAY_MS, () => this.goToTitle());
  }

  /** スキップ: 進行中のタイマーを止め、最終カットへ一気に飛ぶ。 */
  private onSkip(): void {
    if (this.finaleEntered) return;
    this.audio.unlock();
    this.clearTimers();
    this.revealGears(true);
    this.startClock(true);
    this.clearSky(true);
    this.enterFinale();
  }

  private goToTitle(): void {
    this.cameras.main.fadeOut(ENDING_FADE_IN_MS, 0, 0, 0);
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      this.scene.start('TitleScene', { lives: INITIAL_LIVES });
    };
    this.cameras.main.once('camerafadeoutcomplete', go);
    this.time.delayedCall(ENDING_FADE_IN_MS + 200, go);
  }

  private clearTimers(): void {
    this.timers.forEach((t) => t.remove(false));
    this.timers = [];
  }

  private formatGear(): string {
    if (this.gearsTotal <= 0) {
      return `${ENDING_GEAR_PREFIX}: ${this.gearsCollected}`;
    }
    return `${ENDING_GEAR_PREFIX}: ${this.gearsCollected} / ${this.gearsTotal}`;
  }

  // -----------------------------------------------------------------------
  // レイアウト（RESIZE 対応。位置のみを担い、進行中の tween は角度/alpha/scale）
  // -----------------------------------------------------------------------
  private layout(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2;
    const cy = H / 2;

    // 空（全画面グラデーション）。
    this.skyNight.clear();
    this.skyNight.fillGradientStyle(ENDING_SKY_NIGHT_TOP, ENDING_SKY_NIGHT_TOP, ENDING_SKY_NIGHT_BOT, ENDING_SKY_NIGHT_BOT, 1);
    this.skyNight.fillRect(0, 0, W, H);
    this.skyDay.clear();
    this.skyDay.fillGradientStyle(ENDING_SKY_DAY_TOP, ENDING_SKY_DAY_TOP, ENDING_SKY_DAY_BOT, ENDING_SKY_DAY_BOT, 1);
    this.skyDay.fillRect(0, 0, W, H);

    // 太陽・光条（時計の上・やや右）。
    const sunX = cx + W * 0.16;
    const sunY = cy - CLOCK_RADIUS * 1.5;
    this.sun.setPosition(sunX, sunY);
    this.rays.setPosition(sunX, sunY);

    // 時計+歯車（中央やや上）。
    this.stageGroup.setPosition(cx, cy - H * 0.06);

    // チク（時計の下）。
    this.chiku.setPosition(cx, cy + CLOCK_RADIUS + 70);
    this.chiku.setDisplaySize(72, 108);

    // テキスト。
    this.titleText.setPosition(cx, H * 0.16);
    this.subtitleText.setPosition(cx, H * 0.16 + 56);
    this.gearText.setPosition(cx, H * 0.86);
    this.suffixText.setPosition(cx, H * 0.92);
    this.skipText.setPosition(W - 16, H - 16).setOrigin(1, 1);
  }

  // -----------------------------------------------------------------------
  // 描画ヘルパ（Graphics の原点(0,0) を中心に描く）
  // -----------------------------------------------------------------------
  private buildClockFace(g: Phaser.GameObjects.Graphics, faceColor: number): void {
    const r = CLOCK_RADIUS;
    g.clear();
    // 外縁リング（真鍮）
    g.fillStyle(ENDING_CLOCK_BRASS_DARK);
    g.fillCircle(0, 0, r + 10);
    g.fillStyle(ENDING_CLOCK_BRASS);
    g.fillCircle(0, 0, r + 6);
    g.fillStyle(faceColor);
    g.fillCircle(0, 0, r);
    // 時間マーカー
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const big = i % 3 === 0;
      const len = big ? 14 : 7;
      const thk = big ? 4 : 2;
      const x1 = (r - 8) * Math.cos(a), y1 = (r - 8) * Math.sin(a);
      const x2 = (r - 8 - len) * Math.cos(a), y2 = (r - 8 - len) * Math.sin(a);
      g.lineStyle(thk, ENDING_CLOCK_BRASS, 1);
      g.strokeLineShape(new Phaser.Geom.Line(x1, y1, x2, y2));
    }
    // 中心ハブ
    g.fillStyle(ENDING_CLOCK_BRASS);
    g.fillCircle(0, 0, 6);
  }

  private buildClockHands(): void {
    const r = CLOCK_RADIUS;
    // 始動前は 10:08 風の静止角度（古典的な「止まった時計」の見た目）。
    const hAng = (10 / 12) * 360 + (8 / 60) * 30;
    const mAng = (8 / 60) * 360;

    this.clockHour.clear();
    this.clockHour.fillStyle(ENDING_HAND_HOUR_COLOR);
    this.clockHour.fillRect(-4, -(r * 0.5), 8, r * 0.52);
    this.clockHour.fillCircle(0, 0, 6);
    this.clockHour.setAngle(hAng);

    this.clockMin.clear();
    this.clockMin.fillStyle(ENDING_HAND_MIN_COLOR);
    this.clockMin.fillRect(-3, -(r * 0.74), 6, r * 0.76);
    this.clockMin.fillCircle(0, 0, 4);
    this.clockMin.setAngle(mAng);
  }

  private buildSun(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    // 外側のグロー
    g.fillStyle(ENDING_SUN_COLOR, 0.25);
    g.fillCircle(0, 0, 70);
    g.fillStyle(ENDING_SUN_COLOR, 0.45);
    g.fillCircle(0, 0, 52);
    // コア
    g.fillStyle(ENDING_SUN_COLOR, 1);
    g.fillCircle(0, 0, 38);
  }

  private buildRays(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    const count = 12;
    const inner = 56;
    const outer = 150;
    const halfW = 10;
    g.fillStyle(ENDING_RAY_COLOR, 1);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const pc = Math.cos(a + Math.PI / 2), ps = Math.sin(a + Math.PI / 2);
      g.fillPoints([
        new Phaser.Geom.Point(ca * inner + pc * halfW, sa * inner + ps * halfW),
        new Phaser.Geom.Point(ca * inner - pc * halfW, sa * inner - ps * halfW),
        new Phaser.Geom.Point(ca * outer - pc * (halfW * 0.4), sa * outer - ps * (halfW * 0.4)),
        new Phaser.Geom.Point(ca * outer + pc * (halfW * 0.4), sa * outer + ps * (halfW * 0.4))
      ], true);
    }
  }

  /** 中心(0,0)の歯車を描く（歯・本体・暗リング・スポーク・ハブ）。 */
  private drawGear(g: Phaser.GameObjects.Graphics, outerR: number, teeth: number, color: number, darkColor: number): void {
    const toothH = outerR * 0.24;
    const arcWidth = (Math.PI * 2 * outerR / teeth) * 0.55;

    g.fillStyle(color);
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const hw = arcWidth / 2;
      const hh = toothH / 2;
      const tx = (outerR + hh) * ca;
      const ty = (outerR + hh) * sa;
      g.fillPoints([
        new Phaser.Geom.Point(tx + ca * (-hh) - sa * (-hw), ty + sa * (-hh) + ca * (-hw)),
        new Phaser.Geom.Point(tx + ca * (-hh) - sa * hw, ty + sa * (-hh) + ca * hw),
        new Phaser.Geom.Point(tx + ca * hh - sa * hw, ty + sa * hh + ca * hw),
        new Phaser.Geom.Point(tx + ca * hh - sa * (-hw), ty + sa * hh + ca * (-hw))
      ], true);
    }
    g.fillCircle(0, 0, outerR);
    g.fillStyle(darkColor);
    g.fillCircle(0, 0, outerR * 0.66);
    // スポーク
    g.fillStyle(color);
    const spokeCount = 6;
    const sw = Math.max(2.5, outerR * 0.1);
    const sl = outerR * 0.62;
    for (let i = 0; i < spokeCount; i++) {
      const a = (i / spokeCount) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const pc = Math.cos(a + Math.PI / 2), ps = Math.sin(a + Math.PI / 2);
      g.fillPoints([
        new Phaser.Geom.Point(pc * sw, ps * sw),
        new Phaser.Geom.Point(-pc * sw, -ps * sw),
        new Phaser.Geom.Point(ca * sl, sa * sl)
      ], true);
    }
    // ハブ
    g.fillStyle(darkColor);
    g.fillCircle(0, 0, outerR * 0.24);
    g.fillStyle(color);
    g.fillCircle(0, 0, outerR * 0.12);
  }

  private onShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.input.keyboard?.off('keydown', this.onSkip, this);
    this.input.off('pointerdown', this.onSkip, this);
    this.clearTimers();
    this.audio?.destroy();
  }
}

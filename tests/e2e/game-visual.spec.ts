import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { STAGES } from '../../src/stages/index';
import {
  measureStageDifficulty,
  validateCriticalPathClearance,
  validateDifficultyProgression
} from '../../src/stages/stageValidation';

test.describe.configure({ mode: 'serial' });

const root = process.cwd();

async function readSource(path: string): Promise<string> {
  return readFile(resolve(root, path), 'utf8');
}

type Rgb = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
};

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
// UIリッチ化スプリント P2 で背景を時計工房パレットへ刷新（BG_BASE_COLOR + シームレスタイル + ビネット）。
// 中央サンプル領域の実測色に更新（旧 BG_COLOR '#0f0c18' から変更）。
const BACKGROUND: Rgb = { r: 37, g: 47, b: 60 };
const PLAYER_SHOE: Rgb = { r: 107, g: 66, b: 38 };

test('supports landscape via CSS rotation on portrait devices without legacy API usage', async () => {
  const [manifestJson, mainSource, html] = await Promise.all([
    readSource('dist/manifest.webmanifest'),
    readSource('src/main.ts'),
    readSource('index.html')
  ]);
  const manifest: unknown = JSON.parse(manifestJson);

  // manifest は landscape を維持（PWA 表示ヒント）
  expect(manifest).toMatchObject({ orientation: 'landscape' });
  // CSS クラス基準の回転: body.is-portrait が html と main.ts の両方に存在すること
  expect(html).toContain('is-portrait');
  expect(mainSource).toContain('matchMedia');
  expect(mainSource).toContain('is-portrait');
  // E2E ヒットテスト破壊 / 非標準 API の使用禁止
  expect(mainSource).not.toContain('orientationchange');
  expect(html).not.toContain('rotate-notice');
  expect(html).not.toMatch(/@media\s*\(\s*orientation\s*:\s*portrait\s*\)/);
});

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

function countPixels(
  png: PNG,
  bounds: { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number },
  predicate: (color: Rgb) => boolean
): number {
  let total = 0;
  for (let y = bounds.y1; y < bounds.y2; y++) {
    for (let x = bounds.x1; x < bounds.x2; x++) {
      const index = (png.width * y + x) * 4;
      if (predicate({ r: png.data[index], g: png.data[index + 1], b: png.data[index + 2] })) {
        total++;
      }
    }
  }
  return total;
}

function findLowestPixelY(
  png: PNG,
  bounds: { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number },
  predicate: (color: Rgb) => boolean
): number | null {
  for (let y = bounds.y2 - 1; y >= bounds.y1; y--) {
    for (let x = bounds.x1; x < bounds.x2; x++) {
      const index = (png.width * y + x) * 4;
      if (predicate({ r: png.data[index], g: png.data[index + 1], b: png.data[index + 2] })) {
        return y;
      }
    }
  }
  return null;
}

function findFirstRowY(
  png: PNG,
  bounds: { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number },
  minPixelsInRow: number,
  predicate: (color: Rgb) => boolean
): number | null {
  for (let y = bounds.y1; y < bounds.y2; y++) {
    let total = 0;
    for (let x = bounds.x1; x < bounds.x2; x++) {
      const index = (png.width * y + x) * 4;
      if (predicate({ r: png.data[index], g: png.data[index + 1], b: png.data[index + 2] })) {
        total++;
      }
    }
    if (total >= minPixelsInRow) return y;
  }
  return null;
}

function isGroundPixel(color: Rgb): boolean {
  const isGrass = color.g > 120 && color.r < 120 && color.b < 120;
  const isDirt = color.r > 100 && color.g > 45 && color.g < 120 && color.b < 80;
  return isGrass || isDirt;
}

function isGrassPixel(color: Rgb): boolean {
  return color.g > 120 && color.r < 120 && color.b < 120;
}

function isGroundSurfacePixel(color: Rgb): boolean {
  return isGrassPixel(color) || colorDistance(color, { r: 67, g: 74, b: 95 }) < 12;
}

function isGearBitHubPixel(color: Rgb): boolean {
  return colorDistance(color, { r: 54, g: 148, b: 143 }) < 20;
}

function isPlayerShoePixel(color: Rgb): boolean {
  return colorDistance(color, PLAYER_SHOE) < 12;
}

async function installGameCapture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    let storedPhaser: unknown;
    Object.defineProperty(window, 'Phaser', {
      configurable: true,
      get() {
        return storedPhaser;
      },
      set(value: any) {
        if (value?.Game && !value.Game.__captured) {
          const OriginalGame = value.Game;
          const WrappedGame = function (...args: any[]) {
            const game = new OriginalGame(...args);
            (window as any).__capturedGame = game;
            return game;
          };
          WrappedGame.prototype = OriginalGame.prototype;
          Object.setPrototypeOf(WrappedGame, OriginalGame);
          WrappedGame.__captured = true;
          value.Game = WrappedGame;
        }
        storedPhaser = value;
      }
    });
  });
}

async function startGameAndWaitForPlayer(page: Page, canvas: Locator): Promise<void> {
  await expect(canvas).toHaveCount(1);
  await page.waitForFunction(() => Boolean((window as any).__capturedGame?.scene));
  await page.evaluate(() => {
    const sceneManager = (window as any).__capturedGame.scene;
    sceneManager.stop('TitleScene');
    sceneManager.start('GameScene', { stageIndex: 0 });
  });
  await page.waitForFunction(() => {
    const game = (window as any).__capturedGame;
    const scene = game?.scene.getScene('GameScene') as any;
    return Boolean(scene?.player?.body);
  });
  await page.waitForTimeout(500);
}

test('keeps maximum-size routes clear and raises difficulty stage by stage', () => {
  for (const stage of STAGES) {
    expect(validateCriticalPathClearance(stage), stage.id).toEqual([]);
  }

  const metrics = STAGES.map((stage) => measureStageDifficulty(stage));
  expect(metrics.map((metric) => metric.difficultyScore)).toEqual(
    [...metrics.map((metric) => metric.difficultyScore)].sort((a, b) => a - b)
  );
  expect(metrics[0].difficultyScore).toBeLessThan(metrics[1].difficultyScore);
  expect(metrics[1].difficultyScore).toBeLessThan(metrics[2].difficultyScore);
  expect(validateDifficultyProgression(STAGES)).toEqual([]);
});

test('renders sprite assets in the game canvas', async ({ page }) => {
  await installGameCapture(page);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveCount(1);
  await startGameAndWaitForPlayer(page, canvas);

  const screenshot = await canvas.screenshot();
  const png = PNG.sync.read(screenshot);
  expect(png.width).toBe(CANVAS_WIDTH);
  expect(png.height).toBe(CANVAS_HEIGHT);

  const backgroundPixels = countPixels(
    png,
    { x1: 420, y1: 180, x2: 520, y2: 260 },
    (color) => colorDistance(color, BACKGROUND) < 12
  );
  expect(backgroundPixels).toBeGreaterThanOrEqual(5_000);

  const groundPixels = countPixels(
    png,
    { x1: 0, y1: 480, x2: 420, y2: 512 },
    isGroundPixel
  );
  expect(groundPixels).toBeGreaterThan(150);

  // 歯車片ハブ: viewport 縮小（640×360）でスケール1.5倍, 実際の表示位置に合わせて調整
  const gearBitHubPixels = countPixels(
    png,
    { x1: 100, y1: 400, x2: 600, y2: 500 },
    isGearBitHubPixel
  );
  expect(gearBitHubPixels).toBeGreaterThan(5);

  // 敵（巻きネジ）: viewport 縮小で初期視野外になるため省略（gameplay テストでカバー済み）

  // プレイヤー靴: zoom 1.5x で表示が大きくなった分を考慮した範囲
  const playerBounds = { x1: 30, y1: 370, x2: 180, y2: 540 };
  const lowestShoeY = findLowestPixelY(png, playerBounds, isPlayerShoePixel);
  const groundTopY = findFirstRowY(
    png,
    { x1: playerBounds.x1, y1: 465, x2: playerBounds.x2, y2: 540 },
    8,
    isGroundSurfacePixel
  );
  expect(lowestShoeY).not.toBeNull();
  expect(groundTopY).not.toBeNull();
  expect(groundTopY! - lowestShoeY! - 1).toBeLessThanOrEqual(4); // antialias で境界が滲む分を緩和

  expect(pageErrors).toEqual([]);
  expect(consoleErrors.filter((line) => line.includes('[BootScene]'))).toEqual([]);
});

test('migrates a valid legacy stage index without retaining the old key', async ({ page }) => {
  await installGameCapture(page);
  await page.addInitScript(() => {
    sessionStorage.setItem('mario-game.stageIndex', '1');
  });
  await page.goto('/');
  await page.waitForFunction(() => {
    const game = (window as any).__capturedGame;
    const scene = game?.scene.getScene('GameScene') as any;
    return scene?.stageIndex === 1;
  });

  const migratedState = await page.evaluate(() => ({
    newValue: sessionStorage.getItem('chiku-clock-run.stageIndex'),
    legacyValue: sessionStorage.getItem('mario-game.stageIndex')
  }));

  expect(migratedState.newValue).toBeNull();
  expect(migratedState.legacyValue).toBeNull();
});

test('ignores an invalid legacy stage index and clears its key', async ({ page }) => {
  await installGameCapture(page);
  await page.addInitScript(() => {
    sessionStorage.setItem('mario-game.stageIndex', 'invalid');
  });
  await page.goto('/');
  await page.waitForFunction(() => {
    const game = (window as any).__capturedGame;
    return game?.scene.isActive('TitleScene');
  });

  const migratedState = await page.evaluate(() => ({
    newValue: sessionStorage.getItem('chiku-clock-run.stageIndex'),
    legacyValue: sessionStorage.getItem('mario-game.stageIndex')
  }));

  expect(migratedState.newValue).toBeNull();
  expect(migratedState.legacyValue).toBeNull();
});

test('takes one life and recovers in place when hit by an enemy with lives remaining', async ({ page }) => {
  await installGameCapture(page);
  await page.goto('/');
  const canvas = page.locator('canvas');
  await startGameAndWaitForPlayer(page, canvas);

  // 強化アイテム廃止後の被弾モデル: 敵被弾でライフ -1 し、その場で復帰（ミス確定にしない）。
  const result = await page.evaluate(() => {
    const scene = (window as any).__capturedGame.scene.getScene('GameScene') as any;
    const before = scene.lives;
    scene.handleMiss('enemy');
    return { before, after: scene.lives, isMissed: scene.isMissed };
  });

  expect(result.after).toBe(result.before - 1);
  expect(result.isMissed).toBe(false);
});

test('the last life is fatal on enemy hit and triggers a miss', async ({ page }) => {
  await installGameCapture(page);
  await page.goto('/');
  const canvas = page.locator('canvas');
  await startGameAndWaitForPlayer(page, canvas);

  // 境界仕様: 最後の 1 ライフ（lives=1）で敵被弾はその場復帰せず致命（ミス確定）。
  const result = await page.evaluate(() => {
    const scene = (window as any).__capturedGame.scene.getScene('GameScene') as any;
    scene.lives = 1;
    scene.handleMiss('enemy');
    return { isMissed: scene.isMissed };
  });

  expect(result.isMissed).toBe(true);
});

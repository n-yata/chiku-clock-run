import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

type Rgb = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
};

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const BACKGROUND: Rgb = { r: 92, g: 148, b: 252 };
const PLAYER_SHOE: Rgb = { r: 107, g: 66, b: 38 };

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

function isCoinPixel(color: Rgb): boolean {
  return color.r > 180 && color.g > 110 && color.b < 80;
}

function isPlayerShoePixel(color: Rgb): boolean {
  return colorDistance(color, PLAYER_SHOE) < 12;
}

test('renders sprite assets in the game canvas', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveCount(1);
  await canvas.click({ position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 } });
  await page.keyboard.press('Space');
  await page.waitForTimeout(2_000);

  const screenshot = await canvas.screenshot();
  const png = PNG.sync.read(screenshot);
  expect(png.width).toBe(CANVAS_WIDTH);
  expect(png.height).toBe(CANVAS_HEIGHT);

  const backgroundPixels = countPixels(
    png,
    { x1: 420, y1: 180, x2: 520, y2: 260 },
    (color) => colorDistance(color, BACKGROUND) < 12
  );
  expect(backgroundPixels).toBeGreaterThanOrEqual(8_000);

  const groundPixels = countPixels(
    png,
    { x1: 0, y1: 480, x2: 420, y2: 512 },
    isGroundPixel
  );
  expect(groundPixels).toBeGreaterThan(800);

  const coinPixels = countPixels(
    png,
    { x1: 120, y1: 465, x2: 360, y2: 512 },
    isCoinPixel
  );
  expect(coinPixels).toBeGreaterThan(40);

  const playerBounds = { x1: 45, y1: 430, x2: 120, y2: 520 };
  const lowestShoeY = findLowestPixelY(png, playerBounds, isPlayerShoePixel);
  const groundTopY = findFirstRowY(
    png,
    { x1: playerBounds.x1, y1: 500, x2: playerBounds.x2, y2: 520 },
    12,
    isGroundSurfacePixel
  );
  expect(lowestShoeY).not.toBeNull();
  expect(groundTopY).not.toBeNull();
  expect(groundTopY! - lowestShoeY! - 1).toBeLessThanOrEqual(1);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors.filter((line) => line.includes('[BootScene]'))).toEqual([]);
});

test('keeps upgraded player feet visually grounded', async ({ page }) => {
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

  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveCount(1);
  await canvas.click({ position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 } });
  await page.waitForTimeout(700);

  const runtimeState = await page.evaluate(() => {
    const game = (window as any).__capturedGame;
    const scene = game?.scene.getScene('GameScene') as any;
    if (!scene) throw new Error('GameScene is not available');
    scene.applyPlayerState('big');
    scene.player.setVelocity(0, 0);
    const body = scene.player.body;
    return {
      displayHeight: scene.player.displayHeight,
      bodyHeight: body.height,
      bodyBottom: body.bottom,
      visualBottom: scene.player.y + scene.player.displayHeight * (1 - scene.player.originY)
    };
  });

  expect(runtimeState.displayHeight).toBe(84);
  expect(runtimeState.bodyHeight).toBe(84);
  expect(Math.abs(runtimeState.bodyBottom - runtimeState.visualBottom)).toBeLessThanOrEqual(1);

  await page.waitForTimeout(300);
  const screenshot = await canvas.screenshot();
  const png = PNG.sync.read(screenshot);
  const playerBounds = { x1: 40, y1: 400, x2: 125, y2: 520 };
  const lowestShoeY = findLowestPixelY(png, playerBounds, isPlayerShoePixel);
  const groundTopY = findFirstRowY(
    png,
    { x1: playerBounds.x1, y1: 500, x2: playerBounds.x2, y2: 520 },
    12,
    isGroundSurfacePixel
  );

  expect(lowestShoeY).not.toBeNull();
  expect(groundTopY).not.toBeNull();
  expect(groundTopY! - lowestShoeY! - 1).toBeLessThanOrEqual(1);
});

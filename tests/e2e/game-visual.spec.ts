import { expect, test, type Locator, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { STAGES } from '../../src/stages/index';
import {
  measureStageDifficulty,
  validateCriticalPathClearance,
  validateDifficultyProgression
} from '../../src/stages/stageValidation';

test.describe.configure({ mode: 'serial' });

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

function isGearBitHubPixel(color: Rgb): boolean {
  return colorDistance(color, { r: 54, g: 148, b: 143 }) < 20;
}

function isWinderAccentPixel(color: Rgb): boolean {
  return colorDistance(color, { r: 94, g: 202, b: 188 }) < 20;
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

test('fits a fire-size player on every declared critical path landing', async ({ page }) => {
  await installGameCapture(page);
  await page.goto('/');
  const canvas = page.locator('canvas');
  await startGameAndWaitForPlayer(page, canvas);

  for (let stageIndex = 0; stageIndex < STAGES.length; stageIndex++) {
    const stage = STAGES[stageIndex];
    await page.evaluate((index) => {
      const scene = (window as any).__capturedGame?.scene.getScene('GameScene') as any;
      scene.scene.restart({ stageIndex: index, lives: scene.lives, playerState: 'fire' });
    }, stageIndex);
    await page.waitForFunction((index) => {
      const scene = (window as any).__capturedGame?.scene.getScene('GameScene') as any;
      return scene?.stageIndex === index && scene?.playerState === 'fire' && Boolean(scene.player?.body);
    }, stageIndex);

    for (const segment of stage.criticalPath) {
      const landing = await page.evaluate(({ fromCol, toCol, supportRow }) => {
        const scene = (window as any).__capturedGame?.scene.getScene('GameScene') as any;
        const x = ((fromCol + toCol) / 2 + 0.5) * 32;
        const floorTop = supportRow * 32;
        scene.player.body.reset(x, floorTop - scene.player.displayHeight / 2);
        scene.player.setVelocity(0, 0);
        return {
          top: scene.player.body.top,
          floorTop,
          height: scene.player.body.height,
          displayHeight: scene.player.displayHeight
        };
      }, segment);

      expect(landing.displayHeight, `${stage.id} ${segment.fromCol}-${segment.toCol}`).toBe(84);
      expect(landing.height, `${stage.id} ${segment.fromCol}-${segment.toCol}`).toBe(84);
      expect(landing.top, `${stage.id} ${segment.fromCol}-${segment.toCol}`).toBeGreaterThanOrEqual(
        (segment.supportRow - 3) * 32
      );
    }
  }
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
  expect(backgroundPixels).toBeGreaterThanOrEqual(8_000);

  const groundPixels = countPixels(
    png,
    { x1: 0, y1: 480, x2: 420, y2: 512 },
    isGroundPixel
  );
  expect(groundPixels).toBeGreaterThan(150);

  const gearBitHubPixels = countPixels(
    png,
    { x1: 120, y1: 465, x2: 360, y2: 512 },
    isGearBitHubPixel
  );
  expect(gearBitHubPixels).toBeGreaterThan(10);

  const winderAccentPixels = countPixels(
    png,
    { x1: 650, y1: 400, x2: 800, y2: 500 },
    isWinderAccentPixel
  );
  expect(winderAccentPixels).toBeGreaterThan(20);

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

test('collects clockwork abilities, fires a pulse bolt, and reaches the beacon through gameplay wiring', async ({ page }) => {
  await installGameCapture(page);
  await page.goto('/');
  const canvas = page.locator('canvas');
  await startGameAndWaitForPlayer(page, canvas);
  await page.evaluate(() => {
    const scene = (window as any).__capturedGame?.scene.getScene('GameScene') as any;
    scene.scene.restart({ stageIndex: 1, lives: scene.lives, playerState: 'small' });
  });
  await page.waitForFunction(() => {
    const scene = (window as any).__capturedGame?.scene.getScene('GameScene') as any;
    return scene?.stageIndex === 1 && Boolean(scene.player?.body);
  });

  async function overlapFirstPickup(groupName: string): Promise<void> {
    await page.evaluate((targetGroupName) => {
      const scene = (window as any).__capturedGame?.scene.getScene('GameScene') as any;
      const pickup = scene?.[targetGroupName]?.getChildren().find((child: any) => child.active);
      if (!pickup) throw new Error(`${targetGroupName} pickup is not available in stage`);
      scene.player.body.reset(pickup.x, pickup.y);
      scene.player.setVelocity(0, 0);
    }, groupName);
  }

  await overlapFirstPickup('springCoils');
  await page.waitForFunction(() => (window as any).__capturedGame?.scene.getScene('GameScene')?.playerState === 'big');

  await overlapFirstPickup('pulseCores');
  await page.waitForFunction(() => (window as any).__capturedGame?.scene.getScene('GameScene')?.playerState === 'fire');
  await page.evaluate(() => {
    const scene = (window as any).__capturedGame?.scene.getScene('GameScene') as any;
    scene.player.body.reset(320, 120);
    scene.player.setVelocity(0, 0);
  });
  await canvas.click();
  await page.keyboard.down('KeyZ');
  await page.waitForFunction(() => {
    const scene = (window as any).__capturedGame?.scene.getScene('GameScene') as any;
    return scene?.children.list.some((child: any) => child.active && child.texture?.key === 'pulse_bolt');
  });
  await page.keyboard.up('KeyZ');

  await overlapFirstPickup('chronoCrystals');
  await page.waitForFunction(() => (window as any).__capturedGame?.scene.getScene('GameScene')?.isChronoShielded === true);

  await page.evaluate(() => {
    const scene = (window as any).__capturedGame?.scene.getScene('GameScene') as any;
    const beacon = scene.children.list.find((child: any) => child.texture?.key === 'beacon');
    if (!beacon) throw new Error('beacon sprite is not available in stage');
    scene.player.body.reset(beacon.x, beacon.y);
    scene.player.setVelocity(0, 0);
  });
  await page.waitForFunction(() => (window as any).__capturedGame?.scene.getScene('GameScene')?.isCleared === true);
  await page.waitForFunction(() => {
    const scene = (window as any).__capturedGame?.scene.getScene('GameScene') as any;
    return scene?.stageIndex === 2 && Boolean(scene.player?.body);
  });
});

test('preserves fire movement through each stage transition and reaches all clear', async ({ page }) => {
  await installGameCapture(page);
  await page.goto('/');
  const canvas = page.locator('canvas');
  await startGameAndWaitForPlayer(page, canvas);

  await page.evaluate(() => {
    const scene = (window as any).__capturedGame?.scene.getScene('GameScene') as any;
    const pulseCore = scene.pulseCores.getChildren().find((child: any) => child.active);
    if (!pulseCore) throw new Error('Stage 01 pulse core is not available');
    scene.player.body.reset(pulseCore.x, pulseCore.y);
    scene.player.setVelocity(0, 0);
  });
  await page.waitForFunction(() => (window as any).__capturedGame?.scene.getScene('GameScene')?.playerState === 'fire');

  async function enterNextStage(expectedIndex: number): Promise<void> {
    await page.evaluate(() => {
      const scene = (window as any).__capturedGame?.scene.getScene('GameScene') as any;
      const beacon = scene.children.list.find((child: any) => child.texture?.key === 'beacon');
      if (!beacon) throw new Error('beacon sprite is not available');
      scene.player.body.reset(beacon.x, beacon.y);
      scene.player.setVelocity(0, 0);
    });
    await page.waitForFunction((index) => {
      const scene = (window as any).__capturedGame?.scene.getScene('GameScene') as any;
      return scene?.stageIndex === index && scene?.playerState === 'fire' && Boolean(scene.player?.body);
    }, expectedIndex);

    const beforeMove = await page.evaluate(() => {
      const scene = (window as any).__capturedGame?.scene.getScene('GameScene') as any;
      const body = scene.player.body;
      const overlapsGround = scene.groundMask.some((row: boolean[], rowIndex: number) =>
        row.some((blocked: boolean, colIndex: number) => {
          if (!blocked) return false;
          const left = colIndex * 32;
          const top = rowIndex * 32;
          return (
            body.left < left + 32 &&
            body.right > left &&
            body.top < top + 32 &&
            body.bottom > top
          );
        })
      );
      return {
        x: scene.player.x,
        overlapsGround
      };
    });
    expect(beforeMove.overlapsGround, `stage ${expectedIndex + 1} spawn overlaps ground`).toBe(false);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(250);
    await page.keyboard.up('ArrowRight');
    const afterX = await page.evaluate(
      () => (window as any).__capturedGame?.scene.getScene('GameScene')?.player.x as number
    );
    expect(afterX, `stage ${expectedIndex + 1} spawn should allow movement`).toBeGreaterThan(beforeMove.x);
  }

  await enterNextStage(1);
  await enterNextStage(2);

  await page.evaluate(() => {
    const scene = (window as any).__capturedGame?.scene.getScene('GameScene') as any;
    const beacon = scene.children.list.find((child: any) => child.texture?.key === 'beacon');
    if (!beacon) throw new Error('final beacon sprite is not available');
    scene.player.body.reset(beacon.x, beacon.y);
    scene.player.setVelocity(0, 0);
  });
  await page.waitForFunction(
    () => (window as any).__capturedGame?.scene.isActive('TitleScene'),
    undefined,
    { timeout: 10_000 }
  );
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

test('keeps upgraded player feet visually grounded', async ({ page }) => {
  await installGameCapture(page);

  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveCount(1);
  await startGameAndWaitForPlayer(page, canvas);

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

  const downgradedState = await page.evaluate(() => {
    const game = (window as any).__capturedGame;
    const scene = game?.scene.getScene('GameScene') as any;
    if (!scene) throw new Error('GameScene is not available');
    const beforeBottom = scene.player.body.bottom;
    scene.applyPlayerState('small');
    scene.player.setVelocity(0, 0);
    const body = scene.player.body;
    return {
      beforeBottom,
      displayHeight: scene.player.displayHeight,
      bodyHeight: body.height,
      bodyBottom: body.bottom,
      visualBottom: scene.player.y + scene.player.displayHeight * (1 - scene.player.originY)
    };
  });

  expect(downgradedState.displayHeight).toBe(56);
  expect(downgradedState.bodyHeight).toBe(56);
  expect(Math.abs(downgradedState.bodyBottom - downgradedState.beforeBottom)).toBeLessThanOrEqual(1);
  expect(Math.abs(downgradedState.bodyBottom - downgradedState.visualBottom)).toBeLessThanOrEqual(1);

  await page.waitForTimeout(300);
  const downgradedScreenshot = await canvas.screenshot();
  const downgradedPng = PNG.sync.read(downgradedScreenshot);
  const downgradedPlayerBounds = { x1: 45, y1: 430, x2: 120, y2: 520 };
  const downgradedLowestShoeY = findLowestPixelY(downgradedPng, downgradedPlayerBounds, isPlayerShoePixel);
  const downgradedGroundTopY = findFirstRowY(
    downgradedPng,
    { x1: downgradedPlayerBounds.x1, y1: 500, x2: downgradedPlayerBounds.x2, y2: 520 },
    12,
    isGroundSurfacePixel
  );

  expect(downgradedLowestShoeY).not.toBeNull();
  expect(downgradedGroundTopY).not.toBeNull();
  expect(downgradedGroundTopY! - downgradedLowestShoeY! - 1).toBeLessThanOrEqual(1);

  const damagedState = await page.evaluate(() => {
    const game = (window as any).__capturedGame;
    const scene = game?.scene.getScene('GameScene') as any;
    if (!scene) throw new Error('GameScene is not available');

    scene.applyPlayerState('big');
    scene.player.setVelocity(0, 0);
    const expectedGroundBottom = scene.player.body.bottom;
    scene.player.setY(scene.player.y + 32);
    scene.player.body.updateFromGameObject();
    const embeddedBottom = scene.player.body.bottom;

    scene.handleMiss('enemy');
    const body = scene.player.body;
    return {
      expectedGroundBottom,
      embeddedBottom,
      playerState: scene.playerState,
      displayHeight: scene.player.displayHeight,
      bodyHeight: body.height,
      bodyBottom: body.bottom,
      velocityY: body.velocity.y,
      visualBottom: scene.player.y + scene.player.displayHeight * (1 - scene.player.originY)
    };
  });

  expect(damagedState.embeddedBottom - damagedState.expectedGroundBottom).toBeGreaterThanOrEqual(31);
  expect(damagedState.playerState).toBe('small');
  expect(damagedState.displayHeight).toBe(56);
  expect(damagedState.bodyHeight).toBe(56);
  expect(Math.abs(damagedState.bodyBottom - damagedState.expectedGroundBottom)).toBeLessThanOrEqual(1);
  expect(Math.abs(damagedState.bodyBottom - damagedState.visualBottom)).toBeLessThanOrEqual(1);
  expect(damagedState.velocityY).toBe(0);
});

import type { StageDefinition } from './stage01';

export const MAX_PLAYER_CLEARANCE_TILES = 3;
export const MAX_PLAYER_SPAWN_SIDE_CLEARANCE_TILES = 1;

export interface StageDifficultyMetrics {
  readonly enemyCount: number;
  readonly groundGapCount: number;
  readonly elevatedSegmentCount: number;
  readonly difficultyScore: number;
}

function countTiles(stage: StageDefinition, tile: string): number {
  return stage.tiles.reduce(
    (count, row) => count + [...row].filter((value) => value === tile).length,
    0
  );
}

function primarySupportRow(stage: StageDefinition): number {
  return Math.max(...stage.criticalPath.map((segment) => segment.supportRow));
}

function countGroundGaps(stage: StageDefinition, supportRow: number): number {
  const row = stage.tiles[supportRow];
  let gapCount = 0;
  let inWalkableGround = false;
  let inGap = false;

  for (const tile of row) {
    if (tile === '#') {
      if (inGap && inWalkableGround) gapCount++;
      inWalkableGround = true;
      inGap = false;
    } else if (inWalkableGround) {
      inGap = true;
    }
  }
  return gapCount;
}

function countElevatedSurfaceSegments(stage: StageDefinition, supportRow: number): number {
  let total = 0;

  for (let row = 0; row < supportRow; row++) {
    let inSurface = false;
    for (let col = 0; col < stage.cols; col++) {
      const isSurface = stage.tiles[row].charAt(col) === '#'
        && (row === 0 || stage.tiles[row - 1].charAt(col) !== '#');
      if (isSurface && !inSurface) total++;
      inSurface = isSurface;
    }
  }
  return total;
}

export function validateCriticalPathClearance(stage: StageDefinition): string[] {
  const errors: string[] = [];

  if (stage.criticalPath.length === 0) {
    return [`${stage.id}: criticalPath must not be empty`];
  }

  for (const segment of stage.criticalPath) {
    if (
      segment.fromCol < 0
      || segment.toCol >= stage.cols
      || segment.supportRow < 0
      || segment.supportRow >= stage.rows
      || segment.fromCol > segment.toCol
    ) {
      errors.push(`${stage.id}: invalid criticalPath segment ${segment.fromCol}-${segment.toCol}@${segment.supportRow}`);
      continue;
    }

    for (let col = segment.fromCol; col <= segment.toCol; col++) {
      if (stage.tiles[segment.supportRow].charAt(col) !== '#') {
        errors.push(`${stage.id}: criticalPath has no support at row ${segment.supportRow} col ${col}`);
        continue;
      }

      for (let clearance = 1; clearance <= MAX_PLAYER_CLEARANCE_TILES; clearance++) {
        const row = segment.supportRow - clearance;
        if (row >= 0 && stage.tiles[row].charAt(col) === '#') {
          errors.push(`${stage.id}: blocked clearance at row ${row} col ${col}`);
        }
      }
    }
  }

  for (let row = 0; row < stage.rows; row++) {
    const spawnCol = stage.tiles[row].indexOf('P');
    if (spawnCol === -1) continue;
    for (let offset = -MAX_PLAYER_SPAWN_SIDE_CLEARANCE_TILES; offset <= MAX_PLAYER_SPAWN_SIDE_CLEARANCE_TILES; offset++) {
      if (stage.tiles[row].charAt(spawnCol + offset) === '#') {
        errors.push(`${stage.id}: blocked spawn side clearance at row ${row} col ${spawnCol + offset}`);
      }
    }
  }

  return errors;
}

export function measureStageDifficulty(stage: StageDefinition): StageDifficultyMetrics {
  const baseRow = primarySupportRow(stage);
  const enemyCount = countTiles(stage, 'E');
  const groundGapCount = countGroundGaps(stage, baseRow);
  const elevatedSegmentCount = countElevatedSurfaceSegments(stage, baseRow);
  return {
    enemyCount,
    groundGapCount,
    elevatedSegmentCount,
    difficultyScore: enemyCount + groundGapCount * 2 + elevatedSegmentCount * 2
  };
}

export function validateDifficultyProgression(stages: readonly StageDefinition[]): string[] {
  const errors: string[] = [];
  const metrics = stages.map((stage) => measureStageDifficulty(stage));
  const expectedRoles: ReadonlyArray<StageDefinition['difficulty']['role']> = ['intro', 'intermediate', 'final'];

  stages.forEach((stage, index) => {
    if (stage.difficulty.role !== expectedRoles[index]) {
      errors.push(`${stage.id}: expected difficulty role ${expectedRoles[index]}, got ${stage.difficulty.role}`);
    }
    if (metrics[index].difficultyScore < stage.difficulty.minimumScore) {
      errors.push(
        `${stage.id}: difficulty score ${metrics[index].difficultyScore} is below target ${stage.difficulty.minimumScore}`
      );
    }
  });

  for (let index = 1; index < stages.length; index++) {
    const previous = metrics[index - 1];
    const current = metrics[index];
    if (previous.difficultyScore >= current.difficultyScore) {
      errors.push(`${stages[index].id}: difficulty score must increase after ${stages[index - 1].id}`);
    }
    if (previous.groundGapCount > current.groundGapCount) {
      errors.push(`${stages[index].id}: ground gap count must not decrease`);
    }
    if (previous.elevatedSegmentCount > current.elevatedSegmentCount) {
      errors.push(`${stages[index].id}: elevated segment count must not decrease`);
    }
  }

  return errors;
}

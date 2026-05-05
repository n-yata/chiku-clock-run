import { STAGE_01 } from './stage01';
import { STAGE_02 } from './stage02';
import { STAGE_03 } from './stage03';
import type { StageDefinition } from './stage01';

export const STAGES: ReadonlyArray<StageDefinition> = [
  STAGE_01,
  STAGE_02,
  STAGE_03
] as const;

export function getStage(index: number): { stage: StageDefinition; index: number } {
  if (!Number.isInteger(index) || index < 0 || index >= STAGES.length) {
    console.warn(`getStage: invalid index ${index}, falling back to 0`);
    return { stage: STAGES[0], index: 0 };
  }
  return { stage: STAGES[index], index };
}

export function nextStageIndex(current: number): number | null {
  const next = current + 1;
  return next < STAGES.length ? next : null;
}

export type { StageDefinition } from './stage01';

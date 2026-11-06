import type { PlayerDifficulty } from './difficulty';

export type EndlessDifficulty = PlayerDifficulty;
const levels: EndlessDifficulty[] = ['Easy', 'Medium', 'Hard'];

export function difficultyForSolvedCount(solved: number): EndlessDifficulty {
  return levels[Math.min(2, Math.floor(Math.max(0, solved) / 3))];
}

export function endlessPuzzlePoints(attempts: number, hints: number): number {
  const base = [100, 70, 40][Math.min(2, Math.max(0, attempts - 1))];
  return Math.max(0, base - hints * 10);
}

import authored from './puzzles.json';
import type { AuthoredPuzzle } from './puzzleTypes';

export const puzzles = authored.puzzles as AuthoredPuzzle[];
export const byId = new Map(puzzles.map((puzzle) => [puzzle.id, puzzle]));

const dailyMix = { Easy: 2, Medium: 1, Hard: 1, Expert: 1 } as const;
type DailyLevel = keyof typeof dailyMix;

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}

export function hasDailyComposition(ids: string[]): boolean {
  if (ids.length !== 5) return false;
  const counts: Record<DailyLevel, number> = { Easy: 0, Medium: 0, Hard: 0, Expert: 0 };
  for (const id of ids) {
    const puzzle = byId.get(id);
    if (!puzzle || !(puzzle.difficulty in counts)) return false;
    counts[puzzle.difficulty as DailyLevel] += 1;
  }
  return (Object.keys(dailyMix) as DailyLevel[]).every((level) => counts[level] === dailyMix[level]);
}

export function dailyIds(date: string): string[] {
  const selected: AuthoredPuzzle[] = [];
  for (const level of Object.keys(dailyMix) as DailyLevel[]) {
    const pool = puzzles
      .filter((puzzle) => puzzle.difficulty === level)
      .sort((left, right) => hash(date + ':' + left.id) - hash(date + ':' + right.id));
    if (pool.length < dailyMix[level]) {
      throw new Error('Daily puzzle bank needs ' + dailyMix[level] + ' ' + level + ' puzzles; found ' + pool.length + '.');
    }
    selected.push(...pool.slice(0, dailyMix[level]));
  }
  return selected.map((puzzle) => puzzle.id);
}

export function isCurrentDailyIds(date: string, ids: string[]): boolean {
  const expected = dailyIds(date);
  return hasDailyComposition(ids) && ids.every((id, index) => id === expected[index]);
}

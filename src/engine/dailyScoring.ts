import type { Result } from '../types';

const pointsByHint = [100, 70, 40, 10];

export function dailyPuzzlePoints(attempts: number, hints: number): number {
  const base = pointsByHint[Math.min(3, Math.max(0, hints))];
  const extraAttempts = Math.max(0, attempts - 1);
  return Math.max(10, base - extraAttempts * 10);
}

export function dailyScore(results: Result[]): number {
  return results.reduce((total, result) => total + result.points, 0);
}

export function repriceDailyResults(results: Result[]): Result[] {
  return results.map((result) => ({
    ...result,
    points: result.solved ? dailyPuzzlePoints(result.attempts, result.hints) : 0,
  }));
}

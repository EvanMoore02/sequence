import type { Result } from '../types';

const pointsByAttempt = [100, 70, 40];

export function dailyPuzzlePoints(attempts: number, hints: number): number {
  const base = pointsByAttempt[Math.min(2, Math.max(0, attempts - 1))];
  return Math.max(0, base - Math.max(0, hints) * 10);
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

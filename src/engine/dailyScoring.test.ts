import { describe, expect, it } from 'vitest';
import type { Result } from '../types';
import { dailyPuzzlePoints, dailyScore, repriceDailyResults } from './dailyScoring';

describe('Daily Challenge scoring', () => {
  it('awards 100, 70, or 40 points by attempt and subtracts hint penalties', () => {
    expect(dailyPuzzlePoints(1, 0)).toBe(100);
    expect(dailyPuzzlePoints(2, 0)).toBe(70);
    expect(dailyPuzzlePoints(3, 0)).toBe(40);
    expect(dailyPuzzlePoints(1, 2)).toBe(80);
    expect(dailyPuzzlePoints(1, 20)).toBe(0);
  });

  it('makes the daily score exactly the sum of puzzle points with no completion bonuses', () => {
    const results: Result[] = [
      { puzzleId: 'one', attempts: 1, hints: 0, solved: true, points: 100 },
      { puzzleId: 'two', attempts: 2, hints: 0, solved: true, points: 70 },
      { puzzleId: 'three', attempts: 1, hints: 0, solved: true, points: 100 },
      { puzzleId: 'four', attempts: 1, hints: 0, solved: true, points: 100 },
      { puzzleId: 'five', attempts: 1, hints: 0, solved: true, points: 100 },
    ];
    expect(dailyScore(results)).toBe(470);
    expect(dailyScore(results.map((result) => ({ ...result, points: 100 })))).toBe(500);
    const legacyResults = repriceDailyResults(results.map((result) => ({
      ...result,
      points: result.attempts === 1 ? 100 : 70,
    })));
    expect(legacyResults.map((result) => result.points)).toEqual([100, 70, 100, 100, 100]);
    expect(dailyScore(legacyResults)).toBe(470);
  });
});

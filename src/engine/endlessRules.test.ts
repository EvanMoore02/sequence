import { describe, expect, it } from 'vitest';
import { difficultyForSolvedCount, endlessPuzzlePoints } from './endlessRules';

describe('Endless rules', () => {
  it('raises difficulty after each three successful puzzles and caps at Hard', () => {
    expect([0, 1, 2, 3, 5, 6, 8, 9, 50].map(difficultyForSolvedCount)).toEqual([
      'Easy', 'Easy', 'Easy', 'Medium', 'Medium', 'Hard', 'Hard', 'Hard', 'Hard',
    ]);
  });

  it('awards points based only on guesses and hints', () => {
    expect(endlessPuzzlePoints(1, 0)).toBe(100);
    expect(endlessPuzzlePoints(2, 0)).toBe(70);
    expect(endlessPuzzlePoints(3, 0)).toBe(40);
    expect(endlessPuzzlePoints(3, 2)).toBe(20);
    expect(endlessPuzzlePoints(1, 10)).toBe(0);
  });
});

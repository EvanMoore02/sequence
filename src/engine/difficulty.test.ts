import { describe, expect, it } from 'vitest';
import bank from '../data/puzzles.json';
import type { AuthoredPuzzle } from '../data/puzzleTypes';
import { rateDifficulty } from './difficulty';

const authored = (bank as unknown as { puzzles: AuthoredPuzzle[] }).puzzles;

describe('difficulty rating', () => {
  it('keeps every authored puzzle label in sync with its rated sequence', () => {
    for (const puzzle of authored) {
      expect(rateDifficulty(puzzle.sequence, puzzle.answer, puzzle.pattern).difficulty, puzzle.id).toBe(puzzle.difficulty);
    }
  });

  it('accounts for visible terms, large values, negative values, and rule overlap', () => {
    const fourTerms = rateDifficulty([2, 4, 6, 8], 10, { type: 'arithmetic', step: 2 });
    const fiveTerms = rateDifficulty([2, 4, 6, 8, 10], 12, { type: 'arithmetic', step: 2 });
    expect(fourTerms.score).toBe(fiveTerms.score + 1);

    const large = rateDifficulty([200, 400, 600, 800], 1000, { type: 'arithmetic', step: 200 });
    expect(large.score).toBeGreaterThan(fourTerms.score);

    const negative = rateDifficulty([-2, -4, -6, -8], -10, { type: 'arithmetic', step: -2 });
    expect(negative.score).toBeGreaterThan(fourTerms.score);

    const squares = rateDifficulty([1, 4, 9, 16, 25], 36, { type: 'increasing-difference', firstDifference: 3, growth: 2 });
    expect(squares.score).toBeGreaterThan(4);
  });
});

import { describe, expect, it } from 'vitest';
import type { Puzzle } from '../types';
import { missingTermIndices, missingTerms, parseMissingAnswers } from './missingTerms';

function puzzle(difficulty: Puzzle['difficulty']): Puzzle {
  return {
    id: 'sample-' + difficulty,
    category: 'Sample',
    difficulty,
    sequence: [2, 5, 9, 14, 20],
    answer: 27,
    rule: 'Increasing differences',
    explanation: 'Add the next number.',
    hints: ['Look at gaps.', 'Gaps grow.', 'Add seven.'],
  };
}

describe('multi-blank puzzles', () => {
  it('hides only the continuation at every difficulty', () => {
    expect(missingTerms(puzzle('Medium'))).toHaveLength(1);
    expect(missingTerms(puzzle('Hard'))).toHaveLength(1);
    expect(missingTerms(puzzle('Expert'))).toHaveLength(1);
    for (const difficulty of ['Medium', 'Hard', 'Expert'] as const) {
      const current = puzzle(difficulty);
      const indices = missingTermIndices(current);
      expect(indices.at(-1)).toBe(current.sequence.length);
      expect(indices).not.toContain(0);
      expect(missingTermIndices(current)).toEqual(indices);
    }
  });

  it('parses ordered comma or space separated safe integers', () => {
    expect(parseMissingAnswers('-12, 40 7', 3)).toEqual([-12, 40, 7]);
    expect(parseMissingAnswers('1, 2', 1)).toBeNull();
    expect(parseMissingAnswers('1, nope', 2)).toBeNull();
    expect(parseMissingAnswers('9007199254740992', 1)).toBeNull();
  });
});

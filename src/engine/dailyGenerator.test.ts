import { describe, expect, it } from 'vitest';
import type { AuthoredPuzzle } from '../data/puzzleTypes';
import type { Puzzle } from '../types';
import { rateDifficulty } from './difficulty';
import { dailyIds, dailyPuzzles, hasDailyComposition } from './dailyGenerator';

type DailyPuzzle = AuthoredPuzzle | (Puzzle & { pattern: AuthoredPuzzle['pattern']; difficultyScore: number });

function deriveTerms(puzzle: DailyPuzzle): number[] {
  const { sequence, pattern } = puzzle;
  const count = sequence.length + 1;
  switch (pattern.type) {
    case 'arithmetic':
      return Array.from({ length: count }, (_, index) => sequence[0] + index * pattern.step);
    case 'geometric':
      return Array.from({ length: count }, (_, index) => sequence[0] * pattern.factor ** index);
    case 'power':
      return Array.from({ length: count }, (_, index) => (pattern.start + index) ** pattern.exponent);
    case 'fibonacci': {
      const terms = sequence.slice(0, 2);
      while (terms.length < count) terms.push(terms.at(-1)! + terms.at(-2)!);
      return terms;
    }
    case 'alternating':
      return Array.from({ length: count }, (_, index) => index % 2 === 0
        ? sequence[0] + (index / 2) * pattern.oddStep
        : sequence[1] + ((index - 1) / 2) * pattern.evenStep);
    case 'increasing-difference': {
      const terms = [sequence[0]];
      let difference = pattern.firstDifference;
      while (terms.length < count) {
        terms.push(terms.at(-1)! + difference);
        difference += pattern.growth;
      }
      return terms;
    }
    case 'doubling-difference': {
      const terms = [sequence[0]];
      let difference = pattern.firstDifference;
      while (terms.length < count) {
        terms.push(terms.at(-1)! + difference);
        difference *= 2;
      }
      return terms;
    }
    case 'multiply-adjust': {
      const terms = [sequence[0]];
      while (terms.length < count) terms.push(terms.at(-1)! * pattern.factor + pattern.offset);
      return terms;
    }
    case 'factorial': {
      const factorial = (value: number) => {
        let result = 1;
        for (let factor = 2; factor <= value; factor += 1) result *= factor;
        return result;
      };
      return Array.from({ length: count }, (_, index) => factorial(pattern.start + index));
    }
    case 'prime': {
      const isPrime = (value: number) => { if (value < 2) return false; for (let divisor = 2; divisor * divisor <= value; divisor += 1) if (value % divisor === 0) return false; return true; };
      const terms = [pattern.start];
      while (terms.length < count) { let next = terms.at(-1)! + 1; while (!isPrime(next)) next += 1; terms.push(next); }
      return terms;
    }
    case 'triangular':
      return Array.from({ length: count }, (_, index) => (pattern.start + index) * (pattern.start + index + 1) / 2);
    case 'look-and-say': {
      const terms: number[] = [pattern.start];
      while (terms.length < count) {
        const text = String(terms.at(-1)!); let result = '';
        for (let index = 0; index < text.length;) { let end = index + 1; while (end < text.length && text[end] === text[index]) end += 1; result += String(end - index) + text[index]; index = end; }
        terms.push(Number(result));
      }
      return terms;
    }
    case 'alternating-operation': {
      const terms = [sequence[0]];
      while (terms.length < count) { const index = terms.length - 1; terms.push(terms.at(-1)! * (index % 2 === 0 ? pattern.factorA : pattern.factorB) + (index % 2 === 0 ? pattern.offsetA : pattern.offsetB)); }
      return terms;
    }
    case 'quadratic':
      return Array.from({ length: count }, (_, index) => pattern.a * (pattern.start + index) ** 2 + pattern.b * (pattern.start + index) + pattern.c);
    case 'weighted-recurrence': {
      const terms = sequence.slice(0, 2);
      while (terms.length < count) terms.push(terms.at(-1)! * pattern.factor + terms.at(-2)! + pattern.offset);
      return terms;
    }
  }
}

function checkPuzzle(puzzle: DailyPuzzle) {
  expect(puzzle.pattern.type).not.toBe('alternating');
  expect(puzzle.pattern.type).not.toBe('alternating-operation');
  expect(deriveTerms(puzzle)).toEqual([...puzzle.sequence, puzzle.answer]);
  expect([...puzzle.sequence, puzzle.answer].every(Number.isSafeInteger)).toBe(true);
  expect([...puzzle.sequence, puzzle.answer].every((value) => Math.abs(value) <= 1_000_000)).toBe(true);
  expect(puzzle.hints).toHaveLength(3);
  expect(puzzle.hints.every((hint) => hint.trim().length >= 4)).toBe(true);
  expect(new Set(puzzle.hints.map((hint) => hint.trim().toLowerCase())).size).toBe(3);
  expect(puzzle.rule.trim().length).toBeGreaterThan(2);
  expect(puzzle.explanation.split(/[^0-9-]+/).includes(String(puzzle.answer)), puzzle.id + ': ' + puzzle.explanation + ' (answer ' + puzzle.answer + ')').toBe(true);
  if ('difficultyScore' in puzzle) {
    expect(rateDifficulty(puzzle.sequence, puzzle.answer, puzzle.pattern)).toEqual({
      score: puzzle.difficultyScore,
      difficulty: puzzle.difficulty,
    });
  }
}

function dateOffset(date: string, days: number): string {
  const value = new Date(date + 'T00:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

describe('generated Daily Challenge', () => {
  it('keeps the required difficulty order and returns the same lineup for a date', () => {
    const date = '2026-11-03';
    const first = dailyPuzzles(date);
    const second = dailyPuzzles(date);
    expect(first.map((puzzle) => puzzle.difficulty)).toEqual(['Medium', 'Hard', 'Hard', 'Expert', 'Expert']);
    expect(dailyIds(date)).toEqual(first.map((puzzle) => puzzle.id));
    expect(second.map((puzzle) => puzzle.id)).toEqual(first.map((puzzle) => puzzle.id));
    expect(hasDailyComposition(dailyIds(date))).toBe(true);
  });

  it('derives every displayed answer from its declared rule and provides usable clues', () => {
    for (let day = 0; day < 400; day += 1) {
      for (const puzzle of dailyPuzzles(dateOffset('2026-11-02', day))) checkPuzzle(puzzle);
    }
  });

  it('shares no puzzle IDs between adjacent days across leap and daylight-saving dates', () => {
    const signature = (puzzle: DailyPuzzle) => JSON.stringify([puzzle.sequence, puzzle.answer]);
    let previousIds = new Set(dailyIds('2026-11-01'));
    let previousSignatures = new Set(dailyPuzzles('2026-11-01').map(signature));
    for (let day = 0; day < 3653; day += 1) {
      const date = dateOffset('2026-11-02', day);
      const current = dailyPuzzles(date);
      const currentIds = current.map((puzzle) => puzzle.id);
      const currentSignatures = current.map(signature);
      expect(currentIds).toHaveLength(5);
      expect(new Set(currentIds).size).toBe(5);
      expect(new Set(currentSignatures).size).toBe(5);
      expect(currentIds.filter((id) => previousIds.has(id))).toEqual([]);
      expect(currentSignatures.filter((value) => previousSignatures.has(value))).toEqual([]);
      previousIds = new Set(currentIds);
      previousSignatures = new Set(currentSignatures);
    }
  });
});

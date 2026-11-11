import { describe, expect, it, vi } from 'vitest';
import type { AuthoredPuzzle } from '../data/puzzleTypes';
import type { Puzzle } from '../types';
import { rateDifficulty } from './difficulty';
import { dailyIds, dailyPuzzles, hasDailyComposition, isWithinDailyCooldown } from './dailyGenerator';

type DailyPuzzle = AuthoredPuzzle | (Puzzle & { pattern: AuthoredPuzzle['pattern']; difficultyScore: number });

function deriveTerms(puzzle: DailyPuzzle): number[] {
  const { sequence, pattern } = puzzle;
  if (puzzle.taskFormat === 'find-odd-term') return [...(puzzle.displaySequence ?? sequence)];
  const observed = [...sequence];
  if (puzzle.answerIndex !== undefined) observed.splice(puzzle.answerIndex, 0, puzzle.answer);
  const count = sequence.length + 1;
  switch (pattern.type) {
    case 'arithmetic':
      return Array.from({ length: count }, (_, index) => observed[0] + index * pattern.step);
    case 'geometric':
      return Array.from({ length: count }, (_, index) => sequence[0] * pattern.factor ** index);
    case 'power':
      return Array.from({ length: count }, (_, index) => (pattern.start + index) ** pattern.exponent);
    case 'fibonacci': {
      const terms = sequence.slice(0, 2);
      while (terms.length < count) terms.push(terms.at(-1)! + terms.at(-2)!);
      return terms;
    }
    case 'alternating': {
      if (puzzle.id.startsWith('alternating-steps:')) {
        const terms = [sequence[0]];
        while (terms.length < count) { const index = terms.length - 1; terms.push(terms.at(-1)! + (index % 2 === 0 ? pattern.oddStep : pattern.evenStep)); }
        return terms;
      }
      return Array.from({ length: count }, (_, index) => index % 2 === 0
        ? sequence[0] + (index / 2) * pattern.oddStep
        : sequence[1] + ((index - 1) / 2) * pattern.evenStep);
    }
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
    case 'weighted-recurrence': {
      const terms = sequence.slice(0, 2);
      while (terms.length < count) terms.push(terms.at(-1)! * pattern.factor + terms.at(-2)! + pattern.offset);
      return terms;
    }
    case 'reverse-add': {
      const terms = [sequence[0]];
      while (terms.length < count) terms.push(terms.at(-1)! + Number(String(terms.at(-1)!).split('').reverse().join('')));
      return terms;
    }
    case 'collatz': {
      const terms = [pattern.start];
      while (terms.length < count) { const previous = terms.at(-1)!; terms.push(previous % 2 === 0 ? previous / 2 : previous * 3 + 1); }
      return terms;
    }
    case 'prime-gaps': {
      const terms = [pattern.start]; let gap = pattern.firstGap;
      while (terms.length < count) { terms.push(terms.at(-1)! + gap); gap += pattern.growth; }
      return terms;
    }
    case 'shape-cycle':
      return Array.from({ length: count }, (_, index) => (sequence[0] + index * pattern.step) % 8);
    case 'visual-matrix':
      return [...sequence, puzzle.answer];
  }
}

function checkPuzzle(puzzle: DailyPuzzle) {
  if (puzzle.visualPattern) {
    expect(puzzle.visualPattern.cells).toHaveLength((puzzle.visualPattern.rows ?? 3) * (puzzle.visualPattern.columns ?? 3));
    expect(puzzle.visualPattern.cells[puzzle.visualPattern.missingIndex ?? 8]).toBeNull();
    expect(puzzle.visualPattern.choices).toHaveLength(8);
    expect(new Set(puzzle.visualPattern.choices.map((choice) => JSON.stringify(choice))).size).toBe(8);
    expect(puzzle.visualPattern.choices[puzzle.visualPattern.answerIndex]).toBeDefined();
  }
  if (puzzle.pattern.type === 'collatz') {
    const visibleTransitions = puzzle.sequence.slice(0, -1);
    expect(visibleTransitions.some((value) => value % 2 === 0)).toBe(true);
    expect(visibleTransitions.some((value) => value % 2 !== 0)).toBe(true);
  }
  const expectedTerms = puzzle.taskFormat === 'find-odd-term'
    ? [...(puzzle.displaySequence ?? puzzle.sequence)]
    : [...puzzle.sequence];
  if (puzzle.taskFormat !== 'find-odd-term') expectedTerms.splice(puzzle.answerIndex ?? expectedTerms.length, 0, puzzle.answer);
  expect(deriveTerms(puzzle), puzzle.id+' ('+puzzle.taskFormat+')').toEqual(expectedTerms);
  expect([...puzzle.sequence, puzzle.answer].every(Number.isSafeInteger)).toBe(true);
  expect([...puzzle.sequence, puzzle.answer].every((value) => Math.abs(value) <= 1_000_000)).toBe(true);
  expect(puzzle.hints).toHaveLength(3);
  expect(puzzle.hints.every((hint) => hint.trim().length >= 4)).toBe(true);
  expect(new Set(puzzle.hints.map((hint) => hint.trim().toLowerCase())).size).toBe(3);
  expect(puzzle.rule.trim().length).toBeGreaterThan(2);
  if (puzzle.pattern.type !== 'visual-matrix') expect(puzzle.explanation.split(/[^0-9-]+/).includes(String(puzzle.answer)), puzzle.id + ': ' + puzzle.explanation + ' (answer ' + puzzle.answer + ')').toBe(true);
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
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.map((puzzle) => puzzle.difficulty)).toEqual(['Medium', 'Hard', 'Hard', 'Expert', 'Expert']);
    expect(first!.some((puzzle) => puzzle.visualPattern)).toBe(true);
    expect(dailyIds(date)).toEqual(first!.map((puzzle) => puzzle.id));
    expect(second!.map((puzzle) => puzzle.id)).toEqual(first!.map((puzzle) => puzzle.id));
    expect(hasDailyComposition(dailyIds(date)!)).toBe(true);
  });

  it('always supplies five puzzles and a shape puzzle across the 50-day preview window', () => {
    for (let day = 0; day < 50; day += 1) {
      const lineup = dailyPuzzles(dateOffset('2026-11-02', day));
      expect(lineup, 'no lineup for preview day ' + day).not.toBeNull();
      expect(lineup).toHaveLength(5);
      expect(lineup!.map((puzzle) => puzzle.difficulty)).toEqual(['Medium', 'Hard', 'Hard', 'Expert', 'Expert']);
      expect(lineup!.at(-1)?.visualPattern).toBeDefined();
    }
  });

  it('derives every displayed answer from its declared rule and provides usable clues', () => {
    for (let day = 0; day < 400; day += 1) {
      const lineup = dailyPuzzles(dateOffset('2026-11-02', day));
      expect(lineup, 'no lineup for ' + dateOffset('2026-11-02', day)).not.toBeNull();
      for (const puzzle of lineup!) checkPuzzle(puzzle);
    }
  });

  it('never repeats an exact puzzle within any rolling 15-date window', () => {
    const signature = (puzzle: DailyPuzzle) => JSON.stringify([
      puzzle.visualPattern?.cells ?? puzzle.shapePattern?.sequence ?? puzzle.sequence,
      puzzle.visualPattern?.choices ?? puzzle.shapePattern?.choices ?? null,
      puzzle.visualPattern?.answerIndex ?? puzzle.shapePattern?.answer ?? puzzle.answer,
    ]);
    const recent: Set<string>[] = [];
    for (let day = -14; day < 0; day += 1) {
      const lineup = dailyPuzzles(dateOffset('2026-11-02', day));
      expect(lineup, 'no lineup for ' + dateOffset('2026-11-02', day)).not.toBeNull();
      recent.push(new Set(lineup!.map(signature)));
    }
    for (let day = 0; day < 3653; day += 1) {
      const date = dateOffset('2026-11-02', day);
      const current = dailyPuzzles(date);
      expect(current).not.toBeNull();
      const currentSignatures = current!.map(signature);
      expect(current).toHaveLength(5);
      expect(new Set(currentSignatures).size).toBe(5);
      const recentSignatures = new Set(recent.flatMap((signatures) => [...signatures]));
      expect(currentSignatures.filter((value) => recentSignatures.has(value))).toEqual([]);
      recent.push(new Set(currentSignatures));
      if (recent.length > 14) recent.shift();
    }
  });

  it('allows a puzzle to become eligible for reuse exactly 15 dates later', () => {
    expect(isWithinDailyCooldown(12, 26)).toBe(true);
    expect(isWithinDailyCooldown(12, 27)).toBe(false);
    expect(isWithinDailyCooldown(27, 12)).toBe(false);
  });

  it('uses different rule types from the immediately preceding Daily lineup', () => {
    const first = dailyPuzzles(dateOffset('2026-11-02', -14));
    expect(first).not.toBeNull();
    let previousPatterns = new Set(first!.map((puzzle) => puzzle.pattern.type));
    for (let day = -13; day < 400; day += 1) {
      const lineup = dailyPuzzles(dateOffset('2026-11-02', day));
      expect(lineup).not.toBeNull();
      const currentPatterns = lineup!.map((puzzle) => puzzle.pattern.type);
      expect(currentPatterns.filter((pattern) => pattern !== 'visual-matrix' && pattern !== 'shape-cycle' && previousPatterns.has(pattern))).toEqual([]);
      previousPatterns = new Set(currentPatterns);
    }
  });

  it('keeps a date lineup stable regardless of nearby-date request order', async () => {
    vi.resetModules();
    const firstGenerator = await import('./dailyGenerator');
    const futureFirst = firstGenerator.dailyIds('2026-11-20');
    const pastSecond = firstGenerator.dailyIds('2026-10-01');

    vi.resetModules();
    const secondGenerator = await import('./dailyGenerator');
    const pastFirst = secondGenerator.dailyIds('2026-10-01');
    const futureSecond = secondGenerator.dailyIds('2026-11-20');

    expect(futureFirst).not.toBeNull();
    expect(pastSecond).not.toBeNull();
    expect(pastFirst).toEqual(pastSecond);
    expect(futureSecond).toEqual(futureFirst);
  });
});

import type { AnswerPattern } from '../data/puzzleTypes';
import type { Puzzle } from '../types';

export type DifficultyRating = Puzzle['difficulty'];
export type PlayerDifficulty = 'Easy' | 'Medium' | 'Hard';
export const ratingForPlayerDifficulty: Record<PlayerDifficulty, DifficultyRating> = {
  Easy: 'Medium',
  Medium: 'Hard',
  Hard: 'Expert',
};
export function playerDifficultyForRating(rating: DifficultyRating): PlayerDifficulty {
  if (rating === 'Expert') return 'Hard';
  if (rating === 'Hard') return 'Medium';
  return 'Easy';
}

const patternComplexity: Record<AnswerPattern['type'], number> = {
  arithmetic: 0,
  geometric: 1,
  power: 1,
  fibonacci: 2,
  alternating: 3,
  'increasing-difference': 4,
  'doubling-difference': 3,
  'multiply-adjust': 3,
  factorial: 4,
  prime: 5,
  triangular: 4,
  'look-and-say': 5,
  'alternating-operation': 5,
  'weighted-recurrence': 5,
  'reverse-add': 5,
  collatz: 5,
  'prime-gaps': 5,
};

function levelFor(score: number): DifficultyRating {
  if (score <= 1) return 'Easy';
  if (score <= 3) return 'Medium';
  if (score <= 5) return 'Hard';
  return 'Expert';
}

function hasConstantDifference(values: number[]): boolean {
  const difference = values[1] - values[0];
  return values.slice(2).every((value, index) => value - values[index + 1] === difference);
}

function hasConstantIntegerRatio(values: number[]): boolean {
  if (values[0] === 0 || values[1] % values[0] !== 0) return false;
  const ratio = values[1] / values[0];
  return ratio > 1 && values.slice(2).every((value, index) => value === values[index + 1] * ratio);
}

function hasFibonacciRule(values: number[]): boolean {
  return values.slice(2).every((value, index) => value === values[index] + values[index + 1]);
}

function hasConsecutivePowers(values: number[]): boolean {
  return ([2, 3] as const).some((power) =>
    values.every((value, index) => value === (values[0] + index) ** power),
  );
}

function ambiguityPoints(values: number[], pattern: AnswerPattern): number {
  let alternatives = 0;
  if (pattern.type !== 'arithmetic' && hasConstantDifference(values)) alternatives += 1;
  if (pattern.type !== 'geometric' && hasConstantIntegerRatio(values)) alternatives += 1;
  if (pattern.type !== 'fibonacci' && hasFibonacciRule(values)) alternatives += 1;
  if (pattern.type !== 'power' && hasConsecutivePowers(values)) alternatives += 1;
  return Math.min(alternatives, 2);
}

/** A deterministic, explainable estimate of how challenging a sequence is. */
export function rateDifficulty(sequence: number[], answer: number, pattern: AnswerPattern) {
  const values = [...sequence, answer];
  let score = patternComplexity[pattern.type];

  // Fewer visible examples provide less evidence for the intended rule.
  if (sequence.length === 4) score += 1;

  if (pattern.type === 'geometric' && pattern.factor >= 3) score += 1;
  if (pattern.type === 'power' && pattern.exponent === 3) score += 1;
  if (pattern.type === 'alternating') score += 1;
  if (pattern.type === 'multiply-adjust') {
    if (pattern.factor >= 3) score += 1;
    if (pattern.offset !== 0) score += 1;
  }

  const largestMagnitude = Math.max(...values.map(Math.abs));
  if (largestMagnitude >= 1000) score += 2;
  else if (largestMagnitude >= 100) score += 1;
  if (values.some((value) => value < 0)) score += 1;

  score += ambiguityPoints(values, pattern);
  return { score, difficulty: levelFor(score) };
}

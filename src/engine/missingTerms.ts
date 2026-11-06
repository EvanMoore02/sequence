import type { Puzzle } from '../types';

type PuzzleTerms = Pick<Puzzle, 'id' | 'difficulty' | 'sequence' | 'answer'>;

export function missingTermIndices(puzzle: Pick<Puzzle, 'id' | 'difficulty' | 'sequence'>): number[] {
  return [puzzle.sequence.length];
}

export function missingTerms(puzzle: PuzzleTerms): number[] {
  const terms = [...puzzle.sequence, puzzle.answer];
  return missingTermIndices(puzzle).map((index) => terms[index]);
}

export function parseMissingAnswers(input: string, count: number): number[] | null {
  const values = input.trim().split(/[,\s]+/);
  if (values.length !== count || values.some((value) => !/^-?\d+$/.test(value))) return null;
  const numbers = values.map(Number);
  return numbers.every(Number.isSafeInteger) ? numbers : null;
}

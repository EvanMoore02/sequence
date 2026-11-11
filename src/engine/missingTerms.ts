import type { Puzzle } from '../types';

type PuzzleTerms = Pick<Puzzle, 'id' | 'difficulty' | 'sequence' | 'answer' | 'answerIndex' | 'taskFormat'>;

export function missingTermIndices(puzzle: Pick<Puzzle, 'id' | 'difficulty' | 'sequence' | 'answerIndex'>): number[] {
  return [puzzle.answerIndex ?? puzzle.sequence.length];
}

export function missingTerms(puzzle: PuzzleTerms): number[] {
  if (puzzle.taskFormat === 'find-odd-term') return [puzzle.answer];
  const terms = [...puzzle.sequence];
  terms.splice(puzzle.answerIndex ?? terms.length, 0, puzzle.answer);
  return missingTermIndices(puzzle).map((index) => terms[index]);
}

export function parseMissingAnswers(input: string, count: number): number[] | null {
  const values = input.trim().split(/[,\s]+/);
  if (values.length !== count || values.some((value) => !/^-?\d+$/.test(value))) return null;
  const numbers = values.map(Number);
  return numbers.every(Number.isSafeInteger) ? numbers : null;
}

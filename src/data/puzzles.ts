import authored from './puzzles.json';
import type { AuthoredPuzzle } from './puzzleTypes';

export const puzzles = authored.puzzles as AuthoredPuzzle[];
export const byId = new Map(puzzles.map((puzzle) => [puzzle.id, puzzle]));

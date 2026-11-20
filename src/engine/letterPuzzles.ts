import type { Puzzle } from '../types';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const alphabetLetter = (position: number) => alphabet[((position % 26) + 26) % 26];

export function makeDailyLetterPuzzles(): Puzzle[] {
  const puzzles: Puzzle[] = [];
  const families = [
    { family: 'skip' as const, firstStep: 2, rule: 'Move forward two letters each time, continuing from A after Z.', explanation: 'Each letter advances two places in the alphabet. After Z, the sequence wraps around to A. The next letter is {answer}.' },
    { family: 'skip' as const, firstStep: 3, rule: 'Move forward three letters each time, continuing from A after Z.', explanation: 'Each letter advances three places in the alphabet. After Z, the sequence wraps around to A. The next letter is {answer}.' },
    { family: 'alternate' as const, firstStep: 2, secondStep: 3, rule: 'Alternate the jumps: move forward two letters, then three, continuing from A after Z.', explanation: 'The jumps alternate between two and three places in the alphabet, wrapping from Z to A when needed. The next jump is two places, so the answer is {answer}.' },
    { family: 'alternate' as const, firstStep: 3, secondStep: 4, rule: 'Alternate the jumps: move forward three letters, then four, continuing from A after Z.', explanation: 'The jumps alternate between three and four places in the alphabet, wrapping from Z to A when needed. The next jump is three places, so the answer is {answer}.' },
  ];

  for (const pattern of families) {
    for (let start = 0; start < 26; start += 1) {
      const positions = Array.from({ length: 6 }, (_, index) => {
        return positionsAt(start, index, pattern.firstStep, pattern.secondStep, pattern.family);
      });
      const sequence = positions.slice(0, 5).map(alphabetLetter);
      const answer = alphabetLetter(positions[5]);
      const explanation = pattern.explanation.replace('{answer}', answer);
      puzzles.push({
        id: `letter-sequence:${pattern.family}:${pattern.firstStep}:${pattern.secondStep ?? 0}:${start}`,
        category: 'Letter sequences', difficulty: 'Medium', sequence: [], answer: 0,
        rule: pattern.rule, explanation,
        hints: [
          'Read the letters as positions in the 26-letter alphabet.',
          pattern.family === 'skip' ? `Each step moves forward ${pattern.firstStep} places.` : `The jumps alternate between ${pattern.firstStep} and ${pattern.secondStep} places.`,
          'Continue the same jumps and wrap from Z back to A if needed.',
        ],
        letterPattern: { sequence, answer, family: pattern.family, firstStep: pattern.firstStep, ...(pattern.secondStep ? { secondStep: pattern.secondStep } : {}) },
      });
    }
  }
  return puzzles;
}

function positionsAt(start: number, index: number, firstStep: number, secondStep: number | undefined, family: 'skip' | 'alternate'): number {
  let position = start;
  for (let stepIndex = 1; stepIndex <= index; stepIndex += 1) {
    const jump = family === 'skip' || stepIndex % 2 === 1 ? firstStep : secondStep!;
    position += jump;
  }
  return position;
}

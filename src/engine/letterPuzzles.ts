import type { Puzzle } from '../types';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const alphabetLetter = (position: number) => alphabet[((position % 26) + 26) % 26];

type LetterFamily = NonNullable<Puzzle['letterPattern']>['family'];
type LetterRule = {
  family: LetterFamily;
  difficulty: Puzzle['difficulty'];
  firstStep: number;
  secondStep?: number;
  growth?: number;
  rule: string;
  explanation: string;
};

const rules: LetterRule[] = [
  { family: 'skip', difficulty: 'Medium', firstStep: 2, rule: 'Move forward two letters each time, continuing from A after Z.', explanation: 'Each letter advances two places in the alphabet. After Z, the sequence wraps around to A. The next letter is {answer}.' },
  { family: 'skip', difficulty: 'Hard', firstStep: 3, rule: 'Move forward three letters each time, continuing from A after Z.', explanation: 'Each letter advances three places in the alphabet. After Z, the sequence wraps around to A. The next letter is {answer}.' },
  { family: 'alternate', difficulty: 'Hard', firstStep: 2, secondStep: 3, rule: 'Alternate the jumps: move forward two letters, then three, continuing from A after Z.', explanation: 'The jumps alternate between two and three places in the alphabet, wrapping from Z to A when needed. The next jump is two places, so the answer is {answer}.' },
  { family: 'alternate', difficulty: 'Expert', firstStep: 3, secondStep: 4, rule: 'Alternate the jumps: move forward three letters, then four, continuing from A after Z.', explanation: 'The jumps alternate between three and four places in the alphabet, wrapping from Z to A when needed. The next jump is three places, so the answer is {answer}.' },
  { family: 'backward', difficulty: 'Medium', firstStep: -2, rule: 'Move backward two letters each time, continuing from Z before A.', explanation: 'Each letter moves back two places in the alphabet. Before A, the sequence wraps around to Z. The next letter is {answer}.' },
  { family: 'backward', difficulty: 'Hard', firstStep: -3, rule: 'Move backward three letters each time, continuing from Z before A.', explanation: 'Each letter moves back three places in the alphabet. Before A, the sequence wraps around to Z. The next letter is {answer}.' },
  { family: 'growing', difficulty: 'Medium', firstStep: 1, growth: 1, rule: 'Move forward one letter, then two, then three, increasing the jump by one each time.', explanation: 'The forward jumps grow by one each time: one, two, three, four, then five places. The next letter is {answer}.' },
  { family: 'growing', difficulty: 'Hard', firstStep: 2, growth: 1, rule: 'Move forward two letters, then three, then four, increasing the jump by one each time.', explanation: 'The forward jumps grow by one each time: two, three, four, five, then six places. The next letter is {answer}.' },
  { family: 'alternate-direction', difficulty: 'Hard', firstStep: 2, secondStep: -1, rule: 'Alternate directions: move forward two letters, then backward one, and repeat.', explanation: 'The sequence alternates between moving forward two letters and backward one letter. The next move is forward two, so the answer is {answer}.' },
  { family: 'alternate-direction', difficulty: 'Expert', firstStep: 3, secondStep: -2, rule: 'Alternate directions: move forward three letters, then backward two, and repeat.', explanation: 'The sequence alternates between moving forward three letters and backward two letters. The next move is forward three, so the answer is {answer}.' },
];

export function makeDailyLetterPuzzles(): Puzzle[] {
  const puzzles: Puzzle[] = [];
  for (const pattern of rules) {
    for (let start = 0; start < 26; start += 1) {
      const positions = Array.from({ length: 6 }, (_, index) => positionsAt(start, index, pattern));
      const sequence = positions.slice(0, 5).map(alphabetLetter);
      const answer = alphabetLetter(positions[5]);
      const explanation = pattern.explanation.replace('{answer}', answer);
      const jumpHint = pattern.family === 'skip'
        ? `Each step moves forward ${pattern.firstStep} places.`
        : pattern.family === 'backward'
          ? `Each step moves backward ${Math.abs(pattern.firstStep)} places.`
          : pattern.family === 'growing'
            ? `The forward jumps increase by ${pattern.growth} each time.`
            : pattern.family === 'alternate-direction'
              ? `The jumps alternate: forward ${pattern.firstStep}, then backward ${Math.abs(pattern.secondStep!)}.`
              : `The jumps alternate between ${pattern.firstStep} and ${pattern.secondStep} places.`;
      puzzles.push({
        id: `letter-sequence:${pattern.family}:${pattern.firstStep}:${pattern.secondStep ?? pattern.growth ?? 0}:${start}`,
        category: 'Letter sequences', difficulty: pattern.difficulty, sequence: [], answer: 0,
        rule: pattern.rule, explanation,
        hints: [
          'Read the letters as positions in the 26-letter alphabet.',
          jumpHint,
          'Continue the same rule and wrap at A or Z when needed.',
        ],
        letterPattern: {
          sequence, answer, family: pattern.family, firstStep: pattern.firstStep,
          ...(pattern.secondStep !== undefined ? { secondStep: pattern.secondStep } : {}),
          ...(pattern.growth !== undefined ? { growth: pattern.growth } : {}),
        },
      });
    }
  }
  return puzzles;
}

function positionsAt(start: number, index: number, pattern: LetterRule): number {
  let position = start;
  for (let stepIndex = 1; stepIndex <= index; stepIndex += 1) {
    let jump = pattern.firstStep;
    if (pattern.family === 'alternate' || pattern.family === 'alternate-direction') {
      jump = stepIndex % 2 === 1 ? pattern.firstStep : pattern.secondStep!;
    } else if (pattern.family === 'growing') {
      jump = pattern.firstStep + (stepIndex - 1) * pattern.growth!;
    }
    position += jump;
  }
  return position;
}

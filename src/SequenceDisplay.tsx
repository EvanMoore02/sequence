import type { Puzzle } from './types';
import { missingTermIndices } from './engine/missingTerms';

export default function SequenceDisplay({
  puzzle,
  revealed = false,
  solved = false,
}: {
  puzzle: Puzzle;
  revealed?: boolean;
  solved?: boolean;
}) {
  const terms = [...puzzle.sequence, puzzle.answer];
  const blanks = new Set(missingTermIndices(puzzle));
  let blankNumber = 0;

  return (
    <div className="numbers">
      {terms.map((term, index) => {
        const isBlank = blanks.has(index);
        if (isBlank) blankNumber += 1;
        const isRevealed = !isBlank || revealed;
        const stateClass = isBlank && revealed ? (solved ? ' success' : ' missed') : '';
        return (
          <b
            className={'tile' + (isBlank && !revealed ? ' unknown' : '') + stateClass}
            key={index}
            aria-label={isBlank && !isRevealed ? 'Missing term ' + blankNumber : undefined}
          >
            {isRevealed ? term : '?'}
          </b>
        );
      })}
    </div>
  );
}

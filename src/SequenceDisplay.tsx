import { useEffect, useState } from 'react';
import type { Puzzle, VisualShape } from './types';
import { missingTermIndices } from './engine/missingTerms';

function ShapeIcon({ shape }: { shape: VisualShape }) {
  const points: Record<VisualShape['kind'], string> = {
    triangle: '32,6 58,54 6,54',
    diamond: '32,4 55,25 39,58 8,39',
    pentagon: '32,4 60,24 49,58 15,58 4,24',
    arrow: '32,3 59,29 43,29 43,61 21,61 21,29 5,29',
  };
  const count=shape.count??1,positions:[number,number,number][]=count===1?[[0,0,1]]:count===2?[[-11,-5,.7],[11,5,.7]]:[[-14,-8,.58],[14,-8,.58],[0,15,.58]];
  return <svg className="visual-shape" viewBox="0 0 64 64" aria-hidden="true">
    {positions.map(([x,y,scale],index)=><polygon key={index} points={points[shape.kind]} transform={'translate('+x+' '+y+') translate(32 32) scale('+scale+') translate(-32 -32) rotate(' + shape.rotation + ' 32 32)'} fill={shape.fill === 'solid' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />)}
  </svg>;
}

function TileImage({ tile }: { tile: VisualShape[] }) {
  return <div className={'visual-pieces' + (tile.length>1?' multiple':'')}>
    {tile.map((shape,index)=><span key={index} className={'visual-token '+(tile.length===1&&shape.slot===undefined?'solo':'slot-'+(shape.slot??index))}><ShapeIcon shape={shape}/></span>)}
  </div>;
}

function describeTile(tile: VisualShape[]): string {
  if(tile.length===0)return 'empty tile';
  const positions=['top-left','top-right','bottom-left','bottom-right'];
  return tile.map((shape)=>[shape.count&&shape.count>1?shape.count+' copies of':undefined,shape.fill,shape.kind,shape.rotation?shape.rotation+' degrees clockwise':undefined,shape.slot===undefined?undefined:'in the '+positions[shape.slot]].filter(Boolean).join(' ')).join(' and ');
}

export default function SequenceDisplay({
  puzzle,
  revealed = false,
  solved = false,
}: {
  puzzle: Puzzle;
  revealed?: boolean;
  solved?: boolean;
}) {
  const [selectedVisualOption, setSelectedVisualOption] = useState<number | null>(null);
  useEffect(() => setSelectedVisualOption(null), [puzzle.id]);
  if (puzzle.visualPattern) {
    const visual = puzzle.visualPattern;
    return <div className="shape-question visual-question">
      <p className="visual-instruction">{visual.taskFormat==='analogy'?'Choose the figure that completes the analogy.':visual.taskFormat==='find-odd-tile'?'Choose the tile that breaks the pattern.':'Choose the figure that completes the pattern.'}</p>
      <div className="visual-matrix" role="grid" aria-label={visual.taskFormat==='analogy'?'Visual analogy':'Shape reasoning matrix'} style={{gridTemplateColumns:'repeat('+(visual.columns??3)+',minmax(58px,1fr))'}}>
        {visual.cells.map((tile, index) => <div className={'visual-cell' + (!tile ? (revealed ? ' visual-answer-cell' : ' unknown') : '')} role="gridcell" key={index} aria-label={tile?'Row '+(Math.floor(index/(visual.columns??3))+1)+', column '+(index%(visual.columns??3)+1)+': '+describeTile(tile):revealed?'Row '+(Math.floor(index/(visual.columns??3))+1)+', column '+(index%(visual.columns??3)+1)+': '+describeTile(visual.choices[visual.answerIndex]):'Missing cell, row '+(Math.floor(index/(visual.columns??3))+1)+', column '+(index%(visual.columns??3)+1)}>
          {tile ? <TileImage tile={tile} /> : revealed ? <TileImage tile={visual.choices[visual.answerIndex]} /> : '?'}
        </div>)}
      </div>
      <div className="visual-options" role="group" aria-label={visual.taskFormat==='analogy'?'Choose the answer to the analogy':'Choose the missing figure'}>
        {visual.choices.map((tile, index) => <button type="button" key={index} disabled={revealed} aria-label={'Option ' + String.fromCharCode(65 + index) + ': ' + describeTile(tile)} aria-pressed={revealed ? index === visual.answerIndex : selectedVisualOption === index} className={revealed && index === visual.answerIndex ? 'correct-option' : selectedVisualOption === index ? 'selected-option' : ''} onClick={() => {
          const input = ['answer', 'practice-answer', 'endless-answer'].map((id) => document.getElementById(id)).find((element) => element instanceof HTMLInputElement);
          if (!input) return;
          setSelectedVisualOption(index);
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          setter?.call(input, String(index));
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }}><span>{String.fromCharCode(65 + index)}</span><TileImage tile={tile} /></button>)}
      </div>
    </div>;
  }

  if (puzzle.shapePattern) {
    const shapes = [...puzzle.shapePattern.sequence, puzzle.shapePattern.answer];
    return <div className="shape-question"><div className="numbers shape-sequence" role="list" aria-label="Shape pattern">{shapes.map((shape, index) => {
      const blank = index === puzzle.shapePattern!.sequence.length;
      const reveal = !blank || revealed;
      return <b key={index} className={'tile' + (blank && !revealed ? ' unknown' : '') + (blank && revealed ? (solved ? ' success' : ' missed') : '')} role="listitem" aria-label={blank && !reveal ? 'Next shape missing' : 'Shape ' + shape}>{reveal ? shape : '?'}</b>;
    })}</div>{!revealed && <div className="shape-choices" role="group" aria-label="Choose the next shape">{puzzle.shapePattern.choices.map((shape) => <button type="button" key={shape} aria-label={'Choose ' + shape} aria-pressed="false" onClick={(event) => {
      const input = ['answer', 'practice-answer', 'endless-answer'].map((id) => document.getElementById(id)).find((element) => element instanceof HTMLInputElement);
      if (!input) return;
      event.currentTarget.parentElement?.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', String(button === event.currentTarget)));
      const value = String(['●','■','▲','◆','★','⬟','⬢','✚'].indexOf(shape));
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }}>{shape}</button>)}</div>}</div>;
  }

  const terms = puzzle.taskFormat === 'find-odd-term'
    ? [...(puzzle.displaySequence ?? puzzle.sequence)]
    : [...puzzle.sequence];
  if (puzzle.taskFormat !== 'find-odd-term') {
    if (puzzle.answerIndex !== undefined) terms.splice(puzzle.answerIndex, 0, puzzle.answer);
    else terms.push(puzzle.answer);
  }
  const blanks = new Set(missingTermIndices(puzzle));
  let blankNumber = 0;
  return <div className="numbers" role="list" aria-label="Number sequence">
    {terms.map((term, index) => {
      const isBlank = blanks.has(index);
      const isOddTerm = puzzle.taskFormat === 'find-odd-term' && index === puzzle.oddTermIndex;
      if (isBlank) blankNumber += 1;
      const isRevealed = !isBlank || revealed;
      const stateClass = revealed && (isBlank || isOddTerm) ? (solved ? ' success' : ' missed') : '';
      return <b className={'tile' + (isBlank && !revealed ? ' unknown' : '') + stateClass} key={index} role="listitem" aria-label={isOddTerm && revealed ? 'Term ' + (index + 1) + ', breaks the pattern: ' + term : isBlank && !isRevealed ? 'Term ' + (index + 1) + ', missing number ' + blankNumber : 'Term ' + (index + 1) + ': ' + term}>{isRevealed ? term : '?'}</b>;
    })}
  </div>;
}

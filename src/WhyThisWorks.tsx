import { useEffect, useMemo, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { Puzzle } from './types';
import SequenceDisplay from './SequenceDisplay';
import './WhyThisWorks.css';

export default function WhyThisWorks({ puzzle }: { puzzle: Puzzle }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const terms = useMemo((): string[] => {
    if (puzzle.letterPattern) return [...puzzle.letterPattern.sequence, puzzle.letterPattern.answer];
    if (puzzle.shapePattern) return [...puzzle.shapePattern.sequence, puzzle.shapePattern.answer];
    if (puzzle.visualPattern) return [];
    if (puzzle.taskFormat === 'find-odd-term') return (puzzle.displaySequence ?? puzzle.sequence).map(String);
    return [...puzzle.sequence.slice(0, puzzle.answerIndex ?? puzzle.sequence.length), ...(puzzle.answerIndex === undefined ? [] : [puzzle.answer]), ...puzzle.sequence.slice(puzzle.answerIndex ?? puzzle.sequence.length), ...(puzzle.answerIndex === undefined ? [puzzle.answer] : [])].map(String);
  }, [puzzle]);
  const differences = useMemo(() => terms.slice(1).map((term, index) => {
    const before = puzzle.letterPattern ? puzzle.letterPattern.sequence[index].charCodeAt(0) - 65 : Number(terms[index]);
    const after = puzzle.letterPattern ? term.charCodeAt(0) - 65 : Number(term);
    if (!Number.isFinite(before) || !Number.isFinite(after)) return '';
    let delta = after - before;
    if (puzzle.letterPattern) {
      if (delta > 13) delta -= 26;
      if (delta < -13) delta += 26;
    }
    return (delta > 0 ? '+' : '') + delta;
  }), [puzzle, terms]);
  const stageCount = puzzle.visualPattern ? (puzzle.visualPattern.rows ?? 3) : Math.max(1, differences.length);
  const visualCaption = puzzle.visualPattern ? visualRowCaption(puzzle, step) : null;

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setStep(reducedMotion ? stageCount - 1 : 0);
    setPlaying(!reducedMotion);
  }, [puzzle.id, stageCount]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setStep((current) => (current + 1) % stageCount), 1000);
    return () => window.clearTimeout(timer);
  }, [playing, step, stageCount]);

  return <section className="why-works" aria-label="Why this works">
    <div className="why-works-heading"><b>See the pattern in action</b><span>{playing ? 'Playing · step ' + (step + 1) + ' of ' + stageCount : 'Paused · step ' + (step + 1) + ' of ' + stageCount}</span></div>
    <>
      {puzzle.visualPattern || puzzle.shapePattern ? <SequenceDisplay puzzle={puzzle} revealed solved walkthroughStep={step} /> : <div className="why-works-math" aria-live="polite">
        <div className="why-works-terms">{terms.map((term, index) => <span className={step === index || step === index - 1 ? 'active' : ''} key={index}>{term}</span>)}</div>
        {differences.length > 0 && <div className="why-works-deltas">{differences.map((delta, index) => <span className={step === index ? 'active' : ''} key={index}>{delta}</span>)}</div>}
      </div>}
      <p className="why-works-rule" aria-live="polite">{visualCaption ?? puzzle.rule}</p>
      <button type="button" className="why-works-toggle" aria-pressed={!playing} onClick={() => setPlaying((current) => !current)}>{playing ? <><Pause size={14} /> Pause</> : <><Play size={14} fill="currentColor" /> Play</>}</button>
    </>
  </section>;
}

const kindName: Record<string, string> = { triangle: 'triangle', pentagon: 'pentagon', arrow: 'arrow', 'l-block': 'L-shape' };
const cornerName = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

function visualRowCaption(puzzle: Puzzle, rowIndex: number): string {
  const visual = puzzle.visualPattern!;
  const columns = visual.columns ?? 3;
  const row = Array.from({ length: columns }, (_, column) => {
    const index = rowIndex * columns + column;
    const tile = visual.cells[index] ?? (index === visual.missingIndex ? visual.choices[visual.answerIndex] : null);
    return tile ?? [];
  });
  const label = (tile: NonNullable<typeof row[number]>) => tile.length ? tile.map((shape) => {
    const count = shape.count ?? 1;
    const name = kindName[shape.kind] ?? shape.kind;
    const position = shape.slot === undefined ? '' : ' at ' + cornerName[shape.slot];
    const turn = shape.rotation ? ', turned ' + shape.rotation + '°' : '';
    const fill = shape.fill === 'outline' ? 'outline ' : '';
    return `${count > 1 ? count + ' ' : ''}${fill}${name}${shape.inside ? ' with ' + kindName[shape.inside] + ' inside' : ''}${position}${turn}`;
  }).join(' + ') : 'empty';
  const items = row.map(label);
  const family = visual.family;
  if (family === 'count-progression') return `Across row ${rowIndex + 1}, the ${row[0]?.[0] ? kindName[row[0][0].kind] : 'shape'} stays the same while the count goes ${row.map((tile) => tile[0]?.count ?? 0).join(' → ')}.`;
  if (family === 'orbit-movement') return `Across row ${rowIndex + 1}, the same shape moves ${row.map((tile) => tile[0]?.slot === undefined ? 'through the corners' : cornerName[tile[0].slot]).join(' → ')}.`;
  if (family === 'shape-xor' || family === 'shape-union' || family === 'shape-overlap') {
    const operation = family === 'shape-xor' ? 'Shared shapes cancel; the rest remain.' : family === 'shape-overlap' ? 'Only the shared shapes remain.' : 'Combine the shapes, keeping each only once.';
    return `Row ${rowIndex + 1}: ${items[0]} and ${items[1]} → ${items[2]}. ${operation}`;
  }
  if (family === 'row-distribution') return `Across row ${rowIndex + 1}: ${items.join(' → ')}. Each shape appears once in the row.`;
  if (family === 'nested-shapes') return `Across row ${rowIndex + 1}, compare the outer shape and the shape inside: ${items.join(' → ')}.`;
  if (family === 'reflection') return `Row ${rowIndex + 1}: the outside shapes mirror around the center tile. The center continues the shape cycle: ${items.join(' → ')}.`;
  if (family === 'diagonal-symmetry') return `Row ${rowIndex + 1}: compare each tile with its partner across the top-left to bottom-right diagonal.`;
  if (family === 'odd-tile-out') return `Row ${rowIndex + 1} contains ${items.join(', ')}. Look for the one tile whose shape differs from the others.`;
  const changes = row.slice(1).map((tile, index) => {
    const before = row[index]?.[0], after = tile?.[0];
    if (!before || !after) return '';
    const features: string[] = [];
    if (before.kind !== after.kind) features.push(`${kindName[before.kind]} → ${kindName[after.kind]}`);
    if (before.fill !== after.fill) features.push(`${before.fill} → ${after.fill} fill`);
    if (before.rotation !== after.rotation) features.push(`${before.rotation}° → ${after.rotation}° turn`);
    if ((before.count ?? 1) !== (after.count ?? 1)) features.push(`${before.count ?? 1} → ${after.count ?? 1} shapes`);
    if (before.slot !== after.slot && before.slot !== undefined && after.slot !== undefined) features.push(`${cornerName[before.slot]} → ${cornerName[after.slot]}`);
    return features.length ? features.join(', ') : 'same features';
  });
  return `Row ${rowIndex + 1}: ${changes.join('; then ')}.`;
}

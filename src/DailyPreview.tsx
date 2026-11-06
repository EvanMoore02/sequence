import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { dailyPuzzles } from './engine/dailyGenerator';
import DailyUnavailable from './DailyUnavailable';
import './DailyPreview.css';

function localDateAtOffset(offset: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12);
  return String(date.getFullYear()) + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function challengeNumber(date: string): number {
  const timestamp = Date.parse(date + 'T00:00:00Z');
  return Math.floor((timestamp - Date.UTC(2026, 10, 2)) / 86_400_000) + 1;
}

function displayDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DailyPreview({ onBack }: { onBack: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const days = Array.from({ length: 50 }, (_, offset) => {
    const date = localDateAtOffset(offset);
    return { date, number: challengeNumber(date), puzzles: dailyPuzzles(date) };
  });

  return (
    <section className="daily-preview fade">
      <button className="back" onClick={onBack}><ArrowLeft size={16} /> Home</button>
      <div className="daily-preview-heading">
        <label>LOCAL DEVELOPER TOOL</label>
        <h1>Upcoming Daily Challenges</h1>
        <p>Preview today's challenge and the next 49 days. This page is available only while running the local development server.</p>
      </div>
      <div className="daily-preview-actions">
        <span>{days.length} daily challenges</span>
        <div>
          <button onClick={() => setExpanded(true)} aria-pressed={expanded}>Expand all</button>
          <button onClick={() => setExpanded(false)} aria-pressed={!expanded}>Collapse all</button>
        </div>
      </div>
      <div className="daily-preview-days">
        {days.map(({ date, number, puzzles }, index) => (
          <details className="daily-preview-day" key={date} open={expanded}>
            <summary>
              <span><b>Daily Challenge #{String(number).padStart(3, '0')}</b><small>{displayDate(date)}{index === 0 ? ' - Today' : ''}</small></span>
              <ArrowRight size={17} aria-hidden="true" />
            </summary>
            <div className="daily-preview-puzzles">
              {puzzles ? puzzles.map((puzzle, puzzleIndex) => (
                <article className="daily-preview-puzzle" key={puzzle.id}>
                  <label>Puzzle {puzzleIndex + 1}</label>
                  <div className="daily-preview-numbers" aria-label={'Sequence: ' + puzzle.sequence.join(', ') + '. Answer: ' + puzzle.answer}>
                    {puzzle.sequence.map((term, termIndex) => <b className="tile" key={termIndex}>{term}</b>)}
                    <b className="tile daily-preview-answer">{puzzle.answer}</b>
                  </div>
                  <b className="daily-preview-rule">{puzzle.rule}</b>
                  <p>{puzzle.explanation}</p>
                  <details className="daily-preview-hints">
                    <summary>Show hints</summary>
                    <ol>{puzzle.hints.map((hint, hintIndex) => <li key={hintIndex}>{hint}</li>)}</ol>
                  </details>
                </article>
              )) : <DailyUnavailable />}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

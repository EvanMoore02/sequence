import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Heart, Lightbulb, Timer, Trophy, X as CloseIcon } from 'lucide-react';
import { generatePuzzle, type GeneratedPuzzle } from './engine/generator';
import SequenceDisplay from './SequenceDisplay';
import { missingTerms, parseMissingAnswers } from './engine/missingTerms';
import { difficultyForSolvedCount, endlessPuzzlePoints } from './engine/endlessRules';
import { playerDifficultyForRating } from './engine/difficulty';
import useEnterToAdvance from './useEnterToAdvance';
import './Endless.css';

type Mode = 'classic' | 'timed';
type Outcome = 'solved' | 'missed' | 'over' | null;
type EndReason = 'lives' | 'time' | null;
type Run = {
  puzzle: GeneratedPuzzle;
  mode: Mode;
  deadline: number | null;
  remainingMs: number | null;
  endReason: EndReason;
  lives: number;
  solved: number;
  score: number;
  attempts: number;
  hints: number;
  hintLevel: number;
  input: string;
  recent: string[];
  outcome: Outcome;
  pointsEarned: number;
};
type Save = { best: number; timedBest: number; run: Run | null };
type AnswerFeedback = 'correct' | 'wrong';

function FeedbackMark({ kind, inline = false }: { kind: AnswerFeedback; inline?: boolean }) {
  const Icon = kind === 'correct' ? Check : CloseIcon;
  return <div className={'endless-answer-mark ' + kind + (inline ? ' inline' : '')} role="status" aria-label={kind === 'correct' ? 'Correct answer' : 'Incorrect answer'}><Icon size={40} strokeWidth={3} aria-hidden="true" /></div>;
}

const KEY = 'sequence.endless.v1';
const TIMED_RUN_SECONDS = 180;

function read(): Save {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<Save> | null;
    if (!value) return { best: 0, timedBest: 0, run: null };
    if (!value.run) return { best: value.best ?? 0, timedBest: value.timedBest ?? 0, run: null };
    const oldRun = value.run as Run & { mode?: Mode; deadline?: number | null; remainingMs?: number | null; endReason?: EndReason };
    return {
      best: value.best ?? 0,
      timedBest: value.timedBest ?? 0,
      run: {
        ...oldRun,
        mode: oldRun.mode === 'timed' ? 'timed' : 'classic',
        deadline: oldRun.deadline ?? null,
        remainingMs: oldRun.remainingMs ?? null,
        endReason: oldRun.endReason ?? (oldRun.outcome === 'over' ? 'lives' : null),
      },
    };
  } catch {
    return { best: 0, timedBest: 0, run: null };
  }
}

function newRun(mode: Mode, recent: string[] = []): Run {
  const puzzle = generatePuzzle('Easy', recent);
  const remainingMs = mode === 'timed' ? TIMED_RUN_SECONDS * 1000 : null;
  return {
    puzzle,
    mode,
    deadline: remainingMs === null ? null : Date.now() + remainingMs,
    remainingMs,
    endReason: null,
    lives: 3,
    solved: 0,
    score: 0,
    attempts: 0,
    hints: 0,
    hintLevel: 0,
    input: '',
    recent: [...recent, puzzle.id].slice(-30),
    outcome: null,
    pointsEarned: 0,
  };
}

function saveRun(save: Save, run: Run): Save {
  return run.mode === 'timed'
    ? { ...save, timedBest: Math.max(save.timedBest, run.score), run }
    : { ...save, best: Math.max(save.best, run.score), run };
}

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  return Math.floor(safeSeconds / 60) + ':' + String(safeSeconds % 60).padStart(2, '0');
}

export default function Endless({ onExit }: { onExit: () => void }) {
  const [save, setSave] = useState(read);
  const [note, setNote] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIMED_RUN_SECONDS);
  const [answerFeedback, setAnswerFeedback] = useState<AnswerFeedback | null>(null);
  const answerFeedbackAt = useRef(0);
  const run = save.run;

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* Storage may be unavailable. */ }
  }, [save]);

  function expireTimedRun(deadline: number) {
    setSave((current) => {
      const active = current.run;
      if (!active || active.mode !== 'timed' || active.deadline !== deadline || active.outcome) return current;
      return saveRun(current, {
        ...active,
        deadline: null,
        remainingMs: 0,
        input: '',
        outcome: 'over',
        endReason: 'time',
      });
    });
    setNote('');
  }

  useEffect(() => {
    if (!run || run.mode !== 'timed') return;
    if (run.outcome === 'over') {
      setTimeLeft(run.endReason === 'time' ? 0 : Math.ceil((run.remainingMs ?? 0) / 1000));
      return;
    }
    if (run.outcome === 'solved' || run.deadline === null) {
      setTimeLeft(Math.ceil((run.remainingMs ?? 0) / 1000));
      return;
    }

    const deadline = run.deadline;
    const update = () => {
      const remaining = Math.max(0, deadline - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));
      if (remaining === 0) expireTimedRun(deadline);
    };
    update();
    const interval = window.setInterval(update, 200);
    return () => window.clearInterval(interval);
  }, [run?.mode, run?.outcome, run?.deadline, run?.remainingMs]);

  function begin(mode: Mode, recent = run?.recent ?? []) {
    const nextRun = newRun(mode, recent);
    answerFeedbackAt.current = 0;
    setAnswerFeedback(null);
    setSave((current) => saveRun(current, nextRun));
    setTimeLeft(mode === 'timed' ? TIMED_RUN_SECONDS : 0);
    setNote('');
  }

  function advance() {
    if (!run || (run.outcome !== 'solved' && run.outcome !== 'missed')) return;
    const feedbackDelay = answerFeedbackAt.current ? Date.now() - answerFeedbackAt.current : 0;
    const remainingMs = run.mode === 'timed' ? Math.max(0, (run.remainingMs ?? 0) - feedbackDelay) : null;
    if (run.mode === 'timed' && (remainingMs ?? 0) <= 0) {
      setSave((current) => current.run ? saveRun(current, {
        ...current.run,
        deadline: null,
        remainingMs: 0,
        outcome: 'over',
        endReason: 'time',
      }) : current);
      answerFeedbackAt.current = 0;
      setAnswerFeedback(null);
      return;
    }

    const puzzle = generatePuzzle(difficultyForSolvedCount(run.solved), run.recent);
    setSave((current) => current.run ? saveRun(current, {
      ...current.run,
      puzzle,
      deadline: remainingMs === null ? null : Date.now() + remainingMs,
      remainingMs,
      endReason: null,
      attempts: 0,
      hints: 0,
      hintLevel: 0,
      input: '',
      recent: [...current.run.recent, puzzle.id].slice(-30),
      outcome: null,
      pointsEarned: 0,
    }) : current);
    answerFeedbackAt.current = 0;
    setAnswerFeedback(null);
    setNote('');
  }

  useEnterToAdvance(run?.mode === 'classic' && (run.outcome === 'solved' || run.outcome === 'missed'), advance);
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  useEffect(() => {
    if (run?.mode !== 'timed' || (run.outcome !== 'solved' && run.outcome !== 'missed')) return;
    const timeout = window.setTimeout(() => advanceRef.current(), 760);
    return () => window.clearTimeout(timeout);
  }, [run?.mode, run?.outcome, run?.puzzle.id]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!run || run.outcome) return;
    if (run.mode === 'timed' && run.deadline !== null && Date.now() >= run.deadline) {
      expireTimedRun(run.deadline);
      return;
    }

    const expected = missingTerms(run.puzzle);
    const answers = run.puzzle.shapePattern ? [] : parseMissingAnswers(run.input.trim(), expected.length);
    if (!run.puzzle.shapePattern && !answers) {
      setNote(expected.length === 1 ? 'Enter a whole number to submit.' : 'Enter all ' + expected.length + ' missing numbers in order, separated by commas.');
      return;
    }

    const attempts = run.attempts + 1;
    const isCorrect = run.puzzle.shapePattern
      ? run.input.trim() === run.puzzle.shapePattern.answer
      : expected.every((answer, index) => answer === answers?.[index]);
    if (!isCorrect) {
      answerFeedbackAt.current = Date.now();
      setAnswerFeedback('wrong');
      const lives = run.lives - 1;
      const over = lives === 0;
      setSave((current) => {
        if (!current.run) return current;
        return saveRun(current, {
          ...current.run,
          lives,
          attempts,
          input: '',
          outcome: over ? 'over' : null,
          endReason: over ? 'lives' : null,
          deadline: over ? null : current.run.deadline,
          remainingMs: over && current.run.mode === 'timed' && current.run.deadline !== null
            ? Math.max(0, current.run.deadline - Date.now())
            : current.run.remainingMs,
        });
      });
      const answerText = run.puzzle.visualPattern ? 'the missing figure shown in the matrix' : run.puzzle.shapePattern?.answer ?? expected.join(', ');
      setNote(over ? 'Out of lives. The answer was ' + answerText + '.' : run.mode === 'classic' ? 'Not quite. The answer was ' + answerText + '.' : '');
      if (!over) setSave((current) => current.run ? saveRun(current, {
        ...current.run,
        outcome: 'missed',
        deadline: null,
        remainingMs: current.run.mode === 'timed' && current.run.deadline !== null
          ? Math.max(0, current.run.deadline - Date.now())
          : current.run.remainingMs,
      }) : current);
      return;
    }

    const points = endlessPuzzlePoints(attempts, run.hints);
    answerFeedbackAt.current = Date.now();
    setAnswerFeedback('correct');
    const score = run.score + points;
    const remainingMs = run.mode === 'timed' && run.deadline !== null
      ? Math.max(0, run.deadline - Date.now())
      : run.remainingMs;
    setSave((current) => current.run ? saveRun(current, {
      ...current.run,
      solved: current.run.solved + 1,
      score,
      attempts,
      input: '',
      outcome: 'solved',
      deadline: null,
      remainingMs,
      pointsEarned: points,
    }) : current);
    setNote(run.puzzle.visualPattern ? 'Correct! You found the missing figure.' : 'Correct! The answer is ' + (run.puzzle.shapePattern?.answer ?? run.puzzle.answer) + '.');
  }

  function hint() {
    if (!run || run.outcome || run.hintLevel >= 3) return;
    setSave((current) => current.run ? {
      ...current,
      run: { ...current.run, hintLevel: current.run.hintLevel + 1, hints: current.run.hints + 1 },
    } : current);
    setNote('');
  }

  const puzzle = run?.puzzle;
  const best = run?.mode === 'timed' ? save.timedBest : save.best;

  return (
    <section className="endless fade">
      <button className="back" onClick={onExit}><ArrowLeft size={16} /> Home</button>
      {!run ? (
        <>
          <div className="practicehero"><Trophy /><label>ENDLESS MODE</label><h1>Endless mode</h1><p>Three lives, one try per puzzle, and difficulty that rises every three solves.</p></div>
          <article className="endless-start">
            <div><label>PERSONAL BESTS</label><strong>{save.best} classic · {save.timedBest} timed</strong></div>
            <div className="endless-mode-options">
              <button className="endless-mode-card" onClick={() => begin('classic')}>
                <span><b>Classic</b><small>Play at your own pace with three lives.</small></span>
                <span className="endless-mode-cta">Start classic <ArrowRight size={15} /></span>
              </button>
              <button className="endless-mode-card timed" onClick={() => begin('timed')}>
                <span><b><Timer size={16} /> 3-minute run</b><small>Score as much as you can before time runs out.</small></span>
                <span className="endless-mode-cta">Start timed <ArrowRight size={15} /></span>
              </button>
            </div>
          </article>
        </>
      ) : (
        <>
          <div className="endless-head">
            <div><label>{run.mode === 'timed' ? 'TIMED ENDLESS' : 'ENDLESS MODE'} · {playerDifficultyForRating(puzzle!.difficulty).toUpperCase()}</label><h1>Puzzle {run.solved + 1}</h1></div>
            <span className="best"><Trophy size={14} />{best} best</span>
          </div>
          <div className="endless-meta">
            <div className="lives" aria-label={run.lives + ' lives remaining'}>{[0, 1, 2].map((index) => <Heart key={index} size={17} className={index < run.lives ? 'life' : 'lost-life'} fill={index < run.lives ? 'currentColor' : 'none'} />)}</div>
            <span>{run.solved} solved</span>
            {run.mode === 'timed' && <span className={'endless-clock' + (timeLeft <= 10 ? ' urgent' : '')} role="timer" aria-label={formatTime(timeLeft)}><Timer size={15} />{formatTime(timeLeft)}</span>}
          </div>
          <div className="level-progress"><span>Difficulty progression</span><div>{[0, 1, 2].map((index) => <i key={index} className={run.solved % 3 > index ? 'filled' : ''} />)}</div><b>{Math.min(3, run.solved % 3)}/3</b></div>
          <div className="practice-prompt"><span>{puzzle!.category} · {playerDifficultyForRating(puzzle!.difficulty)}</span>{puzzle!.taskFormat==='missing-middle'&&<p>Complete the sequence.</p>}{puzzle!.taskFormat==='find-odd-term'&&<p>Find the term that breaks the pattern.</p>}{puzzle!.shapePattern ? <div className="shape-sequence" aria-label="Shape pattern">{[...puzzle!.shapePattern.sequence, ...(run.outcome ? [puzzle!.shapePattern.answer] : ['?'])].map((shape, index) => <b key={index} className={shape === '?' ? 'unknown' : ''}>{shape}</b>)}</div> : <SequenceDisplay puzzle={puzzle!} revealed={Boolean(run.outcome)} solved={run.outcome === 'solved'} />}{answerFeedback && (run.mode === 'timed' || run.outcome === 'over') && <FeedbackMark key={puzzle!.id + ':' + run.outcome + ':' + run.attempts} kind={answerFeedback} />}</div>
          {!run.outcome && <>
            <div className="attempts"><span>ONE TRY THIS PUZZLE</span><div><i className={run.attempts ? 'spent' : ''} /></div></div>
            {puzzle!.shapePattern ? <div className="shape-choices" role="group" aria-label="Choose the next shape">{puzzle!.shapePattern.choices.map((shape) => <button type="button" key={shape} aria-pressed={run.input === shape} onClick={() => setSave((current) => current.run ? { ...current, run: { ...current.run, input: shape } } : current)}>{shape}</button>)}<button className="submit" disabled={!run.input} onClick={() => submit({ preventDefault() {} } as FormEvent)}>Submit answer <ArrowRight size={16} /></button></div> : <form onSubmit={submit}><label className="answer-label" htmlFor="endless-answer">Your answer</label><div className="inputrow"><input id="endless-answer" type="text" inputMode="text" enterKeyHint="done" autoCapitalize="off" autoCorrect="off" autoComplete="off" placeholder={missingTerms(puzzle!).length > 1 ? 'Separate answers with commas' : 'Type a number'} value={run.input} onChange={(event) => { setSave((current) => current.run ? { ...current, run: { ...current.run, input: event.target.value } } : current); setNote(''); }} /><button className="submit" disabled={!run.input.trim()}>Submit answer <ArrowRight size={16} /></button></div></form>}
            <button className="hintbutton" disabled={run.hintLevel >= 3} onClick={hint}><Lightbulb size={17} />{run.hintLevel ? 'Reveal next hint' : 'Get a hint'} {run.hintLevel}/3</button>
            {run.hintLevel > 0 && <aside>HINT {run.hintLevel}<p>{puzzle!.hints[run.hintLevel - 1]}</p></aside>}
            {note && <p role="status" className="notice">{note}</p>}
          </>}
          {run.mode === 'classic' && (run.outcome === 'solved' || run.outcome === 'missed') && <div className="puzzle-dialog-backdrop"><article className="practice-answer puzzle-dialog" role="dialog" aria-modal="true" aria-labelledby="endless-pattern-title"><FeedbackMark kind={run.outcome === 'solved' ? 'correct' : 'wrong'} inline /><h2 id="endless-pattern-title">{run.outcome === 'solved' ? 'Nice job!' : 'Good effort—keep going!'}</h2>{puzzle!.shapePattern ? <div className="shape-sequence">{[...puzzle!.shapePattern.sequence,puzzle!.shapePattern.answer].map((shape,index)=><b key={index}>{shape}</b>)}</div> : <SequenceDisplay puzzle={puzzle!} revealed solved={run.outcome === 'solved'}/>}<p className="earned">{run.outcome === 'solved' ? '+' + run.pointsEarned + ' points · ' + run.score + ' total' : run.lives + ' lives remaining'}</p><p>{puzzle!.explanation}</p><strong className="dialog-answer">{puzzle!.visualPattern ? 'Correct figure is highlighted above' : 'Answer: ' + (puzzle!.shapePattern?.answer ?? missingTerms(puzzle!).join(', '))}</strong><button className="primary" onClick={advance}>Next puzzle <ArrowRight size={16} /></button></article></div>}
          {run.outcome === 'over' && <article className="practice-answer"><label>RUN OVER · {run.endReason === 'time' ? 'TIME IS UP' : 'OUT OF LIVES'}</label><p>{puzzle!.explanation}</p><p className="earned">Final score: {run.score} · {run.solved} solved</p><button className="primary" onClick={() => begin(run.mode, run.recent)}>Play again <ArrowRight size={16} /></button><button className="endless-change-mode" onClick={() => { setSave((current) => ({ ...current, run: null })); setNote(''); }}>Choose another mode</button></article>}
          <p className="practice-note">Endless score and high scores are separate from Daily and Practice.</p>
          
        </>
      )}
    </section>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Lightbulb, Sparkles } from 'lucide-react';
import { generatePracticePuzzle, getPracticeCategories, type GeneratedPuzzle, type PracticeDifficulty } from './engine/generator';
import SequenceDisplay from './SequenceDisplay';
import { missingTerms, parseMissingAnswers } from './engine/missingTerms';
import useEnterToAdvance from './useEnterToAdvance';

type Session = {
  difficulty: PracticeDifficulty | null;
  category: string | null;
  puzzle: GeneratedPuzzle | null;
  recent: string[];
  attempts: number;
  hintLevel: number;
  input: string;
  solved: boolean;
  skipped: boolean;
  adjustment: -1 | 0 | 1;
  rated: boolean;
};
const KEY = 'sequence.practice.v1';
const fresh: Session = { difficulty: null, category: null, puzzle: null, recent: [], attempts: 0, hintLevel: 0, input: '', solved: false, skipped: false, adjustment: 0, rated: false };
function load(): Session {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null') as (Omit<Partial<Session>, 'difficulty'> & { difficulty?: string | null }) | null;
    if (!saved) return fresh;
    const difficulty = saved.difficulty === 'Expert' ? 'Hard' : saved.difficulty;
    return { ...fresh, ...saved, difficulty: difficulty === 'Easy' || difficulty === 'Medium' || difficulty === 'Hard' || difficulty === 'All' ? difficulty : null, category: saved.category ?? null, adjustment: saved.adjustment === -1 || saved.adjustment === 1 ? saved.adjustment : 0, rated: saved.rated ?? false };
  } catch { return fresh; }
}
const levels: PracticeDifficulty[] = ['Easy', 'Medium', 'Hard', 'All'];
const levelDescription: Record<PracticeDifficulty, string> = { Easy: 'Straightforward number patterns', Medium: 'Patterns that take a few steps', Hard: 'The most challenging patterns', All: 'A mix of medium and harder puzzles' };
const adjustmentText = (value: -1 | 0 | 1) => value > 0 ? 'Future puzzles will be a little harder.' : value < 0 ? 'Future puzzles will be a little easier.' : 'Future puzzles will stay at your selected level.';

export default function Practice({ onExit }: { onExit: () => void }) {
  const [session, setSession] = useState(load);
  const [note, setNote] = useState('');
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* Storage may be unavailable. */ } }, [session]);

  function next(diff = session.difficulty || 'All', recent = session.recent, category = session.category, adjustment = session.adjustment) {
    const adjusted: PracticeDifficulty = diff === 'All' ? adjustment > 0 ? 'Hard' : adjustment < 0 ? 'Easy' : 'All' : levels[Math.max(0, Math.min(2, levels.indexOf(diff) + adjustment))];
    const target = category && !getPracticeCategories(adjusted).includes(category) ? diff : adjusted;
    const selectedCategory = category && getPracticeCategories(target).includes(category) ? category : undefined;
    const puzzle = generatePracticePuzzle(target, recent, Math.random, selectedCategory);
    setSession({ ...session, difficulty: diff, category: selectedCategory ?? null, puzzle, recent: [...recent, puzzle.id].slice(-30), attempts: 0, hintLevel: 0, input: '', solved: false, skipped: false, adjustment, rated: false });
    setNote('');
  }
  useEnterToAdvance(session.solved, () => next());
  function chooseLevel(difficulty: PracticeDifficulty) { setSession({ ...session, difficulty, category: null, puzzle: null }); }
  function chooseCategory(category: string | null) { next(session.difficulty || 'All', [], category); }
  function skip() { if (session.solved || !session.puzzle) return; setSession(s => ({ ...s, solved: true, skipped: true, input: '', rated: true })); setNote(''); }
  function rateDifficulty(adjustment: -1 | 0 | 1) { setSession(s => ({ ...s, adjustment, rated: true })); }
  function submit(event: FormEvent) {
    event.preventDefault();
    const p = session.puzzle;
    if (!p || session.solved) return;
    const answers = parseMissingAnswers(session.input.trim(), missingTerms(p).length);
    if (!answers) { setNote(missingTerms(p).length === 1 ? 'Enter a whole number to submit.' : 'Enter all ' + missingTerms(p).length + ' missing numbers in order, separated by commas.'); return; }
    const expected = missingTerms(p), attempts = session.attempts + 1;
    if (expected.every((answer, index) => answer === answers[index])) { setSession(s => ({ ...s, attempts, solved: true, skipped: false, input: '', rated: false })); setNote('Correct! Here is the pattern.'); }
    else { setSession(s => ({ ...s, attempts, input: '' })); setNote('Not quite. Try again, or reveal another hint.'); }
  }
  const puzzle = session.puzzle;
  return <section className="practice fade">
    <button className="back" onClick={onExit}><ArrowLeft size={16} /> Home</button>
    {!puzzle ? <>
      <div className="practicehero"><Sparkles /><label>PRACTICE MODE</label><h1>Practice puzzles</h1><p>Unlimited attempts, optional hints, and no score.</p></div>
      {!session.difficulty ? <div className="level-list"><label>CHOOSE A DIFFICULTY</label>{levels.map(level => <button key={level} onClick={() => chooseLevel(level)}><span><b>{level === 'All' ? 'All difficulties' : level}</b><small>{levelDescription[level]}</small></span><ArrowRight size={17} /></button>)}</div> : <div className="level-list"><div className="practice-category-heading"><div><label>CHOOSE A CATEGORY</label><p>Showing categories with puzzles at this level.</p></div><button type="button" onClick={() => setSession(s => ({ ...s, difficulty: null, category: null }))}>Change level</button></div><button onClick={() => chooseCategory(null)}><span><b>All categories</b><small>A mix of available puzzle types</small></span><ArrowRight size={17} /></button>{getPracticeCategories(session.difficulty).map(category => <button key={category} onClick={() => chooseCategory(category)}><span><b>{category}</b><small>Practice {category.toLowerCase()} puzzles</small></span><ArrowRight size={17} /></button>)}</div>}
    </> : <>
      <div className="practice-head"><div><label>PRACTICE · {session.difficulty === 'All' ? 'ALL LEVELS' : session.difficulty?.toUpperCase()} · {session.category?.toUpperCase() || 'ALL CATEGORIES'}</label><h1>{puzzle.taskFormat === 'missing-middle' ? 'Complete the sequence' : puzzle.taskFormat === 'find-odd-term' ? 'Find the term that breaks the pattern' : 'What comes next?'}</h1></div><button className="change-level" onClick={() => setSession(s => ({ ...s, puzzle: null, difficulty: null, category: null }))}>Change filters</button></div>
      <div className="practice-prompt"><span>{puzzle.category}</span><SequenceDisplay puzzle={puzzle} revealed={session.solved} solved={session.solved} /></div>
      <div className="practice-count">{session.attempts} {session.attempts === 1 ? 'attempt' : 'attempts'} · unlimited</div>
      <form onSubmit={submit}><label className="answer-label" htmlFor="practice-answer">Your answer</label><div className="inputrow"><input id="practice-answer" type="text" inputMode="text" enterKeyHint="done" autoCapitalize="off" autoCorrect="off" autoComplete="off" placeholder={missingTerms(puzzle).length > 1 ? 'Separate answers with commas' : 'Type a number'} value={session.input} disabled={session.solved} onChange={e => { setSession(s => ({ ...s, input: e.target.value })); setNote(''); }} /><button className="submit" disabled={!session.input.trim() || session.solved}>Submit <ArrowRight size={16} /></button></div></form>
      <button className="hintbutton" disabled={session.hintLevel >= 3 || session.solved} onClick={() => { setSession(s => ({ ...s, hintLevel: s.hintLevel + 1 })); setNote(''); }}><Lightbulb size={17} />{session.hintLevel ? 'Reveal next hint' : 'Get a hint'} {session.hintLevel}/3</button><button className="skip-puzzle" disabled={session.solved} onClick={skip}>Skip puzzle</button>
      {session.hintLevel > 0 && <aside>HINT {session.hintLevel}<p>{puzzle.hints[session.hintLevel - 1]}</p></aside>}{note && !session.solved && <p role="status" className="notice">{note}</p>}
      {session.solved && <div className="puzzle-dialog-backdrop"><article className="practice-answer puzzle-dialog" role="dialog" aria-modal="true" aria-labelledby="practice-pattern-title"><h2 id="practice-pattern-title">{session.skipped ? 'Puzzle skipped' : 'Nice job!'}</h2><SequenceDisplay puzzle={puzzle} revealed solved={!session.skipped} /><p>{puzzle.explanation}</p><strong className="dialog-answer">Answer: {missingTerms(puzzle).join(', ')}</strong>{!session.skipped && <div className="practice-difficulty-feedback"><b>How did that difficulty feel?</b><div role="group" aria-label="Rate puzzle difficulty"><button type="button" aria-pressed={session.rated && session.adjustment === 1} onClick={() => rateDifficulty(1)}>Too easy</button><button type="button" aria-pressed={session.rated && session.adjustment === 0} onClick={() => rateDifficulty(0)}>About right</button><button type="button" aria-pressed={session.rated && session.adjustment === -1} onClick={() => rateDifficulty(-1)}>Too hard</button></div><small>{session.rated ? adjustmentText(session.adjustment) : 'Your rating will tune future puzzles.'}</small></div>}<button className="primary" onClick={() => next()}>Next puzzle <ArrowRight size={16} /></button></article></div>}
      <p className="practice-note">Practice progress is saved on this device. It never changes your Daily Challenge stats.</p>
    </>}
  </section>;
}

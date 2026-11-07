import { ArrowRight, CalendarDays } from 'lucide-react';
import type { Run, Stats } from './types';
import DailyUnavailable from './DailyUnavailable';
import './HomeDashboard.css';

type Props = {
  challengeNumber: number;
  displayDate: string;
  run: Run;
  stats: Stats;
  available: boolean;
  showPreview: boolean;
  onStart: () => void;
  onResults: () => void;
  onPractice: () => void;
  onEndless: () => void;
  onPreview: () => void;
};

export default function HomeDashboard({
  challengeNumber,
  displayDate,
  run,
  stats,
  available,
  showPreview,
  onStart,
  onResults,
  onPractice,
  onEndless,
  onPreview,
}: Props) {
  const complete = Boolean(run.completedAt);

  return (
    <section className="home-screen fade">
      <div className="home-date"><CalendarDays size={15} />{displayDate}</div>
      <div className="home-hero">
        <label>DAILY NUMBER PUZZLE</label>
        <h1>Find the pattern.<br /><i>Find the next number.</i></h1>
        <p>Five puzzles a day. Hints are there if you need them.</p>
      </div>

      {available ? (
        <article className="home-daily-card">
          <div className="home-daily-heading">
            <div><label>TODAY’S CHALLENGE</label><h2>Daily Challenge <span>#{String(challengeNumber).padStart(3, '0')}</span></h2></div>
            <span className={'home-status' + (complete ? ' complete' : '')}>{complete ? 'Complete' : 'Ready'}</span>
          </div>
          <div className="home-progress-copy"><span>Your progress</span><b>{run.results.length}<small> / 5</small></b></div>
          <div className="home-progress-track"><i style={{ width: run.results.length * 20 + '%' }} /></div>
          <button className="primary" onClick={onStart}>{complete ? 'View results' : run.startedAt ? 'Continue challenge' : 'Play today’s challenge'}<ArrowRight size={17} /></button>
          <small className="home-save-note">Progress saves automatically · No time limit</small>
        </article>
      ) : <DailyUnavailable onResults={complete ? onResults : undefined} />}

      <section className="home-modes" aria-label="More ways to play">
        <div className="home-modes-heading"><label>MORE WAYS TO PLAY</label><span>Choose your pace</span></div>
        <div className="home-mode-grid">
          <button className="home-mode-card" onClick={onPractice}>
            <span><b>Practice</b><small>Explore patterns at your own pace.</small></span><ArrowRight size={17} />
          </button>
          <button className="home-mode-card" onClick={onEndless}>
            <span><b>Endless</b><small>Classic or race the 3-minute clock.</small></span><ArrowRight size={17} />
          </button>
        </div>
      </section>

      {showPreview && <button className="home-preview-link" onClick={onPreview}>Preview upcoming challenges <ArrowRight size={14} /></button>}
      <p className="home-streak-note">{stats.currentStreak ? stats.currentStreak + ' day streak' : 'A fresh start is always one puzzle away.'}</p>
    </section>
  );
}

import type { Run, Stats } from './types';
import { dailyIds, isCurrentDailyIds } from './engine/dailyGenerator';
import { dailyScore, repriceDailyResults } from './engine/dailyScoring';

export const STORAGE_KEY = 'sequence.prototype.v1';

export const blankStats: Stats = {
  currentStreak: 0,
  longestStreak: 0,
  totalGames: 0,
  totalChallenges: 0,
  totalPuzzlesSolved: 0,
  totalAttempts: 0,
  totalHintsUsed: 0,
  bestDailyScore: 0,
  totalDailyScore: 0,
  scoredChallenges: 0,
  totalFirstAttemptSolves: 0,
  firstAttemptSamples: 0,
  dailyTimeTotalMs: 0,
  dailyTimeSamples: 0,
  fastestDailyTimeMs: null,
  dailyHistory: [],
  lastPlayedDate: null,
};

export type SavedAppData = { run: Run; stats: Stats };

export function todayDate(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function freshRun(date: string, ids = dailyIds(date) ?? []): Run {
  return {
    date,
    ids,
    index: 0,
    attempts: 0,
    hints: 0,
    hintLevel: 0,
    input: '',
    results: [],
    startedAt: null,
    completedAt: null,
  };
}

export function readSavedData(): SavedAppData | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as SavedAppData | null;
    return saved?.run
      ? { ...saved, run: { ...saved.run, results: repriceDailyResults(saved.run.results) } }
      : saved;
  } catch {
    return null;
  }
}

export function normalizeStats(value?: Partial<Stats>): Stats {
  return {
    ...blankStats,
    ...value,
    dailyHistory: Array.isArray(value?.dailyHistory) ? value.dailyHistory : [],
  };
}

export function initialAppData(date: string, hasDailyPuzzles: boolean): SavedAppData {
  const saved = readSavedData();
  const keepRun = saved?.run.date === date &&
    (isCurrentDailyIds(date, saved.run.ids) || Boolean(saved.run.completedAt));

  if (keepRun && saved) return { ...saved, stats: normalizeStats(saved.stats) };
  return {
    run: hasDailyPuzzles ? freshRun(date) : freshRun(date, []),
    stats: normalizeStats(saved?.stats),
  };
}

export function challengeNumber(date: string): number {
  return Math.floor((Date.parse(`${date}T12:00:00`) - Date.parse('2026-11-02T12:00:00')) / 86400000) + 1;
}

export function formatChallengeDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const scoreDailyRun = dailyScore;

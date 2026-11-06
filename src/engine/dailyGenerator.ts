import type { AuthoredPuzzle } from '../data/puzzleTypes';
import { puzzles as authoredPuzzles } from '../data/puzzles';
import type { Puzzle } from '../types';
import { templates, type GeneratedPuzzle } from './generator';

const levels: Puzzle['difficulty'][] = ['Easy', 'Medium', 'Hard', 'Expert'];
const dailyMix: Record<Puzzle['difficulty'], number> = { Easy: 0, Medium: 1, Hard: 2, Expert: 2 };
const dailyAnchor = Date.UTC(2026, 10, 2);
const millisecondsPerDay = 86_400_000;
const cache = new Map<string, DailyPuzzle[]>();
const lineupCache = new Map<number, DailyPuzzle[]>();
type DailyPuzzle = AuthoredPuzzle | GeneratedPuzzle;
type Pools = Record<Puzzle['difficulty'], DailyPuzzle[]>;
let pools: Pools | undefined;

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}

function randomFromSeed(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4_294_967_296;
  };
}

function makePools(): Pools {
  const collected: Record<Puzzle['difficulty'], Map<string, DailyPuzzle>> = {
    Easy: new Map(), Medium: new Map(), Hard: new Map(), Expert: new Map(),
  };
  const signatures = new Set<string>();
  const add = (puzzle: DailyPuzzle) => {
    if (puzzle.pattern.type === 'alternating' || puzzle.pattern.type === 'alternating-operation') return;
    const signature = JSON.stringify([puzzle.sequence, puzzle.answer]);
    if (signatures.has(signature)) return;
    signatures.add(signature);
    collected[puzzle.difficulty].set(puzzle.id, puzzle);
  };

  authoredPuzzles.forEach(add);
  for (const template of templates) {
    for (let attempt = 0; attempt < 1024; attempt += 1) {
      add(template.generate(randomFromSeed(hash(template.id + ':' + attempt))));
    }
  }

  const result = Object.fromEntries(levels.map((level) => [
    level,
    [...collected[level].values()].sort((left, right) => left.id.localeCompare(right.id)),
  ])) as Pools;
  for (const level of levels) {
    const count = dailyMix[level];
    const minimum = count === 0 ? 0 : count === 1 ? 2 : 4;
    if (result[level].length < minimum) {
      throw new Error('Daily generator needs at least ' + minimum + ' unique ' + level + ' puzzles to avoid adjacent-day repeats.');
    }
  }
  return result;
}

function dayIndex(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Daily puzzle date must use YYYY-MM-DD format.');
  const timestamp = Date.parse(date + 'T00:00:00Z');
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) {
    throw new Error('Daily puzzle date is invalid: ' + date + '.');
  }
  return Math.round((timestamp - dailyAnchor) / millisecondsPerDay);
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function selectLineup(dayOffset: number, available: Pools, previous: DailyPuzzle[] = []): DailyPuzzle[] {
  const order = ['Medium', 'Hard', 'Hard', 'Expert', 'Expert'] as const;
  const selected: DailyPuzzle[] = [];
  const usedCategories = new Set<string>();
  const usedPatterns = new Set<string>();
  const previousIds = new Set(previous.map((puzzle) => puzzle.id));
  const previousCategories = new Set(previous.map((puzzle) => puzzle.category));
  const previousPatterns = new Set(previous.map((puzzle) => puzzle.pattern.type));

  function choose(slot: number): boolean {
    if (slot === order.length) return true;
    const level = order[slot];
    const pool = available[level];
    const levelSlot = order.slice(0, slot).filter((previousLevel) => previousLevel === level).length;
    const start = positiveModulo(dayOffset * dailyMix[level] + levelSlot, pool.length);
    for (let step = 0; step < pool.length; step += 1) {
      const candidate = pool[(start + step) % pool.length];
      if (previousIds.has(candidate.id) || previousCategories.has(candidate.category) || previousPatterns.has(candidate.pattern.type)) continue;
      if (usedCategories.has(candidate.category) || usedPatterns.has(candidate.pattern.type)) continue;
      selected.push(candidate);
      usedCategories.add(candidate.category);
      usedPatterns.add(candidate.pattern.type);
      if (choose(slot + 1)) return true;
      selected.pop();
      usedCategories.delete(candidate.category);
      usedPatterns.delete(candidate.pattern.type);
    }
    return false;
  }

  if (!choose(0)) throw new Error('Daily generator could not find a diverse lineup for day offset ' + dayOffset + '.');
  return selected;
}

function lineupForOffset(offset: number, available: Pools): DailyPuzzle[] {
  const cached = lineupCache.get(offset);
  if (cached) return cached;

  if (!lineupCache.has(-1)) lineupCache.set(-1, selectLineup(-1, available));
  if (offset >= 0) {
    for (let day = 0; day <= offset; day += 1) {
      if (lineupCache.has(day)) continue;
      const previous = lineupCache.get(day - 1)!;
      lineupCache.set(day, selectLineup(day, available, previous));
    }
  } else {
    for (let day = -2; day >= offset; day -= 1) {
      if (lineupCache.has(day)) continue;
      const next = lineupCache.get(day + 1)!;
      lineupCache.set(day, selectLineup(day, available, next));
    }
  }
  return lineupCache.get(offset)!;
}

export function dailyPuzzles(date: string): DailyPuzzle[] {
  const cached = cache.get(date);
  if (cached) return cached;
  const offset = dayIndex(date);
  const available = pools ??= makePools();
  const selected = lineupForOffset(offset, available);
  cache.set(date, selected);
  return selected;
}

export function dailyIds(date: string): string[] {
  return dailyPuzzles(date).map((puzzle) => puzzle.id);
}

export function hasDailyComposition(ids: string[]): boolean {
  if (ids.length !== 5) return false;
  const available = pools ??= makePools();
  const byId = new Map(levels.flatMap((level) => available[level]).map((puzzle) => [puzzle.id, puzzle]));
  const puzzlesForIds = ids.map((id) => byId.get(id));
  if (puzzlesForIds.some((puzzle) => !puzzle)) return false;
  const hasRequiredDifficultyOrder = puzzlesForIds.every((puzzle, index) => puzzle!.difficulty === ['Medium', 'Hard', 'Hard', 'Expert', 'Expert'][index]);
  const categories = puzzlesForIds.map((puzzle) => puzzle!.category);
  const patterns = puzzlesForIds.map((puzzle) => puzzle!.pattern.type);
  return hasRequiredDifficultyOrder && new Set(categories).size === 5 && new Set(patterns).size === 5;
}

export function isCurrentDailyIds(date: string, ids: string[]): boolean {
  const expected = dailyIds(date);
  return ids.length === expected.length && ids.every((id, index) => id === expected[index]);
}

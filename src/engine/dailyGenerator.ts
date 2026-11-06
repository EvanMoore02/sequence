import type { AuthoredPuzzle } from '../data/puzzleTypes';
import { puzzles as authoredPuzzles } from '../data/puzzles';
import type { Puzzle } from '../types';
import { templates, type GeneratedPuzzle } from './generator';

const levels: Puzzle['difficulty'][] = ['Easy', 'Medium', 'Hard', 'Expert'];
const dailyMix: Record<Puzzle['difficulty'], number> = { Easy: 0, Medium: 1, Hard: 2, Expert: 2 };
const dailyAnchor = Date.UTC(2026, 10, 2);
const millisecondsPerDay = 86_400_000;
const cache = new Map<string, DailyPuzzle[]>();
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

export function dailyPuzzles(date: string): DailyPuzzle[] {
  const cached = cache.get(date);
  if (cached) return cached;
  const offset = dayIndex(date);
  const available = pools ??= makePools();
  const select = (level: Puzzle['difficulty'], count: number) => {
    const pool = available[level];
    const start = positiveModulo(offset * count, pool.length);
    return Array.from({ length: count }, (_, index) => pool[(start + index) % pool.length]);
  };
  const selected = [
    ...select('Medium', dailyMix.Medium),
    ...select('Hard', dailyMix.Hard),
    ...select('Expert', dailyMix.Expert),
  ];
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
  return puzzlesForIds.every((puzzle, index) => puzzle!.difficulty === ['Medium', 'Hard', 'Hard', 'Expert', 'Expert'][index]);
}

export function isCurrentDailyIds(date: string, ids: string[]): boolean {
  const expected = dailyIds(date);
  return ids.length === expected.length && ids.every((id, index) => id === expected[index]);
}

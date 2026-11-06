import type { AuthoredPuzzle } from '../data/puzzleTypes';
import { puzzles as authoredPuzzles } from '../data/puzzles';
import type { Puzzle } from '../types';
import { templates, type GeneratedPuzzle } from './generator';

const levels: Puzzle['difficulty'][] = ['Easy', 'Medium', 'Hard', 'Expert'];
const dailyMix: Record<Puzzle['difficulty'], number> = { Easy: 0, Medium: 1, Hard: 2, Expert: 2 };
const dailyAnchor = Date.UTC(2026, 10, 2);
const millisecondsPerDay = 86_400_000;
const cache = new Map<string, DailyPuzzle[] | null>();
const lineupCache = new Map<number, DailyPuzzle[] | null>();
type DailyPuzzle = AuthoredPuzzle | GeneratedPuzzle;
type Pools = Record<Puzzle['difficulty'], DailyPuzzle[]>;
let pools: Pools | null | undefined;
const cooldownDays = 15;
const minimumPoolSize: Record<Puzzle['difficulty'], number> = { Easy: 0, Medium: 15, Hard: 30, Expert: 30 };

export function isWithinDailyCooldown(firstDay: number, secondDay: number): boolean {
  return Math.abs(firstDay - secondDay) < cooldownDays;
}

function signature(puzzle: DailyPuzzle): string {
  return JSON.stringify([puzzle.sequence, puzzle.answer]);
}

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

function makePools(): Pools | null {
  const collected: Record<Puzzle['difficulty'], Map<string, DailyPuzzle>> = {
    Easy: new Map(), Medium: new Map(), Hard: new Map(), Expert: new Map(),
  };
  const signatures = new Set<string>();
  const add = (puzzle: DailyPuzzle) => {
    if (puzzle.pattern.type === 'alternating' || puzzle.pattern.type === 'alternating-operation') return;
    const puzzleSignature = signature(puzzle);
    if (signatures.has(puzzleSignature)) return;
    signatures.add(puzzleSignature);
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
    const minimum = minimumPoolSize[level];
    if (result[level].length < minimum) {
      return null;
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

function selectLineup(dayOffset: number, available: Pools, previous: DailyPuzzle[] = [], recent: DailyPuzzle[] = []): DailyPuzzle[] | null {
  const order = ['Medium', 'Hard', 'Hard', 'Expert', 'Expert'] as const;
  const selected: DailyPuzzle[] = [];
  const usedCategories = new Set<string>();
  const usedPatterns = new Set<string>();
  const previousIds = new Set(previous.map((puzzle) => puzzle.id));
  const previousPatterns = new Set(previous.map((puzzle) => puzzle.pattern.type));
  const recentSignatures = new Set(recent.map(signature));

  function choose(slot: number): boolean {
    if (slot === order.length) return true;
    const level = order[slot];
    const pool = available[level];
    const levelSlot = order.slice(0, slot).filter((previousLevel) => previousLevel === level).length;
    const start = positiveModulo(dayOffset * dailyMix[level] + levelSlot, pool.length);
    const consideredStyles = new Set<string>();
    for (let step = 0; step < pool.length; step += 1) {
      const candidate = pool[(start + step) % pool.length];
      const candidateSignature = signature(candidate);
      if (recentSignatures.has(candidateSignature) || previousIds.has(candidate.id) || previousPatterns.has(candidate.pattern.type)) continue;
      if (usedCategories.has(candidate.category) || usedPatterns.has(candidate.pattern.type)) continue;
      const style = candidate.category + '\u0000' + candidate.pattern.type;
      if (consideredStyles.has(style)) continue;
      consideredStyles.add(style);
      selected.push(candidate);
      recentSignatures.add(candidateSignature);
      usedCategories.add(candidate.category);
      usedPatterns.add(candidate.pattern.type);
      if (choose(slot + 1)) return true;
      selected.pop();
      recentSignatures.delete(candidateSignature);
      usedCategories.delete(candidate.category);
      usedPatterns.delete(candidate.pattern.type);
    }
    return false;
  }

  return choose(0) ? selected : null;
}

function selectWithHistory(day: number, available: Pools, adjacent: DailyPuzzle[] = []): DailyPuzzle[] | null {
  const recent: DailyPuzzle[] = [];
  for (let cachedDay = day - cooldownDays + 1; cachedDay < day + cooldownDays; cachedDay += 1) {
    if (!isWithinDailyCooldown(cachedDay, day) || cachedDay === day) continue;
    const lineup = lineupCache.get(cachedDay);
    if (lineup) recent.push(...lineup);
  }
  return selectLineup(day, available, adjacent, recent);
}

function ensureAnchorHistory(available: Pools): void {
  if (lineupCache.has(-1)) return;
  lineupCache.set(-1, selectLineup(-1, available));
  for (let day = -2; day >= -(cooldownDays - 1); day -= 1) {
    const next = lineupCache.get(day + 1);
    lineupCache.set(day, selectWithHistory(day, available, next ?? []));
  }
}

function lineupForOffset(offset: number, available: Pools): DailyPuzzle[] | null {
  if (lineupCache.has(offset)) return lineupCache.get(offset) ?? null;

  ensureAnchorHistory(available);
  if (offset >= 0) {
    for (let day = 0; day <= offset; day += 1) {
      if (lineupCache.has(day)) continue;
      const previous = lineupCache.get(day - 1);
      lineupCache.set(day, selectWithHistory(day, available, previous ?? []));
    }
  } else {
    for (let day = -(cooldownDays); day >= offset; day -= 1) {
      if (lineupCache.has(day)) continue;
      const next = lineupCache.get(day + 1);
      lineupCache.set(day, selectWithHistory(day, available, next ?? []));
    }
  }
  return lineupCache.get(offset) ?? null;
}

export function dailyPuzzles(date: string): DailyPuzzle[] | null {
  if (cache.has(date)) return cache.get(date) ?? null;
  const offset = dayIndex(date);
  const available = pools === undefined ? (pools = makePools()) : pools;
  if (!available) {
    cache.set(date, null);
    return null;
  }
  const selected = lineupForOffset(offset, available);
  cache.set(date, selected);
  return selected;
}

export function dailyIds(date: string): string[] | null {
  const selected = dailyPuzzles(date);
  return selected?.map((puzzle) => puzzle.id) ?? null;
}

export function hasDailyComposition(ids: string[]): boolean {
  if (ids.length !== 5) return false;
  const available = pools === undefined ? (pools = makePools()) : pools;
  if (!available) return false;
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
  return expected !== null && ids.length === expected.length && ids.every((id, index) => id === expected[index]);
}

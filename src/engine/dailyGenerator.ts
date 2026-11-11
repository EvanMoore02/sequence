import type { AuthoredPuzzle } from '../data/puzzleTypes';
import { puzzles as authoredPuzzles } from '../data/puzzles';
import type { Puzzle } from '../types';
import { templates, type GeneratedPuzzle } from './generator';

const levels: Puzzle['difficulty'][] = ['Easy', 'Medium', 'Hard', 'Expert'];
const dailyAnchor = Date.UTC(2026, 10, 2);
const millisecondsPerDay = 86_400_000;
const cooldownDays = 15;
const samplesPerTemplate = 160;
const minimumCandidateCount: Partial<Record<Puzzle['difficulty'], number>> = { Medium: 16, Hard: 32, Expert: 32 };
const cache = new Map<string, DailyPuzzle[] | null>();
const lineupCache = new Map<number, DailyPuzzle[] | null>();
type DailyPuzzle = AuthoredPuzzle | GeneratedPuzzle;
type Pools = Record<Puzzle['difficulty'], DailyPuzzle[]>;
let pools: Pools | undefined;

export function isWithinDailyCooldown(firstDay: number, secondDay: number): boolean {
  return Math.abs(firstDay - secondDay) < cooldownDays;
}

function signature(puzzle: DailyPuzzle): string {
  return JSON.stringify([
    puzzle.visualPattern?.cells ?? puzzle.shapePattern?.sequence ?? puzzle.sequence,
    puzzle.visualPattern?.choices ?? puzzle.shapePattern?.choices ?? null,
    puzzle.visualPattern?.answerIndex ?? puzzle.shapePattern?.answer ?? puzzle.answer,
  ]);
}

function isShapePuzzle(puzzle: DailyPuzzle): boolean {
  return Boolean(puzzle.visualPattern || puzzle.shapePattern || puzzle.pattern.type === 'shape-cycle' || puzzle.pattern.type === 'visual-matrix');
}

function varietyKey(puzzle: DailyPuzzle): string {
  if (puzzle.visualPattern) return 'visual:' + (puzzle.visualPattern.family ?? 'matrix') + ':' + (puzzle.visualPattern.taskFormat ?? 'matrix') + ':' + (puzzle.visualPattern.rows ?? 3) + 'x' + (puzzle.visualPattern.columns ?? 3) + ':' + (puzzle.visualPattern.ruleTypes ?? []).join('+');
  return puzzle.pattern.type + ':' + (puzzle.taskFormat ?? 'next-term');
}

function dailyRuleKey(puzzle: DailyPuzzle): string {
  return puzzle.visualPattern ? 'visual:' + (puzzle.visualPattern.family ?? 'matrix') : puzzle.pattern.type;
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

function makePools(): Pools {
  const collected: Record<Puzzle['difficulty'], Map<string, DailyPuzzle>> = {
    Easy: new Map(), Medium: new Map(), Hard: new Map(), Expert: new Map(),
  };
  const signatures = new Set<string>();
  const add = (puzzle: DailyPuzzle) => {
    const puzzleSignature = signature(puzzle);
    if (signatures.has(puzzleSignature)) return;
    signatures.add(puzzleSignature);
    collected[puzzle.difficulty].set(puzzle.id, puzzle);
  };

  authoredPuzzles.forEach(add);
  for (const template of templates) {
    for (let attempt = 0; attempt < samplesPerTemplate; attempt += 1) {
      add(template.generate(randomFromSeed(hash(template.id + ':' + attempt))));
    }
  }

  // Keep enough distinct options to cover the 15-day cooldown even when a
  // template's initial deterministic samples happen to cluster in one level.
  for (const level of ['Medium', 'Hard', 'Expert'] as const) {
    const target = minimumCandidateCount[level]!;
    for (let attempt = 0; collected[level].size < target && attempt < 512; attempt += 1) {
      const template = templates[attempt % templates.length];
      add(template.generate(randomFromSeed(hash('pool-fill:' + level + ':' + attempt + ':' + template.id))));
    }
  }

  // The Expert slots need one non-shape option and one shape option every day.
  // Keep separate reserves so neither kind can consume the other's cooldown pool.
  const shapeTemplate = templates.find((template) => template.id === 'visual-matrix')!;
  const shapeCount = () => [...collected.Expert.values()].filter(isShapePuzzle).length;
  const expertNonShapeCount = () => [...collected.Expert.values()].filter((puzzle) => !isShapePuzzle(puzzle)).length;
  for (let attempt = 0; shapeCount() < 32 && attempt < 512; attempt += 1) {
    add(shapeTemplate.generate(randomFromSeed(hash('shape-reserve:' + attempt))));
  }
  const nonShapeTemplates = templates.filter((template) => template.id !== 'visual-matrix');
  for (let attempt = 0; expertNonShapeCount() < 32 && attempt < 1024; attempt += 1) {
    const template = nonShapeTemplates[attempt % nonShapeTemplates.length];
    add(template.generate(randomFromSeed(hash('expert-reserve:' + attempt + ':' + template.id))));
  }

  return Object.fromEntries(levels.map((level) => [
    level,
    [...collected[level].values()].sort((left, right) => left.id.localeCompare(right.id)),
  ])) as Pools;
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

const lineupOrder = ['Medium', 'Hard', 'Hard', 'Expert', 'Expert'] as const;

/**
 * Three deterministic passes keep the exact-puzzle cooldown hard while relaxing
 * day-to-day rule variety first, then within-lineup category and rule variety.
 */
function selectLineup(dayOffset: number, available: Pools, previous: DailyPuzzle[] = [], recent: DailyPuzzle[] = []): DailyPuzzle[] {
  const blockedSignatures = new Set(recent.map(signature));
  const previousIds = new Set(previous.map((puzzle) => puzzle.id));
  const previousPatterns = new Set(previous.map(dailyRuleKey));

  for (let pass = 0; pass < 3; pass += 1) {
    const selected: DailyPuzzle[] = [];
    const usedSignatures = new Set(blockedSignatures);
    const usedCategories = new Set<string>();
    const usedPatterns = new Set<string>();
    let failed = false;

    for (let slot = 0; slot < lineupOrder.length; slot += 1) {
      const pool = available[lineupOrder[slot]];
      if (pool.length === 0) throw new Error('No generated puzzles are available for ' + lineupOrder[slot] + ' difficulty.');
      const start = positiveModulo(hash(dayOffset + ':' + slot), pool.length);
      let chosen: DailyPuzzle | undefined;

      for (let step = 0; step < pool.length; step += 1) {
        const candidate = pool[(start + step) % pool.length];
        const shapeSlot = slot === lineupOrder.length - 1;
      if (shapeSlot !== isShapePuzzle(candidate)) continue;
        if (usedSignatures.has(signature(candidate)) || previousIds.has(candidate.id)) continue;
        const variety = varietyKey(candidate);
        if (pass === 0 && previousPatterns.has(dailyRuleKey(candidate))) continue;
        if (pass < 2 && (usedCategories.has(candidate.category) || usedPatterns.has(variety))) continue;
        chosen = candidate;
        break;
      }

      if (!chosen) {
        failed = true;
        break;
      }
      selected.push(chosen);
      usedSignatures.add(signature(chosen));
      usedCategories.add(chosen.category);
      usedPatterns.add(varietyKey(chosen));
    }

    if (!failed) return selected;
  }

  // This should only be reachable if the candidate set is smaller than the
  // cooldown window. Keep the app playable while preserving exact uniqueness.
  const selected: DailyPuzzle[] = [];
  const blocked = new Set([...recent.map(signature), ...previous.map(signature)]);
  for (let slot = 0; slot < lineupOrder.length; slot += 1) {
    const pool = available[lineupOrder[slot]];
    const shapeSlot = slot === lineupOrder.length - 1;
    const candidate = pool.find((item) => isShapePuzzle(item) === shapeSlot && !blocked.has(signature(item)));
    if (!candidate) throw new Error('The Daily Challenge candidate pool is smaller than its 15-day repeat window.');
    selected.push(candidate);
    blocked.add(signature(candidate));
  }
  return selected;
}

function selectWithHistory(day: number, available: Pools, adjacent: DailyPuzzle[] = []): DailyPuzzle[] {
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
    lineupCache.set(day, selectWithHistory(day, available, lineupCache.get(day + 1) ?? []));
  }
}

function lineupForOffset(offset: number, available: Pools): DailyPuzzle[] {
  if (lineupCache.has(offset)) return lineupCache.get(offset)!;
  ensureAnchorHistory(available);
  if (offset >= 0) {
    for (let day = 0; day <= offset; day += 1) {
      if (!lineupCache.has(day)) lineupCache.set(day, selectWithHistory(day, available, lineupCache.get(day - 1) ?? []));
    }
  } else {
    for (let day = -cooldownDays; day >= offset; day -= 1) {
      if (!lineupCache.has(day)) lineupCache.set(day, selectWithHistory(day, available, lineupCache.get(day + 1) ?? []));
    }
  }
  return lineupCache.get(offset)!;
}

export function dailyPuzzles(date: string): DailyPuzzle[] | null {
  if (cache.has(date)) return cache.get(date) ?? null;
  const offset = dayIndex(date);
  const available = pools ?? (pools = makePools());
  const selected = lineupForOffset(offset, available);
  cache.set(date, selected);
  return selected;
}

export function dailyIds(date: string): string[] | null {
  return dailyPuzzles(date)?.map((puzzle) => puzzle.id) ?? null;
}

export function hasDailyComposition(ids: string[]): boolean {
  if (ids.length !== 5) return false;
  const available = pools ?? (pools = makePools());
  const byId = new Map(levels.flatMap((level) => available[level]).map((puzzle) => [puzzle.id, puzzle]));
  const puzzlesForIds = ids.map((id) => byId.get(id));
  if (puzzlesForIds.some((puzzle) => !puzzle)) return false;
  const hasRequiredDifficultyOrder = puzzlesForIds.every((puzzle, index) => puzzle!.difficulty === lineupOrder[index]);
  return hasRequiredDifficultyOrder && puzzlesForIds.some((puzzle) => isShapePuzzle(puzzle!)) && new Set(ids).size === 5;
}

export function isCurrentDailyIds(date: string, ids: string[]): boolean {
  const expected = dailyIds(date);
  return expected !== null && ids.length === expected.length && ids.every((id, index) => id === expected[index]);
}

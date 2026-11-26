import type { AuthoredPuzzle } from '../data/puzzleTypes';
import { puzzles as authoredPuzzles } from '../data/puzzles';
import type { Puzzle } from '../types';
import type { AnswerPattern } from '../data/puzzleTypes';
import { templates, type GeneratedPuzzle } from './generator';
import { rateDifficulty } from './difficulty';
import { makeDailyLetterPuzzles } from './letterPuzzles';

const levels: Puzzle['difficulty'][] = ['Easy', 'Medium', 'Hard', 'Expert'];
const dailyAnchor = Date.UTC(2026, 10, 2);
const millisecondsPerDay = 86_400_000;
const cooldownDays = 15;
const newSelectorStartDate = '2026-11-26';
const samplesPerTemplate = 160;
const minimumCandidateCount: Partial<Record<Puzzle['difficulty'], number>> = { Medium: 16, Hard: 32, Expert: 32 };
const cache = new Map<string, DailyPuzzle[] | null>();
const lineupCache = new Map<number, DailyPuzzle[] | null>();
type DailyLetterPuzzle = Puzzle & { pattern: AnswerPattern; letterPattern: NonNullable<Puzzle['letterPattern']> };
type DailyPuzzle = AuthoredPuzzle | GeneratedPuzzle | DailyLetterPuzzle;
type Pools = Record<Puzzle['difficulty'], DailyPuzzle[]>;
let legacyPools: Pools | undefined;
let diversePools: Pools | undefined;
const groupedPoolCache = new WeakMap<DailyPuzzle[], Map<string, DailyPuzzle[]>>();
const groupedFamilyPoolCache = new WeakMap<DailyPuzzle[], Map<string, DailyPuzzle[]>>();

function groupedByRule(pool: DailyPuzzle[]): Map<string, DailyPuzzle[]> {
  const cached = groupedPoolCache.get(pool);
  if (cached) return cached;
  const groups = new Map<string, DailyPuzzle[]>();
  for (const puzzle of pool) {
    const key = dailyRuleKey(puzzle);
    const group = groups.get(key) ?? [];
    group.push(puzzle);
    groups.set(key, group);
  }
  groupedPoolCache.set(pool, groups);
  return groups;
}

export function isWithinDailyCooldown(firstDay: number, secondDay: number): boolean {
  return Math.abs(firstDay - secondDay) < cooldownDays;
}

function signature(puzzle: DailyPuzzle): string {
  return JSON.stringify([
    puzzle.visualPattern?.cells ?? puzzle.shapePattern?.sequence ?? puzzle.letterPattern?.sequence ?? puzzle.sequence,
    puzzle.visualPattern?.choices ?? puzzle.shapePattern?.choices ?? null,
    puzzle.visualPattern?.answerIndex ?? puzzle.shapePattern?.answer ?? puzzle.letterPattern?.answer ?? puzzle.answer,
  ]);
}

function isShapePuzzle(puzzle: DailyPuzzle): boolean {
  return !puzzle.letterPattern && Boolean(puzzle.visualPattern || puzzle.shapePattern || puzzle.pattern.type === 'shape-cycle' || puzzle.pattern.type === 'visual-matrix');
}

function varietyKey(puzzle: DailyPuzzle): string {
  if (puzzle.letterPattern) return 'letter:' + puzzle.letterPattern.family + ':' + puzzle.letterPattern.firstStep + ':' + (puzzle.letterPattern.secondStep ?? '');
  if (puzzle.visualPattern) return 'visual:' + (puzzle.visualPattern.family ?? 'matrix') + ':' + (puzzle.visualPattern.taskFormat ?? 'matrix') + ':' + (puzzle.visualPattern.rows ?? 3) + 'x' + (puzzle.visualPattern.columns ?? 3) + ':' + (puzzle.visualPattern.ruleTypes ?? []).join('+');
  return puzzle.pattern.type + ':' + (puzzle.taskFormat ?? 'next-term');
}

function dailyRuleKey(puzzle: DailyPuzzle): string {
  if (puzzle.letterPattern) return 'letter-sequence';
  return puzzle.visualPattern ? 'visual:' + (puzzle.visualPattern.family ?? 'matrix') : puzzle.pattern.type;
}

// Family keys ignore numeric parameters so 2-step and 3-step variants still
// count as the same underlying reasoning pattern.
function patternFamilyKey(puzzle: DailyPuzzle): string {
  if (puzzle.letterPattern) return 'letter:' + puzzle.letterPattern.family;
  if (puzzle.visualPattern) return 'visual:' + (puzzle.visualPattern.family ?? 'matrix') + ':' + (puzzle.visualPattern.taskFormat ?? 'complete-matrix');
  return 'number:' + puzzle.pattern.type;
}

function groupedByFamily(pool: DailyPuzzle[]): Map<string, DailyPuzzle[]> {
  const cached = groupedFamilyPoolCache.get(pool);
  if (cached) return cached;
  const groups = new Map<string, DailyPuzzle[]>();
  for (const puzzle of pool) {
    const key = patternFamilyKey(puzzle);
    const group = groups.get(key) ?? [];
    group.push(puzzle);
    groups.set(key, group);
  }
  groupedFamilyPoolCache.set(pool, groups);
  return groups;
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

function asLegacyPuzzle(puzzle: DailyPuzzle): DailyPuzzle {
  if (puzzle.visualPattern) return { ...puzzle, difficulty: 'Expert', difficultyScore: rateDifficulty(puzzle.sequence, puzzle.answer, puzzle.pattern).score };
  if (puzzle.letterPattern) return { ...puzzle, difficulty: 'Medium' };
  return puzzle;
}

function makePools(legacy = false): Pools {
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
  for (const [index, puzzle] of makeDailyLetterPuzzles().entries()) {
    const candidate = { ...puzzle, sequence: [index], pattern: { type: 'visual-matrix', shapeStep: 1, fillByRow: false, rotationByColumn: false } } as DailyLetterPuzzle;
    add(legacy ? asLegacyPuzzle(candidate) : candidate);
  }
  for (const template of templates) {
    const sampleCount = template.id === 'alternating-operations' ? samplesPerTemplate / 4 : samplesPerTemplate;
    for (let attempt = 0; attempt < sampleCount; attempt += 1) {
      const candidate = template.generate(randomFromSeed(hash(template.id + ':' + attempt)));
      add(legacy ? asLegacyPuzzle(candidate) : candidate);
    }
  }

  // Each visual difficulty tier needs enough distinct puzzles to satisfy the
  // daily slot and exact-puzzle cooldown constraints after the cutover.
  const shapeTemplate = templates.find((template) => template.id === 'visual-matrix')!;
  if (!legacy) {
    for (const level of ['Medium', 'Hard', 'Expert'] as const) {
      const visualCount = () => [...collected[level].values()].filter(isShapePuzzle).length;
      for (let attempt = 0; visualCount() < 32 && attempt < 2048; attempt += 1) {
        add(shapeTemplate.generate(randomFromSeed(hash('shape-tier:' + level + ':' + attempt))));
      }
    }
  }

  // Keep enough distinct options to cover the 15-day cooldown even when a
  // template's initial deterministic samples happen to cluster in one level.
  for (const level of ['Medium', 'Hard', 'Expert'] as const) {
    const target = minimumCandidateCount[level]!;
    for (let attempt = 0; collected[level].size < target && attempt < 512; attempt += 1) {
      const template = templates[attempt % templates.length];
      const candidate = template.generate(randomFromSeed(hash('pool-fill:' + level + ':' + attempt + ':' + template.id)));
      add(legacy ? asLegacyPuzzle(candidate) : candidate);
    }
  }

  // The Expert slots need one non-shape option and one shape option every day.
  // Keep separate reserves so neither kind can consume the other's cooldown pool.
  const shapeCount = () => [...collected.Expert.values()].filter(isShapePuzzle).length;
  const expertNonShapeCount = () => [...collected.Expert.values()].filter((puzzle) => !isShapePuzzle(puzzle)).length;
  for (let attempt = 0; shapeCount() < 32 && attempt < 512; attempt += 1) {
    const candidate = shapeTemplate.generate(randomFromSeed(hash('shape-reserve:' + attempt)));
    add(legacy ? asLegacyPuzzle(candidate) : candidate);
  }
  const nonShapeTemplates = templates.filter((template) => template.id !== 'visual-matrix');
  for (let attempt = 0; expertNonShapeCount() < 32 && attempt < 1024; attempt += 1) {
    const template = nonShapeTemplates[attempt % nonShapeTemplates.length];
    const candidate = template.generate(randomFromSeed(hash('expert-reserve:' + attempt + ':' + template.id)));
    add(legacy ? asLegacyPuzzle(candidate) : candidate);
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

function shapeSlotForDay(dayOffset: number): number {
  // Rotate visual puzzles between the two Expert slots so they do not always
  // appear at the end of the challenge.
  return 3 + positiveModulo(dayOffset, 2);
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
  const shapeSlot = shapeSlotForDay(dayOffset);
  const recentRuleCounts = new Map<string, number>();
  for (const puzzle of recent) recentRuleCounts.set(dailyRuleKey(puzzle), (recentRuleCounts.get(dailyRuleKey(puzzle)) ?? 0) + 1);

  for (let pass = 0; pass < 3; pass += 1) {
    const selected: DailyPuzzle[] = [];
    const usedSignatures = new Set(blockedSignatures);
    const usedCategories = new Set<string>();
    const usedPatterns = new Set<string>();
    let failed = false;

    for (let slot = 0; slot < lineupOrder.length; slot += 1) {
      const pool = available[lineupOrder[slot]];
      if (pool.length === 0) throw new Error('No generated puzzles are available for ' + lineupOrder[slot] + ' difficulty.');
      const grouped = groupedByRule(pool);
      const wantsLetters = positiveModulo(dayOffset, 3) === 2;
      const types = [...grouped.keys()].filter((type) => (type === 'letter-sequence') === (wantsLetters && slot === 0)).sort((left, right) =>
        (recentRuleCounts.get(left) ?? 0) - (recentRuleCounts.get(right) ?? 0)
        || hash(dayOffset + ':' + slot + ':' + pass + ':' + left) - hash(dayOffset + ':' + slot + ':' + pass + ':' + right));
      let chosen: DailyPuzzle | undefined;
      for (const type of types) {
        const candidates = grouped.get(type)!;
        const variantStart = positiveModulo(hash(dayOffset + ':' + slot + ':' + pass + ':' + type), candidates.length);
        for (let step = 0; step < candidates.length; step += 1) {
          const candidate = candidates[(variantStart + step) % candidates.length];
          const wantsShape = slot === shapeSlot;
          if (wantsShape !== isShapePuzzle(candidate)) continue;
          if (usedSignatures.has(signature(candidate)) || previousIds.has(candidate.id)) continue;
          const variety = varietyKey(candidate);
          if (pass === 0 && previousPatterns.has(type)) continue;
          if (pass < 2 && (usedCategories.has(candidate.category) || usedPatterns.has(variety))) continue;
          chosen = candidate;
          break;
        }
        if (chosen) break;
      }

      if (!chosen) {
        failed = true;
        break;
      }
      selected.push(chosen);
      const chosenType = dailyRuleKey(chosen);
      recentRuleCounts.set(chosenType, (recentRuleCounts.get(chosenType) ?? 0) + 1);
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
    const wantsShape = slot === shapeSlot;
    const wantsLetters = positiveModulo(dayOffset, 3) === 2;
    const candidate = pool.find((item) => isShapePuzzle(item) === wantsShape && Boolean(item.letterPattern) === (wantsLetters && slot === 0) && !blocked.has(signature(item)));
    if (!candidate) throw new Error('The Daily Challenge candidate pool is smaller than its 15-day repeat window.');
    selected.push(candidate);
    blocked.add(signature(candidate));
  }
  return selected;
}

function selectDiverseLineup(dayOffset: number, available: Pools, history: DailyPuzzle[], blockedSignatures: Set<string>, previous: DailyPuzzle[]): DailyPuzzle[] {
  const recentFamilyCounts = new Map<string, number>();
  for (const puzzle of history) {
    const family = patternFamilyKey(puzzle);
    recentFamilyCounts.set(family, (recentFamilyCounts.get(family) ?? 0) + 1);
  }
  const requireLetter = positiveModulo(dayOffset, 3) === 2;
  const daysSinceCutover = dayOffset - dayIndex(newSelectorStartDate);
  const targetVisualSlot = positiveModulo(daysSinceCutover, lineupOrder.length);
  // This cycle spreads letters across all five slots without colliding with
  // the visual slot on any every-third-day challenge.
  const letterSlotCycle = [0, 1, 4, 2, 3] as const;
  const targetLetterSlot = requireLetter
    ? letterSlotCycle[positiveModulo(Math.floor(daysSinceCutover / 3), letterSlotCycle.length)]
    : -1;
  const previousRuleTypes = new Set(previous.filter((puzzle) => !isShapePuzzle(puzzle) && !puzzle.letterPattern).map((puzzle) => puzzle.pattern.type));
  const selected: DailyPuzzle[] = [];
  const usedFamilies = new Set<string>();
  const usedCategoryCounts = new Map<string, number>();
  const usedSignatures = new Set(blockedSignatures);

  function search(slot: number, visualCount: number, letterCount: number): boolean {
    if (slot === lineupOrder.length) return visualCount === 1 && letterCount === (requireLetter ? 1 : 0);
    const pool = available[lineupOrder[slot]];
    const grouped = groupedByFamily(pool);
    const familyKeys = [...grouped.keys()].filter((family) => !usedFamilies.has(family)).sort((left, right) =>
      (recentFamilyCounts.get(left) ?? 0) - (recentFamilyCounts.get(right) ?? 0)
      || hash(dayOffset + ':' + slot + ':' + left) - hash(dayOffset + ':' + slot + ':' + right)
      || left.localeCompare(right));

    for (const family of familyKeys) {
      const candidates = grouped.get(family)!
        .filter((candidate) => {
          const visual = isShapePuzzle(candidate);
          const letter = Boolean(candidate.letterPattern);
          return !usedSignatures.has(signature(candidate))
            && (visual === (slot === targetVisualSlot))
            && (letter === (slot === targetLetterSlot))
            && (visual || letter || !previousRuleTypes.has(candidate.pattern.type));
        });
      const variantStart = candidates.length ? positiveModulo(hash(dayOffset + ':' + slot + ':' + family), candidates.length) : 0;

      for (let categoryPass = 0; categoryPass < 2; categoryPass += 1) for (let step = 0; step < candidates.length; step += 1) {
        const candidate = candidates[(variantStart + step) % candidates.length];
        if (categoryPass === 0 && usedCategoryCounts.has(candidate.category)) continue;
        const visual = isShapePuzzle(candidate);
        const letter = Boolean(candidate.letterPattern);
        const puzzleSignature = signature(candidate);
        selected.push(candidate);
        usedFamilies.add(family);
        usedCategoryCounts.set(candidate.category, (usedCategoryCounts.get(candidate.category) ?? 0) + 1);
        usedSignatures.add(puzzleSignature);
        if (search(slot + 1, visualCount + Number(visual), letterCount + Number(letter))) return true;
        selected.pop();
        usedFamilies.delete(family);
        const categoryCount = usedCategoryCounts.get(candidate.category)! - 1;
        if (categoryCount === 0) usedCategoryCounts.delete(candidate.category);
        else usedCategoryCounts.set(candidate.category, categoryCount);
        usedSignatures.delete(puzzleSignature);
      }
    }
    return false;
  }

  if (!search(0, 0, 0)) {
    throw new Error('The Daily Challenge candidate pool cannot satisfy its difficulty, visual, letter, cooldown, and unique-family requirements.');
  }
  return selected;
}

function selectDiverseWithHistory(day: number, available: Pools): DailyPuzzle[] {
  const recentHistory: DailyPuzzle[] = [];
  const blockedSignatures = new Set<string>();
  for (let priorDay = day - cooldownDays; priorDay < day; priorDay += 1) {
    const lineup = lineupCache.get(priorDay);
    if (!lineup) continue;
    recentHistory.push(...lineup);
    if (isWithinDailyCooldown(priorDay, day)) for (const puzzle of lineup) blockedSignatures.add(signature(puzzle));
  }
  return selectDiverseLineup(day, available, recentHistory, blockedSignatures, lineupCache.get(day - 1) ?? []);
}

function poolsForDay(day: number): Pools {
  if (day >= dayIndex(newSelectorStartDate)) return diversePools ?? (diversePools = makePools());
  return legacyPools ?? (legacyPools = makePools(true));
}

function selectWithHistory(day: number, adjacent: DailyPuzzle[] = []): DailyPuzzle[] {
  const available = poolsForDay(day);
  if (day >= dayIndex(newSelectorStartDate)) return selectDiverseWithHistory(day, available);
  const recent: DailyPuzzle[] = [];
  for (let cachedDay = day - cooldownDays + 1; cachedDay < day + cooldownDays; cachedDay += 1) {
    if (!isWithinDailyCooldown(cachedDay, day) || cachedDay === day) continue;
    const lineup = lineupCache.get(cachedDay);
    if (lineup) recent.push(...lineup);
  }
  return selectLineup(day, available, adjacent, recent);
}

function ensureAnchorHistory(): void {
  if (lineupCache.has(-1)) return;
  const available = poolsForDay(-1);
  lineupCache.set(-1, selectLineup(-1, available));
  for (let day = -2; day >= -(cooldownDays - 1); day -= 1) {
    lineupCache.set(day, selectWithHistory(day, lineupCache.get(day + 1) ?? []));
  }
}

function lineupForOffset(offset: number): DailyPuzzle[] {
  if (lineupCache.has(offset)) return lineupCache.get(offset)!;
  ensureAnchorHistory();
  if (offset >= 0) {
    for (let day = 0; day <= offset; day += 1) {
      if (!lineupCache.has(day)) lineupCache.set(day, selectWithHistory(day, lineupCache.get(day - 1) ?? []));
    }
  } else {
    for (let day = -cooldownDays; day >= offset; day -= 1) {
      if (!lineupCache.has(day)) lineupCache.set(day, selectWithHistory(day, lineupCache.get(day + 1) ?? []));
    }
  }
  return lineupCache.get(offset)!;
}

export function dailyPuzzles(date: string): DailyPuzzle[] | null {
  if (cache.has(date)) return cache.get(date) ?? null;
  const offset = dayIndex(date);
  const selected = lineupForOffset(offset);
  cache.set(date, selected);
  return selected;
}

export function dailyIds(date: string): string[] | null {
  return dailyPuzzles(date)?.map((puzzle) => puzzle.id) ?? null;
}

export function hasDailyComposition(ids: string[]): boolean {
  if (ids.length !== 5) return false;
  const legacy = legacyPools ?? (legacyPools = makePools(true));
  const diverse = diversePools ?? (diversePools = makePools());
  const byId = new Map([...levels.flatMap((level) => legacy[level]), ...levels.flatMap((level) => diverse[level])].map((puzzle) => [puzzle.id, puzzle]));
  const puzzlesForIds = ids.map((id) => byId.get(id));
  if (puzzlesForIds.some((puzzle) => !puzzle)) return false;
  const hasRequiredDifficultyOrder = puzzlesForIds.every((puzzle, index) => puzzle!.difficulty === lineupOrder[index]);
  const shapeSlots = puzzlesForIds.flatMap((puzzle, index) => isShapePuzzle(puzzle!) ? [index] : []);
  return hasRequiredDifficultyOrder && shapeSlots.length === 1 && new Set(ids).size === 5;
}

export function isCurrentDailyIds(date: string, ids: string[]): boolean {
  const expected = dailyIds(date);
  return expected !== null && ids.length === expected.length && ids.every((id, index) => id === expected[index]);
}

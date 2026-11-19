import { describe, expect, it } from 'vitest';
import { templates } from '../src/engine/generator.ts';
import { parseReviewText, selectRepresentativeSamples, validateReviews } from '../scripts/review-visual-explanations.mjs';

describe('offline visual explanation review helpers', () => {
  const visualTemplate = templates.find((template) => template.id === 'visual-matrix');

  it('selects one deterministic sample for every visual pattern family', () => {
    const samples = selectRepresentativeSamples(visualTemplate);
    expect(samples).toHaveLength(8);
    expect(new Set(samples.map((sample) => sample.family)).size).toBe(8);
    for (const sample of samples) {
      expect(sample.grid.flat()).toContain('MISSING');
      expect(sample.answerTile).toBeTruthy();
      expect(sample.currentExplanation).toContain(`Option ${sample.correctOption}`);
    }
  });

  it('accepts complete human-reviewable results and rejects incorrect options', () => {
    const samples = selectRepresentativeSamples(visualTemplate);
    const result = { reviews: samples.map((sample) => ({
      puzzleId: sample.puzzleId,
      family: sample.family,
      status: 'ready',
      issues: [],
      improvedExplanation: `Correct answer: Option ${sample.correctOption}. The pattern completes the missing tile.`,
    })) };
    expect(validateReviews(result, samples)).toEqual(result);
    result.reviews[0].improvedExplanation = 'This names a different choice: Option Z.';
    expect(() => validateReviews(result, samples)).toThrow('does not name the correct option');
  });

  it('parses JSON responses with optional markdown fences', () => {
    expect(parseReviewText('```json\n{"reviews":[]}\n```')).toEqual({ reviews: [] });
    expect(() => parseReviewText('not json')).toThrow('not valid JSON');
  });
});

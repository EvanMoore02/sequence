import { createJiti } from 'jiti';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultOutput = resolve(scriptDirectory, '../review-output/visual-explanation-review.json');

export function rngFrom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function describeTile(tile) {
  if (!tile) return null;
  return tile.map((shape) => ({
    shape: shape.kind,
    fill: shape.fill,
    rotationDegreesClockwise: shape.rotation,
    count: shape.count ?? 1,
    corner: shape.slot === undefined ? null : ['top-left', 'top-right', 'bottom-left', 'bottom-right'][shape.slot],
  }));
}

export function selectRepresentativeSamples(visualTemplate) {
  const samples = new Map();
  for (let seed = 1; seed <= 512 && samples.size < 8; seed += 1) {
    const puzzle = visualTemplate.generate(rngFrom(seed * 104729));
    const visual = puzzle.visualPattern;
    if (!visual?.family || samples.has(visual.family)) continue;
    const optionLetter = String.fromCharCode(65 + visual.answerIndex);
    samples.set(visual.family, {
      puzzleId: puzzle.id,
      family: visual.family,
      taskFormat: visual.taskFormat ?? 'complete-matrix',
      rows: visual.rows,
      columns: visual.columns,
      missingPosition: {
        row: Math.floor(visual.missingIndex / visual.columns) + 1,
        column: visual.missingIndex % visual.columns + 1,
      },
      grid: Array.from({ length: visual.rows }, (_, row) =>
        Array.from({ length: visual.columns }, (_, column) => {
          const index = row * visual.columns + column;
          return index === visual.missingIndex ? 'MISSING' : describeTile(visual.cells[index]);
        }),
      ),
      ruleTypes: visual.ruleTypes ?? [],
      ruleText: visual.ruleText,
      correctOption: optionLetter,
      answerTile: describeTile(visual.choices[visual.answerIndex]),
      currentExplanation: puzzle.explanation,
    });
  }
  if (samples.size !== 8) {
    throw new Error(`Found ${samples.size} of 8 visual pattern families in the deterministic sample range.`);
  }
  return [...samples.values()];
}

export function validateReviews(result, samples) {
  if (!result || !Array.isArray(result.reviews) || result.reviews.length !== samples.length) {
    throw new Error('AI response must contain exactly one review per sample.');
  }
  const expected = new Map(samples.map((sample) => [sample.puzzleId, sample]));
  const seen = new Set();
  for (const review of result.reviews) {
    const sample = expected.get(review?.puzzleId);
    if (!sample || seen.has(review.puzzleId) || review.family !== sample.family) {
      throw new Error('AI response contains a missing, duplicate, or mismatched puzzle review.');
    }
    seen.add(review.puzzleId);
    if (!['ready', 'flag'].includes(review.status) || !Array.isArray(review.issues) || !review.issues.every((issue) => typeof issue === 'string')) {
      throw new Error(`AI response for ${review.puzzleId} has an invalid review status or issue list.`);
    }
    if (review.status === 'ready') {
      if (typeof review.improvedExplanation !== 'string' || !review.improvedExplanation.trim()) {
        throw new Error(`AI response for ${review.puzzleId} is marked ready but has no explanation.`);
      }
      if (!review.improvedExplanation.includes(`Option ${sample.correctOption}`)) {
        throw new Error(`AI response for ${review.puzzleId} does not name the correct option.`);
      }
    } else if (!review.issues.length || review.improvedExplanation !== null) {
      throw new Error(`AI response for ${review.puzzleId} must explain its flag and omit a rewrite.`);
    }
  }
  return result;
}

export function parseReviewText(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error('AI review was not valid JSON. No report was written.');
  }
}

function postResponse(apiKey, model, instructions, samples) {
  const payload = JSON.stringify({
    model,
    max_output_tokens: 6000,
    input: [
      { role: 'system', content: instructions },
      { role: 'user', content: JSON.stringify({ puzzles: samples }) },
    ],
  });
  return new Promise((resolvePromise, rejectPromise) => {
    const request = https.request('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if ((response.statusCode ?? 500) < 200 || (response.statusCode ?? 500) >= 300) {
          rejectPromise(new Error(`OpenAI Responses API returned HTTP ${response.statusCode}: ${body.slice(0, 1000)}`));
          return;
        }
        try {
          resolvePromise(JSON.parse(body));
        } catch {
          rejectPromise(new Error('OpenAI Responses API returned invalid JSON.'));
        }
      });
    });
    request.setTimeout(60000, () => request.destroy(new Error('OpenAI request timed out after 60 seconds.')));
    request.on('error', rejectPromise);
    request.end(payload);
  });
}

async function loadVisualTemplate() {
  const jiti = createJiti(import.meta.url);
  const generator = await jiti.import('../src/engine/generator.ts');
  const template = generator.templates.find((item) => item.id === 'visual-matrix');
  if (!template) throw new Error('Could not find the visual-matrix generator template.');
  return template;
}

function getArguments(args) {
  let output = defaultOutput;
  let dryRun = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--dry-run') dryRun = true;
    else if (args[index] === '--output' && args[index + 1]) output = resolve(args[++index]);
    else throw new Error(`Unknown or incomplete argument: ${args[index]}`);
  }
  return { output, dryRun };
}

async function main(args = process.argv.slice(2)) {
  const { output, dryRun } = getArguments(args);
  const template = await loadVisualTemplate();
  const samples = selectRepresentativeSamples(template);
  const instructions = await readFile(new URL('./prompts/visual-explanation-review.md', import.meta.url), 'utf8');
  if (dryRun) {
    process.stdout.write(JSON.stringify({ instructions, puzzles: samples }, null, 2) + '\n');
    return;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-6-luna';
  if (!apiKey) throw new Error('Set OPENAI_API_KEY to run the AI review.');
  const response = await postResponse(apiKey, model, instructions, samples);
  if (response.status && response.status !== 'completed') throw new Error(`AI response ended with status ${response.status}.`);
  const text = response.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === 'output_text')?.text;
  if (typeof text !== 'string') throw new Error('OpenAI response did not contain review text.');
  const reviews = validateReviews(parseReviewText(text), samples);
  const report = {
    provider: 'OpenAI Responses API',
    model,
    createdAt: new Date().toISOString(),
    note: 'AI suggestions require human review and are not applied to source files.',
    reviews: reviews.reviews,
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', 'utf8');
  process.stdout.write(`Saved ${reviews.reviews.length} family reviews to ${output}\n`);
  process.stdout.write(`${reviews.reviews.filter((review) => review.status === 'flag').length} sample(s) flagged for manual review.\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Visual explanation review failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

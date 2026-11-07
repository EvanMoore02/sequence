import { expect, test, type Page } from '@playwright/test';

async function openFreshGame(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const guide = page.getByRole('dialog', { name: 'How to play' });
  if (await guide.isVisible().catch(() => false)) await guide.getByRole('button', { name: /got it/i }).click();
}

async function getTodayAnswers(page: Page) {
  return page.evaluate(async () => {
    const now = new Date();
    const date = String(now.getFullYear()) + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const [{ dailyPuzzles }, { missingTerms }] = await Promise.all([
      import('/src/engine/dailyGenerator.ts'),
      import('/src/engine/missingTerms.ts'),
    ]);
    const puzzles = dailyPuzzles(date);
    if (!puzzles) throw new Error(`Daily puzzles unavailable for ${date}`);
    return puzzles.map((puzzle) => ({ answers: missingTerms(puzzle), difficulty: puzzle.difficulty }));
  });
}

test('first visit shows the guide and Help can reopen it', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const guide = page.getByRole('dialog', { name: 'How to play' });
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('Skipping a Daily puzzle gives 0 points');
  await guide.getByRole('button', { name: /got it/i }).click();
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(guide).toBeVisible();
});

test('Daily skip gives zero points and continues through the challenge', async ({ page }) => {
  await openFreshGame(page);
  await page.getByRole('button', { name: /play today.s challenge/i }).click();
  await page.getByRole('button', { name: /skip puzzle.*0 points/i }).click();
  await expect(page.getByRole('dialog')).toContainText('0 pts');
  await page.getByRole('button', { name: /next puzzle/i }).click();
  for (let index = 1; index < 5; index += 1) {
    const answers = await page.evaluate(async () => { const now = new Date(); const date = String(now.getFullYear()) + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'); const { dailyPuzzles } = await import('/src/engine/dailyGenerator.ts'); const { missingTerms } = await import('/src/engine/missingTerms.ts'); return missingTerms(dailyPuzzles(date)![JSON.parse(localStorage.getItem('sequence.prototype.v1')!).run.index]); });
    await page.getByLabel('Your answer').fill(answers.join(', '));
    await page.getByRole('button', { name: /submit answer/i }).click();
    if (index < 4) await page.getByRole('button', { name: /next puzzle/i }).click();
  }
  await expect(page.getByText('DAILY CHALLENGE COMPLETE')).toBeVisible();
  await expect(page.locator('.resultrow').first()).toContainText('0 pts');
  await expect(page.locator('.score')).not.toHaveText('500 / 500');
});

test('Daily Challenge resumes, follows the difficulty order, and shows results', async ({ page }) => {
  await openFreshGame(page);
  const puzzles = await getTodayAnswers(page);
  expect(puzzles.map((puzzle) => puzzle.difficulty)).toEqual(['Medium', 'Hard', 'Hard', 'Expert', 'Expert']);

  await page.getByRole('button', { name: /play today.s challenge/i }).click();
  await expect(page.locator('.difficulty')).toHaveCount(0);

  // Make one incorrect attempt, reload, and confirm the saved run resumes in place.
  const wrongAnswers = [...puzzles[0].answers];
  wrongAnswers[0] += 1;
  await page.getByLabel('Your answer').fill(wrongAnswers.join(', '));
  await page.getByRole('button', { name: /submit answer/i }).click();
  await expect(page.getByRole('status')).toContainText('Not quite');
  await expect(page.locator('.attempts .spent')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: /continue challenge/i }).click();
  await expect(page.getByRole('heading', { name: 'Puzzle 1' })).toBeVisible();
  await expect(page.locator('.attempts .spent')).toHaveCount(1);

  for (let index = 0; index < puzzles.length; index += 1) {
    await expect(page.locator('.difficulty')).toHaveCount(0);
    await page.getByLabel('Your answer').fill(puzzles[index].answers.join(', '));
    await page.getByRole('button', { name: /submit answer/i }).click();
    if (index < puzzles.length - 1) {
      await expect(page.locator('.explain')).toBeVisible();
      await page.getByRole('button', { name: /next puzzle/i }).click();
    }
  }

  await expect(page.getByText('DAILY CHALLENGE COMPLETE')).toBeVisible();
  await expect(page.locator('.resultrow')).toHaveCount(5);
  await expect(page.getByText('5/5')).toBeVisible();
  const rowTotal = await page.locator('.resultrow > strong').evaluateAll((nodes) =>
    nodes.reduce((total, node) => total + Number(node.textContent?.replace(/[^0-9]/g, '')), 0),
  );
  await expect(page.locator('.score')).toHaveText(rowTotal + ' / 500');
});

test('skipping the fifth Daily puzzle completes the challenge for 0 points', async ({ page }) => {
  await openFreshGame(page);
  await page.getByRole('button', { name: /play today.s challenge/i }).click();
  for (let index = 0; index < 4; index += 1) {
    const answers = await page.evaluate(async () => { const now = new Date(); const date = String(now.getFullYear()) + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'); const { dailyPuzzles } = await import('/src/engine/dailyGenerator.ts'); const { missingTerms } = await import('/src/engine/missingTerms.ts'); const state = JSON.parse(localStorage.getItem('sequence.prototype.v1')!); return missingTerms(dailyPuzzles(date)![state.run.index]); });
    await page.getByLabel('Your answer').fill(answers.join(', '));
    await page.getByRole('button', { name: /submit answer/i }).click();
    await page.getByRole('button', { name: /next puzzle/i }).click();
  }
  await page.getByRole('button', { name: /skip puzzle.*0 points/i }).click();
  await expect(page.getByText('DAILY CHALLENGE COMPLETE')).toBeVisible();
  await expect(page.locator('.resultrow').last()).toContainText('0 pts');
});

test('local preview shows 50 upcoming challenges and their five puzzles', async ({ page }) => {
  await openFreshGame(page);
  await page.getByRole('button', { name: /preview upcoming challenges/i }).click();
  await expect(page.getByRole('heading', { name: 'Upcoming Daily Challenges' })).toBeVisible();
  const days = page.locator('.daily-preview-day');
  await expect(days).toHaveCount(50);

  await days.first().locator(':scope > summary').click();
  await expect(days.first().locator('.daily-preview-puzzle')).toHaveCount(5);
  await days.first().locator('.daily-preview-hints > summary').first().click();
  await expect(days.first().locator('.daily-preview-hints[open]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Expand all' }).click();
  await expect(page.locator('.daily-preview-day[open]')).toHaveCount(50);
  await page.getByRole('button', { name: 'Collapse all' }).click();
  await expect(page.locator('.daily-preview-day[open]')).toHaveCount(0);
});

test('Practice skip reveals the answer and advances without touching Daily stats', async ({ page }) => {
  await openFreshGame(page);
  await page.getByRole('button', { name: /practice/i }).click();
  await page.getByRole('button', { name: /^Easy\b/ }).click();
  const dailyBefore = await page.evaluate(() => localStorage.getItem('sequence.prototype.v1'));
  await page.getByRole('button', { name: 'Skip puzzle' }).click();
  await expect(page.getByRole('dialog')).toContainText('Puzzle skipped');
  await expect(page.getByRole('dialog')).toContainText('Answer:');
  await page.getByRole('button', { name: /next puzzle/i }).click();
  expect(await page.evaluate(() => localStorage.getItem('sequence.prototype.v1'))).toBe(dailyBefore);
});

test('Hard Practice hides and accepts the next number', async ({ page }) => {
  await openFreshGame(page);
  await page.getByRole('button', { name: /practice/i }).click();
  await page.getByRole('button', { name: /^Hard\b/ }).click();

  const answers = await page.evaluate(async () => {
    const saved = JSON.parse(localStorage.getItem('sequence.practice.v1') || 'null');
    const { missingTerms } = await import('/src/engine/missingTerms.ts');
    return saved?.puzzle ? missingTerms(saved.puzzle) as number[] : null;
  });
  expect(answers).toHaveLength(1);

  await page.getByLabel('Your answer').fill(answers!.join(', '));
  await page.getByRole('button', { name: /^Submit/ }).click();
  await expect(page.locator('.practice-answer')).toBeVisible();
  await expect(page.locator('.practice-prompt .success')).toHaveCount(1);
});

test('Endless can be solved and advanced with the Next puzzle action', async ({ page }) => {
  await openFreshGame(page);
  await page.getByRole('button', { name: /endless/i }).click();
  await page.getByRole('button', { name: /start classic/i }).click();

  const answers = await page.evaluate(async () => {
    const saved = JSON.parse(localStorage.getItem('sequence.endless.v1') || 'null');
    const { missingTerms } = await import('/src/engine/missingTerms.ts');
    return saved?.run?.puzzle ? missingTerms(saved.run.puzzle) as number[] : null;
  });
  expect(answers).not.toBeNull();

  await page.getByLabel('Your answer').fill(answers!.join(', '));
  await page.getByRole('button', { name: /submit answer/i }).click();
  await expect(page.locator('.earned')).toBeVisible();

  const nextPuzzle = page.getByRole('button', { name: /next puzzle/i });
  await expect(nextPuzzle).toBeVisible();
  await expect(nextPuzzle).toBeInViewport();
  await nextPuzzle.click();
  await expect(page.getByRole('heading', { name: 'Puzzle 2' })).toBeVisible();
});

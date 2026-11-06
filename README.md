# SEQUENCE

A local daily number puzzle prototype built with React, TypeScript, and Vite.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Daily progress, Practice and Endless sessions, settings, and statistics are saved in this browser on this device. There are no accounts or cloud backups; clearing browser data may erase saved progress, and it will not sync across devices.

## Modes

- **Daily Challenge:** five date-selected puzzles, three attempts each, hints, scoring, streaks, and results.
- **Practice:** choose Easy, Medium, or Hard, or mix the available puzzles; attempts are unlimited.
- **Endless:** three lives, three difficulty levels that rise every three solves, points based on guesses and hints, and a personal best.

## Settings and statistics

Settings let you choose a light or dark theme and system, reduced, or standard motion. The chart icon opens statistics for daily totals, streaks, average score, accuracy, first-try solve rate, recent score history, and Endless high score.

## Author daily puzzles

Edit `src/data/puzzles.json` and add an entry to its `puzzles` array. Each entry includes the displayed sequence, answer, rule, three ordered hints, explanation, difficulty, and a machine-readable `pattern` descriptor. The descriptor lets the validator independently calculate the continuation.

Supported descriptors include arithmetic, geometric, powers, Fibonacci, increasing or doubling differences, multiply-adjust, factorial, prime numbers, triangular numbers, look-and-say, and weighted recurrences. Legacy alternating descriptors remain readable for existing authored puzzles but are no longer used in generated Daily, Practice, or Endless games. The JSON file references `src/data/puzzle.schema.json` for editor assistance.

Run `npm run validate:puzzles` to check required fields, valid difficulty, three distinct hints, answer mention in the explanation, duplicate entries, and that the sequence and answer match the descriptor. Run `npm test` to run the application tests and puzzle-bank validation.

Practice and Endless puzzles are generated on-device from templates in `src/engine/generator.ts`, including prime, triangular, look-and-say, and weighted-recurrence patterns. Each puzzle asks for the next number; higher difficulty levels use more challenging rules. Their three player-facing levels map to medium-, hard-, and expert-rated puzzles, in that order; Endless starts at Easy and caps at Hard. Daily Challenge puzzles are generated on-device from the browser's local date, with #001 anchored to November 2, 2026. Each day contains one medium-rated, two hard-rated, and two expert-rated puzzles in that order. Daily gameplay hides difficulty labels, and each lineup is stable on refresh with no puzzle shared between consecutive days. The authored puzzle bank is also included as a source of curated puzzles.

## End-to-end tests

Install the Playwright browser once with `npx playwright install chromium` (Linux CI can use `npx playwright install --with-deps chromium`), then run `npm run test:e2e`. The suite launches Vite and runs the Daily Challenge and Endless flows in desktop and phone-sized Chromium projects. Each test uses an isolated browser context and clears its local save before starting.

## Local Daily Challenge preview

While running the Vite development server, Home includes a developer link to preview today's challenge and the next 49 days, with answers, explanations, and expandable hints. The preview is gated by Vite's development-only flag and is not available in production builds.

# SEQUENCE

A local daily number puzzle prototype built with React, TypeScript, and Vite.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

## Modes

- **Daily Challenge:** five date-selected puzzles, three attempts each, hints, scoring, streaks, and results.
- **Practice:** choose a difficulty and solve generated puzzles with unlimited attempts.
- **Endless:** three lives, rising difficulty, attempt scoring, first-try streak bonuses, and a personal best.

## Statistics

Open the chart icon in the header to see daily challenge totals, streaks, average score, accuracy, first-try solve rate, score history, and Endless high score. Older local saves remain readable; averages and history begin recording from this update.

## Puzzle generation and checks

Practice and Endless puzzles are generated on-device from typed rule templates in `src/engine/generator.ts`. Run `npm test` for generator, scoring, difficulty, and statistics checks.

Progress, stats, and best scores are saved to this browser's localStorage. The daily set uses the browser's local date. Challenge #001 is anchored to November 2, 2026.

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
- **Practice:** choose a difficulty and solve generated puzzles with unlimited attempts.
- **Endless:** three lives, rising difficulty, attempt scoring, first-try streak bonuses, and a personal best.

## Settings and statistics

Settings let you choose a light or dark theme and system, reduced, or standard motion. The chart icon opens statistics for daily totals, streaks, average score, accuracy, first-try solve rate, recent score history, and Endless high score.

## Author daily puzzles

Edit `src/data/puzzles.json` and add an entry to its `puzzles` array. Each entry includes the displayed sequence, answer, rule, three ordered hints, explanation, difficulty, and a machine-readable `pattern` descriptor. The descriptor lets the validator independently calculate the continuation.

Supported descriptors are arithmetic, geometric, powers, Fibonacci, alternating sequences, increasing or doubling differences, multiply-adjust, and factorial. The JSON file references `src/data/puzzle.schema.json` for editor assistance.

Run `npm run validate:puzzles` to check required fields, valid difficulty, three distinct hints, answer mention in the explanation, duplicate entries, and that the sequence and answer match the descriptor. Run `npm test` to run the application tests and puzzle-bank validation.

Practice and Endless puzzles are generated on-device from templates in `src/engine/generator.ts`. The Daily Challenge uses the browser's local date, with #001 anchored to November 2, 2026. Each day is ordered Easy, Easy, Medium, Hard, Expert.

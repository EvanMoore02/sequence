# SEQUENCE

A local, single-player daily number puzzle prototype built with React, TypeScript, Vite, Tailwind CSS, and Lucide.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Daily progress and statistics are stored in this browser's localStorage.

## Included

- Five deterministic daily puzzles selected from a curated bank of 15
- Three attempts per puzzle, progressive hints, explanations, and scoring
- Resume after refresh and local-device streak tracking
- Responsive Home, Gameplay, and Results screens
- Keyboard submission, reduced-motion support, and share/copy results

The daily set resets using the browser's local calendar date. Challenge #001 is anchored to November 2, 2026.

- Endless Practice with Easy, Medium, Hard, Expert, and All choices
- Unlimited attempts, optional progressive hints, and rule explanations after solving
- Practice session and puzzle history saved separately from daily stats

Practice puzzles are generated locally from typed templates in `src/engine/generator.ts`. To run generator checks, use `npm test`.

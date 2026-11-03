import type{Puzzle}from'../types';export type EndlessDifficulty=Puzzle['difficulty'];
const levels:EndlessDifficulty[]=['Easy','Medium','Hard','Expert'];
export function difficultyForSolvedCount(solved:number):EndlessDifficulty{return levels[Math.min(3,Math.floor(Math.max(0,solved)/3))]}
export function endlessPuzzlePoints(attempts:number,hints:number,previousFirstTryStreak:number){const base=[100,70,40][Math.min(2,Math.max(0,attempts-1))],firstTry=attempts===1,streak=firstTry?previousFirstTryStreak+1:0;return{points:Math.max(0,base-hints*10)+(firstTry?streak*10:0),firstTryStreak:streak}}

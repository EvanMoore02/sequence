import{describe,expect,it}from'vitest';import{generatePracticePuzzle,templates}from'./generator';import{rateDifficulty}from'./difficulty';
function rngFrom(seed:number){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}}
function validate(p:ReturnType<typeof generatePracticePuzzle>){
 expect(p.sequence.length).toBeGreaterThanOrEqual(4);expect(p.sequence.length).toBeLessThanOrEqual(6);expect([...p.sequence,p.answer].every(Number.isSafeInteger)).toBe(true);expect(Math.max(...p.sequence.map(Math.abs),Math.abs(p.answer))).toBeLessThanOrEqual(1_000_000);expect(p.hints).toHaveLength(3);expect(p.explanation.length).toBeGreaterThan(0);expect(rateDifficulty(p.sequence,p.answer,p.pattern)).toEqual({score:p.difficultyScore,difficulty:p.difficulty});
 const all=[...p.sequence,p.answer],parts=p.id.split(':');
 switch(p.templateId){
 case'arithmetic':{const d=all[1]-all[0];expect(all.slice(2).every((v,i)=>v===all[i+1]+d)).toBe(true);break}
 case'geometric':{const f=Number(parts[2]);expect(all.slice(1).every((v,i)=>v===all[i]*f)).toBe(true);break}
 case'powers':{const e=Number(parts[1]),start=Number(parts[2]);expect(all.every((v,i)=>v===(start+i)**e)).toBe(true);break}
 case'fibonacci':expect(all.slice(2).every((v,i)=>v===all[i]+all[i+1])).toBe(true);break;
 case'differences':{const gaps=all.slice(1).map((v,i)=>v-all[i]),delta=gaps[1]-gaps[0];expect(gaps.slice(2).every((v,i)=>v-gaps[i+1]===delta)).toBe(true);break}
 case'doubling-gaps':{const gaps=all.slice(1).map((v,i)=>v-all[i]);expect(gaps.slice(1).every((v,i)=>v===gaps[i]*2)).toBe(true);break}
 case'multiply-adjust':{const factor=Number(parts[2]),offset=Number(parts[3]);expect(all.slice(1).every((v,i)=>v===all[i]*factor+offset)).toBe(true);break}
 case'factorial':{const start=Number(parts[1]),fact=(n:number)=>{let x=1;for(let i=2;i<=n;i++)x*=i;return x};expect(all.every((v,i)=>v===fact(start+i))).toBe(true);break}
 case'primes':{const prime=(n:number)=>{if(n<2)return false;for(let d=2;d*d<=n;d++)if(n%d===0)return false;return true};expect(all.every(prime)).toBe(true);expect(all.slice(1).every((v,i)=>{for(let n=all[i]+1;n<v;n++)if(prime(n))return false;return prime(v)})).toBe(true);break}
 case'triangular':{const start=Number(parts[1]);expect(all.every((v,i)=>v===(start+i)*(start+i+1)/2)).toBe(true);break}
 case'look-and-say':{const describe=(n:number)=>{const text=String(n);let out='';for(let i=0;i<text.length;){let end=i+1;while(end<text.length&&text[end]===text[i])end++;out+=String(end-i)+text[i];i=end}return Number(out)};expect(all[0]).toBe(Number(parts[1]));expect(all.slice(1).every((v,i)=>v===describe(all[i]))).toBe(true);break}
 case'weighted-recurrence':{const factor=Number(parts[3]),offset=Number(parts[4]);expect(all.slice(2).every((v,i)=>v===all[i+1]*factor+all[i]+offset)).toBe(true);break}
 case'reverse-add':expect(all.slice(1).every((v,i)=>v===all[i]+Number(String(all[i]).split('').reverse().join('')))).toBe(true);break;
 case'collatz':expect(all.slice(1).every((v,i)=>v===(all[i]%2===0?all[i]/2:all[i]*3+1))).toBe(true);expect(all.slice(0,-2).some(v=>v%2===0)).toBe(true);expect(all.slice(0,-2).some(v=>v%2!==0)).toBe(true);break;
 case'prime-gaps':{const gap=Number(parts[2]),growth=2;expect(all.every((v)=>{if(v<2)return false;for(let d=2;d*d<=v;d++)if(v%d===0)return false;return true})).toBe(true);expect(all.slice(1).every((v,i)=>v===all[i]+gap+i*growth)).toBe(true);break}


 }
}
describe('practice puzzle generator',()=>{
 it('generates internally consistent non-alternating puzzles for every template',()=>{expect(templates.some((t)=>t.id.includes('alternat'))).toBe(false);for(const t of templates){const p=t.generate(rngFrom(12345));expect(p.pattern.type).not.toBe('alternating');expect(p.pattern.type).not.toBe('alternating-operation');validate(p)}});
 it('returns puzzles at the selected difficulty and bounded values',()=>{for(const [level,rating] of [['Easy','Medium'],['Medium','Hard'],['Hard','Expert']] as const){for(let seed=1;seed<=100;seed++){const p=generatePracticePuzzle(level,[],rngFrom(seed));expect(p.difficulty).toBe(rating);expect(p.pattern.type).not.toBe('alternating');expect(p.pattern.type).not.toBe('alternating-operation');validate(p)}}});
 it('supports all player levels without Easy-rated puzzles and avoids recent IDs',()=>{const rng=rngFrom(991);let recent:string[]=[];for(let i=0;i<30;i++){const p=generatePracticePuzzle('All',recent,rng);expect(p.difficulty).not.toBe('Easy');expect(recent).not.toContain(p.id);recent=[...recent,p.id]}});
 it('produces stable IDs and puzzle content for the same parameters',()=>{for(const t of templates){expect(t.generate(rngFrom(77))).toEqual(t.generate(rngFrom(77)))}});
});
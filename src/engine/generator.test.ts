import{describe,expect,it}from'vitest';import{generatePracticePuzzle,templates}from'./generator';
function rngFrom(seed:number){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}}
function validate(p:ReturnType<typeof generatePracticePuzzle>){
 expect(p.sequence.length).toBeGreaterThanOrEqual(4);expect(p.sequence.length).toBeLessThanOrEqual(6);expect([...p.sequence,p.answer].every(Number.isSafeInteger)).toBe(true);expect(Math.max(...p.sequence.map(Math.abs),Math.abs(p.answer))).toBeLessThanOrEqual(1_000_000);expect(p.hints).toHaveLength(3);expect(p.explanation.length).toBeGreaterThan(0);
 const all=[...p.sequence,p.answer],parts=p.id.split(':');
 switch(p.templateId){
 case'arithmetic':{const d=all[1]-all[0];expect(all.slice(2).every((v,i)=>v===all[i+1]+d)).toBe(true);break}
 case'geometric':{const f=Number(parts[2]);expect(all.slice(1).every((v,i)=>v===all[i]*f)).toBe(true);break}
 case'powers':{const e=Number(parts[1]),start=Number(parts[2]);expect(all.every((v,i)=>v===(start+i)**e)).toBe(true);break}
 case'fibonacci':expect(all.slice(2).every((v,i)=>v===all[i]+all[i+1])).toBe(true);break;
 case'alternating':{const odd=all.filter((_,i)=>i%2===0),even=all.filter((_,i)=>i%2===1);expect(odd.slice(1).every((v,i)=>v-odd[i]===odd[1]-odd[0])).toBe(true);expect(even.slice(1).every((v,i)=>v-even[i]===even[1]-even[0])).toBe(true);break}
 case'differences':{const gaps=all.slice(1).map((v,i)=>v-all[i]),delta=gaps[1]-gaps[0];expect(gaps.slice(2).every((v,i)=>v-gaps[i+1]===delta)).toBe(true);break}
 case'doubling-gaps':{const gaps=all.slice(1).map((v,i)=>v-all[i]);expect(gaps.slice(1).every((v,i)=>v===gaps[i]*2)).toBe(true);break}
 case'multiply-adjust':{const factor=Number(parts[2]),offset=Number(parts[3]);expect(all.slice(1).every((v,i)=>v===all[i]*factor+offset)).toBe(true);break}
 case'factorial':{const start=Number(parts[1]),fact=(n:number)=>{let x=1;for(let i=2;i<=n;i++)x*=i;return x};expect(all.every((v,i)=>v===fact(start+i))).toBe(true);break}
 }
}
describe('practice puzzle generator',()=>{
 it('generates internally consistent puzzles for every template',()=>{for(const t of templates){const p=t.generate(rngFrom(12345));validate(p)}});
 it('returns puzzles at the selected difficulty and bounded values',()=>{for(const level of ['Easy','Medium','Hard','Expert'] as const){for(let seed=1;seed<=100;seed++){const p=generatePracticePuzzle(level,[],rngFrom(seed));expect(p.difficulty).toBe(level);validate(p)}}});
 it('supports all levels and avoids recent IDs while alternatives remain',()=>{const rng=rngFrom(991);let recent:string[]=[];for(let i=0;i<30;i++){const p=generatePracticePuzzle('All',recent,rng);expect(recent).not.toContain(p.id);recent=[...recent,p.id]}});
 it('produces stable IDs and puzzle content for the same parameters',()=>{for(const t of templates){expect(t.generate(rngFrom(77))).toEqual(t.generate(rngFrom(77)))}});
});
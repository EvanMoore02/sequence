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
 case'interleaved':{const firstStep=Number(parts[3]),secondStep=Number(parts[4]);expect(all.filter((_,i)=>i%2===0).slice(1).every((v,i)=>v-all[i*2]===firstStep)).toBe(true);expect(all.filter((_,i)=>i%2===1).slice(1).every((v,i)=>v-all[i*2+1]===secondStep)).toBe(true);break}
 case'decreasing-differences':{const first=Number(parts[2]),growth=Number(parts[3]),gaps=all.slice(1).map((v,i)=>all[i]-v);expect(gaps.every((gap,i)=>gap===first-i*growth)).toBe(true);expect(all.every((value)=>value>=0)).toBe(true);break}
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
 it('generates internally consistent puzzles for every template',()=>{for(const t of templates){const p=t.generate(rngFrom(12345));validate(p)}});
 it('avoids digit-product sequences that stall when a term contains zero',()=>{
  const template=templates.find((item)=>item.id==='digit-product')!;
  for(let seed=1;seed<=200;seed++){
   const puzzle=template.generate(rngFrom(seed)),terms=[...puzzle.sequence,puzzle.answer];
   expect(terms.slice(1).every((term,index)=>term>terms[index])).toBe(true);
   expect(terms.slice(0,-1).every((term)=>!String(term).includes('0'))).toBe(true);
  }
 });
 it('uses distinct visual reasoning families with eight validated options',()=>{
  const visual=templates.find((template)=>template.id==='visual-matrix')!;
  const families=new Set<string>();
  const spokenShapes:Record<string,string>={triangle:'triangle',pentagon:'pentagon',arrow:'arrow','l-block':'l-shaped block'};
  for(let seed=1;seed<=512;seed++){
   const puzzle=visual.generate(rngFrom(seed*104729)),matrix=puzzle.visualPattern!;
   families.add(matrix.family!);
   expect(matrix.cells).toHaveLength((matrix.rows??3)*(matrix.columns??3));
   if(matrix.taskFormat==='find-odd-tile')expect(matrix.cells.every((cell)=>cell!==null)).toBe(true);
   else{expect(matrix.cells.filter((cell)=>cell===null)).toHaveLength(1);expect(matrix.cells[matrix.missingIndex??8]).toBeNull();}
   expect(matrix.choices).toHaveLength(8);
   expect(new Set(matrix.choices.map((choice)=>JSON.stringify(choice))).size).toBe(8);
   expect(matrix.choices[matrix.answerIndex]).toBeDefined();
   const explanation=puzzle.explanation.toLowerCase(),letter=String.fromCharCode(65+matrix.answerIndex).toLowerCase();
   expect(explanation).toContain('option '+letter);
   const wordCount=puzzle.explanation.trim().split(/\s+/).length;
   expect(wordCount,puzzle.id+': explanation should be readable text').toBeGreaterThanOrEqual(40);
   expect(wordCount,puzzle.id+': '+puzzle.explanation).toBeLessThanOrEqual(100);
   for(const shape of matrix.choices[matrix.answerIndex]){
    expect(explanation).toContain(spokenShapes[shape.kind]);
    expect(explanation).toContain(shape.fill);
    if(shape.count===2)expect(explanation).toContain('two ');
    if(shape.count===3)expect(explanation).toContain('three ');
    if(shape.rotation)expect(explanation).toContain(shape.rotation+' degrees clockwise');
    if(shape.slot!==undefined)expect(explanation).toContain(['top-left','top-right','bottom-left','bottom-right'][shape.slot]);
   }
   const familyTerms:Record<string,string>={'attribute-cycle':'shape advances','row-distribution':'row 3 and column',reflection:'mirror','count-progression':'count rises by one','shape-xor':'remove it and keep the other shapes','shape-union':'keep it once','orbit-movement':'one corner clockwise','analogy-transform':'bottom row','nested-shapes':'larger outer shape','shape-overlap':'shared by the first two tiles','diagonal-symmetry':'mirrors across','odd-tile-out':'follows the same rule'};
   expect(explanation).toContain(familyTerms[matrix.family!]);
  }
  expect(families.size).toBe(12);
 });
 it('returns puzzles at the selected difficulty and bounded values',()=>{for(const [level,rating] of [['Easy','Medium'],['Medium','Hard'],['Hard','Expert']] as const){for(let seed=1;seed<=100;seed++){const p=generatePracticePuzzle(level,[],rngFrom(seed));expect(p.difficulty).toBe(rating);validate(p)}}});
 it('supports all player levels without Easy-rated puzzles and avoids recent IDs',()=>{const rng=rngFrom(991);let recent:string[]=[];for(let i=0;i<30;i++){const p=generatePracticePuzzle('All',recent,rng);expect(p.difficulty).not.toBe('Easy');expect(recent).not.toContain(p.id);recent=[...recent,p.id]}});
 it('produces stable IDs and puzzle content for the same parameters',()=>{for(const t of templates){expect(t.generate(rngFrom(77))).toEqual(t.generate(rngFrom(77)))}});
});

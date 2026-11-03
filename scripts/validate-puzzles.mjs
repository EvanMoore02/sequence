import{readFile}from'node:fs/promises';import{fileURLToPath}from'node:url';import{dirname,resolve}from'node:path';
const bankPath=process.argv[2]?resolve(process.cwd(),process.argv[2]):resolve(dirname(fileURLToPath(import.meta.url)),'../src/data/puzzles.json');
const bank=JSON.parse(await readFile(bankPath,'utf8')),errors=[],levels=new Set(['Easy','Medium','Hard','Expert']),ids=new Set(),signatures=new Set();
const factorial=n=>{let value=1;for(let i=2;i<=n;i++)value*=i;return value};
function derive(p){const s=p.sequence,q=p.pattern,count=s.length+1;switch(q.type){
case'arithmetic':return Array.from({length:count},(_,i)=>s[0]+i*q.step);
case'geometric':return Array.from({length:count},(_,i)=>s[0]*q.factor**i);
case'power':return Array.from({length:count},(_,i)=>(q.start+i)**q.exponent);
case'fibonacci':{const values=[s[0],s[1]];while(values.length<count)values.push(values.at(-1)+values.at(-2));return values}
case'alternating':return Array.from({length:count},(_,i)=>i%2===0?s[0]+i/2*q.oddStep:s[1]+(i-1)/2*q.evenStep);
case'increasing-difference':{const values=[s[0]];let gap=q.firstDifference;while(values.length<count){values.push(values.at(-1)+gap);gap+=q.growth}return values}
case'doubling-difference':{const values=[s[0]];let gap=q.firstDifference;while(values.length<count){values.push(values.at(-1)+gap);gap*=2}return values}
case'multiply-adjust':{const values=[s[0]];while(values.length<count)values.push(values.at(-1)*q.factor+q.offset);return values}
case'factorial':return Array.from({length:count},(_,i)=>factorial(q.start+i));
default:throw Error('unsupported pattern type '+q.type)}}
if(!bank||!Array.isArray(bank.puzzles)||bank.puzzles.length===0)errors.push('Bank must contain at least one puzzle.');
for(const [index,p]of(bank?.puzzles||[]).entries()){const name='Puzzle '+(index+1)+(p?.id?' ('+p.id+')':'');
if(!p||typeof p!=='object'){errors.push(name+': expected an object.');continue}
if(typeof p.id!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id))errors.push(name+': id must be a lowercase slug.');
else if(ids.has(p.id))errors.push(name+': duplicate id.');else ids.add(p.id);
if(typeof p.category!=='string'||!p.category.trim())errors.push(name+': category is required.');
if(!levels.has(p.difficulty))errors.push(name+': difficulty must be Easy, Medium, Hard, or Expert.');
if(!Array.isArray(p.sequence)||p.sequence.length<4||p.sequence.length>6||!p.sequence.every(Number.isSafeInteger))errors.push(name+': sequence must contain 4–6 safe integers.');
if(!Number.isSafeInteger(p.answer))errors.push(name+': answer must be a safe integer.');
if(typeof p.rule!=='string'||p.rule.trim().length<3)errors.push(name+': rule is required.');
if(typeof p.explanation!=='string'||p.explanation.trim().length<15)errors.push(name+': explanation must describe the rule.');
else if(Number.isSafeInteger(p.answer)&&!p.explanation.split(/[^0-9-]+/).includes(String(p.answer)))errors.push(name+': explanation must state the answer ('+p.answer+').');
if(!Array.isArray(p.hints)||p.hints.length!==3||!p.hints.every(h=>typeof h==='string'&&h.trim().length>=4))errors.push(name+': provide exactly three non-empty hints.');
else if(new Set(p.hints.map(h=>h.trim().toLowerCase())).size!==3)errors.push(name+': hints must be distinct.');
if(!p.pattern||typeof p.pattern.type!=='string')errors.push(name+': answer pattern descriptor is required.');
if(Array.isArray(p.sequence)&&p.sequence.length>=4&&Number.isSafeInteger(p.answer)&&p.pattern?.type){try{const terms=derive(p);if(!terms.slice(0,p.sequence.length).every((value,i)=>value===p.sequence[i])||terms.at(-1)!==p.answer)errors.push(name+': sequence or answer does not match its declared rule.');if(!terms.every(Number.isSafeInteger))errors.push(name+': declared rule generates an unsafe integer.')}catch(error){errors.push(name+': '+error.message)}}
const signature=JSON.stringify([p.sequence,p.answer]);if(signatures.has(signature))errors.push(name+': duplicate sequence and answer.');signatures.add(signature);
}
if(errors.length){console.error('Puzzle bank validation failed:');for(const error of errors)console.error(' - '+error);process.exitCode=1}else console.log('Validated '+bank.puzzles.length+' puzzles: fields, difficulty, three hints, explanations, uniqueness, and rule-derived answers are consistent.');

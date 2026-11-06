import{readFile}from'node:fs/promises';import{fileURLToPath}from'node:url';import{dirname,resolve}from'node:path';
const bankPath=process.argv[2]?resolve(process.cwd(),process.argv[2]):resolve(dirname(fileURLToPath(import.meta.url)),'../src/data/puzzles.json');
const bank=JSON.parse(await readFile(bankPath,'utf8')),errors=[],levels=new Set(['Easy','Medium','Hard','Expert']),ids=new Set(),signatures=new Set();
const factorial=n=>{let value=1;for(let i=2;i<=n;i++)value*=i;return value};
const patternComplexity={arithmetic:0,geometric:1,power:1,fibonacci:2,alternating:3,'increasing-difference':4,'doubling-difference':3,'multiply-adjust':3,factorial:4,prime:5,triangular:4,'look-and-say':5,'alternating-operation':5,'weighted-recurrence':5,'reverse-add':5,collatz:5,'prime-gaps':5};
const ratingLevel=score=>score<=1?'Easy':score<=3?'Medium':score<=5?'Hard':'Expert';
function rateDifficulty(sequence,answer,pattern){
 const values=[...sequence,answer];let score=patternComplexity[pattern.type]??0;
 if(sequence.length===4)score++;
 if(pattern.type==='geometric'&&pattern.factor>=3)score++;
 if(pattern.type==='power'&&pattern.exponent===3)score++;
 if(pattern.type==='alternating')score++;
 if(pattern.type==='multiply-adjust'){if(pattern.factor>=3)score++;if(pattern.offset!==0)score++}
 const magnitude=Math.max(...values.map(Math.abs));if(magnitude>=1000)score+=2;else if(magnitude>=100)score++;
 if(values.some(value=>value<0))score++;
 const d=values[1]-values[0];if(pattern.type!=='arithmetic'&&values.slice(2).every((value,index)=>value-values[index+1]===d))score++;
 if(pattern.type!=='geometric'&&values[0]!==0&&values[1]%values[0]===0&&values[1]/values[0]>1&&values.slice(2).every((value,index)=>value===values[index+1]*(values[1]/values[0])))score++;
 if(pattern.type!=='fibonacci'&&values.slice(2).every((value,index)=>value===values[index]+values[index+1]))score++;
 if(pattern.type!=='power'&&[2,3].some(power=>values.every((value,index)=>value===(values[0]+index)**power)))score++;
 score-=Math.max(0,[pattern.type!=='arithmetic'&&values.slice(2).every((value,index)=>value-values[index+1]===d),pattern.type!=='geometric'&&values[0]!==0&&values[1]%values[0]===0&&values[1]/values[0]>1&&values.slice(2).every((value,index)=>value===values[index+1]*(values[1]/values[0])),pattern.type!=='fibonacci'&&values.slice(2).every((value,index)=>value===values[index]+values[index+1]),pattern.type!=='power'&&[2,3].some(power=>values.every((value,index)=>value===(values[0]+index)**power))].filter(Boolean).length-2);
 return{score,difficulty:ratingLevel(score)};
}
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
case'prime':{const prime=n=>{if(n<2)return false;for(let d=2;d*d<=n;d++)if(n%d===0)return false;return true};const values=[q.start];while(values.length<count){let next=values.at(-1)+1;while(!prime(next))next++;values.push(next)}return values}
case'triangular':return Array.from({length:count},(_,i)=>(q.start+i)*(q.start+i+1)/2);
case'look-and-say':{const values=[q.start];while(values.length<count){const text=String(values.at(-1));let result='';for(let i=0;i<text.length;){let end=i+1;while(end<text.length&&text[end]===text[i])end++;result+=String(end-i)+text[i];i=end}values.push(Number(result))}return values}
case'alternating-operation':{const values=[s[0]];while(values.length<count){const i=values.length-1;values.push(values.at(-1)*(i%2===0?q.factorA:q.factorB)+(i%2===0?q.offsetA:q.offsetB))}return values}
case'weighted-recurrence':{const values=s.slice(0,2);while(values.length<count)values.push(values.at(-1)*q.factor+values.at(-2)+q.offset);return values}
case'reverse-add':{const values=[s[0]];while(values.length<count)values.push(values.at(-1)+Number(String(values.at(-1)).split('').reverse().join('')));return values}
case'collatz':{const values=[q.start];while(values.length<count){const previous=values.at(-1);values.push(previous%2===0?previous/2:previous*3+1)}return values}
case'prime-gaps':{const values=[q.start];let gap=q.firstGap;while(values.length<count){values.push(values.at(-1)+gap);gap+=q.growth}return values}


default:throw Error('unsupported pattern type '+q.type)}}
if(!bank||!Array.isArray(bank.puzzles)||bank.puzzles.length===0)errors.push('Bank must contain at least one puzzle.');
for(const [index,p]of(bank?.puzzles||[]).entries()){const name='Puzzle '+(index+1)+(p?.id?' ('+p.id+')':'');
if(!p||typeof p!=='object'){errors.push(name+': expected an object.');continue}
if(typeof p.id!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id))errors.push(name+': id must be a lowercase slug.');
else if(ids.has(p.id))errors.push(name+': duplicate id.');else ids.add(p.id);
if(typeof p.category!=='string'||!p.category.trim())errors.push(name+': category is required.');
if(!levels.has(p.difficulty))errors.push(name+': difficulty must be a rated tier: Easy, Medium, Hard, or Expert.');
if(!Array.isArray(p.sequence)||p.sequence.length<4||p.sequence.length>6||!p.sequence.every(Number.isSafeInteger))errors.push(name+': sequence must contain 4–6 safe integers.');
if(!Number.isSafeInteger(p.answer))errors.push(name+': answer must be a safe integer.');
if(typeof p.rule!=='string'||p.rule.trim().length<3)errors.push(name+': rule is required.');
if(typeof p.explanation!=='string'||p.explanation.trim().length<15)errors.push(name+': explanation must describe the rule.');
else if(Number.isSafeInteger(p.answer)&&!p.explanation.split(/[^0-9-]+/).includes(String(p.answer)))errors.push(name+': explanation must state the answer ('+p.answer+').');
if(!Array.isArray(p.hints)||p.hints.length!==3||!p.hints.every(h=>typeof h==='string'&&h.trim().length>=4))errors.push(name+': provide exactly three non-empty hints.');
else if(new Set(p.hints.map(h=>h.trim().toLowerCase())).size!==3)errors.push(name+': hints must be distinct.');
if(!p.pattern||typeof p.pattern.type!=='string')errors.push(name+': answer pattern descriptor is required.');
if(Array.isArray(p.sequence)&&Number.isSafeInteger(p.answer)&&p.pattern?.type&&patternComplexity[p.pattern.type]!==undefined){const rating=rateDifficulty(p.sequence,p.answer,p.pattern);if(p.difficulty!==rating.difficulty)errors.push(name+': difficulty is '+p.difficulty+' but the rating rubric gives '+rating.difficulty+' (score '+rating.score+').')}
if(Array.isArray(p.sequence)&&p.sequence.length>=4&&Number.isSafeInteger(p.answer)&&p.pattern?.type){try{const terms=derive(p);if(!terms.slice(0,p.sequence.length).every((value,i)=>value===p.sequence[i])||terms.at(-1)!==p.answer)errors.push(name+': sequence or answer does not match its declared rule.');if(!terms.every(Number.isSafeInteger))errors.push(name+': declared rule generates an unsafe integer.')}catch(error){errors.push(name+': '+error.message)}}
const signature=JSON.stringify([p.sequence,p.answer]);if(signatures.has(signature))errors.push(name+': duplicate sequence and answer.');signatures.add(signature);
}
const requiredDailyMix={Medium:1,Hard:2,Expert:2};for(const [difficulty,minimum]of Object.entries(requiredDailyMix)){const count=(bank?.puzzles||[]).filter(p=>p?.difficulty===difficulty).length;if(count<minimum)errors.push('Daily puzzle bank needs at least '+minimum+' '+difficulty+' puzzle'+(minimum===1?'':'s')+' to fill every daily challenge; found '+count+'.')}
if(errors.length){console.error('Puzzle bank validation failed:');for(const error of errors)console.error(' - '+error);process.exitCode=1}else console.log('Validated '+bank.puzzles.length+' puzzles: fields, rubric-rated difficulty, three hints, explanations, uniqueness, and rule-derived answers are consistent.');

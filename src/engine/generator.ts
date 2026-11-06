import type {Puzzle} from '../types';
import type {AnswerPattern} from '../data/puzzleTypes';
import {rateDifficulty, ratingForPlayerDifficulty, type PlayerDifficulty} from './difficulty';

export type PracticeDifficulty=PlayerDifficulty|'All';
export type GeneratedPuzzle=Puzzle&{templateId:string;difficultyScore:number;pattern:AnswerPattern};
export type PuzzleTemplate={id:string;category:string;generate:(rng:()=>number)=>GeneratedPuzzle};
const int=(rng:()=>number,min:number,max:number)=>min+Math.floor(rng()*(max-min+1));
const safe=(n:number)=>Number.isSafeInteger(n)&&Math.abs(n)<=1_000_000;
const isPrime=(n:number)=>{if(n<2)return false;for(let d=2;d*d<=n;d++)if(n%d===0)return false;return true};
const nextPrime=(n:number)=>{let value=n+1;while(!isPrime(value))value++;return value};
const reverseDigits=(n:number)=>Number(String(n).split('').reverse().join(''));
const collatzNext=(n:number)=>n%2===0?n/2:3*n+1;
const sayNumber=(n:number)=>{const text=String(n);let result='';for(let i=0;i<text.length;){let end=i+1;while(end<text.length&&text[end]===text[i])end++;result+=String(end-i)+text[i];i=end}return Number(result)};
function make(id:string,category:string,sequence:number[],answer:number,rule:string,explanation:string,hints:[string,string,string],pattern:AnswerPattern):GeneratedPuzzle{
 const templateId=id.split(':')[0],rating=rateDifficulty(sequence,answer,pattern);
 return {id,templateId,category,difficulty:rating.difficulty,difficultyScore:rating.score,pattern,sequence,answer,rule,explanation,hints};
}
const arithmetic: PuzzleTemplate={id:'arithmetic',category:'Arithmetic',generate:rng=>{
 const start=int(rng,-30,60),step=int(rng,1,12)*(rng()<.25?-1:1),count=int(rng,4,5),seq=Array.from({length:count},(_,i)=>start+i*step),answer=start+count*step;
 const action=step>0?'Add '+step:'Subtract '+Math.abs(step);return make('arithmetic:'+start+':'+step+':'+count,'Arithmetic',seq,answer,action,action+' each term; the next term is '+answer+'.',[ 'Compare the gaps between neighbors.','The difference stays the same.',action+' each time.'],{type:'arithmetic',step});
}};
const geometric: PuzzleTemplate={id:'geometric',category:'Multiplication',generate:rng=>{
 const factor=int(rng,2,3),count=int(rng,4,5),start=int(rng,1,5),seq=Array.from({length:count},(_,i)=>start*factor**i),answer=start*factor**count;
 return make('geometric:'+start+':'+factor+':'+count,'Multiplication',seq,answer,'Multiply by '+factor,'Each term is multiplied by '+factor+'; the next term is '+answer+'.',[ 'Compare each term to the one before it.','The same multiplier repeats.','Multiply by '+factor+' each time.'],{type:'geometric',factor});
}};
const powers: PuzzleTemplate={id:'powers',category:'Powers',generate:rng=>{
 const exponent=int(rng,2,3) as 2|3,start=int(rng,1,exponent===2?7:4),count=4,seq=Array.from({length:count},(_,i)=>(start+i)**exponent),answer=(start+count)**exponent,label=exponent===2?'square':'cube';
 return make('powers:'+exponent+':'+start,'Powers',seq,answer,label+' numbers','These are consecutive '+label+' numbers. The next is '+(start+count)+'^'+exponent+' = '+answer+'.',[ 'The gaps between terms are growing.','Each value is a consecutive whole number raised to a power.','Continue with '+(start+count)+'^'+exponent+'.'],{type:'power',exponent,start});
}};
const fibonacci: PuzzleTemplate={id:'fibonacci',category:'Recursive',generate:rng=>{
 const a=int(rng,1,3),b=int(rng,a,5),seq=[a,b];while(seq.length<5)seq.push(seq.at(-1)!+seq.at(-2)!);const answer=seq[4]+seq[3];
 return make('fibonacci:'+a+':'+b,'Recursive',seq,answer,'Add the previous two','Each term is the sum of the previous two terms: '+seq[3]+' + '+seq[4]+' = '+answer+'.',[ 'Look back more than one position.','Each new term combines the two before it.','Add '+seq[3]+' and '+seq[4]+'.'],{type:'fibonacci'});
}};
const differences: PuzzleTemplate={id:'differences',category:'Differences',generate:rng=>{
 const start=int(rng,-10,20),first=int(rng,-4,8),growth=int(rng,1,4),seq=[start];for(let i=0;i<4;i++)seq.push(seq.at(-1)!+first+i*growth);const answer=seq[4]+first+4*growth;
 return make('differences:'+start+':'+first+':'+growth,'Differences',seq,answer,'Differences increase by '+growth,'The first differences increase by '+growth+' each time; the next gap is '+(first+4*growth)+', giving '+answer+'.',[ 'Compare the gaps between consecutive terms.','The gaps themselves change regularly.','The next gap is '+(first+4*growth)+'.'],{type:'increasing-difference',firstDifference:first,growth});
}};
const doubling: PuzzleTemplate={id:'doubling-gaps',category:'Differences',generate:rng=>{
 const start=int(rng,-20,20),step=int(rng,1,4)*(rng()<.5?-1:1),seq=[start,start+step,start+3*step,start+7*step],answer=start+15*step;
 return make('doubling-gaps:'+start+':'+step,'Differences',seq,answer,'Double each difference','The gaps are '+step+', '+2*step+', and '+4*step+'; next add '+8*step+' to get '+answer+'.',[ 'Look at the gaps between terms.','Each gap is twice the one before it.','The next gap is '+8*step+'.'],{type:'doubling-difference',firstDifference:step});
}};
const recurrence: PuzzleTemplate={id:'multiply-adjust',category:'Mixed',generate:rng=>{
 const factor=int(rng,2,4),offset=int(rng,-9,9),start=int(rng,1,8),count=int(rng,4,5),seq=[start];while(seq.length<count)seq.push(seq.at(-1)!*factor+offset);const answer=seq.at(-1)!*factor+offset;
 return make('multiply-adjust:'+start+':'+factor+':'+offset+':'+count,'Mixed',seq,answer,'Multiply by '+factor+' then '+(offset<0?'subtract '+Math.abs(offset):'add '+offset),'Multiply each term by '+factor+(offset<0?' and subtract '+Math.abs(offset):' and add '+offset)+', giving '+answer+'.',[ 'Check whether multiplication is involved.','A small adjustment follows the multiplication.','Multiply by '+factor+(offset<0?' and subtract '+Math.abs(offset):' and add '+offset)+', giving '+answer+'.'],{type:'multiply-adjust',factor,offset});
}};
const factorial: PuzzleTemplate={id:'factorial',category:'Recursive',generate:rng=>{
 const start=int(rng,1,3),fact=(n:number)=>{let x=1;for(let i=2;i<=n;i++)x*=i;return x},seq=Array.from({length:4},(_,i)=>fact(start+i)),answer=fact(start+4);
 return make('factorial:'+start,'Recursive',seq,answer,'Factorials','Multiply by consecutive integers; the next multiplier is '+(start+4)+', giving '+answer+'.',[ 'Look at the ratios between terms.','The multiplier increases by one each time.','Multiply '+seq[3]+' by '+(start+4)+'.'],{type:'factorial',start});
}};
const primes: PuzzleTemplate={id:'primes',category:'Number theory',generate:rng=>{
 const starts=[2,3,5,7,11,13,17,19,23,29],start=starts[int(rng,0,starts.length-1)],count=int(rng,4,5),terms=[start];
 while(terms.length<count+1)terms.push(nextPrime(terms.at(-1)!));
 const sequence=terms.slice(0,count),answer=terms[count];
 return make('primes:'+start+':'+count,'Number theory',sequence,answer,'Consecutive prime numbers','Each term is the next prime; the prime after '+sequence.at(-1)+' is '+answer+'.',['Check which numbers have no divisors other than 1 and themselves.','The gaps change, but every term is prime.','Find the next prime after '+sequence.at(-1)+'.'],{type:'prime',start});
}};
const triangular: PuzzleTemplate={id:'triangular',category:'Figurate numbers',generate:rng=>{
 const start=int(rng,3,15),count=int(rng,4,5),value=(n:number)=>n*(n+1)/2,terms=Array.from({length:count+1},(_,i)=>value(start+i));
 return make('triangular:'+start+':'+count,'Figurate numbers',terms.slice(0,count),terms[count],'Triangular numbers','Add consecutive integers to build each term; the next is '+(start+count)+' x '+(start+count+1)+' / 2 = '+terms[count]+'.',['Compare the differences between terms.','The gaps increase by one each time.','Add the next counting number, '+(start+count)+'.'],{type:'triangular',start});
}};
const lookAndSay: PuzzleTemplate={id:'look-and-say',category:'Look-and-say',generate:rng=>{
 const start=int(rng,1,2) as 1|2,count=4,terms:number[]=[start];
 while(terms.length<count+1)terms.push(sayNumber(terms.at(-1)!));
 return make('look-and-say:'+start,'Look-and-say',terms.slice(0,count),terms[count],'Read and describe the previous term','Describe each run of digits in the previous term; the next description gives '+terms[count]+'.',['Read each term aloud as counts and digits.','Each new term describes the runs in the one before it.','The prior term has runs that read as '+terms[count]+'.'],{type:'look-and-say',start});
}};
const quadratic: PuzzleTemplate={id:'quadratic',category:'Quadratic equations',generate:rng=>{
 const a=int(rng,2,6),b=int(rng,-9,9),c=int(rng,-15,20),start=int(rng,3,9),count=int(rng,4,5),evaluate=(n:number)=>a*n*n+b*n+c,terms=Array.from({length:count+1},(_,i)=>evaluate(start+i)),linear=b<0?' - '+Math.abs(b)+'n':' + '+b+'n',constant=c<0?' - '+Math.abs(c):' + '+c,formula=a+'n^2'+linear+constant;
 return make('quadratic:'+a+':'+b+':'+c+':'+start+':'+count,'Quadratic equations',terms.slice(0,count),terms[count],'f(n) = '+formula,'Evaluate f(n) = '+formula+' at consecutive values of n; at n = '+(start+count)+', the next term is '+terms[count]+'.',['Compare the first differences; they are not constant.','The second differences stay constant.','Use f(n) = '+formula+' with n = '+(start+count)+'.'],{type:'quadratic',a,b,c,start});
}};
const weightedRecurrence: PuzzleTemplate={id:'weighted-recurrence',category:'Weighted recurrence',generate:rng=>{
 const first=int(rng,1,6),second=int(rng,2,9),factor=int(rng,2,3),offset=int(rng,-4,5),count=int(rng,4,5),terms=[first,second];
 while(terms.length<count+1)terms.push(terms.at(-1)!*factor+terms.at(-2)!+offset);
 const adjustment=offset<0?' - '+Math.abs(offset):' + '+offset;
 return make('weighted-recurrence:'+first+':'+second+':'+factor+':'+offset+':'+count,'Weighted recurrence',terms.slice(0,count),terms[count],'Multiply the previous term and combine the term before it','Each new term is '+factor+' times the previous term plus the term before that'+(offset===0?'':adjustment)+'; the next term is '+terms[count]+'.',['Each term depends on the two terms before it.','Use both earlier values, not just one.','Calculate '+factor+' x '+terms[count-1]+' + '+terms[count-2]+(offset<0?' - '+Math.abs(offset):' + '+offset)+' to get '+terms[count]+'.'],{type:'weighted-recurrence',factor,offset});
}};
const reverseAdd: PuzzleTemplate={id:'reverse-add',category:'Digit operations',generate:rng=>{
 const start=int(rng,11,49),count=5,terms=[start];while(terms.length<count+1)terms.push(terms.at(-1)!+reverseDigits(terms.at(-1)!));
 return make('reverse-add:'+start,'Digit operations',terms.slice(0,count),terms[count],'Add each number to its digit reversal','Reverse the digits and add them to the original number each time; '+terms[count-1]+' + '+reverseDigits(terms[count-1])+' = '+terms[count]+'.',['Watch how the digits change from term to term.','Reverse a term, then combine it with the original.','Add '+terms[count-1]+' and '+reverseDigits(terms[count-1])+'.'],{type:'reverse-add',start});
}};
const collatzTerms=(start:number,count:number)=>{const terms=[start];while(terms.length<count+1)terms.push(collatzNext(terms.at(-1)!));return terms};
const fairCollatzStarts=Array.from({length:73},(_,index)=>index+27).filter(start=>{
 const shown=collatzTerms(start,5).slice(0,4);
 return shown.some(value=>value%2===0)&&shown.some(value=>value%2!==0);
});
const collatz: PuzzleTemplate={id:'collatz',category:'Conditional rules',generate:rng=>{
 const start=fairCollatzStarts[int(rng,0,fairCollatzStarts.length-1)],count=5,terms=collatzTerms(start,count),last=terms[count-1],answer=terms[count];
 return make('collatz:'+start+':'+count,'Conditional rules',terms.slice(0,count),answer,'Halve even terms; triple odd terms and add one','For an even term, halve it; for an odd term, multiply by 3 and add 1. '+last+' is '+(last%2===0?'even, so '+last+' / 2 = '+answer:'odd, so 3 x '+last+' + 1 = '+answer)+'.',['Check whether each number is odd or even before moving to the next one.','The rule changes with parity: visible even and odd terms each demonstrate a different step.','For an odd term, multiply by 3 and add 1; apply that to '+last+'.'],{type:'collatz',start});
}};
const primeGaps: PuzzleTemplate={id:'prime-gaps',category:'Number theory',generate:rng=>{
 const possibilities:number[]=[];for(let start=11;start<=97;start+=2){if(!isPrime(start))continue;for(const firstGap of [2,4,6]){const growth=2,terms=[start];let gap=firstGap;while(terms.length<7){terms.push(terms.at(-1)!+gap);gap+=growth}if(terms.every(isPrime))possibilities.push(start,firstGap)}}
 const choice=int(rng,0,possibilities.length/2-1),start=possibilities[choice*2],firstGap=possibilities[choice*2+1],growth=2,count=6,terms=[start];let gap=firstGap;while(terms.length<count+1){terms.push(terms.at(-1)!+gap);gap+=growth}
 return make('prime-gaps:'+start+':'+firstGap,'Number theory',terms.slice(0,count),terms[count],'Prime numbers with growing gaps','The gaps grow by '+growth+': '+Array.from({length:count},(_,i)=>firstGap+i*growth).join(', ')+'. The next prime is '+terms[count]+'.',['These are not consecutive primes; compare the gaps.','Each gap increases by '+growth+'.','Add '+(firstGap+(count-1)*growth)+' to '+terms[count-1]+' to get '+terms[count]+'.'],{type:'prime-gaps',start,firstGap,growth});
}};
export const templates:PuzzleTemplate[]=[arithmetic,geometric,powers,fibonacci,differences,doubling,recurrence,factorial,primes,triangular,lookAndSay,quadratic,weightedRecurrence,reverseAdd,collatz,primeGaps];
export function generatePuzzle(difficulty:PracticeDifficulty,recentIds:string[]=[],rng:()=>number=Math.random){
 const recent=new Set(recentIds);
 let fallback:GeneratedPuzzle|undefined;
 for(let attempt=0;attempt<Math.max(1000,recentIds.length*2);attempt++){
  const template=templates[int(rng,0,templates.length-1)],puzzle=template.generate(rng);
  if(!puzzle.sequence.every(safe)||!safe(puzzle.answer))continue;
  if(difficulty==='All'&&puzzle.difficulty==='Easy')continue;
  if(difficulty!=='All'&&puzzle.difficulty!==ratingForPlayerDifficulty[difficulty])continue;
  if(!fallback)fallback=puzzle;
  if(!recent.has(puzzle.id))return puzzle;
 }
 if(fallback)return fallback;
 throw new Error('No puzzle templates can currently generate a '+difficulty+' puzzle.');
}
export const generatePracticePuzzle=generatePuzzle;

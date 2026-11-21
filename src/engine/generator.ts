import type {Puzzle,VisualShape,VisualTile} from '../types';
import type {AnswerPattern} from '../data/puzzleTypes';
import {rateDifficulty, ratingForPlayerDifficulty, type PlayerDifficulty} from './difficulty';

export type PracticeDifficulty=PlayerDifficulty|'All';
export type GeneratedPuzzle=Puzzle&{templateId:string;difficultyScore:number;pattern:AnswerPattern;shapePattern?:{sequence:string[];answer:string;choices:string[]}};
export type PuzzleTemplate={id:string;category:string;generate:(rng:()=>number)=>GeneratedPuzzle};
const int=(rng:()=>number,min:number,max:number)=>min+Math.floor(rng()*(max-min+1));
const safe=(n:number)=>Number.isSafeInteger(n)&&Math.abs(n)<=1_000_000;
const isPrime=(n:number)=>{if(n<2)return false;for(let d=2;d*d<=n;d++)if(n%d===0)return false;return true};
const nextPrime=(n:number)=>{let value=n+1;while(!isPrime(value))value++;return value};
const reverseDigitValue=(n:number)=>Number(String(n).split('').reverse().join(''));
const collatzNext=(n:number)=>n%2===0?n/2:3*n+1;
const sayNumber=(n:number)=>{const text=String(n);let result='';for(let i=0;i<text.length;){let end=i+1;while(end<text.length&&text[end]===text[i])end++;result+=String(end-i)+text[i];i=end}return Number(result)};
function patternEquation(pattern:AnswerPattern):string{
 switch(pattern.type){
  case 'interleaved':return 'Follow the odd-position numbers: add '+pattern.firstStep+' each time. The even-position numbers follow their own pattern.';
  case 'decreasing-difference':return 'The amounts subtracted get smaller by '+pattern.growth+' each time.';
  case 'arithmetic':return pattern.step<0?'Subtract '+Math.abs(pattern.step)+' from each number to get the next.':'Add '+pattern.step+' to each number to get the next.';
  case 'geometric':return 'Multiply each number by '+pattern.factor+' to get the next.';
  case 'power':return pattern.exponent===2?'The terms are consecutive whole numbers multiplied by themselves.':'The terms are consecutive whole numbers multiplied by themselves three times.';
  case 'fibonacci':return 'Add the previous two numbers to get the next one.';
  case 'alternating':return pattern.byPosition?'Odd-position numbers add '+pattern.oddStep+' each time; even-position numbers add '+pattern.evenStep+'.':'The steps alternate between adding '+pattern.oddStep+' and adding '+pattern.evenStep+'.';
  case 'increasing-difference':return 'The gaps grow by '+pattern.growth+' each time. Find the next gap, then add it to the last number.';
  case 'doubling-difference':return 'Each gap is twice the gap before it. Double the last gap and add it to the last number.';
  case 'multiply-adjust':return 'Multiply each number by '+pattern.factor+(pattern.offset<0?' and subtract '+Math.abs(pattern.offset):' and add '+pattern.offset)+' to get the next.';
  case 'factorial':return 'Multiply by the next counting number each time. The multipliers go up by one.';
  case 'triangular':return 'Add the next counting number each time: 1, then 2, then 3, and so on.';
  case 'look-and-say':return 'Read each run of repeated digits as a count and a digit to make the next term.';
  case 'alternating-operation':return 'Two rules take turns: multiply by '+pattern.factorA+(pattern.offsetA<0?' and subtract '+Math.abs(pattern.offsetA):' and add '+pattern.offsetA)+', then multiply by '+pattern.factorB+(pattern.offsetB<0?' and subtract '+Math.abs(pattern.offsetB):' and add '+pattern.offsetB)+'.';
  case 'weighted-recurrence':return 'Multiply the last number by '+pattern.factor+', then add the number before it'+(pattern.offset<0?' and subtract '+Math.abs(pattern.offset):pattern.offset>0?' and add '+pattern.offset:'')+'.';
  case 'reverse-add':return 'Reverse the digits of a number, then add that reversed number to the original.';
  case 'collatz':return 'For an even number, halve it. For an odd number, triple it and add one.';
  case 'prime-gaps':return 'The gaps between these prime numbers grow by '+pattern.growth+' each time.';
  case 'modular-cycle':return 'Add '+pattern.step+' each time. When the count reaches '+pattern.modulus+', start again at 0.';
  case 'digit-sum':return 'Add the digits of a number, then add that total to the number.';
  case 'tribonacci':return 'Add the previous three numbers to get the next one.';
  case 'digit-product':return 'Multiply the digits in a number, then add that product to the number.';
  case 'reverse-digits':return 'Reverse the digits to get the next number.';
  case 'lucas':return 'Start with 2 and 1, then add the previous two numbers each time.';
  case 'pell':return 'Double the last number and add the number before it.';
  case 'polygonal':return 'These numbers count dots arranged in matching '+pattern.sides+'-sided shapes.';
  case 'prime':return 'Each term is the next number that has no factors besides 1 and itself.';
  case 'shape-cycle':return 'Move '+pattern.step+' place(s) forward in the repeating shape order.';
  case 'visual-matrix':return 'Look for the same change repeating across a row or pair of shapes.';
 }
}function make(id:string,category:string,sequence:number[],answer:number,rule:string,explanation:string,hints:[string,string,string],pattern:AnswerPattern):GeneratedPuzzle{
 const templateId=id.split(':')[0],rating=rateDifficulty(sequence,answer,pattern);
 const specificHint=templateId==='visual-matrix'?hints[2]:patternEquation(pattern);
 return {id,templateId,category,difficulty:rating.difficulty,difficultyScore:rating.score,pattern,sequence,answer,rule,explanation,hints:[hints[0],hints[1],specificHint]};
}
const arithmetic: PuzzleTemplate={id:'arithmetic',category:'Arithmetic',generate:rng=>{
 const start=int(rng,-30,60),step=int(rng,1,12)*(rng()<.25?-1:1),count=int(rng,4,5),seq=Array.from({length:count},(_,i)=>start+i*step),answer=start+count*step;
 const action=step>0?'Add '+step:'Subtract '+Math.abs(step);return make('arithmetic:'+start+':'+step+':'+count,'Arithmetic',seq,answer,action,action+' each term; the next term is '+answer+'.',[ 'Compare the gaps between neighbors.','Work out each gap by subtracting a term from the next, then compare the results.',action+' each time.'],{type:'arithmetic',step});
}};
const missingMiddle: PuzzleTemplate={id:'missing-middle',category:'Sequence completion',generate:rng=>{
 const start=int(rng,-12,24),step=int(rng,2,9)*(rng()<.25?-1:1),terms=Array.from({length:5},(_,index)=>start+step*index),answerIndex=int(rng,1,3),answer=terms[answerIndex],shown=terms.filter((_,index)=>index!==answerIndex),position=answerIndex+1;
 const puzzle=make('missing-middle:'+start+':'+step+':'+answerIndex,'Sequence completion',shown,answer,'Find the missing middle term','The sequence changes by '+(step>0?'adding '+step:'subtracting '+Math.abs(step))+' each time. The missing value is in position '+position+': '+answer+'.',['Compare the gaps between the values you can see.','The same step connects each neighboring pair, including the blank.','This sequence '+(step>0?'adds ':'subtracts ')+Math.abs(step)+' each time; find the value that fits position '+position+'.'],{type:'arithmetic',step});
 return {...puzzle,taskFormat:'missing-middle',answerIndex};
}};
const oddTerm: PuzzleTemplate={id:'odd-term',category:'Pattern check',generate:rng=>{
 const start=int(rng,-8,18),step=int(rng,2,8)*(rng()<.2?-1:1),terms=Array.from({length:5},(_,index)=>start+step*index),oddTermIndex=int(rng,1,3),adjustment=int(rng,3,9)*(rng()<.5?-1:1);
 terms[oddTermIndex]+=adjustment;
 const answer=terms[oddTermIndex],puzzle=make('odd-term:'+start+':'+step+':'+oddTermIndex+':'+adjustment,'Pattern check',terms,answer,'Find the term that breaks the pattern','The intended pattern changes by '+(step>0?'adding '+step:'subtracting '+Math.abs(step))+' each time. Term '+(oddTermIndex+1)+' is '+answer+', which does not fit; it should be '+(start+step*oddTermIndex)+'.',['Compare the gaps from one term to the next.','Four terms fit a steady step; look for the value that makes the gaps change.','The rule is '+(step>0?'add ':'subtract ')+Math.abs(step)+' each time. Find the displayed term that breaks it.'],{type:'arithmetic',step});
 return {...puzzle,taskFormat:'find-odd-term',displaySequence:terms,oddTermIndex};
}};
const geometric: PuzzleTemplate={id:'geometric',category:'Multiplication',generate:rng=>{
 const factor=int(rng,2,3),count=int(rng,4,5),start=int(rng,1,5),seq=Array.from({length:count},(_,i)=>start*factor**i),answer=start*factor**count;
 return make('geometric:'+start+':'+factor+':'+count,'Multiplication',seq,answer,'Multiply by '+factor,'Each term is multiplied by '+factor+'; the next term is '+answer+'.',[ 'Compare each term to the one before it.','Divide each term by the one before it and compare the quotients.','Multiply by '+factor+' each time.'],{type:'geometric',factor});
}};
const powers: PuzzleTemplate={id:'powers',category:'Powers',generate:rng=>{
 const exponent=int(rng,2,3) as 2|3,start=int(rng,1,exponent===2?7:4),count=4,seq=Array.from({length:count},(_,i)=>(start+i)**exponent),answer=(start+count)**exponent,label=exponent===2?'square':'cube';
 return make('powers:'+exponent+':'+start,'Powers',seq,answer,label+' numbers','These are consecutive '+label+' numbers. The next is '+(start+count)+'^'+exponent+' = '+answer+'.',[ 'The gaps between terms are growing.','Check which consecutive whole numbers, raised to the stated power, match the terms.','Continue with '+(start+count)+'^'+exponent+'.'],{type:'power',exponent,start});
}};
const fibonacci: PuzzleTemplate={id:'fibonacci',category:'Recursive',generate:rng=>{
 const a=int(rng,1,3),b=int(rng,a,5),seq=[a,b];while(seq.length<5)seq.push(seq.at(-1)!+seq.at(-2)!);const answer=seq[4]+seq[3];
 return make('fibonacci:'+a+':'+b,'Recursive',seq,answer,'Add the previous two','Each term is the sum of the previous two terms: '+seq[3]+' + '+seq[4]+' = '+answer+'.',[ 'Look back more than one position.','For each term after the first two, test whether the previous pair adds to it.','Add '+seq[3]+' and '+seq[4]+'.'],{type:'fibonacci'});
}};
const differences: PuzzleTemplate={id:'differences',category:'Differences',generate:rng=>{
 const start=int(rng,-10,20),first=int(rng,1,8),growth=int(rng,1,4),seq=[start];for(let i=0;i<4;i++)seq.push(seq.at(-1)!+first+i*growth);const answer=seq[4]+first+4*growth;
 return make('differences:'+start+':'+first+':'+growth,'Differences',seq,answer,'Differences increase by '+growth,'The first differences increase by '+growth+' each time; the next gap is '+(first+4*growth)+', giving '+answer+'.',[ 'Compare the gaps between consecutive terms.','Write down the gaps, then compare how much each gap changes.','The next gap is '+(first+4*growth)+'.'],{type:'increasing-difference',firstDifference:first,growth});
}};
const doubling: PuzzleTemplate={id:'doubling-gaps',category:'Differences',generate:rng=>{
 const start=int(rng,-20,20),step=int(rng,1,4)*(rng()<.5?-1:1),seq=[start,start+step,start+3*step,start+7*step],answer=start+15*step;
 return make('doubling-gaps:'+start+':'+step,'Differences',seq,answer,'Double each difference','The gaps are '+step+', '+2*step+', and '+4*step+'; next add '+8*step+' to get '+answer+'.',[ 'Look at the gaps between terms.','Write down the gaps and compare each one with the gap before it.','The next gap is '+8*step+'.'],{type:'doubling-difference',firstDifference:step});
}};
const recurrence: PuzzleTemplate={id:'multiply-adjust',category:'Mixed',generate:rng=>{
 const factor=int(rng,2,4),offset=int(rng,-9,9),start=int(rng,1,8),count=int(rng,4,5),seq=[start];while(seq.length<count)seq.push(seq.at(-1)!*factor+offset);const answer=seq.at(-1)!*factor+offset;
 return make('multiply-adjust:'+start+':'+factor+':'+offset+':'+count,'Mixed',seq,answer,'Multiply by '+factor+' then '+(offset<0?'subtract '+Math.abs(offset):'add '+offset),'Multiply each term by '+factor+(offset<0?' and subtract '+Math.abs(offset):' and add '+offset)+', giving '+answer+'.',[ 'Check whether multiplication is involved.','Compare each term with the multiplied previous term; what consistent adjustment remains?','Multiply by '+factor+(offset<0?' and subtract '+Math.abs(offset):' and add '+offset)+', giving '+answer+'.'],{type:'multiply-adjust',factor,offset});
}};
const factorial: PuzzleTemplate={id:'factorial',category:'Recursive',generate:rng=>{
 const start=int(rng,1,3),fact=(n:number)=>{let x=1;for(let i=2;i<=n;i++)x*=i;return x},seq=Array.from({length:4},(_,i)=>fact(start+i)),answer=fact(start+4);
 return make('factorial:'+start,'Recursive',seq,answer,'Factorials','Multiply by consecutive integers; the next multiplier is '+(start+4)+', giving '+answer+'.',[ 'Look at the ratios between terms.','Divide each term by the previous one and list the multipliers.','Multiply '+seq[3]+' by '+(start+4)+'.'],{type:'factorial',start});
}};
const primes: PuzzleTemplate={id:'primes',category:'Number theory',generate:rng=>{
 const starts=[2,3,5,7,11,13,17,19,23,29],start=starts[int(rng,0,starts.length-1)],count=int(rng,4,5),terms=[start];
 while(terms.length<count+1)terms.push(nextPrime(terms.at(-1)!));
 const sequence=terms.slice(0,count),answer=terms[count];
 return make('primes:'+start+':'+count,'Number theory',sequence,answer,'Consecutive prime numbers','Each term is the next prime; the prime after '+sequence.at(-1)+' is '+answer+'.',['Check which numbers have no divisors other than 1 and themselves.','Check which numbers between the terms have no divisors other than 1 and themselves.','Find the next prime after '+sequence.at(-1)+'.'],{type:'prime',start});
}};
const triangular: PuzzleTemplate={id:'triangular',category:'Figurate numbers',generate:rng=>{
 const start=int(rng,3,15),count=int(rng,4,5),value=(n:number)=>n*(n+1)/2,terms=Array.from({length:count+1},(_,i)=>value(start+i));
 return make('triangular:'+start+':'+count,'Figurate numbers',terms.slice(0,count),terms[count],'Triangular numbers','Add consecutive integers to build each term; the next is '+(start+count)+' x '+(start+count+1)+' / 2 = '+terms[count]+'.',['Compare the differences between terms.','Write down the gaps, then compare the increase from one gap to the next.','Add the next counting number, '+(start+count)+'.'],{type:'triangular',start});
}};
const lookAndSay: PuzzleTemplate={id:'look-and-say',category:'Look-and-say',generate:rng=>{
 const start=int(rng,1,2) as 1|2,count=4,terms:number[]=[start];
 while(terms.length<count+1)terms.push(sayNumber(terms.at(-1)!));
 return make('look-and-say:'+start,'Look-and-say',terms.slice(0,count),terms[count],'Read and describe the previous term','Describe each run of digits in the previous term; the next description gives '+terms[count]+'.',['Read each term aloud as counts and digits.','Split the previous term into runs of repeated digits and describe each run.','The prior term has runs that read as '+terms[count]+'.'],{type:'look-and-say',start});
}};
const weightedRecurrence: PuzzleTemplate={id:'weighted-recurrence',category:'Weighted recurrence',generate:rng=>{
 const first=int(rng,1,6),second=int(rng,2,9),factor=int(rng,2,3),offset=int(rng,-4,5),count=int(rng,4,5),terms=[first,second];
 while(terms.length<count+1)terms.push(terms.at(-1)!*factor+terms.at(-2)!+offset);
 const adjustment=offset<0?' - '+Math.abs(offset):' + '+offset;
 return make('weighted-recurrence:'+first+':'+second+':'+factor+':'+offset+':'+count,'Weighted recurrence',terms.slice(0,count),terms[count],'Multiply the previous term and combine the term before it','Each new term is '+factor+' times the previous term plus the term before that'+(offset===0?'':adjustment)+'; the next term is '+terms[count]+'.',['Each term depends on the two terms before it.','Test how the previous two terms contribute to the next term.','Calculate '+factor+' x '+terms[count-1]+' + '+terms[count-2]+(offset<0?' - '+Math.abs(offset):' + '+offset)+' to get '+terms[count]+'.'],{type:'weighted-recurrence',factor,offset});
}};
const reverseAdd: PuzzleTemplate={id:'reverse-add',category:'Digit operations',generate:rng=>{
 const start=int(rng,11,49),count=5,terms=[start];while(terms.length<count+1)terms.push(terms.at(-1)!+reverseDigitValue(terms.at(-1)!));
 return make('reverse-add:'+start,'Digit operations',terms.slice(0,count),terms[count],'Add each number to its reverse','Reverse the digits, then add: '+terms[count-1]+' + '+reverseDigitValue(terms[count-1])+' = '+terms[count]+'.',['Watch how the digits change from term to term.','Reverse the digits of a term and compare that value with the next term.','Add '+terms[count-1]+' and '+reverseDigitValue(terms[count-1])+'.'],{type:'reverse-add',start});
}};
const collatzTerms=(start:number,count:number)=>{const terms=[start];while(terms.length<count+1)terms.push(collatzNext(terms.at(-1)!));return terms};
const fairCollatzStarts=Array.from({length:73},(_,index)=>index+27).filter(start=>{
 const shown=collatzTerms(start,5).slice(0,4);
 return shown.some(value=>value%2===0)&&shown.some(value=>value%2!==0);
});
const collatz: PuzzleTemplate={id:'collatz',category:'Conditional rules',generate:rng=>{
 const start=fairCollatzStarts[int(rng,0,fairCollatzStarts.length-1)],count=5,terms=collatzTerms(start,count),last=terms[count-1],answer=terms[count];
 return make('collatz:'+start+':'+count,'Conditional rules',terms.slice(0,count),answer,'Halve even terms; triple odd terms and add one','For an even term, halve it; for an odd term, multiply by 3 and add 1. '+last+' is '+(last%2===0?'even, so '+last+' / 2 = '+answer:'odd, so 3 x '+last+' + 1 = '+answer)+'.',['Check whether each number is odd or even before moving to the next one.','Group the transitions by whether the starting term is even or odd.','For an odd term, multiply by 3 and add 1; apply that to '+last+'.'],{type:'collatz',start});
}};
const primeGaps: PuzzleTemplate={id:'prime-gaps',category:'Number theory',generate:rng=>{
 const possibilities:number[]=[];for(let start=11;start<=97;start+=2){if(!isPrime(start))continue;for(const firstGap of [2,4,6]){const growth=2,terms=[start];let gap=firstGap;while(terms.length<7){terms.push(terms.at(-1)!+gap);gap+=growth}if(terms.every(isPrime))possibilities.push(start,firstGap)}}
 const choice=int(rng,0,possibilities.length/2-1),start=possibilities[choice*2],firstGap=possibilities[choice*2+1],growth=2,count=6,terms=[start];let gap=firstGap;while(terms.length<count+1){terms.push(terms.at(-1)!+gap);gap+=growth}
 return make('prime-gaps:'+start+':'+firstGap,'Number theory',terms.slice(0,count),terms[count],'Prime numbers with growing gaps','The gaps grow by '+growth+': '+Array.from({length:count},(_,i)=>firstGap+i*growth).join(', ')+'. The next prime is '+terms[count]+'.',['These are not consecutive primes; compare the gaps.','Write down the gaps and compare how much each increases.','Add '+(firstGap+(count-1)*growth)+' to '+terms[count-1]+' to get '+terms[count]+'.'],{type:'prime-gaps',start,firstGap,growth});
}};
const modularCycle: PuzzleTemplate={id:'modular-cycle',category:'Number patterns',generate:rng=>{
 const modulus=int(rng,7,12),step=int(rng,2,5),start=int(rng,0,modulus-1),count=5,terms=Array.from({length:count+1},(_,i)=>(start+i*step)%modulus);
 return make('modular-cycle:'+start+':'+step+':'+modulus,'Number patterns',terms.slice(0,count),terms[count],'Count forward and wrap around','Add '+step+' each time, wrapping back to 0 after '+(modulus-1)+'. The next value is '+terms[count]+'.',['Notice whether values wrap back to the beginning.','Try adding the same amount, then reduce by the cycle length when needed.','Add '+step+' and wrap around the '+modulus+'-value cycle.'],{type:'modular-cycle',step,modulus});
}};
const digitSum: PuzzleTemplate={id:'digit-sum',category:'Digit operations',generate:rng=>{
 const start=int(rng,14,48),count=5,terms=[start],sumDigits=(n:number)=>String(n).split('').reduce((sum,digit)=>sum+Number(digit),0);
 while(terms.length<count+1)terms.push(terms.at(-1)!+sumDigits(terms.at(-1)!));
 return make('digit-sum:'+start,'Digit operations',terms.slice(0,count),terms[count],'Add the digits of each term','Add the digits of '+terms[count-1]+' ('+sumDigits(terms[count-1])+') to get '+terms[count]+'.',['Look at the digits inside each number.','Add the digits of a term and compare that sum with the next step.','Add '+sumDigits(terms[count-1])+' to '+terms[count-1]+'.'],{type:'digit-sum',step:1});
}};
const tribonacci: PuzzleTemplate={id:'tribonacci',category:'Recursive',generate:rng=>{
 const first=int(rng,1,2),second=int(rng,1,3),third=int(rng,1,4),terms=[first,second,third];while(terms.length<6)terms.push(terms.at(-1)!+terms.at(-2)!+terms.at(-3)!);
 return make('tribonacci:'+first+':'+second+':'+third,'Recursive',terms.slice(0,5),terms[5],'Add the previous three','Each term after the first three is the sum of the previous three; '+terms[2]+' + '+terms[3]+' + '+terms[4]+' = '+terms[5]+'.',['Each new term looks back three places.','Try adding the three terms immediately before a later value.','Add '+terms[2]+', '+terms[3]+', and '+terms[4]+'.'],{type:'tribonacci'});
}};
const lucas: PuzzleTemplate={id:'lucas',category:'Famous sequences',generate:()=>{
 const terms=[2,1];while(terms.length<6)terms.push(terms.at(-1)!+terms.at(-2)!);
 return make('lucas','Famous sequences',terms.slice(0,5),terms[5],'Lucas numbers','Start with 2 and 1; each later term is the sum of the previous two. '+terms[3]+' + '+terms[4]+' = '+terms[5]+'.',['This resembles another famous sequence but begins with different numbers.','Add consecutive neighboring terms to see if each later value fits.','Add '+terms[3]+' and '+terms[4]+'.'],{type:'lucas'});
}};
const pell: PuzzleTemplate={id:'pell',category:'Famous sequences',generate:()=>{
 const terms=[0,1];while(terms.length<6)terms.push(2*terms.at(-1)!+terms.at(-2)!);
 return make('pell','Famous sequences',terms.slice(0,5),terms[5],'Pell numbers','Each term is twice the previous term plus the term before it. 2 × '+terms[4]+' + '+terms[3]+' = '+terms[5]+'.',['Look back two terms when checking the recurrence.','Try doubling the previous term, then adding the term before it.','Double '+terms[4]+' and add '+terms[3]+'.'],{type:'pell'});
}};
const polygonal: PuzzleTemplate={id:'polygonal',category:'Figurate numbers',generate:rng=>{
 const sides=int(rng,5,6) as 5|6,start=int(rng,2,5),count=5,value=(n:number)=>((sides-2)*n*n-(sides-4)*n)/2,terms=Array.from({length:count+1},(_,i)=>value(start+i)),name=sides===5?'Pentagonal':'Hexagonal';
 return make('polygonal:'+sides+':'+start,'Figurate numbers',terms.slice(0,count),terms[count],name+' numbers','These are consecutive '+name.toLowerCase()+' numbers; the next uses n = '+(start+count)+', giving '+terms[count]+'.',['Compare the gaps between neighboring terms.','The gaps grow steadily, but not by the same amount as square numbers.','Continue the '+name.toLowerCase()+' number pattern to n = '+(start+count)+'.'],{type:'polygonal',sides,start});
}};
const digitProduct: PuzzleTemplate={id:'digit-product',category:'Digit operations',generate:rng=>{
 const start=int(rng,23,39),count=5,productDigits=(n:number)=>String(n).split('').reduce((product,digit)=>product*Number(digit),1),terms=[start];while(terms.length<count+1)terms.push(terms.at(-1)!+productDigits(terms.at(-1)!));
 return make('digit-product:'+start,'Digit operations',terms.slice(0,count),terms[count],'Add the product of the digits','The digits of '+terms[count-1]+' multiply to '+productDigits(terms[count-1])+', so the next term is '+terms[count]+'.',['Look at the digits within each term.','Multiply the digits of a term and compare that product with the next increase.','Add '+productDigits(terms[count-1])+' to '+terms[count-1]+'.'],{type:'digit-product'});
}};
const alternatingSteps: PuzzleTemplate={id:'alternating-steps',category:'Alternating steps',generate:rng=>{
 const start=int(rng,-15,20),oddStep=int(rng,2,9),drawnEvenStep=int(rng,1,8),evenStep=drawnEvenStep===oddStep?(oddStep===8?7:oddStep+1):drawnEvenStep,count=5,terms=[start];
 while(terms.length<count+1){const index=terms.length-1;terms.push(terms.at(-1)!+(index%2===0?oddStep:evenStep))}
 return make('alternating-steps:'+start+':'+oddStep+':'+evenStep,'Alternating steps',terms.slice(0,count),terms[count],'Alternate between two step sizes','The differences alternate between '+oddStep+' and '+evenStep+'. The next step is '+oddStep+', so the next term is '+terms[count]+'.',['Compare the gaps between neighboring terms.','Write down the gaps and check whether they alternate between two values.','Continue alternating the two step sizes.'],{type:'alternating',oddStep,evenStep});
}};
const alternatingOperations: PuzzleTemplate={id:'alternating-operations',category:'Alternating operations',generate:rng=>{
 const start=int(rng,2,8),factorA=int(rng,2,3),factorB=int(rng,2,3),offsetA=int(rng,-3,4),offsetB=int(rng,-3,4),count=5,terms=[start];
 while(terms.length<count+1){const index=terms.length-1;terms.push(terms.at(-1)!*(index%2===0?factorA:factorB)+(index%2===0?offsetA:offsetB))}
 return make('alternating-operations:'+start+':'+factorA+':'+offsetA+':'+factorB+':'+offsetB,'Alternating operations',terms.slice(0,count),terms[count],'Alternate between two operations','Apply '+factorA+' times the previous term '+(offsetA<0?'minus '+Math.abs(offsetA):'plus '+offsetA)+' then '+factorB+' times the term '+(offsetB<0?'minus '+Math.abs(offsetB):'plus '+offsetB)+', alternating the steps. The next term is '+terms[count]+'.',['Check how each term changes into the next.','Compare every other transition to see whether each follows its own rule.','Continue alternating the two operations in the same order.'],{type:'alternating-operation',factorA,offsetA,factorB,offsetB});
}};
const matrixKinds: VisualShape['kind'][]=['triangle','pentagon','arrow','l-block'];
const shapeNames:Record<VisualShape['kind'],string>={triangle:'triangle',pentagon:'pentagon',arrow:'arrow','l-block':'L-shaped block'};
type MatrixFamily=NonNullable<NonNullable<Puzzle['visualPattern']>['family']>;
const pieceKey=(piece:VisualShape)=>[piece.kind,piece.fill,piece.rotation,piece.count??1,piece.slot??''].join(':');
const tileKey=(tile:VisualTile)=>tile.map(pieceKey).sort().join('|');
const piece=(kind:VisualShape['kind'],attrs:Partial<VisualShape>={}):VisualShape=>({kind,fill:'solid',rotation:0,...attrs});
const cornerNames=['top-left','top-right','bottom-left','bottom-right'] as const;
const pluralShapeNames:Record<VisualShape['kind'],string>={triangle:'triangles',pentagon:'pentagons',arrow:'arrows','l-block':'L-shaped blocks'};
function describeVisualShape(shape:VisualShape):string{
 const count=shape.count??1,fill=shape.fill==='outline'?'outline':'solid',noun=count===1?shapeNames[shape.kind]:pluralShapeNames[shape.kind],amount=count===1?'':count===2?'two ':count===3?'three ':String(count)+' ';
 let description=amount?(amount+fill+' '+noun):((fill==='outline'?'an ':'a ')+fill+' '+noun);
 if(shape.rotation)description+=' turned '+shape.rotation+' degrees clockwise';
 if(shape.slot!==undefined)description+=' in the '+cornerNames[shape.slot]+' corner';
 return description;
}
function describeVisualTile(tile:VisualTile):string{
 return tile.length?tile.map(describeVisualShape).join(' and '):'an empty tile';
}
function nameVisualTile(tile:VisualTile):string{
 return tile.length?tile.map(shape=>shapeNames[shape.kind]).join(' and '):'an empty tile';
}
function gridPosition(index:number,columns:number):string{
 const row=index<columns?'top':columns===2?'bottom':index<columns*2?'middle':'bottom';
 const column=index%columns===0?'left':index%columns===columns-1?'right':'center';
 return row+'-'+column;
}
function orientation(degrees:number):string{return degrees===0?'upright (0 degrees)':degrees+' degrees clockwise'}
function visualAnswerExplanation(family:MatrixFamily,cells:(VisualTile|null)[],answer:VisualTile,missingIndex:number,columns:number,letter:string,details:{shapeStep:number;fillByRow:boolean;rotationByColumn:boolean;shapeCycle:VisualShape['kind'][];transform?:number}):string{
 const answerDescription=describeVisualTile(answer),answerShape=answer[0],answerPosition=gridPosition(missingIndex,columns),sentences=['Correct answer: Option '+letter+'.'];
 if(family==='analogy-transform'){
  const from=(cells[2] as VisualTile)[0],topFrom=(cells[0] as VisualTile)[0],topTo=(cells[1] as VisualTile)[0],transform=details.transform??0;
  if(transform===0)sentences.push('Across the top row, the '+shapeNames[topFrom.kind]+' turns 90 degrees clockwise, from '+orientation(topFrom.rotation)+' to '+orientation(topTo.rotation)+'. Apply that turn across the bottom row, starting with the '+describeVisualShape(from)+' in the bottom-left tile; it becomes '+answerDescription+'.');
  else if(transform===1)sentences.push('Across the top row, the fill changes from '+topFrom.fill+' to '+topTo.fill+'. Apply the same change across the bottom row, starting with the '+describeVisualShape(from)+' in the bottom-left tile; it becomes '+answerDescription+'.');
  else if(transform===2)sentences.push('Across the top row, the shape changes from '+shapeNames[topFrom.kind]+' to '+shapeNames[topTo.kind]+'. Apply that same one-step change across the bottom row, starting with the '+describeVisualShape(from)+' in the bottom-left tile; it becomes '+answerDescription+'.');
  else sentences.push('Across the top row, the number of shapes increases from '+(topFrom.count??1)+' to '+(topTo.count??1)+'. Apply the same increase across the bottom row, starting with the '+describeVisualShape(from)+' in the bottom-left tile; it becomes '+answerDescription+'.');
  sentences.push('That result belongs in the bottom-right tile, so Option '+letter+' completes the analogy.');return sentences.join(' ');
 }
 if(family==='shape-xor'||family==='shape-union'){
  const left=cells[6] as VisualTile,right=cells[7] as VisualTile,shared=left.filter(shape=>right.some(other=>other.kind===shape.kind)).map(shape=>shapeNames[shape.kind]);
  if(family==='shape-xor')sentences.push('In each row, shapes found in both of the first two tiles cancel out. In the bottom row, '+nameVisualTile(left)+' and '+nameVisualTile(right)+' share '+shared.join(' and ')+', so remove it and keep the other shapes.');
  else sentences.push('In each row, the first two tiles combine. If a shape appears in both, keep it once. In the bottom row, '+nameVisualTile(left)+' and '+nameVisualTile(right)+' make the missing tile.');
  sentences.push('The remaining shapes make '+answerDescription+' in the bottom-right tile. Option '+letter+' matches that result.');return sentences.join(' ');
 }
 if(family==='orbit-movement'){
  const previousIndex=missingIndex%columns===0?missingIndex-columns:missingIndex-1,previous=(cells[previousIndex] as VisualTile)[0],corners=['top-left','top-right','bottom-right','bottom-left'],startSlot=previous.slot??0,endSlot=answerShape.slot??0;
  sentences.push('The same '+shapeNames[previous.kind]+' moves one corner clockwise through this cycle: '+corners.join(' → ')+'. In the '+gridPosition(previousIndex,columns)+' tile it is in the '+corners[startSlot]+' corner. Moving one place clockwise puts it in the '+corners[endSlot]+' corner of the '+answerPosition+' tile.');
  sentences.push('Its fill stays solid, so the missing tile is '+answerDescription+'. Option '+letter+' has the shape in the right place.');return sentences.join(' ');
 }
 if(family==='row-distribution'){
  const rowTiles=[cells[6],cells[7]].filter(Boolean) as VisualTile[],columnTiles=[cells[missingIndex%columns],cells[missingIndex%columns+columns]].filter(Boolean) as VisualTile[],rowKinds=rowTiles.map(tile=>shapeNames[tile[0].kind]),columnKinds=columnTiles.map(tile=>shapeNames[tile[0].kind]);
  sentences.push('Each row and column contains one triangle, one pentagon, and one arrow. In row 3, the visible shapes are '+rowKinds.join(' and ')+', so the missing shape is '+shapeNames[answerShape.kind]+'.');
  sentences.push('Together, row 3 and column '+(missingIndex%columns+1)+' each need a '+shapeNames[answerShape.kind]+'. The column already has '+columnKinds.join(' and ')+'. Option '+letter+' places '+answerDescription+' in the '+answerPosition+' tile.');return sentences.join(' ');
 }
 if(family==='count-progression'){
  const previousIndex=missingIndex%columns===0?missingIndex-columns:missingIndex-1,previous=(cells[previousIndex] as VisualTile)[0];
  sentences.push('The same '+shapeNames[answerShape.kind]+' stays in each tile, while the count rises by one as you move right and down, wrapping from three back to one.');
  sentences.push('At '+gridPosition(previousIndex,columns)+' there are '+(previous.count??1)+'. Add one to get '+(answerShape.count??1)+' in the '+answerPosition+' tile: '+answerDescription+'. Option '+letter+' has that count.');return sentences.join(' ');
 }
 if(family==='reflection'){
  const column=missingIndex%columns,mirrorIndex=2*columns+(columns-1-column),mirror=cells[mirrorIndex] as VisualTile,above=(cells[missingIndex-columns] as VisualTile)[0],cycle=details.shapeCycle.map(kind=>shapeNames[kind]),aboveIndex=cycle.indexOf(shapeNames[above.kind]),nextShape=cycle[(aboveIndex+details.shapeStep)%cycle.length];
  if(column===1){sentences.push('In each row, the outside shapes mirror each other and the center is one cycle step later. The bottom corners show two '+shapeNames[answerShape.kind]+'s, so the center needs the next shape in this cycle: '+cycle.join(' → ')+'.');}
  else{sentences.push('Shapes advance '+details.shapeStep+' place'+(details.shapeStep===1?'':'s')+' down each outside column in this cycle: '+cycle.join(' → ')+'. Above the blank is a '+shapeNames[above.kind]+', so the next shape is '+nextShape+'. The opposite bottom corner also shows a '+shapeNames[mirror[0].kind]+', confirming the mirror.');}
  if(details.fillByRow)sentences.push('Fill alternates by row, so this row uses '+answerShape.fill+'.');else sentences.push('Fill alternates across columns, so this position uses '+answerShape.fill+'.');
  if(details.rotationByColumn){const startRotation=((cells[0] as VisualTile)[0]).rotation;sentences.push('Across each row, rotation starts '+orientation(startRotation)+' and turns 90 degrees clockwise per step, ending '+orientation(answerShape.rotation)+' here.');}
  else{const startRotation=((cells[column] as VisualTile)[0]).rotation;sentences.push('Down this column, the shape turns 90 degrees clockwise from '+orientation(startRotation)+' to '+orientation(answerShape.rotation)+'.');}
  sentences.push('Option '+letter+' completes the pattern with '+answerDescription+'.');return sentences.join(' ');
 }
 const previousIndex=missingIndex%columns===0?missingIndex-columns:missingIndex-1,previous=(cells[previousIndex] as VisualTile)[0],orderedCycle=details.shapeCycle.map(kind=>shapeNames[kind]),fromIndex=orderedCycle.indexOf(shapeNames[previous.kind]),progression=[shapeNames[previous.kind]];
 for(let i=0;i<details.shapeStep;i++)progression.push(orderedCycle[(fromIndex+i+1)%orderedCycle.length]);
 if(progression.at(-1)!==shapeNames[answerShape.kind])progression[progression.length-1]=shapeNames[answerShape.kind];
 sentences.push('The shape advances through this repeating cycle: '+orderedCycle.join(' → ')+'. From the '+gridPosition(previousIndex,columns)+' tile to the '+answerPosition+' tile, move '+details.shapeStep+' place'+(details.shapeStep===1?'':'s')+': '+progression.join(' → ')+'.');
 if(details.fillByRow)sentences.push('Fill alternates by row; the answer row uses '+answerShape.fill+'.');else sentences.push('Fill alternates across columns; the answer position uses '+answerShape.fill+'.');
 if(details.rotationByColumn){const startRotation=missingIndex%columns===0?((cells[0] as VisualTile)[0]).rotation:((cells[missingIndex-1] as VisualTile)[0]).rotation;sentences.push('Rotation starts '+orientation(startRotation)+' and each step right turns 90 degrees clockwise, ending '+orientation(answerShape.rotation)+' in the answer.');}
 else{const startRotation=((cells[missingIndex-columns] as VisualTile)[0]).rotation;sentences.push('Each step down turns the shape 90 degrees clockwise, from '+orientation(startRotation)+' to '+orientation(answerShape.rotation)+' in the answer.');}
 sentences.push('The missing tile is therefore '+answerDescription+'. Option '+letter+' matches all three features.');return sentences.join(' ');
}
function distinctOptions(answer:VisualTile,candidates:VisualTile[],rng:()=>number,total=8){
 const distinct:VisualTile[]=[];for(const option of [answer,...candidates])if(!distinct.some(item=>tileKey(item)===tileKey(option)))distinct.push(option);
 if(distinct.length<total)throw new Error('Visual puzzle could not create enough distinct choices.');
 const distractors=distinct.slice(1).map((_,index)=>index+1);
 for(let index=distractors.length-1;index>0;index--){const swap=int(rng,0,index);[distractors[index],distractors[swap]]=[distractors[swap],distractors[index]]}
 const order=[0,...distractors.slice(0,total-1)];
 for(let index=order.length-1;index>0;index--){const swap=int(rng,0,index);[order[index],order[swap]]=[order[swap],order[index]]}
 return {choices:order.map(index=>distinct[index]),answerIndex:order.indexOf(0)};
}
function makeVisualMatrix(rng:()=>number){
 const families:MatrixFamily[]=['attribute-cycle','row-distribution','reflection','count-progression','shape-xor','shape-union','orbit-movement','analogy-transform'];
 const family=families[int(rng,0,families.length-1)],matrixKinds3=matrixKinds.slice(0,3),fillStart=int(rng,0,1),fillByRow=rng()<.5,rotationByColumn=rng()<.5;
 let rows:2|3=3,columns:2|3=3,missingIndex=6+int(rng,0,2),cells:(VisualTile|null)[]=[],answer:VisualTile=[],ruleText='',rules:string[]=[],taskFormat:NonNullable<NonNullable<Puzzle['visualPattern']>['taskFormat']>='complete-matrix',candidates:VisualTile[]=[],shapeStep=1,visualTransform:number|undefined;
 const fillRule=fillByRow?'Fill alternates between rows.':'Fill alternates across columns.';
 const rotationRule=rotationByColumn?'Each step to the right turns a shape 90° clockwise.':'Each step down turns a shape 90° clockwise.';
 if(family==='shape-xor'||family==='shape-union'){
  const offset=int(rng,0,2),base=matrixKinds3.map((_,i)=>piece(matrixKinds3[(i+offset)%3])),operator=family==='shape-xor'?'XOR':'union';
  const combine=(left:VisualTile,right:VisualTile):VisualTile=>operator==='union'?base.filter(item=>left.some(v=>v.kind===item.kind)||right.some(v=>v.kind===item.kind)):base.filter(item=>left.some(v=>v.kind===item.kind)!==right.some(v=>v.kind===item.kind));
  cells=[];
  for(let row=0;row<3;row++){const a=[base[row],base[(row+1)%3]],b=[base[(row+1)%3],base[(row+2)%3]],result=combine(a,b);cells.push(a,b,row===2?null:result);if(row===2)answer=result}
  missingIndex=8;rules.push(family,'set-operation');ruleText=operator==='XOR'?'In each row, the third tile keeps shapes that appear in exactly one of the first two tiles. A shared shape cancels out.':'In each row, combine the shapes from the first two tiles and keep each shape only once.';
  const allSubsets=(mask:number):VisualTile=>base.filter((_,index)=>(mask&(1<<index))!==0);
  candidates=Array.from({length:8},(_,i)=>allSubsets(i));
 }else if(family==='analogy-transform'){
  rows=2;columns=2;missingIndex=3;taskFormat='analogy';
  const transform=int(rng,0,3),start=int(rng,0,3),shapeA=matrixKinds[start],shapeC=matrixKinds[(start+2)%4],turn=int(rng,0,3)*90;visualTransform=transform;
  const apply=(value:VisualShape):VisualShape=>transform===0?{...value,rotation:((value.rotation+90)%360) as VisualShape['rotation']}:transform===1?{...value,fill:value.fill==='solid'?'outline':'solid'}:transform===2?{...value,kind:matrixKinds[(matrixKinds.indexOf(value.kind)+1)%4]}:{...value,count:((value.count??1)%3+1) as 1|2|3};
  const a=piece(shapeA,{rotation:turn as VisualShape['rotation'],fill:rng()<.5?'solid':'outline'}),b=apply(a),c=piece(shapeC,{rotation:((turn+180)%360) as VisualShape['rotation'],fill:a.fill,count:1}),d=apply(c);cells=[ [a],[b],[c],null ];answer=[d];
  const variants:VisualTile[]=[[{...d,kind:matrixKinds[(matrixKinds.indexOf(d.kind)+1)%4]}],[{...d,kind:matrixKinds[(matrixKinds.indexOf(d.kind)+3)%4]}],[{...d,fill:d.fill==='solid'?'outline':'solid'}],[{...d,rotation:((d.rotation+90)%360) as VisualShape['rotation']}],[{...d,rotation:((d.rotation+180)%360) as VisualShape['rotation']}],[{...d,rotation:((d.rotation+270)%360) as VisualShape['rotation']}],[{...d,count:((d.count??1)%3+1) as 1|2|3}],[{...d,count:((d.count??1)%3+2) as 1|2|3}]];
  candidates=variants;rules.push(['quarter-turn','fill-flip','shape-progression','count-progression'][transform]);
  ruleText=transform===0?'The top pair shows a 90° clockwise turn. Apply the same turn to the bottom-left figure.':transform===1?'The top pair changes from solid to outline (or outline to solid). Apply that fill change to the bottom-left figure.':transform===2?'The top pair advances one shape in the cycle. Apply that same one-step shape change to the bottom-left figure.':'The top pair adds one shape, wrapping from three back to one. Apply that count change to the bottom-left figure.';
 }else{
  const shapeStart=int(rng,0,3);shapeStep=int(rng,1,3);const offset=int(rng,0,2),rotationStart=int(rng,0,3)*90;
  const cell=(row:number,column:number):VisualShape=>{
   let kind:VisualShape['kind'];
   if(family==='row-distribution')kind=matrixKinds3[(row+column+offset)%3];
   else if(family==='reflection')kind=matrixKinds[(shapeStart+Math.min(column,2-column)+row*shapeStep)%4];
   else if(family==='count-progression'||family==='orbit-movement')kind=matrixKinds[shapeStart];
   else kind=matrixKinds[(shapeStart+(row+column)*shapeStep)%4];
   const count=family==='count-progression'?((row+column+offset)%3+1) as 1|2|3:1;
   const orbit:[0|1|2|3,0|1|2|3,0|1|2|3,0|1|2|3]=[0,1,3,2];
   const slot=family==='orbit-movement'?orbit[(row+column+offset)%4]:undefined;
   const fill=family==='count-progression'||family==='orbit-movement'?'solid':(fillStart+(fillByRow?row:column))%2===0?'solid':'outline';
   const rotation=family==='orbit-movement'||family==='count-progression'?0:((rotationStart+(rotationByColumn?column:row)*90)%360) as VisualShape['rotation'];
   return piece(kind,{count,slot,fill,rotation});
  };
  cells=Array.from({length:9},(_,index)=>index===missingIndex?null:[cell(Math.floor(index/3),index%3)]);answer=[cell(Math.floor(missingIndex/3),missingIndex%3)];
  if(family==='row-distribution'){rules.push('distribute-three');ruleText='Each row and column contains one '+matrixKinds3.map(kind=>shapeNames[kind]).join(', one ')+', in a shifted order.'}
  else if(family==='reflection'){rules.push('reflection','row-progression');const places=shapeStep===1?'one':shapeStep===2?'two':'three';ruleText='Each row mirrors its outer shapes around the center column, while the shape pattern shifts '+places+' place'+(places==='one'?'':'s')+' as you move down.'}
  else if(family==='count-progression'){rules.push('count-progression');ruleText='The number of shapes increases by one moving right, then wraps from three back to one. The starting count shifts on each new row.'}
  else if(family==='orbit-movement'){rules.push('position-orbit');ruleText='The same shape moves through the four corners of each tile in a repeating clockwise cycle as you move through the grid.'}
  else {rules.push('shape-progression');const places=shapeStep===1?'one':shapeStep===2?'two':'three',cycle=matrixKinds.map(kind=>shapeNames[kind]).join(' → ');ruleText='Each move right or down advances '+places+' place(s) in the shape cycle ('+cycle+'), wrapping back to the start.'}
  if(family!=='count-progression'&&family!=='orbit-movement'){
   ruleText+=' '+fillRule+' '+rotationRule;
   rules.push('fill-'+(fillByRow?'row':'column'),'rotation-'+(rotationByColumn?'column':'row'));
  }
  const correct=answer[0];candidates=[[{...correct,kind:matrixKinds[(matrixKinds.indexOf(correct.kind)+1)%4]}],[{...correct,kind:matrixKinds[(matrixKinds.indexOf(correct.kind)+3)%4]}],[{...correct,fill:correct.fill==='solid'?'outline':'solid'}],[{...correct,rotation:((correct.rotation+90)%360) as VisualShape['rotation']}],[{...correct,rotation:((correct.rotation+270)%360) as VisualShape['rotation']}],[{...correct,count:((correct.count??1)%3+1) as 1|2|3}],[{...correct,slot:((correct.slot??0)+1)%4 as 0|1|2|3}]];
 }
 const options=distinctOptions(answer,candidates,rng,8),choices=options.choices,answerIndex=options.answerIndex;
 const letter=String.fromCharCode(65+answerIndex),answerDescription=describeVisualTile(answer);
 const explanation=visualAnswerExplanation(family,cells,answer,missingIndex,columns,letter,{shapeStep,fillByRow,rotationByColumn,shapeCycle:matrixKinds,transform:visualTransform});
 const kindAnswer=answerIndex;
 const puzzleRule=family==='analogy-transform'?'Complete the visual analogy':'Complete the shape pattern';
 if(cells.filter(value=>value===null).length!==1||cells[missingIndex]!==null||choices.length!==8||new Set(choices.map(tileKey)).size!==8||tileKey(choices[kindAnswer])!==tileKey(answer)||!explanation.startsWith('Correct answer: Option '+letter+'.')||!explanation.includes('Option '+letter)||!explanation.includes(answerDescription))throw new Error('Generated visual puzzle failed rule, answer, or choice validation.');
 return {cells,choices,answerIndex,missingIndex,rows,columns,family,ruleTypes:rules,taskFormat,explanation,ruleText,answer,puzzleRule};
}
const interleaved: PuzzleTemplate={id:'interleaved',category:'Interleaved sequences',generate:rng=>{
 const firstStart=int(rng,1,12),secondStart=int(rng,8,24),firstStep=int(rng,1,5),secondStep=int(rng,2,7),count=6;
 const sequence=Array.from({length:count},(_,i)=>i%2===0?firstStart+Math.floor(i/2)*firstStep:secondStart+Math.floor(i/2)*secondStep),answer=firstStart+3*firstStep;
 return make('interleaved:'+firstStart+':'+secondStart+':'+firstStep+':'+secondStep,'Interleaved sequences',sequence,answer,'Follow two sequences in alternating positions','The odd-position terms are '+sequence.filter((_,i)=>i%2===0).join(', ')+' and rise by '+firstStep+'. The even-position terms rise by '+secondStep+'. The next odd-position term is '+answer+'.',['Compare every other term separately.','Split the sequence into odd and even positions.','The odd-position sequence adds '+firstStep+' each time.'],{type:'interleaved',firstStep,secondStep});
}};
const decreasingDifferences: PuzzleTemplate={id:'decreasing-differences',category:'Decreasing differences',generate:rng=>{
 const start=int(rng,100,150),growth=int(rng,2,4),first=int(rng,16,24),sequence=[start];
 for(let i=0;i<4;i++)sequence.push(sequence.at(-1)!-(first-i*growth));
 const nextGap=first-4*growth,answer=sequence.at(-1)!-nextGap;
 return make('decreasing-differences:'+start+':'+first+':'+growth,'Decreasing differences',sequence,answer,'Subtract gaps that shrink steadily','The amounts subtracted are '+Array.from({length:4},(_,i)=>first-i*growth).join(', ')+'. They shrink by '+growth+', so subtract '+nextGap+' next to get '+answer+'.',['Write down the amounts subtracted.','Compare how the gaps change each time.','The next subtraction is '+nextGap+'.'],{type:'decreasing-difference',firstDifference:first,growth});
}};
const shapePattern: PuzzleTemplate={id:'visual-matrix',category:'Visual reasoning',generate:rng=>{
 const visual=makeVisualMatrix(rng),{answerIndex,explanation,ruleText}=visual;
 const p=make('visual-matrix:'+visual.family+':'+visual.missingIndex+':'+visual.cells.map(value=>value?tileKey(value):'?').join(','),'Visual reasoning',[0,1,2,3],answerIndex,visual.puzzleRule,explanation,['Compare tiles in the same row or column. What changes from one tile to the next?','Track one feature at a time: shape, number, fill, direction, or position. Check whether that change repeats.',ruleText],{type:'visual-matrix',shapeStep:1,fillByRow:false,rotationByColumn:false});
 return {...p,visualPattern:{cells:visual.cells,choices:visual.choices,answerIndex,missingIndex:visual.missingIndex,rows:visual.rows,columns:visual.columns,family:visual.family,ruleTypes:visual.ruleTypes,taskFormat:visual.taskFormat}};
}};
export const templates:PuzzleTemplate[]=[arithmetic,missingMiddle,oddTerm,geometric,powers,fibonacci,differences,doubling,recurrence,factorial,primes,triangular,polygonal,lookAndSay,weightedRecurrence,reverseAdd,digitSum,digitProduct,collatz,primeGaps,modularCycle,tribonacci,lucas,pell,alternatingSteps,alternatingOperations,interleaved,decreasingDifferences,shapePattern];
// Alternating operations are less frequent than other templates in random play.
const randomPlayTemplates=templates.flatMap(template=>template.id==='alternating-operations'?[template]:[template,template]);
const categoryCache=new Map<PracticeDifficulty,string[]>();
export function getPracticeCategories(difficulty:PracticeDifficulty):string[]{
 const cached=categoryCache.get(difficulty);if(cached)return cached;
 const available=new Set<string>();
 for(let templateIndex=0;templateIndex<templates.length;templateIndex++){
  const template=templates[templateIndex];
  for(let sample=0;sample<32;sample++){
   let seed=(templateIndex+1)*104729+sample*7919;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
   const puzzle=template.generate(rng);
   if(difficulty==='All'?puzzle.difficulty!=='Easy':puzzle.difficulty===ratingForPlayerDifficulty[difficulty]){available.add(template.category);break}
  }
 }
 const result=[...available].sort((a,b)=>a.localeCompare(b));categoryCache.set(difficulty,result);return result;
}
export function generatePuzzle(difficulty:PracticeDifficulty,recentIds:string[]=[],rng:()=>number=Math.random,category?:string){
 const recent=new Set(recentIds.slice(-30));
 const recentTemplates=new Set(recentIds.slice(-4).map(id=>id.split(':',1)[0]));
 let fallback:GeneratedPuzzle|undefined;
 for(let attempt=0;attempt<1000;attempt++){
  const candidates=category?randomPlayTemplates.filter(template=>template.category===category):randomPlayTemplates;
  if(!candidates.length)throw new Error('No puzzle templates are available for '+category+'.');
  const template=candidates[int(rng,0,candidates.length-1)],puzzle=template.generate(rng);
  if(!puzzle.sequence.every(safe)||!safe(puzzle.answer))continue;
  if(difficulty==='All'&&puzzle.difficulty==='Easy')continue;
  if(difficulty!=='All'&&puzzle.difficulty!==ratingForPlayerDifficulty[difficulty])continue;
  if(recent.has(puzzle.id))continue;
  if(!fallback)fallback=puzzle;
  if(!recentTemplates.has(template.id))return puzzle;
 }
 if(fallback)return fallback;
 throw new Error('No puzzle templates can currently generate a '+difficulty+' puzzle.');
}
export const generatePracticePuzzle=generatePuzzle;



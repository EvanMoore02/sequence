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
const reverseDigits=(n:number)=>Number(String(n).split('').reverse().join(''));
const collatzNext=(n:number)=>n%2===0?n/2:3*n+1;
const sayNumber=(n:number)=>{const text=String(n);let result='';for(let i=0;i<text.length;){let end=i+1;while(end<text.length&&text[end]===text[i])end++;result+=String(end-i)+text[i];i=end}return Number(result)};
function make(id:string,category:string,sequence:number[],answer:number,rule:string,explanation:string,hints:[string,string,string],pattern:AnswerPattern):GeneratedPuzzle{
 const templateId=id.split(':')[0],rating=rateDifficulty(sequence,answer,pattern);
 const specificHint=['visual-matrix','missing-middle','odd-term'].includes(templateId)?hints[2]:'Apply the pattern you identified to determine what comes next.';
 return {id,templateId,category,difficulty:rating.difficulty,difficultyScore:rating.score,pattern,sequence,answer,rule,explanation,hints:[hints[0],hints[1],specificHint]};
}
const arithmetic: PuzzleTemplate={id:'arithmetic',category:'Arithmetic',generate:rng=>{
 const start=int(rng,-30,60),step=int(rng,1,12)*(rng()<.25?-1:1),count=int(rng,4,5),seq=Array.from({length:count},(_,i)=>start+i*step),answer=start+count*step;
 const action=step>0?'Add '+step:'Subtract '+Math.abs(step);return make('arithmetic:'+start+':'+step+':'+count,'Arithmetic',seq,answer,action,action+' each term; the next term is '+answer+'.',[ 'Compare the gaps between neighbors.','The difference stays the same.',action+' each time.'],{type:'arithmetic',step});
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
const weightedRecurrence: PuzzleTemplate={id:'weighted-recurrence',category:'Weighted recurrence',generate:rng=>{
 const first=int(rng,1,6),second=int(rng,2,9),factor=int(rng,2,3),offset=int(rng,-4,5),count=int(rng,4,5),terms=[first,second];
 while(terms.length<count+1)terms.push(terms.at(-1)!*factor+terms.at(-2)!+offset);
 const adjustment=offset<0?' - '+Math.abs(offset):' + '+offset;
 return make('weighted-recurrence:'+first+':'+second+':'+factor+':'+offset+':'+count,'Weighted recurrence',terms.slice(0,count),terms[count],'Multiply the previous term and combine the term before it','Each new term is '+factor+' times the previous term plus the term before that'+(offset===0?'':adjustment)+'; the next term is '+terms[count]+'.',['Each term depends on the two terms before it.','Use both earlier values, not just one.','Calculate '+factor+' x '+terms[count-1]+' + '+terms[count-2]+(offset<0?' - '+Math.abs(offset):' + '+offset)+' to get '+terms[count]+'.'],{type:'weighted-recurrence',factor,offset});
}};
const reverseAdd: PuzzleTemplate={id:'reverse-add',category:'Digit operations',generate:rng=>{
 const start=int(rng,11,49),count=5,terms=[start];while(terms.length<count+1)terms.push(terms.at(-1)!+reverseDigits(terms.at(-1)!));
 return make('reverse-add:'+start,'Digit operations',terms.slice(0,count),terms[count],'Add each number to its reverse','Reverse the digits, then add: '+terms[count-1]+' + '+reverseDigits(terms[count-1])+' = '+terms[count]+'.',['Watch how the digits change from term to term.','Reverse a term, then combine it with the original.','Add '+terms[count-1]+' and '+reverseDigits(terms[count-1])+'.'],{type:'reverse-add',start});
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
const alternatingSteps: PuzzleTemplate={id:'alternating-steps',category:'Alternating steps',generate:rng=>{
 const start=int(rng,-15,20),oddStep=int(rng,2,9),evenStep=int(rng,-7,6),count=5,terms=[start];
 while(terms.length<count+1){const index=terms.length-1;terms.push(terms.at(-1)!+(index%2===0?oddStep:evenStep))}
 return make('alternating-steps:'+start+':'+oddStep+':'+evenStep,'Alternating steps',terms.slice(0,count),terms[count],'Alternate between two step sizes','The differences alternate between '+oddStep+' and '+evenStep+'. The next step is '+oddStep+', so the next term is '+terms[count]+'.',['Compare the gaps between neighboring terms.','There are two different gaps that repeat in turn.','Continue alternating the two step sizes.'],{type:'alternating',oddStep,evenStep});
}};
const alternatingOperations: PuzzleTemplate={id:'alternating-operations',category:'Alternating operations',generate:rng=>{
 const start=int(rng,2,8),factorA=int(rng,2,3),factorB=int(rng,2,3),offsetA=int(rng,-3,4),offsetB=int(rng,-3,4),count=5,terms=[start];
 while(terms.length<count+1){const index=terms.length-1;terms.push(terms.at(-1)!*(index%2===0?factorA:factorB)+(index%2===0?offsetA:offsetB))}
 return make('alternating-operations:'+start+':'+factorA+':'+offsetA+':'+factorB+':'+offsetB,'Alternating operations',terms.slice(0,count),terms[count],'Alternate between two operations','Apply '+factorA+' times the previous term '+(offsetA<0?'minus '+Math.abs(offsetA):'plus '+offsetA)+' then '+factorB+' times the term '+(offsetB<0?'minus '+Math.abs(offsetB):'plus '+offsetB)+', alternating the steps. The next term is '+terms[count]+'.',['Check how each term changes into the next.','Two operations take turns repeating.','Continue alternating the two operations in the same order.'],{type:'alternating-operation',factorA,offsetA,factorB,offsetB});
}};
const matrixKinds: VisualShape['kind'][]=['triangle','diamond','pentagon','arrow'];
type MatrixFamily=NonNullable<NonNullable<Puzzle['visualPattern']>['family']>;
const pieceKey=(piece:VisualShape)=>[piece.kind,piece.fill,piece.rotation,piece.count??1,piece.slot??''].join(':');
const tileKey=(tile:VisualTile)=>tile.map(pieceKey).sort().join('|');
const piece=(kind:VisualShape['kind'],attrs:Partial<VisualShape>={}):VisualShape=>({kind,fill:'solid',rotation:0,...attrs});
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
 let rows:2|3=3,columns:2|3=3,missingIndex=6+int(rng,0,2),cells:(VisualTile|null)[]=[],answer:VisualTile=[],ruleText='',rules:string[]=[],taskFormat:NonNullable<NonNullable<Puzzle['visualPattern']>['taskFormat']>='complete-matrix',candidates:VisualTile[]=[];
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
  const transform=int(rng,0,3),start=int(rng,0,3),shapeA=matrixKinds[start],shapeC=matrixKinds[(start+2)%4],turn=int(rng,0,3)*90;
  const apply=(value:VisualShape):VisualShape=>transform===0?{...value,rotation:((value.rotation+90)%360) as VisualShape['rotation']}:transform===1?{...value,fill:value.fill==='solid'?'outline':'solid'}:transform===2?{...value,kind:matrixKinds[(matrixKinds.indexOf(value.kind)+1)%4]}:{...value,count:((value.count??1)%3+1) as 1|2|3};
  const a=piece(shapeA,{rotation:turn as VisualShape['rotation'],fill:rng()<.5?'solid':'outline'}),b=apply(a),c=piece(shapeC,{rotation:((turn+180)%360) as VisualShape['rotation'],fill:a.fill,count:1}),d=apply(c);cells=[ [a],[b],[c],null ];answer=[d];
  const variants:VisualTile[]=[[{...d,kind:matrixKinds[(matrixKinds.indexOf(d.kind)+1)%4]}],[{...d,kind:matrixKinds[(matrixKinds.indexOf(d.kind)+3)%4]}],[{...d,fill:d.fill==='solid'?'outline':'solid'}],[{...d,rotation:((d.rotation+90)%360) as VisualShape['rotation']}],[{...d,rotation:((d.rotation+180)%360) as VisualShape['rotation']}],[{...d,rotation:((d.rotation+270)%360) as VisualShape['rotation']}],[{...d,count:((d.count??1)%3+1) as 1|2|3}],[{...d,count:((d.count??1)%3+2) as 1|2|3}]];
  candidates=variants;rules.push(['quarter-turn','fill-flip','shape-progression','count-progression'][transform]);
  ruleText=transform===0?'The top pair shows a 90° clockwise turn. Apply the same turn to the bottom-left figure.':transform===1?'The top pair changes from solid to outline (or outline to solid). Apply that fill change to the bottom-left figure.':transform===2?'The top pair advances one shape in the cycle. Apply that same one-step shape change to the bottom-left figure.':'The top pair adds one shape, wrapping from three back to one. Apply that count change to the bottom-left figure.';
 }else{
  const shapeStart=int(rng,0,3),shapeStep=int(rng,1,3),offset=int(rng,0,2),rotationStart=int(rng,0,3)*90;
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
  if(family==='row-distribution'){rules.push('distribute-three');ruleText='Each row and column contains one triangle, one diamond, and one pentagon, in a shifted order.'}
  else if(family==='reflection'){rules.push('reflection','row-progression');ruleText='Each row mirrors its outer shapes around the center column, while the shape pattern shifts as you move down.'}
  else if(family==='count-progression'){rules.push('count-progression');ruleText='The number of shapes increases by one moving right, then wraps from three back to one. The starting count shifts on each new row.'}
  else if(family==='orbit-movement'){rules.push('position-orbit');ruleText='The same shape moves through the four corners of each tile in a repeating clockwise cycle as you move through the grid.'}
  else {rules.push('shape-progression');const places=shapeStep===1?'one place':shapeStep===2?'two places':'three places';ruleText='Each move right or down advances '+places+' in the shape cycle ('+matrixKinds.join(' → ')+'), wrapping back to the start.'}
  if(family!=='count-progression'&&family!=='orbit-movement'){ruleText+=' '+fillRule+' '+rotationRule;rules.push('fill-'+(fillByRow?'row':'column'),'rotation-'+(rotationByColumn?'column':'row'))}
  const correct=answer[0];candidates=[[{...correct,kind:matrixKinds[(matrixKinds.indexOf(correct.kind)+1)%4]}],[{...correct,kind:matrixKinds[(matrixKinds.indexOf(correct.kind)+3)%4]}],[{...correct,fill:correct.fill==='solid'?'outline':'solid'}],[{...correct,rotation:((correct.rotation+90)%360) as VisualShape['rotation']}],[{...correct,rotation:((correct.rotation+270)%360) as VisualShape['rotation']}],[{...correct,count:((correct.count??1)%3+1) as 1|2|3}],[{...correct,slot:((correct.slot??0)+1)%4 as 0|1|2|3}]];
 }
 const options=distinctOptions(answer,candidates,rng,8),choices=options.choices,answerIndex=options.answerIndex;
 const position='row '+(Math.floor(missingIndex/columns)+1)+', column '+(missingIndex%columns+1),letter=String.fromCharCode(65+answerIndex),slotNames=['top-left','top-right','bottom-left','bottom-right'],answerDescription=answer.map(item=>(item.count??1)+' '+item.fill+' '+item.kind+(item.slot===undefined?'':' in the '+slotNames[item.slot])).join(' and ');
 const explanation=family==='analogy-transform'?'Option '+letter+' completes the analogy. '+ruleText+' The answer is '+answerDescription+'.':'Option '+letter+' completes '+position+' with '+answerDescription+'. '+ruleText;
 const kindAnswer=answerIndex;
 const puzzleRule=family==='analogy-transform'?'Complete the visual analogy':'Complete the shape pattern';
 if(cells.filter(value=>value===null).length!==1||cells[missingIndex]!==null||choices.length!==8||new Set(choices.map(tileKey)).size!==8||tileKey(choices[kindAnswer])!==tileKey(answer)||!explanation.includes(ruleText))throw new Error('Generated visual puzzle failed rule, answer, or choice validation.');
 return {cells,choices,answerIndex,missingIndex,rows,columns,family,ruleTypes:rules,taskFormat,explanation,ruleText,answer,puzzleRule};
}
const shapePattern: PuzzleTemplate={id:'visual-matrix',category:'Visual reasoning',generate:rng=>{
 const visual=makeVisualMatrix(rng),{answerIndex,explanation,ruleText}=visual;
 const p=make('visual-matrix:'+visual.family+':'+visual.missingIndex+':'+visual.cells.map(value=>value?tileKey(value):'?').join(','),'Visual reasoning',[0,1,2,3],answerIndex,visual.puzzleRule,explanation,['Look at how the figures relate across the rows or pairs.','Identify whether the rule uses shape, count, position, rotation, fill, or combining.','Apply the '+visual.family!.replaceAll('-',' ')+' rule: '+ruleText],{type:'visual-matrix',shapeStep:1,fillByRow:false,rotationByColumn:false});
 return {...p,visualPattern:{cells:visual.cells,choices:visual.choices,answerIndex,missingIndex:visual.missingIndex,rows:visual.rows,columns:visual.columns,family:visual.family,ruleTypes:visual.ruleTypes,taskFormat:visual.taskFormat}};
}};
export const templates:PuzzleTemplate[]=[arithmetic,missingMiddle,oddTerm,geometric,powers,fibonacci,differences,doubling,recurrence,factorial,primes,triangular,lookAndSay,weightedRecurrence,reverseAdd,collatz,primeGaps,alternatingSteps,alternatingOperations,shapePattern];
export function generatePuzzle(difficulty:PracticeDifficulty,recentIds:string[]=[],rng:()=>number=Math.random){
 const recent=new Set(recentIds.slice(-30));
 const recentTemplates=new Set(recentIds.slice(-4).map(id=>id.split(':',1)[0]));
 let fallback:GeneratedPuzzle|undefined;
 for(let attempt=0;attempt<1000;attempt++){
  const template=templates[int(rng,0,templates.length-1)],puzzle=template.generate(rng);
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

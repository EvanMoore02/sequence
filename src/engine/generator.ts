import type {Puzzle} from '../types';
import type {AnswerPattern} from '../data/puzzleTypes';
import {rateDifficulty} from './difficulty';

export type PracticeDifficulty=Puzzle['difficulty']|'All';
export type GeneratedPuzzle=Puzzle&{templateId:string;difficultyScore:number;pattern:AnswerPattern};
export type PuzzleTemplate={id:string;category:string;generate:(rng:()=>number)=>GeneratedPuzzle};
const int=(rng:()=>number,min:number,max:number)=>min+Math.floor(rng()*(max-min+1));
const safe=(n:number)=>Number.isSafeInteger(n)&&Math.abs(n)<=1_000_000;
function make(id:string,category:string,sequence:number[],answer:number,rule:string,explanation:string,hints:[string,string,string],pattern:AnswerPattern):GeneratedPuzzle{
 const templateId=id.split(':')[0],rating=rateDifficulty(sequence,answer,pattern);
 return {id,templateId,category,difficulty:rating.difficulty,difficultyScore:rating.score,pattern,sequence,answer,rule,explanation,hints};
}
const arithmetic: PuzzleTemplate={id:'arithmetic',category:'Arithmetic',generate:rng=>{
 const start=int(rng,-30,60),step=int(rng,1,12)*(rng()<.25?-1:1),count=int(rng,4,5),seq=Array.from({length:count},(_,i)=>start+i*step),answer=start+count*step;
 const action=step>0?'Add '+step:'Subtract '+Math.abs(step);return make('arithmetic:'+start+':'+step+':'+count,'Arithmetic',seq,answer,action,action+' to each term to continue the sequence.',[ 'Compare the gaps between neighbors.','The difference stays the same.',action+' each time.'],{type:'arithmetic',step});
}};
const geometric: PuzzleTemplate={id:'geometric',category:'Multiplication',generate:rng=>{
 const factor=int(rng,2,3),count=int(rng,4,5),start=int(rng,1,5),seq=Array.from({length:count},(_,i)=>start*factor**i),answer=start*factor**count;
 return make('geometric:'+start+':'+factor+':'+count,'Multiplication',seq,answer,'Multiply by '+factor,'Each term is multiplied by '+factor+' to get the next.',[ 'Compare each term to the one before it.','The same multiplier repeats.','Multiply by '+factor+' each time.'],{type:'geometric',factor});
}};
const powers: PuzzleTemplate={id:'powers',category:'Powers',generate:rng=>{
 const exponent=int(rng,2,3) as 2|3,start=int(rng,1,exponent===2?7:4),count=4,seq=Array.from({length:count},(_,i)=>(start+i)**exponent),answer=(start+count)**exponent,label=exponent===2?'square':'cube';
 return make('powers:'+exponent+':'+start,'Powers',seq,answer,label+' numbers','These are consecutive '+label+' numbers. The next is '+(start+count)+'^'+exponent+'.',[ 'The gaps between terms are growing.','Each value is a consecutive whole number raised to a power.','Continue with '+(start+count)+'^'+exponent+'.'],{type:'power',exponent,start});
}};
const fibonacci: PuzzleTemplate={id:'fibonacci',category:'Recursive',generate:rng=>{
 const a=int(rng,1,3),b=int(rng,a,5),seq=[a,b];while(seq.length<5)seq.push(seq.at(-1)!+seq.at(-2)!);const answer=seq[4]+seq[3];
 return make('fibonacci:'+a+':'+b,'Recursive',seq,answer,'Add the previous two','Each term is the sum of the previous two terms: '+seq[3]+' + '+seq[4]+' = '+answer+'.',[ 'Look back more than one position.','Each new term combines the two before it.','Add '+seq[3]+' and '+seq[4]+'.'],{type:'fibonacci'});
}};
const alternating: PuzzleTemplate={id:'alternating',category:'Alternating',generate:rng=>{
 const a=int(rng,1,8),b=int(rng,5,20),da=int(rng,1,4),db=int(rng,2,8),seq=[a,b,a+da,b+db,a+2*da],answer=b+2*db;
 return make('alternating:'+a+':'+b+':'+da+':'+db,'Alternating',seq,answer,'Two alternating sequences','Odd positions increase by '+da+'; even positions increase by '+db+'.',[ 'Try splitting the positions into two groups.','Odd and even positions follow separate patterns.','The even-position values increase by '+db+'.'],{type:'alternating',oddStep:da,evenStep:db});
}};
const differences: PuzzleTemplate={id:'differences',category:'Differences',generate:rng=>{
 const start=int(rng,-10,20),first=int(rng,-4,8),growth=int(rng,1,4),seq=[start];for(let i=0;i<4;i++)seq.push(seq.at(-1)!+first+i*growth);const answer=seq[4]+first+4*growth;
 return make('differences:'+start+':'+first+':'+growth,'Differences',seq,answer,'Differences increase by '+growth,'The first differences increase by '+growth+' each time; the next gap is '+(first+4*growth)+'.',[ 'Compare the gaps between consecutive terms.','The gaps themselves change regularly.','The next gap is '+(first+4*growth)+'.'],{type:'increasing-difference',firstDifference:first,growth});
}};
const doubling: PuzzleTemplate={id:'doubling-gaps',category:'Differences',generate:rng=>{
 const start=int(rng,-20,20),step=int(rng,1,4)*(rng()<.5?-1:1),seq=[start,start+step,start+3*step,start+7*step],answer=start+15*step;
 return make('doubling-gaps:'+start+':'+step,'Differences',seq,answer,'Double each difference','The gaps are '+step+', '+2*step+', and '+4*step+'; next add '+8*step+'.',[ 'Look at the gaps between terms.','Each gap is twice the one before it.','The next gap is '+8*step+'.'],{type:'doubling-difference',firstDifference:step});
}};
const recurrence: PuzzleTemplate={id:'multiply-adjust',category:'Mixed',generate:rng=>{
 const factor=int(rng,2,3),offset=int(rng,-2,2),start=int(rng,1,6),seq=[start];while(seq.length<4)seq.push(seq.at(-1)!*factor+offset);const answer=seq[3]*factor+offset;
 return make('multiply-adjust:'+start+':'+factor+':'+offset,'Mixed',seq,answer,'Multiply by '+factor+' then '+(offset<0?'subtract '+Math.abs(offset):'add '+offset),'Multiply each term by '+factor+(offset<0?' and subtract '+Math.abs(offset):' and add '+offset)+'.',[ 'Check whether multiplication is involved.','A small adjustment follows the multiplication.','Multiply by '+factor+(offset<0?' and subtract '+Math.abs(offset):' and add '+offset)+'.'],{type:'multiply-adjust',factor,offset});
}};
const factorial: PuzzleTemplate={id:'factorial',category:'Recursive',generate:rng=>{
 const start=int(rng,1,3),fact=(n:number)=>{let x=1;for(let i=2;i<=n;i++)x*=i;return x},seq=Array.from({length:4},(_,i)=>fact(start+i)),answer=fact(start+4);
 return make('factorial:'+start,'Recursive',seq,answer,'Factorials','Multiply by consecutive integers; the next multiplier is '+(start+4)+'.',[ 'Look at the ratios between terms.','The multiplier increases by one each time.','Multiply '+seq[3]+' by '+(start+4)+'.'],{type:'factorial',start});
}};
export const templates:PuzzleTemplate[]=[arithmetic,geometric,powers,fibonacci,alternating,differences,doubling,recurrence,factorial];
export function generatePuzzle(difficulty:PracticeDifficulty,recentIds:string[]=[],rng:()=>number=Math.random){
 const recent=new Set(recentIds);
 let fallback:GeneratedPuzzle|undefined;
 for(let attempt=0;attempt<Math.max(1000,recentIds.length*2);attempt++){
  const template=templates[int(rng,0,templates.length-1)],puzzle=template.generate(rng);
  if(!puzzle.sequence.every(safe)||!safe(puzzle.answer))continue;
  if(difficulty!=='All'&&puzzle.difficulty!==difficulty)continue;
  if(!fallback)fallback=puzzle;
  if(!recent.has(puzzle.id))return puzzle;
 }
 if(fallback)return fallback;
 throw new Error('No puzzle templates can currently generate a '+difficulty+' puzzle.');
}
export const generatePracticePuzzle=generatePuzzle;

import {CHARACTERS,QUESTIONS,BY_ID,VERSION} from './data.js';
export function validAnswers(answers,complete=false){
 return Array.isArray(answers)&&answers.length<=(QUESTIONS.length)&&(!complete||answers.length===QUESTIONS.length)&&Array.from(answers).every(a=>Number.isInteger(a)&&a>=0&&a<4);
}
export function rankCharacters(answers){
 if(!validAnswers(answers,true))throw new Error('20개의 선택이 필요해요.');
 const userSignals=signalVector(answers);
 return CHARACTERS.map(c=>{
  let score=0;
  QUESTIONS.forEach((q,i)=>{if(answers[i]===c.profile[i])score+=q.weight;});
  // Ties follow the six observed response signals, not catalog order or chance.
  const characterSignals=CHARACTER_SIGNALS[c.id];
  const signalDistance=userSignals.reduce((sum,v,d)=>sum+(v-characterSignals[d])**2,0);
  return {character:c,score:Math.round(score*100)/100,signalDistance};
 }).sort((a,b)=>b.score-a.score||a.signalDistance-b.signalDistance||a.character.id.localeCompare(b.character.id));
}
export function getResult(answers){return rankCharacters(answers)[0].character;}
export const DIMENSIONS=['다정함','호기심','표현력','꾸준함','행동력','자기 페이스'];
// Signals are descriptive editorial tags, not a psychometric score or diagnosis.
const SIGNALS=[
 [[0,0,0,1,0,2],[2,0,2,0,0,0],[0,2,1,0,2,1],[0,1,0,2,1,0]],
 [[1,0,0,1,0,2],[2,0,1,0,1,0],[0,2,1,0,1,2],[1,0,0,2,1,0]],
 [[1,0,0,0,0,2],[2,1,2,0,1,0],[0,1,2,0,2,1],[0,2,1,1,1,1]],
 [[0,1,1,0,0,2],[2,0,2,0,1,0],[0,2,2,0,1,2],[0,0,0,2,1,1]],
 [[2,0,0,1,1,0],[2,0,2,0,1,0],[0,2,1,1,2,1],[1,0,0,2,1,0]],
 [[0,0,0,0,0,2],[2,0,1,1,1,0],[0,2,1,0,2,2],[0,0,0,2,1,1]],
 [[2,0,0,1,0,1],[2,0,2,0,1,0],[2,0,0,0,1,1],[2,0,1,1,2,0]],
 [[0,1,0,2,1,0],[2,0,2,0,1,0],[0,2,1,0,2,2],[0,1,0,2,1,0]],
 [[0,1,0,0,0,2],[2,1,1,0,1,0],[0,2,1,0,2,1],[0,1,0,2,1,1]],
 [[0,0,0,0,0,2],[2,0,1,0,0,0],[0,2,0,0,1,1],[0,1,0,2,0,1]],
 [[0,0,0,2,0,2],[2,0,1,0,0,0],[0,2,1,0,1,2],[0,0,0,2,1,1]],
 [[2,0,0,0,0,1],[2,1,1,1,1,0],[0,1,2,0,2,1],[1,0,1,1,1,2]],
 [[0,0,0,0,0,2],[2,0,2,0,0,0],[0,2,1,0,2,1],[0,1,0,2,1,2]],
 [[1,0,0,0,0,1],[2,0,1,0,0,0],[0,1,2,0,1,1],[0,0,0,2,1,2]],
 [[0,0,0,0,0,2],[2,0,1,0,1,0],[0,2,1,0,2,2],[0,0,0,2,2,0]],
 [[2,0,1,0,0,0],[2,0,1,1,1,0],[1,0,1,0,2,1],[1,0,1,2,1,2]],
 [[2,0,0,1,0,1],[2,0,2,0,0,0],[1,2,2,0,1,1],[0,0,0,2,1,0]],
 [[1,1,0,0,0,2],[2,2,1,0,0,0],[0,1,2,0,1,2],[0,0,1,2,1,2]],
 [[1,0,0,0,0,2],[2,0,2,0,0,0],[0,2,1,0,2,1],[0,1,0,2,1,1]],
 [[2,0,0,0,0,1],[2,0,2,0,0,0],[0,2,1,0,2,1],[0,0,0,2,1,1]]
];
export function describeSignals(answers){
 if(!validAnswers(answers,true))return [];
 return signalVector(answers).map((value,d)=>({name:DIMENSIONS[d],value:Math.round(value)})).sort((a,b)=>b.value-a.value);
}
function signalVector(answers){
 const sums=DIMENSIONS.map(()=>0),max=DIMENSIONS.map(()=>0);
 QUESTIONS.forEach((q,i)=>DIMENSIONS.forEach((_,d)=>{sums[d]+=SIGNALS[i][answers[i]][d]*q.weight;max[d]+=Math.max(...SIGNALS[i].map(s=>s[d]))*q.weight;}));
 return DIMENSIONS.map((_,d)=>sums[d]/max[d]*100);
}
const CHARACTER_SIGNALS=Object.fromEntries(CHARACTERS.map(c=>[c.id,signalVector(c.profile)]));
export function pairing(first,second){
 const a=BY_ID[first],b=BY_ID[second];if(!a||!b)throw new Error('캐릭터를 찾을 수 없어요.');
 if(a.id===b.id)return {label:'말하지 않아도 통하는 둘',text:'좋아하는 속도와 편안한 방식이 닮았어요. 익숙함 속에서 둘만의 새로운 재미도 하나 찾아보세요.',tip:'오늘 좋았던 장면 하나씩 나눠 보기'};
 const same=a.profile.reduce((n,v,i)=>n+(v===b.profile[i]?QUESTIONS[i].weight:0),0);
 const close=same>=8;
 return {label:close?'비슷해서 편안한 둘':'서로의 세계를 넓혀 주는 둘',text:close?`${a.name}의 ${a.tags[0]}, ${b.name}의 ${b.tags[0]}. 익숙한 마음을 서로 알아보기 쉬워요. 작은 차이는 묻고 들어 주세요.`:`${a.name}의 ${a.tags[0]}에 ${b.name}의 ${b.tags[0]}이 더해져요. 서로 다른 방식을 존중하면 혼자서는 놓쳤을 재미를 발견할 수 있어요.`,tip:close?'평소와 다른 작은 코스 하나 함께 가 보기':'오늘은 내가, 다음에는 친구가 코스 정하기'};
}
export function readSaved(storage){
 try {const d=JSON.parse(storage.getItem('little-day-v1'));return d&&d.version===VERSION&&validAnswers(d.answers)?d:null;}catch{return null;}
}
export function writeSaved(storage,answers,index){try{storage.setItem('little-day-v1',JSON.stringify({version:VERSION,answers,index,updatedAt:Date.now()}));}catch{}}
export class QuizSession{
 constructor(saved){this.answers=validAnswers(saved?.answers)?[...saved.answers]:[];this.index=Number.isInteger(saved?.index)?Math.max(0,Math.min(saved.index,this.answers.length,19)):Math.min(this.answers.length,19);}
 select(value){if(!Number.isInteger(value)||value<0||value>3)return false;this.answers[this.index]=value;return true;}
 next(){if(this.answers[this.index]===undefined)return false;if(this.index===19)return validAnswers(this.answers,true)?'done':false;this.index++;return true;}
 previous(){if(this.index===0)return false;this.index--;return true;}
 restart(){this.answers=[];this.index=0;}
}

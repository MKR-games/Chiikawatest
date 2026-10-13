import assert from 'node:assert/strict';
import {CHARACTERS,QUESTIONS,BY_ID} from '../data.js';
import {QuizSession,getResult,rankCharacters,validAnswers,pairing,readSaved,writeSaved} from '../engine.js';
assert.equal(CHARACTERS.length,20);assert.equal(QUESTIONS.length,20);
assert.equal(QUESTIONS.filter(q=>q.type==='image').length,1);
for(const q of QUESTIONS){assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.deepEqual([...q.order].sort(),[0,1,2,3]);}
const q=new QuizSession();assert.equal(q.next(),false);assert.equal(q.previous(),false);q.select(2);assert.equal(q.index,0,'Selecting must not advance');assert.equal(q.next(),true);assert.equal(q.index,1);q.select(3);q.previous();assert.equal(q.answers[0],2);q.select(1);assert.equal(q.answers[0],1);q.next();assert.equal(q.answers[1],3,'Forward answer retained after editing');assert.equal(q.select(4),false);
for(let i=q.index;i<20;i++){q.select(i%4);assert.equal(q.next(),i===19?'done':true);}assert.equal(q.index,19);assert.equal(q.answers.length,20);
q.previous();q.select(3);q.next();assert.equal(q.answers[18],3);
const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
writeSaved(storage,q.answers,q.index);const restored=new QuizSession(readSaved(storage));assert.deepEqual(restored.answers,q.answers);assert.equal(restored.index,19);
storage.setItem('little-day-v1','{broken');assert.equal(readSaved(storage),null);
assert.equal(validAnswers([0,1,2,3]),true);assert.equal(validAnswers(Array(20).fill(0),true),true);assert.equal(validAnswers(Array(20).fill(null)),false);assert.throws(()=>getResult([1]));
assert.equal(validAnswers(new Array(20),true),false,'Sparse answers must not pass as complete');
let minDistance=20,nearest=[];
for(let i=0;i<20;i++)for(let j=i+1;j<20;j++){const a=CHARACTERS[i],b=CHARACTERS[j],d=a.profile.filter((v,k)=>k!==9&&v!==b.profile[k]).length;if(d<minDistance){minDistance=d;nearest=[[a.id,b.id]];}else if(d===minDistance)nearest.push([a.id,b.id]);}
assert.ok(minDistance>=5,'Similar types need at least five non-image distinctions');
for(const c of CHARACTERS){assert.equal(c.profile.length,20);assert.equal(getResult(c.profile).id,c.id);assert.equal(rankCharacters(c.profile)[0].score,19.5);for(const friend of c.friends)assert.ok(BY_ID[friend]);for(const other of CHARACTERS){assert.equal(pairing(c.id,other.id).label,pairing(other.id,c.id).label);}}
// All 20 anchors remain their result after any one changed answer, including the image.
let perturbations=0;
for(const c of CHARACTERS)for(let i=0;i<20;i++)for(let a=0;a<4;a++){if(a===c.profile[i])continue;const answers=[...c.profile];answers[i]=a;assert.equal(getResult(answers).id,c.id);perturbations++;}
let seed=20261013;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const counts=Object.fromEntries(CHARACTERS.map(c=>[c.id,0]));let ties=0;
for(let i=0;i<50000;i++){const a=QUESTIONS.map(()=>Math.floor(random()*4)),r=rankCharacters(a);counts[r[0].character.id]++;if(r[0].score===r[1].score)ties++;}
assert.ok(Object.values(counts).every(n=>n>0));
console.log(JSON.stringify({questions:QUESTIONS.length,choices:4,outcomes:CHARACTERS.length,imageWeight:.5,minNonImageDistance:minDistance,nearest,anchoredSingleAnswerEdits:perturbations,randomReachability:counts,topScoreTies:ties,samples:50000,note:'Synthetic checks verify code and separation, not human psychological validity.'},null,2));

import assert from 'node:assert/strict';
import {CHARACTERS} from '../data.js';
import {DETAILS} from '../details.js';
import {normalizeName,readName,writeName} from '../personalization.js';
import {withParticle} from '../korean.js';
import {relationship,mismatchFriends,RELATIONSHIP_COUNT} from '../relationships.js';
assert.equal(normalizeName('  민구   친구  '),'민구 친구');assert.equal(normalizeName(' \t\n '),'');
assert.equal(normalizeName('가'.repeat(20)).length,12);assert.equal(normalizeName('민\u202e구'),'민구');
const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
assert.equal(readName(storage),'');writeName(storage,' 민구 ');assert.equal(readName(storage),'민구');
saved.set('little-day-name-v1','{broken');assert.equal(readName(storage),'');assert.equal(readName({getItem(){throw new Error('denied');}}),'');
for(const [word,result] of [['의리','의리를'],['여유','여유를'],['취향','취향을'],['표현','표현을'],['다정함','다정함을'],['호기심','호기심을'],['함께','함께를']])assert.equal(withParticle(word),result);
assert.equal(withParticle('용기','이','가'),'용기가');assert.equal(withParticle('정성','이','가'),'정성이');
assert.equal(withParticle('여유','은','는'),'여유는');assert.equal(withParticle('취향','은','는'),'취향은');
assert.equal(withParticle('의리','과','와'),'의리와');assert.equal(withParticle('표현','과','와'),'표현과');
assert.equal(withParticle('길','으로','로'),'길로');assert.equal(withParticle('마음','으로','로'),'마음으로');
const labels=new Set(),stories=new Set();let choices=0;
for(let i=0;i<CHARACTERS.length;i++){
 const a=CHARACTERS[i];assert.equal(DETAILS[a.id].length,3);
 const bad=mismatchFriends(a.id);assert.equal(bad.length,2);
 for(const m of bad){assert.notEqual(m.character.id,a.id);assert.ok(!a.friends.includes(m.character.id));assert.ok(!m.character.friends.includes(a.id));assert.ok(m.text&&m.tip);}
 const variants=new Set();
 for(let j=0;j<CHARACTERS.length;j++){
  const b=CHARACTERS[j],p=relationship(a.id,b.id);choices++;
  assert.ok(p.good&&p.caution&&p.tip&&p.scene);variants.add(p.text+'|'+p.scene);
  assert.equal(p.label,relationship(b.id,a.id).label);
  if(j>=i){labels.add(p.label);stories.add(p.text);}
 }
 assert.equal(variants.size,20,'Every friend selection has distinct wording');
}
assert.equal(labels.size,RELATIONSHIP_COUNT);assert.equal(stories.size,RELATIONSHIP_COUNT);
console.log(JSON.stringify({nameStorage:'passed',koreanParticles:'passed',friendSelections:choices,uniquePairs:labels.size,mismatchSuggestions:40,details:60}));

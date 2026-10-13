import assert from 'node:assert/strict';
import {File} from 'node:buffer';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {imageDataURL,saveImageFile,saveWithDevice} from '../downloads.js';
import {isKakaoBrowser,isAppleMobile,makeHandoffURL,readHandoff,kakaoExternalURL} from '../browser-handoff.js';
import {CHARACTERS,BY_ID} from '../data.js';
import {SHARE_BASE,SHARE_DOMAIN,linkPayload} from '../personalization.js';

class Reader{
 readAsDataURL(blob){blob.arrayBuffer().then(data=>{this.result=`data:${blob.type};base64,${Buffer.from(data).toString('base64')}`;this.onload();});}
}
const png=new File([Buffer.from('89504e470d0a1a0a','hex')],'먼작귀_민구_usagi.png',{type:'image/png'});
const jpg=new File([Buffer.from('ffd8ffe000104a46494600','hex')],'먼작귀_민구_usagi.jpg',{type:'image/jpeg'});
let anchors=[],writes=[],closed=0,options;
const doc={createElement:()=>({download:'',click(){anchors.push({url:this.href,name:this.download,type:this.type});},remove(){}}),body:{appendChild(){}}};
const window={showSaveFilePicker:async opts=>{options=opts;return {createWritable:async()=>({write:async bytes=>writes.push(bytes),close:async()=>closed++,abort:async()=>{}})};}};
for(const file of [png,jpg]){
 const data=await imageDataURL(file,Reader);
 assert.deepEqual(Buffer.from(data.split(',')[1],'base64'),Buffer.from(await file.arrayBuffer()));
 const outcome=await saveImageFile(file,data,{window,navigator:{},document:doc});
 assert.equal(outcome.status,'saved');assert.equal(options.suggestedName,file.name);
 assert.deepEqual(Buffer.from(await writes.at(-1).arrayBuffer()),Buffer.from(await file.arrayBuffer()),'Write image bytes, not a URL string');
 assert.deepEqual(Object.keys(options.types[0].accept),[file.type]);
}
assert.equal(closed,2);assert.equal(anchors.length,0);
const data=await imageDataURL(png,Reader);
let result=await saveImageFile(png,data,{window:{showSaveFilePicker:async()=>{throw Object.assign(Error(),{name:'AbortError'});}},document:doc});
assert.equal(result.status,'cancelled');assert.equal(anchors.length,0);
result=await saveImageFile(png,data,{window:{},navigator:{userAgent:'Chrome'},document:doc});
assert.equal(result.status,'requested');assert.equal(anchors.at(-1).url,data);assert.equal(anchors.at(-1).type,'image/png');
assert.ok(!anchors.at(-1).url.startsWith('blob:'));
const android={userAgent:'Mozilla/5.0 (Linux; Android 15) KAKAOTALK/26.1'};
const iphone={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18) KAKAOTALK/26.1'};
assert.ok(isKakaoBrowser(android));assert.ok(!isAppleMobile(android));assert.ok(isAppleMobile(iphone));
const before=anchors.length;
assert.equal((await saveImageFile(png,data,{window:{},navigator:android,document:doc})).status,'image-view');
assert.equal(anchors.length,before,'Android Kakao must not receive a blob/data URL download');
assert.equal((await saveImageFile(png,data,{window:{},navigator:iphone,document:doc})).status,'requested');
assert.equal(anchors.length,before+1,'iOS Kakao uses the documented data URL route');
assert.equal((await saveImageFile(png,'data:text/plain;base64,aaaa',{window:{},document:doc})).status,'failed');
let sharePayload;
assert.equal((await saveWithDevice(jpg,{canShare:p=>p.files[0]===jpg,share:async p=>{sharePayload=p;}})).status,'opened');
assert.deepEqual(Object.keys(sharePayload),['files']);assert.equal(sharePayload.files[0].type,'image/jpeg');

// All 20 owned results survive a browser change without retaking the quiz.
for(const c of CHARACTERS){
 const original={character:c.id,name:'민구 & 하루',mode:'own',answers:c.profile,action:'download',format:'jpg',invite:'hachiware'};
 const url=new URL(makeHandoffURL(original)),state=readHandoff(url.hash);
 assert.equal(url.origin,new URL(SHARE_BASE).origin);assert.equal(url.pathname,new URL(SHARE_BASE).pathname);
 assert.equal(url.searchParams.get('r'),c.id);assert.ok(!url.search.includes('민구'));
 assert.equal(state.character,c.id);assert.equal(state.name,original.name);assert.deepEqual(state.answers,c.profile);assert.equal(state.format,'jpg');
 assert.equal(new URL(kakaoExternalURL(url.href)).searchParams.get('url'),url.href);
}
assert.equal(readHandoff('#resume=not-json'),null);assert.equal(readHandoff('#'+'x'.repeat(4001)),null);
assert.throws(()=>kakaoExternalURL('https://example.com/'));
assert.deepEqual(linkPayload(),{text:SHARE_DOMAIN},'Public addresses never include resume/name data or a protocol');
// Browser transfers must work on HTTP now and retain HTTPS once enabled.
const personalization=readFileSync(new URL('../personalization.js',import.meta.url),'utf8').replace(/^export /gm,'');
for(const protocol of ['http:','https:']){
 const base=vm.runInNewContext(personalization+'\nSHARE_BASE',{location:{protocol}});
 assert.equal(base,protocol+'//나의먼작귀.com/');
}

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8'),views=[];
const state=readHandoff(new URL(makeHandoffURL({character:'usagi',name:'민구',mode:'own',answers:BY_ID.usagi.profile,action:'download',format:'jpg'})).hash);
const context=vm.createContext({URL,location:{href:makeHandoffURL(state)},history:{replaceState:(_,__,url)=>{assert.equal(url.hash,'');}},store:{},quiz:{answers:[]},writeName:(_,name)=>name,playerName:'',invitedBy:null,persist:()=>{},result:(...args)=>views.push(args),saveCard:async()=>views.push('download'),shareCard:async()=>views.push('card-share'),shareResult:()=>views.push('link-share'),modal:{querySelector:()=>({classList:{add:()=>{}},focus:()=>{}})}});
vm.runInContext(source.slice(source.indexOf('async function resumeExternalBrowser('),source.indexOf('const resumed=')),context);
await context.resumeExternalBrowser(state);
assert.equal(context.playerName,'민구');assert.deepEqual(Array.from(context.quiz.answers),BY_ID.usagi.profile);assert.deepEqual(views[0],['usagi','own']);assert.equal(views[1],'download');
console.log('PASS: byte-based save, explicit download/fallback, iOS/Android Kakao branches, 20-result handoff and actual restore handler.');

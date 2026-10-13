import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {File} from 'node:buffer';
import {BY_ID} from '../data.js';
import {SHARE_BASE,headline,caption,linkPayload,cardPayload} from '../personalization.js';
import {SHARE_PLATFORMS,cardFileName,nativeSharePayload,launchDeviceShare} from '../sharing.js';

const c=BY_ID.usagi,calls=[],copied=[],html=[];
const nav={share:async payload=>{calls.push(payload);},canShare:()=>true};
const png=new Blob(['\x89PNG'],{type:'image/png'}),jpg=new Blob(['\xff\xd8'],{type:'image/jpeg'});
const card={name:'민구',character:c,files:{png:new File([png],cardFileName('민구',c),{type:png.type}),jpg:new File([jpg],cardFileName('민구',c,'jpg'),{type:jpg.type})}};
const request={kind:'card',card};
assert.equal(cardFileName('민/구',c,'jpg'),'먼작귀_민_구_usagi.jpg');
assert.deepEqual(Object.keys(nativeSharePayload({kind:'link',payload:linkPayload()},'kakao',nav)),['url']);
assert.equal(nativeSharePayload({kind:'link',payload:linkPayload()},'instagram',nav).url,SHARE_BASE);
let payload=nativeSharePayload(request,'kakao',nav);
assert.equal(payload.title,"'민구'님은 우사기 성격이에요!");
assert.equal(payload.files[0].type,'image/png');
assert.ok(payload.text.includes(c.intro));assert.equal(payload.url,SHARE_BASE);
payload=nativeSharePayload(request,'instagram',nav);
assert.deepEqual(Object.keys(payload),['files']);assert.equal(payload.files[0].type,'image/jpeg');
assert.equal(payload.files[0].name,'먼작귀_민구_usagi.jpg');
assert.deepEqual(Object.keys(nativeSharePayload(request,'kakao',{...nav,canShare:p=>!!p.files&&!p.url})),['files']);
assert.deepEqual(Object.keys(nativeSharePayload(request,'kakao',nav,true)),['files']);
assert.equal(nativeSharePayload(request,'other',{share:nav.share}),null);
assert.equal(nativeSharePayload(request,'other',{...nav,canShare:()=>{throw Error('Unavailable');}}),null);
assert.equal((await launchDeviceShare(request,'other',{})).status,'unsupported');
assert.equal((await launchDeviceShare(request,'other',{...nav,share:async()=>{throw Object.assign(Error(),{name:'AbortError'});}})).status,'cancelled');
assert.equal((await launchDeviceShare(request,'other',{...nav,share:async()=>{throw Error('Denied');}})).status,'failed');
// Native sharing is called synchronously in the click turn, before any await.
let invoked=false;
const opened=launchDeviceShare(request,'kakao',{...nav,share:()=>{invoked=true;return Promise.resolve();}});
assert.ok(invoked);assert.equal((await opened).status,'opened');

// Exercise the actual app handlers with a small dialog adapter, no browser claims.
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
let loading=null,urlCount=0,encodes=0;
const modal={open:true,querySelector:()=>loading};
class TestURL extends URL{static createObjectURL(){return 'blob:card-'+(++urlCount);}static revokeObjectURL(){}}
const context=vm.createContext({
 URL:TestURL,File,Blob,SHARE_PLATFORMS,cardFileName,nativeSharePayload,launchDeviceShare,
 linkPayload,cardPayload,headline,caption,navigator:nav,currentResult:c,
 cardCache:null,cardPending:null,cardRevision:0,shareRequest:null,shareBusy:false,
 resultPerson:()=> '민구',modal,
 icon:n=>`<svg data-icon="${n}"></svg>`,esc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 modalTop:t=>`<h2>${t}</h2>`,
 openModal:markup=>{if(loading)loading.isConnected=false;loading=markup.includes('class="card-loading"')?{isConnected:true}:null;html.push(markup);modal.open=true;},
 createResultCardFiles:async()=>{encodes++;return {png,jpg};},
 copyLink:async s=>copied.push(s),toast:()=>{}
});
vm.runInContext(source.slice(source.indexOf('function shareResult('),source.indexOf('function nameDialog(')),context);
context.shareResult();
assert.equal(calls.length,0,'Opening the chooser must not send or copy anything');
assert.equal(copied.length,0);
for(const id of ['kakao','instagram','other'])assert.ok(html.at(-1).includes(`data-platform="${id}"`));
assert.ok(html.at(-1).includes('링크만 복사하기'));
await context.chooseSharePlatform('kakao');
assert.deepEqual(Object.keys(calls.at(-1)),['url']);assert.equal(calls.at(-1).url,SHARE_BASE);
context.shareResult(true);await context.chooseSharePlatform('other');
assert.equal(calls.at(-1).url,SHARE_BASE+'?with=usagi');
nav.share=async()=>{throw Object.assign(new Error('Cancel'),{name:'AbortError'});};
context.shareResult();await context.chooseSharePlatform('kakao');
assert.equal(copied.length,0);assert.ok(html.at(-1).includes('공유를 닫았거나'));
delete nav.share;
context.shareResult();await context.chooseSharePlatform('instagram');
assert.ok(html.at(-1).includes('이 브라우저에서는 앱 공유창을 열 수 없어요'));
assert.ok(html.at(-1).includes('인스타그램 DM'));assert.equal(copied.length,0);
nav.share=async p=>{calls.push(p);};
const beforeCard=calls.length;
await context.shareCard();
assert.equal(calls.length,beforeCard,'Card Share opens the chooser before sharing');
assert.ok(html.at(-1).includes('카드 공유'));
for(const id of ['kakao','instagram','other'])assert.ok(html.at(-1).includes(`data-platform="${id}"`));
assert.ok(html.at(-1).includes('PNG 다운로드'));assert.ok(html.at(-1).includes('JPG 다운로드'));
await context.chooseSharePlatform('kakao');
payload=calls.at(-1);assert.equal(payload.files[0].type,'image/png');assert.equal(payload.url,SHARE_BASE);
assert.equal(payload.title,headline('민구',c));
await context.chooseSharePlatform('instagram');
payload=calls.at(-1);assert.deepEqual(Object.keys(payload),['files']);assert.equal(payload.files[0].type,'image/jpeg');
await context.saveCard();
assert.ok(html.at(-1).includes('download="먼작귀_민구_usagi.png"'));
assert.ok(html.at(-1).includes('download="먼작귀_민구_usagi.jpg"'));
assert.equal(encodes,1,'Sharing and downloading should reuse the prepared image files');
assert.equal(copied.length,0,'Only explicit Copy controls may write the clipboard');
assert.ok(caption('민구',c).includes(SHARE_BASE));
console.log('PASS: app platform chooser, URL-only sharing, PNG/JPG downloads, image sharing, cancellation, unavailable-browser instructions and cached preparation.');

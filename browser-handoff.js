import {SHARE_BASE,normalizeName} from './personalization.js?v=1.2.2';
import {BY_ID} from './data.js?v=1.2.1';
import {validAnswers,getResult} from './engine.js?v=1.2.1';

export function isKakaoBrowser(nav=globalThis.navigator){return /KAKAOTALK/i.test(nav?.userAgent||'');}
export function isAppleMobile(nav=globalThis.navigator){return /iPhone|iPad|iPod/i.test(nav?.userAgent||'')||(/Macintosh/i.test(nav?.userAgent||'')&&nav?.maxTouchPoints>1);}

function validate(state){
 if(!state||state.v!==1||!BY_ID[state.character]||!['download','card-share','link-share'].includes(state.action))return null;
 const name=normalizeName(state.name),mode=['own','gallery','shared'].includes(state.mode)?state.mode:'shared';
 if(mode==='own'&&(!name||!validAnswers(state.answers,true)||getResult(state.answers).id!==state.character))return null;
 return {v:1,character:state.character,name,mode,answers:mode==='own'?[...state.answers]:[],action:state.action,format:state.format==='jpg'?'jpg':'png',platform:['kakao','instagram','other'].includes(state.platform)?state.platform:'other',invite:BY_ID[state.invite]?.id||null,invitation:state.invitation===true};
}

export function makeHandoffURL(state){
 const safe=validate({...state,v:1});if(!safe)throw new Error('handoff-state');
 const url=new URL(SHARE_BASE);url.searchParams.set('r',safe.character);
 // Fragment data is used only to resume on the user's other browser.
 // Normal Link Share always uses SHARE_BASE and never this personal URL.
 url.hash=new URLSearchParams({resume:JSON.stringify(safe)}).toString();
 return url.href;
}
export function readHandoff(hash){
 if(typeof hash!=='string'||hash.length>4000)return null;
 try{return validate(JSON.parse(new URLSearchParams(hash.replace(/^#/,'' )).get('resume')));}catch{return null;}
}
export function kakaoExternalURL(url){
 const target=new URL(url),base=new URL(SHARE_BASE);
 if(target.origin!==base.origin||target.pathname!==base.pathname)throw new Error('handoff-url');
 // Best-effort Kakao scheme; retain a visible manual-copy/menu alternative.
 return 'kakaotalk://web/openExternal?url='+encodeURIComponent(target.href);
}

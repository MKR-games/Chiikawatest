import {normalizeName,cardPayload} from './personalization.js?v=1.2.3';

export const SHARE_PLATFORMS=[
 {id:'kakao',name:'카카오톡',icon:'talk',linkHint:'친구와 채팅방에',cardHint:'친구에게 내 카드 보내기'},
 {id:'instagram',name:'인스타그램',icon:'camera',linkHint:'DM 또는 스토리 링크로',cardHint:'스토리·피드·DM에'},
 {id:'other',name:'다른 앱',icon:'share',linkHint:'설치된 앱에서 고르기',cardHint:'설치된 앱에서 고르기'}
];

export function cardFileName(name,character,format='png'){
 const person=(normalizeName(name)||'친구').replace(/[\\/:*?"<>|]/g,'_');
 return `먼작귀_${person}_${character.id}.${format==='jpg'?'jpg':'png'}`;
}

// Web Share opens the device picker; it cannot preselect a specific app.
// Build all files before the click so no image work consumes user activation.
export function nativeSharePayload(request,platform='other',nav=globalThis.navigator,imageOnly=false){
 if(!request||typeof nav?.share!=='function')return null;
 if(request.kind==='link')return request.payload;
 if(request.kind!=='card'||typeof nav.canShare!=='function')return null;
 const {card}=request,file=card.files[platform==='instagram'?'jpg':'png'];
 const files={files:[file]};
 try{
  if(!nav.canShare(files))return null;
  if(platform==='instagram'||imageOnly)return files;
  const full=cardPayload(file,card.name,card.character);
  return nav.canShare(full)?full:files;
 }catch{return null;}
}

export async function launchDeviceShare(request,platform='other',nav=globalThis.navigator,imageOnly=false){
 const payload=nativeSharePayload(request,platform,nav,imageOnly);
 if(!payload)return {status:'unsupported'};
 try{
  await nav.share(payload);
  return {status:'opened',imageOnly:!!payload.files&&!payload.text};
 }catch(error){
  // Cancelling must never silently copy a link or start another share.
  return {status:error?.name==='AbortError'?'cancelled':'failed'};
 }
}

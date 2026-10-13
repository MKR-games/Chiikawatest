export const SHARE_DOMAIN='나의먼작귀.com';
// Navigation needs a scheme. Follow HTTPS when available; otherwise allow HTTP.
export const SHARE_BASE=`${globalThis.location?.protocol==='https:'?'https:':'http:'}//${SHARE_DOMAIN}/`;
export function normalizeName(value){
 if(typeof value!=='string')return '';
 return [...value.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g,'').replace(/\s+/g,' ').trim()].slice(0,12).join('');
}
export function readName(storage){try{return normalizeName(JSON.parse(storage.getItem('little-day-name-v1'))?.name);}catch{return '';}}
export function writeName(storage,name){const value=normalizeName(name);try{storage.setItem('little-day-name-v1',JSON.stringify({name:value}));}catch{}return value;}
export function headline(name,character){return `'${normalizeName(name)||'친구'}'님은 ${character.name} 성격이에요!`;}
export function shortDescription(character){return character.intro;}
export function caption(name,character){return `${headline(name,character)}\n${shortDescription(character)}\n\n나도 해보기\n${SHARE_DOMAIN}`;}
// Share the readable address as text: no scheme, Punycode or duplicate URL.
export function linkPayload(invitedBy){return {text:SHARE_DOMAIN+(invitedBy?'/?'+new URLSearchParams({with:invitedBy}).toString():'')};}
export function cardPayload(file,name,character){return {files:[file],title:headline(name,character),text:caption(name,character)};}

// Select a Korean particle from the final Hangul syllable, ignoring closing punctuation.
export function finalConsonant(value){
 const text=String(value).normalize('NFC').replace(/[^\p{L}\p{N}]+$/gu,'');
 const char=[...text].at(-1);if(!char)return 0;
 const code=char.codePointAt(0);
 if(code>=0xac00&&code<=0xd7a3)return (code-0xac00)%28;
 const digit={0:21,1:8,3:16,6:1,7:8,8:8};
 return digit[char]??0;
}
export function withParticle(text,closed='을',open='를'){
 const final=finalConsonant(text);
 const particle=closed==='으로'&&open==='로'?(final&&final!==8?closed:open):(final?closed:open);
 return String(text)+particle;
}

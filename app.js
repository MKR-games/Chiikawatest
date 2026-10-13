import {CHARACTERS,BY_ID,QUESTIONS,CHAPTERS,MOODS,SOURCES} from './data.js';
import {getResult,rankCharacters,describeSignals,pairing,readSaved,writeSaved,validAnswers,QuizSession} from './engine.js';
const SHARE_BASE='https://mkr-games.github.io/Chiikawatest/';
const app=document.querySelector('#app'),modal=document.querySelector('#modal');
const store=(()=>{try{return window.localStorage;}catch{return {getItem:()=>null,setItem:()=>{}};}})();
const quiz=new QuizSession(readSaved(store));
let screen='home',currentResult=null,resultMode='own',toastTimer,cardUrl=null,cardCache=null;
const params=new URLSearchParams(location.search);
let invitedBy=BY_ID[params.get('with')]?.id||null;
const initialResult=BY_ID[params.get('r')]?.id||null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
 arrow:'M5 12h14m-6-6 6 6-6 6',back:'M19 12H5m6-6-6 6 6 6',download:'M12 3v12m-5-5 5 5 5-5M5 15v5h14v-5',share:'M8 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0Zm14-7a3 3 0 1 0-6 0 3 3 0 0 0 6 0Zm0 14a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM7 10l9-4M7 14l9 4',sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',flower:'M12 8c-7-8-12 1-5 4-7 4-2 12 5 5 7 7 12-1 5-5 7-3 2-12-5-4ZM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',spark:'m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z',moon:'M19 14A8 8 0 0 1 10 4a8 8 0 1 0 9 10Z',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',heart:'M12 20 4 12C-2 5 7-1 12 6c5-7 14-1 8 6l-8 8Z',check:'m5 12 4 4L19 6'};
function icon(name){return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]||paths.spark}"/></svg>`;}
const charImage=(c,extra='')=>`<img src="${c.image}" alt="${esc(c.name)}" width="512" height="512" ${extra}>`;
function setView(html,name){screen=name;app.innerHTML=html;document.body.dataset.screen=name;window.scrollTo({top:0,behavior:'instant'});app.focus({preventScroll:true});}
function routeResult(c){const u=new URL(location.href);u.search='';u.searchParams.set('r',c.id);u.searchParams.set('v','1');if(invitedBy)u.searchParams.set('with',invitedBy);history.replaceState(null,'',u);document.title=`${c.name} — 먼작귀 속의 나`;}
function cleanRoute(){const u=new URL(location.href);u.search='';if(invitedBy)u.searchParams.set('with',invitedBy);history.replaceState(null,'',u);document.title='먼작귀 속의 나 — 작은 하루, 20가지 친구';}
function persist(){writeSaved(store,quiz.answers,quiz.index);}
function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2700);}
function openModal(html){document.querySelector('#modal-content').innerHTML=`<div class="modal-inner">${html}</div>`;if(!modal.open)modal.showModal();}
function closeModal(){modal.close();}
function modalTop(title){return `<div class="modal-top"><h2>${title}</h2><button class="close-modal" data-action="close" aria-label="닫기">×</button></div>`;}
function home(){
 cleanRoute();const partial=quiz.answers.length>0&&quiz.answers.length<20,completed=quiz.answers.length===20;
 setView(`<section class="home"><span class="pill">먼작귀 성격 테스트 · 20가지 친구</span>
 ${invitedBy?`<div class="friend-invite">${charImage(BY_ID[invitedBy])}<div><strong>${esc(BY_ID[invitedBy].name)} 친구가 기다려요</strong>내 결과를 찾고, 둘의 궁합도 만나 보세요.</div></div>`:''}
 <div class="usagi-welcome"><h1 class="sr-only">나와 닮은 성격의 먼작귀 캐릭터는?</h1><img src="assets/usagi-sign.webp" alt="우사기가 ‘나와 닮은 성격의 먼작귀 캐릭터는?’라고 적힌 나무 팻말을 들고 있어요" class="usagi-sign" width="1024" height="1024" fetchpriority="high"><span class="welcome-twinkle first" aria-hidden="true">✧</span><span class="welcome-twinkle second" aria-hidden="true">✦</span><span class="welcome-yaha" aria-hidden="true">야하!</span></div>
 <p class="home-lead">스무 번의 작은 선택 끝에,<br>나와 꼭 닮은 친구를 만나 보세요.</p>
 <div class="intro-meta"><span>${icon('clock')} 약 <b>4분</b></span><span>${icon('flower')} <b>20</b>문항</span><span>${icon('heart')} <b>20</b>가지 결과</span></div>
 <button class="primary" data-action="start">${partial?'이어서 산책하기':'테스트 시작하기'} ${icon('arrow')}</button>
 ${partial?`<button class="text-button" data-action="restart">처음부터 시작하기</button>`:completed?`<button class="text-button" data-action="last-result">지난 결과 다시 보기</button>`:''}
 <p class="microcopy">맞고 틀린 답은 없어요. 마음이 가는 쪽으로 골라 주세요.</p>
 <div class="day-route" aria-label="아침부터 저녁까지 이어지는 네 장면">${CHAPTERS.map(c=>`<div class="day-stop"><i style="background:${c.color}">${icon(c.icon)}</i><b>${c.name.split(' ').slice(-1)[0]}</b></div>`).join('')}</div>
 <hr class="home-divider"><h2 class="section-title">각자의 속도로, 각자의 매력으로</h2><p class="section-note">익숙한 친구부터 새롭게 알아 갈 친구까지</p>
 <div class="mini-friends">${['chiikawa','hachiware','momonga','furuhonya'].map(id=>`<button data-action="character" data-id="${id}">${charImage(BY_ID[id],'loading="lazy"')}<span>${BY_ID[id].name}</span></button>`).join('')}<span class="tiny-dots" aria-hidden="true">···</span></div>
 <button class="secondary" data-action="collection">20명의 친구 먼저 구경하기 ${icon('arrow')}</button></section>`,'home');
}
function question(chapterChanged=false){
 cleanRoute();const q=QUESTIONS[quiz.index],ch=CHAPTERS[q.chapter],answer=quiz.answers[quiz.index];
 setView(`<section class="question-page" style="--chapter:${ch.color}">
 <div class="progress-labels"><span>나의 작은 하루</span><strong>${quiz.index+1}<span class="muted"> / 20</span></strong></div>
 <div class="progress-track" role="progressbar" aria-label="질문 진행" aria-valuemin="0" aria-valuemax="20" aria-valuenow="${quiz.index+1}"><div style="width:${(quiz.index+1)*5}%"></div></div>
 <div class="chapter-line"><span class="chapter-badge">${icon(ch.icon)} ${ch.name}</span><time>${ch.time}</time></div>
 <div class="question-head"><h1 class="question-title" id="question-title">${esc(q.title).replace(/\n/g,'<br>')}</h1><p class="question-hint">${q.hint}</p></div>
 <div class="choices ${q.type==='image'?'image-choices':''}" role="group" aria-labelledby="question-title">${q.order.map((option,display)=>q.type==='image'?`
 <button class="choice image-choice" data-action="choose" data-value="${option}" aria-pressed="${answer===option}"><img src="assets/mood-${MOODS[option]}.webp" alt="${q.options[option]}의 단순하고 굵은 선으로 그린 풍경" width="640" height="640"><span class="image-label"><span class="choice-marker">${String.fromCharCode(65+display)}</span><span class="choice-label">${q.options[option]}</span></span><span class="choice-check" aria-hidden="true">✓</span></button>`:`
 <button class="choice" data-action="choose" data-value="${option}" aria-pressed="${answer===option}"><span class="choice-marker">${String.fromCharCode(65+display)}</span><span class="choice-label">${q.options[option]}</span><span class="choice-check" aria-hidden="true">✓</span></button>`).join('')}</div>
 <p class="quiz-tip">지금의 나와 조금 더 가까운 쪽으로.</p>
 <div class="quiz-actions"><button class="back-button" data-action="previous" ${quiz.index===0?'disabled':''}>${icon('back')}<span>이전 질문</span></button><button class="primary" id="next-question" data-action="next" ${answer===undefined?'disabled':''}>${quiz.index===19?'결과 보기':'다음 질문'} (${quiz.index+1}/20) ${icon('arrow')}</button></div>
 ${chapterChanged?`<div class="chapter-motion" aria-hidden="true"><span>${icon(ch.icon)} ${ch.name}에 도착했어요</span></div>`:''}
 </section>`,'question');
}
function choose(value){
 if(screen!=='question'||!quiz.select(value))return;persist();
 document.querySelectorAll('.choice').forEach(b=>{const on=Number(b.dataset.value)===value;b.setAttribute('aria-pressed',String(on));b.classList.toggle('just-picked',on);});
 document.querySelector('#next-question').disabled=false;
}
function next(){if(screen!=='question')return;const before=quiz.index,outcome=quiz.next();if(!outcome)return;persist();if(outcome==='done')reveal();else question(Math.floor(before/5)!==Math.floor(quiz.index/5));}
function previous(){if(screen!=='question'||!quiz.previous())return;persist();question();}
function reveal(){
 setView(`<section class="reveal-page"><span class="pill">스무 장면, 하나의 나</span><h1>오늘의 작은 선택들을<br>한 장에 담았어요.</h1><p>어떤 친구가 편지 속에서 기다리고 있을까요?</p><div class="envelope" aria-hidden="true"><div class="envelope-letter">✳</div><div class="envelope-body"></div><div class="envelope-seal">♡</div><span class="sparkle">✧</span></div><div class="reveal-stamp">A LITTLE DAY, A LITTLE YOU</div><button class="primary reveal-button" data-action="open-result">나와 닮은 친구 만나기 ${icon('arrow')}</button><button class="text-button" data-action="edit-last">마지막 선택 다시 보기</button></section>`,'reveal');
}
function result(id,mode='own'){
 const c=BY_ID[id];if(!c)return home();currentResult=c;resultMode=mode;cardCache=null;routeResult(c);
 const owned=mode==='own'&&validAnswers(quiz.answers,true),signals=owned?describeSignals(quiz.answers).slice(0,3):[],runner=owned?rankCharacters(quiz.answers)[1].character:null;
 setView(`<section class="result-page" style="--char-color:${c.color}"><p class="result-context">${mode==='own'?'스무 번의 선택 끝에 만난, 나와 닮은 친구':mode==='gallery'?'친구 도감에서 만난 캐릭터':'친구가 나눠 준 작은 하루'}</p>
 <article class="result-card"><div class="card-top"><span>LITTLE DAY · 나의 작은 하루</span><span>${String(c.number).padStart(2,'0')} / 20</span></div><div class="result-portrait"><i class="portrait-halo"></i>${charImage(c,'fetchpriority="high"')}<span class="sparkle one" aria-hidden="true">✧</span><span class="sparkle two" aria-hidden="true">✳</span></div><p class="result-quote">“${c.quote}”</p><h1>${c.name}</h1><p class="result-type">${c.type}</p><div class="tags">${c.tags.map(t=>`<span>#${t}</span>`).join('')}</div><div class="ticket-tear"></div><div class="result-card-bottom"><p class="result-intro">${c.intro}</p><p class="result-character-label">20 FRIENDS, 20 LITTLE WORLDS</p></div></article>
 <div class="result-share-actions"><button class="primary" data-action="share">${icon('share')} 결과 공유</button><button class="secondary" data-action="save-card">${icon('download')} 카드 저장</button></div><button class="share-link" data-action="copy-result">결과 링크 복사하기</button>
 ${mode!=='own'?`<button class="primary shared-start" data-action="test-with" data-id="${c.id}">나도 테스트하고 궁합 보기 ${icon('arrow')}</button>`:''}
 <section class="result-section"><p class="section-kicker">LITTLE THINGS ABOUT YOU</p><h2>이런 모습, 조금 닮았나요?</h2><ul class="traits-list">${c.traits.map(t=>`<li><span aria-hidden="true">✦</span>${t}</li>`).join('')}</ul>${signals.length?`<div class="signals">${signals.map(s=>`<div class="signal-line"><span>${s.name}</span><div class="signal-track"><i style="width:${Math.max(12,s.value)}%"></i></div><em>${s.value>=60?'자주 반짝여요':s.value>=35?'은근히 보여요':'조금 보여요'}</em></div>`).join('')}</div><p class="signal-footnote">오늘 고른 답에서 자주 나타난 모습이에요.</p>`:''}</section>
 <section class="result-section"><p class="section-kicker">YOUR OWN KIND OF GOOD</p><h2>나만의 좋은 점</h2><p class="strength-note">${c.strength}</p><div class="gentle-note"><b>나에게 건네는 작은 한마디</b>${c.care}</div></section>
 <section class="result-section"><p class="section-kicker">BETTER TOGETHER</p><h2>함께 걸으면 좋을 친구</h2><div class="friend-grid">${c.friends.map(id=>`<button class="friend-card" data-action="pair" data-id="${id}">${charImage(BY_ID[id],'loading="lazy"')}<strong>${BY_ID[id].name}</strong><span>${BY_ID[id].tags[0]}을 나눠 줄 친구 ↗</span></button>`).join('')}</div>
 <div class="compare-box"><h2>내 친구와는 어떨까?</h2><p>친구의 결과를 골라, 둘이 함께할 하루를 만나 봐요.</p><div class="select-wrap"><label class="sr-only" for="friend-select">친구의 결과 캐릭터</label><select id="friend-select"><option value="">친구의 캐릭터를 골라 주세요</option>${CHARACTERS.map(f=>`<option value="${f.id}" ${invitedBy===f.id?'selected':''}>${f.name}</option>`).join('')}</select></div><div id="pairing-output">${invitedBy?pairMarkup(c.id,invitedBy):''}</div></div><button class="share-link" data-action="invite">친구에게 테스트 초대 링크 보내기</button></section>
 ${runner?`<div class="related-result">${charImage(runner,'loading="lazy"')}<div><strong>${runner.name}의 모습도 살짝 보여요.</strong>한 가지 이름으로 다 담을 수 없는 나니까요.</div></div>`:''}
 <div class="result-end"><button class="secondary" data-action="collection">다른 친구들도 만나 보기 ${icon('arrow')}</button><button class="text-button" data-action="restart">${mode==='own'?'다른 하루로 다시 해보기':'처음부터 테스트하기'}</button></div><p class="disclaimer">캐릭터 성격과 궁합은 재미로 풀어낸 팬 해석이에요.<br>${c.basis}</p></section>`,'result');
}
function pairMarkup(a,b){const p=pairing(a,b);return `<div class="pairing-result"><div class="pairing-pictures">${charImage(BY_ID[a])}<span aria-hidden="true">♡</span>${charImage(BY_ID[b])}</div><h3>${p.label}</h3><p>${p.text}</p><div class="pair-tip">같이 해 보면 좋아요 · ${p.tip}</div></div>`;}
function collection(){
 setView(`<section class="collection"><span class="pill">각자의 속도, 스무 가지 매력</span><h1>친구 도감</h1><p class="collection-intro">조용한 다정함도, 통통 튀는 호기심도.<br>누구에게나 자기만의 반짝임이 있어요.</p><div class="collection-grid">${CHARACTERS.map(c=>`<button class="collection-item" data-action="character" data-id="${c.id}"><span class="collection-num">${String(c.number).padStart(2,'0')}</span>${charImage(c,'loading="lazy"')}<b>${c.name}</b><small>${c.tags[0]} · ${c.tags[1]}</small></button>`).join('')}</div><button class="primary collection-bottom" data-action="start">내 안의 친구 만나기 ${icon('arrow')}</button></section>`,'collection');
}
function about(){openModal(`${modalTop('작은 하루에 대하여')}<p>먼작귀 세계에서 보내는 하루를 상상하며, 나와 닮은 캐릭터를 만나는 팬 메이드 성격 놀이예요.</p><p>20개 문항은 모두 4지선다예요. 답을 고른 뒤 다음 질문 버튼을 눌러 이동하고, 이전 질문으로 돌아가 바꿀 수 있어요. 이미지 문항 1개는 다른 문항의 절반만 반영해요.</p><p>성격과 궁합은 작품 속 모습에서 착안해 만든 해석이며, 공식 설정이나 전문 심리 검사가 아니에요. 모든 캐릭터는 답변에 따라 결과로 나올 수 있어요.</p><p>답변은 이 브라우저에만 저장돼요. 결과 링크에는 캐릭터 이름만 들어가고, 개별 답변은 포함되지 않아요.</p><p>캐릭터 원본 이미지: © nagano / chiikawa committee 및 영화 공식 자료. 우사기 팻말과 풍경 문항 이미지는 AI로 제작했어요.</p><ul class="source-links">${SOURCES.map(([label,url])=>`<li><a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a></li>`).join('')}</ul><button class="secondary" data-action="clear-progress">이 기기에 저장된 답변 지우기</button>`);}
function shareURL(invite=false){const u=new URL(SHARE_BASE);if(invite)u.searchParams.set('with',currentResult.id);else {u.searchParams.set('r',currentResult.id);u.searchParams.set('v','1');}return u.href;}
async function copyLink(url){try{await navigator.clipboard.writeText(url);toast('링크를 복사했어요. 친구에게 붙여 넣어 주세요.');}catch{openModal(`${modalTop('링크 가져가기')}<p>아래 주소를 길게 눌러 복사해 주세요.</p><input class="copy-input" readonly value="${esc(url)}" aria-label="복사할 링크">`);const el=modal.querySelector('input');el.focus();el.select();}}
async function shareResult(invite=false){
 const url=shareURL(invite),title=invite?'나와 함께 먼작귀 친구 찾기':`나는 ${currentResult.name}! 먼작귀 속의 나`,text=invite?`${currentResult.name}인 나와는 어떤 궁합일까?`:`${currentResult.quote} — ${currentResult.type}`;
 if(navigator.share){try{await navigator.share({title,text,url});return;}catch(e){if(e.name==='AbortError')return;}}
 openModal(`${modalTop('공유 방법 고르기')}<p>앱 선택창을 지원하지 않는 브라우저에서는 링크를 복사하거나 카드 이미지로 나눌 수 있어요.</p><button class="primary" data-action="${invite?'copy-invite':'copy-result'}">${icon('share')} 링크 복사하기</button><button class="secondary" data-action="save-card">${icon('download')} 인스타그램용 카드 이미지</button>`);
}
const loadImage=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('image'));im.src=src;});
function rounded(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else {ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);}if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function wrapText(ctx,text,x,y,maxWidth,lineHeight){let line='';for(const ch of [...text]){if(ctx.measureText(line+ch).width>maxWidth){ctx.fillText(line,x,y);line=ch;y+=lineHeight;}else line+=ch;}if(line)ctx.fillText(line,x,y);return y+lineHeight;}
async function makeCard(c){
 if(cardCache?.id===c.id)return cardCache.blob;
 if(document.fonts?.ready)await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('canvas');
 ctx.fillStyle='#faf6ef';ctx.fillRect(0,0,1080,1440);ctx.lineWidth=3;rounded(ctx,54,54,972,1332,45,'#fffdf8','#e1d3ca');
 ctx.textAlign='center';ctx.fillStyle='#927f82';ctx.font='24px LittleDay, sans-serif';ctx.fillText('작은 하루 · 먼작귀 속의 나',540,118);
 ctx.fillStyle=c.color;ctx.beginPath();ctx.ellipse(540,460,267,241,-.12,0,Math.PI*2);ctx.fill();const im=await loadImage(c.image);ctx.drawImage(im,263,177,554,554);
 ctx.fillStyle='#907580';ctx.font='31px LittleDay, sans-serif';ctx.fillText(`“${c.quote}”`,540,787);
 ctx.fillStyle='#493e43';ctx.font=`${c.name.length>10?'57':'68'}px Jua, LittleDay, sans-serif`;ctx.fillText(c.name,540,884);
 ctx.fillStyle='#806c76';ctx.font='30px LittleDay, sans-serif';ctx.fillText(c.type,540,944);
 ctx.font='26px LittleDay, sans-serif';ctx.fillText(c.tags.map(t=>'#'+t).join('    '),540,1010);
 ctx.strokeStyle='#ddcec5';ctx.setLineDash([8,9]);ctx.beginPath();ctx.moveTo(85,1050);ctx.lineTo(995,1050);ctx.stroke();ctx.setLineDash([]);
 ctx.textAlign='left';ctx.fillStyle='#66565e';ctx.font='28px LittleDay, sans-serif';let y=1120;for(const t of c.traits.slice(0,2)){ctx.beginPath();ctx.arc(133,y-9,4,0,Math.PI*2);ctx.fill();y=wrapText(ctx,t,153,y,797,43)+14;}
 ctx.textAlign='center';ctx.fillStyle='#a18c8d';ctx.font='22px LittleDay, sans-serif';ctx.fillText('20개의 선택, 20가지 친구 · 너는 어떤 친구일까?',540,1307);ctx.font='17px LittleDay, sans-serif';ctx.fillText('팬 메이드 성격 놀이 · © nagano',540,1348);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('blob')),'image/png'));cardCache={id:c.id,blob};return blob;
}
async function saveCard(){
 const c=currentResult;if(!c)return;toast('나의 작은 카드를 만들고 있어요.');
 try {const blob=await makeCard(c);if(cardUrl)URL.revokeObjectURL(cardUrl);cardUrl=URL.createObjectURL(blob);openModal(`${modalTop('나의 작은 카드')}<img class="card-preview" src="${cardUrl}" alt="${c.name} 성격 결과 카드"><button class="primary" data-action="share-card">${icon('share')} 공유할 앱 선택하기</button><a class="inline-link" href="${cardUrl}" download="먼작귀_${c.id}_결과.png">PNG 이미지 저장하기</a><p class="muted">인스타그램·카카오톡 등 이미지 공유를 지원하는 앱에서 나눠 보세요. 표시되는 앱은 기기에 따라 달라요.</p><p class="muted">저장이 바로 되지 않으면 이미지를 길게 눌러 저장해 주세요.</p>`);}catch{toast('이미지를 불러오지 못했어요. 잠시 후 다시 눌러 주세요.');}
}
async function shareCard(){if(!cardCache||!currentResult)return;const file=new File([cardCache.blob],`little-day-${currentResult.id}.png`,{type:'image/png'});if(navigator.canShare?.({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:`나와 닮은 친구, ${currentResult.name}`});}catch(e){if(e.name!=='AbortError')toast('PNG 저장 버튼으로 카드를 가져가 주세요.');}}else toast('이 브라우저에서는 PNG로 저장한 뒤 공유해 주세요.');}
function restart(){quiz.restart();persist();closeModal();question();}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const action=b.dataset.action,id=b.dataset.id;
 switch(action){
 case 'home':home();break;
 case 'collection':collection();break;
 case 'character':result(id,'gallery');break;
 case 'start':if(quiz.answers.length===20)quiz.restart();persist();question();break;
 case 'choose':choose(Number(b.dataset.value));break;
 case 'next':next();break;
 case 'previous':previous();break;
 case 'open-result':if(validAnswers(quiz.answers,true))result(getResult(quiz.answers).id);break;
 case 'edit-last':quiz.index=19;persist();question();break;
 case 'last-result':if(validAnswers(quiz.answers,true))result(getResult(quiz.answers).id);break;
 case 'restart':if(quiz.answers.length&&quiz.answers.length<20)openModal(`${modalTop('새로운 하루를 시작할까요?')}<p>지금까지 고른 답 대신 처음부터 골라 볼 수 있어요.</p><button class="primary" data-action="confirm-restart">처음부터 시작하기</button><button class="secondary" data-action="close">하던 하루 계속하기</button>`);else restart();break;
 case 'confirm-restart':restart();break;
 case 'test-with':invitedBy=id;restart();break;
 case 'about':about();break;
 case 'close':closeModal();break;
 case 'share':shareResult();break;
 case 'copy-result':copyLink(shareURL());break;
 case 'copy-invite':copyLink(shareURL(true));break;
 case 'invite':shareResult(true);break;
 case 'save-card':saveCard();break;
 case 'share-card':shareCard();break;
 case 'pair':{const s=document.querySelector('#friend-select');if(s){s.value=id;document.querySelector('#pairing-output').innerHTML=pairMarkup(currentResult.id,id);document.querySelector('.compare-box').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});}break;}
 case 'clear-progress':quiz.restart();try{store.removeItem('little-day-v1');}catch{}closeModal();home();toast('이 기기에 저장된 답변을 지웠어요.');break;
 }
});
document.addEventListener('change',e=>{if(e.target.id==='friend-select'&&currentResult){const id=e.target.value;document.querySelector('#pairing-output').innerHTML=BY_ID[id]?pairMarkup(currentResult.id,id):'';}});
document.addEventListener('keydown',e=>{if(screen!=='question'||modal.open||e.altKey||e.ctrlKey||e.metaKey)return;if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(/^[1-4]$/.test(e.key)){e.preventDefault();choose(QUESTIONS[quiz.index].order[Number(e.key)-1]);}});
modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
window.addEventListener('popstate',()=>{const p=new URLSearchParams(location.search),id=BY_ID[p.get('r')]?.id;if(id)result(id,'shared');else home();});
if(initialResult)result(initialResult,'shared');else home();

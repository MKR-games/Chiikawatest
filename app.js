import {CHARACTERS,BY_ID,QUESTIONS,CHAPTERS,MOODS,SOURCES} from './data.js?v=1.2.1';
import {getResult,rankCharacters,describeSignals,pairing,readSaved,writeSaved,validAnswers,QuizSession} from './engine.js?v=1.2.1';
import {SHARE_BASE,normalizeName,readName,writeName,headline,caption,linkPayload} from './personalization.js?v=1.2.1';
import {DETAILS} from './details.js?v=1.2.1';
import {mismatchFriends} from './relationships.js?v=1.2.1';
import {createResultCardFiles} from './card.js?v=1.2.1';
import {SHARE_PLATFORMS,cardFileName,nativeSharePayload,launchDeviceShare} from './sharing.js?v=1.2.1';
import {imageDataURL,saveImageFile,canSaveWithDevice,saveWithDevice} from './downloads.js?v=1.2.1';
import {isKakaoBrowser,isAppleMobile,makeHandoffURL,readHandoff,kakaoExternalURL} from './browser-handoff.js?v=1.2.1';
import {withParticle} from './korean.js?v=1.2.1';
const app=document.querySelector('#app'),modal=document.querySelector('#modal');
const store=(()=>{try{return window.localStorage;}catch{return {getItem:()=>null,setItem:()=>{}};}})();
const quiz=new QuizSession(readSaved(store));
let playerName=readName(store);
let screen='home',currentResult=null,resultMode='own',toastTimer,cardCache=null,cardPending=null,cardRevision=0,shareRequest=null,shareBusy=false,downloadSelection=null,downloadBusy=false,externalHandoffURL=null;
const params=new URLSearchParams(location.search);
let invitedBy=BY_ID[params.get('with')]?.id||null;
const initialResult=BY_ID[params.get('r')]?.id||null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
 arrow:'M5 12h14m-6-6 6 6-6 6',back:'M19 12H5m6-6-6 6 6 6',download:'M12 3v12m-5-5 5 5 5-5M5 15v5h14v-5',share:'M8 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0Zm14-7a3 3 0 1 0-6 0 3 3 0 0 0 6 0Zm0 14a3 3 0 1 0-6 0 3 3 0 0 0 6 0ZM7 10l9-4M7 14l9 4',sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',flower:'M12 8c-7-8-12 1-5 4-7 4-2 12 5 5 7 7 12-1 5-5 7-3 2-12-5-4ZM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',spark:'m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z',moon:'M19 14A8 8 0 0 1 10 4a8 8 0 1 0 9 10Z',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',talk:'M20 11c0 4-4 7-9 7l-5 3 1-5c-2-1-3-3-3-5 0-4 4-7 8-7s8 3 8 7Z',camera:'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5-2v.1',heart:'M12 20 4 12C-2 5 7-1 12 6c5-7 14-1 8 6l-8 8Z',check:'m5 12 4 4L19 6'};
function icon(name){return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]||paths.spark}"/></svg>`;}
const charImage=(c,extra='')=>`<img src="${c.image}" alt="${esc(c.name)}" width="512" height="512" ${extra}>`;
function setView(html,name){screen=name;app.innerHTML=html;document.body.dataset.screen=name;window.scrollTo({top:0,behavior:'instant'});app.focus({preventScroll:true});}
function routeResult(c){const u=new URL(location.href);u.search='';u.hash='';u.searchParams.set('r',c.id);u.searchParams.set('v','1');if(invitedBy)u.searchParams.set('with',invitedBy);history.replaceState(null,'',u);document.title=`${c.name} — 먼작귀 속의 나`;}
function cleanRoute(){const u=new URL(location.href);u.search='';u.hash='';if(invitedBy)u.searchParams.set('with',invitedBy);history.replaceState(null,'',u);document.title='먼작귀 속의 나 — 작은 하루, 20가지 친구';}
function persist(){writeSaved(store,quiz.answers,quiz.index);}
function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2700);}
function openModal(html){document.querySelector('#modal-content').innerHTML=`<div class="modal-inner">${html}</div>`;if(!modal.open)modal.showModal();modal.scrollTop=0;modal.querySelector('#modal-title')?.focus({preventScroll:true});}
function closeModal(){modal.close();}
function modalTop(title){return `<div class="modal-top"><h2 id="modal-title" tabindex="-1">${title}</h2><button class="close-modal" data-action="close" aria-label="닫기">×</button></div>`;}
function home(){
 cleanRoute();const partial=quiz.answers.length>0&&quiz.answers.length<20,completed=quiz.answers.length===20;
 setView(`<section class="home"><span class="pill">먼작귀 성격 테스트 · 20가지 친구</span>
 ${invitedBy?`<div class="friend-invite">${charImage(BY_ID[invitedBy])}<div><strong>${esc(BY_ID[invitedBy].name)} 친구가 기다려요</strong>내 결과를 찾고, 둘의 궁합도 만나 보세요.</div></div>`:''}
 <div class="usagi-welcome"><h1 class="sr-only">나와 닮은 성격의 먼작귀 캐릭터는?</h1><img src="assets/usagi-sign.webp" alt="우사기가 ‘나와 닮은 성격의 먼작귀 캐릭터는?’라고 적힌 나무 팻말을 들고 있어요" class="usagi-sign" width="1024" height="1024" fetchpriority="high"><span class="welcome-twinkle first" aria-hidden="true">✧</span><span class="welcome-twinkle second" aria-hidden="true">✦</span><span class="welcome-yaha" aria-hidden="true">야하!</span></div>
 <p class="home-lead">스무 번의 작은 선택 끝에,<br>나와 꼭 닮은 친구를 만나 보세요.</p>
 <div class="intro-meta"><span>${icon('clock')} 약 <b>4분</b></span><span>${icon('flower')} <b>20</b>문항</span><span>${icon('heart')} <b>20</b>가지 결과</span></div>
 <form id="start-form" class="name-form"><label for="player-name">어떻게 불러 드릴까요?</label><input id="player-name" name="nickname" type="text" autocomplete="nickname" maxlength="24" required placeholder="이름 또는 별명, 최대 12자" value="${esc(playerName)}"><p class="name-hint">결과와 카드에 들어갈 이름이에요.</p><p class="name-error" id="name-error" role="alert"></p><button type="submit" class="primary">${partial?'이어서 산책하기':'테스트 시작하기'} ${icon('arrow')}</button></form>
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
 const c=BY_ID[id];if(!c)return home();if(mode==='own'&&!playerName)return nameDialog('last-result');currentResult=c;resultMode=mode;clearCardCache();routeResult(c);
 const owned=mode==='own'&&validAnswers(quiz.answers,true),signals=owned?describeSignals(quiz.answers).slice(0,3):[],runner=owned?rankCharacters(quiz.answers)[1].character:null;
 setView(`<section class="result-page" style="--char-color:${c.color}"><p class="result-context">${mode==='own'?`${esc(playerName)}님의 작은 하루가 도착했어요`:mode==='gallery'?'친구 도감에서 만난 캐릭터':'친구가 나눠 준 작은 하루'}</p>
 <article class="result-card"><div class="card-top"><span>LITTLE DAY · 나의 작은 하루</span><span>${String(c.number).padStart(2,'0')} / 20</span></div><div class="result-portrait"><i class="portrait-halo"></i>${charImage(c,'fetchpriority="high"')}<span class="sparkle one" aria-hidden="true">✧</span><span class="sparkle two" aria-hidden="true">✳</span></div><p class="result-quote">“${c.quote}”</p><div class="personalized-heading">${mode==='own'?`<p class="result-person">'${esc(playerName)}'님은</p>`:''}<h1>${c.name}</h1>${mode==='own'?'<p class="result-is">성격이에요!</p>':''}</div><p class="result-type">${c.type}</p><div class="tags">${c.tags.map(t=>`<span>#${t}</span>`).join('')}</div><div class="ticket-tear"></div><div class="result-card-bottom"><p class="result-intro">${c.intro}</p><p class="result-character-label">20 FRIENDS, 20 LITTLE WORLDS</p></div></article>
 <div class="result-share-actions"><button class="primary" data-action="share">${icon('share')} 링크 공유</button><button class="secondary" data-action="share-card">${icon('share')} 카드 공유</button></div><button class="secondary card-download-button" data-action="save-card">${icon('download')} 카드 다운로드 <small>PNG · JPG</small></button><button class="share-link" data-action="copy-result">테스트 링크 복사하기</button>${mode==='own'?'<button class="share-link" data-action="edit-name">결과에 표시할 이름 바꾸기</button>':''}
 ${mode!=='own'?`<button class="primary shared-start" data-action="test-with" data-id="${c.id}">나도 테스트하고 궁합 보기 ${icon('arrow')}</button>`:''}
 <section class="result-section"><p class="section-kicker">LITTLE THINGS ABOUT YOU</p><h2>이런 모습, 조금 닮았나요?</h2><ul class="traits-list">${c.traits.map(t=>`<li><span aria-hidden="true">✦</span>${t}</li>`).join('')}</ul>${signals.length?`<div class="signals">${signals.map(s=>`<div class="signal-line"><span>${s.name}</span><div class="signal-track"><i style="width:${Math.max(12,s.value)}%"></i></div><em>${s.value>=60?'자주 반짝여요':s.value>=35?'은근히 보여요':'조금 보여요'}</em></div>`).join('')}</div><p class="signal-footnote">오늘 고른 답에서 자주 나타난 모습이에요.</p>`:''}</section>
 <section class="result-section"><p class="section-kicker">A LITTLE MORE ABOUT YOU</p><h2>조금 더 들여다보면</h2><div class="personality-details">${DETAILS[c.id].map(([title,text])=>`<article><h3>${title}</h3><p>${text}</p></article>`).join('')}</div></section>
 <section class="result-section"><p class="section-kicker">YOUR OWN KIND OF GOOD</p><h2>나만의 좋은 점</h2><p class="strength-note">${c.strength}</p><div class="gentle-note"><b>나에게 건네는 작은 한마디</b>${c.care}</div></section>
 <section class="result-section"><p class="section-kicker">BETTER TOGETHER</p><h2>함께 걸으면 좋을 친구</h2><div class="friend-grid">${c.friends.map(id=>`<button class="friend-card" data-action="pair" data-id="${id}">${charImage(BY_ID[id],'loading="lazy"')}<strong>${BY_ID[id].name}</strong><span>${withParticle(BY_ID[id].tags[0])} 나눠 줄 친구 ↗</span></button>`).join('')}</div>
 <div class="mismatch-section"><p class="section-kicker">A DIFFERENT PACE</p><h2>조금 안 맞을 수 있는 친구</h2><div class="mismatch-list">${mismatchFriends(c.id).map(m=>`<article class="mismatch-card"><button class="mismatch-profile" data-action="pair" data-id="${m.character.id}">${charImage(m.character,'loading="lazy"')}<span><strong>${m.character.name}</strong><small>${m.label} ↗</small></span></button><p>${m.text}</p><div class="mismatch-tip"><b>맞춰 가는 작은 팁</b>${m.tip}</div></article>`).join('')}</div></div>
 <div class="compare-box"><h2>내 친구와는 어떨까?</h2><p>친구의 결과를 골라, 둘이 함께할 하루를 만나 봐요.</p><div class="select-wrap"><label class="sr-only" for="friend-select">친구의 결과 캐릭터</label><select id="friend-select"><option value="">친구의 캐릭터를 골라 주세요</option>${CHARACTERS.map(f=>`<option value="${f.id}" ${invitedBy===f.id?'selected':''}>${f.name}</option>`).join('')}</select></div><div id="pairing-output">${invitedBy?pairMarkup(c.id,invitedBy):''}</div></div><button class="share-link" data-action="invite">친구에게 테스트 초대 링크 보내기</button></section>
 ${runner?`<div class="related-result">${charImage(runner,'loading="lazy"')}<div><strong>${runner.name}의 모습도 살짝 보여요.</strong>한 가지 이름으로 다 담을 수 없는 나니까요.</div></div>`:''}
 <div class="result-end"><button class="secondary" data-action="collection">다른 친구들도 만나 보기 ${icon('arrow')}</button><button class="text-button" data-action="restart">${mode==='own'?'다른 하루로 다시 해보기':'처음부터 테스트하기'}</button></div><p class="disclaimer">캐릭터 성격과 궁합은 재미로 풀어낸 팬 해석이에요.<br>${c.basis}</p></section>`,'result');
}
function pairMarkup(a,b){const p=pairing(a,b);return `<div class="pairing-result"><div class="pairing-pictures">${charImage(BY_ID[a])}<span aria-hidden="true">♡</span>${charImage(BY_ID[b])}</div><h3>${p.label}</h3><p>${p.text}</p><div class="pair-detail"><b>서로에게 좋은 점</b><p>${p.good}</p></div><div class="pair-detail"><b>살짝 조심하면 좋은 점</b><p>${p.caution}</p></div><div class="pair-tip"><b>같이 해 보면 좋아요</b>${p.tip}</div><p class="pair-scene">${p.scene}</p></div>`;}
function collection(){
 setView(`<section class="collection"><span class="pill">각자의 속도, 스무 가지 매력</span><h1>친구 도감</h1><p class="collection-intro">조용한 다정함도, 통통 튀는 호기심도.<br>누구에게나 자기만의 반짝임이 있어요.</p><div class="collection-grid">${CHARACTERS.map(c=>`<button class="collection-item" data-action="character" data-id="${c.id}"><span class="collection-num">${String(c.number).padStart(2,'0')}</span>${charImage(c,'loading="lazy"')}<b>${c.name}</b><small>${c.tags[0]} · ${c.tags[1]}</small></button>`).join('')}</div><button class="primary collection-bottom" data-action="start">내 안의 친구 만나기 ${icon('arrow')}</button></section>`,'collection');
}
function about(){openModal(`${modalTop('작은 하루에 대하여')}<p>먼작귀 세계에서 보내는 하루를 상상하며, 나와 닮은 캐릭터를 만나는 팬 메이드 성격 놀이예요.</p><p>20개 문항은 모두 4지선다예요. 답을 고른 뒤 다음 질문 버튼을 눌러 이동하고, 이전 질문으로 돌아가 바꿀 수 있어요. 이미지 문항 1개는 다른 문항의 절반만 반영해요.</p><p>성격과 궁합은 작품 속 모습에서 착안해 만든 해석이며, 공식 설정이나 전문 심리 검사가 아니에요. 모든 캐릭터는 답변에 따라 결과로 나올 수 있어요.</p><p>이름과 답변은 이 브라우저에만 저장돼요. 링크 공유는 주소만 보내고, 카드 다운 및 공유에는 이름과 성격 설명이 함께 담겨요. 궁합은 서로의 차이를 가볍게 살펴보는 팬 해석이에요.</p><p>캐릭터 원본 이미지: © nagano / chiikawa committee 및 영화 공식 자료. 우사기 팻말과 풍경 문항 이미지는 AI로 제작했어요.</p><ul class="source-links">${SOURCES.map(([label,url])=>`<li><a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a></li>`).join('')}</ul><button class="secondary" data-action="clear-progress">이 기기에 저장된 이름과 답변 지우기</button>`);}
function resultPerson(){return resultMode==='own'?(playerName||'친구'):'친구';}
function shareURL(invite=false){return linkPayload(invite?currentResult?.id:null).url;}
async function copyLink(url){try{await navigator.clipboard.writeText(url);toast('링크를 복사했어요. 친구에게 붙여 넣어 주세요.');}catch{openModal(`${modalTop('링크 가져가기')}<p>아래 주소를 길게 눌러 복사해 주세요.</p><input class="copy-input" readonly value="${esc(url)}" aria-label="복사할 링크">${shareRequest?.kind==='link'?'<button class="secondary" data-action="share-back">공유 선택창으로 돌아가기</button>':''}`);const el=modal.querySelector('input');el.focus();el.select();}}
function kakaoNotice(action='download'){
 return isKakaoBrowser()?`<div class="kakao-notice"><b>카카오톡에서 보고 계시네요</b><p>저장·공유가 막히면 기본 브라우저로 이어가세요. 이름과 결과가 그대로 따라가요.</p><button class="secondary" data-action="external-guide" data-next="${action}">기본 브라우저로 이어가기 ${icon('arrow')}</button></div>`:'';
}
function externalBrowserGuide(action='download',format='png',platform='other'){
 if(!currentResult)return;
 const mode=resultMode==='own'&&validAnswers(quiz.answers,true)?'own':resultMode==='gallery'?'gallery':'shared';
 externalHandoffURL=makeHandoffURL({character:currentResult.id,name:resultPerson(),mode,answers:mode==='own'?quiz.answers:[],action,format,platform,invite:invitedBy,invitation:action==='link-share'&&!!shareRequest?.payload?.url?.includes('?with=')});
 // The Kakao menu's "open in browser" action also gets the resumable state.
 const here=new URL(location.href);here.hash=new URL(externalHandoffURL).hash;history.replaceState(null,'',here);
 openModal(`${modalTop('기본 브라우저에서 이어가기')}<div class="external-friend">${charImage(currentResult)}<span>이름도 결과도 그대로!</span></div><p class="share-notice">카카오톡 안에서는 카드 저장과 앱 공유가 막힐 수 있어요. 기본 브라우저에서 이어서 진행해 주세요.</p><a class="primary external-open" href="${esc(kakaoExternalURL(externalHandoffURL))}">기본 브라우저로 이어가기 ${icon('arrow')}</a><p class="share-footnote">다시 테스트하지 않아도 돼요. 이동한 화면에서 저장 또는 공유 버튼을 한 번 더 눌러 주세요.</p><details class="external-help"><summary>브라우저가 열리지 않나요?</summary><p>카카오톡 화면의 메뉴에서 ‘다른 브라우저로 열기’를 선택하거나, 아래 주소를 복사해 Chrome·Safari 주소창에 붙여 넣어 주세요.</p><button class="secondary" data-action="copy-handoff">내 결과 이어보기 주소 복사</button><input class="copy-input handoff-input" readonly aria-label="내 결과를 이어 볼 주소" value="${esc(externalHandoffURL)}"><p class="share-footnote">이 주소는 이름과 결과를 다른 브라우저로 옮기는 데 사용해요. 친구에게는 ‘링크 공유’를 이용해 주세요.</p></details><button class="text-button share-back" data-action="${action==='link-share'?'share-back':'save-card'}">이 화면으로 돌아가기</button>`);
}
async function copyHandoff(){
 if(!externalHandoffURL)return;
 try{await navigator.clipboard.writeText(externalHandoffURL);toast('주소를 복사했어요. Chrome·Safari 주소창에 붙여 넣어 주세요.');}
 catch{const input=modal.querySelector('.handoff-input');input?.focus();input?.select();toast('선택된 주소를 복사해 다른 브라우저에 붙여 넣어 주세요.');}
}
function shareResult(invite=false){
 openShareChooser({kind:'link',payload:linkPayload(invite?currentResult?.id:null)});
}
function clearCardCache(){
 cardRevision++;
 cardCache=null;cardPending=null;
}
async function makeCard(c,name,onProgress=()=>{}){
 const key=c.id+'|'+name;
 if(cardCache?.key===key)return cardCache;
 if(cardPending?.key===key)return cardPending.promise;
 clearCardCache();const revision=cardRevision;
 const promise=(async()=>{
  const images=await createResultCardFiles(c,name,{onProgress});
  const [pngURL,jpgURL]=await Promise.all([imageDataURL(images.png),imageDataURL(images.jpg)]);
  if(revision!==cardRevision)return null;
  const urls={png:pngURL,jpg:jpgURL},files={};
  for(const format of ['png','jpg']){
   files[format]=new File([images[format]],cardFileName(name,c,format),{type:images[format].type});
  }
  cardCache={key,name,character:c,images,urls,files};return cardCache;
 })();
 cardPending={key,promise};
 try{return await promise;}finally{if(cardPending?.promise===promise)cardPending=null;}
}
function downloadButtons(card){
 return `<div class="download-grid">${['png','jpg'].map(format=>`<button class="download-option" data-action="download-image" data-format="${format}">${icon('download')} ${format.toUpperCase()} 다운로드</button>`).join('')}</div><button class="text-button download-help" data-action="image-save-help" data-format="png">다운로드가 안 되나요? 이미지로 저장하기</button>`;
}
function imageSaveDialog(card,format='png',status='manual'){
 if(!card?.files[format])return;downloadSelection={card,format};
 const file=card.files[format],available=canSaveWithDevice(file);
 const note=status==='requested'?'다운로드를 요청했어요. 저장되지 않았다면 아래 방법을 이용해 주세요.':status==='failed'?'파일 저장이 막혔어요. 아래 이미지를 직접 저장할 수 있어요.':'아래 카드를 이미지로 저장해 주세요.';
 openModal(`${modalTop(format.toUpperCase()+' 이미지 저장')}${kakaoNotice('download')}<p class="share-notice" role="status">${note}</p><p class="image-save-instruction">휴대폰에서는 카드를 <b>길게 눌러 이미지 저장</b>, 컴퓨터에서는 <b>오른쪽 클릭 → 다른 이름으로 이미지 저장</b>을 선택해 주세요.</p><img class="saveable-card" src="${card.urls[format]}" alt="${esc(headline(card.name,card.character))}" width="1080" height="1440">${available?`<button class="primary" data-action="device-save">${icon('download')} 기기 메뉴로 이미지 저장</button><p class="share-footnote">열리는 메뉴에 사진 저장 또는 파일 저장이 있으면 선택해 주세요.</p>`:''}<p class="share-footnote">카카오톡·인스타 안에서 저장 메뉴가 보이지 않으면, 앱의 메뉴에서 Chrome 또는 Safari로 열어 다시 저장해 주세요.</p><button class="secondary" data-action="save-card">PNG·JPG 선택으로 돌아가기</button>`);
}
async function downloadImage(format){
 if(!cardCache?.files[format]||downloadBusy)return;
 if(isKakaoBrowser()&&!isAppleMobile())return externalBrowserGuide('download',format);
 const card=cardCache;downloadBusy=true;
 try{
  const outcome=await saveImageFile(card.files[format],card.urls[format]);
  if(outcome.status==='cancelled')return;
  if(outcome.status==='saved')toast(format.toUpperCase()+' 이미지 파일을 저장했어요.');
  else imageSaveDialog(card,format,outcome.status);
 }finally{downloadBusy=false;}
}
async function deviceSaveImage(){
 if(!downloadSelection||downloadBusy)return;
 const {card,format}=downloadSelection;
 if(isKakaoBrowser())return externalBrowserGuide('download',format);
 downloadBusy=true;
 try{
  const outcome=await saveWithDevice(card.files[format]);
  if(outcome.status==='failed'||outcome.status==='unsupported')imageSaveDialog(card,format,'failed');
 }finally{downloadBusy=false;}
}
function shareTools(request){
 return request.kind==='card'?`${downloadButtons(request.card)}<button class="secondary" data-action="copy-caption">공유 문구와 링크 복사</button><p class="share-footnote">링크는 카드 이미지에 들어가지 않아요. 문구를 복사해 게시글이나 스토리 링크에 붙여 넣을 수 있어요.</p>`:`<button class="secondary" data-action="copy-share-link">링크만 복사하기</button>`;
}
function openShareChooser(request=shareRequest){
 if(!request)return;shareRequest=request;const isCard=request.kind==='card';
 openModal(`${modalTop(isCard?'카드 공유':'링크 공유')}<p class="share-lead">어디로 보내 볼까요?</p>${kakaoNotice(isCard?'card-share':'link-share')}${isCard?`<div class="share-card-summary"><img src="${request.card.urls.png}" alt="공유할 카드 미리보기" width="72" height="96"><div><strong>${esc(headline(request.card.name,request.card.character))}</strong><span>이름 · 캐릭터 · 짧은 성격 설명</span></div></div>`:'<p class="muted">테스트 링크만 보내요.</p>'}<div class="share-platforms">${SHARE_PLATFORMS.map(p=>`<button class="platform-option" data-action="share-platform" data-platform="${p.id}"><span class="platform-symbol ${p.id}">${icon(p.icon)}</span><span><strong>${p.name}</strong><small>${isCard?p.cardHint:p.linkHint}</small></span>${icon('arrow')}</button>`).join('')}</div><p class="share-footnote">휴대폰에서는 다음 공유창에서 앱을 선택해 주세요. 앱이 안 보이면 복사·저장으로 직접 보낼 수 있어요.</p>${shareTools(request)}`);
}
function shareGuide(platform='other',reason='manual'){
 if(!shareRequest)return;
 const p=SHARE_PLATFORMS.find(item=>item.id===platform)||SHARE_PLATFORMS[2],isCard=shareRequest.kind==='card';
 const available=!!nativeSharePayload(shareRequest,p.id),name=p.id==='other'?'원하는 앱':p.name;
 const note=reason==='unsupported'?'이 브라우저에서는 앱 공유창을 열 수 없어요. 아래 방법으로 보내 주세요.':reason==='failed'?'공유창을 열지 못했어요. 다시 누르거나 아래 방법으로 보내 주세요.':reason==='cancelled'?'공유를 닫았거나 선택할 앱이 없어요. 다시 열거나 아래 방법으로 보낼 수 있어요.':`다음 공유창에서 ${name}을 선택해 주세요.`;
 const instructions=isCard?(p.id==='instagram'?['아래에서 카드를 PNG 또는 JPG로 저장해요.','인스타그램에서 새 게시물·스토리·DM에 저장한 이미지를 골라요.','문구를 복사해 설명에 붙이거나, 테스트 주소를 스토리의 링크 스티커에 넣어요.']:[`아래에서 카드를 PNG 또는 JPG로 저장해요.`,`${name}에서 사진 첨부를 눌러 저장한 카드를 골라요.`,'공유 문구를 복사해 설명과 테스트 링크를 함께 보내요.']):(p.id==='instagram'?['아래 버튼으로 테스트 링크를 복사해요.','인스타그램 DM에 붙여 넣거나, 스토리의 링크 스티커에 넣어요.']:[`아래 버튼으로 테스트 링크를 복사해요.`,`${name}의 메시지 입력창에 붙여 넣고 보내요.`]);
 openModal(`${modalTop(p.name+' 공유')}<p class="share-notice" role="status">${note}</p>${available?`<button class="primary" data-action="native-share" data-platform="${p.id}">${icon('share')} 앱 선택창 ${reason==='manual'?'열기':'다시 열기'}</button>`:''}${isCard?`<div class="share-card-summary"><img src="${shareRequest.card.urls.png}" alt="공유할 카드" width="72" height="96"><strong>${esc(headline(shareRequest.card.name,shareRequest.card.character))}</strong></div>`:''}<h3 class="share-manual-title">앱이 안 보일 땐 이렇게 보내요</h3><ol class="share-steps">${instructions.map(step=>`<li>${step}</li>`).join('')}</ol>${isCard&&available&&p.id!=='instagram'?`<button class="secondary" data-action="native-share-image" data-platform="${p.id}">카드 이미지만 앱으로 보내기</button>`:''}${shareTools(shareRequest)}<button class="text-button share-back" data-action="share-back">${icon('back')} 다른 플랫폼 고르기</button>`);
}
async function chooseSharePlatform(platform='other',imageOnly=false){
 if(!shareRequest||shareBusy)return;
 if(isKakaoBrowser())return externalBrowserGuide(shareRequest.kind==='card'?'card-share':'link-share','png',platform);
 const request=shareRequest;
 // No asynchronous preparation before launchDeviceShare: keep the click gesture.
 shareBusy=true;const pending=launchDeviceShare(request,platform,navigator,imageOnly);
 shareGuide(platform,'manual');
 try{
  const outcome=await pending;
  if(shareRequest!==request||!modal.open)return;
  if(outcome.status!=='opened')shareGuide(platform,outcome.status);
  else if(request.kind==='card'&&outcome.imageOnly)toast('설명과 링크는 문구 복사로 함께 보내 주세요.');
 }finally{shareBusy=false;}
}
function cardLoadingMarkup(c){
 return `<div class="card-loading" data-stage="0" aria-busy="true"><div class="card-workshop" aria-hidden="true"><div class="maker-halo"></div><div class="maker-shadow"></div><div class="maker-card"><svg class="maker-outline" viewBox="0 0 150 204" fill="none"><rect x="3" y="3" width="144" height="198" rx="17"/></svg><i class="maker-heading"></i><div class="maker-portrait" style="background:${c.color}">${charImage(c)}</div><i class="maker-line first"></i><i class="maker-line second"></i><span class="maker-stamp">♡</span><span class="maker-scan"></span></div><svg class="maker-pencil" viewBox="0 0 32 120" fill="none"><path d="M7 20h18v70l-9 20-9-20Z" fill="#f2d381" stroke="#796070" stroke-width="3" stroke-linejoin="round"/><path d="M7 20V9a9 9 0 0 1 18 0v11" fill="#efb9bc" stroke="#796070" stroke-width="3"/><path d="M7 89h18l-9 20Z" fill="#f7e9d7" stroke="#796070" stroke-width="3" stroke-linejoin="round"/><path d="M13 104h6l-3 7Z" fill="#796070"/><path d="M16 29v50" stroke="#bf994e" stroke-width="3" stroke-linecap="round"/></svg><span class="maker-spark a">✦</span><span class="maker-spark b">✧</span><span class="maker-spark c">✦</span></div><p class="maker-title">나만의 카드를 만들고 있어요<span class="maker-dots" aria-hidden="true"><i></i><i></i><i></i></span></p><p class="maker-status" data-loading-status role="status" aria-live="polite">예쁜 글씨를 준비하고 있어요.</p><div class="maker-progress" aria-hidden="true"><i></i></div><div class="maker-steps" aria-hidden="true">${['글씨','캐릭터','성격','이미지'].map((step,i)=>`<span class="${i===0?'active':''}">${step}</span>`).join('')}</div></div>`;
}
function updateCardLoading(loading,stage){
 if(!loading?.isConnected)return;
 loading.dataset.stage=String(stage);
 const messages=['예쁜 글씨를 준비하고 있어요.','나와 닮은 친구를 데려오고 있어요.','이름과 성격을 한 장에 담고 있어요.','PNG와 JPG 이미지를 마무리하고 있어요.','완성! 카드를 꺼내 드릴게요.'];
 loading.querySelector('[data-loading-status]').textContent=messages[stage];
 loading.querySelectorAll('.maker-steps span').forEach((el,i)=>{el.classList.toggle('done',i<stage);el.classList.toggle('active',i===stage);});
 if(stage===4)loading.setAttribute('aria-busy','false');
}
async function prepareCardDialog(forShare=false){
 const c=currentResult,name=resultPerson();if(!c)return;
 const reused=cardCache?.key===c.id+'|'+name,started=Date.now();
 openModal(`${modalTop(forShare?'카드 공유':'카드 다운로드')}${cardLoadingMarkup(c)}`);
 const loading=modal.querySelector('.card-loading');
 try{
  // Give the loading illustration a paint before fonts/canvas work begins.
  await new Promise(resolve=>setTimeout(resolve,30));
  if(!modal.open||!loading.isConnected)return;
  const card=await makeCard(c,name,stage=>updateCardLoading(loading,stage));
  await new Promise(resolve=>setTimeout(resolve,reused?0:Math.max(0,650-(Date.now()-started))));
  updateCardLoading(loading,4);
  if(!reused)await new Promise(resolve=>setTimeout(resolve,180));
  if(!card||!modal.open||!loading.isConnected||currentResult?.id!==c.id||resultPerson()!==name)return;
  if(forShare){openShareChooser({kind:'card',card});return;}
  openModal(`${modalTop('카드 다운로드')}${kakaoNotice('download')}<p class="card-personal-title">${esc(headline(name,c))}</p><img class="card-preview download-preview" src="${card.urls.png}" alt="${esc(headline(name,c))} 결과 카드" width="1080" height="1440">${downloadButtons(card)}<p class="share-footnote">1080 × 1440 이미지 · 카드 안에는 링크가 없어요.<br>사진이 열리면 길게 눌러 이미지 저장을 선택해 주세요.</p><button class="primary" data-action="share-card">${icon('share')} 카드 공유</button>`);
 }catch{
  if(modal.open&&loading.isConnected)openModal(`${modalTop('카드를 만들지 못했어요')}<p>잠시 후 다시 시도해 주세요.</p><button class="primary" data-action="${forShare?'share-card':'save-card'}">다시 만들기</button>`);
 }
}
function saveCard(){return prepareCardDialog(false);}
function shareCard(){return prepareCardDialog(true);}
async function copyCaption(){
 const card=shareRequest?.kind==='card'?shareRequest.card:cardCache;if(!card)return;
 const text=caption(card.name,card.character);
 try{await navigator.clipboard.writeText(text);toast('성격 설명과 나도 해보기 링크를 복사했어요.');}
 catch{openModal(`${modalTop('공유 문구 가져가기')}<textarea class="copy-input caption-copy" readonly aria-label="공유할 성격 설명과 링크">${esc(text)}</textarea><button class="secondary" data-action="share-back">공유 선택창으로 돌아가기</button>`);const input=modal.querySelector('textarea');input.focus();input.select();}
}
function nameDialog(nextAction='start'){
 openModal(`${modalTop(nextAction==='result'?'어떻게 불러 드릴까요?':'먼저 이름을 알려 주세요')}<form id="name-dialog-form" class="name-form" data-next="${nextAction}"><label for="dialog-name">결과에 들어갈 이름 또는 별명</label><input id="dialog-name" autocomplete="nickname" maxlength="24" required value="${esc(playerName)}" placeholder="최대 12자"><p class="name-error" role="alert"></p><button type="submit" class="primary">${nextAction==='result'?'이 이름으로 바꾸기':'이름 등록하고 계속하기'}</button></form>`);
 modal.querySelector('input').focus();
}
function registerName(form,input){
 const name=normalizeName(input.value);
 if(!name){form.querySelector('.name-error').textContent='불러 드릴 이름을 한 글자 이상 적어 주세요.';input.focus();return false;}
 playerName=writeName(store,name);input.value=playerName;clearCardCache();return true;
}
function startQuiz(force=false){
 if(!playerName)return nameDialog(force?'restart':'start');
 if(force||quiz.answers.length===20)quiz.restart();persist();closeModal();question();
}
function restart(){startQuiz(true);}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const action=b.dataset.action,id=b.dataset.id;
 switch(action){
 case 'home':home();break;
 case 'collection':collection();break;
 case 'character':result(id,'gallery');break;
 case 'start':startQuiz();break;
 case 'choose':choose(Number(b.dataset.value));break;
 case 'next':next();break;
 case 'previous':previous();break;
 case 'open-result':if(validAnswers(quiz.answers,true))result(getResult(quiz.answers).id);break;
 case 'edit-last':quiz.index=19;persist();question();break;
 case 'last-result':if(validAnswers(quiz.answers,true))result(getResult(quiz.answers).id);break;
 case 'edit-name':nameDialog('result');break;
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
 case 'download-image':downloadImage(b.dataset.format);break;
 case 'image-save-help':if(cardCache)imageSaveDialog(cardCache,b.dataset.format);break;
 case 'device-save':deviceSaveImage();break;
 case 'external-guide':externalBrowserGuide(b.dataset.next||'download',b.dataset.format||'png');break;
 case 'copy-handoff':copyHandoff();break;
 case 'share-card':shareCard();break;
 case 'share-platform':case 'native-share':chooseSharePlatform(b.dataset.platform);break;
 case 'native-share-image':chooseSharePlatform(b.dataset.platform,true);break;
 case 'share-back':openShareChooser();break;
 case 'copy-share-link':if(shareRequest?.kind==='link')copyLink(shareRequest.payload.url);break;
 case 'copy-caption':copyCaption();break;
 case 'pair':{const s=document.querySelector('#friend-select');if(s){s.value=id;document.querySelector('#pairing-output').innerHTML=pairMarkup(currentResult.id,id);document.querySelector('.compare-box').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});}break;}
 case 'clear-progress':quiz.restart();playerName='';clearCardCache();try{store.removeItem('little-day-v1');store.removeItem('little-day-name-v1');}catch{}closeModal();home();toast('이 기기에 저장된 이름과 답변을 지웠어요.');break;
 }
});
document.addEventListener('submit',e=>{
 const form=e.target;if(!['start-form','name-dialog-form'].includes(form.id))return;e.preventDefault();
 if(!registerName(form,form.querySelector('input')))return;
 const next=form.dataset.next;closeModal();
 if(next==='result'&&currentResult)result(currentResult.id,resultMode);
 else if(next==='last-result'&&validAnswers(quiz.answers,true))result(getResult(quiz.answers).id);
 else startQuiz(next==='restart');
});
document.addEventListener('change',e=>{if(e.target.id==='friend-select'&&currentResult){const id=e.target.value;document.querySelector('#pairing-output').innerHTML=BY_ID[id]?pairMarkup(currentResult.id,id):'';}});
document.addEventListener('keydown',e=>{if(screen!=='question'||modal.open||e.altKey||e.ctrlKey||e.metaKey)return;if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(/^[1-4]$/.test(e.key)){e.preventDefault();choose(QUESTIONS[quiz.index].order[Number(e.key)-1]);}});
modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
window.addEventListener('popstate',()=>{const p=new URLSearchParams(location.search),id=BY_ID[p.get('r')]?.id;if(id)result(id,'shared');else home();});
async function resumeExternalBrowser(state){
 const url=new URL(location.href);url.hash='';history.replaceState(null,'',url);
 invitedBy=state.invite;
 if(state.mode==='own'){
  playerName=writeName(store,state.name);quiz.answers=[...state.answers];quiz.index=19;persist();
 }
 result(state.character,state.mode);
 if(state.action==='link-share')shareResult(state.invitation);
 else if(state.action==='card-share')await shareCard();
 else{
  await saveCard();
  const button=modal.querySelector(`[data-action="download-image"][data-format="${state.format}"]`);
  button?.classList.add('suggested-download');button?.focus();
 }
}
const resumed=readHandoff(location.hash);
if(resumed)resumeExternalBrowser(resumed);
else if(initialResult)result(initialResult,playerName&&validAnswers(quiz.answers,true)&&getResult(quiz.answers).id===initialResult?'own':'shared');
else home();

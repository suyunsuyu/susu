(() => {
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => { if(!String(value||'').trim())return ''; try { const u = new URL(value,location.href); return ['https:','http:','mailto:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const defaults = {catText:'',catFeaturePhoto:'assets/cat-birthday-feature.png',catPhotos:[],catDetails:{name:'',birthday:'',personality:'',likes:''},instagram:'',email:'',thoughts:'',coverPhoto:'assets/cat-rain-cover.png',coverColor:'#ffffff',paperColor:'#ffffff',tabColors:[],textOverrides:{},profile:{name:'',birthDate:'',mbti:'',favoriteFlower:'',hobbies:'',dream:'',message:'',image:'',nameSize:52,nameX:0,nameY:0,detailSize:19,detailX:0,detailY:0},style:{},pages:{}};
  const languageFonts="'Agdasima','Nanum Barunpen','ChillHuoFangSong',sans-serif";
  const fonts = {korean:"'Nanum Barunpen','ChillHuoFangSong','Agdasima'",chinese:"'ChillHuoFangSong','Nanum Barunpen','Agdasima'",english:languageFonts};
  const fontKey=value=>['korean','chinese','english'].includes(value)?value:'english';
  let data = structuredClone(defaults), legacy = null, tab = 'cat', turning = false, editMode = 'content', activeEditable = null, mobileSide='left', diaryItems=[];
  const book = $('#about-book'), cover = $('#book-cover'), spread = $('#book-spread');
  const validColor = (color,fallback=defaults.coverColor) => /^#[\da-f]{6}$/i.test(color) ? color : fallback;
  const tabDefaults=Array.from({length:6},()=>['#191919','#ffffff']);
  function applyTabStyles(){const bg=validColor(data.tabBackground,'#191919');document.querySelectorAll('.book-tabs > *').forEach((el,i)=>{const color=validColor(data.uniformTabs?data.tabColors?.[i]?.text:null,'#ffffff');el.style.setProperty('background',bg,'important');el.style.color=color;const input=$('#binder-tab-text-'+i);if(input)input.value=color;});const input=$('#book-tab-background');if(input)input.value=bg;}
  function applyCoverPhoto(){cover.querySelector('img').src=safeUrl(data.coverPhoto)||defaults.coverPhoto;}
  function applyCoverColor(){applyCoverPhoto();const old=['#f6f2e7','#f7f8fa'].includes(data.coverColor);const colors={coverColor:old?defaults.coverColor:data.coverColor,paperColor:data.paperColor};for(const [key,css,id] of [['coverColor','--binder-cover','book-cover-color'],['paperColor','--binder-paper','book-paper-color']]){const color=validColor(colors[key],defaults[key]);book.style.setProperty(css,color);document.documentElement.style.setProperty(css,color);$('#'+id).value=color;}applyTabStyles();}
  const textTargets=()=>[...document.querySelectorAll('.book-tabs > *, .cover-open-hint, .book-page .book-folio, .book-page h2, .book-page dt, .book-page dd, .book-page p, .book-page a')].filter(el=>!el.closest('.book-cat-grid')&&!el.classList.contains('cat-calendar-link'));
  function textKey(el){if(el.closest('.book-tabs'))return `tab-label:${[...el.parentElement.children].indexOf(el)}`;if(el.classList.contains('cover-open-hint'))return 'cover-hint';const side=el.closest('.book-left')?'left':'right';const page=el.closest('.book-page');return `${tab}:${side}:${[...page.querySelectorAll('.book-folio,h2,dt,dd,p,a')].indexOf(el)}`;}
  function applyTextOverrides(){textTargets().forEach(el=>{const override=data.textOverrides?.[textKey(el)];if(!override)return;if(typeof override.text==='string'&&!el.closest('.book-tabs'))el.textContent=override.text;el.style.fontSize=`${Math.max(10,Math.min(80,Number(override.size)||18))}px`;el.style.color=validColor(override.color,'#333333');el.style.translate=`${Math.max(-180,Math.min(180,Number(override.x)||0))}px ${Math.max(-180,Math.min(180,Number(override.y)||0))}px`;if(override.font&&override.font!=='inherit')el.style.fontFamily=fonts[fontKey(override.font)];el.style.textAlign=['left','center','right'].includes(override.align)?override.align:'left';});}
  function photoKey(el){if(el.classList.contains('cat-feature-image'))return 'cat:feature';if(tab==='profile'&&el.classList.contains('book-portrait'))return 'profile:right:0';const page=el.closest('.book-left,.book-right');return `${tab}:${page?.classList.contains('book-left')?'left':'right'}:${[...page.querySelectorAll('img')].indexOf(el)}`;}
  function applyPhotoOverrides(){document.querySelectorAll('.book-page img').forEach(el=>{const override=data.photoOverrides?.[photoKey(el)];if(!override)return;if(override.src)el.src=safeUrl(override.src)||el.src;el.hidden=!!override.removed;el.style.translate=`${Math.max(-120,Math.min(120,Number(override.x)||0))}px ${Math.max(-120,Math.min(120,Number(override.y)||0))}px`;el.style.scale=String(Math.max(.5,Math.min(1.8,(Number(override.scale)||100)/100)));el.style.rotate=`${Math.max(-15,Math.min(15,Number(override.angle)||0))}deg`;});}
  function sanitize(html) {
    const permitted=new Set(['P','DIV','SPAN','BR','B','STRONG','I','EM','U','H2','H3','UL','OL','LI','A','IMG','FIGURE','SMALL','DL','DT','DD','BUTTON','FONT']);
    const input=document.createElement('template');input.innerHTML=String(html||'');
    const normalize=(source,target)=>{[...source.childNodes].forEach(child=>{
      if(child.nodeType===3){target.append(document.createTextNode(child.textContent));return;}
      if(child.nodeType!==1)return;
      if(!permitted.has(child.tagName)){target.append(document.createTextNode(child.textContent||''));return;}
      const el=document.createElement(child.tagName.toLowerCase());
      const src=child.getAttribute('src'),href=child.getAttribute('href');
      if(child.tagName==='IMG'){const url=safeUrl(src);if(!url)return;el.src=url;el.alt='Page photo';el.className='book-layout-photo';const width=parseInt(child.style.width,10);if(width>=20&&width<=100)el.style.width=width+'%';}
      if(child.tagName==='A'){const url=safeUrl(href);if(url){el.href=url;el.target='_top';el.rel='noopener noreferrer';}}
      if(child.classList.contains('book-folio'))el.className='book-folio';
      if(child.classList.contains('book-cat-feature')){el.className='book-cat-feature';el.dataset.photo='feature';}
      if(child.classList.contains('cat-feature-image'))el.className='cat-feature-image';
      if(child.classList.contains('cat-words-reveal'))el.className='cat-words-reveal';
      if(child.classList.contains('book-cat-grid'))el.className='book-cat-grid';
      if(child.classList.contains('book-cat-empty'))el.className='book-cat-empty';
      if(child.classList.contains('book-cat-photo')){el.className='book-cat-photo';el.dataset.photo=String(Math.max(0,Math.min(5,Number(child.dataset.photo)||0)));}
      if(child.classList.contains('book-link'))el.className='book-link';
      if(child.classList.contains('book-contact'))el.className='book-contact';
      if(child.classList.contains('book-copy'))el.className='book-copy';
      if(child.classList.contains('book-profile'))el.className='book-profile';
      if(child.classList.contains('book-portrait'))el.className='book-portrait';
      if(child.classList.contains('book-portrait-empty'))el.className='book-portrait-empty';
      if(child.classList.contains('book-ins'))el.className='book-ins';
      const align=child.style.textAlign;if(['left','right','center','justify'].includes(align))el.style.textAlign=align;
      const family=child.style.fontFamily||child.getAttribute('face');if(family&&['Agdasima','Nanum Barunpen','ChillHuoFangSong'].some(f=>family.includes(f)))el.style.fontFamily=family;else if(family)el.style.fontFamily=languageFonts;
      const oldSize=Number(child.getAttribute('size'));const size=oldSize>=1&&oldSize<=7?({1:12,2:15,3:18,4:21,5:26,6:32,7:40})[oldSize]:parseInt(child.style.fontSize,10);if(size>=12&&size<=48)el.style.fontSize=size+'px';
      normalize(child,el);target.append(el);
    })};
    const output=document.createElement('div');normalize(input.content,output);return output.innerHTML;
  }
  function style() { const value = data.style?.[tab] || {}; spread.style.setProperty('--book-font',fonts[fontKey(value.font)]); spread.style.setProperty('--book-size',`${Math.max(14,Math.min(36,Number(value.size)||19))}px`); }
  const labels={cat:'INTRO',likes:'FAVORITES',memories:'MEMORIES'};
  let diaryPayload={items:[]},calendarCursor=new Date(new Date().getFullYear(),new Date().getMonth(),1);
  const pad=n=>String(n).padStart(2,'0');
  const entryPhotos=e=>(Array.isArray(e?.images)?e.images:e?.image?[e.image]:[]).map(safeUrl).filter(Boolean);
  const recordInfo=key=>{const parts=key.slice(7).split(':');return {entry:diaryItems.find(e=>String(e.id)===parts[0]),photoPage:Number(parts[1])||0};};
  function rebuildSections(){sections.splice(0,sections.length,'cat','likes',...(data.likesPages||[]).map(e=>'like:'+e.id),'memories');for(const e of [...diaryItems].sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.id).localeCompare(String(b.id)))){for(let i=0;i<Math.max(1,Math.ceil(entryPhotos(e).length/2));i++)sections.push('record:'+e.id+(i?':'+i:''));}}
  function calendarMarkup(){const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth(),offset=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();return `<section class="book-date-calendar" aria-label="추억 달력"><div class="calendar-caption"><button type="button" data-month-step="-1" aria-label="이전 달">←</button><span>${y}.${pad(m+1)}</span><button type="button" data-month-step="1" aria-label="다음 달">→</button></div><div class="cat-mini-calendar">${Array.from({length:offset},()=>'<span></span>').join('')}${Array.from({length:days},(_,i)=>{const date=`${y}-${pad(m+1)}-${pad(i+1)}`,has=diaryItems.some(e=>e.date===date);return `<button type="button" data-record-date="${date}" class="${has?'has-record':''}" aria-label="${date}${has?' 기록 보기':''}">${pad(i+1)}</button>`}).join('')}</div><div class="calendar-paper-actions"><button type="button" data-print-month>이번 달 달력 복사 ↓</button></div></section>`;}
  function photoPair(images){return `<div class="record-photos two-photo-page">${Array.from({length:2},(_,i)=>images[i]?`<button type="button" data-photo="record" aria-label="사진 ${i+1} 크게 보기"><img src="${esc(images[i])}" alt="기록 사진 ${i+1}"></button>`:`<div class="book-photo-space" aria-label="사진 ${i+1} 자리"><span>사진 ${pad(i+1)}</span></div>`).join('')}</div>`;}
  function renderSection(left,right){
    if(tab==='likes'||tab.startsWith('like:')){
      const page=tab==='likes'?(data.likesIntro||{}):(data.likesPages||[]).find(e=>'like:'+e.id===tab)||{};
      const images=Array.isArray(page.images)?page.images:entryPhotos(page),leftSrc=safeUrl(images[0])||(tab==='likes'?'assets/home-flower.svg':''),rightSrc=safeUrl(images[1]);
      const leftPhoto=leftSrc?`<button type="button" data-photo="likes"><img src="${esc(leftSrc)}" alt="Favorite photo"></button>`:'<div class="book-photo-space"><span>사진을 놓는 자리</span></div>';
      left.innerHTML=`<span class="book-folio">FAVORITES</span>${tab==='likes'?`<div class="likes-left-photo">${leftPhoto}</div>`:`<div class="likes-right-content"><h2 aria-hidden="true" style="visibility:hidden">${esc(page.title||'좋아하는 것')}</h2><div class="likes-right-photo">${leftPhoto}</div><p aria-hidden="true" style="visibility:hidden">${esc(page.text||'')}</p></div>`}`;
      right.innerHTML=`<span class="book-folio">FAVORITES</span><div class="likes-right-content"><h2>${esc(page.title||'좋아하는 것')}</h2><div class="likes-right-photo">${rightSrc?`<button type="button" data-photo="likes"><img src="${esc(rightSrc)}" alt="Favorite detail photo"></button>`:'<div class="book-photo-space"><span>사진을 놓는 자리</span></div>'}</div><p>${esc(page.text||'')}</p></div><div class="book-inline-actions"><button type="button" data-likes-edit="${esc(tab==='likes'?'intro':page.id)}" data-admin-only ${window.SUY_IS_ADMIN?'':'hidden'}>페이지 편집 ↗</button><button type="button" data-likes-edit="new" data-admin-only ${window.SUY_IS_ADMIN?'':'hidden'}>페이지 추가 ＋</button></div>`;applyRecordStyle(right,page);return true;}
    if(tab==='memories'){left.innerHTML=`<span class="book-folio">추억</span><h2>${esc(data.memoryTitle||'추억')}</h2><p class="memory-caption">${esc(data.memoryText??'함께한 날들을 한 장씩')}</p><div class="season-date-list">${diaryItems.length?[...diaryItems].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<button type="button" data-record-id="${esc(e.id)}"><time>${esc(e.date.replaceAll('-','.'))}</time><span>${esc(e.title||e.text?.split('\n')[0]||'오늘의 기록')}</span></button>`).join(''):'<p class="season-empty">아직 기록이 없어요.</p>'}</div>`;right.innerHTML=`<span class="book-folio">추억 달력</span>${calendarMarkup()}`;return true;}
    if(tab.startsWith('record:')||tab.startsWith('day:')){const info=tab.startsWith('record:')?recordInfo(tab):{entry:null,photoPage:0},entry=info.entry,date=entry?.date||tab.slice(4),images=entryPhotos(entry).slice(info.photoPage*2,info.photoPage*2+2);left.innerHTML=`<span class="book-folio">${esc(date.replaceAll('-','.'))}</span>${photoPair(images)}`;right.innerHTML=`<span class="book-folio">${esc(date.replaceAll('-','.'))}</span><div class="record-words"><h2>${esc(entry?.title||'오늘의 기록')}</h2><p>${esc(entry?.text||'')}</p></div><div class="book-inline-actions"><button type="button" data-record-edit="${esc(entry?.id||'')}" data-edit-date="${esc(date)}" data-admin-only ${window.SUY_IS_ADMIN?'':'hidden'}>${entry?'기록 편집 ↗':'사진과 기록 남기기 ＋'}</button><button type="button" data-memory-back>달력으로 ↗</button></div>`;applyRecordStyle(right,entry);return true;}
    return false;
  }
  function applyRecordStyle(right,entry){const p=right.querySelector('.record-words p');if(!p)return;p.style.fontFamily=fonts[fontKey(entry?.style?.font)];p.style.color=validColor(entry?.style?.color,'#454545');p.style.fontSize=Math.max(14,Math.min(36,Number(entry?.style?.size)||19))+'px';}
  function bindSectionControls(){
    spread.querySelectorAll('[data-record-id]').forEach(b=>b.onclick=()=>open('record:'+b.dataset.recordId));
    spread.querySelectorAll('[data-record-date]').forEach(b=>b.onclick=()=>{const date=b.dataset.recordDate,entry=diaryItems.find(e=>e.date===date);open(entry?'record:'+entry.id:'day:'+date);});
    spread.querySelectorAll('[data-month-step]').forEach(b=>b.onclick=()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+Number(b.dataset.monthStep),1);content();});
    spread.querySelectorAll('[data-print-month]').forEach(b=>b.onclick=()=>window.SUY_MONTHLY.download(calendarCursor.getFullYear(),calendarCursor.getMonth(),diaryItems,b));
    spread.querySelectorAll('[data-memory-back]').forEach(b=>b.onclick=()=>open('memories'));
    spread.querySelectorAll('[data-record-edit]').forEach(b=>b.onclick=()=>showEntryEditor('record',b.dataset.recordEdit,b.dataset.editDate));
    spread.querySelectorAll('[data-likes-edit]').forEach(b=>b.onclick=()=>showEntryEditor('likes',b.dataset.likesEdit));
    const current=Math.max(0,sectionIndex()>=0?sectionIndex():sections.indexOf('memories'));$('#record-page-number').textContent=`${current+1} / ${sections.length}`;$('#record-page-prev').disabled=current<=0;$('#record-page-next').disabled=current>=sections.length-1;
  }
  document.body.insertAdjacentHTML('beforeend',`<dialog id="cat-entry-editor" class="book-editor"><form id="cat-entry-form"><button type="button" class="close" aria-label="닫기">×</button><h2 id="cat-entry-heading">기록</h2><label id="cat-entry-date-label">날짜<input id="cat-entry-date" type="date" required></label><label>제목<input id="cat-entry-title" maxlength="120"></label><label>내용<textarea id="cat-entry-text" rows="6" maxlength="6000"></textarea></label><div class="entry-photo-fields">${[0,1].map(i=>`<label>사진 ${pad(i+1)}<img id="cat-entry-preview-${i}" class="book-editor-thumb" alt="사진 ${i+1}" hidden><input id="cat-entry-photo-${i}" type="file" accept="image/jpeg,image/png,image/webp"><span><input id="cat-entry-remove-${i}" type="checkbox"> 사진 지우기</span></label>`).join('')}</div><div class="entry-style-fields"><label>글꼴<select id="cat-entry-font"><option value="korean">한국어</option><option value="chinese">中文</option><option value="english">English</option></select></label><label>크기<input id="cat-entry-size" type="number" min="14" max="36" value="19"></label><label>색상<input id="cat-entry-color" type="color" value="#454545"></label></div><button type="submit">저장</button><p id="cat-entry-status" role="status"></p></form></dialog>`);
  let entryEdit=null;
  $('#cat-entry-editor .close').onclick=()=>$('#cat-entry-editor').close();
  async function showEntryEditor(kind,id,date){if(!await window.SUY_ADMIN?.isAdmin())return;const entry=kind==='record'?diaryItems.find(e=>String(e.id)===id):id==='intro'?(data.likesIntro||{}):(data.likesPages||[]).find(e=>String(e.id)===id);entryEdit={kind,id:id==='intro'?'intro':entry?.id||'',date};$('#cat-entry-form').reset();$('#cat-entry-heading').textContent=kind==='record'?'추억 기록':'좋아하는 것 · 페이지';$('#cat-entry-date-label').hidden=kind!=='record';$('#cat-entry-date').required=kind==='record';$('#cat-entry-date').value=entry?.date||date||'';$('#cat-entry-title').value=entry?.title||'';$('#cat-entry-text').value=entry?.text||'';$('#cat-entry-font').value=fontKey(entry?.style?.font||'korean');$('#cat-entry-size').value=entry?.style?.size||19;$('#cat-entry-color').value=validColor(entry?.style?.color,'#454545');const images=kind==='likes'&&Array.isArray(entry?.images)?entry.images:entryPhotos(entry);for(let i=0;i<2;i++){const im=$('#cat-entry-preview-'+i);im.hidden=!images[i];im.src=images[i]||'';}$('#cat-entry-status').textContent='';$('#cat-entry-editor').showModal();}
  $('#cat-entry-form').onsubmit=async e=>{e.preventDefault();const status=$('#cat-entry-status'),submit=e.target.querySelector('[type=submit]');try{if(!entryEdit||!await window.SUY_ADMIN?.isAdmin())return;submit.disabled=true;status.textContent='저장 중…';const {kind,id}=entryEdit,existing=kind==='record'?diaryItems.find(v=>v.id===id):id==='intro'?data.likesIntro:(data.likesPages||[]).find(v=>v.id===id),images=[...(kind==='likes'&&Array.isArray(existing?.images)?existing.images:entryPhotos(existing))];for(let i=0;i<2;i++){if($('#cat-entry-remove-'+i).checked)images[i]='';const file=$('#cat-entry-photo-'+i).files[0];if(file){if(file.size>10*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('10 MB 이하의 JPG, PNG, WebP 사진을 선택해 주세요.');images[i]=await window.SUY_ADMIN.uploadPublic(file,kind==='record'?'diary':'cat-likes');}}
      const nextEntry={...existing,id:id||crypto.randomUUID(),title:$('#cat-entry-title').value.trim(),text:$('#cat-entry-text').value,images:kind==='likes'?images:images.filter(Boolean),image:images.find(Boolean)||'',style:{font:$('#cat-entry-font').value,size:Number($('#cat-entry-size').value),color:$('#cat-entry-color').value}};
      if(kind==='record'){nextEntry.date=$('#cat-entry-date').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(nextEntry.date))throw Error('날짜를 선택해 주세요.');const nextItems=[...diaryItems.filter(v=>v.id!==id),nextEntry].sort((a,b)=>a.date.localeCompare(b.date)),nextPayload={...diaryPayload,items:nextItems};await window.SUY_ADMIN.saveContent('diary',nextPayload);diaryPayload=nextPayload;diaryItems=nextItems;tab='record:'+nextEntry.id;calendarCursor=new Date(Number(nextEntry.date.slice(0,4)),Number(nextEntry.date.slice(5,7))-1,1);}
      else{const next=structuredClone(data);if(id==='intro')next.likesIntro=nextEntry;else next.likesPages=id?(next.likesPages||[]).map(v=>v.id===id?nextEntry:v):[...(next.likesPages||[]),nextEntry];await window.SUY_ADMIN.saveContent('about-book',next);data=next;tab=id==='intro'?'likes':'like:'+nextEntry.id;}
      rebuildSections();content();setThickness();sync();$('#cat-entry-editor').close();
    }catch(error){status.textContent=error.message;}finally{submit.disabled=false;}};

  function content() {
    const left = $('#book-left'), right = $('#book-right'); style();
    right.classList.toggle('notes-paper',tab==='thoughts');
    if (renderSection(left,right)) {
    } else if (tab === 'cat') {
      left.innerHTML = `<span class="book-folio">2026 / 내 고양이</span><button type="button" class="book-cat-feature" data-photo="feature" aria-label="사진 크게 보기"><img class="cat-feature-image" src="${esc(safeUrl(data.catFeaturePhoto)||defaults.catFeaturePhoto)}" alt="생일 모자를 쓴 고양이"></button>`;
      const now=new Date(),year=now.getFullYear(),month=now.getMonth(),first=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate();
      right.innerHTML = `<span class="book-folio">고양이와 함께한 날들</span><div class="cat-words-reveal"><h2>내 고양이</h2><dl class="book-profile">${[['이름',data.catDetails?.name],['생일',data.catDetails?.birthday||'5월 5일'],['성격',data.catDetails?.personality],['좋아하는 것',data.catDetails?.likes]].filter(([,v])=>v).map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl><p class="book-copy">${esc(data.catText)}</p></div>`;
    } else {
      left.innerHTML = '<span class="book-folio">04 / WORDS</span><h2>MY WORDS</h2>';
      right.innerHTML = `<span class="book-folio">NOTES</span><p class="book-copy">${esc(data.thoughts)}</p>`;
    }
    if (data.pages?.[tab]) {if(tab==='cat'&&data.pages[tab].layoutVersion!==2){const custom=document.createElement('div');custom.className='cat-saved-layout';custom.innerHTML=sanitize(data.pages[tab].right);custom.querySelectorAll('a[href*="tools.html"]').forEach(el=>el.remove());right.querySelector('.cat-words-reveal').append(custom);}else{left.innerHTML=sanitize(data.pages[tab].left);right.innerHTML=sanitize(data.pages[tab].right);}}
    spread.querySelectorAll('[data-photo]').forEach(button => button.onclick = () => {const d=$('#book-photo-dialog');d.querySelector('img').src=button.querySelector('img')?.src||data.catPhotos[Number(button.dataset.photo)];d.showModal();});
    bindSectionControls();
    applyTextOverrides();applyTabStyles();
    applyPhotoOverrides();
    document.dispatchEvent(new CustomEvent('notebook-section',{detail:{tab,closed:book.classList.contains('is-closed')}}));
  }
  const sections=['cat','likes','memories'];
  function sectionIndex(){const i=sections.indexOf(tab);return i<0?sections.indexOf('memories'):i;}
  $('#book-binding')?.remove();

  function setMobileSide(side){mobileSide=side;book.dataset.mobileSide=side;$('#book-mobile-count').textContent=side==='left'?'1 / 2':'2 / 2';}
  function setThickness(){const index=sectionIndex()/Math.max(1,sections.length-1)*4;book.dataset.pageIndex=String(index);book.style.setProperty('--left-stack',`${2+index*2}px`);book.style.setProperty('--right-stack',`${11-index*2}px`);}
  let pendingSection=null;
  const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionOptions=duration=>({duration:reducedMotion()?0:duration,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
  function clearSheet(){book.classList.remove('is-turning');$('#book-turn-leaf').replaceChildren();}
  function finishTurn(next){tab=next;content();setThickness();setMobileSide('left');sync();}
  async function transitionPage(next){
    turning=true;book.classList.add('is-switching');
    try{
      // PowerPoint's brightness effect: no duplicate pages or rotating strips.
      const dim=spread.animate([{opacity:1},{opacity:.16}],motionOptions(140));
      await dim.finished;finishTurn(next);
      const reveal=spread.animate([{opacity:.16},{opacity:1}],motionOptions(260));
      dim.cancel();await reveal.finished;reveal.cancel();
    }finally{book.classList.remove('is-switching');turning=false;if(pendingSection){const nextSection=pendingSection;pendingSection=null;open(nextSection);}}
  }
  async function animateOpening(closedRect){
    cover.style.transform='none';cover.style.opacity='1';
    const rect=cover.getBoundingClientRect();
    const dx=closedRect.left-rect.left,dy=closedRect.top-rect.top;
    const sx=closedRect.width/rect.width,sy=closedRect.height/rect.height;
    const animation=cover.animate([
      {transform:`translate3d(${dx}px,${dy}px,0) scale(${sx},${sy}) rotateY(0deg)`,opacity:1},
      {transform:'translate3d(0,0,12px) scale(1) rotateY(-100deg)',opacity:1,offset:.58},
      {transform:'translate3d(0,0,0) scale(1) rotateY(-180deg)',opacity:0}
    ],motionOptions(780));
    const paper=spread.animate([{opacity:0},{opacity:1}],{...motionOptions(580),delay:reducedMotion()?0:120});
    try{await animation.finished;await paper.finished;}finally{
      animation.cancel();paper.cancel();cover.style.removeProperty('transform');cover.style.removeProperty('opacity');
      book.classList.remove('is-opening');turning=false;sync();
    }
  }
  function open(next='cat') {
    if (turning){if(book.classList.contains('is-switching'))pendingSection=next;return;}
    if(next.startsWith('record:')){const e=recordInfo(next).entry;if(e)calendarCursor=new Date(Number(e.date.slice(0,4)),Number(e.date.slice(5,7))-1,1);}
    if (book.classList.contains('is-closed')) {const closedRect=cover.getBoundingClientRect();tab=next;content();turning=true;cover.style.transform='rotateY(0)';cover.style.opacity='1';book.classList.add('is-opening');book.classList.remove('is-closed');cover.setAttribute('aria-expanded','true');setMobileSide('left');setThickness();sync();animateOpening(closedRect);return;}
    if(tab===next)return;
    transitionPage(next);
  }
  function sync(){book.dataset.section=tab;document.dispatchEvent(new CustomEvent('notebook-section',{detail:{tab,closed:book.classList.contains('is-closed')}}));const active=tab.startsWith('record:')||tab.startsWith('day:')?'memories':tab.startsWith('like:')?'likes':tab;document.querySelectorAll('[data-book-tab]').forEach(b=>b.classList.toggle('active',b.dataset.bookTab===active&&!book.classList.contains('is-closed')));$('#book-close').hidden=book.classList.contains('is-closed');$('#book-edit').hidden=book.classList.contains('is-closed')||!['cat','memories'].includes(tab)||!window.SUY_IS_ADMIN;$('#book-color-control').hidden=!window.SUY_IS_ADMIN;}
  $('#book-cover-upload').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;const status=$('#book-cover-status');try{if(!await window.SUY_ADMIN?.isAdmin())return;if(file.size>10*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP under 10 MB.');status.textContent='UPLOADING…';const src=await window.SUY_ADMIN.uploadPublic(file,'book-cover');const next={...data,coverPhoto:src};await window.SUY_ADMIN.saveContent('about-book',next);data=next;applyCoverPhoto();status.textContent='COVER SAVED';}catch(error){status.textContent=error.message}finally{e.target.value=''}};
  $('#binder-palette-toggle').onclick=()=>{$('.binder-palette-fields').hidden=!$('.binder-palette-fields').hidden};
  $('#binder-tab-colors').innerHTML=[...document.querySelectorAll('.book-tabs > *')].map((el,i)=>`<div class="binder-tab-color-row"><span>${esc(el.textContent.trim())}</span><label aria-label="${esc(el.textContent.trim())} text color">TEXT<input id="binder-tab-text-${i}" type="color" value="${tabDefaults[i][1]}"></label></div>`).join('');
  for(const [id,key] of [['book-cover-color','coverColor'],['book-paper-color','paperColor'],['book-tab-background','tabBackground']])$('#'+id).onchange=async e=>{if(!await window.SUY_ADMIN?.isAdmin())return;const previous=data[key];data[key]=validColor(e.target.value,defaults[key]||'#191919');if(key==='tabBackground')data.uniformTabs=true;applyCoverColor();try{await window.SUY_ADMIN.saveContent('about-book',data)}catch(error){data[key]=previous;applyCoverColor();alert('Could not save book color: '+error.message)}};
  $('#binder-tab-colors').onchange=async e=>{const input=e.target.closest('input[type=color]');if(!input||!await window.SUY_ADMIN?.isAdmin())return;const [,kind,indexText]=input.id.match(/^binder-tab-(bg|text)-(\d)$/)||[];if(!kind)return;const index=Number(indexText),previous=structuredClone(data);data.uniformTabs=true;data.tabColors=[...(data.tabColors||[])];data.tabColors[index]={...(data.tabColors[index]||{}),[kind]:validColor(input.value,tabDefaults[index][kind==='bg'?0:1])};if(kind==='text'&&data.textOverrides?.[`tab-label:${index}`]){data.textOverrides={...data.textOverrides};data.textOverrides[`tab-label:${index}`]={...data.textOverrides[`tab-label:${index}`],color:data.tabColors[index].text}}applyTabStyles();try{await window.SUY_ADMIN.saveContent('about-book',data)}catch(error){data=previous;applyTabStyles();alert('Could not save tab color: '+error.message)}};
  let selectedText=null;
  const textEditor=$('#book-text-editor');
  $('#book-text-close').onclick=()=>textEditor.close();
  document.addEventListener('dblclick',async e=>{const el=e.target.closest('.book-tabs > *, .cover-open-hint, .book-page .book-folio, .book-page h2, .book-page dt, .book-page dd, .book-page p, .book-page a');if(!el||!window.SUY_IS_ADMIN||!await window.SUY_ADMIN?.isAdmin())return;e.preventDefault();selectedText={key:textKey(el),el};const saved=data.textOverrides?.[selectedText.key]||{};$('#book-text-value').value=saved.text??el.textContent.trim();$('#book-text-size').value=saved.size||Math.round(parseFloat(getComputedStyle(el).fontSize));$('#book-text-color').value=validColor(saved.color||'#333333');$('#book-text-font').value=fontKey(saved.font);$('#book-text-align').value=saved.align||'left';$('#book-text-x').value=saved.x||0;$('#book-text-y').value=saved.y||0;['size','x','y'].forEach(k=>$('#book-text-'+k+'-output').textContent=$('#book-text-'+k).value+' px');$('#book-text-status').textContent='';textEditor.showModal();});
  ['size','x','y'].forEach(k=>{$('#book-text-'+k).oninput=()=>$('#book-text-'+k+'-output').textContent=$('#book-text-'+k).value+' px'});
  $('#book-text-form').onsubmit=async e=>{e.preventDefault();if(!selectedText)return;const status=$('#book-text-status');status.textContent='SAVING…';try{if(!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');const next=structuredClone(data);next.textOverrides={...(next.textOverrides||{}),[selectedText.key]:{text:$('#book-text-value').value,font:$('#book-text-font').value,align:$('#book-text-align').value,size:Number($('#book-text-size').value),color:validColor($('#book-text-color').value,'#333333'),x:Number($('#book-text-x').value),y:Number($('#book-text-y').value)}};await window.SUY_ADMIN.saveContent('about-book',next);data=next;applyTextOverrides();textEditor.close()}catch(error){status.textContent='SAVE FAILED: '+error.message}};
  let selectedPhoto=null;
  $('#book-image-close').onclick=()=>$('#book-image-editor').close();
  document.addEventListener('dblclick',async e=>{const el=e.target.closest('.book-page img');if(!el||!window.SUY_IS_ADMIN||!await window.SUY_ADMIN?.isAdmin())return;e.preventDefault();e.stopPropagation();selectedPhoto=photoKey(el);const saved=data.photoOverrides?.[selectedPhoto]||{};for(const key of ['scale','angle','x','y'])$('#book-image-'+key).value=saved[key]??(key==='scale'?100:0);$('#book-image-remove').checked=!!saved.removed;$('#book-image-file').value='';$('#book-image-status').textContent='';$('#book-image-editor').showModal();},true);
  $('#book-image-form').onsubmit=async e=>{e.preventDefault();if(!selectedPhoto)return;const status=$('#book-image-status');status.textContent='SAVING…';try{if(!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');const next=structuredClone(data),saved=next.photoOverrides?.[selectedPhoto]||{};const file=$('#book-image-file').files[0];const src=file?await window.SUY_ADMIN.uploadPublic(file,'about-book'):saved.src;next.photoOverrides={...(next.photoOverrides||{}),[selectedPhoto]:{src,scale:Number($('#book-image-scale').value),angle:Number($('#book-image-angle').value),x:Number($('#book-image-x').value),y:Number($('#book-image-y').value),removed:$('#book-image-remove').checked}};await window.SUY_ADMIN.saveContent('about-book',next);data=next;applyPhotoOverrides();$('#book-image-editor').close()}catch(error){status.textContent='SAVE FAILED: '+error.message}};
  cover.onclick=()=>open('cat');
  document.querySelectorAll('[data-book-tab]').forEach(b=>b.onclick=()=>open(b.dataset.bookTab));
  document.addEventListener('suyoon-admin-state',()=>{sync();spread.querySelectorAll('.book-inline-actions [data-admin-only]').forEach(el=>el.hidden=!window.SUY_IS_ADMIN);});

  async function animateClosing(){
    if(turning)return;turning=true;clearSheet();
    book.classList.add('is-closing');$('#book-close').disabled=true;
    cover.style.transform='none';cover.style.opacity='1';
    const coverFold=cover.animate([
      {transform:'rotateY(-180deg)',opacity:0},
      {transform:'translateZ(10px) rotateY(-85deg)',opacity:1,offset:.4},
      {transform:'rotateY(0deg)',opacity:1}
    ],motionOptions(520));
    const pageFold=$('#book-left').animate([
      {transform:'rotateY(-1.7deg)',opacity:1},
      {transform:'rotateY(90deg)',opacity:.7,offset:.6},
      {transform:'rotateY(180deg)',opacity:0}
    ],motionOptions(520));
    try{
      await coverFold.finished;
      const from=cover.getBoundingClientRect();
      book.classList.add('is-closed');book.classList.remove('is-closing');
      coverFold.cancel();pageFold.cancel();cover.style.removeProperty('transform');cover.style.removeProperty('opacity');
      const to=cover.getBoundingClientRect();
      // Read geometry only at the endpoints; all in-between frames are composited.
      const settle=cover.animate([
        {transform:`translate3d(${from.left-to.left}px,${from.top-to.top}px,0) scale(${from.width/to.width},${from.height/to.height})`},
        {transform:'translate3d(0,0,0) scale(1)'}
      ],motionOptions(180));
      await settle.finished;settle.cancel();
    }finally{
      coverFold.cancel();pageFold.cancel();book.classList.add('is-closed');book.classList.remove('is-closing');
      cover.style.removeProperty('transform');cover.style.removeProperty('opacity');
      cover.setAttribute('aria-expanded','false');$('#book-close').disabled=false;turning=false;sync();cover.focus({preventScroll:true});
    }
  }
  $('#book-close').onclick=animateClosing;
  $('#book-page-corner').onclick=()=>{if(!turning)open(sections[(sectionIndex()+1)%sections.length])};
  $('#book-mobile-prev').onclick=()=>{if(mobileSide==='right')setMobileSide('left');else open(sections[(sectionIndex()+sections.length-1)%sections.length])};
  $('#book-mobile-next').onclick=()=>{if(mobileSide==='left')setMobileSide('right');else open(sections[(sectionIndex()+1)%sections.length])};
  // Page navigation uses the same brightness transition as the index tabs.
  // Drag text only while signed in; the result uses the same persistent styling as the editor.
  let textDrag=null;
  document.addEventListener('pointerdown',e=>{const el=e.target.closest('.book-page .book-folio,.book-page h2,.book-page dt,.book-page dd,.book-page p');if(!el||!window.SUY_IS_ADMIN||e.detail>1)return;textDrag={el,key:textKey(el),x:e.clientX,y:e.clientY,from:data.textOverrides?.[textKey(el)]||{},moved:false};});
  document.addEventListener('pointermove',e=>{if(!textDrag)return;const dx=e.clientX-textDrag.x,dy=e.clientY-textDrag.y;if(Math.abs(dx)+Math.abs(dy)<8)return;textDrag.moved=true;textDrag.el.style.translate=`${(Number(textDrag.from.x)||0)+dx}px ${(Number(textDrag.from.y)||0)+dy}px`;});
  document.addEventListener('pointerup',async e=>{if(!textDrag)return;const drag=textDrag;textDrag=null;if(!drag.moved)return;if(!await window.SUY_ADMIN?.isAdmin()){applyTextOverrides();return}const previous=data;const next=structuredClone(data);next.textOverrides={...(next.textOverrides||{}),[drag.key]:{...drag.from,text:drag.from.text??drag.el.textContent,size:drag.from.size||Math.round(parseFloat(getComputedStyle(drag.el).fontSize)),color:drag.from.color||'#333333',x:Math.max(-180,Math.min(180,(Number(drag.from.x)||0)+e.clientX-drag.x)),y:Math.max(-180,Math.min(180,(Number(drag.from.y)||0)+e.clientY-drag.y))}};data=next;applyTextOverrides();try{await window.SUY_ADMIN.saveContent('about-book',next)}catch{data=previous;applyTextOverrides()}});
  $('#book-photo-dialog .close').onclick=()=>$('#book-photo-dialog').close();
  $('#book-photo-dialog').onclick=e=>{if(e.target===$('#book-photo-dialog'))e.target.close()};
  const editor=$('#book-editor'); $('#book-editor-close').onclick=()=>editor.close();
  const setMode=mode=>{editMode=mode;$('#book-mode-content').classList.toggle('active',mode==='content');$('#book-mode-layout').classList.toggle('active',mode==='layout');$('#book-editor-fields').hidden=mode!=='content';$('#book-layout-fields').hidden=mode!=='layout';};
  $('#book-mode-content').onclick=()=>setMode('content');$('#book-mode-layout').onclick=()=>setMode('layout');
  let editorTab=null;
  function seedLayout(){for(const side of ['left','right']){const current=$('#book-'+side).cloneNode(true);current.querySelectorAll('.book-inline-actions,[data-admin-only]').forEach(el=>el.remove());$('#layout-'+side).innerHTML=sanitize(current.innerHTML);}activeEditable=$('#layout-left');}
  $('#book-reset-layout').onclick=()=>{$('#layout-left').innerHTML='';$('#layout-right').innerHTML='';$('#book-status').textContent='Save to restore the standard layout.';};
  document.querySelectorAll('.book-layout-editable').forEach(el=>{el.onfocus=()=>activeEditable=el;el.onclick=()=>activeEditable=el;});
  $('.book-layout-toolbar').onmousedown=e=>{if(e.target.closest('button[data-format]'))e.preventDefault()};
  document.querySelectorAll('[data-format]').forEach(button=>button.onclick=()=>{activeEditable?.focus();document.execCommand(button.dataset.format,false,null)});
  $('#layout-font').onchange=e=>{activeEditable?.focus();document.execCommand('fontName',false,e.target.value)};
  $('#layout-font-size').onchange=e=>{activeEditable?.focus();document.execCommand('fontSize',false,e.target.value)};
  $('#book-layout-image').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;const target=activeEditable||$('#layout-left');const selection=window.getSelection(),savedRange=selection?.rangeCount&&target.contains(selection.anchorNode)?selection.getRangeAt(0).cloneRange():null;try{$('#book-status').textContent='UPLOADING PHOTO…';const src=await window.SUY_ADMIN.uploadPublic(file,'about-book');target.focus();if(savedRange){selection.removeAllRanges();selection.addRange(savedRange)}document.execCommand('insertHTML',false,`<img class="book-layout-photo" src="${esc(src)}" alt="Page photo">`);$('#book-status').textContent='PHOTO ADDED. SAVE YOUR LAYOUT.';}catch(error){$('#book-status').textContent=error.message}e.target.value='';};

  $('#book-size').oninput=()=>$('#book-size-output').textContent=$('#book-size').value+' px';
  function fields() {
    const p=data.profile||{};
    if(tab==='profile') return `<label>NAME<input name="name" value="${esc(p.name)}"></label><div class="profile-adjust"><label>NAME SIZE <input name="nameSize" type="range" min="18" max="80" value="${Number(p.nameSize)||52}"></label><label>NAME LEFT / RIGHT <input name="nameX" type="range" min="-100" max="100" value="${Number(p.nameX)||0}"></label><label>NAME UP / DOWN <input name="nameY" type="range" min="-100" max="100" value="${Number(p.nameY)||0}"></label></div><label>BIRTHDAY<input name="birthDate" type="date" value="${esc(p.birthDate)}"></label><label>MBTI<input name="mbti" value="${esc(p.mbti)}"></label><label>FAVORITE FLOWER<input name="favoriteFlower" value="${esc(p.favoriteFlower)}"></label><label>HOBBIES<input name="hobbies" value="${esc(p.hobbies)}"></label><label>DREAM<input name="dream" value="${esc(p.dream)}"></label><label>PHOTO<input name="portrait" type="file" accept="image/*"></label><label>PERSONAL WORDS<textarea name="message">${esc(p.message)}</textarea></label><div class="profile-adjust"><label>DETAIL SIZE <input name="detailSize" type="range" min="12" max="36" value="${Number(p.detailSize)||19}"></label><label>DETAIL LEFT / RIGHT <input name="detailX" type="range" min="-100" max="100" value="${Number(p.detailX)||0}"></label><label>DETAIL UP / DOWN <input name="detailY" type="range" min="-100" max="100" value="${Number(p.detailY)||0}"></label></div>`;
    if(tab==='cat') return `${[['name','이름'],['birthday','생일'],['personality','성격'],['likes','좋아하는 것']].map(([k,v])=>`<label>${v}<input name="catDetail-${k}" value="${esc(data.catDetails?.[k])}"></label>`).join('')}<label>소개<textarea name="catText">${esc(data.catText)}</textarea></label><label>사진<img class="book-editor-thumb" src="${esc(data.catFeaturePhoto||defaults.catFeaturePhoto)}" alt="Current photo"><input name="catFeature" type="file" accept="image/*"></label>`;
    if(tab==='memories')return `<label>제목<input name="memoryTitle" value="${esc(data.memoryTitle||'추억')}"></label><label>소개 글<textarea name="memoryText">${esc(data.memoryText??'함께한 날들을 한 장씩')}</textarea></label>`;
    if(tab==='contact') return `<label>INSTAGRAM URL<input name="instagram" type="url" value="${esc(data.instagram)}" placeholder="https://instagram.com/..."></label><label>EMAIL<input name="email" type="email" value="${esc(data.email)}"></label>`;
    return `<label>WORDS<textarea name="thoughts">${esc(data.thoughts)}</textarea></label>`;
  }
  $('#book-edit').onclick=async()=>{const requestedTab=tab;if(!await window.SUY_ADMIN?.isAdmin()||requestedTab!==tab||turning)return;editorTab=requestedTab;$('#book-editor-heading').textContent='EDIT · '+(tab==='cat'?'내 고양이':tab);$('#book-editor-fields').innerHTML=fields();seedLayout();setMode(tab==='memories'?'content':'layout');const st=data.style?.[tab]||{};$('#book-font').value=fontKey(st.font);$('#book-size').value=st.size||19;$('#book-size-output').textContent=$('#book-size').value+' px';$('#book-status').textContent='';editor.showModal();};
  $('#book-form').onsubmit=async e=>{
    e.preventDefault();const status=$('#book-status');status.textContent='SAVING…';
    try {if(!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');if(!editorTab||editorTab!==tab)throw Error('Please reopen the editor on the current page.');const form=new FormData(e.target);const next=structuredClone(data);next.style={...(next.style||{}),[tab]:{font:$('#book-font').value,size:Number($('#book-size').value)}};
      if(tab==='profile'){next.profile={...next.profile};for(const key of ['name','birthDate','mbti','favoriteFlower','hobbies','dream','message'])next.profile[key]=String(form.get(key)||'');for(const [key,min,max] of [['nameSize',18,80],['nameX',-100,100],['nameY',-100,100],['detailSize',12,36],['detailX',-100,100],['detailY',-100,100]])next.profile[key]=Math.max(min,Math.min(max,Number(form.get(key))||0));const file=form.get('portrait');if(file?.size)next.profile.image=await window.SUY_ADMIN.uploadPublic(file,'about');legacy={...(legacy||{}),personal:next.profile};await window.SUY_ADMIN.saveContent('about-interactive',legacy);}
      if(tab==='cat'&&editMode==='content'){next.catText=String(form.get('catText')||'');next.catDetails=Object.fromEntries(['name','birthday','personality','likes'].map(k=>[k,String(form.get('catDetail-'+k)||'')]));const file=form.get('catFeature');if(file?.size){next.catFeaturePhoto=await window.SUY_ADMIN.uploadPublic(file,'about-cat');if(next.photoOverrides)delete next.photoOverrides['cat:feature'];}}
      if(tab==='memories'){next.memoryTitle=String(form.get('memoryTitle')||'');next.memoryText=String(form.get('memoryText')||'');}
      if(tab==='contact'){next.instagram=safeUrl(form.get('instagram'));next.email=String(form.get('email')||'').trim();}
      if(tab==='thoughts')next.thoughts=String(form.get('thoughts')||'');
      if(editMode==='layout'){next.pages={...(next.pages||{})};const left=sanitize($('#layout-left').innerHTML),right=sanitize($('#layout-right').innerHTML);if(left.trim()||right.trim())next.pages[editorTab]={left,right,layoutVersion:2};else delete next.pages[tab];}
      await window.SUY_ADMIN.saveContent('about-book',next);data=next;content();editor.close();
    }catch(error){status.textContent='SAVE FAILED: '+error.message;}
  };
  $('#record-page-prev').onclick=()=>{if(!turning&&sectionIndex()>0)open(sections[sectionIndex()-1]);};
  $('#record-page-next').onclick=()=>{if(!turning&&sectionIndex()<sections.length-1)open(sections[sectionIndex()+1]);};
  setMobileSide('left');content();setThickness();sync();
  (async()=>{try{if(window.SUY_SITE_READY)await window.SUY_SITE_READY;const api=window.SUY_ADMIN;const [old,saved,diary]=await Promise.all([api.loadContent('about-interactive').catch(()=>null),api.loadContent('about-book'),api.loadContent('diary').catch(()=>null)]);legacy=old||{};diaryPayload=diary||{items:[]};diaryItems=Array.isArray(diary?.items)?diary.items:[];data={...structuredClone(defaults),...saved,profile:{...defaults.profile,...legacy.personal,...saved?.profile}};rebuildSections();applyCoverColor();content();setThickness();sync();}catch(error){console.warn('About content unavailable',error);}})();
})();

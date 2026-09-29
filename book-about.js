(() => {
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => { if(!String(value||'').trim())return ''; try { const u = new URL(value,location.href); return ['https:','http:','mailto:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const defaults = {catText:'',catPhotos:[],catDetails:{name:'',birthday:'',personality:'',likes:''},instagram:'',email:'',thoughts:'',coverColor:'#dce6eb',paperColor:'#f7f7f3',tabAColor:'#dce7eb',tabBColor:'#e8dfe3',textOverrides:{},profile:{name:'',birthDate:'',mbti:'',favoriteFlower:'',hobbies:'',dream:'',message:'',image:'',nameSize:52,nameX:0,nameY:0,detailSize:19,detailX:0,detailY:0},style:{},pages:{}};
  const fonts = {hand:"'Caveat','Nanum Pen Script',cursive",serif:"'Cormorant Garamond','Noto Sans SC',serif",sans:"'Noto Sans SC',sans-serif",mono:"'DM Mono','Noto Sans SC',monospace"};
  let data = structuredClone(defaults), legacy = null, tab = 'profile', turning = false, editMode = 'content', activeEditable = null, mobileSide='left', diaryItems=[];
  const book = $('#about-book'), cover = $('#book-cover'), spread = $('#book-spread');
  const validColor = (color,fallback=defaults.coverColor) => /^#[\da-f]{6}$/i.test(color) ? color : fallback;
  function applyCoverColor(){const old=['#f6f2e7','#f7f8fa'].includes(data.coverColor);const colors={coverColor:old?defaults.coverColor:data.coverColor,paperColor:data.paperColor,tabAColor:data.tabAColor,tabBColor:data.tabBColor};for(const [key,css,id] of [['coverColor','--binder-cover','book-cover-color'],['paperColor','--binder-paper','book-paper-color'],['tabAColor','--binder-tab-a','book-tab-a-color'],['tabBColor','--binder-tab-b','book-tab-b-color']]){const color=validColor(colors[key],defaults[key]);book.style.setProperty(css,color);document.documentElement.style.setProperty(css,color);$('#'+id).value=color;}}
  const textTargets=()=>[...document.querySelectorAll('.book-tabs > *, .cover-open-hint, .book-page .book-folio, .book-page h2, .book-page dt, .book-page dd, .book-page p, .book-page a')].filter(el=>!el.closest('.book-cat-grid'));
  function textKey(el){if(el.closest('.book-tabs'))return `tab-label:${[...el.parentElement.children].indexOf(el)}`;if(el.classList.contains('cover-open-hint'))return 'cover-hint';const side=el.closest('.book-left')?'left':'right';const page=el.closest('.book-page');return `${tab}:${side}:${[...page.querySelectorAll('.book-folio,h2,dt,dd,p,a')].indexOf(el)}`;}
  function applyTextOverrides(){textTargets().forEach(el=>{const override=data.textOverrides?.[textKey(el)];if(!override)return;if(typeof override.text==='string')el.textContent=override.text;el.style.fontSize=`${Math.max(10,Math.min(80,Number(override.size)||18))}px`;el.style.color=validColor(override.color,'#333333');el.style.translate=`${Math.max(-180,Math.min(180,Number(override.x)||0))}px ${Math.max(-180,Math.min(180,Number(override.y)||0))}px`;if(override.font&&override.font!=='inherit')el.style.fontFamily=fonts[override.font]||'';el.style.textAlign=['left','center','right'].includes(override.align)?override.align:'left';});}
  function photoKey(el){const page=el.closest('.book-left,.book-right');return `${tab}:${page?.classList.contains('book-left')?'left':'right'}:${[...page.querySelectorAll('img')].indexOf(el)}`;}
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
      const family=child.style.fontFamily||child.getAttribute('face');if(family&&['Caveat','Cormorant Garamond','Noto Sans SC','DM Mono'].some(f=>family.includes(f)))el.style.fontFamily=family;
      const oldSize=Number(child.getAttribute('size'));const size=oldSize>=1&&oldSize<=7?({1:12,2:15,3:18,4:21,5:26,6:32,7:40})[oldSize]:parseInt(child.style.fontSize,10);if(size>=12&&size<=48)el.style.fontSize=size+'px';
      normalize(child,el);target.append(el);
    })};
    const output=document.createElement('div');normalize(input.content,output);return output.innerHTML;
  }
  function style() { const value = data.style?.[tab] || {}; spread.style.setProperty('--book-font',fonts[value.font] || fonts.hand); spread.style.setProperty('--book-size',`${Math.max(14,Math.min(36,Number(value.size)||19))}px`); }
  function content() {
    const left = $('#book-left'), right = $('#book-right'); style();
    right.classList.toggle('notes-paper',tab==='thoughts');
    if (tab === 'profile') {
      const p = data.profile || {};
      left.innerHTML = `<span class="book-folio">01 / ABOUT</span><h2 class="book-profile-name">ABOUT ME</h2><dl class="book-profile">${[['NAME',p.name],['BIRTHDAY',p.birthDate],['MBTI',p.mbti],['FAVORITE FLOWER',p.favoriteFlower],['HOBBY',p.hobbies],['DREAM',p.dream]].map(([k,v])=>`<dt>${k}</dt><dd>${esc(v||' ')}</dd>`).join('')}</dl>`;
      right.innerHTML = `<span class="book-folio">PERSONAL NOTE</span>${p.image ? `<img class="book-portrait" src="${esc(p.image)}" alt="Profile portrait">` : '<div class="binder-photo-placeholder" aria-label="Photo space">PHOTO</div>'}<div class="book-profile-details"><p class="book-copy">${esc(p.message)}</p></div><a class="book-link" href="works.html" target="_top">VIEW MY WORKS →</a>`;
      left.style.setProperty('--profile-name-size',`${Math.max(18,Math.min(80,Number(p.nameSize)||52))}px`);
      left.style.setProperty('--profile-name-x',`${Math.max(-100,Math.min(100,Number(p.nameX)||0))}px`);
      left.style.setProperty('--profile-name-y',`${Math.max(-100,Math.min(100,Number(p.nameY)||0))}px`);
      right.style.setProperty('--profile-detail-size',`${Math.max(12,Math.min(36,Number(p.detailSize)||19))}px`);
      right.style.setProperty('--profile-detail-x',`${Math.max(-100,Math.min(100,Number(p.detailX)||0))}px`);
      right.style.setProperty('--profile-detail-y',`${Math.max(-100,Math.min(100,Number(p.detailY)||0))}px`);
    } else if (tab === 'cat') {
      left.innerHTML = `<span class="book-folio">02 / MY CAT</span><div class="book-cat-grid">${Array.from({length:6},(_,i)=>data.catPhotos?.[i] ? `<button type="button" class="book-cat-photo" data-photo="${i}" aria-label="Enlarge cat photo ${i+1}"><img src="${esc(data.catPhotos[i])}" alt="Cat photo ${i+1}"></button>` : `<div class="book-cat-empty">${String(i+1).padStart(2,'0')}</div>`).join('')}</div>`;
      right.innerHTML = `<span class="book-folio">ABOUT MY CAT</span><h2>MY CAT</h2><dl class="book-profile">${[['NAME',data.catDetails?.name],['BIRTHDAY',data.catDetails?.birthday],['PERSONALITY',data.catDetails?.personality],['LIKES',data.catDetails?.likes]].filter(([,v])=>v).map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl><p class="book-copy">${esc(data.catText)}</p><a class="book-link" href="tools.html" target="_top">VIEW MY CAT →</a>`;

    } else if (tab === 'contact') {
      left.innerHTML = '<span class="book-folio">03 / CONTACT</span><h2>CONTACT</h2><p class="book-copy">A little note, whenever you like.</p>';
      const ins=safeUrl(data.instagram), mail=data.email?.trim();
      right.innerHTML = `<span class="book-folio">FIND ME</span>${ins ? `<a class="book-contact" href="${esc(ins)}" target="_blank" rel="noopener noreferrer">◎ INSTAGRAM ↗</a>`:'<span class="book-contact">◎ INSTAGRAM</span>'}${mail ? `<a class="book-contact" href="mailto:${encodeURIComponent(mail)}">✉ ${esc(mail)} ↗</a>` : '<span class="book-contact">✉ EMAIL</span>'}`;
    } else if (tab === 'calendar') {
      const now=new Date(),year=now.getFullYear(),month=now.getMonth(),first=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate();
      const monthName=new Intl.DateTimeFormat('en-US',{month:'long'}).format(now).toUpperCase();
      const entryByDate=new Map(diaryItems.map(item=>[item.date,item]));
      left.innerHTML=`<span class="book-folio">04 / CALENDAR</span><div class="binder-calendar"><h2>${monthName} ${year}</h2><div class="binder-calendar-grid">${Array.from({length:first},()=>'<span></span>').join('')}${Array.from({length:days},(_,i)=>{const date=`${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`,item=entryByDate.get(date);return `<button type="button" data-calendar-date="${date}" aria-label="${date}${item?' with note':''}">${i+1}${item?.image||item?.images?.[0]?`<img src="${esc(item.image||item.images[0])}" alt="">`:''}${item?.text?`<span>${esc(item.text.slice(0,30))}</span>`:''}</button>`}).join('')}</div></div>`;
      right.innerHTML='<span class="book-folio">THIS MONTH</span><h2>Calendar</h2><p class="book-copy">A place for days worth remembering.</p><a class="book-link" href="diary.html" target="_top">OPEN FULL CALENDAR →</a>';
      left.querySelectorAll('[data-calendar-date]').forEach(button=>button.onclick=()=>{location.href='diary.html#'+button.dataset.calendarDate});
    } else {
      left.innerHTML = '<span class="book-folio">04 / WORDS</span><h2>MY WORDS</h2>';
      right.innerHTML = `<span class="book-folio">NOTES</span><p class="book-copy">${esc(data.thoughts)}</p>`;
    }
    if (data.pages?.[tab]) {left.innerHTML=sanitize(data.pages[tab].left);right.innerHTML=sanitize(data.pages[tab].right);}
    left.querySelectorAll('[data-photo]').forEach(button => button.onclick = () => {const d=$('#book-photo-dialog');d.querySelector('img').src=data.catPhotos[Number(button.dataset.photo)];d.showModal();});
    applyTextOverrides();
    applyPhotoOverrides();

  }
  const sections=['profile','cat','contact','calendar','thoughts'];
  $('#book-binding')?.remove();
  $('#about-book .binder-rings').innerHTML=Array.from({length:7},(_,i)=>`<div class="binder-ring" style="--ring-top:${11+i*13}%"><i class="ring-hole left"></i><i class="ring-hole right"></i><i class="ring-back"></i><i class="ring-front"></i></div>`).join('');
  function setMobileSide(side){mobileSide=side;book.dataset.mobileSide=side;$('#book-mobile-count').textContent=side==='left'?'1 / 2':'2 / 2';}
  function setThickness(){const index=sections.indexOf(tab);book.dataset.pageIndex=String(index);book.style.setProperty('--left-stack',`${2+index*2}px`);book.style.setProperty('--right-stack',`${11-index*2}px`);}
  function open(next='profile') {
    if (turning) return;
    if (book.classList.contains('is-closed')) {tab=next;content();book.classList.remove('is-closed');cover.setAttribute('aria-expanded','true');setMobileSide('left');setThickness();sync();return;}
    if(tab===next)return;
    turning=true;
    const leaf=$('#book-turn-leaf');leaf.querySelector('.turn-front').innerHTML=$('#book-right').innerHTML;
    leaf.querySelector('.turn-back').innerHTML='<span class="book-folio">'+esc(next.toUpperCase())+'</span>';
    book.classList.add('is-turning');
    setTimeout(()=>{tab=next;content();setThickness();setMobileSide('left');sync()},430);
    setTimeout(()=>{book.classList.remove('is-turning');turning=false;leaf.querySelector('.turn-front').replaceChildren();leaf.querySelector('.turn-back').replaceChildren()},840);
  }
  function sync() {document.querySelectorAll('[data-book-tab]').forEach(b=>b.classList.toggle('active',b.dataset.bookTab===tab&&!book.classList.contains('is-closed')));$('#book-close').hidden=book.classList.contains('is-closed');$('#book-edit').hidden=book.classList.contains('is-closed')||tab==='calendar'||!window.SUY_IS_ADMIN;$('#book-color-control').hidden=!window.SUY_IS_ADMIN;}
  $('#binder-palette-toggle').onclick=()=>{$('.binder-palette-fields').hidden=!$('.binder-palette-fields').hidden};
  for(const [id,key] of [['book-cover-color','coverColor'],['book-paper-color','paperColor'],['book-tab-a-color','tabAColor'],['book-tab-b-color','tabBColor']])$('#'+id).onchange=async e=>{if(!await window.SUY_ADMIN?.isAdmin())return;const previous=data[key];data[key]=validColor(e.target.value,defaults[key]);applyCoverColor();try{await window.SUY_ADMIN.saveContent('about-book',data)}catch(error){data[key]=previous;applyCoverColor();alert('Could not save book color: '+error.message)}};
  let selectedText=null;
  const textEditor=$('#book-text-editor');
  $('#book-text-close').onclick=()=>textEditor.close();
  document.addEventListener('dblclick',async e=>{const el=e.target.closest('.book-tabs > *, .cover-open-hint, .book-page .book-folio, .book-page h2, .book-page dt, .book-page dd, .book-page p, .book-page a');if(!el||!window.SUY_IS_ADMIN||!await window.SUY_ADMIN?.isAdmin())return;e.preventDefault();selectedText={key:textKey(el),el};const saved=data.textOverrides?.[selectedText.key]||{};$('#book-text-value').value=saved.text??el.textContent.trim();$('#book-text-size').value=saved.size||Math.round(parseFloat(getComputedStyle(el).fontSize));$('#book-text-color').value=validColor(saved.color||'#333333');$('#book-text-font').value=saved.font||'inherit';$('#book-text-align').value=saved.align||'left';$('#book-text-x').value=saved.x||0;$('#book-text-y').value=saved.y||0;['size','x','y'].forEach(k=>$('#book-text-'+k+'-output').textContent=$('#book-text-'+k).value+' px');$('#book-text-status').textContent='';textEditor.showModal();});
  ['size','x','y'].forEach(k=>{$('#book-text-'+k).oninput=()=>$('#book-text-'+k+'-output').textContent=$('#book-text-'+k).value+' px'});
  $('#book-text-form').onsubmit=async e=>{e.preventDefault();if(!selectedText)return;const status=$('#book-text-status');status.textContent='SAVING…';try{if(!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');const next=structuredClone(data);next.textOverrides={...(next.textOverrides||{}),[selectedText.key]:{text:$('#book-text-value').value,font:$('#book-text-font').value,align:$('#book-text-align').value,size:Number($('#book-text-size').value),color:validColor($('#book-text-color').value,'#333333'),x:Number($('#book-text-x').value),y:Number($('#book-text-y').value)}};await window.SUY_ADMIN.saveContent('about-book',next);data=next;applyTextOverrides();textEditor.close()}catch(error){status.textContent='SAVE FAILED: '+error.message}};
  let selectedPhoto=null;
  $('#book-image-close').onclick=()=>$('#book-image-editor').close();
  document.addEventListener('dblclick',async e=>{const el=e.target.closest('.book-page img');if(!el||!window.SUY_IS_ADMIN||!await window.SUY_ADMIN?.isAdmin())return;e.preventDefault();e.stopPropagation();selectedPhoto=photoKey(el);const saved=data.photoOverrides?.[selectedPhoto]||{};for(const key of ['scale','angle','x','y'])$('#book-image-'+key).value=saved[key]??(key==='scale'?100:0);$('#book-image-remove').checked=!!saved.removed;$('#book-image-file').value='';$('#book-image-status').textContent='';$('#book-image-editor').showModal();},true);
  $('#book-image-form').onsubmit=async e=>{e.preventDefault();if(!selectedPhoto)return;const status=$('#book-image-status');status.textContent='SAVING…';try{if(!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');const next=structuredClone(data),saved=next.photoOverrides?.[selectedPhoto]||{};const file=$('#book-image-file').files[0];const src=file?await window.SUY_ADMIN.uploadPublic(file,'about-book'):saved.src;next.photoOverrides={...(next.photoOverrides||{}),[selectedPhoto]:{src,scale:Number($('#book-image-scale').value),angle:Number($('#book-image-angle').value),x:Number($('#book-image-x').value),y:Number($('#book-image-y').value),removed:$('#book-image-remove').checked}};await window.SUY_ADMIN.saveContent('about-book',next);data=next;applyPhotoOverrides();$('#book-image-editor').close()}catch(error){status.textContent='SAVE FAILED: '+error.message}};
  cover.onclick=()=>open('profile');
  document.querySelectorAll('[data-book-tab]').forEach(b=>b.onclick=()=>open(b.dataset.bookTab));
  $('#book-close').onclick=()=>{book.classList.add('is-closed');cover.setAttribute('aria-expanded','false');sync();};
  $('#book-page-corner').onclick=()=>{if(!turning)open(sections[(sections.indexOf(tab)+1)%sections.length])};
  $('#book-mobile-prev').onclick=()=>{if(mobileSide==='right')setMobileSide('left');else open(sections[(sections.indexOf(tab)+sections.length-1)%sections.length])};
  $('#book-mobile-next').onclick=()=>{if(mobileSide==='left')setMobileSide('right');else open(sections[(sections.indexOf(tab)+1)%sections.length])};
  let dragStart=0,dragged=false;
  const corner=$('#book-page-corner');
  corner.onpointerdown=e=>{if(turning)return;dragStart=e.clientX;dragged=false;corner.setPointerCapture(e.pointerId)};
  corner.onpointermove=e=>{if(!corner.hasPointerCapture(e.pointerId)||!dragStart)return;const distance=Math.max(0,dragStart-e.clientX);if(distance<5)return;dragged=true;const degree=Math.min(175,distance/Math.max(100,book.clientWidth*.45)*180);const leaf=$('#book-turn-leaf');leaf.querySelector('.turn-front').innerHTML=$('#book-right').innerHTML;leaf.style.opacity='1';leaf.style.transform=`rotateY(${-degree}deg)`};
  corner.onpointerup=e=>{if(!dragStart)return;const distance=dragStart-e.clientX;dragStart=0;const leaf=$('#book-turn-leaf');leaf.style.opacity='';leaf.style.transform='';if(distance>book.clientWidth*.22){corner.onclick=null;open(sections[(sections.indexOf(tab)+1)%sections.length]);setTimeout(()=>corner.onclick=()=>open(sections[(sections.indexOf(tab)+1)%sections.length]),150)}else leaf.querySelector('.turn-front').replaceChildren();};
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
  function seedLayout(){const stored=data.pages?.[tab];$('#layout-left').innerHTML=stored?sanitize(stored.left):sanitize($('#book-left').innerHTML);$('#layout-right').innerHTML=stored?sanitize(stored.right):sanitize($('#book-right').innerHTML);}
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
    if(tab==='cat') return `${[['name','NAME'],['birthday','BIRTHDAY'],['personality','PERSONALITY'],['likes','LIKES']].map(([k,v])=>`<label>${v}<input name="catDetail-${k}" value="${esc(data.catDetails?.[k])}"></label>`).join('')}<label>ABOUT MY CAT<textarea name="catText">${esc(data.catText)}</textarea></label><p>Six landscape photos · replace each separately</p>${Array.from({length:6},(_,i)=>`<label>PHOTO ${i+1}${data.catPhotos?.[i]?` <img class="book-editor-thumb" src="${esc(data.catPhotos[i])}" alt="Current photo">`:''}<input name="cat${i}" type="file" accept="image/*"><input type="checkbox" name="remove${i}"> Remove this photo</label>`).join('')}`;
    if(tab==='contact') return `<label>INSTAGRAM URL<input name="instagram" type="url" value="${esc(data.instagram)}" placeholder="https://instagram.com/..."></label><label>EMAIL<input name="email" type="email" value="${esc(data.email)}"></label>`;
    return `<label>WORDS<textarea name="thoughts">${esc(data.thoughts)}</textarea></label>`;
  }
  $('#book-edit').onclick=async()=>{if(!await window.SUY_ADMIN?.isAdmin())return;$('#book-editor-heading').textContent='EDIT · '+document.querySelector(`[data-book-tab="${tab}"]`).textContent;$('#book-editor-fields').innerHTML=fields();seedLayout();setMode(data.pages?.[tab]?'layout':'content');const st=data.style?.[tab]||{};$('#book-font').value=fonts[st.font]?st.font:'hand';$('#book-size').value=st.size||19;$('#book-size-output').textContent=$('#book-size').value+' px';$('#book-status').textContent='';editor.showModal();};
  $('#book-form').onsubmit=async e=>{
    e.preventDefault();const status=$('#book-status');status.textContent='SAVING…';
    try {if(!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');const form=new FormData(e.target);const next=structuredClone(data);next.style={...(next.style||{}),[tab]:{font:$('#book-font').value,size:Number($('#book-size').value)}};
      if(tab==='profile'){next.profile={...next.profile};for(const key of ['name','birthDate','mbti','favoriteFlower','hobbies','dream','message'])next.profile[key]=String(form.get(key)||'');for(const [key,min,max] of [['nameSize',18,80],['nameX',-100,100],['nameY',-100,100],['detailSize',12,36],['detailX',-100,100],['detailY',-100,100]])next.profile[key]=Math.max(min,Math.min(max,Number(form.get(key))||0));const file=form.get('portrait');if(file?.size)next.profile.image=await window.SUY_ADMIN.uploadPublic(file,'about');legacy={...(legacy||{}),personal:next.profile};await window.SUY_ADMIN.saveContent('about-interactive',legacy);}
      if(tab==='cat'){next.catText=String(form.get('catText')||'');next.catDetails=Object.fromEntries(['name','birthday','personality','likes'].map(k=>[k,String(form.get('catDetail-'+k)||'')]));next.catPhotos=[...(next.catPhotos||[])];for(let i=0;i<6;i++){if(form.get(`remove${i}`))next.catPhotos[i]='';const file=form.get(`cat${i}`);if(file?.size)next.catPhotos[i]=await window.SUY_ADMIN.uploadPublic(file,'about-cat');}}
      if(tab==='contact'){next.instagram=safeUrl(form.get('instagram'));next.email=String(form.get('email')||'').trim();}
      if(tab==='thoughts')next.thoughts=String(form.get('thoughts')||'');
      if(editMode==='layout'){next.pages={...(next.pages||{})};const left=sanitize($('#layout-left').innerHTML),right=sanitize($('#layout-right').innerHTML);if(left.trim()||right.trim())next.pages[tab]={left,right};else delete next.pages[tab];}
      await window.SUY_ADMIN.saveContent('about-book',next);data=next;content();editor.close();
    }catch(error){status.textContent='SAVE FAILED: '+error.message;}
  };
  setMobileSide('left');content();setThickness();sync();
  (async()=>{try{if(window.SUY_SITE_READY)await window.SUY_SITE_READY;const api=window.SUY_ADMIN;const [old,saved,diary]=await Promise.all([api.loadContent('about-interactive'),api.loadContent('about-book'),api.loadContent('diary')]);legacy=old||{};diaryItems=Array.isArray(diary?.items)?diary.items:[];data={...structuredClone(defaults),...saved,profile:{...defaults.profile,...legacy.personal,...saved?.profile}};applyCoverColor();content();sync();}catch(error){console.warn('About content unavailable',error);}})();
})();

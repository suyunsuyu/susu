(() => {
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => { if(!String(value||'').trim())return ''; try { const u = new URL(value,location.href); return ['https:','http:','mailto:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const defaults = {catText:'',catPhotos:[],instagram:'',email:'',thoughts:'',profile:{name:'',birthDate:'',mbti:'',favoriteFlower:'',hobbies:'',dream:'',message:'',image:''},style:{},pages:{}};
  const fonts = {hand:"'Caveat','Nanum Pen Script',cursive",serif:"'Cormorant Garamond','Noto Sans SC',serif",sans:"'Noto Sans SC',sans-serif",mono:"'DM Mono','Noto Sans SC',monospace"};
  let data = structuredClone(defaults), legacy = null, tab = '', turning = false, editMode = 'content', activeEditable = null;
  const book = $('#about-book'), cover = $('#book-cover'), spread = $('#book-spread');
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
    if (tab === 'profile') {
      const p = data.profile || {};
      left.innerHTML = `<span class="book-folio">01 / ABOUT ME</span>${p.image ? `<img class="book-portrait" src="${esc(p.image)}" alt="Profile portrait">` : '<div class="book-portrait-empty">ABOUT<br>ME</div>'}<h2>${esc(p.name || 'ABOUT ME')}</h2>`;
      right.innerHTML = `<span class="book-folio">PROFILE</span><dl class="book-profile">${[['BIRTHDAY',p.birthDate],['MBTI',p.mbti],['FAVORITE FLOWER',p.favoriteFlower],['HOBBIES',p.hobbies],['DREAM',p.dream]].filter(x=>x[1]).map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl><p class="book-copy">${esc(p.message)}</p>`;
    } else if (tab === 'cat') {
      left.innerHTML = `<span class="book-folio">02 / MY CAT</span><div class="book-cat-grid">${Array.from({length:6},(_,i)=>data.catPhotos?.[i] ? `<button type="button" class="book-cat-photo" data-photo="${i}" aria-label="Enlarge cat photo ${i+1}"><img src="${esc(data.catPhotos[i])}" alt="Cat photo ${i+1}"></button>` : `<div class="book-cat-empty">${String(i+1).padStart(2,'0')}</div>`).join('')}</div>`;
      right.innerHTML = `<span class="book-folio">ABOUT MY CAT</span><h2>MY CAT</h2><p class="book-copy">${esc(data.catText)}</p><a class="book-link" href="tools.html" target="_top">VISIT MY CAT ↗</a>`;

    } else if (tab === 'contact') {
      left.innerHTML = '<span class="book-folio">03 / CONTACT</span><h2>CONTACT</h2><div class="book-ins">◎</div>';
      const ins=safeUrl(data.instagram), mail=data.email?.trim();
      right.innerHTML = `<span class="book-folio">FIND ME</span>${ins ? `<a class="book-contact" href="${esc(ins)}" target="_blank" rel="noopener noreferrer">◎ INSTAGRAM ↗</a>`:'<span class="book-contact">◎ INSTAGRAM</span>'}${mail ? `<a class="book-contact" href="mailto:${encodeURIComponent(mail)}">✉ ${esc(mail)} ↗</a>` : '<span class="book-contact">✉ EMAIL</span>'}`;
    } else {
      left.innerHTML = '<span class="book-folio">04 / WORDS</span><h2>MY WORDS</h2>';
      right.innerHTML = `<span class="book-folio">NOTES</span><p class="book-copy">${esc(data.thoughts)}</p>`;
    }
    if (data.pages?.[tab]) {left.innerHTML=sanitize(data.pages[tab].left);right.innerHTML=sanitize(data.pages[tab].right);}
    left.querySelectorAll('[data-photo]').forEach(button => button.onclick = () => {const d=$('#book-photo-dialog');d.querySelector('img').src=data.catPhotos[Number(button.dataset.photo)];d.showModal();});

  }
  function open(next='profile') {
    if (turning) return;
    if (book.classList.contains('is-closed')) { tab=next; content(); spread.hidden=false; book.classList.remove('is-closed'); book.classList.add('is-opening'); cover.setAttribute('aria-expanded','true'); setTimeout(()=>book.classList.remove('is-opening'),520); }
    else if(tab!==next) { turning=true; book.classList.add('is-turning'); setTimeout(()=>{tab=next;content();book.classList.remove('is-turning');turning=false;},250); }
    sync();
  }
  function sync() {document.querySelectorAll('[data-book-tab]').forEach(b=>b.classList.toggle('active',b.dataset.bookTab===tab&&!book.classList.contains('is-closed')));$('#book-close').hidden=book.classList.contains('is-closed');$('#book-edit').hidden=book.classList.contains('is-closed')||!window.SUY_IS_ADMIN;}
  cover.onclick=()=>open('profile');
  document.querySelectorAll('[data-book-tab]').forEach(b=>b.onclick=()=>open(b.dataset.bookTab));
  $('#book-close').onclick=()=>{book.classList.add('is-closed');spread.hidden=true;cover.setAttribute('aria-expanded','false');sync();};
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
    if(tab==='profile') return `<label>NAME<input name="name" value="${esc(p.name)}"></label><label>BIRTHDAY<input name="birthDate" type="date" value="${esc(p.birthDate)}"></label><label>MBTI<input name="mbti" value="${esc(p.mbti)}"></label><label>FAVORITE FLOWER<input name="favoriteFlower" value="${esc(p.favoriteFlower)}"></label><label>HOBBIES<input name="hobbies" value="${esc(p.hobbies)}"></label><label>DREAM<input name="dream" value="${esc(p.dream)}"></label><label>PHOTO<input name="portrait" type="file" accept="image/*"></label><label>PERSONAL WORDS<textarea name="message">${esc(p.message)}</textarea></label>`;
    if(tab==='cat') return `<label>ABOUT MY CAT<textarea name="catText">${esc(data.catText)}</textarea></label><p>Six landscape photos · replace each separately</p>${Array.from({length:6},(_,i)=>`<label>PHOTO ${i+1}${data.catPhotos?.[i]?` <img class="book-editor-thumb" src="${esc(data.catPhotos[i])}" alt="Current photo">`:''}<input name="cat${i}" type="file" accept="image/*"><input type="checkbox" name="remove${i}"> Remove this photo</label>`).join('')}`;
    if(tab==='contact') return `<label>INSTAGRAM URL<input name="instagram" type="url" value="${esc(data.instagram)}" placeholder="https://instagram.com/..."></label><label>EMAIL<input name="email" type="email" value="${esc(data.email)}"></label>`;
    return `<label>WORDS<textarea name="thoughts">${esc(data.thoughts)}</textarea></label>`;
  }
  $('#book-edit').onclick=async()=>{if(!await window.SUY_ADMIN?.isAdmin())return;$('#book-editor-heading').textContent='EDIT · '+document.querySelector(`[data-book-tab="${tab}"]`).textContent;$('#book-editor-fields').innerHTML=fields();seedLayout();setMode(data.pages?.[tab]?'layout':'content');const st=data.style?.[tab]||{};$('#book-font').value=fonts[st.font]?st.font:'hand';$('#book-size').value=st.size||19;$('#book-size-output').textContent=$('#book-size').value+' px';$('#book-status').textContent='';editor.showModal();};
  $('#book-form').onsubmit=async e=>{
    e.preventDefault();const status=$('#book-status');status.textContent='SAVING…';
    try {if(!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');const form=new FormData(e.target);const next=structuredClone(data);next.style={...(next.style||{}),[tab]:{font:$('#book-font').value,size:Number($('#book-size').value)}};
      if(tab==='profile'){next.profile={...next.profile};for(const key of ['name','birthDate','mbti','favoriteFlower','hobbies','dream','message'])next.profile[key]=String(form.get(key)||'');const file=form.get('portrait');if(file?.size)next.profile.image=await window.SUY_ADMIN.uploadPublic(file,'about');legacy={...(legacy||{}),personal:next.profile};await window.SUY_ADMIN.saveContent('about-interactive',legacy);}
      if(tab==='cat'){next.catText=String(form.get('catText')||'');next.catPhotos=[...(next.catPhotos||[])];for(let i=0;i<6;i++){if(form.get(`remove${i}`))next.catPhotos[i]='';const file=form.get(`cat${i}`);if(file?.size)next.catPhotos[i]=await window.SUY_ADMIN.uploadPublic(file,'about-cat');}}
      if(tab==='contact'){next.instagram=safeUrl(form.get('instagram'));next.email=String(form.get('email')||'').trim();}
      if(tab==='thoughts')next.thoughts=String(form.get('thoughts')||'');
      if(editMode==='layout'){next.pages={...(next.pages||{})};const left=sanitize($('#layout-left').innerHTML),right=sanitize($('#layout-right').innerHTML);if(left.trim()||right.trim())next.pages[tab]={left,right};else delete next.pages[tab];}
      await window.SUY_ADMIN.saveContent('about-book',next);data=next;content();editor.close();
    }catch(error){status.textContent='SAVE FAILED: '+error.message;}
  };
  (async()=>{try{if(window.SUY_SITE_READY)await window.SUY_SITE_READY;const api=window.SUY_ADMIN;legacy=await api.loadContent('about-interactive')||{};const saved=await api.loadContent('about-book');data={...structuredClone(defaults),...saved,profile:{...defaults.profile,...legacy.personal,...saved?.profile}};sync();}catch(error){console.warn('About content unavailable',error);}})();
})();

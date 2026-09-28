(() => {
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => { try { const u = new URL(value); return ['https:','http:','mailto:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const defaults = {catText:'',catPhotos:[],instagram:'',email:'',thoughts:'',profile:{name:'',birthDate:'',mbti:'',favoriteFlower:'',hobbies:'',dream:'',message:'',image:''},style:{}};
  const fonts = {hand:"'Caveat','Nanum Pen Script',cursive",serif:"'Cormorant Garamond','Noto Sans SC',serif",sans:"'Noto Sans SC',sans-serif",mono:"'DM Mono','Noto Sans SC',monospace"};
  let data = structuredClone(defaults), legacy = null, tab = '', turning = false;
  const book = $('#about-book'), cover = $('#book-cover'), spread = $('#book-spread');
  function style() { const value = data.style?.[tab] || {}; spread.style.setProperty('--book-font',fonts[value.font] || fonts.hand); spread.style.setProperty('--book-size',`${Math.max(14,Math.min(36,Number(value.size)||19))}px`); }
  function content() {
    const left = $('#book-left'), right = $('#book-right'); style();
    if (tab === 'profile') {
      const p = data.profile || {};
      left.innerHTML = `<span class="book-folio">01 / ABOUT ME</span>${p.image ? `<img class="book-portrait" src="${esc(p.image)}" alt="Profile portrait">` : '<div class="book-portrait-empty">ABOUT<br>ME</div>'}<h2>${esc(p.name || '关于我')}</h2>`;
      right.innerHTML = `<span class="book-folio">PROFILE</span><dl class="book-profile">${[['BIRTHDAY',p.birthDate],['MBTI',p.mbti],['FAVORITE FLOWER',p.favoriteFlower],['HOBBIES',p.hobbies],['DREAM',p.dream]].filter(x=>x[1]).map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl><p class="book-copy">${esc(p.message)}</p>`;
    } else if (tab === 'cat') {
      left.innerHTML = `<span class="book-folio">02 / MY CAT</span><div class="book-cat-grid">${Array.from({length:6},(_,i)=>data.catPhotos?.[i] ? `<button type="button" class="book-cat-photo" data-photo="${i}" aria-label="Enlarge cat photo ${i+1}"><img src="${esc(data.catPhotos[i])}" alt="Cat photo ${i+1}"></button>` : `<div class="book-cat-empty">${String(i+1).padStart(2,'0')}</div>`).join('')}</div>`;
      right.innerHTML = `<span class="book-folio">ABOUT MY CAT</span><h2>关于我的猫</h2><p class="book-copy">${esc(data.catText)}</p><a class="book-link" href="tools.html" target="_top">去我的猫页面 ↗</a>`;
      left.querySelectorAll('[data-photo]').forEach(button => button.onclick = () => {const d=$('#book-photo-dialog');d.querySelector('img').src=data.catPhotos[Number(button.dataset.photo)];d.showModal();});
    } else if (tab === 'contact') {
      left.innerHTML = '<span class="book-folio">03 / CONTACT</span><h2>联系我</h2><div class="book-ins">◎</div>';
      const ins=safeUrl(data.instagram), mail=data.email?.trim();
      right.innerHTML = `<span class="book-folio">FIND ME</span>${ins ? `<a class="book-contact" href="${esc(ins)}" target="_blank" rel="noopener noreferrer">◎ INSTAGRAM ↗</a>`:'<span class="book-contact">◎ INSTAGRAM</span>'}${mail ? `<a class="book-contact" href="mailto:${encodeURIComponent(mail)}">✉ ${esc(mail)} ↗</a>` : '<span class="book-contact">✉ EMAIL</span>'}`;
    } else {
      left.innerHTML = '<span class="book-folio">04 / WORDS</span><h2>一些我想说的话</h2>';
      right.innerHTML = `<span class="book-folio">NOTES</span><p class="book-copy">${esc(data.thoughts)}</p>`;
    }
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
  $('#book-size').oninput=()=>$('#book-size-output').textContent=$('#book-size').value+' px';
  function fields() {
    const p=data.profile||{};
    if(tab==='profile') return `<label>NAME<input name="name" value="${esc(p.name)}"></label><label>BIRTHDAY<input name="birthDate" type="date" value="${esc(p.birthDate)}"></label><label>MBTI<input name="mbti" value="${esc(p.mbti)}"></label><label>FAVORITE FLOWER<input name="favoriteFlower" value="${esc(p.favoriteFlower)}"></label><label>HOBBIES<input name="hobbies" value="${esc(p.hobbies)}"></label><label>DREAM<input name="dream" value="${esc(p.dream)}"></label><label>PHOTO<input name="portrait" type="file" accept="image/*"></label><label>PERSONAL WORDS<textarea name="message">${esc(p.message)}</textarea></label>`;
    if(tab==='cat') return `<label>ABOUT MY CAT<textarea name="catText">${esc(data.catText)}</textarea></label><p>六张长方形照片 · 可逐张替换</p>${Array.from({length:6},(_,i)=>`<label>PHOTO ${i+1}${data.catPhotos?.[i]?` <img class="book-editor-thumb" src="${esc(data.catPhotos[i])}" alt="Current photo">`:''}<input name="cat${i}" type="file" accept="image/*"><input type="checkbox" name="remove${i}"> 删除此照片</label>`).join('')}`;
    if(tab==='contact') return `<label>INSTAGRAM URL<input name="instagram" type="url" value="${esc(data.instagram)}" placeholder="https://instagram.com/..."></label><label>EMAIL<input name="email" type="email" value="${esc(data.email)}"></label>`;
    return `<label>WORDS<textarea name="thoughts">${esc(data.thoughts)}</textarea></label>`;
  }
  $('#book-edit').onclick=async()=>{if(!await window.SUY_ADMIN?.isAdmin())return;$('#book-editor-heading').textContent='EDIT · '+document.querySelector(`[data-book-tab="${tab}"]`).textContent;$('#book-editor-fields').innerHTML=fields();const st=data.style?.[tab]||{};$('#book-font').value=fonts[st.font]?st.font:'hand';$('#book-size').value=st.size||19;$('#book-size-output').textContent=$('#book-size').value+' px';$('#book-status').textContent='';editor.showModal();};
  $('#book-form').onsubmit=async e=>{
    e.preventDefault();const status=$('#book-status');status.textContent='SAVING…';
    try {if(!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');const form=new FormData(e.target);const next=structuredClone(data);next.style={...(next.style||{}),[tab]:{font:$('#book-font').value,size:Number($('#book-size').value)}};
      if(tab==='profile'){next.profile={...next.profile};for(const key of ['name','birthDate','mbti','favoriteFlower','hobbies','dream','message'])next.profile[key]=String(form.get(key)||'');const file=form.get('portrait');if(file?.size)next.profile.image=await window.SUY_ADMIN.uploadPublic(file,'about');legacy={...(legacy||{}),personal:next.profile};await window.SUY_ADMIN.saveContent('about-interactive',legacy);}
      if(tab==='cat'){next.catText=String(form.get('catText')||'');next.catPhotos=[...(next.catPhotos||[])];for(let i=0;i<6;i++){if(form.get(`remove${i}`))next.catPhotos[i]='';const file=form.get(`cat${i}`);if(file?.size)next.catPhotos[i]=await window.SUY_ADMIN.uploadPublic(file,'about-cat');}}
      if(tab==='contact'){next.instagram=safeUrl(form.get('instagram'));next.email=String(form.get('email')||'').trim();}
      if(tab==='thoughts')next.thoughts=String(form.get('thoughts')||'');
      await window.SUY_ADMIN.saveContent('about-book',next);data=next;content();editor.close();
    }catch(error){status.textContent='SAVE FAILED: '+error.message;}
  };
  (async()=>{try{if(window.SUY_SITE_READY)await window.SUY_SITE_READY;const api=window.SUY_ADMIN;legacy=await api.loadContent('about-interactive')||{};const saved=await api.loadContent('about-book');data={...structuredClone(defaults),...saved,profile:{...defaults.profile,...legacy.personal,...saved?.profile}};sync();}catch(error){console.warn('About content unavailable',error);}})();
})();

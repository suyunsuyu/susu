(() => {
  'use strict';
  const clock=document.querySelector('#work-clock');
  const tick=()=>{const now=new Date();clock.dateTime=now.toISOString();clock.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);};
  tick();setInterval(tick,1000);
  document.querySelector('#work-email').onclick=e=>{const link=document.querySelector('#work-email-address');link.hidden=!link.hidden;e.currentTarget.setAttribute('aria-expanded',String(!link.hidden));};
  const albums=[...document.querySelectorAll('[data-album]')].map(el=>({el,key:el.dataset.album,photos:JSON.parse(el.dataset.photos),index:0,img:el.querySelector('img')}));
  const show=(album,index)=>{
    album.index=(index+album.photos.length)%album.photos.length;
    album.img.src=album.photos[album.index];album.img.alt=`Project ${album.key.toUpperCase()}, photograph ${album.index+1}`;
    album.el.querySelectorAll('[data-photo]').forEach((b,i)=>{if(i===album.index)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});
  };
  albums.forEach(a=>{
    a.el.querySelector('.work-photo').onclick=()=>{if(window.SUY_IS_ADMIN){clearTimeout(a.clickTimer);a.clickTimer=setTimeout(()=>show(a,a.index+1),300);}else show(a,a.index+1);};
    a.el.querySelector('.work-photo').onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();show(a,a.index+(e.key==='ArrowRight'?1:-1));}};
    a.el.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>show(a,Number(b.dataset.photo)));
  });
  const nav=[...document.querySelectorAll('.work-index a')];
  const updateNav=()=>{const current=location.hash||'#information';nav.forEach(a=>{if(a.getAttribute('href')===current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});};
  updateNav();addEventListener('hashchange',updateNav);
  const texts=[...document.querySelectorAll('[data-work-text]')],status=document.querySelector('#work-status'),editor=document.querySelector('#work-editor'),input=document.querySelector('#work-edit-text'),fileInput=document.querySelector('#work-photo-file');
  let ready=false,payload={},activeText=null,activeAlbum=null;
  texts.forEach(el=>el.ondblclick=()=>{if(!ready||!window.SUY_IS_ADMIN)return;activeText=el;input.value=el.textContent;editor.showModal();input.focus();});
  document.querySelector('#work-edit-cancel').onclick=()=>editor.close();
  document.querySelector('#work-edit-form').onsubmit=e=>{e.preventDefault();if(!window.SUY_IS_ADMIN||!activeText)return;activeText.textContent=input.value;if(activeText.classList.contains('work-description'))activeText.hidden=!input.value.trim();editor.close();status.textContent='Unsaved changes · click SAVE PAGE';};
  albums.forEach(a=>a.img.ondblclick=e=>{if(!ready||!window.SUY_IS_ADMIN)return;e.preventDefault();clearTimeout(a.clickTimer);activeAlbum=a;fileInput.value='';fileInput.click();});
  fileInput.onchange=async()=>{
    const file=fileInput.files[0];if(!file||!activeAlbum)return;
    const target=activeAlbum,index=target.index;
    try{if(!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choose a JPG, PNG or WebP image under 10 MB.');status.textContent='Uploading…';target.photos[index]=await window.SUY_ADMIN.uploadPublic(file,'work-cargo');show(target,index);status.textContent='Image uploaded · click SAVE PAGE';}catch(e){status.textContent=e.message;}
  };
  document.querySelector('#work-save').onclick=async e=>{
    if(!ready)return;const button=e.currentTarget;button.disabled=true;
    try{if(!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');const next={...payload,texts:{},albums:{}};texts.forEach(el=>next.texts[el.dataset.workText]=el.textContent);albums.forEach(a=>next.albums[a.key]=a.photos);status.textContent='Saving…';await window.SUY_ADMIN.saveContent('work-cargo-portfolio',next);payload=next;status.textContent='Saved';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}
  };
  (async()=>{
    try{
      if(window.SUY_SITE_READY)await window.SUY_SITE_READY;
      if(!window.SUY_ADMIN)throw Error('Page editing unavailable');
      payload=await window.SUY_ADMIN.loadContent('work-cargo-portfolio')||{};
      texts.forEach(el=>{const value=payload.texts?.[el.dataset.workText];if(typeof value==='string'){el.textContent=value;if(el.classList.contains('work-description'))el.hidden=!value.trim();}});
      albums.forEach(a=>{const saved=payload.albums?.[a.key];if(Array.isArray(saved)&&saved.length===a.photos.length){a.photos=a.photos.map((src,i)=>typeof saved[i]==='string'&&(/^https:\/\//i.test(saved[i])||/^assets\/work-cargo\/[a-e]-0[1-3]\.jpg$/.test(saved[i]))?saved[i]:src);show(a,0);}});
      ready=true;if(window.SUY_IS_ADMIN)status.textContent='Double-click text or a photo to edit';
    }catch(e){status.textContent='Could not load saved edits. Refresh before editing.';console.warn('Work page edits unavailable',e);}
  })();
})();

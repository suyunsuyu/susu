(() => {
  'use strict';
  const gallery=document.querySelector('#journal-gallery'),entries=[...document.querySelectorAll('.journal-entry')],buttons=[...document.querySelectorAll('[data-jump]')],reduced=matchMedia('(prefers-reduced-motion: reduce)'),desktop=matchMedia('(min-width:701px)');
  const clamp=n=>Math.min(1,Math.max(0,n));let scheduled=false,lastActive=-1;
  function update(){
    scheduled=false;const root=desktop.matches?gallery.getBoundingClientRect():{top:0,height:innerHeight};const height=desktop.matches?gallery.clientHeight:innerHeight,probe=root.top+height*.42;
    let active=0;entries.forEach((entry,i)=>{const r=entry.getBoundingClientRect();if(r.top<=probe)active=i;const progress=clamp((probe-r.top)/Math.max(1,r.height));const meter=buttons[i].querySelector('.gallery-meter');meter.style.setProperty('--read',progress);meter.setAttribute('aria-valuenow',String(Math.round(progress*100)));buttons[i].classList.toggle('is-read',progress>=1);});
    const atEnd=desktop.matches?gallery.scrollHeight-gallery.clientHeight-gallery.scrollTop<3:document.documentElement.scrollHeight-innerHeight-scrollY<3;
    if(atEnd){active=entries.length-1;buttons.at(-1).querySelector('.gallery-meter').style.setProperty('--read',1);buttons.at(-1).querySelector('.gallery-meter').setAttribute('aria-valuenow','100');}
    if(active!==lastActive){buttons.forEach((b,i)=>{if(i===active)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});document.querySelector('#journal-position').textContent=String(active+1).padStart(2,'0')+' / '+entries.length;lastActive=active;}
  }
  function requestUpdate(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  function jump(id){const target=document.getElementById(id);if(!target||!target.classList.contains('journal-entry'))return;const behavior=reduced.matches?'auto':'smooth';if(desktop.matches){gallery.scrollTo({top:gallery.scrollTop+target.getBoundingClientRect().top-gallery.getBoundingClientRect().top-18,behavior});}else target.scrollIntoView({behavior,block:'start'});}
  buttons.forEach(b=>b.onclick=()=>{jump(b.dataset.jump);history.replaceState(null,'','#'+b.dataset.jump);});
  document.querySelector('#journal-back-top').onclick=()=>jump(entries[0].id);
  gallery.addEventListener('scroll',requestUpdate,{passive:true});addEventListener('scroll',requestUpdate,{passive:true});addEventListener('resize',requestUpdate,{passive:true});
  const observer=new IntersectionObserver(changes=>changes.forEach(change=>{if(change.isIntersecting)change.target.classList.add('is-visible');}),{root:desktop.matches?gallery:null,threshold:.15});
  if(!reduced.matches)document.documentElement.classList.add('journal-motion');document.querySelectorAll('[data-reveal]').forEach(el=>observer.observe(el));
  desktop.addEventListener('change',()=>{observer.disconnect();document.querySelectorAll('[data-reveal]').forEach(el=>el.classList.add('is-visible'));requestUpdate();});
  const clock=document.querySelector('#journal-clock'),format=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});const tick=()=>{const now=new Date();clock.textContent=format.format(now);clock.dateTime=now.toISOString();};tick();setInterval(tick,1000);
  const dialog=document.querySelector('#journal-photo-dialog'),large=document.querySelector('#journal-photo-large');
  document.querySelectorAll('.journal-art').forEach(b=>{let timer;b.addEventListener('click',()=>{if(window.SUY_IS_ADMIN){clearTimeout(timer);timer=setTimeout(()=>openPhoto(b),320);}else openPhoto(b);});b.addEventListener('dblclick',e=>{if(!window.SUY_IS_ADMIN)return;clearTimeout(timer);e.preventDefault();pickImage(b.querySelector('img'));});});
  function openPhoto(button){const img=button.querySelector('img');large.src=img.src;large.alt=img.alt;dialog.showModal();}
  document.querySelector('#journal-photo-close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  const imageNodes=[...document.querySelectorAll('[data-journal-image]')],file=document.querySelector('#journal-upload'),status=document.querySelector('#journal-admin-status');let imageData={},imagesReady=false,selected=null;
  const safeImage=v=>typeof v==='string'&&/^https:\/\//i.test(v);
  async function pickImage(img){if(!imagesReady||!await window.SUY_ADMIN?.isAdmin())return;selected=img;file.value='';file.click();}
  imageNodes.filter(img=>!img.closest('.journal-art')).forEach(img=>img.addEventListener('dblclick',()=>pickImage(img)));
  document.querySelector('#journal-replace-image').onclick=()=>{const current=entries[Math.max(0,lastActive)].querySelector('img');pickImage(current);};
  file.onchange=async()=>{
    const input=file.files[0],target=selected;if(!input||!target)return;
    try{if(!imagesReady||!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');if(!['image/png','image/jpeg','image/webp'].includes(input.type)||input.size>10*1024*1024)throw Error('Choose a PNG, JPG or WebP image under 10 MB.');status.textContent='Uploading…';const url=await window.SUY_ADMIN.uploadPublic(input,'umi-journal');const latest=await window.SUY_ADMIN.loadContent('umi-journal-images')||{};const next={...latest,...imageData,images:{...latest.images,...imageData.images,[target.dataset.journalImage]:url}};await window.SUY_ADMIN.saveContent('umi-journal-images',next);imageData=next;target.src=url;status.textContent='Image saved';}catch(error){status.textContent=error.message;}
  };
  window.SUY_JOURNAL_READY=(async()=>{try{if(window.SUY_SITE_READY)await window.SUY_SITE_READY;imageData=await window.SUY_ADMIN.loadContent('umi-journal-images')||{};imageNodes.forEach(img=>{const saved=imageData.images?.[img.dataset.journalImage];if(safeImage(saved))img.src=saved;});imagesReady=true;}catch(error){status.textContent='Could not load saved images. Refresh before editing.';console.warn('Journal image settings unavailable',error);}})();
  imageNodes.forEach(img=>img.addEventListener('load',requestUpdate));addEventListener('load',()=>{if(/^#journal-[a-z-]+$/.test(location.hash))jump(location.hash.slice(1));requestUpdate();});update();
})();

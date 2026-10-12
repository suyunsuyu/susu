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
  function bindAlbum(a){
    a.el.querySelector('.work-photo').onclick=()=>{if(window.SUY_IS_ADMIN){clearTimeout(a.clickTimer);a.clickTimer=setTimeout(()=>show(a,a.index+1),300);}else show(a,a.index+1);};
    a.el.querySelector('.work-photo').onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();show(a,a.index+(e.key==='ArrowRight'?1:-1));}};
    a.el.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>show(a,Number(b.dataset.photo)));
  }
  albums.forEach(bindAlbum);
  const updateNav=()=>{const current=location.hash||'#information';document.querySelectorAll('.work-index a').forEach(a=>{if(a.getAttribute('href')===current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});};
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
  const safeURL=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
  function renderProject(p,index){
    if(!p||!/^p-[a-z\d-]{6,70}$/i.test(p.id))return;
    p={...p,title:payload.texts?.[p.id+'-title']??p.title};
    const section=document.createElement('section');section.className='work-project';section.id='project-'+p.id;section.setAttribute('aria-label','Project '+p.title);
    const number=document.createElement('span');number.className='work-number';number.textContent=String(index+6).padStart(2,'0')+'.';
    const body=document.createElement('div');body.className='work-project-body';
    for(const [tag,klass,field]of [['h1','work-name','title'],['p','work-meta','meta'],['p','work-description','description']]){const el=document.createElement(tag);el.className=klass;el.textContent=p[field]||'';el.dataset.workText=p.id+'-'+field;if(field==='description')el.hidden=!el.textContent.trim();body.append(el);texts.push(el);el.ondblclick=()=>{if(!ready||!window.SUY_IS_ADMIN)return;activeText=el;input.value=el.textContent;editor.showModal();input.focus();};}
    const photos=(Array.isArray(p.photos)?p.photos:[]).map(safeURL).filter(Boolean);
    if(photos.length){
      const figure=document.createElement('figure');figure.className='work-album';figure.dataset.album=p.id;
      const photo=document.createElement('button');photo.type='button';photo.className='work-photo';photo.setAttribute('aria-label','Next photo in project '+p.title);const img=document.createElement('img');img.src=photos[0];img.alt=p.title;img.loading='lazy';photo.append(img);
      const pages=document.createElement('figcaption');pages.className='work-pages';photos.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.dataset.photo=i;b.textContent=(i+1)+'/'+photos.length;b.setAttribute('aria-label',p.title+', photo '+(i+1));pages.append(b);});figure.append(photo,pages);body.append(figure);
      const a={el:figure,key:p.id,photos,index:0,img};albums.push(a);bindAlbum(a);show(a,0);img.ondblclick=e=>{if(!ready||!window.SUY_IS_ADMIN)return;e.preventDefault();clearTimeout(a.clickTimer);activeAlbum=a;fileInput.value='';fileInput.click();};
    }
    const links=document.createElement('div');links.className='work-file-links';
    for(const [field,label]of [['pdf','OPEN PDF ↗'],['web','WEB PAGE ↗']]){const href=safeURL(p[field]);if(!href)continue;const a=document.createElement('a');a.href=href;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}
    if(links.childNodes.length)body.append(links);
    if(!photos.length&&safeURL(p.pdf)){const object=document.createElement('object');object.className='work-pdf';object.type='application/pdf';object.data=safeURL(p.pdf);body.append(object);}
    section.append(number,body);document.querySelector('.work-content').append(section);
    const navNumber=document.createElement('span');navNumber.textContent=number.textContent;const navLink=document.createElement('a');navLink.href='#'+section.id;navLink.textContent=p.title;document.querySelector('.work-index').append(navNumber,navLink);
  }
  const projectDialog=document.querySelector('#work-project-editor'),projectForm=document.querySelector('#work-project-form'),projectSelect=document.querySelector('#work-project-select');
  const projectField=name=>document.querySelector('#work-project-'+name);
  function selectProject(){
    const p=(payload.items||[]).find(p=>p.id===projectSelect.value);projectField('title').value=p?(payload.texts?.[p.id+'-title']??p.title):'';projectField('meta').value=p?(payload.texts?.[p.id+'-meta']??p.meta):'';projectField('description').value=p?(payload.texts?.[p.id+'-description']??p.description):'';projectField('web').value=p?.web||'';projectField('photos').value='';projectField('pdf').value='';projectField('files').textContent=p?`${p.photos?.length||0} existing photos${p.pdf?' · PDF attached':''}. Choose files to replace them.`:'';projectField('status').textContent='';
  }
  document.querySelector('#work-add').onclick=async()=>{
    if(!ready||!await window.SUY_ADMIN.isAdmin())return;
    projectSelect.replaceChildren();const option=document.createElement('option');option.value='';option.textContent='＋ NEW PROJECT';projectSelect.append(option);(payload.items||[]).forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=payload.texts?.[p.id+'-title']??p.title;projectSelect.append(o);});selectProject();projectDialog.showModal();
  };
  projectSelect.onchange=selectProject;document.querySelector('#work-project-cancel').onclick=()=>projectDialog.close();
  projectForm.onsubmit=async e=>{
    e.preventDefault();const button=projectForm.querySelector('[type=submit]');button.disabled=true;
    try{
      if(!ready||!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');
      const existing=(payload.items||[]).find(p=>p.id===projectSelect.value);const files=[...projectField('photos').files],pdfFile=projectField('pdf').files[0],web=projectField('web').value.trim();
      if(files.length>24)throw Error('Choose up to 24 photos.');
      if(files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10*1024*1024))throw Error('Each photo must be JPG, PNG or WebP under 10 MB.');
      if(web&&!safeURL(web))throw Error('Enter an http or https web address.');
      if(pdfFile&&(pdfFile.size>25*1024*1024||new TextDecoder().decode(await pdfFile.slice(0,5).arrayBuffer())!=='%PDF-'))throw Error('Choose a valid PDF under 25 MB.');
      projectField('status').textContent='Uploading and saving…';let photos=albums.find(a=>a.key===existing?.id)?.photos||payload.albums?.[existing?.id]||existing?.photos||[],pdf=existing?.pdf||'';
      if(files.length){photos=[];for(const file of files)photos.push(await window.SUY_ADMIN.uploadPublic(file,'work-cargo'));}
      if(pdfFile)pdf=await window.SUY_ADMIN.uploadPublic(pdfFile,'work-cargo/pdf');
      const project={...existing,id:existing?.id||'p-'+crypto.randomUUID(),title:projectField('title').value.trim(),meta:projectField('meta').value,description:projectField('description').value,photos,pdf,web};
      const next={...payload,items:(payload.items||[]).some(p=>p.id===project.id)?payload.items.map(p=>p.id===project.id?project:p):[...(payload.items||[]),project],texts:{...payload.texts},albums:{...payload.albums}};
      texts.forEach(el=>next.texts[el.dataset.workText]=el.textContent);albums.forEach(a=>next.albums[a.key]=a.photos);
      for(const field of ['title','meta','description'])next.texts[project.id+'-'+field]=project[field];
      next.albums[project.id]=photos;await window.SUY_ADMIN.saveContent('work-cargo-portfolio',next);location.reload();
    }catch(err){projectField('status').textContent=err.message;}finally{button.disabled=false;}
  };
  (async()=>{
    try{
      if(window.SUY_SITE_READY)await window.SUY_SITE_READY;
      if(!window.SUY_ADMIN)throw Error('Page editing unavailable');
      payload=await window.SUY_ADMIN.loadContent('work-cargo-portfolio')||{};
      (Array.isArray(payload.items)?payload.items:[]).forEach(renderProject);
      updateNav();
      texts.forEach(el=>{const value=payload.texts?.[el.dataset.workText];if(typeof value==='string'){el.textContent=value;if(el.classList.contains('work-description'))el.hidden=!value.trim();}});
      albums.forEach(a=>{const saved=payload.albums?.[a.key];if(Array.isArray(saved)&&saved.length===a.photos.length){a.photos=a.photos.map((src,i)=>typeof saved[i]==='string'&&(/^https:\/\//i.test(saved[i])||/^assets\/work-cargo\/[a-e]-0[1-3]\.jpg$/.test(saved[i]))?saved[i]:src);show(a,0);}});
      ready=true;if(window.SUY_IS_ADMIN)status.textContent='Double-click text or a photo to edit';
    }catch(e){status.textContent='Could not load saved edits. Refresh before editing.';console.warn('Work page edits unavailable',e);}
  })();
})();

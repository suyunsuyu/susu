(() => {
 'use strict';
 const gallery=document.querySelector('#journal-gallery'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),desktop=matchMedia('(min-width:701px)'),clamp=n=>Math.max(0,Math.min(1,n));
 let entries=[...document.querySelectorAll('.journal-entry')],buttons=[...document.querySelectorAll('[data-jump]')],lastActive=-1,scheduled=false,previousScroll=0,direction='next',imageData={},topicData={items:[]},ready=false,selected=null;
 const file=document.querySelector('#journal-upload'),status=document.querySelector('#journal-admin-status'),safeImage=v=>typeof v==='string'&&/^https:\/\//i.test(v);
 const themes={umi:'quiet',earphones:'play',bathroom:'water',food:'food',mealtime:'food',television:'screen',toilet:'smell',banana:'sleep',touch:'shy',mischief:'play',bed:'sleep',toys:'play'};
 const makeObserver=()=>new IntersectionObserver(changes=>changes.forEach(change=>{
  const caption=change.target;
  if(change.isIntersecting){caption.dataset.direction=direction;caption.classList.add('is-visible');caption.closest('.journal-entry').classList.add('is-in-view');}
  else{caption.classList.remove('is-visible');caption.closest('.journal-entry').classList.remove('is-in-view');}
 }),{root:gallery,threshold:.12});let observer=makeObserver();
 function decorate(entry){
  entry.dataset.theme=entry.dataset.theme||themes[entry.dataset.entry]||'quiet';
  const caption=entry.querySelector('[data-reveal]');if(caption)observer.observe(caption);
  if(['water','smell'].includes(entry.dataset.theme)&&!entry.querySelector('.scene-detail')){const detail=document.createElement('span');detail.className='scene-detail';detail.setAttribute('aria-hidden','true');detail.innerHTML='<i></i><i></i><i></i>';entry.querySelector('.journal-art')?.append(detail);}
  if(!entry.dataset.decorated){entry.dataset.decorated='true';entry.addEventListener('pointermove',e=>{if(reduced.matches)return;const r=entry.getBoundingClientRect();entry.style.setProperty('--pointer',((e.clientX-r.left)/Math.max(1,r.width)-.5).toFixed(2));});entry.addEventListener('pointerleave',()=>entry.style.setProperty('--pointer','0'));}
 }
 function refresh(){entries=[...document.querySelectorAll('.journal-entry')];buttons=[...document.querySelectorAll('[data-jump]')];entries.forEach(decorate);buttons.forEach(b=>b.onclick=()=>{jump(b.dataset.jump);history.replaceState(null,'','#'+b.dataset.jump);});lastActive=-1;requestUpdate();}
 function syncAccent(){const title=document.querySelector('.journal-directory h2'),ink=title?.querySelector('[style*="color"]')||title;if(ink)document.querySelector('.journal-directory').style.setProperty('--gallery-accent',getComputedStyle(ink).color);}
 function fitUnits(){entries.forEach(entry=>{const surface=entry.querySelector('.unit-surface');if(!surface)return;const ratio=Number(surface.dataset.unitHeight)||Number(surface.style.aspectRatio.split('/')[1])||800;surface.style.width=Math.max(1,Math.min(entry.clientWidth-32,(entry.clientHeight-48)*1000/ratio))+'px';});}
 function update(){
  scheduled=false;const scroll=gallery.scrollLeft,width=Math.max(1,gallery.clientWidth);if(Math.abs(scroll-previousScroll)>1)direction=scroll<previousScroll?'prev':'next';previousScroll=scroll;
  const active=Math.max(0,Math.min(entries.length-1,Math.round(scroll/width)));syncAccent();fitUnits();
  buttons.forEach((button,i)=>{button.classList.toggle('is-read',i<=active);if(i===active)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});
  entries.forEach((entry,i)=>{entry.dataset.slideDirection=direction;entry.classList.toggle('is-scene-active',i===active);entry.querySelector('[data-reveal]')?.setAttribute('data-direction',direction);});
  if(active!==lastActive){entries.forEach((entry,i)=>entry.classList.toggle('is-slide-active',i===active));lastActive=active;}
  document.querySelector('#journal-position').textContent=String(active+1).padStart(2,'0')+' / '+entries.length;
 }
 function requestUpdate(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
 function jump(id){const index=entries.findIndex(entry=>entry.id===id);if(index<0)return;gallery.scrollTo({left:index*gallery.clientWidth,top:0,behavior:reduced.matches?'auto':'smooth'});}
 gallery.addEventListener('scroll',requestUpdate,{passive:true});
 addEventListener('resize',()=>{const active=Math.max(0,lastActive);fitUnits();gallery.scrollTo({left:active*gallery.clientWidth,behavior:'instant'});requestUpdate();},{passive:true});
 let wheelUntil=0;
 gallery.addEventListener('wheel',event=>{if(!desktop.matches||Math.abs(event.deltaX)>=Math.abs(event.deltaY)||Math.abs(event.deltaY)<4)return;event.preventDefault();if(performance.now()<wheelUntil)return;wheelUntil=performance.now()+650;const index=Math.max(0,Math.min(entries.length-1,Math.round(gallery.scrollLeft/Math.max(1,gallery.clientWidth))+(event.deltaY>0?1:-1)));jump(entries[index].id);},{passive:false});
 gallery.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||event.target.closest('input,textarea,[contenteditable=true]'))return;event.preventDefault();const index=event.key==='Home'?0:event.key==='End'?entries.length-1:Math.max(0,Math.min(entries.length-1,lastActive+(event.key==='ArrowRight'?1:-1)));jump(entries[index].id);});
 const title=document.querySelector('.journal-directory h2');if(title)new MutationObserver(requestUpdate).observe(title,{attributes:true,childList:true,characterData:true,subtree:true});
 document.querySelector('#journal-back-top').onclick=()=>jump(entries[0].id);
 if(!reduced.matches)document.documentElement.classList.add('journal-motion');
 const clock=document.querySelector('#journal-clock'),formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});const tick=()=>{const now=new Date();clock.textContent=formatter.format(now);clock.dateTime=now.toISOString();};tick();setInterval(tick,1000);
 async function pickImage(img){if(!ready||!await window.SUY_ADMIN?.isAdmin())return;selected=img;file.value='';file.click();}
 function bindImage(img){img.addEventListener('dblclick',()=>pickImage(img));img.addEventListener('load',requestUpdate);}
 document.querySelectorAll('[data-journal-image]').forEach(bindImage);
 function checkImage(input){if(!['image/png','image/jpeg','image/webp'].includes(input.type)||input.size>10*1024*1024)throw Error('Choose a PNG, JPG or WebP image under 10 MB.');}
 file.onchange=async()=>{
  const input=file.files[0],target=selected;if(!input||!target)return;
  try{if(!ready||!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');checkImage(input);status.textContent='Uploading…';const url=await window.SUY_ADMIN.uploadPublic(input,'umi-journal'),latest=await window.SUY_ADMIN.loadContent('umi-journal-images')||{},next={...latest,images:{...latest.images,...imageData.images,[target.dataset.journalImage]:url}};await window.SUY_ADMIN.saveContent('umi-journal-images',next);imageData=next;target.src=url;status.textContent='Image saved';}catch(error){status.textContent=error.message;}
 };
 function renderTopic(topic,index){
  if(!topic||!/^t-[a-z\d-]{6,70}$/i.test(topic.id))return;
  const photos=(topic.images||[]).filter(safeImage).slice(0,2);if(!photos.length)return;
  const section=document.createElement('section');section.className='journal-entry';section.id='journal-'+topic.id;section.dataset.entry=topic.id;section.dataset.theme=['quiet','play','sleep','water','food'].includes(topic.theme)?topic.theme:'quiet';section.setAttribute('aria-label',(index+13)+'. '+topic.title);
  const art=photos.length===2?document.createElement('div'):section;if(photos.length===2){art.className='journal-pair';section.append(art);}
  photos.forEach((src,i)=>{const figure=document.createElement('figure');figure.className='journal-art';const img=document.createElement('img');img.src=src;img.alt=topic.title||'Umi';img.loading='lazy';img.decoding='async';img.dataset.journalImage=topic.id+'-'+i;figure.append(img);art.append(figure);bindImage(img);});
  const caption=document.createElement('div');caption.className='journal-caption';caption.dataset.reveal='';const text=document.createElement('p');text.className=topic.align==='right'?'caption-right':topic.align==='center'?'caption-center':'caption-left';text.dataset.journalText=topic.id+'-caption';text.textContent=topic.text||'';caption.append(text);section.append(caption);gallery.insertBefore(section,document.querySelector('.journal-end'));
  const li=document.createElement('li'),button=document.createElement('button'),span=document.createElement('span');button.type='button';button.dataset.jump=section.id;button.title=topic.title;button.setAttribute('aria-label',(index+13)+'. '+topic.title);span.textContent=(index+13)+'.';button.append(span);li.append(button);document.querySelector('.journal-directory ol').append(li);
 }
 const dialog=document.querySelector('#journal-topic-dialog'),form=document.querySelector('#journal-topic-form'),select=document.querySelector('#topic-select'),field=name=>document.querySelector('#topic-'+name);
 function selectTopic(){const item=topicData.items.find(t=>t.id===select.value);field('title').value=item?.title||'';field('text').value=item?.text||'';field('align').value=item?.align||'left';field('theme').value=item?.theme||'quiet';field('image').value='';field('image-two').value='';field('image').required=!item;field('existing').textContent=item?'Existing images are kept unless you choose replacements.':'';field('status').textContent='';}
 document.querySelector('#journal-add-topic').onclick=async()=>{if(!ready||!await window.SUY_ADMIN.isAdmin())return;select.replaceChildren();const option=document.createElement('option');option.value='';option.textContent='＋ NEW TOPIC';select.append(option);topicData.items.forEach(item=>{const o=document.createElement('option');o.value=item.id;o.textContent=item.title;select.append(o);});selectTopic();dialog.showModal();};select.onchange=selectTopic;field('cancel').onclick=()=>dialog.close();
 form.onsubmit=async e=>{
  e.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;
  try{
   if(!ready||!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');
   const old=topicData.items.find(t=>t.id===select.value),files=[field('image').files[0],field('image-two').files[0]];files.filter(Boolean).forEach(checkImage);if(!old&&!files[0])throw Error('Choose an image for the new topic.');
   const images=[...(old?.images||[])].map((src,i)=>imageData.images?.[old.id+'-'+i]||src);field('status').textContent='Saving topic…';for(let i=0;i<2;i++)if(files[i])images[i]=await window.SUY_ADMIN.uploadPublic(files[i],'umi-journal/topics');
   const nextItem={...old,id:old?.id||'t-'+crypto.randomUUID(),title:field('title').value.trim(),text:field('text').value,align:field('align').value,theme:field('theme').value,images:images.filter(Boolean)};
   const latest=await window.SUY_ADMIN.loadContent('umi-journal-topics')||{items:[]};const items=(latest.items||[]).some(i=>i.id===nextItem.id)?latest.items.map(i=>i.id===nextItem.id?nextItem:i):[...(latest.items||[]),nextItem];
   const writing=await window.SUY_ADMIN.loadContent('umi-journal-writing');const captionKey=nextItem.id+'-caption';if(writing?.blocks?.[captionKey]){const container=document.createElement('div');container.textContent=nextItem.text;writing.blocks[captionKey].html=container.innerHTML.replace(/\n/g,'<br>');await window.SUY_ADMIN.saveContent('umi-journal-writing',writing);}
   if(old&&files.some(Boolean)){const imageSettings=await window.SUY_ADMIN.loadContent('umi-journal-images')||{};imageSettings.images||={};files.forEach((f,i)=>{if(f)imageSettings.images[nextItem.id+'-'+i]=images[i];});await window.SUY_ADMIN.saveContent('umi-journal-images',imageSettings);}
   await window.SUY_ADMIN.saveContent('umi-journal-topics',{...latest,items});location.reload();
  }catch(error){field('status').textContent=error.message;}finally{button.disabled=false;}
 };
 window.SUY_JOURNAL_READY=(async()=>{
  try{if(window.SUY_SITE_READY)await window.SUY_SITE_READY;const values=await Promise.all([window.SUY_ADMIN.loadContent('umi-journal-images'),window.SUY_ADMIN.loadContent('umi-journal-topics')]);imageData=values[0]||{};topicData=values[1]||{items:[]};if(!Array.isArray(topicData.items))topicData.items=[];topicData.items.forEach(renderTopic);document.querySelectorAll('[data-journal-image]').forEach(img=>{const saved=imageData.images?.[img.dataset.journalImage];if(safeImage(saved))img.src=saved;});ready=true;refresh();}
  catch(error){status.textContent='Could not load saved topics. Refresh before editing.';console.warn('Journal content unavailable',error);}
 })();
 window.SUY_JOURNAL_NAV={refresh,update:requestUpdate,jump};
 refresh();addEventListener('load',()=>{if(/^#journal-[a-z\d-]+$/i.test(location.hash))jump(location.hash.slice(1));requestUpdate();});
})();

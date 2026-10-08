(() => {
  const $ = s => document.querySelector(s);
  const pad=n=>String(n).padStart(2,'0');
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  const id=()=>crypto.randomUUID?.()||`day-${Date.now()}-${Math.random()}`;
  const base="'Agdasima','Nanum Barunpen','ChillHuoFangSong'";
  const fonts={english:base,korean:"'Nanum Barunpen','ChillHuoFangSong','Agdasima'",chinese:"'ChillHuoFangSong','Nanum Barunpen','Agdasima'",hand:base};

  let payload={items:[]},items=[],cursor=new Date(2026,Math.min(11,Math.max(0,new Date().getMonth())),1),activeId='';
  let selectedDate='';
  const dialog=$('#calendar-detail'),form=$('#diary-form'),editor=$('#diary-dialog');
  const valid=s=>{if(!/^2026-\d{2}-\d{2}$/.test(s||''))return false;const d=new Date(s+'T12:00:00');return !isNaN(d)&&d.getFullYear()===2026&&d.getMonth()+1===Number(s.slice(5,7))&&d.getDate()===Number(s.slice(8,10));};
  let folded=true,folding=false;
  const sheet=$('.cat-calendar-sheet'),leaf=$('#calendar-lower-leaf'),foldToggle=$('#calendar-fold-toggle');
  function sizeSheet(){const height=sheet.clientWidth*1622/969;sheet.style.height=(height*(folded?.54:1))+'px';leaf.style.top=(height*.54)+'px';leaf.style.height=(height*.46)+'px';}
  async function setFold(next,animate=true){
    if(folding)return;folding=true;folded=next;
    foldToggle.setAttribute('aria-expanded',String(!next));
    foldToggle.textContent=next?'달력 열기 ↓':'달력 접기 ↑';
    if(!next){leaf.inert=false;leaf.setAttribute('aria-hidden','false');}
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!animate||reduced)sheet.classList.add('fold-instant');
    sheet.classList.toggle('is-folded',next);sizeSheet();
    $('.calendar-actions').hidden=next;
    if(next){leaf.inert=true;leaf.setAttribute('aria-hidden','true');foldToggle.focus({preventScroll:true});}
    if(animate&&!reduced)await new Promise(resolve=>setTimeout(resolve,650));
    sheet.classList.remove('fold-instant');folding=false;
  }
  foldToggle.onclick=()=>setFold(!folded);
  new ResizeObserver(sizeSheet).observe(sheet);
  sizeSheet();
  let changing=false;
  async function brightness(change){
    if(changing)return;changing=true;
    const root=$('.cat-calendar-main'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    try{
      if(!reduced)await root.animate([{filter:'brightness(1)',opacity:1},{filter:'brightness(.38)',opacity:.45}],{duration:180,easing:'cubic-bezier(0.22, 1, 0.36, 1)',fill:'forwards'}).finished;
      change();
      root.getAnimations().forEach(a=>a.cancel());
      if(!reduced)await root.animate([{filter:'brightness(.55)',opacity:.65},{filter:'brightness(1)',opacity:1}],{duration:420,easing:'cubic-bezier(0.22, 1, 0.36, 1)'}).finished;
    }finally{root.getAnimations().forEach(a=>a.cancel());changing=false;}
  }
  function photos(entry){return (Array.isArray(entry?.images)?entry.images:entry?.image?[entry.image]:[]).filter(Boolean).slice(0,2);}
  function photoNode(entry,large=false){
    const urls=photos(entry),wrap=document.createElement(large?'button':'span');
    wrap.className='stamp-photo'+(large?' featured-photo':'')+(urls[1]?' has-alternate':'');
    if(large){wrap.type='button';wrap.setAttribute('aria-label',urls[1]?'사진 · 마우스를 올리거나 눌러 다른 사진 보기':'날짜 사진');wrap.setAttribute('aria-pressed','false');}
    if(!urls[0])return wrap;
    const image=document.createElement('img');image.src=urls[0];image.alt=entry.title||'유미의 하루';image.className='photo-primary';image.loading=large?'eager':'lazy';wrap.append(image);
    if(urls[1]){const alternate=document.createElement('img');alternate.src=urls[1];alternate.alt='';alternate.className='photo-secondary';alternate.loading=large?'eager':'lazy';wrap.append(alternate);if(large)wrap.onclick=()=>{if(!matchMedia('(hover: none)').matches)return;const active=wrap.classList.toggle('is-alternate');wrap.setAttribute('aria-pressed',String(active));};}
    return wrap;
  }
  function closeDate(){
    dialog.hidden=true;$('#cat-date-photo').hidden=true;$('#cat-photo-close').hidden=true;
    $('#diary-calendar-grid').hidden=false;$('.cat-calendar-sheet').classList.remove('is-date-open');
    history.replaceState(null,'',location.pathname+location.search);
  }
  function backToCalendar(){brightness(()=>{closeDate();render();$('[data-date="'+selectedDate+'"]')?.focus({preventScroll:true});});}
  function render(){
    const year=2026,month=cursor.getMonth(),grid=$('#diary-calendar-grid');
    $('#diary-calendar-month').textContent=selectedDate&&!dialog.hidden?selectedDate.replaceAll('-','.'):year+'.'+pad(month+1);
    $('#diary-calendar-prev').disabled=month===0;$('#diary-calendar-next').disabled=month===11;
    grid.replaceChildren();
    const offset=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate(),rows=Math.ceil((offset+days)/7);
    grid.style.gridTemplateRows='repeat('+rows+',1fr)';
    for(let n=0;n<rows*7;n++){
      const day=n-offset+1,hasDay=day>0&&day<=days,cell=document.createElement(hasDay?'button':'span');
      cell.className=hasDay?'calendar-cell':'calendar-blank';
      if(hasDay){
        const date=year+'-'+pad(month+1)+'-'+pad(day),entry=items.find(x=>x.date===date);
        cell.type='button';cell.dataset.date=date;cell.setAttribute('aria-label',date+(entry?', 기록':''));
        if(date===today())cell.classList.add('is-today');
        const number=document.createElement('span');number.className='calendar-number';number.textContent=pad(day);cell.append(number);
        if(entry&&photos(entry)[0]){cell.classList.add('has-record');cell.append(photoNode(entry));}
        cell.onclick=()=>show(date,entry?[entry]:[]);
      }
      grid.append(cell);
    }
  }
  function show(date,entries){
    if(folded)setFold(false,false);
    brightness(()=>{
      selectedDate=date;cursor=new Date(2026,Number(date.slice(5,7))-1,1);
      dialog.hidden=false;$('#cat-day-prev').disabled=date==='2026-01-01';$('#cat-day-next').disabled=date==='2026-12-31';
      $('#diary-calendar-grid').hidden=true;$('#cat-date-photo').hidden=false;$('#cat-photo-close').hidden=false;
      $('.cat-calendar-sheet').classList.add('is-date-open');history.replaceState(null,'',location.pathname+location.search+'#'+date);
      render();
      const notes=$('#calendar-detail-body'),frame=$('#cat-date-photo');notes.replaceChildren();frame.replaceChildren();
      const heading=document.createElement('h2');heading.textContent=date.replaceAll('-','.');notes.append(heading);
      const entry=entries[0];
      if(entry){
        if(photos(entry)[0])frame.append(photoNode(entry,true));
        if(entry.title){const title=document.createElement('h3');title.textContent=entry.title;notes.append(title);}
        const text=document.createElement('p');text.textContent=entry.text||'';text.style.fontFamily=fonts[entry.style?.font]||fonts.hand;
        text.style.fontSize=Math.min(32,Math.max(14,Number(entry.style?.size)||18))+'px';text.style.color=entry.style?.color||'#494139';notes.append(text);
      }else{
        const empty=document.createElement('p');empty.className='cat-day-empty';empty.textContent='아직 기록이 없어요.';notes.append(empty);
        const placeholder=document.createElement('span');placeholder.className='date-photo-placeholder';placeholder.textContent=date.replaceAll('-','.');frame.append(placeholder);
      }
      if(window.SUY_IS_ADMIN){const edit=document.createElement('button');edit.type='button';edit.textContent=entry?'이 날짜 편집':'사진과 글 남기기';edit.onclick=()=>openEditor(entry||null,date);notes.append(edit);}
      $('.calendar-overlay').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    });
  }
  function openEditor(entry=null,date=today()){form.reset();activeId=entry?.id||'';$('#diary-edit-id').value=activeId;$('#diary-date').min='2026-01-01';$('#diary-date').max='2026-12-31';$('#diary-date').value=valid(entry?.date||date)?(entry?.date||date):'2026-01-01';$('#diary-title').value=entry?.title||'';$('#diary-text').value=entry?.text||'';$('#diary-font').value=['english','korean','chinese'].includes(entry?.style?.font)?entry.style.font:'english';$('#diary-size').value=entry?.style?.size||'';$('#diary-color').value=entry?.style?.color||'#777777';$('#diary-color-hex').value=$('#diary-color').value.toUpperCase();$('#diary-existing-photos').replaceChildren();const photos=entry?.images||(entry?.image?[entry.image]:[]);photos.forEach(src=>{const img=document.createElement('img');img.src=src;img.alt='Existing photo';$('#diary-existing-photos').append(img)});$('#diary-existing-photos').hidden=!photos.length;$('#diary-remove-photo-wrap').hidden=!photos.length;$('#diary-editor-status').textContent='';preview();manager();editor.showModal()}
  function preview(){const p=$('#diary-style-preview');p.textContent=$('#diary-text').value||'Write here…';p.style.fontFamily=fonts[$('#diary-font').value]||fonts.hand;p.style.fontSize=($('#diary-size').value||20)+'px';p.style.color=$('#diary-color').value}
  function manager(){const root=$('#diary-manager');root.replaceChildren();$('#diary-manager-count').textContent=pad(items.length);[...items].reverse().forEach(entry=>{const row=document.createElement('div');row.className='diary-row';const name=document.createElement('span');name.textContent=`${entry.date} · ${entry.title||entry.text?.slice(0,25)||''}`;const edit=document.createElement('button');edit.type='button';edit.textContent='EDIT';edit.onclick=()=>openEditor(entry);const del=document.createElement('button');del.type='button';del.textContent='DELETE';del.onclick=async()=>{if(!confirm(`Delete ${entry.date}?`)||!await window.SUY_ADMIN.isAdmin())return;try{await save(items.filter(x=>x.id!==entry.id));manager()}catch(e){$('#diary-editor-status').textContent=e.message}};row.append(name,edit,del);root.append(row)})}
  async function save(next){await window.SUY_ADMIN.saveContent('cat-calendar-2026',{...payload,items:next});items=next;payload={...payload,items};render()}
  $('#calendar-print-month').onclick=e=>window.SUY_MONTHLY.download(cursor.getFullYear(),cursor.getMonth(),items,e.currentTarget);
  $('#diary-calendar-prev').onclick=()=>{if(cursor.getMonth()>0)brightness(()=>{closeDate();cursor=new Date(2026,cursor.getMonth()-1,1);render()})};$('#diary-calendar-next').onclick=()=>{if(cursor.getMonth()<11)brightness(()=>{closeDate();cursor=new Date(2026,cursor.getMonth()+1,1);render()})};
  $('#cat-photo-close').onclick=backToCalendar;$('#edit-diary').onclick=async()=>{if(await window.SUY_ADMIN.isAdmin())openEditor(items.find(x=>x.date===selectedDate)||null,selectedDate||today())};$('#diary-new-draft').onclick=()=>openEditor();$('#close-diary-editor').onclick=()=>editor.close();dialog.querySelector('.close').onclick=backToCalendar;document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.hidden&&!editor.open)backToCalendar()});['prev','next'].forEach((direction,i)=>$('#cat-day-'+direction).onclick=()=>{const d=new Date(selectedDate+'T12:00:00');d.setDate(d.getDate()+(i?1:-1));const date=`2026-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;if(d.getFullYear()===2026)show(date,items.filter(x=>x.date===date))});editor.onclick=e=>{if(e.target===editor)editor.close()};
  ['diary-text','diary-font','diary-size'].forEach(key=>$('#'+key).oninput=preview);$('#diary-color').oninput=()=>{$('#diary-color-hex').value=$('#diary-color').value.toUpperCase();preview()};$('#diary-color-hex').oninput=()=>{if(/^#[a-f\d]{6}$/i.test($('#diary-color-hex').value)){$('#diary-color').value=$('#diary-color-hex').value;preview()}};
  form.onsubmit=async e=>{
    e.preventDefault();const status=$('#diary-editor-status');
    try{
      if(!await window.SUY_ADMIN.isAdmin())throw Error('관리자 로그인이 필요해요.');
      const date=$('#diary-date').value,text=$('#diary-text').value.trim();if(!valid(date))throw Error('2026년 날짜를 선택해 주세요.');
      const existing=items.find(x=>x.id===activeId)||items.find(x=>x.date===date);
      let images=$('#diary-remove-photo').checked?[]:photos(existing);
      const first=$('#diary-images').files[0],second=$('#diary-hover-image').files[0];
      if(second&&!first&&!images[0])throw Error('첫 번째 사진을 먼저 넣어 주세요.');
      for(const [i,file]of [first,second].entries()){if(!file)continue;if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))throw Error('이미지 파일을 선택해 주세요.');status.textContent='사진 업로드 중…';images[i]=await window.SUY_ADMIN.uploadPublic(file,'cat-calendar');}
      images=images.filter(Boolean).slice(0,2);if(!images[0])throw Error('날짜에 보여 줄 첫 번째 사진을 넣어 주세요.');
      const entry={...existing,id:existing?.id||id(),date,title:$('#diary-title').value.trim(),text,images,image:images[0],style:{font:$('#diary-font').value,size:$('#diary-size').value,color:$('#diary-color').value}};
      status.textContent='저장 중…';
      await save([...items.filter(x=>x.id!==entry.id&&x.date!==date),entry].sort((a,b)=>a.date.localeCompare(b.date)));
      cursor=new Date(2026,Number(date.slice(5,7))-1,1);render();editor.close();show(date,[entry]);
    }catch(error){status.textContent=error.message;}
  };
  (async()=>{try{if(window.SUY_SITE_READY)await window.SUY_SITE_READY;payload=await window.SUY_ADMIN.loadContent('cat-calendar-2026')||{items:[]};items=(Array.isArray(payload.items)?payload.items:[]).filter(x=>valid(x.date));render();const date=decodeURIComponent(location.hash.slice(1));if(valid(date)){cursor=new Date(Number(date.slice(0,4)),Number(date.slice(5,7))-1,1);render();const entries=items.filter(x=>x.date===date);show(date,entries);}}catch(e){console.warn('Calendar unavailable',e);$('#cat-calendar-status').textContent='기록을 불러오지 못했어요. 새로고침해 주세요.';render()}})();
})();

(() => {
  'use strict';
  const art = document.querySelector('.cargo-artwork'), open = document.querySelector('#home-art-open');
  const marquee = art.querySelector('.cargo-marquee'), track = marquee.firstElementChild;
  const canvas = art.querySelector('.home-art-canvas'), pause = document.querySelector('#cargo-motion-toggle');
  const api = window.SUY_ADMIN, key = 'cargo-home-artwork', limit = 24;
  const effects = {none:'None', float:'Float', sway:'Sway', pulse:'Pulse', fade:'Fade'};
  const clamp = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;
  const defaults = [...track.firstElementChild.children].map((img,i) => ({
    id:'original-'+i, src:img.getAttribute('src'), alt:img.alt, x:4+i%2*48, y:4+Math.floor(i/2)*48, w:44, h:44, effect:'none', duration:5
  }));
  const originals = new Set(defaults.map(item=>item.src));
  const safe = src => typeof src==='string' && (originals.has(src) || /^https:\/\//i.test(src));
  const copy = value => JSON.parse(JSON.stringify(value));
  function normalize(data) {
    const items=Array.isArray(data?.items) ? data.items.filter(item=>item && safe(item.src)).slice(0,limit) : defaults;
    return {mode:data?.mode==='canvas'?'canvas':'marquee', speed:clamp(data?.speed,8,180,72),
      direction:data?.direction==='right'?'right':'left', revision:data?.revision||'',
      items:items.map((item,i)=>{
        const w=clamp(item.w,5,100,44), h=clamp(item.h,5,100,44);
        return {id:String(item.id||i), src:item.src, alt:String(item.alt||'').slice(0,160), w,h,
          x:clamp(item.x,0,100-w,0), y:clamp(item.y,0,100-h,0),
          effect:Object.hasOwn(effects,item.effect)?item.effect:'none', duration:clamp(item.duration,1,30,5)};
      })};
  }
  function imageNode(item, editable=false) {
    const el=document.createElement(editable?'button':'div');
    el.className='home-art-item';
    if(editable){el.type='button';el.dataset.id=item.id;el.setAttribute('aria-label',item.alt||'Select image');}
    const img=document.createElement('img');
    img.src=item.src; img.alt=item.alt; img.draggable=false; img.decoding='async';
    img.dataset.effect=item.effect;
    img.style.setProperty('--effect-time',item.duration+'s');
    el.append(img);
    position(el,item);
    return el;
  }
  function position(el,item) {
    for(const [property,value] of Object.entries({left:item.x,top:item.y,width:item.w,height:item.h}))
      el.style[property]=value+'%';
  }
  function publishView(state) {
    canvas.hidden=state.mode!=='canvas';marquee.hidden=!canvas.hidden;
    canvas.replaceChildren();
    if(state.mode==='canvas') canvas.append(...state.items.map(item=>imageNode(item)));
    else {
      const groups=[0,1].map(i=>{
        const group=document.createElement('div');group.className='cargo-marquee-group';
        if(i)group.setAttribute('aria-hidden','true');
        for(const item of state.items){
          const img=imageNode(item).firstElementChild;
          if(i)img.alt='';
          group.append(img);
        }
        return group;
      });
      track.replaceChildren(...groups);
      track.style.animationDuration=state.speed+'s';
      track.style.animationDirection=state.direction==='right'?'reverse':'normal';
    }
    pause.hidden=!state.items.length || (state.mode==='canvas' && state.items.every(item=>item.effect==='none'));
  }
  const dialog=document.createElement('dialog');
  dialog.id='home-art-editor';dialog.setAttribute('aria-labelledby','home-art-title');
  dialog.innerHTML=`
    <header><h2 id="home-art-title">Edit homepage artwork</h2><button type="button" data-action="close" aria-label="Close">×</button></header>
    <div class="home-art-toolbar">
      <label>Layout <select id="home-art-mode"><option value="marquee">Scrolling strip</option><option value="canvas">Free canvas</option></select></label>
      <label class="home-art-scroll-setting">Scroll time <input id="home-art-speed" type="number" min="8" max="180"> s</label>
      <label class="home-art-scroll-setting">Direction <select id="home-art-direction"><option value="left">Left</option><option value="right">Right</option></select></label>
      <button type="button" data-action="add">＋ Add images</button>
      <button type="button" data-action="preview" aria-pressed="false">Preview motion</button>
    </div>
    <div class="home-art-workspace">
      <div id="home-art-stage" aria-label="Artwork preview"></div>
      <aside>
        <label>Image <select id="home-art-select"></select></label>
        <fieldset id="home-art-fields">
          <label>Image description <input id="home-art-alt" maxlength="160" type="text"></label>
          <div class="home-art-geometry">
            <label>X (%) <input id="home-art-x" type="number" min="0" max="100"></label>
            <label>Y (%) <input id="home-art-y" type="number" min="0" max="100"></label>
            <label>Width (%) <input id="home-art-w" type="number" min="5" max="100"></label>
            <label>Height (%) <input id="home-art-h" type="number" min="5" max="100"></label>
          </div>
          <label>Animation <select id="home-art-effect">${Object.entries(effects).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label>
          <label>Cycle (seconds) <input id="home-art-duration" type="number" min="1" max="30" step=".5"></label>
          <div class="home-art-actions">
            <button type="button" data-action="earlier">← Earlier / back</button><button type="button" data-action="later">Later / front →</button>
            <button type="button" data-action="replace">Replace image</button><button type="button" data-action="remove">Remove</button>
          </div>
        </fieldset>
      </aside>
    </div>
    <p class="home-art-hint">In Free canvas, drag a picture or use its arrow keys. Drop images here to add them.</p>
    <footer><span id="home-art-status" role="status"></span><button type="button" data-action="close">Cancel</button><button type="button" data-action="save">Save artwork</button></footer>
    <input id="home-art-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden>`;
  document.body.append(dialog);
  const field=name=>dialog.querySelector('#home-art-'+name);
  const stage=field('stage'), status=field('status'), file=field('file'), save=dialog.querySelector('[data-action=save]');
  const uploads=new Map();
  let live=normalize(), draft, selected, dirty=false, busy=false, replace=false, preview=false;
  const current=()=>draft.items.find(item=>item.id===selected);
  function sync(){
    const item=current();
    field('select').value=selected||'';field('fields').disabled=!item||preview||busy;
    stage.querySelectorAll('button[data-id]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.id===selected)));
    if(item)for(const key of ['alt','effect','duration','x','y','w','h'])field(key).value=Math.round(item[key])===item[key]?Math.round(item[key]):item[key];
  }
  function render(){
    field('mode').value=draft.mode;field('speed').value=draft.speed;field('direction').value=draft.direction;
    stage.className=draft.mode+(preview?' is-preview':'');
    stage.replaceChildren();
    if(preview && draft.mode==='marquee'){
      const row=document.createElement('div');row.className='home-art-preview-row';
      row.style.animationDuration=draft.speed+'s';
      row.style.animationDirection=draft.direction==='right'?'reverse':'normal';
      for(let i=0;i<2;i++){
        const group=document.createElement('div');group.className='home-art-preview-group';
        if(i)group.setAttribute('aria-hidden','true');
        group.append(...draft.items.map(item=>imageNode(item)));row.append(group);
      }
      stage.append(row);
    }else stage.append(...draft.items.map(item=>imageNode(item,!preview)));
    if(!draft.items.length)stage.textContent='Add images to begin.';
    field('select').replaceChildren(...draft.items.map((item,i)=>new Option((i+1)+'. '+(item.alt||'Image'),item.id)));
    dialog.querySelector('.home-art-geometry').hidden=draft.mode!=='canvas';
    dialog.querySelectorAll('.home-art-scroll-setting').forEach(el=>el.hidden=draft.mode!=='marquee');
    const toggle=dialog.querySelector('[data-action=preview]');
    toggle.setAttribute('aria-pressed',String(preview));toggle.textContent=preview?'Back to editing':'Preview motion';
    sync();
  }
  function choose(id){selected=id;sync();}
  function move(item,x,y){item.x=clamp(x,0,100-item.w,0);item.y=clamp(y,0,100-item.h,0);dirty=true;}
  stage.addEventListener('pointerdown',e=>{
    const node=e.target.closest('button[data-id]');
    if(!node||busy||e.button!==0)return;
    choose(node.dataset.id);
    if(draft.mode!=='canvas')return;
    const item=current(), box=stage.getBoundingClientRect(), x=item.x,y=item.y;
    const startX=e.clientX,startY=e.clientY;
    node.setPointerCapture(e.pointerId);
    const drag=ev=>{
      move(item,x+(ev.clientX-startX)*100/box.width,y+(ev.clientY-startY)*100/box.height);
      position(node,item);sync();
    };
    node.addEventListener('pointermove',drag);
    node.addEventListener('lostpointercapture',()=>node.removeEventListener('pointermove',drag),{once:true});
  });
  stage.addEventListener('click',e=>{const node=e.target.closest('button[data-id]');if(node&&!busy)choose(node.dataset.id);});
  stage.addEventListener('keydown',e=>{
    const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    const node=e.target.closest('button[data-id]');
    if(!delta||!node||busy||draft.mode!=='canvas')return;
    e.preventDefault();choose(node.dataset.id);
    const item=current(), step=e.shiftKey?5:1;
    move(item,item.x+delta[0]*step,item.y+delta[1]*step);
    position(node,item);sync();
  });
  field('select').onchange=e=>choose(e.target.value);
  for(const name of ['mode','speed','direction'])field(name).onchange=e=>{
    draft[name]=name==='speed'?clamp(e.target.value,8,180,72):e.target.value;
    dirty=true;render();
  };
  for(const name of ['alt','effect','duration','x','y','w','h'])field(name).onchange=e=>{
    const item=current();if(!item)return;
    const value=e.target.value;
    item[name]=['alt','effect'].includes(name)?value:clamp(value,name==='duration'?1:['w','h'].includes(name)?5:0,name==='duration'?30:100,item[name]);
    move(item,item.x,item.y);render();
  };
  function discardUpload(id){
    const upload=uploads.get(id);if(upload){URL.revokeObjectURL(upload.url);uploads.delete(id);}
  }
  function addFiles(files,replacing=false,point=null){
    if(busy)return;
    const max=replacing?1:limit-draft.items.length;
    const list=[...files].filter(f=>/^image\/(png|jpeg|webp|gif)$/.test(f.type)&&f.size<=10*1024*1024);
    status.textContent=list.length!==files.length?'Use PNG, JPG, WebP or GIF, up to 10 MB each.':list.length>max?'Up to '+limit+' images.':'';
    for(const f of list.slice(0,max)){
      const item=replacing?current():{id:crypto.randomUUID(),alt:f.name.replace(/\.[^.]+$/,''),x:point?.x??12,y:point?.y??12,w:38,h:38,effect:'none',duration:5};
      if(!item)break;
      discardUpload(item.id);
      const url=URL.createObjectURL(f);
      uploads.set(item.id,{file:f,url});item.src=url;
      if(!replacing){move(item,item.x,item.y);draft.items.push(item);}
      selected=item.id;dirty=true;
    }
    preview=false;render();
  }
  file.onchange=()=>addFiles(file.files,replace);
  stage.ondragover=e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();};
  stage.ondrop=e=>{
    if(!e.dataTransfer.files.length)return;
    e.preventDefault();
    const box=stage.getBoundingClientRect();
    addFiles(e.dataTransfer.files,false,draft.mode==='canvas'?{x:(e.clientX-box.left)*100/box.width,y:(e.clientY-box.top)*100/box.height}:null);
  };
  function close(){if(!busy&&(!dirty||confirm('Discard unsaved artwork changes?')))dialog.close();}
  dialog.oncancel=e=>{e.preventDefault();close();};
  dialog.onclose=()=>{for(const id of uploads.keys())discardUpload(id);};
  dialog.addEventListener('click',async e=>{
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(!action||busy)return;
    if(action==='close')return close();
    if(action==='preview'){preview=!preview;return render();}
    if(action==='add'||action==='replace'){
      replace=action==='replace';file.multiple=!replace;file.value='';file.click();return;
    }
    if(action==='save'){
      busy=true;dialog.querySelectorAll('button,input,select').forEach(el=>el.disabled=true);
      status.textContent='Saving artwork…';
      try{
        if(!await api.isAdmin())throw new Error('Admin login required.');
        const latest=await api.loadContent(key);
        if((latest?.revision||'')!==draft.revision)throw new Error('Artwork changed in another tab. Reopen the editor before saving.');
        const next=copy(draft);
        for(const item of next.items){
          const upload=uploads.get(item.id);
          if(upload)item.src=upload.savedUrl||(upload.savedUrl=await api.uploadPublic(upload.file,'home-artwork'));
        }
        next.revision=crypto.randomUUID();
        await api.saveContent(key,next);
        live=normalize(next);publishView(live);dirty=false;dialog.close();
      }catch(error){status.textContent=error.message;}
      finally{busy=false;dialog.querySelectorAll('button,input,select').forEach(el=>el.disabled=false);sync();}
      return;
    }
    const item=current();if(!item)return;
    const i=draft.items.indexOf(item);
    if(action==='remove'){discardUpload(item.id);draft.items.splice(i,1);selected=draft.items[Math.min(i,draft.items.length-1)]?.id;}
    else if(action==='earlier'||action==='later'){
      const j=i+(action==='earlier'?-1:1);
      if(j<0||j>=draft.items.length)return;
      [draft.items[i],draft.items[j]]=[draft.items[j],draft.items[i]];
    }
    dirty=true;render();
  });
  const ready=(async()=>{
    if(!api)return false;
    try{
      await window.SUY_SITE_READY;
      const saved=await api.loadContent(key);
      if(saved){live=normalize(saved);publishView(live);}
      return true;
    }catch(error){console.warn('Homepage artwork could not be loaded.',error);return false;}
  })();
  async function edit(){
    if(dialog.open||!await api?.isAdmin())return;
    if(!await ready){alert('Could not load saved artwork. Refresh before editing.');return;}
    if(dialog.open)return;
    draft=copy(live);selected=draft.items[0]?.id;dirty=false;preview=false;status.textContent='';
    render();dialog.showModal();
  }
  open.onclick=edit;
  art.ondblclick=e=>{if(!e.target.closest('button')&&window.SUY_IS_ADMIN)edit();};
  document.addEventListener('suyoon-admin-state',e=>{open.hidden=!e.detail.admin;});
  open.hidden=!window.SUY_IS_ADMIN;
})();

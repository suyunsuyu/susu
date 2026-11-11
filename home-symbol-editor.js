(async()=>{
'use strict';
const region=document.querySelector('.cargo-symbols'),api=window.SUY_ADMIN,key='cargo-home-symbols';
const original=region.innerHTML;
region.removeAttribute('aria-hidden');region.setAttribute('aria-label','Homepage illustration');
const button=document.createElement('button');button.type='button';button.id='home-symbol-open';button.textContent='EDIT IMAGE ↗';button.hidden=true;region.after(button);
const dialog=document.createElement('dialog');dialog.id='home-symbol-editor';dialog.setAttribute('aria-label','Edit homepage illustration');
dialog.innerHTML='<h2>Edit illustration</h2><div id="home-symbol-preview"></div><label>Upload / replace image<input id="home-symbol-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><label>Width (%)<input id="home-symbol-width" type="number" min="10" max="100"></label><label>Move right (%)<input id="home-symbol-x" type="number" min="0" max="90"></label><label>Move down (px)<input id="home-symbol-y" type="number" min="0" max="300"></label><button type="button" id="home-symbol-reset">Restore UFO and dots</button><p id="home-symbol-status" role="status"></p><footer><button type="button" id="home-symbol-cancel">Cancel</button><button type="button" id="home-symbol-save">Save</button></footer>';
document.body.append(dialog);
const el=name=>document.querySelector('#home-symbol-'+name),safe=src=>typeof src==='string'&&/^https:\/\//i.test(src),num=(v,a,b,d)=>Number.isFinite(Number(v))?Math.min(b,Math.max(a,Number(v))):d;
const normal=v=>({src:safe(v?.src)?v.src:'',width:num(v?.width,10,100,40),x:num(v?.x,0,90,0),y:num(v?.y,0,300,0),revision:v?.revision||''});
let live=normal(),draft,upload=null,temporary='',dirty=false,busy=false,ready=false;
function draw(root,value){root.replaceChildren();const content=document.createElement('div');content.className='home-symbol-content';const frame=document.createElement('div');frame.className='home-symbol-frame';if(value.src){const img=document.createElement('img');img.src=value.src;img.alt='Homepage illustration';img.style.width='100%';frame.append(img);}else frame.innerHTML=original;content.append(frame);content.style.width=value.width+'%';content.style.marginLeft=Math.min(value.x,100-value.width)+'%';content.style.paddingTop=value.y+'px';root.append(content);}
function setWidth(width){draft.width=num(width,10,100,draft.width);el('width').value=Math.round(draft.width);dirty=true;const content=el('preview').firstElementChild;content.style.width=draft.width+'%';content.style.marginLeft=Math.min(draft.x,100-draft.width)+'%';}
function preview(){
 draw(el('preview'),draft);
 const frame=el('preview').querySelector('.home-symbol-frame'),handle=document.createElement('button');
 handle.type='button';handle.className='home-symbol-resize';handle.setAttribute('aria-label','Drag to resize image');handle.title='Drag to resize image';handle.textContent='↘';frame.append(handle);
 handle.onpointerdown=e=>{
  if(busy||e.button!==0)return;e.preventDefault();
  const box=frame.getBoundingClientRect(),startWidth=draft.width,startX=e.clientX,startY=e.clientY;
  handle.setPointerCapture(e.pointerId);
  const move=ev=>{const dx=ev.clientX-startX,dy=ev.clientY-startY;const delta=Math.abs(dx)>=Math.abs(dy)?dx:dy*box.width/Math.max(1,box.height);setWidth(startWidth+delta/Math.max(1,box.width)*startWidth);};
  handle.addEventListener('pointermove',move);handle.addEventListener('lostpointercapture',()=>handle.removeEventListener('pointermove',move),{once:true});
 };
 handle.onkeydown=e=>{if(['ArrowRight','ArrowDown','+','=','ArrowLeft','ArrowUp','-'].includes(e.key)){e.preventDefault();setWidth(draft.width+(['ArrowLeft','ArrowUp','-'].includes(e.key)?-5:5));}};
 const controls=document.createElement('div');controls.className='home-symbol-zoom';
 for(const [label,text,step]of [['Shrink image','−',-5],['Enlarge image','+',5]]){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.textContent=text;b.onclick=()=>{if(!busy)setWidth(draft.width+step);};controls.append(b);}
 el('preview').append(controls);
 const hint=document.createElement('p');hint.className='home-symbol-resize-hint';hint.textContent='Drag the bottom-right corner, or use − / + to resize.';el('preview').append(hint);
}
function clean(){if(temporary)URL.revokeObjectURL(temporary);temporary='';upload=null;}
async function edit(){if(!ready||dialog.open||!await api?.isAdmin())return;if(dialog.open)return;draft={...live};dirty=false;clean();el('file').value='';el('status').textContent='';for(const n of ['width','x','y'])el(n).value=draft[n];preview();dialog.showModal();}
button.onclick=edit;region.ondblclick=()=>{if(window.SUY_IS_ADMIN)edit();};
for(const n of ['width','x','y'])el(n).oninput=()=>{draft[n]=num(el(n).value,n==='width'?10:0,n==='width'?100:n==='x'?90:300,draft[n]);dirty=true;preview();};
el('file').onchange=()=>{const f=el('file').files[0];if(!f)return;if(!['image/png','image/jpeg','image/webp','image/gif'].includes(f.type)||f.size>10*1024*1024){el('status').textContent='Choose PNG, JPG, WebP or GIF under 10 MB.';return;}clean();upload=f;draft.src=temporary=URL.createObjectURL(f);dirty=true;preview();};
el('reset').onclick=()=>{clean();draft={...normal(),revision:live.revision};for(const n of ['width','x','y'])el(n).value=draft[n];el('file').value='';dirty=true;preview();};
function close(){if(!busy&&(!dirty||confirm('Discard unsaved illustration changes?')))dialog.close();}
el('cancel').onclick=close;dialog.oncancel=e=>{e.preventDefault();close();};dialog.onclose=clean;
el('save').onclick=async()=>{
 if(busy)return;busy=true;dialog.querySelectorAll('button,input').forEach(e=>e.disabled=true);el('status').textContent='Saving…';
 try{if(!await api.isAdmin())throw Error('Admin login required.');const latest=await api.loadContent(key);if((latest?.revision||'')!==live.revision)throw Error('This illustration changed in another tab. Reopen the editor.');const next={...draft};if(upload)next.src=await api.uploadPublic(upload,'home-symbols');next.revision=crypto.randomUUID();await api.saveContent(key,next);live=normal(next);draw(region,live);dirty=false;dialog.close();}
 catch(e){el('status').textContent=e.message;}finally{busy=false;dialog.querySelectorAll('button,input').forEach(e=>e.disabled=false);}
};
document.addEventListener('suyoon-admin-state',e=>{button.hidden=!e.detail.admin||!ready;});
try{await window.SUY_SITE_READY;const data=await api.loadContent(key);if(data){live=normal(data);draw(region,live);}ready=true;button.hidden=!window.SUY_IS_ADMIN;}catch(e){console.warn('Homepage illustration unavailable',e);}
})();

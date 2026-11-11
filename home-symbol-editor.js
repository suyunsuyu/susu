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
function draw(root,value){root.replaceChildren();const content=document.createElement('div');content.className='home-symbol-content';if(value.src){const img=document.createElement('img');img.src=value.src;img.alt='Homepage illustration';img.style.width='100%';content.append(img);}else content.innerHTML=original;content.style.width=value.width+'%';content.style.marginLeft=Math.min(value.x,100-value.width)+'%';content.style.paddingTop=value.y+'px';root.append(content);}
function preview(){draw(el('preview'),draft);}
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

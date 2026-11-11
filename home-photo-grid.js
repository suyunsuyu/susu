(async()=>{
'use strict';
const api=window.SUY_ADMIN,area=document.querySelector('.home-photo-area'),grid=document.querySelector('#home-photo-grid'),open=document.querySelector('#home-photos-open'),key='cargo-home-photos';
const safe=src=>typeof src==='string'&&(/^https:\/\//i.test(src)||/^assets\/cargo-cat-[1-4]\.(png|jpg)$/.test(src));
const normalize=value=>({revision:value?.revision||'',items:(Array.isArray(value?.items)?value.items:[]).filter(i=>i&&safe(i.src)).slice(0,40).map(i=>({id:String(i.id||crypto.randomUUID()),src:i.src,alt:String(i.alt||'').slice(0,160)}))});
const copy=v=>JSON.parse(JSON.stringify(v));
let live={items:[],revision:''},draft,dirty=false,busy=false,target=null,loaded=false;
const pending=new Map();
function paint(){grid.replaceChildren(...live.items.map((item,i)=>{const img=document.createElement('img');img.src=item.src;img.alt=item.alt;img.decoding='async';img.loading=i<4?'eager':'lazy';return img;}));}
const dialog=document.createElement('dialog');dialog.id='home-photo-editor';dialog.setAttribute('aria-labelledby','home-photo-title');
dialog.innerHTML='<header><h2 id="home-photo-title">Edit homepage photos</h2><button type="button" data-action="close" aria-label="Close photo editor">×</button></header><button type="button" data-action="add">＋ Upload photos</button><p>Photos appear in a rectangular grid. Use the arrows to change their order.</p><ul id="home-photo-list"></ul><footer><span id="home-photo-save-status" role="status"></span><button type="button" data-action="close">Cancel</button><button type="button" data-action="save">Save photos</button></footer><input id="home-photo-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden>';
document.body.append(dialog);
const list=dialog.querySelector('ul'),status=dialog.querySelector('[role=status]'),file=dialog.querySelector('[type=file]');
function draw(){list.replaceChildren(...draft.items.map((item,i)=>{const row=document.createElement('li');row.dataset.id=item.id;const img=document.createElement('img');img.src=item.src;img.alt=item.alt;const body=document.createElement('div'),label=document.createElement('label'),input=document.createElement('input');label.textContent='Photo '+(i+1)+' description';input.value=item.alt;input.maxLength=160;input.oninput=()=>{item.alt=input.value;dirty=true;};label.append(input);body.append(label);const actions=document.createElement('div');actions.className='photo-actions';for(const [action,text] of [['up','←'],['down','→'],['replace','Replace'],['remove','Remove']]){const b=document.createElement('button');b.type='button';b.dataset.action=action;b.textContent=text;if(action==='up'||action==='down'){b.setAttribute('aria-label',action==='up'?'Move earlier':'Move later');b.disabled=action==='up'?i===0:i===draft.items.length-1;}actions.append(b);}body.append(actions);row.append(img,body);return row;}));}
function cleanup(id){const v=pending.get(id);if(v){URL.revokeObjectURL(v.url);pending.delete(id);}}
function close(){if(!busy&&(!dirty||confirm('Discard unsaved photo changes?')))dialog.close();}
dialog.oncancel=e=>{e.preventDefault();close();};dialog.onclose=()=>{for(const id of pending.keys())cleanup(id);};
async function edit(){if(dialog.open||!loaded||!await api?.isAdmin())return;if(dialog.open)return;draft=copy(live);dirty=false;status.textContent='';draw();dialog.showModal();}
open.onclick=edit;area.ondblclick=e=>{if(!e.target.closest('button')&&window.SUY_IS_ADMIN)edit();};
function addFiles(files){if(busy)return;const available=target?1:40-draft.items.length;const valid=[...files].filter(f=>['image/png','image/jpeg','image/webp','image/gif'].includes(f.type)&&f.size<=10*1024*1024);status.textContent=valid.length!==files.length?'Use PNG, JPG, WebP or GIF, up to 10 MB each.':valid.length>available?'Up to 40 photos.':'';for(const f of valid.slice(0,available)){const item=target?draft.items.find(i=>i.id===target):{id:crypto.randomUUID(),alt:f.name.replace(/\.[^.]+$/,'')};if(!item)break;cleanup(item.id);const url=URL.createObjectURL(f);pending.set(item.id,{file:f,url});item.src=url;if(!target)draft.items.push(item);dirty=true;}target=null;draw();}
file.onchange=()=>addFiles(file.files);
dialog.ondragover=e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();};dialog.ondrop=e=>{if(e.dataTransfer.files.length){e.preventDefault();target=null;addFiles(e.dataTransfer.files);}};
dialog.addEventListener('click',async e=>{
 const button=e.target.closest('button[data-action]'),action=button?.dataset.action;if(!action||busy)return;
 if(action==='close')return close();
 if(action==='add'||action==='replace'){target=action==='replace'?button.closest('li').dataset.id:null;file.multiple=!target;file.value='';file.click();return;}
 if(action==='save'){
  busy=true;dialog.querySelectorAll('button,input').forEach(el=>el.disabled=true);status.textContent='Saving photos…';
  try{if(!await api.isAdmin())throw Error('Admin login required.');const latest=await api.loadContent(key);if((latest?.revision||'')!==draft.revision)throw Error('Photos changed in another tab. Reopen this editor before saving.');const next=copy(draft);for(const item of next.items){const v=pending.get(item.id);if(v)item.src=v.saved||(v.saved=await api.uploadPublic(v.file,'home-photos'));}next.revision=crypto.randomUUID();await api.saveContent(key,next);live=normalize(next);paint();dirty=false;dialog.close();}
  catch(error){status.textContent=error.message;}finally{busy=false;dialog.querySelectorAll('button,input').forEach(el=>el.disabled=false);draw();}return;
 }
 const id=button.closest('li')?.dataset.id,i=draft.items.findIndex(v=>v.id===id);if(i<0)return;
 if(action==='remove'){cleanup(id);draft.items.splice(i,1);}else{const j=i+(action==='up'?-1:1);if(j<0||j>=draft.items.length)return;[draft.items[i],draft.items[j]]=[draft.items[j],draft.items[i]];}dirty=true;draw();
});
document.addEventListener('suyoon-admin-state',e=>{open.hidden=!e.detail.admin||!loaded;});
try{if(!api)throw Error('Photo gallery unavailable.');await window.SUY_SITE_READY;let data=await api.loadContent(key);if(!data){const old=await api.loadContent('cargo-home-artwork');data={items:old?.items||[1,2,3,4].map(i=>({id:'original-'+i,src:'assets/cargo-cat-'+i+(i===4?'.jpg':'.png'),alt:'Umi drawing '+i}))};}live=normalize(data);paint();loaded=true;open.hidden=!window.SUY_IS_ADMIN;}
catch(error){document.querySelector('#home-photo-load-status').textContent='Photos could not load. Please refresh.';console.warn(error);}
})();

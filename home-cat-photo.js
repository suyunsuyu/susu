(async()=>{
'use strict';
const api=window.SUY_ADMIN,area=document.querySelector('.home-photo-area'),grid=document.querySelector('#home-photo-grid'),open=document.querySelector('#home-photos-open'),key='home-cat-mouth-photo';
const safe=src=>typeof src==='string'&&(/^https:\/\//i.test(src)||/^assets\/cargo-cat-[1-4]\.(png|jpg)$/.test(src));
const scaleValue=value=>Number.isFinite(Number(value))?Math.max(20,Math.min(160,Number(value))):100;
const horizontalValue=value=>Math.max(-50,Math.min(50,Number(value)||0));
const normalize=value=>({revision:value?.revision||'',items:(Array.isArray(value?.items)?value.items:[]).filter(i=>i&&safe(i.src)).slice(0,1).map(i=>({id:String(i.id||crypto.randomUUID()),src:i.src,alt:String(i.alt||'').slice(0,160),displaySize:scaleValue(i.displaySize),horizontalOffset:horizontalValue(i.horizontalOffset)}))});
const copy=v=>JSON.parse(JSON.stringify(v));
let live={items:[],revision:''},draft,dirty=false,busy=false,target=null,loaded=false;
const pending=new Map();
function photoFrame(item){const frame=document.createElement('div');frame.className='home-photo-frame';const img=document.createElement('img');img.src=item.src;img.alt=item.alt;img.decoding='async';frame.style.width=scaleValue(item.displaySize)+'%';frame.style.setProperty('--photo-height',scaleValue(item.displaySize)+'%');frame.style.setProperty('--photo-x',horizontalValue(item.horizontalOffset)+'%');frame.append(img);return frame;}
function paint(){open.textContent=live.items.length?'EDIT PHOTO':'UPLOAD PHOTO';grid.replaceChildren(...live.items.map((item,i)=>{const frame=photoFrame(item);frame.querySelector('img').loading=i<4?'eager':'lazy';return frame;}));}
const dialog=document.createElement('dialog');dialog.id='home-photo-editor';dialog.setAttribute('aria-labelledby','home-photo-title');
dialog.innerHTML='<header><h2 id="home-photo-title">Edit homepage photo</h2><button type="button" data-action="close" aria-label="Close photo editor">×</button></header><button type="button" data-action="add">Upload photo</button><p>Upload one photo for the center of the cat’s mouth. Adjust its size and horizontal position below.</p><ul id="home-photo-list"></ul><footer><span id="home-photo-save-status" role="status"></span><button type="button" data-action="close">Cancel</button><button type="button" data-action="save">Save photo</button></footer><input id="home-photo-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>';
document.body.append(dialog);
const list=dialog.querySelector('ul'),status=dialog.querySelector('[role=status]'),file=dialog.querySelector('[type=file]');
function draw(){dialog.querySelector('[data-action=add]').textContent=draft.items.length?'Replace photo':'Upload photo';list.replaceChildren(...draft.items.map((item,i)=>{const row=document.createElement('li');row.dataset.id=item.id;const frame=photoFrame(item);const img=frame.querySelector('img');const body=document.createElement('div'),label=document.createElement('label'),input=document.createElement('input');label.textContent='Photo '+(i+1)+' description';input.value=item.alt;input.maxLength=160;input.oninput=()=>{item.alt=input.value;dirty=true;};label.append(input);body.append(label);
const zoom=document.createElement('div');zoom.className='home-photo-zoom';const zoomLabel=document.createElement('label'),range=document.createElement('input'),output=document.createElement('output');range.type='range';range.min='20';range.max='160';range.step='5';range.value=scaleValue(item.displaySize);range.id='home-zoom-'+i;zoomLabel.htmlFor=range.id;zoomLabel.textContent='Photo size ';output.textContent=range.value+'%';zoomLabel.append(output);zoom.append(zoomLabel);
const zoomActions=document.createElement('div');zoomActions.className='home-photo-zoom-actions';
function updateScale(value){if(busy)return;item.displaySize=scaleValue(value);range.value=item.displaySize;output.textContent=item.displaySize+'%';frame.style.width=item.displaySize+'%';frame.style.setProperty('--photo-height',item.displaySize+'%');dirty=true;}
for(const [text,label,change] of [['−','Zoom out',-10],['+','Zoom in',10],['100%','Reset zoom',0]]){const button=document.createElement('button');button.type='button';button.textContent=text;button.setAttribute('aria-label',label+' photo '+(i+1));button.onclick=()=>updateScale(change?scaleValue(item.displaySize)+change:100);zoomActions.append(button);}range.oninput=()=>updateScale(range.value);zoomActions.insertBefore(range,zoomActions.children[1]);zoom.append(zoomActions);body.append(zoom);
const position=document.createElement('div');
position.className='home-photo-zoom';
const positionLabel=document.createElement('label'), positionRange=document.createElement('input'), positionOutput=document.createElement('output');
positionRange.type='range';positionRange.min='-50';positionRange.max='50';positionRange.step='1';
positionRange.id='home-position-'+i;positionRange.value=horizontalValue(item.horizontalOffset);
positionLabel.htmlFor=positionRange.id;positionLabel.textContent='Horizontal position ';
positionOutput.textContent=positionRange.value+'%';positionLabel.append(positionOutput);
const positionActions=document.createElement('div');positionActions.className='home-photo-zoom-actions';
const resetPosition=document.createElement('button');resetPosition.type='button';resetPosition.textContent='Center';
function updatePosition(value){
 if(busy)return;
 item.horizontalOffset=horizontalValue(value);positionRange.value=item.horizontalOffset;
 positionOutput.textContent=item.horizontalOffset+'%';frame.style.setProperty('--photo-x',positionOutput.textContent);
 grid.querySelector('.home-photo-frame')?.style.setProperty('--photo-x',positionOutput.textContent);
 dirty=true;
}
positionRange.oninput=()=>updatePosition(positionRange.value);
resetPosition.onclick=()=>updatePosition(0);
positionActions.append(positionRange,resetPosition);
position.append(positionLabel,positionActions);body.append(position);
const actions=document.createElement('div');actions.className='photo-actions';for(const [action,text] of [['remove','Remove']]){const b=document.createElement('button');b.type='button';b.dataset.action=action;b.textContent=text;if(action==='up'||action==='down'){b.setAttribute('aria-label',action==='up'?'Move earlier':'Move later');b.disabled=action==='up'?i===0:i===draft.items.length-1;}actions.append(b);}body.append(actions);row.append(frame,body);return row;}));}
function cleanup(id){const v=pending.get(id);if(v){URL.revokeObjectURL(v.url);pending.delete(id);}}
function close(){if(!busy&&(!dirty||confirm('Discard unsaved photo changes?')))dialog.close();}
dialog.oncancel=e=>{e.preventDefault();close();};dialog.onclose=()=>{for(const id of pending.keys())cleanup(id);paint();};
async function edit(){if(dialog.open||!loaded||!await api?.isAdmin())return;if(dialog.open)return;draft=copy(live);dirty=false;status.textContent='';draw();dialog.showModal();}
open.onclick=edit;area.ondblclick=e=>{if(!e.target.closest('button')&&window.SUY_IS_ADMIN)edit();};
function addFiles(files){if(busy)return;const valid=[...files].filter(f=>['image/png','image/jpeg','image/webp','image/gif'].includes(f.type)&&f.size<=10*1024*1024);if(!valid.length){status.textContent='Use PNG, JPG, WebP or GIF, up to 10 MB.';return;}status.textContent=files.length>1?'Only one photo is allowed. The first valid photo was selected.':'';const f=valid[0],item=draft.items[0]||{id:crypto.randomUUID(),displaySize:100,alt:''};cleanup(item.id);const url=URL.createObjectURL(f);pending.set(item.id,{file:f,url});item.src=url;item.alt=f.name.replace(/\.[^.]+$/,'');item.displaySize=100;draft.items=[item];dirty=true;target=null;draw();}
file.onchange=()=>addFiles(file.files);
dialog.ondragover=e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();};dialog.ondrop=e=>{if(e.dataTransfer.files.length){e.preventDefault();target=null;addFiles(e.dataTransfer.files);}};
dialog.addEventListener('click',async e=>{
 const button=e.target.closest('button[data-action]'),action=button?.dataset.action;if(!action||busy)return;
 if(action==='close')return close();
 if(action==='add'||action==='replace'){target=null;file.multiple=false;file.value='';file.click();return;}
 if(action==='save'){
  busy=true;dialog.querySelectorAll('button,input').forEach(el=>el.disabled=true);status.textContent='Saving photos…';
  try{if(!await api.isAdmin())throw Error('Admin login required.');const latest=await api.loadContent(key);if((latest?.revision||'')!==draft.revision)throw Error('Photos changed in another tab. Reopen this editor before saving.');const next=copy(draft);for(const item of next.items){const v=pending.get(item.id);if(v)item.src=v.saved||(v.saved=await api.uploadPublic(v.file,'home-photos'));}next.revision=crypto.randomUUID();await api.saveContent(key,next);live=normalize(next);paint();dirty=false;dialog.close();}
  catch(error){status.textContent=error.message;}finally{busy=false;dialog.querySelectorAll('button,input').forEach(el=>el.disabled=false);draw();}return;
 }
 const id=button.closest('li')?.dataset.id,i=draft.items.findIndex(v=>v.id===id);if(i<0)return;
 if(action==='remove'){cleanup(id);draft.items.splice(i,1);}else{const j=i+(action==='up'?-1:1);if(j<0||j>=draft.items.length)return;[draft.items[i],draft.items[j]]=[draft.items[j],draft.items[i]];}dirty=true;draw();
});
document.addEventListener('suyoon-admin-state',e=>{open.hidden=!e.detail.admin||!loaded;});
try{if(!api)throw Error('Photo gallery unavailable.');await window.SUY_SITE_READY;const data=await api.loadContent(key);live=normalize(data);paint();loaded=true;open.hidden=!window.SUY_IS_ADMIN;}
catch(error){document.querySelector('#home-photo-load-status').textContent='Photos could not load. Please refresh.';console.warn(error);}
})();

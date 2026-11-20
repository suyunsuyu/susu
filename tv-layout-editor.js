(async()=>{
'use strict';
const api=window.SUY_ADMIN,key='umi-tv-layout',wrap=document.querySelector('.tv-positioned'),tv=document.querySelector('.retro-tv'),open=document.querySelector('#tv-layout-open');
const clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
const normalize=v=>({size:clamp(v?.size,50,140,100),x:clamp(v?.x,-220,220,0),y:clamp(v?.y,-220,220,0),fit:v?.fit==='contain'?'contain':'cover',revision:String(v?.revision||'')});
let live=normalize(null),draft=null,loaded=false,busy=false,drag=null;
const dialog=document.createElement('dialog');dialog.id='tv-layout-editor';dialog.setAttribute('aria-labelledby','tv-layout-title');dialog.innerHTML='<header><h2 id="tv-layout-title">电视大小与位置</h2><button type="button" data-layout-action="cancel" aria-label="Close TV layout editor">×</button></header><label for="tv-size">大小 <output id="tv-size-value"></output></label><input id="tv-size" type="range" min="50" max="140" step="1"><label for="tv-x">左右位置 <output id="tv-x-value"></output></label><input id="tv-x" type="range" min="-220" max="220" step="1"><label for="tv-y">上下位置 <output id="tv-y-value"></output></label><input id="tv-y" type="range" min="-220" max="220" step="1"><label for="tv-fit">屏幕显示</label><select id="tv-fit"><option value="cover">铺满弧形屏幕</option><option value="contain">完整显示图片</option></select><p>拖动电视外壳也可以移动位置。</p><footer><button type="button" data-layout-action="reset">重置</button><button type="button" data-layout-action="cancel">取消</button><button type="button" data-layout-action="save">保存</button></footer><span id="tv-layout-status" role="status"></span>';
document.body.append(dialog);const status=dialog.querySelector('[role=status]');
function apply(value){tv.style.setProperty('--tv-photo-fit',value.fit);wrap.style.transform='none';const r=wrap.getBoundingClientRect(),requested=value.size,scale=Math.min(requested/100,(innerWidth-32)/Math.max(1,r.width)),left=r.left+r.width*(1-scale)/2;const x=Math.max(16-left,Math.min(innerWidth-16-left-r.width*scale,value.x));wrap.style.transform='translate('+x+'px,'+value.y+'px) scale('+scale+')';}
function controls(){for(const prop of ['size','x','y']){dialog.querySelector('#tv-'+prop).value=draft[prop];dialog.querySelector('#tv-'+prop+'-value').textContent=draft[prop]+(prop==='size'?'%':'px');}dialog.querySelector('#tv-fit').value=draft.fit;apply(draft);}
for(const prop of ['size','x','y'])dialog.querySelector('#tv-'+prop).oninput=e=>{if(busy)return;draft[prop]=Number(e.target.value);controls();};
dialog.querySelector('#tv-fit').onchange=e=>{draft.fit=e.target.value;controls();};
function cancel(){if(busy)return;draft=null;wrap.classList.remove('is-layout-editing');apply(live);dialog.close();}
open.onclick=async()=>{if(!loaded||dialog.open||!await api.isAdmin())return;draft={...live};controls();status.textContent='';wrap.classList.add('is-layout-editing');dialog.show();};
dialog.addEventListener('cancel',e=>{e.preventDefault();cancel();});
dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();cancel();}});
dialog.addEventListener('click',async e=>{const action=e.target.closest('[data-layout-action]')?.dataset.layoutAction;if(!action||busy)return;if(action==='cancel')return cancel();if(action==='reset'){draft={...normalize(null),revision:live.revision};controls();return;}if(action==='save'){busy=true;dialog.querySelectorAll('button,input,select').forEach(e=>e.disabled=true);status.textContent='保存中…';try{if(!await api.isAdmin())throw Error('Please log in as admin.');const latest=await api.loadContent(key);if((latest?.revision||'')!==live.revision)throw Error('Layout changed in another tab. Refresh before saving.');const next={...draft,revision:crypto.randomUUID()};await api.saveContent(key,next);live=normalize(next);draft=null;apply(live);wrap.classList.remove('is-layout-editing');dialog.close();}catch(error){status.textContent=error.message;}finally{busy=false;dialog.querySelectorAll('button,input,select').forEach(e=>e.disabled=false);}}});
wrap.addEventListener('pointerdown',e=>{if(!dialog.open||busy||e.button!==0||e.target.closest('button'))return;drag={x:e.clientX,y:e.clientY,startX:draft.x,startY:draft.y};wrap.setPointerCapture(e.pointerId);e.preventDefault();});
wrap.addEventListener('pointermove',e=>{if(!drag||busy)return;draft.x=clamp(drag.startX+e.clientX-drag.x,-220,220,0);draft.y=clamp(drag.startY+e.clientY-drag.y,-220,220,0);controls();});
for(const name of ['pointerup','pointercancel','lostpointercapture'])wrap.addEventListener(name,()=>drag=null);
window.addEventListener('resize',()=>apply(draft||live));
document.addEventListener('suyoon-admin-state',e=>open.hidden=!e.detail.admin||!loaded);
apply(live);
try{await window.SUY_SITE_READY;if(!api)throw Error('TV layout unavailable.');live=normalize(await api.loadContent(key));apply(live);loaded=true;open.hidden=!window.SUY_IS_ADMIN;}catch(error){console.warn(error);}
})();

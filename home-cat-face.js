(()=>{
'use strict';
const info=document.querySelector('#cat-home-info');
document.querySelector('#cat-info-open').onclick=()=>info.showModal();
document.querySelector('#cat-info-close').onclick=()=>info.close();
info.addEventListener('click',e=>{if(e.target!==info)return;const r=info.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)info.close();});

const scene=document.querySelector('.cat-home-scene'),nav=document.querySelector('.cat-face-navigation'),pull=document.querySelector('#cat-zipper-pull');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(!scene||!nav||!pull)return;
const supportsMask=CSS.supports('mask-mode','luminance');
if(!supportsMask)return;
scene.classList.add('has-zipper-motion');
let current=0,target=0,frame=null,last=0,swing=0;
// The slider follows the existing curved seam in the illustration's coordinates.
function point(t){const u=1-t;return {x:u*u*u*1083.5+3*u*u*t*1102+3*u*t*t*1107+t*t*t*1068.5,y:u*u*u*655+3*u*u*t*792+3*u*t*t*920+t*t*t*1020};}
function draw(){const p=point(current),u=1-current,dx=3*u*u*(1102-1083.5)+6*u*current*(1107-1102)+3*current*current*(1068.5-1107),dy=3*u*u*(792-655)+6*u*current*(920-792)+3*current*current*(1020-920);const angle=Math.max(-18,Math.min(10,Math.atan2(dx,dy)*180/Math.PI-7.69+swing));pull.setAttribute('transform','translate('+(p.x-1083.5).toFixed(2)+' '+(p.y-655).toFixed(2)+') rotate('+angle.toFixed(2)+' 1083.5 655)');}
function animate(time){frame=null;const dt=Math.min(last?time-last:16,40);last=time;const previous=current;current+=(target-current)*(1-Math.exp(-dt/110));swing+=(Math.max(-3,Math.min(3,(current-previous)*95))-swing)*(1-Math.exp(-dt/80));draw();if(Math.abs(target-current)>.0001||Math.abs(swing)>.02)frame=requestAnimationFrame(animate);else{current=target;swing=0;last=0;draw();}}
function aim(clientY){if(reduced.matches)return;const r=scene.getBoundingClientRect(),y=Math.max(655,Math.min(1000,(clientY-r.top)/r.height*1254));let lo=0,hi=1;for(let i=0;i<18;i++){const mid=(lo+hi)/2;if(point(mid).y<y)lo=mid;else hi=mid;}target=(lo+hi)/2;if(frame===null)frame=requestAnimationFrame(animate);}
function rest(){target=0;if(frame===null)frame=requestAnimationFrame(animate);}
nav.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')aim(e.clientY);});
nav.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')aim(e.clientY);});
nav.addEventListener('pointerleave',()=>{const active=document.activeElement;if(nav.contains(active)&&active.matches(':focus-visible')){const r=active.getBoundingClientRect();aim(r.top+r.height/2);}else rest();});
nav.addEventListener('focusin',e=>{const r=e.target.getBoundingClientRect();aim(r.top+r.height/2);});
nav.addEventListener('focusout',()=>requestAnimationFrame(()=>{if(!nav.contains(document.activeElement))rest();}));
reduced.addEventListener('change',()=>{if(frame!==null)cancelAnimationFrame(frame);frame=null;current=target=swing=last=0;draw();});
window.addEventListener('pagehide',()=>{if(frame!==null)cancelAnimationFrame(frame);frame=null;});
draw();
})();

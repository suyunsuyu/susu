(()=>{
'use strict';
const info=document.querySelector('#cat-home-info');
document.querySelector('#cat-info-open').onclick=()=>info.showModal();
document.querySelector('#cat-info-close').onclick=()=>info.close();
info.addEventListener('click',e=>{if(e.target!==info)return;const r=info.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)info.close();});

})();

(() => {
 const clock=document.getElementById('cargo-clock');
 const format=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
 const tick=()=>{const now=new Date();clock.textContent=format.format(now);clock.dateTime=now.toISOString();};
 tick();setInterval(tick,1000);
 const motion=document.getElementById('cargo-motion-toggle'),art=document.querySelector('.cargo-artwork');
 motion.addEventListener('click',()=>{const paused=art.classList.toggle('is-paused');motion.setAttribute('aria-pressed',String(paused));motion.setAttribute('aria-label',paused?'Resume drawing movement':'Pause drawing movement');motion.textContent=paused?'▷':'Ⅱ';});
 const dialog=document.getElementById('cargo-info');
 document.getElementById('cargo-info-open').addEventListener('click',()=>dialog.showModal());
 document.getElementById('cargo-info-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
})();
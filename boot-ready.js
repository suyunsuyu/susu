(async()=>{
  try{
    const waits=[];
    if(window.SUY_SITE_READY) waits.push(window.SUY_SITE_READY);
    if(window.SUY_PAGE_EDITOR_READY) waits.push(window.SUY_PAGE_EDITOR_READY);
    if(waits.length) await Promise.allSettled(waits);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  } finally {
    document.documentElement.classList.remove('site-booting');
  }
})();

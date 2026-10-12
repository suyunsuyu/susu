(() => {
  'use strict';
  const texts=[...document.querySelectorAll('[data-umi-text]')];
  const images=[...document.querySelectorAll('[data-umi-image]')];
  const status=document.querySelector('#umi-status');
  const dialog=document.querySelector('#umi-editor');
  const input=document.querySelector('#umi-edit-text');
  const fileInput=document.querySelector('#umi-photo-file');
  let payload={},activeText=null,activeImage=null,ready=false;
  const safeImage=value=>typeof value==='string' && /^https:\/\//i.test(value);
  texts.forEach(el=>el.addEventListener('dblclick',()=>{
    if(!ready || !window.SUY_IS_ADMIN)return;
    activeText=el;input.value=el.textContent;dialog.showModal();input.focus();
  }));
  document.querySelector('#umi-edit-cancel').onclick=()=>dialog.close();
  document.querySelector('#umi-edit-form').onsubmit=e=>{
    e.preventDefault();if(!window.SUY_IS_ADMIN || !activeText)return;
    activeText.textContent=input.value;status.textContent='Unsaved changes · click SAVE PAGE';dialog.close();
  };
  images.forEach(el=>el.addEventListener('dblclick',()=>{
    if(!ready || !window.SUY_IS_ADMIN)return;activeImage=el;fileInput.value='';fileInput.click();
  }));
  fileInput.onchange=async()=>{
    const file=fileInput.files[0];if(!file || !activeImage)return;
    try{
      if(!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choose a PNG, JPEG or WebP image under 10 MB.');
      status.textContent='Uploading…';activeImage.src=await window.SUY_ADMIN.uploadPublic(file,'umi-profile');status.textContent='Image uploaded · click SAVE PAGE';
    }catch(e){status.textContent=e.message;}
  };
  document.querySelector('#umi-save').onclick=async e=>{
    if(!ready)return;const button=e.currentTarget;button.disabled=true;
    try{
      if(!await window.SUY_ADMIN.isAdmin())throw Error('Admin login required');
      const next={...payload,texts:{},images:{}};
      texts.forEach(el=>next.texts[el.dataset.umiText]=el.textContent);
      images.forEach(el=>next.images[el.dataset.umiImage]=el.getAttribute('src'));
      status.textContent='Saving…';await window.SUY_ADMIN.saveContent('umi-profile-page',next);payload=next;status.textContent='Saved';
    }catch(e){status.textContent=e.message;}finally{button.disabled=false;}
  };
  window.SUY_UMI_READY=(async()=>{
    try{
      if(window.SUY_SITE_READY)await window.SUY_SITE_READY;
      payload=await window.SUY_ADMIN.loadContent('umi-profile-page')||{};
      texts.forEach(el=>{const value=payload.texts?.[el.dataset.umiText];if(typeof value==='string')el.textContent=value;});
      images.forEach(el=>{const value=payload.images?.[el.dataset.umiImage];if(safeImage(value))el.src=value;});
      ready=true;
      if(window.SUY_IS_ADMIN)status.textContent='Double-click text or an image to edit';
    }catch(e){status.textContent='Could not load saved edits. Please refresh before editing.';console.warn('Umi page unavailable',e);}
  })();
})();

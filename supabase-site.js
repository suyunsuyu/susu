(() => {
  const cfg = window.SUPABASE_CONFIG || {};
  if (!cfg.url || !cfg.anonKey || !window.supabase?.createClient) {
    console.error('Supabase is not configured.');
    return;
  }

  const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
  const ADMIN_EMAIL = 'linken0w0@gmail.com';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  window.SUY_SUPABASE = sb;
  window.SUY_IS_ADMIN = false;
  let readyResolve;
  window.SUY_ADMIN_READY = new Promise(r => readyResolve = r);
  let readyResolved = false;
  let siteReadyResolve;
  window.SUY_SITE_READY = new Promise(r => siteReadyResolve = r);

  async function currentUser() {
    const { data } = await sb.auth.getUser();
    return data?.user || null;
  }
  async function isAdmin() {
    const user = await currentUser();
    return (user?.email || '').toLowerCase() === ADMIN_EMAIL;
  }
  async function loadContent(key) {
    const { data, error } = await sb.from('site_content').select('data').eq('key', key).maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  }
  async function saveContent(key, data) {
    if (!await isAdmin()) throw new Error('Admin login required.');
    const { error } = await sb.from('site_content').upsert({ key, data, updated_at:new Date().toISOString() }, { onConflict:'key' });
    if (error) throw error;
  }
  async function uploadPublic(file, folder='uploads') {
    if (!await isAdmin()) throw new Error('Admin login required.');
    const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-zA-Z0-9]/g,'') || 'jpg';
    const path=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error }=await sb.storage.from('site-media').upload(path,file,{upsert:false,cacheControl:'3600'});
    if(error)throw error;
    return sb.storage.from('site-media').getPublicUrl(path).data.publicUrl;
  }

  window.SUY_ADMIN = { sb, ADMIN_EMAIL, isAdmin, loadContent, saveContent, uploadPublic };


  // Robust image loader: if a public Storage URL fails in <img>, retry through
  // the Supabase Storage SDK and display the downloaded Blob instead.
  const storageBlobCache = new Map();
  function parseSupabaseStorageUrl(src='') {
    try {
      const u = new URL(src, location.href);
      if (u.origin !== new URL(cfg.url).origin) return null;
      const marker = '/storage/v1/object/public/';
      const at = u.pathname.indexOf(marker);
      if (at < 0) return null;
      const rest = u.pathname.slice(at + marker.length);
      const slash = rest.indexOf('/');
      if (slash < 1) return null;
      return { bucket: decodeURIComponent(rest.slice(0,slash)), path: decodeURIComponent(rest.slice(slash+1)) };
    } catch { return null; }
  }
  async function recoverStorageImage(img) {
    if (!(img instanceof HTMLImageElement) || img.dataset.suyoonRecovery === 'done') return false;
    const original = img.dataset.suyoonOriginalSrc || img.currentSrc || img.src || '';
    const parsed = parseSupabaseStorageUrl(original);
    if (!parsed) {
      const fallback = img.dataset.fallbackSrc;
      if (fallback && img.src !== new URL(fallback, location.href).href) {
        img.dataset.suyoonRecovery = 'done';
        img.src = fallback;
        return true;
      }
      img.classList.add('suyoon-image-failed');
      return false;
    }
    img.dataset.suyoonRecovery = 'working';
    try {
      const cacheKey = `${parsed.bucket}/${parsed.path}`;
      let blobUrl = storageBlobCache.get(cacheKey);
      if (!blobUrl) {
        const { data, error } = await sb.storage.from(parsed.bucket).download(parsed.path);
        if (error || !data) throw error || new Error('Image download failed');
        blobUrl = URL.createObjectURL(data);
        storageBlobCache.set(cacheKey, blobUrl);
      }
      img.dataset.suyoonRecovery = 'done';
      img.src = blobUrl;
      return true;
    } catch (err) {
      console.warn('Image recovery failed', original, err);
      const fallback = img.dataset.fallbackSrc;
      img.dataset.suyoonRecovery = 'done';
      if (fallback) { img.src = fallback; return true; }
      img.classList.add('suyoon-image-failed');
      return false;
    }
  }
  function prepareImage(img) {
    if (!(img instanceof HTMLImageElement)) return;
    const src = img.getAttribute('src') || '';
    if (src && !src.startsWith('blob:') && !img.dataset.suyoonOriginalSrc) img.dataset.suyoonOriginalSrc = src;
    if (!img.complete && src) img.classList.add('suyoon-image-loading');
  }
  document.addEventListener('load', e => {
    if (!(e.target instanceof HTMLImageElement)) return;
    e.target.classList.remove('suyoon-image-loading','suyoon-image-failed');
    e.target.classList.add('suyoon-image-ready');
  }, true);
  document.addEventListener('error', e => {
    if (e.target instanceof HTMLImageElement) recoverStorageImage(e.target);
  }, true);
  const imageObserver = new MutationObserver(records => records.forEach(r => {
    if (r.type === 'attributes' && r.target instanceof HTMLImageElement && r.attributeName === 'src') {
      const img=r.target, src=img.getAttribute('src')||'';
      if (!src.startsWith('blob:')) {
        img.dataset.suyoonOriginalSrc=src;
        if (img.dataset.suyoonRecovery === 'done') delete img.dataset.suyoonRecovery;
      }
      prepareImage(img);
    }
    r.addedNodes?.forEach(n => {
      if (n instanceof HTMLImageElement) prepareImage(n);
      if (n.querySelectorAll) n.querySelectorAll('img').forEach(prepareImage);
    });
  }));
  imageObserver.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
  document.querySelectorAll('img').forEach(prepareImage);
  window.SUY_RECOVER_IMAGE = recoverStorageImage;

  function authUI() {
    if ($('#admin-auth-button')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <button id="admin-auth-button" class="admin-auth-button" type="button">ADMIN LOGIN</button>
      <dialog id="admin-auth-dialog" class="admin-auth-dialog">
        <form id="admin-auth-form" class="admin-auth-card">
          <div class="admin-auth-head"><strong>ADMIN</strong><button id="admin-auth-close" type="button">×</button></div>
          <p class="admin-auth-note">Sign in to edit this website.</p>
          <label>EMAIL<input id="admin-auth-email" type="email" value="${ADMIN_EMAIL}" readonly></label>
          <label>PASSWORD<input id="admin-auth-password" type="password" autocomplete="current-password" required></label>
          <p id="admin-auth-status"></p>
          <button class="black" type="submit">LOG IN</button>
        </form>
      </dialog>`);
    const dlg=$('#admin-auth-dialog');
    $('#admin-auth-button').onclick=async()=>{
      if(await isAdmin()){
        if(confirm('Log out of admin mode?')){await sb.auth.signOut();await refreshAdminState();location.reload()}
      }else{
        $('#admin-auth-status').textContent='';
        $('#admin-auth-password').value='';
        dlg.showModal();
        setTimeout(()=>$('#admin-auth-password').focus(),50);
      }
    };
    $('#admin-auth-close').onclick=()=>dlg.close();
    dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});
    $('#admin-auth-form').onsubmit=async e=>{
      e.preventDefault();
      const status=$('#admin-auth-status');status.textContent='LOGGING IN...';
      const {error}=await sb.auth.signInWithPassword({email:ADMIN_EMAIL,password:$('#admin-auth-password').value});
      if(error){status.textContent='LOGIN FAILED: '+error.message;return}
      if(!await isAdmin()){await sb.auth.signOut();status.textContent='THIS ACCOUNT IS NOT AN ADMIN.';return}
      dlg.close();await refreshAdminState();location.reload();
    };
  }

  async function refreshAdminState(){
    const admin=await isAdmin();
    window.SUY_IS_ADMIN=admin;
    document.body.classList.toggle('supabase-admin',admin);
    $$('[data-admin-only]').forEach(el=>el.hidden=!admin);
    // Defense-in-depth: these editing controls are never shown to visitors even if older HTML is cached.
    $$('#edit-button,#edit-covers,#edit-diary,#new-album,#message-manage,#message-delete').forEach(el=>{ if(el) el.hidden=!admin; });
    const b=$('#admin-auth-button');if(b)b.textContent=admin?'ADMIN MODE · LOG OUT':'ADMIN LOGIN';
    if(!readyResolved){readyResolved=true;readyResolve(admin)}
    document.dispatchEvent(new CustomEvent('suyoon-admin-state',{detail:{admin}}));
    return admin;
  }

  async function initGuestbook(){
    if(!$('#message-form'))return;
    const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
    const rnd=(seed,n)=>{let x=(seed+n*2654435761)>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967295};
    const dialog=$('#message-dialog');
    const fontMap={sans:"'Noto Sans SC',sans-serif",serif:'var(--serif)',hand:"'Caveat',cursive",cute:"'Gaegu','Nanum Pen Script',cursive",mono:'var(--mono)'};
    const cleanStyle=s=>{s=s||{};const size=Math.max(10,Math.min(48,Number(s.size)||16));return{font:fontMap[s.font]?s.font:'sans',size,color:/^#[0-9a-f]{6}$/i.test(s.color||'')?s.color:'#111111'}};
    async function uploadGuestFile(file,folder='images'){
      if(!file)return'';if(file.size>5*1024*1024)throw new Error('Image must be under 5MB.');
      const ext=(file.name?.split('.').pop()||'png').replace(/[^a-zA-Z0-9]/g,'')||'png',path=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const {error}=await sb.storage.from('guestbook-media').upload(path,file,{upsert:false,cacheControl:'3600'});if(error)throw error;
      return sb.storage.from('guestbook-media').getPublicUrl(path).data.publicUrl;
    }
    async function uploadCanvas(canvas){
      if(!canvas||canvas.dataset.empty!=='false')return'';
      const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));return uploadGuestFile(new File([blob],'drawing.png',{type:'image/png'}),'drawings');
    }
    async function fetchMessages(includePrivate=false){let q=sb.from('guestbook_messages').select('*').order('created_at',{ascending:false});if(!includePrivate)q=q.eq('is_private',false);const{data,error}=await q;if(error)throw error;return data||[]}
    function openMessage(x,index,total){
      $('#message-dialog-name').textContent=x.name||'ANONYMOUS';$('#message-dialog-date').textContent=new Date(x.created_at).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
      const text=$('#message-dialog-text'),st=cleanStyle(x.text_style);text.textContent=x.message||'';text.style.fontFamily=fontMap[st.font];text.style.fontSize=`${st.size}px`;text.style.color=st.color;
      const image=$('#message-dialog-image'),drawing=$('#message-dialog-drawing');
      if(x.media_url){image.src=x.media_url;image.hidden=false}else{image.hidden=true;image.removeAttribute('src')}
      if(x.drawing_url){drawing.src=x.drawing_url;drawing.hidden=false}else{drawing.hidden=true;drawing.removeAttribute('src')}
      $('#message-dialog-index').textContent=`CAT FOOD ${index+1} / ${total}`;$('#message-delete').dataset.id=x.id;dialog.showModal();
    }
    async function render(){const layer=$('#kibble-layer');if(!layer)return;try{const xs=await fetchMessages(false);layer.innerHTML='';xs.forEach((x,i)=>{const seed=hash(x.id+(x.message||'')),angle=rnd(seed,1)*Math.PI*2,rad=Math.sqrt(rnd(seed,2))*.86,px=50+Math.cos(angle)*rad*39,py=54+Math.sin(angle)*rad*28,rot=Math.round(rnd(seed,3)*34-17),scale=(.84+rnd(seed,4)*.56).toFixed(2),b=document.createElement('button');b.type='button';b.className=`kibble sketch-kibble kibble-v${(i%4)+1}`+(i===0?' grain-pop':'');b.setAttribute('aria-label',`Message from ${x.name||'anonymous'}`);b.style.setProperty('--x',`${px}%`);b.style.setProperty('--y',`${py}%`);b.style.setProperty('--r',`${rot}deg`);b.style.setProperty('--s',scale);b.onclick=()=>openMessage(x,i,xs.length);layer.appendChild(b)});$('#empty-bowl-note').style.display=xs.length?'none':'block';$('#bowl-count').textContent=`${xs.length} CAT FOOD`}catch(err){console.error(err);$('#form-status').textContent='COULD NOT LOAD MESSAGES.'}}

    const canvas=$('#message-drawing-canvas');
    if(canvas){
      canvas.dataset.empty='true';const ctx=canvas.getContext('2d');ctx.lineCap='round';ctx.lineJoin='round';let drawing=false,last=null;
      const pos=e=>{const r=canvas.getBoundingClientRect(),p=e.touches?.[0]||e;return{x:(p.clientX-r.left)*canvas.width/r.width,y:(p.clientY-r.top)*canvas.height/r.height}};
      const start=e=>{drawing=true;last=pos(e);e.preventDefault()};const move=e=>{if(!drawing)return;const q=pos(e);ctx.strokeStyle=$('#message-draw-color').value;ctx.lineWidth=Number($('#message-draw-width').value)||4;ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(q.x,q.y);ctx.stroke();last=q;canvas.dataset.empty='false';e.preventDefault()};const end=()=>{drawing=false;last=null};
      canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointermove',move);window.addEventListener('pointerup',end);
      $('#message-draw-clear').onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);canvas.dataset.empty='true'};
      $('#toggle-message-drawing').onclick=()=>{const panel=$('#message-drawing-panel');panel.hidden=!panel.hidden;$('#toggle-message-drawing').textContent=panel.hidden?'DRAW SOMETHING ↘':'HIDE DRAWING ↗'};
    }
    $('#message-form').onsubmit=async e=>{
      e.preventDefault();const message=$('#message-body').value.trim();if(!message)return;
      $('#form-status').textContent='SAVING...';
      try{
        const file=$('#message-image').files?.[0];const media_url=file?await uploadGuestFile(file,'images'):'';const drawing_url=await uploadCanvas(canvas);
        const payload={name:$('#message-name').value.trim(),message,is_private:$('#message-private').checked,media_url,drawing_url,text_style:cleanStyle({font:$('#message-font').value,size:$('#message-size').value,color:$('#message-color').value})};
        const{error}=await sb.from('guestbook_messages').insert(payload);if(error)throw error;
        e.target.reset();if(canvas){canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);canvas.dataset.empty='true'}$('#message-color').value='#111111';$('#message-font').value='sans';$('#message-size').value='16';
        $('#form-status').textContent=payload.is_private?'PRIVATE NOTE SAVED.':'A NEW CAT FOOD DROPPED.';await render();setTimeout(()=>$('#form-status').textContent='',2200);
      }catch(err){$('#form-status').textContent='SAVE FAILED: '+err.message}
    };
    $('#message-dialog-close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
    $('#message-delete').onclick=async()=>{if(!await isAdmin())return;const id=$('#message-delete').dataset.id;if(!id||!confirm('Delete this message?'))return;const{error}=await sb.from('guestbook_messages').delete().eq('id',id);if(error){alert(error.message);return}dialog.close();await render()};
    const managerDialog=$('#message-manager-dialog');
    async function renderManager(){if(!await isAdmin())return;const root=$('#message-manager-list'),xs=await fetchMessages(true);root.innerHTML=xs.length?xs.map(x=>`<div class="message-manager-row"><div><strong>${esc(x.name||'ANONYMOUS')}</strong> <small>${x.is_private?'PRIVATE':'PUBLIC'} · ${esc(new Date(x.created_at).toLocaleDateString())}</small><p>${esc(x.message||'')}</p></div><button type="button" data-delete-message="${esc(x.id)}">DELETE</button></div>`).join(''):'<div class="message-manager-empty">NO MESSAGES YET.</div>';root.querySelectorAll('[data-delete-message]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this message?'))return;const{error}=await sb.from('guestbook_messages').delete().eq('id',b.dataset.deleteMessage);if(error){alert(error.message);return}await render();await renderManager()})}
    $('#message-manage').onclick=async()=>{if(!await isAdmin())return;await renderManager();managerDialog.showModal()};$('#message-manager-close').onclick=()=>managerDialog.close();managerDialog.addEventListener('click',e=>{if(e.target===managerDialog)managerDialog.close()});
    await render();
  }

  const applyTextStyle=(el,s={})=>{
    if(!el)return;
    el.className=el.className.split(' ').filter(x=>!x.startsWith('font-')&&!x.startsWith('size-')&&x!=='is-bold').concat(`font-${s.font||'sans'}`,`size-${s.size||'normal'}`,s.bold?'is-bold':'').join(' ');
    if(/^#[0-9a-f]{6}$/i.test(s.color||''))el.style.color=s.color;
    else el.style.removeProperty('color');
  };
  async function initProfile(){
    if(!$('#profile-name'))return;
    let profile=await loadContent('profile').catch(()=>null);
    const clampScale=v=>Math.max(10,Math.min(160,Number(v)||100));
    const render=()=>{
      if(!profile)return;
      $('#profile-name').textContent=profile.name||'';
      $('#profile-info').textContent=profile.info||'';
      $('#profile-statement').innerHTML=String(profile.statement||'').split('\n\n').map(x=>`<p>${esc(x)}</p>`).join('');
      if(profile.styles){applyTextStyle($('#profile-name'),profile.styles.name);applyTextStyle($('#profile-info'),profile.styles.info);applyTextStyle($('#profile-statement'),profile.styles.statement)}
      const img=$('#profile-image'),empty=$('#profile-photo-empty');
      if(profile.image){
        img.src=profile.image;img.hidden=false;if(empty)empty.hidden=true;
        const scale=clampScale(profile.photoScale ?? ({small:60,normal:85,large:100}[profile.photoSize]||100));
        img.style.setProperty('width',`${scale}%`,'important');img.style.setProperty('max-width','none','important');img.style.setProperty('max-height','none','important');img.style.setProperty('object-fit','contain','important');
      }else{img.hidden=true;if(empty)empty.hidden=false}
    };
    render();
    if(!$('#edit-button'))return;
    const syncScale=(fromNumber=false)=>{
      const r=$('#edit-photo-scale'),n=$('#edit-photo-scale-number');if(!r||!n)return;
      const v=clampScale(fromNumber?n.value:r.value);r.value=v;n.value=v;
    };
    $('#edit-photo-scale')?.addEventListener('input',()=>syncScale(false));
    $('#edit-photo-scale-number')?.addEventListener('input',()=>syncScale(true));
    const syncTextColor=(unit,fromHex=false)=>{
      const picker=$(`#${unit}-color`),hex=$(`#${unit}-color-hex`);if(!picker||!hex)return;
      if(fromHex){if(/^#[0-9a-f]{6}$/i.test(hex.value))picker.value=hex.value}
      else hex.value=picker.value.toUpperCase();
    };
    ['name','info','statement'].forEach(unit=>{
      $(`#${unit}-color`)?.addEventListener('input',()=>syncTextColor(unit,false));
      $(`#${unit}-color-hex`)?.addEventListener('input',()=>syncTextColor(unit,true));
    });
    $('#edit-button').onclick=()=>{
      profile=profile||{name:'',info:'',statement:'',image:'',photoScale:100,styles:{}};
      $('#edit-name').value=profile.name||'';$('#edit-info').value=profile.info||'';$('#edit-statement').value=profile.statement||'';
      const scale=clampScale(profile.photoScale ?? ({small:60,normal:85,large:100}[profile.photoSize]||100));
      if($('#edit-photo-scale'))$('#edit-photo-scale').value=scale;if($('#edit-photo-scale-number'))$('#edit-photo-scale-number').value=scale;
      ['name','info','statement'].forEach(u=>{const st=profile.styles?.[u]||{font:'sans',size:'normal',bold:false,color:'#161616'},color=/^#[0-9a-f]{6}$/i.test(st.color||'')?st.color:'#161616';if($(`#${u}-font`))$(`#${u}-font`).value=st.font;if($(`#${u}-size`))$(`#${u}-size`).value=st.size;if($(`#${u}-bold`))$(`#${u}-bold`).checked=!!st.bold;if($(`#${u}-color`))$(`#${u}-color`).value=color;if($(`#${u}-color-hex`))$(`#${u}-color-hex`).value=color.toUpperCase()});
      $('#editor').showModal();
    };
    $('#save-profile').onclick=async()=>{
      if(!await isAdmin())return;
      try{
        let image=profile?.image||'';const file=$('#edit-image').files?.[0];if(file)image=await uploadPublic(file,'profile');
        profile={name:$('#edit-name').value,info:$('#edit-info').value,statement:$('#edit-statement').value,photoScale:clampScale($('#edit-photo-scale-number')?.value||100),image,styles:{}};
        ['name','info','statement'].forEach(u=>{const entered=$(`#${u}-color-hex`)?.value||'',color=/^#[0-9a-f]{6}$/i.test(entered)?entered.toUpperCase():($(`#${u}-color`)?.value||'#161616').toUpperCase();profile.styles[u]={font:$(`#${u}-font`)?.value||'sans',size:$(`#${u}-size`)?.value||'normal',bold:!!$(`#${u}-bold`)?.checked,color}});
        await saveContent('profile',profile);render();$('#editor').close();
      }catch(err){alert('SAVE FAILED: '+err.message)}
    };
  }

  async function initCovers(){
    if(!$('#cover-photo'))return;let covers=await loadContent('covers').catch(()=>null)||{};
    const set=(img,src,empty)=>{if(src){img.src=src;img.hidden=false;if(empty)empty.hidden=true}else{img.removeAttribute('src');img.hidden=true;if(empty)empty.hidden=false}};
    const render=()=>{set($('#cover-photo'),covers.photo,$('#cover-photo-empty'));set($('#cover-drawing'),covers.drawing,$('#cover-drawing-empty'));set($('#photo-cover-preview'),covers.photo,null);set($('#drawing-cover-preview'),covers.drawing,null)};render();
    $('#edit-covers').onclick=()=>{$('#cover-editor').hidden=false;render();$('#cover-editor').scrollIntoView({behavior:'smooth'})};$('#close-cover-editor').onclick=()=>$('#cover-editor').hidden=true;
    $('#save-covers').onclick=async()=>{if(!await isAdmin())return;try{const pf=$('#photo-cover-file').files?.[0],df=$('#drawing-cover-file').files?.[0];if(pf)covers.photo=await uploadPublic(pf,'covers');if(df)covers.drawing=await uploadPublic(df,'covers');await saveContent('covers',covers);render();$('#cover-editor').hidden=true;$('#cover-status').textContent='SAVED TO SUPABASE'}catch(err){alert('SAVE FAILED: '+err.message)}};
    $('#reset-covers').onclick=async()=>{if(!await isAdmin()||!confirm('Remove both cover images?'))return;covers={};await saveContent('covers',covers);render()};
  }

  async function initDiary(){
    if(!$('#diary-main-trigger'))return;
    let payload=await loadContent('diary').catch(()=>null)||{items:[]};let items=Array.isArray(payload.items)?payload.items:[];
    const fontMap={serif:'var(--serif)',sans:'var(--sans)',mono:'var(--mono)',cormorant:"'Cormorant Garamond',serif",bodoni:"'Bodoni Moda',serif",hand:"'Caveat',cursive",cute:"'Gaegu','Nanum Pen Script',cursive",pen:"'Nanum Pen Script',cursive",clean:"'Quicksand',sans-serif",modern:"'Josefin Sans',sans-serif"};
    const normalizedStyle=s=>{s=s||{};const font=fontMap[s.font]?s.font:'serif',n=Number(s.size),size=Number.isFinite(n)&&n>=10&&n<=96?String(n):'',color=/^#[0-9a-f]{6}$/i.test(s.color||'')?s.color:'#111111';return{font,size,color}};
    const styleAttr=s=>{const v=normalizedStyle(s),parts=[`font-family:${fontMap[v.font]}`];if(v.size)parts.push(`font-size:${v.size}px`);if(v.color)parts.push(`color:${v.color}`);return parts.join(';')};
    const dateList=$('#diary-date-list'),detail=$('#diary-detail'),trigger=$('#diary-main-trigger');
    const renderDates=()=>{dateList.innerHTML=items.length?items.map((x,i)=>`<button type="button" class="diary-date-button" data-diary-index="${i}">${esc(x.date||'UNDATED')}</button>`).join(''):'<p class="diary-empty">NO DIARY ENTRIES YET.</p>';$$('[data-diary-index]',dateList).forEach(b=>b.onclick=()=>showDetail(Number(b.dataset.diaryIndex)))};
    const showDetail=i=>{const x=items[i];if(!x)return;detail.innerHTML=`<article class="diary-reading-entry">${x.image?`<img src="${esc(x.image)}" alt="diary photo">`:''}<small>${esc(x.date||'')}</small><p style="${styleAttr(x.style)}">${esc(x.text||'').replace(/\n/g,'<br>')}</p></article>`;detail.hidden=false;detail.scrollIntoView({behavior:'smooth',block:'start'})};
    trigger.onclick=()=>{dateList.hidden=!dateList.hidden;trigger.setAttribute('aria-expanded',String(!dateList.hidden));trigger.querySelector('span').textContent=dateList.hidden?'OPEN DIARY ↘':'CLOSE DIARY ↗';if(!dateList.hidden)renderDates()};
    const manager=()=>{$('#diary-manager').innerHTML=items.map((x,i)=>`<div class="diary-row"><span>${esc(x.date||'UNTITLED')}</span><button type="button" data-remove="${i}">×</button></div>`).join('');$$('[data-remove]',$('#diary-manager')).forEach(b=>b.onclick=()=>{items.splice(Number(b.dataset.remove),1);manager();renderDates()})};
    const readStyleControls=()=>normalizedStyle({font:$('#diary-font')?.value||'serif',size:$('#diary-size')?.value||'',color:$('#diary-color')?.value||'#111111'});
    const updatePreview=()=>{const preview=$('#diary-style-preview');if(!preview)return;const s=readStyleControls();preview.textContent=$('#diary-text')?.value||'Write here…';preview.style.fontFamily=fontMap[s.font];preview.style.fontSize=s.size?`${s.size}px`:'';preview.style.color=s.color};
    const syncColor=(fromHex=false)=>{const picker=$('#diary-color'),hex=$('#diary-color-hex');if(!picker||!hex)return;if(fromHex){if(/^#[0-9a-f]{6}$/i.test(hex.value)){picker.value=hex.value;updatePreview()}}else{hex.value=picker.value;updatePreview()}};
    const resetComposer=()=>{$('#diary-date').value='';$('#diary-text').value='';$('#diary-image').value='';$('#diary-font').value='serif';$('#diary-size').value='';$('#diary-color').value='#111111';$('#diary-color-hex').value='#111111';updatePreview()};
    ['diary-text','diary-font','diary-size'].forEach(id=>$('#'+id)?.addEventListener('input',updatePreview));$('#diary-color')?.addEventListener('input',()=>syncColor(false));$('#diary-color-hex')?.addEventListener('input',()=>syncColor(true));updatePreview();
    $('#edit-diary').onclick=()=>{manager();updatePreview();$('#diary-dialog').showModal()};
    $('#close-diary-editor').onclick=()=>$('#diary-dialog').close();
    $('#new-diary-entry').onclick=async()=>{if(!await isAdmin())return;try{const text=$('#diary-text').value.trim();if(!text){alert('Please write something first.');return}const f=$('#diary-image').files?.[0];let image='';if(f)image=await uploadPublic(f,'diary');items.unshift({date:$('#diary-date').value,text,image,style:readStyleControls()});resetComposer();manager();renderDates()}catch(err){alert('UPLOAD FAILED: '+err.message)}};
    $('#save-diary').onclick=async()=>{if(!await isAdmin())return;try{await saveContent('diary',{items});renderDates();$('#diary-dialog').close()}catch(err){alert('SAVE FAILED: '+err.message)}};
    renderDates();
  }

  async function init(){
    try{
      authUI();await refreshAdminState();
      await Promise.allSettled([initGuestbook(),initProfile(),initCovers(),initDiary()]);
    } finally {
      siteReadyResolve?.(true);
    }
  }
  sb.auth.onAuthStateChange(()=>refreshAdminState());
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

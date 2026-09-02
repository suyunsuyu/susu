(() => {
  const $ = selector => document.querySelector(selector);
  const overlay = $('#room-content');
  if (!overlay) return;
  const body = $('#room-content-body');
  const back = $('#room-content-back');
  const indexLabel = $('#room-content-index');
  const lightbox = $('#room-photo-lightbox');
  const api = window.SUY_ADMIN;
  const sb = api?.sb;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let activeKey = '';
  let activeAlbum = null;
  let lightboxItems = [];
  let lightboxIndex = 0;

  const titles = {
    tv:'MY WORKS', camera:'PHOTOGRAPHS', cat:'MY CAT', calendar:'MEMORIES', music:'MY MUSIC', telephone:'GUESTBOOK',
    flowers:'MY FAVORITE FLOWERS', books:'MY BOOKS', trophy:'EDUCATION / ARCHIVE',
    diary:'ABOUT ME', artwork:'MY ART'
  };
  const types = { tv:'works',cat:'cat',calendar:'calendar',music:'music',flowers:'flowers',books:'books',trophy:'education',diary:'profile',artwork:'artwork',telephone:'guestbook' };
  const emptyText = {
    tv:'作品正在整理中。这里以后会保存设计、项目、视频和创作。',
    cat:'小猫的照片、生日、品种和故事会保存在这里。',
    calendar:'生日与值得记住的日期会在这里留下细小的记号。',
    music:'这里会播放我喜欢的音乐，以及我喜欢它们的原因。',
    flowers:'喜欢的花、照片和它们的故事会慢慢长在这里。',
    books:'这里会收藏书名、作者、评分和我的短评。',
    trophy:'大学、专业和学习经历会作为个人档案保存在这里。',
    diary:'姓名、性格、MBTI、理想和想做的事情。',
    artwork:'墙上的画会替换成我真正的作品。',
    telephone:'留言板上的字会在这里留下；也可以打开留言页写下新的话。'
  };

  const openOverlay = key => {
    activeKey = key;
    activeAlbum = null;
    indexLabel.textContent = titles[key] || 'MY ROOM';
    back.hidden = true;
    overlay.classList.remove('is-open');
    try {
      if (!overlay.open) overlay.showModal();
    } catch {
      overlay.setAttribute('open','');
    }
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    overlay.setAttribute('aria-hidden','false');
    document.body.classList.add('room-content-open');
    render(key);
  };
  const closeOverlay = () => {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('room-content-open');
    document.dispatchEvent(new CustomEvent('room-content-closed'));
    document.dispatchEvent(new CustomEvent('room-record-playing',{detail:{playing:false}}));
    if (overlay.open) overlay.close();
    body.querySelectorAll('audio').forEach(audio=>audio.pause());
  };
  $('#room-content-close').addEventListener('click',closeOverlay);
  overlay.addEventListener('click',event=>{if(event.target===overlay)closeOverlay()});
  overlay.addEventListener('cancel',event=>{event.preventDefault();closeOverlay()});
  back.addEventListener('click',()=>activeKey==='camera'&&activeAlbum?renderAlbums():render(activeKey));
  document.addEventListener('room-object-select',event=>openOverlay(event.detail?.key));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&overlay.classList.contains('is-open'))closeOverlay()});

  const queryItems = async type => {
    if (!sb) return [];
    const {data,error}=await sb.from('room_items').select('*').eq('item_type',type).order('sort_order',{ascending:true}).order('created_at',{ascending:true});
    if(error)throw error;return data||[];
  };
  const loading = title => { body.innerHTML=`<section class="room-editorial"><p class="room-section-no">${esc(title)}</p><div class="room-content-loading">LOADING</div></section>` };
  const errorView = error => { body.innerHTML=`<section class="room-editorial"><p class="room-section-no">MY ROOM</p><h2>CONTENT IS RESTING.</h2><p>${esc(error?.message||'Please visit again soon.')}</p></section>` };

  const itemFigure = item => item.image_url ? `<figure class="room-item-image"><img src="${esc(item.image_url)}" alt="${esc(item.title)}" loading="lazy"></figure>` : '';
  const renderGeneric = async key => {
    loading(titles[key]);
    try{
      const items=await queryItems(types[key]);
      if(!items.length){
        const existing=key==='tv'?'<a class="room-text-link" href="works.html">OPEN CURRENT WORKS ↗</a>':key==='cat'?'<a class="room-text-link" href="tools.html">OPEN MY CAT PAGE ↗</a>':key==='telephone'?'<a class="room-text-link" href="guestbook.html">OPEN GUESTBOOK ↗</a>':'';
        body.innerHTML=`<section class="room-editorial room-editorial-empty"><p class="room-section-no">${esc(titles[key])}</p><h2>NOTES<br>WILL LIVE HERE.</h2><p>${esc(emptyText[key])}</p>${existing}</section>`;return;
      }
      body.innerHTML=`<section class="room-editorial"><p class="room-section-no">${esc(titles[key])} · ${String(items.length).padStart(2,'0')}</p><h2>${esc(titles[key])}</h2><div class="room-editorial-list">${items.map((item,i)=>`<article class="room-editorial-item">${itemFigure(item)}<div class="room-editorial-copy"><small>${String(i+1).padStart(2,'0')}${item.subtitle?` · ${esc(item.subtitle)}`:''}</small><h3>${esc(item.title||'UNTITLED')}</h3><p>${esc(item.description||'').replace(/\n/g,'<br>')}</p>${item.link_url?`<a href="${esc(item.link_url)}" target="_blank" rel="noopener">OPEN ↗</a>`:''}</div></article>`).join('')}</div></section>`;
    }catch(error){errorView(error)}
  };

  const renderAlbums = async () => {
    activeAlbum=null;back.hidden=true;loading('PHOTOGRAPHS');
    try{
      if(!sb)throw new Error('Photo archive is unavailable.');
      const {data,error}=await sb.from('room_albums').select('*,room_photos(count)').order('sort_order',{ascending:true}).order('created_at',{ascending:true});if(error)throw error;
      const albums=data||[];
      body.innerHTML=`<section class="room-editorial room-albums-view"><p class="room-section-no">PHOTOGRAPHS · ${String(albums.length).padStart(2,'0')} ALBUMS</p><h2>PHOTOGRAPHS</h2>${albums.length?`<div class="room-album-list">${albums.map((album,i)=>`<button type="button" data-room-album="${esc(album.id)}"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${esc(album.title||'UNTITLED')}</strong><p>${esc(album.description||'')}</p><small>${album.album_date?esc(album.album_date)+' · ':''}${album.room_photos?.[0]?.count||0} PHOTOGRAPHS</small></div>${album.cover_url?`<img src="${esc(album.cover_url)}" alt="" loading="lazy">`:'<i></i>'}</button>`).join('')}</div>`:`<div class="room-editorial-empty"><h3>THE FIRST ALBUM<br>HAS NOT BEEN PLACED.</h3><p>管理员可以在 EDIT 页面创建照片集并批量上传照片。</p><a class="room-text-link" href="photos.html">OPEN CURRENT PHOTOS ↗</a></div>`}</section>`;
      body.querySelectorAll('[data-room-album]').forEach(button=>button.addEventListener('click',()=>openAlbum(albums.find(a=>a.id===button.dataset.roomAlbum))));
    }catch(error){errorView(error)}
  };
  const openAlbum = async album => {
    if(!album)return;activeAlbum=album;back.hidden=false;loading(album.title);
    try{
      const {data,error}=await sb.from('room_photos').select('*').eq('album_id',album.id).order('sort_order',{ascending:true}).order('created_at',{ascending:true});if(error)throw error;const photos=data||[];
      body.innerHTML=`<section class="room-editorial room-album-detail"><p class="room-section-no">PHOTOGRAPHS / ${esc(album.title)}</p><h2>${esc(album.title)}</h2><p class="room-album-description">${esc(album.description||'')}</p><div class="room-masonry">${photos.map((photo,i)=>`<button type="button" data-room-photo="${i}"><img src="${esc(photo.preview_url||photo.thumb_url||photo.image_url)}" alt="${esc(photo.caption||album.title)}" loading="lazy"><span>${photo.taken_at?esc(photo.taken_at):''}${photo.location?` · ${esc(photo.location)}`:''}</span></button>`).join('')}</div>${photos.length?'':'<p class="room-no-photos">NO PHOTOGRAPHS YET.</p>'}</section>`;
      lightboxItems=photos;body.querySelectorAll('[data-room-photo]').forEach(button=>button.addEventListener('click',()=>openPhoto(Number(button.dataset.roomPhoto))));
    }catch(error){errorView(error)}
  };

  const renderCalendar = async () => {
    loading('MEMORIES');
    try{
      const items=await queryItems('calendar');let view=new Date();view=new Date(view.getFullYear(),view.getMonth(),1);
      const drawMonth=()=>{
        const year=view.getFullYear(),month=view.getMonth(),days=new Date(year,month+1,0).getDate(),offset=view.getDay();
        const eventByDay=new Map(items.filter(x=>{const date=String(x.metadata?.date||'');return Number(date.slice(5,7))===month+1}).map(x=>[Number(String(x.metadata.date).slice(-2)),x]));
        const cells=Array.from({length:offset},()=>'<i></i>').concat(Array.from({length:days},(_,i)=>{const d=i+1,x=eventByDay.get(d);return`<button type="button"${x?` data-calendar-item="${esc(x.id)}"`:''} class="${x?'has-memory':''}">${d}</button>`}));
        body.innerHTML=`<section class="room-editorial room-calendar-view"><p class="room-section-no">MEMORIES / ${year}</p><div class="room-calendar-title"><button id="room-calendar-prev" type="button">← PREVIOUS</button><h2>${view.toLocaleString('en',{month:'long'}).toUpperCase()}</h2><button id="room-calendar-next" type="button">NEXT →</button></div><div class="room-calendar-week"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div><div class="room-calendar-grid">${cells.join('')}</div><div id="room-calendar-note" class="room-calendar-note"><small>CLICK A MARKED DATE</small><p>细黑圈标记生日和纪念日；可以切换月份寻找它们。</p></div></section>`;
        $('#room-calendar-prev').onclick=()=>{view=new Date(year,month-1,1);drawMonth()};$('#room-calendar-next').onclick=()=>{view=new Date(year,month+1,1);drawMonth()};
        body.querySelectorAll('[data-calendar-item]').forEach(button=>button.addEventListener('click',()=>{const item=items.find(x=>x.id===button.dataset.calendarItem);$('#room-calendar-note').innerHTML=`<small>${esc(item.metadata?.date||'MEMORY')}</small><h3>${esc(item.title)}</h3><p>${esc(item.description).replace(/\n/g,'<br>')}</p>${item.image_url?`<img src="${esc(item.image_url)}" alt="">`:''}`}));
      };drawMonth();
    }catch(error){errorView(error)}
  };

  const renderMusic = async () => {
    loading('MY MUSIC');
    try{
      const items=await queryItems('music');
      if(!items.length){body.innerHTML=`<section class="room-editorial room-editorial-empty"><p class="room-section-no">MY MUSIC</p><h2>THE RECORD<br>IS QUIET.</h2><p>${esc(emptyText.music)}</p></section>`;return}
      body.innerHTML=`<section class="room-editorial room-music-view"><p class="room-section-no">MY MUSIC · ${String(items.length).padStart(2,'0')} TRACKS</p><div class="room-record-player"><div class="room-record-disc"></div><div><small id="room-track-index">01 / ${String(items.length).padStart(2,'0')}</small><h2 id="room-track-title"></h2><p id="room-track-artist"></p><p id="room-track-note"></p><audio id="room-track-audio"></audio><div class="room-player-controls"><button id="room-track-prev" type="button">← PREVIOUS</button><button id="room-track-play" type="button">PLAY</button><button id="room-track-next" type="button">NEXT →</button></div></div></div></section>`;
      let at=0;const audio=$('#room-track-audio'),disc=body.querySelector('.room-record-disc');
      const show=()=>{const x=items[at];$('#room-track-index').textContent=`${String(at+1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')}`;$('#room-track-title').textContent=x.title||'UNTITLED';$('#room-track-artist').textContent=x.subtitle||'';$('#room-track-note').textContent=x.description||'';disc.style.backgroundImage=x.image_url?`url("${x.image_url.replace(/"/g,'%22')}")`:'';audio.src=x.media_url||x.link_url||'';$('#room-track-play').textContent='PLAY'};
      const stop=()=>{audio.pause();disc.classList.remove('is-playing');document.dispatchEvent(new CustomEvent('room-record-playing',{detail:{playing:false}}))};
      $('#room-track-play').onclick=async()=>{if(!audio.src)return;if(audio.paused){try{await audio.play();disc.classList.add('is-playing');$('#room-track-play').textContent='PAUSE';document.dispatchEvent(new CustomEvent('room-record-playing',{detail:{playing:true}}))}catch{}}else{stop();$('#room-track-play').textContent='PLAY'}};
      $('#room-track-prev').onclick=()=>{stop();at=(at-1+items.length)%items.length;show()};$('#room-track-next').onclick=()=>{stop();at=(at+1)%items.length;show()};audio.onended=()=>{$('#room-track-next').click()};show();
    }catch(error){errorView(error)}
  };

  const render = key => {
    if(key==='camera')return renderAlbums();
    if(key==='calendar')return renderCalendar();
    if(key==='music')return renderMusic();
    return renderGeneric(key);
  };

  const openPhoto = index => { if(!lightboxItems.length)return;lightboxIndex=(index+lightboxItems.length)%lightboxItems.length;const p=lightboxItems[lightboxIndex];$('#room-photo-image').src=p.image_url;$('#room-photo-date').textContent=p.taken_at||'';$('#room-photo-location').textContent=p.location||'';$('#room-photo-caption').textContent=p.caption||'';if(!lightbox.open)lightbox.showModal() };
  $('#room-photo-prev').onclick=()=>openPhoto(lightboxIndex-1);$('#room-photo-next').onclick=()=>openPhoto(lightboxIndex+1);$('#room-photo-close').onclick=()=>lightbox.close();lightbox.addEventListener('click',event=>{if(event.target===lightbox)lightbox.close()});

  const editEntry=$('#room-edit-entry');
  editEntry?.addEventListener('click',async()=>{if(await api?.isAdmin())location.href='room-admin.html'});
})();

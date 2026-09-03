(() => {
  if (!document.body.classList.contains('about-interactive-page')) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
  const aboutKey = 'about-interactive';
  const lampStorageKey = 'suyoon-about-lamp';
  const labels = {
    calendar: 'CALENDAR · 日历',
    flowers: 'FLOWERS · 花',
    music: 'MUSIC · 音乐',
    lamp: 'LIGHT · 灯光',
    camera: 'CAMERA · 相册',
    personal: 'ABOUT ME · 个人介绍',
    favorites: 'FAVORITES · 影视收藏'
  };
  const emptyText = '还没有内容，管理员可以在 EDIT ABOUT 中添加。';
  const makeDefaultData = () => ({
    calendar: { importantDates: [] },
    flowers: [],
    music: [],
    albums: [],
    personal: { title: 'ABOUT ME', text: '' },
    favorites: []
  });
  const asText = value => String(value ?? '').trim();
  const asArray = value => Array.isArray(value) ? value : [];
  const normalize = value => {
    const base = makeDefaultData();
    const source = value && typeof value === 'object' ? value : {};
    base.calendar.importantDates = asArray(source.calendar?.importantDates).map(item => ({
      date: asText(item?.date),
      title: asText(item?.title),
      note: asText(item?.note)
    })).filter(item => item.date || item.title || item.note);
    base.flowers = asArray(source.flowers).map(item => ({
      name: asText(item?.name),
      description: asText(item?.description),
      image: asText(item?.image)
    })).filter(item => item.name || item.description || item.image);
    base.music = asArray(source.music).map(item => ({
      title: asText(item?.title),
      artist: asText(item?.artist),
      url: asText(item?.url)
    })).filter(item => item.title || item.artist || item.url);
    base.albums = asArray(source.albums).map(item => ({
      title: asText(item?.title),
      description: asText(item?.description),
      photos: asArray(item?.photos).map(asText).filter(Boolean)
    })).filter(item => item.title || item.description || item.photos.length);
    base.personal = {
      title: asText(source.personal?.title) || base.personal.title,
      text: asText(source.personal?.text)
    };
    base.favorites = asArray(source.favorites).map(item => ({
      title: asText(item?.title),
      type: asText(item?.type),
      note: asText(item?.note),
      url: asText(item?.url)
    })).filter(item => item.title || item.type || item.note || item.url);
    return base;
  };

  let data = makeDefaultData();
  let dialogItem = '';
  let lampOn = false;
  try { lampOn = localStorage.getItem(lampStorageKey) === 'on'; } catch {}

  const itemTitle = key => labels[key] || 'ABOUT';
  const setLampState = next => {
    lampOn = !!next;
    document.body.classList.toggle('about-lamp-on', lampOn);
    document.querySelectorAll('[data-about-hotspot="lamp"]').forEach(button => button.setAttribute('aria-pressed', String(lampOn)));
    try { localStorage.setItem(lampStorageKey, lampOn ? 'on' : 'off'); } catch {}
  };
  setLampState(lampOn);

  const imageMarkup = (src, alt, className = 'about-content-image') => src
    ? `<img class="${className}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`
    : '<div class="about-image-empty">NO IMAGE</div>';
  const emptyMarkup = () => `<p class="about-empty">${emptyText}</p>`;
  const dateParts = value => {
    const match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(asText(value));
    return match ? { year:Number(match[1]), month:Number(match[2]), day:Number(match[3]) } : null;
  };
  const calendarCardMarkup = dates => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const marked = new Map();
    dates.forEach(item => {
      const parts = dateParts(item.date);
      if (parts && parts.year === year && parts.month === month + 1) marked.set(parts.day, item.title || '重要日子');
    });
    const cells = [];
    for (let index = 0; index < firstDay; index += 1) cells.push('<span class="about-calendar-day is-empty"></span>');
    for (let day = 1; day <= totalDays; day += 1) {
      const title = marked.get(day);
      const today = day === now.getDate();
      cells.push(`<span class="about-calendar-day${title ? ' is-marked' : ''}${today ? ' is-today' : ''}"${title ? ` title="${esc(title)}"` : ''}>${day}${title ? '<i></i>' : ''}</span>`);
    }
    const monthLabel = new Intl.DateTimeFormat('zh-CN', { year:'numeric', month:'long' }).format(now);
    return `<div class="about-calendar-card"><div class="about-calendar-month"><strong>${esc(monthLabel)}</strong><span>${year}</span></div><div class="about-calendar-weekdays"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div><div class="about-calendar-grid">${cells.join('')}</div><p class="about-calendar-caption">MARKED DAYS · 重要日子</p></div>`;
  };

  function publicMarkup(key) {
    if (key === 'calendar') {
      const dates = data.calendar.importantDates;
      return `<div class="about-dialog-columns about-calendar-columns">
        ${calendarCardMarkup(dates)}
        <aside class="about-important-list"><div class="about-list-head"><strong>IMPORTANT DATES</strong><span>↗</span></div>${dates.length ? dates.map(item => `<article><time>${esc(item.date || '—')}</time><h3>${esc(item.title || '重要日子')}</h3>${item.note ? `<p>${esc(item.note)}</p>` : ''}</article>`).join('') : emptyMarkup()}</aside>
      </div>`;
    }
    if (key === 'flowers') {
      return data.flowers.length ? `<div class="about-card-grid">${data.flowers.map(item => `<article class="about-content-card">${imageMarkup(item.image, item.name || 'flower')}<div><h3>${esc(item.name || '未命名的花')}</h3>${item.description ? `<p>${esc(item.description)}</p>` : ''}</div></article>`).join('')}</div>` : emptyMarkup();
    }
    if (key === 'music') {
      return data.music.length ? `<ol class="about-music-list">${data.music.map((item, index) => `<li><span class="about-list-index">${String(index + 1).padStart(2, '0')}</span><div><strong>${esc(item.title || '未命名音乐')}</strong>${item.artist ? `<small>${esc(item.artist)}</small>` : ''}</div>${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noreferrer">OPEN ↗</a>` : ''}</li>`).join('')}</ol>` : emptyMarkup();
    }
    if (key === 'lamp') {
      return `<div class="about-lamp-card"><div class="about-lamp-icon" aria-hidden="true">${lampOn ? '◐' : '○'}</div><h3>${lampOn ? '暖灯已开启' : '灯光已关闭'}</h3><p>点击下方按钮切换房间的光线。</p><button type="button" class="about-dialog-action" data-about-toggle-lamp>${lampOn ? 'TURN OFF' : 'TURN ON WARM LIGHT'}</button></div>`;
    }
    if (key === 'camera') {
      return data.albums.length ? `<div class="about-album-grid">${data.albums.map((album, index) => `<article class="about-album-card"><button type="button" class="about-album-open" data-about-album="${index}">${album.photos[0] ? imageMarkup(album.photos[0], album.title || 'album cover', 'about-album-cover') : '<div class="about-album-cover about-image-empty">NO COVER</div>'}<span class="about-album-arrow">OPEN ↗</span></button><h3>${esc(album.title || '未命名相册')}</h3>${album.description ? `<p>${esc(album.description)}</p>` : ''}<small>${album.photos.length} PHOTO${album.photos.length === 1 ? '' : 'S'}</small></article>`).join('')}</div>` : emptyMarkup();
    }
    if (key === 'personal') {
      const text = data.personal.text;
      return `<article class="about-personal-card"><h3>${esc(data.personal.title || 'ABOUT ME')}</h3>${text ? text.split(/\n+/).map(paragraph => `<p>${esc(paragraph)}</p>`).join('') : emptyMarkup()}</article>`;
    }
    if (key === 'favorites') {
      return data.favorites.length ? `<div class="about-favorites-list">${data.favorites.map((item, index) => `<article><span class="about-list-index">${String(index + 1).padStart(2, '0')}</span><div><h3>${esc(item.title || '未命名收藏')}</h3>${item.type ? `<small>${esc(item.type)}</small>` : ''}${item.note ? `<p>${esc(item.note)}</p>` : ''}</div>${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noreferrer">LINK ↗</a>` : ''}</article>`).join('')}</div>` : emptyMarkup();
    }
    if (key.startsWith('album:')) {
      const index = Number(key.slice(6));
      const album = data.albums[index];
      if (!album) return emptyMarkup();
      return `<article class="about-album-detail"><p>${album.description ? esc(album.description) : emptyText}</p><div class="about-photo-grid">${album.photos.length ? album.photos.map((photo, photoIndex) => imageMarkup(photo, `${album.title || 'album'} photo ${photoIndex + 1}`, 'about-album-photo')).join('') : emptyMarkup()}</div></article>`;
    }
    return emptyMarkup();
  }

  function renderDialog() {
    const dialog = $('#about-item-dialog');
    if (!dialog || !dialogItem) return;
    const isAlbum = dialogItem.startsWith('album:');
    $('#about-dialog-kicker').textContent = isAlbum ? 'CAMERA · ALBUM' : 'ABOUT';
    $('#about-dialog-title').textContent = isAlbum ? (data.albums[Number(dialogItem.slice(6))]?.title || 'ALBUM') : itemTitle(dialogItem);
    $('#about-dialog-body').innerHTML = publicMarkup(dialogItem);
    const back = $('#about-dialog-back');
    if (back) back.hidden = !isAlbum;
    dialog.querySelectorAll('[data-about-toggle-lamp]').forEach(button => button.addEventListener('click', () => { setLampState(!lampOn); renderDialog(); }));
    dialog.querySelectorAll('[data-about-album]').forEach(button => button.addEventListener('click', () => { dialogItem = `album:${button.dataset.aboutAlbum}`; renderDialog(); }));
  }

  function openItem(key) {
    if (key === 'cat') { location.href = 'tools.html'; return; }
    if (key === 'lamp') setLampState(!lampOn);
    dialogItem = key;
    renderDialog();
    const dialog = $('#about-item-dialog');
    if (dialog && !dialog.open) dialog.showModal();
  }

  $$('[data-about-hotspot]').forEach(button => {
    button.addEventListener('click', () => openItem(button.dataset.aboutHotspot));
  });
  $('#about-dialog-close')?.addEventListener('click', () => $('#about-item-dialog')?.close());
  $('#about-dialog-back')?.addEventListener('click', () => { dialogItem = 'camera'; renderDialog(); });
  $('#about-item-dialog')?.addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });

  function editorRow(type, item = {}) {
    if (type === 'date') return `<div class="about-editor-row" data-editor-row="date"><label>DATE<input data-field="date" type="text" value="${esc(item.date)}" placeholder="2026-09-03"></label><label>TITLE<input data-field="title" type="text" value="${esc(item.title)}" placeholder="Birthday"></label><label>NOTE<input data-field="note" type="text" value="${esc(item.note)}" placeholder="A short note"></label><button type="button" class="about-row-remove" data-remove-row>×</button></div>`;
    if (type === 'flower') return `<div class="about-editor-row" data-editor-row="flower" data-current-image="${esc(item.image)}"><label>NAME<input data-field="name" type="text" value="${esc(item.name)}" placeholder="Flower name"></label><label>DESCRIPTION<textarea data-field="description" rows="2" placeholder="Description">${esc(item.description)}</textarea></label><label class="about-upload-field">PHOTO<input data-field="image" type="file" accept="image/*"><small>${item.image ? '已有图片，可选择替换' : '上传花的图片'}</small></label><button type="button" class="about-row-remove" data-remove-row>×</button></div>`;
    if (type === 'music') return `<div class="about-editor-row" data-editor-row="music"><label>TITLE<input data-field="title" type="text" value="${esc(item.title)}" placeholder="Song or playlist"></label><label>ARTIST<input data-field="artist" type="text" value="${esc(item.artist)}" placeholder="Artist"></label><label>LINK<input data-field="url" type="url" value="${esc(item.url)}" placeholder="https://..."></label><button type="button" class="about-row-remove" data-remove-row>×</button></div>`;
    if (type === 'album') return `<div class="about-editor-row about-editor-album" data-editor-row="album" data-current-photos="${esc(JSON.stringify(item.photos || []))}"><label>ALBUM NAME<input data-field="title" type="text" value="${esc(item.title)}" placeholder="Album title"></label><label>DESCRIPTION<textarea data-field="description" rows="2" placeholder="Album description">${esc(item.description)}</textarea></label><label class="about-upload-field">PHOTOS<input data-field="photos" type="file" accept="image/*" multiple><small>${(item.photos || []).length} 张已上传，可继续追加</small></label><button type="button" class="about-row-remove" data-remove-row>×</button></div>`;
    if (type === 'favorite') return `<div class="about-editor-row" data-editor-row="favorite"><label>TITLE<input data-field="title" type="text" value="${esc(item.title)}" placeholder="Film or TV title"></label><label>TYPE<input data-field="type" type="text" value="${esc(item.type)}" placeholder="FILM / SERIES"></label><label>NOTE<input data-field="note" type="text" value="${esc(item.note)}" placeholder="Why I like it"></label><label>LINK<input data-field="url" type="url" value="${esc(item.url)}" placeholder="Optional link"></label><button type="button" class="about-row-remove" data-remove-row>×</button></div>`;
    return '';
  }

  const sectionMarkup = (type, title, rows) => `<section class="about-editor-section"><div class="about-editor-section-head"><h3>${title}</h3><button type="button" data-add-row="${type}">+ ADD</button></div><div class="about-editor-rows" data-editor-rows="${type}">${rows.length ? rows.map(item => editorRow(type, item)).join('') : `<p class="about-editor-empty">暂无内容</p>`}</div></section>`;

  function renderEditor() {
    const root = $('#about-editor-body');
    if (!root) return;
    root.innerHTML = `${sectionMarkup('date', '1 · IMPORTANT DATES', data.calendar.importantDates)}
      ${sectionMarkup('flower', '2 · FLOWERS', data.flowers)}
      ${sectionMarkup('music', '3 · MUSIC', data.music)}
      ${sectionMarkup('album', '5 · PHOTO ALBUMS', data.albums)}
      <section class="about-editor-section"><div class="about-editor-section-head"><h3>7 · PERSONAL INTRODUCTION</h3></div><label>TITLE<input id="about-personal-title" type="text" value="${esc(data.personal.title)}" placeholder="About me"></label><label>TEXT<textarea id="about-personal-text" rows="5" placeholder="Write a short introduction">${esc(data.personal.text)}</textarea></label></section>
      ${sectionMarkup('favorite', '8 · FILM & TV FAVORITES', data.favorites)}`;
  }

  $('#about-editor-body')?.addEventListener('click', event => {
    const remove = event.target.closest('[data-remove-row]');
    if (remove) { remove.closest('[data-editor-row]')?.remove(); return; }
    const add = event.target.closest('[data-add-row]');
    if (!add) return;
    const type = add.dataset.addRow;
    const rows = $(`[data-editor-rows="${type}"]`);
    if (!rows) return;
    rows.querySelector('.about-editor-empty')?.remove();
    rows.insertAdjacentHTML('beforeend', editorRow(type));
  });

  async function uploadFile(file, folder) {
    if (!file) return '';
    if (!window.SUY_ADMIN?.uploadPublic) throw new Error('管理员上传服务尚未准备好。');
    return window.SUY_ADMIN.uploadPublic(file, folder);
  }
  const rowValue = (row, field) => asText($(`[data-field="${field}"]`, row)?.value);

  async function saveEditor() {
    const status = $('#about-editor-status');
    const saveButton = $('#about-editor-save');
    if (!window.SUY_ADMIN || !await window.SUY_ADMIN.ensureAdminSession()) { if (status) status.textContent = '只有管理员可以保存。'; return; }
    if (saveButton) saveButton.disabled = true;
    if (status) status.textContent = 'SAVING…';
    try {
      const next = makeDefaultData();
      next.calendar.importantDates = $$('[data-editor-row="date"]', $('#about-editor-body')).map(row => ({ date:rowValue(row,'date'), title:rowValue(row,'title'), note:rowValue(row,'note') })).filter(item => item.date || item.title || item.note);
      const flowerRows = $$('[data-editor-row="flower"]', $('#about-editor-body'));
      for (let index = 0; index < flowerRows.length; index += 1) {
        const row = flowerRows[index];
        if (status) status.textContent = `上传花朵图片 ${index + 1}/${flowerRows.length}…`;
        const file = $('[data-field="image"]', row)?.files?.[0];
        const image = file ? await uploadFile(file, 'about-flowers') : asText(row.dataset.currentImage);
        const item = { name:rowValue(row,'name'), description:rowValue(row,'description'), image };
        if (item.name || item.description || item.image) next.flowers.push(item);
      }
      next.music = $$('[data-editor-row="music"]', $('#about-editor-body')).map(row => ({ title:rowValue(row,'title'), artist:rowValue(row,'artist'), url:rowValue(row,'url') })).filter(item => item.title || item.artist || item.url);
      next.personal = { title:asText($('#about-personal-title')?.value) || 'ABOUT ME', text:asText($('#about-personal-text')?.value) };
      next.favorites = $$('[data-editor-row="favorite"]', $('#about-editor-body')).map(row => ({ title:rowValue(row,'title'), type:rowValue(row,'type'), note:rowValue(row,'note'), url:rowValue(row,'url') })).filter(item => item.title || item.type || item.note || item.url);
      const albumRows = $$('[data-editor-row="album"]', $('#about-editor-body'));
      for (let index = 0; index < albumRows.length; index += 1) {
        const row = albumRows[index];
        let photos = [];
        try { photos = JSON.parse(row.dataset.currentPhotos || '[]').filter(Boolean); } catch {}
        const files = [...($('[data-field="photos"]', row)?.files || [])];
        for (const [fileIndex, file] of files.entries()) {
          if (status) status.textContent = `上传相册图片 ${index + 1}/${albumRows.length} · ${fileIndex + 1}/${files.length}…`;
          const url = await uploadFile(file, 'about-albums');
          if (url) photos.push(url);
        }
        const item = { title:rowValue(row,'title'), description:rowValue(row,'description'), photos };
        if (item.title || item.description || item.photos.length) next.albums.push(item);
      }
      await window.SUY_ADMIN.saveContent(aboutKey, next);
      data = normalize(next);
      if (status) status.textContent = 'SAVED TO SUPABASE';
      $('#about-editor-dialog')?.close();
      if (dialogItem && $('#about-item-dialog')?.open) renderDialog();
    } catch (error) {
      console.error(error);
      if (status) status.textContent = `SAVE FAILED: ${error?.message || error}`;
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  }

  $('#about-edit')?.addEventListener('click', () => {
    renderEditor();
    $('#about-editor-dialog')?.showModal();
  });
  $('#about-editor-close')?.addEventListener('click', () => $('#about-editor-dialog')?.close());
  $('#about-editor-save')?.addEventListener('click', saveEditor);
  $('#about-editor-form')?.addEventListener('submit', event => event.preventDefault());
  $('#about-editor-dialog')?.addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });

  async function load() {
    try { if (window.SUY_ADMIN_READY) await window.SUY_ADMIN_READY; } catch {}
    let loaded = null;
    try { loaded = await window.SUY_ADMIN?.loadContent?.(aboutKey); } catch (error) { console.warn('Could not load About content', error); }
    if (loaded) data = normalize(loaded);
    else {
      try {
        const profile = await window.SUY_ADMIN?.loadContent?.('profile');
        if (profile) data.personal = { title:asText(profile.name) || 'ABOUT ME', text:[asText(profile.info), asText(profile.statement)].filter(Boolean).join('\n') };
      } catch {}
    }
    setLampState(lampOn);
    const edit = $('#about-edit');
    if (edit) edit.hidden = !window.SUY_IS_ADMIN;
    document.addEventListener('suyoon-admin-state', event => { if (edit) edit.hidden = !event.detail?.admin; });
  }
  load();
})();

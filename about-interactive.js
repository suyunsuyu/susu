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
  const defaultEmptyText = '还没有内容。';
  const sectionKeys = ['calendar', 'flowers', 'music', 'camera', 'personal', 'favorites'];
  const layoutChoices = {
    calendar: [['split', '左右排列'], ['stack', '上下排列']],
    flowers: [['grid', '网格排列'], ['list', '列表排列'], ['compact', '紧凑网格']],
    music: [['list', '列表排列'], ['compact', '紧凑排列']],
    camera: [['grid', '网格排列'], ['list', '列表排列'], ['compact', '紧凑网格']],
    personal: [['left', '左对齐'], ['center', '居中排列']],
    favorites: [['list', '列表排列'], ['grid', '网格排列']]
  };
  const makePresentation = key => ({
    kicker: 'ABOUT',
    title: labels[key] || 'ABOUT',
    description: '',
    emptyText: defaultEmptyText,
    layout: layoutChoices[key]?.[0]?.[0] || 'list'
  });
  const makeDefaultData = () => ({
    calendar: {
      importantDates: [],
      weekdays: ['日', '一', '二', '三', '四', '五', '六'],
      caption: 'MARKED DAYS · 重要日子',
      listTitle: 'IMPORTANT DATES',
      editorHint: '点击日历中的日期，然后选择标记并填写文字。'
    },
    flowers: [],
    music: [],
    albums: [],
    personal: { title: 'ABOUT ME', text: '' },
    favorites: [],
    presentation: Object.fromEntries(sectionKeys.map(key => [key, makePresentation(key)]))
  });
  const asText = value => String(value ?? '').trim();
  const asArray = value => Array.isArray(value) ? value : [];
  const hasOwn = (object, key) => !!object && Object.prototype.hasOwnProperty.call(object, key);
  const configuredText = (object, key, fallback) => hasOwn(object, key) ? asText(object[key]) : fallback;
  const limitSymbol = value => Array.from(asText(value)).slice(0, 3).join('') || '●';
  const normalize = value => {
    const base = makeDefaultData();
    const source = value && typeof value === 'object' ? value : {};
    base.calendar.importantDates = asArray(source.calendar?.importantDates).map(item => ({
      date: asText(item?.date),
      title: asText(item?.title),
      note: asText(item?.note),
      symbol: limitSymbol(item?.symbol)
    })).filter(item => item.date || item.title || item.note);
    const weekdays = asArray(source.calendar?.weekdays).map(asText).slice(0, 7);
    if (weekdays.length === 7) base.calendar.weekdays = weekdays;
    base.calendar.caption = configuredText(source.calendar, 'caption', base.calendar.caption);
    base.calendar.listTitle = configuredText(source.calendar, 'listTitle', base.calendar.listTitle);
    base.calendar.editorHint = configuredText(source.calendar, 'editorHint', base.calendar.editorHint);
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
      photos: asArray(item?.photos).map(asText).filter(Boolean),
      layout: ['grid', 'list'].includes(asText(item?.layout)) ? asText(item.layout) : 'grid'
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
    sectionKeys.forEach(key => {
      const raw = source.presentation?.[key] && typeof source.presentation[key] === 'object' ? source.presentation[key] : {};
      const allowedLayouts = layoutChoices[key].map(item => item[0]);
      base.presentation[key] = {
        kicker: configuredText(raw, 'kicker', base.presentation[key].kicker),
        title: configuredText(raw, 'title', base.presentation[key].title),
        description: asText(raw.description),
        emptyText: configuredText(raw, 'emptyText', base.presentation[key].emptyText),
        layout: allowedLayouts.includes(asText(raw.layout)) ? asText(raw.layout) : base.presentation[key].layout
      };
    });
    return base;
  };

  let data = makeDefaultData();
  let dialogItem = '';
  let dialogEditing = false;
  let calendarDraft = [];
  let calendarSelectedDate = '';
  const calendarNow = new Date();
  let calendarViewYear = calendarNow.getFullYear();
  let calendarViewMonth = calendarNow.getMonth();
  let lampOn = false;
  try { lampOn = localStorage.getItem(lampStorageKey) === 'on'; } catch {}

  const presentationKeyFor = key => String(key || '').startsWith('album:') ? 'camera' : key;
  const presentationFor = key => data.presentation?.[presentationKeyFor(key)] || makePresentation(presentationKeyFor(key));
  const itemTitle = key => presentationFor(key).title;
  const editorSectionFor = key => {
    const item = String(key || '').startsWith('album:') ? 'camera' : key;
    return ({ calendar:'date', flowers:'flower', music:'music', camera:'album', personal:'personal', favorites:'favorite' })[item] || '';
  };
  const syncAdminControls = (admin = !!window.SUY_IS_ADMIN) => {
    const pageEdit = $('#about-edit');
    if (pageEdit) pageEdit.hidden = true;
    const dialogEdit = $('#about-dialog-edit');
    if (!dialogEdit) return;
    const section = editorSectionFor(dialogItem);
    dialogEdit.dataset.editorSection = section;
    dialogEdit.hidden = !(admin && section && dialogItem !== 'calendar');
    dialogEdit.textContent = dialogEditing ? 'CANCEL' : 'ADD / MANAGE ↗';
    dialogEdit.setAttribute('aria-pressed', String(dialogEditing));
  };

  function setDirectTarget(element, kind, field, { section = '', index = '', multiline = false, placeholder = false } = {}) {
    if (!element) return;
    ['inlineKind', 'inlineField', 'inlineSection', 'inlineIndex', 'inlineMultiline', 'inlinePlaceholder'].forEach(key => delete element.dataset[key]);
    element.dataset.inlineKind = kind;
    element.dataset.inlineField = field;
    if (section !== '') element.dataset.inlineSection = section;
    if (index !== '') element.dataset.inlineIndex = String(index);
    if (multiline) element.dataset.inlineMultiline = 'true';
    if (placeholder) element.dataset.inlinePlaceholder = 'true';
    element.classList.toggle('is-admin-placeholder', !!placeholder && !!window.SUY_IS_ADMIN);
  }
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
  const inlineAttrs = (kind, field, { section = '', index = '', date = '', multiline = false, placeholder = false } = {}) => ` data-inline-kind="${kind}" data-inline-field="${field}"${section !== '' ? ` data-inline-section="${esc(section)}"` : ''}${index !== '' ? ` data-inline-index="${esc(index)}"` : ''}${date !== '' ? ` data-inline-date="${esc(date)}"` : ''}${multiline ? ' data-inline-multiline="true"' : ''}${placeholder ? ' data-inline-placeholder="true"' : ''}`;
  const emptyMarkup = key => {
    const text = presentationFor(key).emptyText;
    if (!text && !window.SUY_IS_ADMIN) return '';
    return `<p class="about-empty${text ? '' : ' is-admin-placeholder'}"${inlineAttrs('presentation', 'emptyText', { section:presentationKeyFor(key), multiline:true, placeholder:!text })}>${esc(text || '双击添加空内容提示')}</p>`;
  };
  const introMarkup = key => {
    const text = presentationFor(key).description;
    if (!text && !window.SUY_IS_ADMIN) return '';
    return `<p class="about-dialog-description${text ? '' : ' is-admin-placeholder'}"${inlineAttrs('presentation', 'description', { section:presentationKeyFor(key), multiline:true, placeholder:!text })}>${esc(text || '双击添加说明')}</p>`;
  };
  const dateParts = value => {
    const match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(asText(value));
    return match ? { year:Number(match[1]), month:Number(match[2]), day:Number(match[3]) } : null;
  };
  const dateKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const sortedDates = dates => [...dates].sort((a, b) => asText(a.date).localeCompare(asText(b.date)));
  const calendarCardMarkup = (dates, { interactive = false, year = calendarViewYear, month = calendarViewMonth } = {}) => {
    const now = new Date();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const marked = new Map();
    dates.forEach(item => {
      const parts = dateParts(item.date);
      if (parts && parts.year === year && parts.month === month + 1) marked.set(parts.day, item);
    });
    const cells = [];
    for (let index = 0; index < firstDay; index += 1) cells.push('<span class="about-calendar-day is-empty"></span>');
    for (let day = 1; day <= totalDays; day += 1) {
      const item = marked.get(day);
      const fullDate = dateKey(year, month, day);
      const today = year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
      const selected = interactive && fullDate === calendarSelectedDate;
      const className = `about-calendar-day${item ? ' is-marked' : ''}${today ? ' is-today' : ''}${selected ? ' is-selected' : ''}`;
      const content = `<span class="about-calendar-number">${day}</span>${item ? `<span class="about-calendar-symbol" aria-hidden="true">${esc(limitSymbol(item.symbol))}</span>` : ''}`;
      if (interactive) cells.push(`<button type="button" class="${className}" data-calendar-date="${fullDate}" aria-pressed="${selected}"${item?.title ? ` title="${esc(item.title)}"` : ''}>${content}</button>`);
      else cells.push(`<span class="${className}"${item?.title ? ` title="${esc(item.title)}"` : ''}>${content}</span>`);
    }
    const monthLabel = new Intl.DateTimeFormat('zh-CN', { month:'long' }).format(new Date(year, month, 1));
    const weekdays = data.calendar.weekdays.length === 7 ? data.calendar.weekdays : ['日', '一', '二', '三', '四', '五', '六'];
    return `<div class="about-calendar-card${interactive ? ' is-editor' : ''}">
      <div class="about-calendar-month">
        <button type="button" data-calendar-shift="-1" aria-label="上个月">←</button>
        <strong data-calendar-month-label>${esc(monthLabel)} <span>${year}</span></strong>
        <button type="button" data-calendar-shift="1" aria-label="下个月">→</button>
      </div>
      <div class="about-calendar-weekdays">${weekdays.map((day, index) => `<span${inlineAttrs('calendar-copy', 'weekday', { index })}>${esc(day || '·')}</span>`).join('')}</div>
      <div class="about-calendar-grid" data-calendar-grid>${cells.join('')}</div>
      <p class="about-calendar-caption${data.calendar.caption ? '' : ' is-admin-placeholder'}"${inlineAttrs('calendar-copy', 'caption', { placeholder:!data.calendar.caption })}>${esc(data.calendar.caption || (window.SUY_IS_ADMIN ? '双击添加日历文字' : ''))}</p>
    </div>`;
  };

  function calendarQuickEditorMarkup() {
    if (!window.SUY_IS_ADMIN || !calendarSelectedDate) return '';
    const item = data.calendar.importantDates.find(entry => entry.date === calendarSelectedDate);
    const symbol = limitSymbol(item?.symbol);
    const presets = ['●', '★', '♥', '✦', '✓', '○'];
    const custom = !presets.includes(symbol);
    return `<div class="about-calendar-quick-editor">
      <div class="about-calendar-quick-head"><time>${esc(calendarSelectedDate)}</time><button type="button" data-calendar-quick-cancel aria-label="关闭">×</button></div>
      <div class="about-calendar-quick-fields">
        <label>标记<select id="about-calendar-quick-symbol"><option value="●"${symbol === '●' ? ' selected' : ''}>●</option><option value="★"${symbol === '★' ? ' selected' : ''}>★</option><option value="♥"${symbol === '♥' ? ' selected' : ''}>♥</option><option value="✦"${symbol === '✦' ? ' selected' : ''}>✦</option><option value="✓"${symbol === '✓' ? ' selected' : ''}>✓</option><option value="○"${symbol === '○' ? ' selected' : ''}>○</option><option value="custom"${custom ? ' selected' : ''}>自定义</option></select></label>
        <label id="about-calendar-quick-custom-wrap"${custom ? '' : ' hidden'}>自定义<input id="about-calendar-quick-custom" type="text" maxlength="6" value="${custom ? esc(symbol) : ''}" placeholder="符号或 Emoji"></label>
        <label class="is-wide">标题<input id="about-calendar-quick-title" type="text" value="${esc(item?.title || '')}" placeholder="重要日子"></label>
        <label class="is-wide">描述<textarea id="about-calendar-quick-note" rows="2" placeholder="可以留空">${esc(item?.note || '')}</textarea></label>
      </div>
      <div class="about-calendar-quick-actions">${item ? '<button type="button" data-calendar-quick-remove>删除</button>' : '<span></span>'}<button type="button" data-calendar-quick-save>保存标记</button></div>
    </div>`;
  }

  function publicMarkup(key) {
    const meta = presentationFor(key);
    if (key === 'calendar') {
      const dates = sortedDates(data.calendar.importantDates);
      const listTitle = data.calendar.listTitle || (window.SUY_IS_ADMIN ? '双击添加清单标题' : '');
      return `${introMarkup(key)}<div class="about-dialog-columns about-calendar-columns about-layout-${meta.layout}">
        ${calendarCardMarkup(dates, { interactive:!!window.SUY_IS_ADMIN })}
        <aside class="about-important-list">${calendarQuickEditorMarkup()}<div class="about-list-head"><strong class="${data.calendar.listTitle ? '' : 'is-admin-placeholder'}"${inlineAttrs('calendar-copy', 'listTitle', { placeholder:!data.calendar.listTitle })}>${esc(listTitle)}</strong><span>↗</span></div>${dates.length ? dates.map(item => `<article><time>${esc(item.date || '—')}</time><h3><span class="about-date-symbol">${esc(limitSymbol(item.symbol))}</span><span${inlineAttrs('calendar-event', 'title', { date:item.date })}>${esc(item.title || '重要日子')}</span></h3>${item.note || window.SUY_IS_ADMIN ? `<p class="${item.note ? '' : 'is-admin-placeholder'}"${inlineAttrs('calendar-event', 'note', { date:item.date, multiline:true, placeholder:!item.note })}>${esc(item.note || '双击添加日期描述')}</p>` : ''}</article>`).join('') : emptyMarkup(key)}</aside>
      </div>`;
    }
    if (key === 'flowers') {
      return `${introMarkup(key)}${data.flowers.length ? `<div class="about-card-grid about-layout-${meta.layout}">${data.flowers.map((item, index) => `<article class="about-content-card">${imageMarkup(item.image, item.name || 'flower')}<div><h3${inlineAttrs('flower', 'name', { index })}>${esc(item.name || '未命名的花')}</h3>${item.description || window.SUY_IS_ADMIN ? `<p class="${item.description ? '' : 'is-admin-placeholder'}"${inlineAttrs('flower', 'description', { index, multiline:true, placeholder:!item.description })}>${esc(item.description || '双击添加描述')}</p>` : ''}</div></article>`).join('')}</div>` : emptyMarkup(key)}`;
    }
    if (key === 'music') {
      return `${introMarkup(key)}${data.music.length ? `<ol class="about-music-list about-layout-${meta.layout}">${data.music.map((item, index) => `<li><span class="about-list-index">${String(index + 1).padStart(2, '0')}</span><div><strong${inlineAttrs('music', 'title', { index })}>${esc(item.title || '未命名音乐')}</strong>${item.artist || window.SUY_IS_ADMIN ? `<small class="${item.artist ? '' : 'is-admin-placeholder'}"${inlineAttrs('music', 'artist', { index, placeholder:!item.artist })}>${esc(item.artist || '双击添加歌手')}</small>` : ''}</div>${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noreferrer">OPEN ↗</a>` : ''}</li>`).join('')}</ol>` : emptyMarkup(key)}`;
    }
    if (key === 'camera') {
      return `${introMarkup(key)}${data.albums.length ? `<div class="about-album-grid about-layout-${meta.layout}">${data.albums.map((album, index) => `<article class="about-album-card"><button type="button" class="about-album-open" data-about-album="${index}">${album.photos[0] ? imageMarkup(album.photos[0], album.title || 'album cover', 'about-album-cover') : '<div class="about-album-cover about-image-empty">NO COVER</div>'}<span class="about-album-arrow">OPEN ↗</span></button><h3${inlineAttrs('album', 'title', { index })}>${esc(album.title || '未命名相册')}</h3>${album.description || window.SUY_IS_ADMIN ? `<p class="${album.description ? '' : 'is-admin-placeholder'}"${inlineAttrs('album', 'description', { index, multiline:true, placeholder:!album.description })}>${esc(album.description || '双击添加相册描述')}</p>` : ''}<small>${album.photos.length} PHOTO${album.photos.length === 1 ? '' : 'S'}</small></article>`).join('')}</div>` : emptyMarkup(key)}`;
    }
    if (key === 'personal') {
      const text = data.personal.text;
      return `${introMarkup(key)}<article class="about-personal-card about-layout-${meta.layout}"><h3${inlineAttrs('personal', 'title')}>${esc(data.personal.title || 'ABOUT ME')}</h3>${text || window.SUY_IS_ADMIN ? `<div class="about-personal-text${text ? '' : ' is-admin-placeholder'}"${inlineAttrs('personal', 'text', { multiline:true, placeholder:!text })}>${esc(text || '双击添加个人介绍')}</div>` : emptyMarkup(key)}</article>`;
    }
    if (key === 'favorites') {
      return `${introMarkup(key)}${data.favorites.length ? `<div class="about-favorites-list about-layout-${meta.layout}">${data.favorites.map((item, index) => `<article><span class="about-list-index">${String(index + 1).padStart(2, '0')}</span><div><h3${inlineAttrs('favorite', 'title', { index })}>${esc(item.title || '未命名收藏')}</h3>${item.type || window.SUY_IS_ADMIN ? `<small class="${item.type ? '' : 'is-admin-placeholder'}"${inlineAttrs('favorite', 'type', { index, placeholder:!item.type })}>${esc(item.type || '双击添加类型')}</small>` : ''}${item.note || window.SUY_IS_ADMIN ? `<p class="${item.note ? '' : 'is-admin-placeholder'}"${inlineAttrs('favorite', 'note', { index, multiline:true, placeholder:!item.note })}>${esc(item.note || '双击添加说明')}</p>` : ''}</div>${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noreferrer">LINK ↗</a>` : ''}</article>`).join('')}</div>` : emptyMarkup(key)}`;
    }
    if (key.startsWith('album:')) {
      const index = Number(key.slice(6));
      const album = data.albums[index];
      if (!album) return emptyMarkup(key);
      return `<article class="about-album-detail"><p class="${album.description ? '' : 'is-admin-placeholder'}"${inlineAttrs('album', 'description', { index, multiline:true, placeholder:!album.description })}>${esc(album.description || meta.emptyText || '双击添加相册描述')}</p><div class="about-photo-grid about-layout-${album.layout || 'grid'}">${album.photos.length ? album.photos.map((photo, photoIndex) => imageMarkup(photo, `${album.title || 'album'} photo ${photoIndex + 1}`, 'about-album-photo')).join('') : emptyMarkup(key)}</div></article>`;
    }
    return emptyMarkup(key);
  }

  function renderDialog() {
    const dialog = $('#about-item-dialog');
    if (!dialog || !dialogItem) return;
    const isAlbum = dialogItem.startsWith('album:');
    const editing = dialogEditing && !!window.SUY_IS_ADMIN && !!editorSectionFor(dialogItem);
    if (dialogEditing && !editing) dialogEditing = false;
    dialog.classList.toggle('is-editing', editing);
    const meta = presentationFor(dialogItem);
    const kicker = $('#about-dialog-kicker');
    const kickerValue = meta.kicker;
    kicker.textContent = editing ? 'EDIT MODE' : (kickerValue || (window.SUY_IS_ADMIN ? '双击添加顶部文字' : ''));
    setDirectTarget(kicker, 'presentation', 'kicker', { section:presentationKeyFor(dialogItem), placeholder:!kickerValue });
    const title = $('#about-dialog-title');
    const albumIndex = isAlbum ? Number(dialogItem.slice(6)) : -1;
    const titleValue = isAlbum ? (data.albums[albumIndex]?.title || '') : itemTitle(dialogItem);
    title.textContent = titleValue || (window.SUY_IS_ADMIN ? '双击添加标题' : '');
    if (isAlbum) setDirectTarget(title, 'album', 'title', { index:albumIndex, placeholder:!titleValue });
    else setDirectTarget(title, 'presentation', 'title', { section:presentationKeyFor(dialogItem), placeholder:!titleValue });
    $('#about-dialog-body').innerHTML = editing ? popupEditorMarkup(dialogItem) : publicMarkup(dialogItem);
    const back = $('#about-dialog-back');
    if (back) back.hidden = editing || !isAlbum;
    syncAdminControls();
    if (editing) {
      $('#about-inline-editor-form')?.addEventListener('submit', event => event.preventDefault());
      $('#about-inline-save')?.addEventListener('click', saveInlineEditor);
      $('#about-inline-cancel')?.addEventListener('click', () => { dialogEditing = false; renderDialog(); });
      if (dialogItem === 'calendar') bindCalendarEditor();
    } else {
      bindCalendarNavigation(dialog);
      bindCalendarQuickEditor();
      dialog.querySelectorAll('[data-about-album]').forEach(button => button.addEventListener('click', () => {
        dialogEditing = false;
        dialogItem = `album:${button.dataset.aboutAlbum}`;
        renderDialog();
      }));
    }
  }

  function openItem(key) {
    if (key === 'cat') { location.href = 'tools.html'; return; }
    if (key === 'lamp') { setLampState(!lampOn); return; }
    dialogEditing = false;
    dialogItem = key;
    if (key === 'calendar') {
      const now = new Date();
      calendarViewYear = now.getFullYear();
      calendarViewMonth = now.getMonth();
      calendarSelectedDate = '';
    }
    renderDialog();
    const dialog = $('#about-item-dialog');
    if (dialog && !dialog.open) dialog.showModal();
  }

  $$('[data-about-hotspot]').forEach(button => {
    button.addEventListener('click', () => openItem(button.dataset.aboutHotspot));
  });
  $('#about-dialog-close')?.addEventListener('click', () => { dialogEditing = false; $('#about-item-dialog')?.close(); });
  $('#about-dialog-back')?.addEventListener('click', () => { dialogEditing = false; dialogItem = 'camera'; renderDialog(); });
  $('#about-dialog-edit')?.addEventListener('click', event => {
    if (!event.currentTarget.dataset.editorSection || !window.SUY_IS_ADMIN) return;
    dialogEditing = !dialogEditing;
    if (dialogEditing && dialogItem === 'calendar') {
      calendarDraft = data.calendar.importantDates.map(item => ({ ...item }));
      calendarSelectedDate = '';
    }
    renderDialog();
  });
  $('#about-item-dialog')?.addEventListener('click', event => {
    if (event.target !== event.currentTarget) return;
    dialogEditing = false;
    event.currentTarget.close();
  });
  $('#about-item-dialog')?.addEventListener('dblclick', event => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest('[data-inline-kind]');
    if (!target) return;
    event.preventDefault();
    startDirectTextEdit(target);
  });
  let lastDirectTapTarget = null;
  let lastDirectTapAt = 0;
  $('#about-item-dialog')?.addEventListener('click', event => {
    if (!(event.target instanceof Element) || !window.SUY_IS_ADMIN || dialogEditing) return;
    const target = event.target.closest('[data-inline-kind]');
    if (!target) return;
    const now = Date.now();
    if (target === lastDirectTapTarget && now - lastDirectTapAt < 430) {
      event.preventDefault();
      lastDirectTapTarget = null;
      lastDirectTapAt = 0;
      startDirectTextEdit(target);
    } else {
      lastDirectTapTarget = target;
      lastDirectTapAt = now;
    }
  });

  function editorRow(type, item = {}) {
    const actions = '<div class="about-row-actions"><button type="button" data-move-row="up" aria-label="上移">↑</button><button type="button" data-move-row="down" aria-label="下移">↓</button><button type="button" class="about-row-remove" data-remove-row aria-label="删除">×</button></div>';
    if (type === 'date') return `<div class="about-editor-row" data-editor-row="date"><label>DATE<input data-field="date" type="date" value="${esc(item.date)}"></label><label>SYMBOL<input data-field="symbol" type="text" maxlength="6" value="${esc(limitSymbol(item.symbol))}" placeholder="●"></label><label>TITLE<input data-field="title" type="text" value="${esc(item.title)}" placeholder="Birthday"></label><label>NOTE<input data-field="note" type="text" value="${esc(item.note)}" placeholder="A short note"></label>${actions}</div>`;
    if (type === 'flower') return `<div class="about-editor-row" data-editor-row="flower" data-current-image="${esc(item.image)}"><label>NAME<input data-field="name" type="text" value="${esc(item.name)}" placeholder="Flower name"></label><label>DESCRIPTION<textarea data-field="description" rows="2" placeholder="Description">${esc(item.description)}</textarea></label><label class="about-upload-field">PHOTO<input data-field="image" type="file" accept="image/*"><small>${item.image ? '已有图片，可选择替换' : '上传花的图片'}</small></label>${actions}</div>`;
    if (type === 'music') return `<div class="about-editor-row" data-editor-row="music"><label>TITLE<input data-field="title" type="text" value="${esc(item.title)}" placeholder="Song or playlist"></label><label>ARTIST<input data-field="artist" type="text" value="${esc(item.artist)}" placeholder="Artist"></label><label>LINK<input data-field="url" type="url" value="${esc(item.url)}" placeholder="https://..."></label>${actions}</div>`;
    if (type === 'album') return `<div class="about-editor-row about-editor-album" data-editor-row="album" data-current-photos="${esc(JSON.stringify(item.photos || []))}"><label>ALBUM NAME<input data-field="title" type="text" value="${esc(item.title)}" placeholder="Album title"></label><label>DESCRIPTION<textarea data-field="description" rows="2" placeholder="Album description">${esc(item.description)}</textarea></label><label class="about-upload-field">PHOTOS<input data-field="photos" type="file" accept="image/*" multiple><small>${(item.photos || []).length} 张已上传，可继续追加</small></label><label>PHOTO LAYOUT<select data-field="layout"><option value="grid"${item.layout !== 'list' ? ' selected' : ''}>网格排列</option><option value="list"${item.layout === 'list' ? ' selected' : ''}>列表排列</option></select></label>${actions}</div>`;
    if (type === 'favorite') return `<div class="about-editor-row" data-editor-row="favorite"><label>TITLE<input data-field="title" type="text" value="${esc(item.title)}" placeholder="Film or TV title"></label><label>TYPE<input data-field="type" type="text" value="${esc(item.type)}" placeholder="FILM / SERIES"></label><label>NOTE<input data-field="note" type="text" value="${esc(item.note)}" placeholder="Why I like it"></label><label>LINK<input data-field="url" type="url" value="${esc(item.url)}" placeholder="Optional link"></label>${actions}</div>`;
    return '';
  }

  const sectionMarkup = (type, title, rows) => `<section class="about-editor-section" data-about-editor-section="${type}"><div class="about-editor-section-head"><h3>${title}</h3><button type="button" data-add-row="${type}">+ ADD</button></div><div class="about-editor-rows" data-editor-rows="${type}">${rows.length ? rows.map(item => editorRow(type, item)).join('') : `<p class="about-editor-empty">暂无内容</p>`}</div></section>`;

  function popupSettingsMarkup(key) {
    if (String(key).startsWith('album:')) return '';
    const sectionKey = presentationKeyFor(key);
    const meta = presentationFor(key);
    const options = layoutChoices[sectionKey].map(([value, label]) => `<option value="${value}"${meta.layout === value ? ' selected' : ''}>${label}</option>`).join('');
    return `<section class="about-popup-settings" data-popup-settings="${sectionKey}">
      <div class="about-editor-section-head"><h3>弹窗内容与排版</h3></div>
      <div class="about-popup-settings-grid">
        <label>顶部小标题<input data-popup-field="kicker" type="text" value="${esc(meta.kicker)}" placeholder="ABOUT"></label>
        <label>主标题<input data-popup-field="title" type="text" value="${esc(meta.title)}" placeholder="${esc(labels[sectionKey])}"></label>
        <label>排列方式<select data-popup-field="layout">${options}</select></label>
        <label class="is-wide">开头说明<textarea data-popup-field="description" rows="2" placeholder="可留空">${esc(meta.description)}</textarea></label>
        <label class="is-wide">没有内容时显示的文字<textarea data-popup-field="emptyText" rows="2">${esc(meta.emptyText)}</textarea></label>
      </div>
    </section>`;
  }

  const calendarDraftListMarkup = () => {
    const dates = sortedDates(calendarDraft);
    if (!dates.length) return '<p class="about-editor-empty">还没有标记日期</p>';
    return dates.map(item => `<button type="button" data-calendar-edit-date="${esc(item.date)}"><span>${esc(limitSymbol(item.symbol))}</span><time>${esc(item.date)}</time><strong>${esc(item.title || '未命名')}</strong></button>`).join('');
  };

  function calendarEditorMarkup() {
    return `<section class="about-editor-section about-calendar-editor" data-about-editor-section="date">
      <div class="about-editor-section-head"><h3>1 · 直接点击日期添加标记</h3></div>
      <p class="about-calendar-editor-help">${esc(data.calendar.editorHint)}</p>
      <div class="about-calendar-editor-layout">
        <div data-calendar-editor-card>${calendarCardMarkup(calendarDraft, { interactive:true })}</div>
        <div class="about-calendar-mark-form">
          <small>SELECTED DATE</small>
          <output id="about-calendar-selected">请先点击左侧日期</output>
          <label>标记符号
            <select id="about-calendar-symbol-choice">
              <option value="●">● 圆点</option><option value="★">★ 星星</option><option value="♥">♥ 爱心</option><option value="✦">✦ 闪光</option><option value="✓">✓ 对勾</option><option value="○">○ 圆圈</option><option value="custom">自定义</option>
            </select>
          </label>
          <label id="about-calendar-custom-symbol-wrap" hidden>自定义标记<input id="about-calendar-custom-symbol" type="text" maxlength="6" placeholder="输入符号或 Emoji"></label>
          <label>日期标题<input id="about-calendar-mark-title" type="text" placeholder="生日、纪念日……"></label>
          <label>日期描述<textarea id="about-calendar-mark-note" rows="3" placeholder="这里的文字可以自由填写"></textarea></label>
          <div class="about-calendar-mark-actions"><button id="about-calendar-remove-mark" type="button">删除标记</button><button id="about-calendar-apply-mark" type="button">更新标记</button></div>
        </div>
      </div>
      <div class="about-calendar-copy-settings">
        <label>星期文字（用逗号分开）<input id="about-calendar-weekdays" type="text" value="${esc(data.calendar.weekdays.join(','))}"></label>
        <label>日历底部文字<input id="about-calendar-caption" type="text" value="${esc(data.calendar.caption)}"></label>
        <label>右侧清单标题<input id="about-calendar-list-title" type="text" value="${esc(data.calendar.listTitle)}"></label>
        <label class="is-wide">编辑提示文字<textarea id="about-calendar-editor-hint" rows="2">${esc(data.calendar.editorHint)}</textarea></label>
      </div>
      <div class="about-calendar-draft-list"><small>已标记日期</small><div data-calendar-draft-list>${calendarDraftListMarkup()}</div></div>
    </section>`;
  }

  function popupEditorMarkup(key) {
    const section = editorSectionFor(key);
    let content = '';
    if (section === 'date') content = calendarEditorMarkup();
    if (section === 'flower') content = sectionMarkup('flower', '2 · FLOWERS', data.flowers);
    if (section === 'music') content = sectionMarkup('music', '3 · MUSIC', data.music);
    if (section === 'album' && key === 'camera') content = sectionMarkup('album', '5 · PHOTO ALBUMS', data.albums);
    if (section === 'album' && key.startsWith('album:')) {
      const album = data.albums[Number(key.slice(6))];
      content = `<section class="about-editor-section" data-about-editor-section="album"><div class="about-editor-section-head"><h3>5 · EDIT THIS ALBUM</h3></div><div class="about-editor-rows" data-editor-rows="album">${album ? editorRow('album', album) : '<p class="about-editor-empty">暂无内容</p>'}</div></section>`;
    }
    if (section === 'personal') content = `<section class="about-editor-section" data-about-editor-section="personal"><div class="about-editor-section-head"><h3>7 · PERSONAL INTRODUCTION</h3></div><label>TITLE<input id="about-inline-personal-title" type="text" value="${esc(data.personal.title)}" placeholder="About me"></label><label>TEXT<textarea id="about-inline-personal-text" rows="5" placeholder="Write a short introduction">${esc(data.personal.text)}</textarea></label></section>`;
    if (section === 'favorite') content = sectionMarkup('favorite', '8 · FILM & TV FAVORITES', data.favorites);
    return `<form id="about-inline-editor-form" class="about-inline-editor">${content}<div class="about-inline-actions"><p id="about-inline-status" class="about-inline-status" role="status"></p><button id="about-inline-cancel" class="about-inline-cancel" type="button">CANCEL</button><button id="about-inline-save" class="about-inline-save" type="button">SAVE THIS</button></div></form>`;
  }

  function bindCalendarNavigation(root) {
    root.querySelectorAll('[data-calendar-shift]').forEach(button => button.addEventListener('click', () => {
      const next = new Date(calendarViewYear, calendarViewMonth + Number(button.dataset.calendarShift), 1);
      calendarViewYear = next.getFullYear();
      calendarViewMonth = next.getMonth();
      calendarSelectedDate = '';
      renderDialog();
    }));
    if (!window.SUY_IS_ADMIN) return;
    root.querySelectorAll('[data-calendar-date]').forEach(button => button.addEventListener('click', () => {
      calendarSelectedDate = button.dataset.calendarDate;
      renderDialog();
      requestAnimationFrame(() => $('#about-calendar-quick-title')?.focus());
    }));
  }

  let directStatusTimer = 0;
  function showDirectStatus(message, failed = false) {
    const dialog = $('#about-item-dialog');
    if (!dialog) return;
    let status = $('.about-direct-status', dialog);
    if (!status) {
      status = document.createElement('div');
      status.className = 'about-direct-status';
      status.setAttribute('role', 'status');
      dialog.appendChild(status);
    }
    status.textContent = message;
    status.classList.toggle('is-error', failed);
    status.classList.add('is-visible');
    clearTimeout(directStatusTimer);
    directStatusTimer = setTimeout(() => status.classList.remove('is-visible'), failed ? 3200 : 1500);
  }

  async function persistDirectChange(next) {
    if (!window.SUY_ADMIN || !await window.SUY_ADMIN.ensureAdminSession()) throw new Error('只有管理员可以保存。');
    await window.SUY_ADMIN.saveContent(aboutKey, next);
    data = normalize(next);
  }

  function bindCalendarQuickEditor() {
    const choice = $('#about-calendar-quick-symbol');
    choice?.addEventListener('change', () => {
      const wrap = $('#about-calendar-quick-custom-wrap');
      if (wrap) wrap.hidden = choice.value !== 'custom';
      if (!wrap?.hidden) $('#about-calendar-quick-custom')?.focus();
    });
    $('[data-calendar-quick-cancel]')?.addEventListener('click', () => { calendarSelectedDate = ''; renderDialog(); });
    $('[data-calendar-quick-save]')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      showDirectStatus('SAVING…');
      try {
        const next = normalize(data);
        const selectedChoice = asText($('#about-calendar-quick-symbol')?.value);
        const custom = asText($('#about-calendar-quick-custom')?.value);
        const item = {
          date:calendarSelectedDate,
          symbol:limitSymbol(selectedChoice === 'custom' ? custom : selectedChoice),
          title:asText($('#about-calendar-quick-title')?.value),
          note:asText($('#about-calendar-quick-note')?.value)
        };
        const index = next.calendar.importantDates.findIndex(entry => entry.date === calendarSelectedDate);
        if (index >= 0) next.calendar.importantDates[index] = item;
        else next.calendar.importantDates.push(item);
        next.calendar.importantDates = sortedDates(next.calendar.importantDates);
        await persistDirectChange(next);
        renderDialog();
        showDirectStatus('SAVED');
      } catch (error) {
        console.error(error);
        showDirectStatus(error?.message || 'SAVE FAILED', true);
      } finally {
        button.disabled = false;
      }
    });
    $('[data-calendar-quick-remove]')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      showDirectStatus('SAVING…');
      try {
        const next = normalize(data);
        next.calendar.importantDates = next.calendar.importantDates.filter(item => item.date !== calendarSelectedDate);
        await persistDirectChange(next);
        calendarSelectedDate = '';
        renderDialog();
        showDirectStatus('SAVED');
      } catch (error) {
        console.error(error);
        showDirectStatus(error?.message || 'SAVE FAILED', true);
      } finally {
        button.disabled = false;
      }
    });
  }

  function inlineValueFor(element) {
    const { inlineKind:kind, inlineField:field, inlineSection:section, inlineIndex:indexText, inlineDate:date } = element.dataset;
    const index = Number(indexText);
    if (kind === 'presentation') return asText(data.presentation?.[section]?.[field]);
    if (kind === 'calendar-copy') return field === 'weekday' ? asText(data.calendar.weekdays[index]) : asText(data.calendar[field]);
    if (kind === 'calendar-event') return asText(data.calendar.importantDates.find(item => item.date === date)?.[field]);
    if (kind === 'flower') return asText(data.flowers[index]?.[field]);
    if (kind === 'music') return asText(data.music[index]?.[field]);
    if (kind === 'album') return asText(data.albums[index]?.[field]);
    if (kind === 'personal') return asText(data.personal?.[field]);
    if (kind === 'favorite') return asText(data.favorites[index]?.[field]);
    return asText(element.textContent);
  }

  function assignInlineValue(next, element, value) {
    const { inlineKind:kind, inlineField:field, inlineSection:section, inlineIndex:indexText, inlineDate:date } = element.dataset;
    const index = Number(indexText);
    if (kind === 'presentation' && next.presentation?.[section] && ['kicker', 'title', 'description', 'emptyText'].includes(field)) next.presentation[section][field] = value;
    else if (kind === 'calendar-copy' && field === 'weekday' && Number.isInteger(index) && index >= 0 && index < 7) next.calendar.weekdays[index] = value;
    else if (kind === 'calendar-copy' && ['caption', 'listTitle'].includes(field)) next.calendar[field] = value;
    else if (kind === 'calendar-event' && ['title', 'note'].includes(field)) {
      const item = next.calendar.importantDates.find(entry => entry.date === date);
      if (item) item[field] = value;
    } else if (kind === 'flower' && next.flowers[index] && ['name', 'description'].includes(field)) next.flowers[index][field] = value;
    else if (kind === 'music' && next.music[index] && ['title', 'artist'].includes(field)) next.music[index][field] = value;
    else if (kind === 'album' && next.albums[index] && ['title', 'description'].includes(field)) next.albums[index][field] = value;
    else if (kind === 'personal' && ['title', 'text'].includes(field)) next.personal[field] = value;
    else if (kind === 'favorite' && next.favorites[index] && ['title', 'type', 'note'].includes(field)) next.favorites[index][field] = value;
    else throw new Error('这个位置暂时不能编辑。');
  }

  function startDirectTextEdit(element) {
    if (!window.SUY_IS_ADMIN || dialogEditing || element.isContentEditable) return;
    const original = inlineValueFor(element);
    element.textContent = original;
    element.contentEditable = 'true';
    element.spellcheck = false;
    element.classList.remove('is-admin-placeholder');
    element.classList.add('is-direct-editing');
    element.focus({ preventScroll:true });
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    let finished = false;
    const finish = async save => {
      if (finished) return;
      finished = true;
      const value = asText(element.innerText ?? element.textContent);
      element.removeEventListener('blur', onBlur);
      element.removeEventListener('keydown', onKeydown);
      element.contentEditable = 'false';
      element.classList.remove('is-direct-editing');
      if (!save || value === original) { renderDialog(); return; }
      showDirectStatus('SAVING…');
      try {
        const next = normalize(data);
        assignInlineValue(next, element, value);
        await persistDirectChange(next);
        renderDialog();
        showDirectStatus('SAVED');
      } catch (error) {
        console.error(error);
        renderDialog();
        showDirectStatus(error?.message || 'SAVE FAILED', true);
      }
    };
    const onBlur = () => finish(true);
    const onKeydown = event => {
      if (event.isComposing) return;
      if (event.key === 'Escape') { event.preventDefault(); finish(false); return; }
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); finish(true); }
    };
    element.addEventListener('blur', onBlur);
    element.addEventListener('keydown', onKeydown);
  }

  function fillCalendarMarkForm() {
    const item = calendarDraft.find(entry => entry.date === calendarSelectedDate);
    const output = $('#about-calendar-selected');
    if (output) output.textContent = calendarSelectedDate || '请先点击左侧日期';
    const title = $('#about-calendar-mark-title');
    const note = $('#about-calendar-mark-note');
    if (title) title.value = item?.title || '';
    if (note) note.value = item?.note || '';
    const symbol = limitSymbol(item?.symbol);
    const presets = ['●', '★', '♥', '✦', '✓', '○'];
    const choice = $('#about-calendar-symbol-choice');
    const custom = $('#about-calendar-custom-symbol');
    const customWrap = $('#about-calendar-custom-symbol-wrap');
    if (choice) choice.value = presets.includes(symbol) ? symbol : 'custom';
    if (custom) custom.value = presets.includes(symbol) ? '' : symbol;
    if (customWrap) customWrap.hidden = choice?.value !== 'custom';
    const remove = $('#about-calendar-remove-mark');
    const apply = $('#about-calendar-apply-mark');
    if (remove) remove.disabled = !calendarSelectedDate;
    if (apply) apply.disabled = !calendarSelectedDate;
  }

  function syncCalendarDraftFromForm() {
    if (!calendarSelectedDate) return;
    const choice = asText($('#about-calendar-symbol-choice')?.value);
    const custom = asText($('#about-calendar-custom-symbol')?.value);
    const symbol = limitSymbol(choice === 'custom' ? custom : choice);
    const item = calendarDraft.find(entry => entry.date === calendarSelectedDate);
    const next = {
      date: calendarSelectedDate,
      symbol,
      title: asText($('#about-calendar-mark-title')?.value),
      note: asText($('#about-calendar-mark-note')?.value)
    };
    if (item) Object.assign(item, next);
    else calendarDraft.push(next);
  }

  function refreshCalendarEditorDynamic() {
    const card = $('[data-calendar-editor-card]');
    const list = $('[data-calendar-draft-list]');
    if (card) card.innerHTML = calendarCardMarkup(calendarDraft, { interactive:true });
    if (list) list.innerHTML = calendarDraftListMarkup();
    bindCalendarEditorDynamic();
    fillCalendarMarkForm();
  }

  function selectCalendarDate(value) {
    syncCalendarDraftFromForm();
    calendarSelectedDate = value;
    if (!calendarDraft.some(item => item.date === value)) calendarDraft.push({ date:value, title:'', note:'', symbol:'●' });
    refreshCalendarEditorDynamic();
  }

  function bindCalendarEditorDynamic() {
    const root = $('#about-dialog-body');
    if (!root) return;
    root.querySelectorAll('[data-calendar-shift]').forEach(button => button.addEventListener('click', () => {
      syncCalendarDraftFromForm();
      const next = new Date(calendarViewYear, calendarViewMonth + Number(button.dataset.calendarShift), 1);
      calendarViewYear = next.getFullYear();
      calendarViewMonth = next.getMonth();
      refreshCalendarEditorDynamic();
    }));
    root.querySelectorAll('[data-calendar-date]').forEach(button => button.addEventListener('click', () => selectCalendarDate(button.dataset.calendarDate)));
    root.querySelectorAll('[data-calendar-edit-date]').forEach(button => button.addEventListener('click', () => {
      const parts = dateParts(button.dataset.calendarEditDate);
      if (parts) { calendarViewYear = parts.year; calendarViewMonth = parts.month - 1; }
      selectCalendarDate(button.dataset.calendarEditDate);
    }));
  }

  function bindCalendarEditor() {
    bindCalendarEditorDynamic();
    $('#about-calendar-symbol-choice')?.addEventListener('change', event => {
      const wrap = $('#about-calendar-custom-symbol-wrap');
      if (wrap) wrap.hidden = event.currentTarget.value !== 'custom';
      if (!wrap?.hidden) $('#about-calendar-custom-symbol')?.focus();
    });
    $('#about-calendar-apply-mark')?.addEventListener('click', () => { syncCalendarDraftFromForm(); refreshCalendarEditorDynamic(); });
    $('#about-calendar-remove-mark')?.addEventListener('click', () => {
      if (!calendarSelectedDate) return;
      calendarDraft = calendarDraft.filter(item => item.date !== calendarSelectedDate);
      calendarSelectedDate = '';
      refreshCalendarEditorDynamic();
    });
    fillCalendarMarkForm();
  }

  function renderEditor() {
    const root = $('#about-editor-body');
    if (!root) return;
    root.innerHTML = `${sectionMarkup('date', '1 · IMPORTANT DATES', data.calendar.importantDates)}
      ${sectionMarkup('flower', '2 · FLOWERS', data.flowers)}
      ${sectionMarkup('music', '3 · MUSIC', data.music)}
      ${sectionMarkup('album', '5 · PHOTO ALBUMS', data.albums)}
      <section class="about-editor-section" data-about-editor-section="personal"><div class="about-editor-section-head"><h3>7 · PERSONAL INTRODUCTION</h3></div><label>TITLE<input id="about-personal-title" type="text" value="${esc(data.personal.title)}" placeholder="About me"></label><label>TEXT<textarea id="about-personal-text" rows="5" placeholder="Write a short introduction">${esc(data.personal.text)}</textarea></label></section>
      ${sectionMarkup('favorite', '8 · FILM & TV FAVORITES', data.favorites)}`;
  }

  function openEditor(sectionKey = '') {
    if (!window.SUY_IS_ADMIN) return;
    renderEditor();
    const dialog = $('#about-editor-dialog');
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    if (!sectionKey) { dialog.scrollTop = 0; return; }
    requestAnimationFrame(() => {
      const section = $(`[data-about-editor-section="${sectionKey}"]`, dialog);
      if (!section) return;
      $$('.about-editor-section.is-targeted', dialog).forEach(item => item.classList.remove('is-targeted'));
      section.classList.add('is-targeted');
      dialog.scrollTo({ top:Math.max(0, section.offsetTop - 70), behavior:'smooth' });
      const field = $('input:not([type="file"]), textarea, button', section);
      if (field) setTimeout(() => field.focus({ preventScroll:true }), 260);
      setTimeout(() => section.classList.remove('is-targeted'), 1400);
    });
  }

  function handleEditorRowsClick(event, root) {
    if (!(event.target instanceof Element)) return;
    const remove = event.target.closest('[data-remove-row]');
    if (remove) { remove.closest('[data-editor-row]')?.remove(); return; }
    const move = event.target.closest('[data-move-row]');
    if (move) {
      const row = move.closest('[data-editor-row]');
      if (!row) return;
      if (move.dataset.moveRow === 'up' && row.previousElementSibling) row.parentElement.insertBefore(row, row.previousElementSibling);
      if (move.dataset.moveRow === 'down' && row.nextElementSibling) row.parentElement.insertBefore(row.nextElementSibling, row);
      return;
    }
    const add = event.target.closest('[data-add-row]');
    if (!add) return;
    const type = add.dataset.addRow;
    const rows = $(`[data-editor-rows="${type}"]`, root);
    if (!rows) return;
    rows.querySelector('.about-editor-empty')?.remove();
    rows.insertAdjacentHTML('beforeend', editorRow(type));
  }

  $('#about-editor-body')?.addEventListener('click', event => handleEditorRowsClick(event, event.currentTarget));
  $('#about-dialog-body')?.addEventListener('click', event => { if (dialogEditing) handleEditorRowsClick(event, event.currentTarget); });

  async function uploadFile(file, folder) {
    if (!file) return '';
    if (!window.SUY_ADMIN?.uploadPublic) throw new Error('管理员上传服务尚未准备好。');
    return window.SUY_ADMIN.uploadPublic(file, folder);
  }
  const rowValue = (row, field) => asText($(`[data-field="${field}"]`, row)?.value);

  async function collectFlowerRows(root, status) {
    const items = [];
    const rows = $$('[data-editor-row="flower"]', root);
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (status) status.textContent = `上传花朵图片 ${index + 1}/${rows.length}…`;
      const file = $('[data-field="image"]', row)?.files?.[0];
      const image = file ? await uploadFile(file, 'about-flowers') : asText(row.dataset.currentImage);
      const item = { name:rowValue(row,'name'), description:rowValue(row,'description'), image };
      if (item.name || item.description || item.image) items.push(item);
    }
    return items;
  }

  async function collectAlbumRows(root, status) {
    const items = [];
    const rows = $$('[data-editor-row="album"]', root);
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      let photos = [];
      try { photos = JSON.parse(row.dataset.currentPhotos || '[]').filter(Boolean); } catch {}
      const files = [...($('[data-field="photos"]', row)?.files || [])];
      for (const [fileIndex, file] of files.entries()) {
        if (status) status.textContent = `上传相册图片 ${index + 1}/${rows.length} · ${fileIndex + 1}/${files.length}…`;
        const url = await uploadFile(file, 'about-albums');
        if (url) photos.push(url);
      }
      const item = { title:rowValue(row,'title'), description:rowValue(row,'description'), photos, layout:rowValue(row,'layout') === 'list' ? 'list' : 'grid' };
      if (item.title || item.description || item.photos.length) items.push(item);
    }
    return items;
  }

  function collectPopupSettings(next, root, key) {
    const settings = $('[data-popup-settings]', root);
    if (!settings) return;
    const sectionKey = presentationKeyFor(key);
    const value = field => asText($(`[data-popup-field="${field}"]`, settings)?.value);
    const allowedLayouts = layoutChoices[sectionKey].map(item => item[0]);
    next.presentation[sectionKey] = {
      kicker: value('kicker'),
      title: value('title'),
      description: value('description'),
      emptyText: value('emptyText'),
      layout: allowedLayouts.includes(value('layout')) ? value('layout') : layoutChoices[sectionKey][0][0]
    };
  }

  async function saveInlineEditor() {
    const root = $('#about-dialog-body');
    const status = $('#about-inline-status');
    const saveButton = $('#about-inline-save');
    const itemKey = dialogItem;
    const section = editorSectionFor(itemKey);
    if (!root || !section) return;
    if (!window.SUY_ADMIN || !await window.SUY_ADMIN.ensureAdminSession()) { if (status) status.textContent = '只有管理员可以保存。'; return; }
    if (saveButton) saveButton.disabled = true;
    if (status) status.textContent = 'SAVING…';
    try {
      const next = normalize(data);
      collectPopupSettings(next, root, itemKey);
      if (section === 'date') {
        syncCalendarDraftFromForm();
        const uniqueDates = new Map(calendarDraft.map(item => [item.date, { date:asText(item.date), title:asText(item.title), note:asText(item.note), symbol:limitSymbol(item.symbol) }]));
        next.calendar.importantDates = sortedDates([...uniqueDates.values()].filter(item => item.date));
        const weekdays = String($('#about-calendar-weekdays')?.value ?? '').split(/[,，]/).map(asText);
        if (weekdays.length !== 7) throw new Error('星期文字需要填写 7 个，并用逗号分开。');
        next.calendar.weekdays = weekdays;
        next.calendar.caption = asText($('#about-calendar-caption')?.value);
        next.calendar.listTitle = asText($('#about-calendar-list-title')?.value);
        next.calendar.editorHint = asText($('#about-calendar-editor-hint')?.value);
      }
      if (section === 'flower') next.flowers = await collectFlowerRows(root, status);
      if (section === 'music') next.music = $$('[data-editor-row="music"]', root).map(row => ({ title:rowValue(row,'title'), artist:rowValue(row,'artist'), url:rowValue(row,'url') })).filter(item => item.title || item.artist || item.url);
      if (section === 'personal') next.personal = { title:asText($('#about-inline-personal-title')?.value) || 'ABOUT ME', text:asText($('#about-inline-personal-text')?.value) };
      if (section === 'favorite') next.favorites = $$('[data-editor-row="favorite"]', root).map(row => ({ title:rowValue(row,'title'), type:rowValue(row,'type'), note:rowValue(row,'note'), url:rowValue(row,'url') })).filter(item => item.title || item.type || item.note || item.url);
      if (section === 'album') {
        const albums = await collectAlbumRows(root, status);
        if (itemKey.startsWith('album:')) {
          const index = Number(itemKey.slice(6));
          if (!Number.isInteger(index) || index < 0 || index >= next.albums.length) throw new Error('找不到这个相册。');
          if (albums[0]) next.albums[index] = albums[0];
          else { next.albums.splice(index, 1); dialogItem = 'camera'; }
        } else next.albums = albums;
      }
      if (status) status.textContent = 'SAVING TO SUPABASE…';
      await window.SUY_ADMIN.saveContent(aboutKey, next);
      data = normalize(next);
      dialogEditing = false;
      renderDialog();
    } catch (error) {
      console.error(error);
      if (status) status.textContent = `SAVE FAILED: ${error?.message || error}`;
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  }

  async function saveEditor() {
    const status = $('#about-editor-status');
    const saveButton = $('#about-editor-save');
    if (!window.SUY_ADMIN || !await window.SUY_ADMIN.ensureAdminSession()) { if (status) status.textContent = '只有管理员可以保存。'; return; }
    if (saveButton) saveButton.disabled = true;
    if (status) status.textContent = 'SAVING…';
    try {
      const next = normalize(data);
      next.calendar.importantDates = $$('[data-editor-row="date"]', $('#about-editor-body')).map(row => ({ date:rowValue(row,'date'), title:rowValue(row,'title'), note:rowValue(row,'note'), symbol:limitSymbol(rowValue(row,'symbol')) })).filter(item => item.date || item.title || item.note);
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
        const item = { title:rowValue(row,'title'), description:rowValue(row,'description'), photos, layout:rowValue(row,'layout') === 'list' ? 'list' : 'grid' };
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

  $('#about-edit')?.addEventListener('click', () => openEditor());
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
    syncAdminControls();
    document.addEventListener('suyoon-admin-state', event => {
      const admin = !!event.detail?.admin;
      if (!admin && dialogEditing) {
        dialogEditing = false;
        if ($('#about-item-dialog')?.open) renderDialog();
      }
      syncAdminControls(admin);
    });
  }
  load();
})();

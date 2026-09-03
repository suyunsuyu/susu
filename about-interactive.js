(() => {
  if (!document.body.classList.contains('about-interactive-page')) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
  const text = value => String(value ?? '').trim();
  const list = value => Array.isArray(value) ? value : [];
  const aboutKey = 'about-interactive';
  const lampStorageKey = 'suyoon-about-lamp';
  const sectionKeys = ['calendar', 'flowers', 'music', 'camera', 'personal', 'favorites'];
  const sectionTitles = {
    calendar:'CALENDAR',
    flowers:'FLOWERS · 花',
    music:'MUSIC',
    camera:'CAMERA',
    personal:'ABOUT ME',
    favorites:'FILM & TV'
  };

  const validColor = value => /^#[0-9a-f]{6}$/i.test(text(value)) ? text(value) : '#e35f86';
  const validNoteFont = value => ['mono', 'serif', 'hand'].includes(text(value)) ? text(value) : 'mono';
  const noteFontClass = value => `about-note-font-${validNoteFont(value)}`;
  const marker = value => Array.from(text(value)).slice(0, 3).join('') || '●';
  const safeLink = value => {
    const raw = text(value);
    if (!raw) return '';
    try {
      const url = new URL(raw);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  const sourceName = value => {
    const url = safeLink(value);
    if (!url) return '';
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      if (host === 'open.spotify.com') return 'SPOTIFY';
      if (host === 'youtu.be' || host.endsWith('youtube.com')) return 'YOUTUBE';
      if (host.endsWith('music.apple.com')) return 'APPLE MUSIC';
      return host.toUpperCase();
    } catch { return 'SOURCE'; }
  };
  const playerSpec = value => {
    const url = safeLink(value);
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./, '');
      if (host === 'open.spotify.com') {
        const match = /^\/(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)(?:\/|$)/.exec(parsed.pathname);
        if (match) return { kind:'spotify', provider:'SPOTIFY', src:`https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator` };
      }
      if (host === 'youtu.be' || host.endsWith('youtube.com')) {
        const id = host === 'youtu.be' ? parsed.pathname.split('/').filter(Boolean)[0] : parsed.searchParams.get('v') || (/^\/shorts\/([^/]+)/.exec(parsed.pathname)?.[1] ?? '') || (/^\/embed\/([^/]+)/.exec(parsed.pathname)?.[1] ?? '');
        if (/^[A-Za-z0-9_-]{6,15}$/.test(id || '')) return { kind:'youtube', provider:'YOUTUBE', src:`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` };
      }
      if (host.endsWith('music.apple.com')) return { kind:'apple', provider:'APPLE MUSIC', src:`https://embed.music.apple.com${parsed.pathname}${parsed.search}` };
      if (/\.(mp3|m4a|aac|ogg|wav)(?:$|\?)/i.test(url)) return { kind:'audio', provider:'AUDIO SOURCE', src:url };
    } catch {}
    return null;
  };
  const normalizeDate = value => {
    const match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text(value));
    if (!match) return '';
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  const makePresentation = key => ({ kicker:'ABOUT', title:sectionTitles[key] || 'ABOUT' });
  const defaults = () => ({
    calendar:{ importantDates:[], listTitle:'INDEX' },
    flowers:[],
    music:[],
    albums:[],
    personal:{ title:'ABOUT ME', text:'' },
    favorites:[],
    presentation:Object.fromEntries(sectionKeys.map(key => [key, makePresentation(key)]))
  });

  function normalize(value) {
    const base = defaults();
    const source = value && typeof value === 'object' ? value : {};
    base.calendar = {
      ...base.calendar,
      ...(source.calendar && typeof source.calendar === 'object' ? source.calendar : {}),
      listTitle:text(source.calendar?.listTitle) || 'INDEX',
      importantDates:list(source.calendar?.importantDates).map(item => ({
        date:normalizeDate(item?.date),
        title:text(item?.title),
        note:text(item?.note),
        symbol:marker(item?.symbol),
        color:validColor(item?.color),
        font:validNoteFont(item?.font)
      })).filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item.date))
    };
    base.flowers = list(source.flowers).map(item => ({
      ...item,
      name:text(item?.name),
      description:text(item?.description),
      image:text(item?.image)
    })).filter(item => item.name || item.description || item.image);
    base.music = list(source.music).map(item => ({
      ...item,
      title:text(item?.title),
      artist:text(item?.artist),
      image:text(item?.image),
      url:text(item?.url)
    })).filter(item => item.title || item.image || item.url);
    base.albums = list(source.albums).map(item => ({
      ...item,
      title:text(item?.title),
      description:text(item?.description),
      photos:list(item?.photos || item?.images).map(text).filter(Boolean),
      layout:['grid', 'list'].includes(text(item?.layout)) ? text(item.layout) : 'grid'
    })).filter(item => item.title || item.photos.length);
    base.personal = {
      ...(source.personal && typeof source.personal === 'object' ? source.personal : {}),
      title:text(source.personal?.title) || 'ABOUT ME',
      text:text(source.personal?.text)
    };
    base.favorites = list(source.favorites).map(item => ({
      ...item,
      title:text(item?.title),
      type:text(item?.type),
      note:text(item?.note),
      image:text(item?.image),
      url:text(item?.url)
    })).filter(item => item.title || item.image || item.url);
    sectionKeys.forEach(key => {
      const raw = source.presentation?.[key] && typeof source.presentation[key] === 'object' ? source.presentation[key] : {};
      base.presentation[key] = {
        ...raw,
        kicker:text(raw.kicker) || 'ABOUT',
        title:text(raw.title) || sectionTitles[key]
      };
    });
    return base;
  }

  let data = defaults();
  let dialogItem = '';
  let calendarViewYear = new Date().getFullYear();
  let calendarViewMonth = new Date().getMonth();
  let calendarSelectedDate = '';
  let editorState = null;
  let lampOn = false;
  let statusTimer = 0;
  try { lampOn = localStorage.getItem(lampStorageKey) === 'on'; } catch {}

  const presentationKey = key => String(key || '').startsWith('album:') ? 'camera' : key;
  const presentation = key => data.presentation[presentationKey(key)] || makePresentation(presentationKey(key));
  const dateKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dateParts = value => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(value));
    return match ? { year:Number(match[1]), month:Number(match[2]), day:Number(match[3]) } : null;
  };
  const sortedDates = entries => [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const itemsFor = kind => kind === 'camera' ? data.albums : kind === 'music' ? data.music : kind === 'favorites' ? data.favorites : kind === 'flowers' ? data.flowers : [];

  function setLampState(next) {
    lampOn = !!next;
    document.body.classList.toggle('about-lamp-on', lampOn);
    $$('[data-about-hotspot="lamp"]').forEach(button => button.setAttribute('aria-pressed', String(lampOn)));
    try { localStorage.setItem(lampStorageKey, lampOn ? 'on' : 'off'); } catch {}
  }
  setLampState(lampOn);

  function showStatus(message, failed = false) {
    const dialog = $('#about-item-dialog');
    if (!dialog) return;
    let node = $('.about-direct-status', dialog);
    if (!node) {
      node = document.createElement('div');
      node.className = 'about-direct-status';
      node.setAttribute('role', 'status');
      dialog.appendChild(node);
    }
    node.textContent = message;
    node.classList.toggle('is-error', failed);
    node.classList.add('is-visible');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => node.classList.remove('is-visible'), failed ? 3000 : 1400);
  }

  async function persist(next) {
    if (!window.SUY_ADMIN || !await window.SUY_ADMIN.ensureAdminSession()) throw new Error('只有管理员可以保存。');
    await window.SUY_ADMIN.saveContent(aboutKey, next);
    data = normalize(next);
  }

  const inlineAttrs = (kind, field, options = {}) => {
    const attrs = [`data-inline-kind="${esc(kind)}"`, `data-inline-field="${esc(field)}"`];
    if (options.section !== undefined) attrs.push(`data-inline-section="${esc(options.section)}"`);
    if (options.index !== undefined) attrs.push(`data-inline-index="${esc(options.index)}"`);
    if (options.multiline) attrs.push('data-inline-multiline="true"');
    return ` ${attrs.join(' ')}`;
  };

  function applyInlineTarget(node, kind, field, options = {}) {
    if (!node) return;
    ['inlineKind', 'inlineField', 'inlineSection', 'inlineIndex', 'inlineMultiline'].forEach(key => delete node.dataset[key]);
    node.dataset.inlineKind = kind;
    node.dataset.inlineField = field;
    if (options.section !== undefined) node.dataset.inlineSection = String(options.section);
    if (options.index !== undefined) node.dataset.inlineIndex = String(options.index);
    if (options.multiline) node.dataset.inlineMultiline = 'true';
  }

  function inlineValue(node) {
    const kind = node.dataset.inlineKind;
    const field = node.dataset.inlineField;
    const index = Number(node.dataset.inlineIndex);
    if (kind === 'presentation') return text(data.presentation[node.dataset.inlineSection]?.[field]);
    if (kind === 'calendar') return text(data.calendar[field]);
    if (kind === 'album') return text(data.albums[index]?.[field]);
    if (kind === 'music') return text(data.music[index]?.[field]);
    if (kind === 'favorite') return text(data.favorites[index]?.[field]);
    if (kind === 'flower') return text(data.flowers[index]?.[field]);
    if (kind === 'personal') return text(data.personal[field]);
    return text(node.textContent);
  }

  function assignInlineValue(next, node, value) {
    const kind = node.dataset.inlineKind;
    const field = node.dataset.inlineField;
    const index = Number(node.dataset.inlineIndex);
    if (kind === 'presentation' && next.presentation[node.dataset.inlineSection] && ['kicker', 'title'].includes(field)) next.presentation[node.dataset.inlineSection][field] = value;
    else if (kind === 'calendar' && field === 'listTitle') next.calendar.listTitle = value || 'INDEX';
    else if (kind === 'album' && next.albums[index] && field === 'title') next.albums[index].title = value;
    else if (kind === 'music' && next.music[index] && field === 'title') next.music[index].title = value;
    else if (kind === 'favorite' && next.favorites[index] && field === 'title') next.favorites[index].title = value;
    else if (kind === 'flower' && next.flowers[index] && ['name', 'description'].includes(field)) next.flowers[index][field] = value;
    else if (kind === 'personal' && ['title', 'text'].includes(field)) next.personal[field] = value;
    else throw new Error('这个位置不能直接编辑。');
  }

  function startDirectEdit(node) {
    if (!window.SUY_IS_ADMIN || node.isContentEditable) return;
    const original = inlineValue(node);
    node.textContent = original;
    node.contentEditable = 'true';
    node.spellcheck = false;
    node.classList.add('is-direct-editing');
    node.focus({ preventScroll:true });
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
    let finished = false;
    const finish = async save => {
      if (finished) return;
      finished = true;
      const value = text(node.innerText ?? node.textContent);
      node.removeEventListener('blur', onBlur);
      node.removeEventListener('keydown', onKeydown);
      node.contentEditable = 'false';
      node.classList.remove('is-direct-editing');
      if (!save || value === original) { renderDialog(); return; }
      showStatus('SAVING…');
      try {
        const next = normalize(data);
        assignInlineValue(next, node, value);
        await persist(next);
        renderDialog();
        showStatus('SAVED');
      } catch (error) {
        console.error(error);
        renderDialog();
        showStatus(error?.message || 'SAVE FAILED', true);
      }
    };
    const onBlur = () => finish(true);
    const onKeydown = event => {
      if (event.isComposing) return;
      if (event.key === 'Escape') { event.preventDefault(); finish(false); }
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); finish(true); }
    };
    node.addEventListener('blur', onBlur);
    node.addEventListener('keydown', onKeydown);
  }

  function calendarMarkup() {
    const now = new Date();
    const firstDay = new Date(calendarViewYear, calendarViewMonth, 1).getDay();
    const totalDays = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
    const marked = new Map();
    data.calendar.importantDates.forEach(item => {
      const parts = dateParts(item.date);
      if (parts && parts.year === calendarViewYear && parts.month === calendarViewMonth + 1) marked.set(parts.day, item);
    });
    const cells = Array.from({ length:firstDay }, () => '<span class="about-calendar-day is-empty"></span>');
    for (let day = 1; day <= totalDays; day += 1) {
      const item = marked.get(day);
      const fullDate = dateKey(calendarViewYear, calendarViewMonth, day);
      const isToday = calendarViewYear === now.getFullYear() && calendarViewMonth === now.getMonth() && day === now.getDate();
      const classes = `about-calendar-day${item ? ' is-marked' : ''}${isToday ? ' is-today' : ''}${calendarSelectedDate === fullDate ? ' is-selected' : ''}`;
      const inside = `<span class="about-calendar-number">${day}</span>${item ? `<span class="about-calendar-symbol" style="--event-color:${item.color}" aria-hidden="true">${esc(item.symbol)}</span>` : ''}`;
      cells.push(window.SUY_IS_ADMIN || item
        ? `<button type="button" class="${classes}" data-calendar-date="${fullDate}" aria-label="${esc(fullDate)}">${inside}</button>`
        : `<span class="${classes}">${inside}</span>`);
    }
    const month = new Intl.DateTimeFormat('en-US', { month:'long' }).format(new Date(calendarViewYear, calendarViewMonth, 1)).toUpperCase();
    const entries = sortedDates(data.calendar.importantDates);
    return `<div class="about-dialog-columns about-calendar-columns">
      <section class="about-calendar-card" aria-label="${esc(month)} ${calendarViewYear}">
        <div class="about-calendar-month">
          <button type="button" data-calendar-shift="-1" aria-label="Previous month">←</button>
          <strong>${esc(month)} <span>${calendarViewYear}</span></strong>
          <button type="button" data-calendar-shift="1" aria-label="Next month">→</button>
        </div>
        <div class="about-calendar-weekdays" aria-hidden="true">${['S','M','T','W','T','F','S'].map(day => `<span>${day}</span>`).join('')}</div>
        <div class="about-calendar-grid">${cells.join('')}</div>
      </section>
      <aside class="about-date-index">
        <div class="about-list-head"><strong${inlineAttrs('calendar', 'listTitle')}>${esc(data.calendar.listTitle || 'INDEX')}</strong><span>↗</span></div>
        <div class="about-date-index-list">${entries.map(item => `<button type="button" data-calendar-index="${esc(item.date)}" style="--event-color:${item.color}"><span class="about-date-index-marker">${esc(item.symbol)}</span><time>${esc(item.date)}</time><strong class="${noteFontClass(item.font)}">${esc(item.title)}</strong></button>`).join('')}</div>
      </aside>
    </div>`;
  }

  function coverMarkup(kind, item, index) {
    const title = kind === 'flowers' ? item.name : item.title;
    const src = kind === 'camera' ? item.photos?.[0] : item.image;
    const fallback = esc(Array.from(title || '·')[0] || '·');
    const art = src ? `<img src="${esc(src)}" alt="${esc(title)}" loading="lazy">` : `<span class="about-archive-letter" aria-hidden="true">${fallback}</span>`;
    if (kind === 'camera') return `<button type="button" class="about-archive-cover" data-open-album="${index}" aria-label="Open ${esc(title || 'album')}">${art}</button>`;
    if (kind === 'music' && playerSpec(item.url)) return `<button type="button" class="about-archive-cover" data-play-music="${index}" aria-label="Play ${esc(title || 'music')}">${art}</button>`;
    if (kind === 'music') return `<div class="about-archive-cover">${art}</div>`;
    const url = safeLink(item.url);
    if (url) return `<a class="about-archive-cover" href="${esc(url)}" target="_blank" rel="noreferrer" aria-label="Open ${esc(title || 'link')}">${art}</a>`;
    return `<div class="about-archive-cover">${art}</div>`;
  }

  function archiveMarkup(kind) {
    const items = itemsFor(kind);
    if (!items.length) return window.SUY_IS_ADMIN ? `<button type="button" class="about-archive-empty-add" data-add-card="${kind}">＋</button>` : '';
    return `<div class="about-archive-list">${items.map((item, index) => {
      const title = kind === 'flowers' ? item.name : item.title;
      const inlineKind = kind === 'favorites' ? 'favorite' : kind === 'camera' ? 'album' : kind === 'flowers' ? 'flower' : 'music';
      const extra = kind === 'flowers' && item.description ? `<p${inlineAttrs('flower', 'description', { index, multiline:true })}>${esc(item.description)}</p>` : '';
      const url = safeLink(item.url);
      const spec = kind === 'music' ? playerSpec(url) : null;
      const credit = kind === 'music' ? text(item.artist) || sourceName(url) : '';
      const source = url ? `<a class="about-archive-open" href="${esc(url)}" target="_blank" rel="noreferrer">SOURCE · ${esc(sourceName(url) || 'LINK')} ↗</a>` : '';
      const open = kind === 'camera'
        ? `<button type="button" class="about-archive-open" data-open-album="${index}">OPEN ↗</button>`
        : kind === 'music'
          ? `${spec ? `<button type="button" class="about-archive-open" data-play-music="${index}" aria-expanded="false">PLAY</button>` : ''}${source}`
          : source;
      const admin = window.SUY_IS_ADMIN ? `<div class="about-archive-admin"><button type="button" data-edit-card="${kind}" data-card-index="${index}">EDIT</button><button type="button" data-delete-card="${kind}" data-card-index="${index}">DELETE</button></div>` : '';
      return `<article class="about-archive-card">${coverMarkup(kind, item, index)}<div class="about-archive-meta"><small>${String(index + 1).padStart(2, '0')}</small><h3${inlineAttrs(inlineKind, kind === 'flowers' ? 'name' : 'title', { index })}>${esc(title || 'UNTITLED')}</h3>${credit ? `<small class="about-archive-credit">CREDIT · ${esc(credit)}</small>` : ''}${extra}<div class="about-archive-links">${open}</div>${admin}</div></article>`;
    }).join('')}</div>`;
  }

  function personalMarkup() {
    const value = data.personal.text;
    return `<article class="about-personal-card"><h3${inlineAttrs('personal', 'title')}>${esc(data.personal.title)}</h3>${value || window.SUY_IS_ADMIN ? `<div class="about-personal-text${value ? '' : ' is-admin-placeholder'}"${inlineAttrs('personal', 'text', { multiline:true })}>${esc(value || '双击添加个人介绍')}</div>` : ''}</article>`;
  }

  function albumMarkup(index) {
    const album = data.albums[index];
    if (!album) return '';
    return `<div class="about-photo-grid">${album.photos.map((src, photoIndex) => `<button type="button" class="about-photo-button" data-open-photo="${photoIndex}"><img src="${esc(src)}" alt="${esc(album.title)} ${photoIndex + 1}" loading="lazy"></button>`).join('')}</div>`;
  }

  function publicMarkup(key) {
    if (key === 'calendar') return calendarMarkup();
    if (key === 'flowers') return archiveMarkup('flowers');
    if (key === 'music') return archiveMarkup('music');
    if (key === 'camera') return archiveMarkup('camera');
    if (key === 'favorites') return archiveMarkup('favorites');
    if (key === 'personal') return personalMarkup();
    if (key.startsWith('album:')) return albumMarkup(Number(key.slice(6)));
    return '';
  }

  function syncAdminControls(admin = !!window.SUY_IS_ADMIN) {
    const pageEdit = $('#about-edit');
    if (pageEdit) pageEdit.hidden = true;
    const button = $('#about-dialog-edit');
    if (!button) return;
    let label = '';
    if (dialogItem === 'flowers') label = '+ FLOWER';
    if (dialogItem === 'music') label = '+ MUSIC';
    if (dialogItem === 'camera') label = '+ ALBUM';
    if (dialogItem === 'favorites') label = '+ FILM / TV';
    if (dialogItem.startsWith('album:')) label = 'EDIT ALBUM';
    button.hidden = !(admin && label);
    button.textContent = label;
  }

  function renderDialog() {
    const dialog = $('#about-item-dialog');
    if (!dialog || !dialogItem) return;
    const isAlbum = dialogItem.startsWith('album:');
    dialog.classList.toggle('is-compact-archive', ['camera', 'music', 'favorites'].includes(dialogItem));
    dialog.dataset.aboutSection = presentationKey(dialogItem);
    const index = isAlbum ? Number(dialogItem.slice(6)) : -1;
    const meta = presentation(dialogItem);
    const kicker = $('#about-dialog-kicker');
    kicker.textContent = meta.kicker;
    applyInlineTarget(kicker, 'presentation', 'kicker', { section:presentationKey(dialogItem) });
    const titleNode = $('#about-dialog-title');
    const title = isAlbum ? data.albums[index]?.title : meta.title;
    titleNode.textContent = title || 'UNTITLED';
    if (isAlbum) applyInlineTarget(titleNode, 'album', 'title', { index });
    else applyInlineTarget(titleNode, 'presentation', 'title', { section:presentationKey(dialogItem) });
    $('#about-dialog-body').innerHTML = publicMarkup(dialogItem);
    $('#about-dialog-back').hidden = !isAlbum;
    syncAdminControls();
  }

  function openItem(key) {
    if (key === 'cat') { location.href = 'tools.html'; return; }
    if (key === 'lamp') { setLampState(!lampOn); return; }
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

  function renderCalendarNote(date) {
    const root = $('#about-calendar-note-body');
    const item = data.calendar.importantDates.find(entry => entry.date === date);
    if (!root) return;
    if (!window.SUY_IS_ADMIN) {
      root.innerHTML = `<article class="about-note-view ${noteFontClass(item.font)}" style="--event-color:${item.color}"><button type="button" data-note-close aria-label="Close">×</button><time>${esc(date)}</time><span class="about-note-view-symbol">${esc(item.symbol)}</span><h3>${esc(item.title)}</h3>${item.note ? `<p>${esc(item.note)}</p>` : ''}</article>`;
      $('[data-note-close]', root).addEventListener('click', () => $('#about-calendar-note').close());
      return;
    }
    const symbol = marker(item?.symbol);
    const noteFont = validNoteFont(item?.font);
    const presets = ['●', '★', '♥', '✦', '✓', '○'];
    const custom = !presets.includes(symbol);
    root.innerHTML = `<form id="about-note-form" class="about-note-form">
      <div class="about-note-head"><time>${esc(date)}</time><button type="button" data-note-close aria-label="Close">×</button></div>
      <div class="about-note-marker-row">
        <label>MARK<select id="about-note-symbol">${presets.map(value => `<option value="${value}"${symbol === value ? ' selected' : ''}>${value}</option>`).join('')}<option value="custom"${custom ? ' selected' : ''}>CUSTOM</option></select></label>
        <label id="about-note-custom-wrap"${custom ? '' : ' hidden'}>CUSTOM<input id="about-note-custom" maxlength="6" value="${custom ? esc(symbol) : ''}"></label>
        <label>COLOR<input id="about-note-color" type="color" value="${validColor(item?.color)}"></label>
      </div>
      <label>TYPEFACE<select id="about-note-font"><option value="mono"${noteFont === 'mono' ? ' selected' : ''}>MONO</option><option value="serif"${noteFont === 'serif' ? ' selected' : ''}>SERIF</option><option value="hand"${noteFont === 'hand' ? ' selected' : ''}>HAND</option></select></label>
      <label>TITLE<input id="about-note-title" value="${esc(item?.title || '')}" maxlength="80"></label>
      <label>NOTE<textarea id="about-note-text" rows="5">${esc(item?.note || '')}</textarea></label>
      <p id="about-note-status" role="status"></p>
      <div class="about-note-actions">${item ? '<button type="button" data-note-delete>DELETE</button>' : '<span></span>'}<button type="submit">SAVE</button></div>
    </form>`;
    const symbolSelect = $('#about-note-symbol', root);
    symbolSelect.addEventListener('change', () => {
      const wrap = $('#about-note-custom-wrap', root);
      wrap.hidden = symbolSelect.value !== 'custom';
      if (!wrap.hidden) $('#about-note-custom', root).focus();
    });
    $('[data-note-close]', root).addEventListener('click', () => $('#about-calendar-note').close());
    $('[data-note-delete]', root)?.addEventListener('click', () => deleteCalendarNote(date));
    $('#about-note-form', root).addEventListener('submit', event => saveCalendarNote(event, date));
  }

  function openCalendarNote(date) {
    const item = data.calendar.importantDates.find(entry => entry.date === date);
    if (!window.SUY_IS_ADMIN && !item) return;
    calendarSelectedDate = date;
    renderDialog();
    renderCalendarNote(date);
    const dialog = $('#about-calendar-note');
    if (dialog && !dialog.open) dialog.showModal();
  }

  async function saveCalendarNote(event, date) {
    event.preventDefault();
    const form = event.currentTarget;
    const saveButton = $('button[type="submit"]', form);
    const status = $('#about-note-status', form);
    saveButton.disabled = true;
    status.textContent = 'SAVING…';
    try {
      const choice = $('#about-note-symbol', form).value;
      const custom = $('#about-note-custom', form)?.value;
      const next = normalize(data);
      const note = {
        date,
        symbol:marker(choice === 'custom' ? custom : choice),
        color:validColor($('#about-note-color', form).value),
        font:validNoteFont($('#about-note-font', form).value),
        title:text($('#about-note-title', form).value),
        note:text($('#about-note-text', form).value)
      };
      const index = next.calendar.importantDates.findIndex(item => item.date === date);
      if (index >= 0) next.calendar.importantDates[index] = note;
      else next.calendar.importantDates.push(note);
      next.calendar.importantDates = sortedDates(next.calendar.importantDates);
      await persist(next);
      $('#about-calendar-note').close();
      renderDialog();
      showStatus('SAVED');
    } catch (error) {
      console.error(error);
      status.textContent = error?.message || 'SAVE FAILED';
      saveButton.disabled = false;
    }
  }

  async function deleteCalendarNote(date) {
    if (!confirm('Delete this date?')) return;
    try {
      const next = normalize(data);
      next.calendar.importantDates = next.calendar.importantDates.filter(item => item.date !== date);
      await persist(next);
      calendarSelectedDate = '';
      $('#about-calendar-note').close();
      renderDialog();
      showStatus('DELETED');
    } catch (error) {
      $('#about-note-status').textContent = error?.message || 'DELETE FAILED';
    }
  }

  function jumpToDate(date) {
    const parts = dateParts(date);
    if (!parts) return;
    calendarViewYear = parts.year;
    calendarViewMonth = parts.month - 1;
    calendarSelectedDate = date;
    renderDialog();
    requestAnimationFrame(() => {
      const target = $(`[data-calendar-date="${date}"]`, $('#about-dialog-body'));
      if (!target) return;
      target.focus({ preventScroll:true });
      target.scrollIntoView({ behavior:'smooth', block:'center', inline:'center' });
      target.classList.add('is-jump-target');
      setTimeout(() => target.classList.remove('is-jump-target'), 1100);
    });
  }

  function closeEditor() {
    editorState?.previewUrls?.forEach(url => URL.revokeObjectURL(url));
    editorState = null;
    $('#about-editor-dialog')?.close();
  }

  function editorMediaMarkup() {
    if (!editorState) return '';
    const existing = editorState.existingMedia.map((src, index) => `<figure><img src="${esc(src)}" alt=""><button type="button" data-remove-existing="${index}" aria-label="Remove">×</button></figure>`);
    const pending = editorState.previewUrls.map((src, index) => `<figure><img src="${esc(src)}" alt=""><button type="button" data-remove-pending="${index}" aria-label="Remove">×</button></figure>`);
    return [...existing, ...pending].join('');
  }

  function refreshEditorMedia() {
    const root = $('#about-editor-media-preview');
    if (root) root.innerHTML = editorMediaMarkup();
  }

  function openCardEditor(kind, index = -1) {
    if (!window.SUY_IS_ADMIN) return;
    const current = itemsFor(kind)[index] || {};
    const existingMedia = kind === 'camera' ? [...list(current.photos)] : [text(current.image)].filter(Boolean);
    editorState = { kind, index, current:{ ...current }, existingMedia, pendingFiles:[], previewUrls:[] };
    const labels = {
      camera:['ALBUM', 'ALBUM NAME', 'PHOTOS'],
      music:['MUSIC', 'TITLE', 'COVER'],
      favorites:['FILM / TV', 'TITLE', 'COVER'],
      flowers:['FLOWER', 'NAME', 'PHOTO']
    }[kind];
    $('#about-editor-title').textContent = `${index >= 0 ? 'EDIT' : 'NEW'} ${labels[0]}`;
    const linkLabel = kind === 'music' ? 'OFFICIAL PLAYER / AUDIO LINK' : 'SOURCE LINK';
    const linkField = ['music', 'favorites'].includes(kind) ? `<label>${linkLabel}<input id="about-card-link" type="url" value="${esc(current.url || '')}" placeholder="https://"></label>` : '';
    const creditField = kind === 'music' ? `<label>CREDIT / SOURCE<input id="about-card-credit" value="${esc(current.artist || '')}" maxlength="100" placeholder="Artist · platform"></label>` : '';
    const descriptionField = kind === 'flowers' ? `<label>DESCRIPTION<textarea id="about-card-description" rows="3">${esc(current.description || '')}</textarea></label>` : '';
    $('#about-editor-body').innerHTML = `<section class="about-card-editor-fields">
      <label>${labels[1]}<input id="about-card-title" value="${esc(kind === 'flowers' ? current.name || '' : current.title || '')}" maxlength="80" required></label>
      ${linkField}${creditField}${descriptionField}
      <label class="about-card-upload">${labels[2]}<input id="about-card-files" type="file" accept="image/*"${kind === 'camera' ? ' multiple' : ''}></label>
      <div id="about-editor-media-preview" class="about-editor-media-preview">${editorMediaMarkup()}</div>
    </section>`;
    $('#about-editor-status').textContent = '';
    $('#about-editor-save').textContent = 'SAVE';
    $('#about-editor-save').disabled = false;
    const dialog = $('#about-editor-dialog');
    if (dialog && !dialog.open) dialog.showModal();
    requestAnimationFrame(() => $('#about-card-title')?.focus());
  }

  function handleEditorFiles(files) {
    if (!editorState) return;
    const nextFiles = [...files];
    if (editorState.kind !== 'camera') {
      editorState.existingMedia = [];
      editorState.pendingFiles = nextFiles.slice(-1);
      editorState.previewUrls.forEach(url => URL.revokeObjectURL(url));
      editorState.previewUrls = editorState.pendingFiles.map(file => URL.createObjectURL(file));
    } else {
      editorState.pendingFiles.push(...nextFiles);
      editorState.previewUrls.push(...nextFiles.map(file => URL.createObjectURL(file)));
    }
    refreshEditorMedia();
  }

  async function saveCardEditor(event) {
    event.preventDefault();
    if (!editorState) return;
    const status = $('#about-editor-status');
    const saveButton = $('#about-editor-save');
    const titleValue = text($('#about-card-title')?.value);
    if (!titleValue) { status.textContent = 'PLEASE ENTER A NAME.'; return; }
    const linkValue = text($('#about-card-link')?.value);
    if (linkValue && !safeLink(linkValue)) { status.textContent = 'PLEASE ENTER A VALID HTTP LINK.'; return; }
    saveButton.disabled = true;
    status.textContent = 'SAVING…';
    try {
      const uploaded = [];
      for (let index = 0; index < editorState.pendingFiles.length; index += 1) {
        status.textContent = `UPLOADING ${index + 1}/${editorState.pendingFiles.length}…`;
        const folder = editorState.kind === 'camera' ? 'about-albums' : `about-${editorState.kind}`;
        uploaded.push(await window.SUY_ADMIN.uploadPublic(editorState.pendingFiles[index], folder));
      }
      const next = normalize(data);
      const current = editorState.index >= 0 ? { ...itemsFor(editorState.kind)[editorState.index] } : {};
      let item;
      if (editorState.kind === 'camera') item = { ...current, title:titleValue, description:'', photos:[...editorState.existingMedia, ...uploaded], layout:'grid' };
      if (editorState.kind === 'music') item = { ...current, title:titleValue, artist:text($('#about-card-credit')?.value), image:uploaded[0] || editorState.existingMedia[0] || '', url:safeLink(linkValue) };
      if (editorState.kind === 'favorites') item = { ...current, title:titleValue, type:'', note:'', image:uploaded[0] || editorState.existingMedia[0] || '', url:safeLink(linkValue) };
      if (editorState.kind === 'flowers') item = { ...current, name:titleValue, description:text($('#about-card-description')?.value), image:uploaded[0] || editorState.existingMedia[0] || '' };
      const target = editorState.kind === 'camera' ? next.albums : editorState.kind === 'music' ? next.music : editorState.kind === 'favorites' ? next.favorites : next.flowers;
      if (editorState.index >= 0) target[editorState.index] = item;
      else target.push(item);
      await persist(next);
      closeEditor();
      renderDialog();
      showStatus('SAVED');
    } catch (error) {
      console.error(error);
      status.textContent = error?.message || 'SAVE FAILED';
      saveButton.disabled = false;
    }
  }

  async function deleteCard(kind, index) {
    if (!window.SUY_IS_ADMIN || !confirm('Delete this item?')) return;
    try {
      const next = normalize(data);
      const target = kind === 'camera' ? next.albums : kind === 'music' ? next.music : kind === 'favorites' ? next.favorites : next.flowers;
      target.splice(index, 1);
      await persist(next);
      if (dialogItem.startsWith('album:')) dialogItem = 'camera';
      renderDialog();
      showStatus('DELETED');
    } catch (error) {
      showStatus(error?.message || 'DELETE FAILED', true);
    }
  }

  function openMedia(src, alt = '') {
    const image = $('#about-media-image');
    image.src = src;
    image.alt = alt;
    const dialog = $('#about-media-lightbox');
    if (dialog && !dialog.open) dialog.showModal();
  }

  function toggleMusicPlayer(index, trigger) {
    const card = trigger.closest('.about-archive-card');
    const existing = card?.querySelector('.about-inline-player');
    $$('.about-inline-player', $('#about-item-dialog')).forEach(player => player.remove());
    $$('[data-play-music]', $('#about-item-dialog')).forEach(button => button.setAttribute('aria-expanded', 'false'));
    if (!card || existing) return;
    const item = data.music[index];
    const spec = playerSpec(item?.url);
    if (!spec) return;
    const panel = document.createElement('div');
    panel.className = `about-inline-player is-${spec.kind}`;
    const label = document.createElement('small');
    label.textContent = `PLAYER · ${spec.provider}`;
    panel.appendChild(label);
    if (spec.kind === 'audio') {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'metadata';
      audio.src = spec.src;
      panel.appendChild(audio);
      audio.play().catch(() => {});
    } else {
      const iframe = document.createElement('iframe');
      iframe.src = spec.src;
      iframe.title = `${item?.title || 'Music'} · ${spec.provider}`;
      iframe.loading = 'lazy';
      iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.setAttribute('allowfullscreen', '');
      panel.appendChild(iframe);
    }
    card.appendChild(panel);
    $$('[data-play-music]', card).forEach(button => button.setAttribute('aria-expanded', 'true'));
    panel.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  $$('[data-about-hotspot]').forEach(button => button.addEventListener('click', () => openItem(button.dataset.aboutHotspot)));
  $('#about-dialog-close')?.addEventListener('click', () => $('#about-item-dialog')?.close());
  $('#about-dialog-back')?.addEventListener('click', () => { dialogItem = 'camera'; renderDialog(); });
  $('#about-dialog-edit')?.addEventListener('click', () => {
    if (dialogItem.startsWith('album:')) openCardEditor('camera', Number(dialogItem.slice(6)));
    else if (['flowers', 'music', 'camera', 'favorites'].includes(dialogItem)) openCardEditor(dialogItem);
  });
  $('#about-item-dialog')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) { event.currentTarget.close(); return; }
    if (!(event.target instanceof Element)) return;
    const shift = event.target.closest('[data-calendar-shift]');
    if (shift) {
      const next = new Date(calendarViewYear, calendarViewMonth + Number(shift.dataset.calendarShift), 1);
      calendarViewYear = next.getFullYear();
      calendarViewMonth = next.getMonth();
      calendarSelectedDate = '';
      renderDialog();
      return;
    }
    const day = event.target.closest('[data-calendar-date]');
    if (day) { openCalendarNote(day.dataset.calendarDate); return; }
    const indexLink = event.target.closest('[data-calendar-index]');
    if (indexLink) { jumpToDate(indexLink.dataset.calendarIndex); return; }
    const musicPlayer = event.target.closest('[data-play-music]');
    if (musicPlayer) { toggleMusicPlayer(Number(musicPlayer.dataset.playMusic), musicPlayer); return; }
    const album = event.target.closest('[data-open-album]');
    if (album) { dialogItem = `album:${album.dataset.openAlbum}`; renderDialog(); return; }
    const photo = event.target.closest('[data-open-photo]');
    if (photo && dialogItem.startsWith('album:')) {
      const albumIndex = Number(dialogItem.slice(6));
      const photoIndex = Number(photo.dataset.openPhoto);
      openMedia(data.albums[albumIndex]?.photos?.[photoIndex] || '', data.albums[albumIndex]?.title || '');
      return;
    }
    const add = event.target.closest('[data-add-card]');
    if (add) { openCardEditor(add.dataset.addCard); return; }
    const edit = event.target.closest('[data-edit-card]');
    if (edit) { openCardEditor(edit.dataset.editCard, Number(edit.dataset.cardIndex)); return; }
    const remove = event.target.closest('[data-delete-card]');
    if (remove) deleteCard(remove.dataset.deleteCard, Number(remove.dataset.cardIndex));
  });

  $('#about-item-dialog')?.addEventListener('dblclick', event => {
    if (!(event.target instanceof Element)) return;
    const node = event.target.closest('[data-inline-kind]');
    if (!node) return;
    event.preventDefault();
    startDirectEdit(node);
  });
  let lastTapNode = null;
  let lastTapTime = 0;
  $('#about-item-dialog')?.addEventListener('click', event => {
    if (!(event.target instanceof Element) || !window.SUY_IS_ADMIN) return;
    const node = event.target.closest('[data-inline-kind]');
    if (!node) return;
    const now = Date.now();
    if (node === lastTapNode && now - lastTapTime < 430) {
      event.preventDefault();
      lastTapNode = null;
      lastTapTime = 0;
      startDirectEdit(node);
    } else {
      lastTapNode = node;
      lastTapTime = now;
    }
  });

  $('#about-editor-close')?.addEventListener('click', closeEditor);
  $('#about-editor-form')?.addEventListener('submit', saveCardEditor);
  $('#about-editor-body')?.addEventListener('change', event => {
    if (event.target?.id === 'about-card-files') {
      handleEditorFiles(event.target.files);
      event.target.value = '';
    }
  });
  $('#about-editor-body')?.addEventListener('click', event => {
    if (!(event.target instanceof Element) || !editorState) return;
    const oldButton = event.target.closest('[data-remove-existing]');
    if (oldButton) { editorState.existingMedia.splice(Number(oldButton.dataset.removeExisting), 1); refreshEditorMedia(); return; }
    const pendingButton = event.target.closest('[data-remove-pending]');
    if (pendingButton) {
      const index = Number(pendingButton.dataset.removePending);
      URL.revokeObjectURL(editorState.previewUrls[index]);
      editorState.previewUrls.splice(index, 1);
      editorState.pendingFiles.splice(index, 1);
      refreshEditorMedia();
    }
  });
  $('#about-editor-dialog')?.addEventListener('click', event => { if (event.target === event.currentTarget) closeEditor(); });
  $('#about-editor-dialog')?.addEventListener('cancel', event => { event.preventDefault(); closeEditor(); });
  $('#about-calendar-note')?.addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
  $('#about-media-close')?.addEventListener('click', () => $('#about-media-lightbox')?.close());
  $('#about-media-lightbox')?.addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });

  async function load() {
    try { if (window.SUY_ADMIN_READY) await window.SUY_ADMIN_READY; } catch {}
    try {
      const loaded = await window.SUY_ADMIN?.loadContent?.(aboutKey);
      if (loaded) data = normalize(loaded);
      else {
        const profile = await window.SUY_ADMIN?.loadContent?.('profile');
        if (profile) data.personal = { title:text(profile.name) || 'ABOUT ME', text:[text(profile.info), text(profile.statement)].filter(Boolean).join('\n') };
      }
    } catch (error) {
      console.warn('Could not load About content', error);
    }
    syncAdminControls();
    document.addEventListener('suyoon-admin-state', event => {
      syncAdminControls(!!event.detail?.admin);
      if ($('#about-item-dialog')?.open) renderDialog();
      if (!event.detail?.admin) {
        if ($('#about-calendar-note')?.open) $('#about-calendar-note').close();
        if ($('#about-editor-dialog')?.open) closeEditor();
      }
    });
  }
  load();
})();

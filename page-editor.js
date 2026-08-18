(() => {
  let pageEditorReadyResolve;
  window.SUY_PAGE_EDITOR_READY = new Promise(r => pageEditorReadyResolve = r);
  const STORAGE_PREFIX = 'suyoon-page-layout-v2:';
  const pageFile = location.pathname.split('/').pop() || 'index.html';
  const pageKey = STORAGE_PREFIX + pageFile;
  const remoteLayoutKey = 'layout:' + pageFile;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'pe-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  const fileLayouts = (window.SUYOON_SAVED_LAYOUTS && typeof window.SUYOON_SAVED_LAYOUTS === 'object') ? window.SUYOON_SAVED_LAYOUTS : {};
  const fileState = (fileLayouts[pageKey] && typeof fileLayouts[pageKey] === 'object') ? fileLayouts[pageKey] : {};
  let localDraft = null;
  try { localDraft = JSON.parse(localStorage.getItem(pageKey) || 'null'); } catch {}
  let state = { styles: {}, custom: [], subnav: [], deleted: [], content: {}, attrs: {}, mobilePreset: 'recommended', ...fileState };
  if (!state.styles) state.styles = {};
  if (!Array.isArray(state.custom)) state.custom = [];
  if (!Array.isArray(state.subnav)) state.subnav = [];
  if (!Array.isArray(state.deleted)) state.deleted = [];
  if (!state.content) state.content = {};
  if (!state.attrs) state.attrs = {};
  if (!state.mobilePreset) state.mobilePreset = 'recommended';

  let selected = null;
  let selecting = false;
  let drag = null;

  function selectorFor(el) {
    if (el.dataset.peCustom) return 'custom:' + el.dataset.peCustom;
    if (el.id) return '#' + CSS.escape(el.id);
    const parts = [];
    let node = el;
    while (node && node !== document.body) {
      let part = node.tagName.toLowerCase();
      if (node.classList.length) {
        const safe = [...node.classList].filter(c => !c.startsWith('pe-') && !c.startsWith('font-') && !c.startsWith('size-')).slice(0, 2);
        if (safe.length) part += '.' + safe.map(CSS.escape).join('.');
      }
      const siblings = node.parentElement ? [...node.parentElement.children].filter(x => x.tagName === node.tagName) : [];
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      parts.unshift(part);
      node = node.parentElement;
      if (parts.length >= 5) break;
    }
    return parts.join('>');
  }

  function save() {
    localStorage.setItem(pageKey, JSON.stringify(state));
    const s = $('#pe-save-state');
    if (s) s.textContent = 'SAVING…';
    clearTimeout(save._remote);
    save._remote = setTimeout(async () => {
      try {
        if (window.SUY_IS_ADMIN && window.SUY_ADMIN?.saveContent) {
          await window.SUY_ADMIN.saveContent(remoteLayoutKey, state);
          localStorage.removeItem(pageKey);
          if (s) s.textContent = 'SAVED TO SUPABASE';
        } else if (s) s.textContent = 'LOCAL DRAFT';
      } catch (err) {
        console.error(err);
        if (s) s.textContent = 'SAVE FAILED';
      }
      clearTimeout(save._t);
      save._t = setTimeout(() => { if (s) s.textContent = ''; }, 1600);
    }, 650);
  }

  function applyStyle(el, data = {}) {
    if (!el) return;
    const x = Number(data.x || 0), y = Number(data.y || 0), scale = Number(data.scale || 1);
    el.style.setProperty('--pe-x', `${x}px`);
    el.style.setProperty('--pe-y', `${y}px`);
    el.style.setProperty('--pe-scale', scale);
    el.classList.toggle('pe-transformed', !!(x || y || scale !== 1));
    const props = [
      ['width','--pe-width','pe-has-width'],
      ['maxWidth','--pe-max-width','pe-has-max-width'],
      ['fontSize','--pe-font-size','pe-has-font-size'],
      ['opacity','--pe-opacity','pe-has-opacity'],
      ['zIndex','--pe-z-index','pe-has-z-index']
    ];
    props.forEach(([key, variable, cls]) => {
      const has = data[key] !== undefined && data[key] !== '';
      el.classList.toggle(cls, has);
      if (has) el.style.setProperty(variable, data[key]); else el.style.removeProperty(variable);
    });
    el.classList.toggle('pe-hidden-by-editor', !!data.hidden);
  }

  function clearEditorStyle(el) {
    if (!el) return;
    ['--pe-x','--pe-y','--pe-scale','--pe-width','--pe-max-width','--pe-font-size','--pe-opacity','--pe-z-index'].forEach(p => el.style.removeProperty(p));
    el.classList.remove('pe-transformed','pe-has-width','pe-has-max-width','pe-has-font-size','pe-has-opacity','pe-has-z-index','pe-hidden-by-editor');
  }

  function findTarget(key) {
    if (key.startsWith('custom:')) return document.querySelector(`[data-pe-custom="${CSS.escape(key.slice(7))}"]`);
    try { return document.querySelector(key); } catch { return null; }
  }

  function renderSubnav() {
    $$('.pe-user-subnav').forEach(x => x.remove());
    if (!state.subnav.length) return;
    const nav = document.createElement('nav');
    nav.className = 'pe-user-subnav';
    nav.setAttribute('aria-label', 'Custom sub navigation');
    nav.innerHTML = state.subnav.map(x => `<a href="${esc(x.href || '#')}">${esc(x.label || 'LINK')}</a>`).join('');
    const header = $('header');
    if (header) header.insertAdjacentElement('afterend', nav);
    else document.body.insertAdjacentElement('afterbegin', nav);
  }

  function renderDeleted() {
    state.deleted.forEach(key => {
      const el = findTarget(key);
      if (el) el.classList.add('pe-deleted-by-editor');
    });
  }

  function renderCustom() {
    $$('.pe-custom-element').forEach(x => x.remove());
    state.custom.forEach(item => {
      let el;
      if (item.type === 'image') {
        el = document.createElement('img');
        el.src = item.src || '';
        el.alt = item.alt || 'custom image';
      } else if (item.type === 'link') {
        el = document.createElement('a');
        el.href = item.href || '#';
        el.textContent = item.text || 'LINK';
      } else if (item.type === 'divider') {
        el = document.createElement('div');
      } else {
        el = document.createElement('div');
        el.textContent = item.text || 'NEW TEXT';
      }
      el.className = `pe-custom-element pe-custom-${item.type}`;
      el.dataset.peCustom = item.id;
      el.style.left = `${item.left ?? 80}px`;
      el.style.top = `${item.top ?? Math.round(scrollY + innerHeight * .4)}px`;
      applyStyle(el, item.style || {});
      document.body.appendChild(el);
    });
  }

  function isMultilineText(el) {
    return !!el?.dataset?.peMultiline;
  }

  function canEditText(el) {
    if (!el) return false;
    if (el.matches('html,body,main,section,header,footer,dialog,form,img,svg,path,br')) return false;
    if (el.matches('input,textarea,select')) return false;
    if (el.matches('label')) return false;
    if (el.querySelector('input,textarea,select')) return false;
    return true;
  }

  function getEditableText(el) {
    if (!el || !canEditText(el)) return '';
    if (isMultilineText(el)) return el.innerHTML.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, '');
    return el.textContent || '';
  }

  function setEditableText(el, text) {
    if (!el || !canEditText(el)) return;
    if (el.dataset.peOriginalText === undefined) el.dataset.peOriginalText = getEditableText(el);
    if (isMultilineText(el)) el.innerHTML = esc(text).replace(/\n/g, '<br>');
    else el.textContent = text;
  }

  function originalAttrDatasetKey(name) {
    return 'peOriginal' + name.charAt(0).toUpperCase() + name.slice(1);
  }

  function rememberOriginalAttr(el, name) {
    if (!el) return;
    const key = originalAttrDatasetKey(name);
    if (el.dataset[key] === undefined) el.dataset[key] = el.getAttribute(name) ?? '';
  }

  function setManagedAttr(el, name, value) {
    if (!el) return;
    rememberOriginalAttr(el, name);
    if (value === '' || value === null || value === undefined) el.removeAttribute(name);
    else el.setAttribute(name, value);
  }

  function applyMobilePreset() {
    const presets = ['recommended','compact','visual'];
    presets.forEach(x => document.body.classList.remove('mobile-layout-' + x));
    const preset = presets.includes(state.mobilePreset) ? state.mobilePreset : 'recommended';
    document.body.classList.add('mobile-layout-' + preset);
  }

  function applySaved() {
    renderCustom();
    renderSubnav();
    Object.entries(state.styles).forEach(([key, data]) => applyStyle(findTarget(key), data));
    Object.entries(state.content).forEach(([key, text]) => {
      const el = findTarget(key);
      if (el) setEditableText(el, text);
    });
    Object.entries(state.attrs).forEach(([key, attrs]) => {
      const el = findTarget(key);
      if (!el || !attrs) return;
      if ('placeholder' in attrs) setManagedAttr(el, 'placeholder', attrs.placeholder);
      if ('src' in attrs) setManagedAttr(el, 'src', attrs.src);
      if ('href' in attrs) setManagedAttr(el, 'href', attrs.href);
      if ('alt' in attrs) setManagedAttr(el, 'alt', attrs.alt);
    });
    renderDeleted();
    applyMobilePreset();
  }

  function panelHTML() {
    return `<button id="pe-open" class="pe-open" type="button" title="Edit page">EDIT PAGE</button>
    <aside id="pe-panel" class="pe-panel" aria-hidden="true">
      <div class="pe-panel-head"><strong>PAGE DESIGN</strong><button id="pe-close" type="button">×</button></div>
      <p class="pe-small">Click SELECT, then choose any element on the page. Drag the selected element directly to move it. For text, select a small text element like a span, paragraph, or button label.</p>
      <button id="pe-select" class="pe-primary" type="button">SELECT ELEMENT</button>
      <div id="pe-selected" class="pe-selected">NO ELEMENT SELECTED</div>
      <label>TEXT CONTENT <textarea id="pe-text-content" rows="3" placeholder="Edit selected text"></textarea></label>
      <label>PLACEHOLDER <input id="pe-placeholder" placeholder="For input / textarea"></label>
      <label>SELECTED LINK URL <input id="pe-selected-href" placeholder="For a selected link"></label>
      <label>IMAGE ALT TEXT <input id="pe-selected-alt" placeholder="For a selected image"></label>
      <label id="pe-replace-image-label" class="pe-file pe-replace-file">REPLACE SELECTED IMAGE<input id="pe-replace-image" type="file" accept="image/*"></label>
      <div class="pe-grid">
        <label>X <input id="pe-x" type="number" step="1" value="0"></label>
        <label>Y <input id="pe-y" type="number" step="1" value="0"></label>
        <label>SCALE <input id="pe-scale" type="number" min="0.2" max="4" step="0.05" value="1"></label>
        <label>OPACITY <input id="pe-opacity" type="number" min="0" max="1" step="0.05" value="1"></label>
        <label>WIDTH <input id="pe-width" placeholder="e.g. 420px / 70%"></label>
        <label>MAX WIDTH <input id="pe-maxwidth" placeholder="e.g. 900px"></label>
        <label>FONT SIZE <input id="pe-font" placeholder="e.g. 24px"></label>
        <label>Z-INDEX <input id="pe-z" type="number" step="1" placeholder="auto"></label>
      </div>
      <div class="pe-actions"><button id="pe-hide" type="button">HIDE / SHOW</button><button id="pe-reset-one" type="button">RESET SELECTED</button><button id="pe-delete" type="button">DELETE</button></div>
      <hr>
      <strong class="pe-section-title">ADD ELEMENT</strong>
      <label>TEXT <textarea id="pe-new-text" rows="2" placeholder="Type text here"></textarea></label>
      <div class="pe-actions"><button id="pe-add-text" type="button">+ TEXT</button><label class="pe-file">+ IMAGE<input id="pe-add-image" type="file" accept="image/*"></label><button id="pe-add-divider" type="button">+ LINE</button></div>
      <label>BUTTON / LINK LABEL <input id="pe-link-label" placeholder="PROJECT"></label>
      <label>URL <input id="pe-link-url" placeholder="works.html or https://..."></label>
      <button id="pe-add-link" type="button">+ BUTTON / LINK</button>
      <hr>
      <strong class="pe-section-title">SUB NAVIGATION</strong>
      <label>LABEL <input id="pe-nav-label" placeholder="PHOTOGRAPHY"></label>
      <label>URL <input id="pe-nav-url" placeholder="photos.html"></label>
      <button id="pe-add-nav" type="button">+ ADD SUB NAV</button>
      <div id="pe-nav-list" class="pe-nav-list"></div>
      <hr>
      <strong class="pe-section-title">MOBILE LAYOUT RECOMMENDATIONS</strong>
      <p class="pe-small">Choose a mobile layout for screens under 720px. It only changes phone layout; desktop design stays as you arranged it.</p>
      <div class="pe-mobile-presets">
        <button type="button" data-mobile-preset="recommended"><b>01 · RECOMMENDED</b><span>Best default · single column · balanced spacing · comfortable reading</span></button>
        <button type="button" data-mobile-preset="compact"><b>02 · COMPACT</b><span>More content per screen · smaller gaps · good for text-heavy pages</span></button>
        <button type="button" data-mobile-preset="visual"><b>03 · VISUAL</b><span>Larger images · centered layout · good for photos, diary and artwork</span></button>
      </div>
      <div id="pe-mobile-current" class="pe-mobile-current"></div>
      <hr>
      <strong class="pe-section-title">SAVE ONLINE</strong>
      <p class="pe-small">Admin changes are automatically saved to Supabase and shown to every visitor.</p>
      <button id="pe-save-supabase" type="button">SAVE TO SUPABASE NOW</button>
      <hr>
      <strong class="pe-section-title">SAVE TO COMPUTER</strong>
      <p class="pe-small">Choose the local website folder once, then save all EDIT PAGE changes into saved-layouts.js. Upload that folder to GitHub and the design will travel with the site.</p>
      <div class="pe-actions"><button id="pe-connect-folder" type="button">CONNECT LOCAL FOLDER</button><button id="pe-save-local" type="button">SAVE TO LOCAL</button></div>
      <div id="pe-local-status" class="pe-local-status">NO LOCAL FOLDER CONNECTED</div>
      <hr>
      <div class="pe-panel-foot"><button id="pe-reset-page" type="button">RESET THIS PAGE</button><span id="pe-save-state"></span></div>
    </aside>`;
  }

  function getSelectedData() {
    if (!selected) return null;
    const key = selectorFor(selected);
    if (key.startsWith('custom:')) {
      const item = state.custom.find(x => x.id === key.slice(7));
      return item ? (item.style ||= {}) : null;
    }
    return (state.styles[key] ||= {});
  }

  function syncControls() {
    const d = getSelectedData();
    $('#pe-selected').textContent = selected ? `${selected.tagName.toLowerCase()}  ${selectorFor(selected)}` : 'NO ELEMENT SELECTED';
    const map = {x:'pe-x',y:'pe-y',scale:'pe-scale',opacity:'pe-opacity',width:'pe-width',maxWidth:'pe-maxwidth',fontSize:'pe-font',zIndex:'pe-z'};
    Object.entries(map).forEach(([k,id]) => { const el = $('#' + id); if (el) el.value = d?.[k] ?? (k === 'scale' || k === 'opacity' ? 1 : ''); });

    const textBox = $('#pe-text-content');
    const placeholderBox = $('#pe-placeholder');
    const hrefBox = $('#pe-selected-href');
    const altBox = $('#pe-selected-alt');
    const replaceLabel = $('#pe-replace-image-label');
    textBox.value = selected ? getEditableText(selected) : '';
    placeholderBox.value = selected?.matches('input,textarea') ? (selected.getAttribute('placeholder') || '') : '';
    hrefBox.value = selected?.matches('a') ? (selected.getAttribute('href') || '') : '';
    altBox.value = selected?.matches('img') ? (selected.getAttribute('alt') || '') : '';
    textBox.disabled = !(selected && canEditText(selected));
    placeholderBox.disabled = !(selected && selected.matches('input,textarea'));
    hrefBox.disabled = !(selected && selected.matches('a'));
    altBox.disabled = !(selected && selected.matches('img'));
    replaceLabel.classList.toggle('pe-control-disabled', !(selected && selected.matches('img')));

    $('#pe-delete').disabled = !selected;
    $('#pe-hide').disabled = !selected;
    $('#pe-reset-one').disabled = !selected;
  }

  function selectElement(el) {
    if (selected) selected.classList.remove('pe-selected-outline');
    selected = el;
    if (selected) selected.classList.add('pe-selected-outline');
    selecting = false;
    document.body.classList.remove('pe-selecting');
    $('#pe-select').textContent = 'SELECT ELEMENT';
    syncControls();
  }

  function updateSelected(prop, value) {
    const d = getSelectedData();
    if (!selected || !d) return;
    if (value === '' || value === null) delete d[prop]; else d[prop] = value;
    applyStyle(selected, d);
    save();
  }

  function updateSelectedText(value) {
    if (!selected || !canEditText(selected)) return;
    const key = selectorFor(selected);
    if (key.startsWith('custom:')) {
      const item = state.custom.find(x => x.id === key.slice(7));
      if (item && (item.type === 'text' || item.type === 'link')) item.text = value;
      renderCustom();
      selectElement(findTarget(key));
    } else {
      state.content[key] = value;
      setEditableText(selected, value);
    }
    save();
  }

  function updateSelectedPlaceholder(value) {
    if (!selected || !selected.matches('input,textarea')) return;
    const key = selectorFor(selected);
    state.attrs[key] ||= {};
    state.attrs[key].placeholder = value;
    if (selected.dataset.peOriginalPlaceholder === undefined) selected.dataset.peOriginalPlaceholder = selected.getAttribute('placeholder') || '';
    selected.setAttribute('placeholder', value);
    save();
  }


  function updateSelectedAttr(name, value, selector) {
    if (!selected || !selected.matches(selector)) return;
    const key = selectorFor(selected);
    state.attrs[key] ||= {};
    state.attrs[key][name] = value;
    setManagedAttr(selected, name, value);
    save();
  }

  function navList() {
    const root = $('#pe-nav-list');
    if (!root) return;
    root.innerHTML = state.subnav.map((x, i) => `<div><span>${esc(x.label)} → ${esc(x.href)}</span><button type="button" data-pe-nav-remove="${i}">×</button></div>`).join('') || '<small>NO SUB NAV YET</small>';
    $$('[data-pe-nav-remove]', root).forEach(b => b.onclick = () => { state.subnav.splice(Number(b.dataset.peNavRemove), 1); renderSubnav(); navList(); save(); });
  }

  function addCustom(item) {
    state.custom.push({ id: uid(), left: 80, top: Math.round(scrollY + innerHeight * .42), style: { x:0, y:0, scale:1, opacity:1 }, ...item });
    renderCustom();
    save();
    const created = document.querySelector(`[data-pe-custom="${state.custom.at(-1).id}"]`);
    selectElement(created);
  }

  let localFolderHandle = null;

  function collectAllPageLayouts() {
    const layouts = { ...(window.SUYOON_SAVED_LAYOUTS || {}) };
    Object.keys(localStorage).forEach(k => {
      if (!k.startsWith(STORAGE_PREFIX)) return;
      try { layouts[k] = JSON.parse(localStorage.getItem(k) || '{}'); } catch {}
    });
    layouts[pageKey] = state;
    return layouts;
  }

  function layoutFileText(layouts) {
    return 'window.SUYOON_SAVED_LAYOUTS = ' + JSON.stringify(layouts, null, 2) + ';\n';
  }

  async function connectLocalFolder() {
    const status = $('#pe-local-status');
    if (!('showDirectoryPicker' in window)) {
      status.textContent = 'NOT SUPPORTED HERE — OPEN THE SITE IN CHROME/EDGE OVER HTTPS OR LOCALHOST';
      alert('Direct folder saving requires Chrome or Edge and a secure page (HTTPS or localhost).');
      return false;
    }
    try {
      localFolderHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const permission = await localFolderHandle.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') throw new Error('Write permission was not granted.');
      status.textContent = `CONNECTED: ${localFolderHandle.name}`;
      return true;
    } catch (err) {
      if (err?.name !== 'AbortError') {
        status.textContent = 'CONNECTION FAILED';
        alert('Could not connect the local folder: ' + (err?.message || err));
      }
      return false;
    }
  }

  async function saveLayoutsToLocalFolder() {
    const status = $('#pe-local-status');
    if (!localFolderHandle) {
      const ok = await connectLocalFolder();
      if (!ok) return;
    }
    try {
      let permission = await localFolderHandle.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') permission = await localFolderHandle.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') throw new Error('Write permission was not granted.');

      const layouts = collectAllPageLayouts();
      const fileHandle = await localFolderHandle.getFileHandle('saved-layouts.js', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(layoutFileText(layouts));
      await writable.close();

      window.SUYOON_SAVED_LAYOUTS = layouts;
      Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX)).forEach(k => localStorage.removeItem(k));
      status.textContent = `SAVED TO ${localFolderHandle.name}/saved-layouts.js`;
      alert('Saved to your local website folder. You can now upload this folder to GitHub.');
    } catch (err) {
      status.textContent = 'SAVE FAILED';
      alert('Could not save to the local folder: ' + (err?.message || err));
    }
  }

  async function init() {
    if (window.SUY_ADMIN_READY) await window.SUY_ADMIN_READY;
    try {
      if (window.SUY_ADMIN?.loadContent) {
        const remote = await window.SUY_ADMIN.loadContent(remoteLayoutKey);
        if (remote && typeof remote === 'object') {
          state = { styles:{}, custom:[], subnav:[], deleted:[], content:{}, attrs:{}, mobilePreset:'recommended', ...remote };
        } else {
          state = { styles:{}, custom:[], subnav:[], deleted:[], content:{}, attrs:{}, mobilePreset:'recommended', ...fileState };
        }
      }
    } catch (err) {
      console.error('Could not load remote layout', err);
      if (window.SUY_IS_ADMIN && localDraft && typeof localDraft === 'object') {
        state = { styles:{}, custom:[], subnav:[], deleted:[], content:{}, attrs:{}, mobilePreset:'recommended', ...localDraft };
      }
    }
    applySaved();
    pageEditorReadyResolve?.(true);
    if (!window.SUY_IS_ADMIN) return;
    document.body.insertAdjacentHTML('beforeend', panelHTML());
    navList();

    const syncMobilePresetUI = () => {
      document.querySelectorAll('[data-mobile-preset]').forEach(b => b.classList.toggle('active', b.dataset.mobilePreset === state.mobilePreset));
      const current = $('#pe-mobile-current');
      if (current) {
        const labels = { recommended:'RECOMMENDED · balanced for most phones', compact:'COMPACT · denser phone layout', visual:'VISUAL · image-first phone layout' };
        current.textContent = labels[state.mobilePreset] || labels.recommended;
      }
    };
    document.querySelectorAll('[data-mobile-preset]').forEach(b => b.onclick = () => {
      state.mobilePreset = b.dataset.mobilePreset;
      applyMobilePreset();
      syncMobilePresetUI();
      save();
    });
    syncMobilePresetUI();

    $('#pe-open').onclick = () => { $('#pe-panel').classList.add('open'); $('#pe-panel').setAttribute('aria-hidden','false'); document.body.classList.add('pe-editing'); };
    $('#pe-close').onclick = () => { $('#pe-panel').classList.remove('open'); $('#pe-panel').setAttribute('aria-hidden','true'); document.body.classList.remove('pe-editing','pe-selecting'); selecting = false; selectElement(null); };
    $('#pe-select').onclick = () => { selecting = !selecting; document.body.classList.toggle('pe-selecting', selecting); $('#pe-select').textContent = selecting ? 'CLICK AN ELEMENT…' : 'SELECT ELEMENT'; };

    document.addEventListener('click', e => {
      if (!selecting) return;
      if (e.target.closest('#pe-panel,#pe-open,.pe-user-subnav')) return;
      e.preventDefault();
      e.stopPropagation();
      selectElement(e.target);
    }, true);

    const textInputs = [['pe-x','x',Number],['pe-y','y',Number],['pe-scale','scale',Number],['pe-opacity','opacity',Number],['pe-width','width',String],['pe-maxwidth','maxWidth',String],['pe-font','fontSize',String],['pe-z','zIndex',Number]];
    textInputs.forEach(([id, prop, cast]) => $('#' + id).addEventListener('input', e => updateSelected(prop, e.target.value === '' ? '' : cast(e.target.value))));

    $('#pe-text-content').addEventListener('input', e => updateSelectedText(e.target.value));
    $('#pe-placeholder').addEventListener('input', e => updateSelectedPlaceholder(e.target.value));
    $('#pe-selected-href').addEventListener('input', e => updateSelectedAttr('href', e.target.value, 'a'));
    $('#pe-selected-alt').addEventListener('input', e => updateSelectedAttr('alt', e.target.value, 'img'));
    $('#pe-replace-image').onchange = async e => {
      const f=e.target.files?.[0];
      if(!f || !selected?.matches('img')) { e.target.value=''; return; }
      try {
        const url = await window.SUY_ADMIN.uploadPublic(f, 'page-assets');
        updateSelectedAttr('src', url, 'img');
        $('#pe-save-state').textContent='IMAGE UPLOADED';
      } catch(err) { alert('Image upload failed: '+(err?.message||err)); }
      e.target.value='';
    };

    $('#pe-hide').onclick = () => { const d = getSelectedData(); if (!d) return; d.hidden = !d.hidden; applyStyle(selected, d); save(); };
    $('#pe-reset-one').onclick = () => {
      if (!selected) return;
      const key = selectorFor(selected);
      if (key.startsWith('custom:')) {
        const item = state.custom.find(x => x.id === key.slice(7));
        if (item) item.style = {};
        delete state.content[key];
        delete state.attrs[key];
        renderCustom();
        selectElement(findTarget(key));
      } else {
        delete state.styles[key];
        delete state.content[key];
        delete state.attrs[key];
        state.deleted = state.deleted.filter(x => x !== key);
        selected.classList.remove('pe-deleted-by-editor');
        clearEditorStyle(selected);
        if (canEditText(selected) && selected.dataset.peOriginalText !== undefined) setEditableText(selected, selected.dataset.peOriginalText);
        [['placeholder','input,textarea'],['href','a'],['src','img'],['alt','img']].forEach(([name,selector])=>{
          if (!selected.matches(selector)) return;
          const dkey=originalAttrDatasetKey(name), original=selected.dataset[dkey];
          if (original !== undefined && original !== '') selected.setAttribute(name, original);
          else if (original !== undefined) selected.removeAttribute(name);
        });
      }
      syncControls();
      save();
    };
    $('#pe-delete').onclick = () => {
      if (!selected) return;
      const key = selectorFor(selected);
      if (key.startsWith('custom:')) {
        state.custom = state.custom.filter(x => x.id !== selected.dataset.peCustom);
        selected.remove();
      } else {
        if (!state.deleted.includes(key)) state.deleted.push(key);
        selected.classList.add('pe-deleted-by-editor');
      }
      selected?.classList.remove('pe-selected-outline');
      selected = null;
      syncControls();
      save();
    };

    $('#pe-add-text').onclick = () => addCustom({ type:'text', text: $('#pe-new-text').value.trim() || 'NEW TEXT' });
    $('#pe-add-divider').onclick = () => addCustom({ type:'divider', style:{ width:'220px', x:0, y:0, scale:1, opacity:1 } });
    $('#pe-add-link').onclick = () => addCustom({ type:'link', text: $('#pe-link-label').value.trim() || 'LINK', href: $('#pe-link-url').value.trim() || '#' });
    $('#pe-add-image').onchange = e => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => addCustom({ type:'image', src:r.result, style:{ width:'240px', x:0, y:0, scale:1, opacity:1 } });
      r.readAsDataURL(f);
      e.target.value='';
    };
    $('#pe-add-nav').onclick = () => {
      const label = $('#pe-nav-label').value.trim(), href = $('#pe-nav-url').value.trim();
      if (!label) return;
      state.subnav.push({label, href: href || '#'});
      $('#pe-nav-label').value='';
      $('#pe-nav-url').value='';
      renderSubnav();
      navList();
      save();
    };
    $('#pe-save-supabase').onclick = async () => {
      const s = $('#pe-save-state');
      try { if (s) s.textContent='SAVING…'; await window.SUY_ADMIN.saveContent(remoteLayoutKey, state); localStorage.removeItem(pageKey); if (s) s.textContent='SAVED TO SUPABASE'; }
      catch(err){ if(s)s.textContent='SAVE FAILED'; alert('Could not save to Supabase: '+(err?.message||err)); }
    };
    $('#pe-connect-folder').onclick = connectLocalFolder;
    $('#pe-save-local').onclick = saveLayoutsToLocalFolder;
    $('#pe-reset-page').onclick = async () => {
      if (!confirm('Reset all design and text changes on this page?')) return;
      state = { styles:{}, custom:[], subnav:[], deleted:[], content:{}, attrs:{}, mobilePreset:'recommended' };
      localStorage.removeItem(pageKey);
      try { await window.SUY_ADMIN.saveContent(remoteLayoutKey, state); } catch(err) { alert('Reset failed: '+(err?.message||err)); return; }
      location.reload();
    };

    document.addEventListener('pointerdown', e => {
      if (!document.body.classList.contains('pe-editing') || selecting || !selected || !e.target.closest('.pe-selected-outline')) return;
      if (e.target.closest('input,textarea,button,select,a') && !selected.dataset.peCustom) return;
      const d = getSelectedData();
      drag = { sx:e.clientX, sy:e.clientY, x:Number(d.x||0), y:Number(d.y||0), id:e.pointerId };
      selected.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    });
    document.addEventListener('pointermove', e => {
      if (!drag || !selected) return;
      const nx = Math.round(drag.x + e.clientX - drag.sx), ny = Math.round(drag.y + e.clientY - drag.sy);
      const d = getSelectedData();
      d.x = nx;
      d.y = ny;
      applyStyle(selected, d);
      $('#pe-x').value = nx;
      $('#pe-y').value = ny;
    });
    document.addEventListener('pointerup', () => { if (drag) { drag = null; save(); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init()); else init();
})();

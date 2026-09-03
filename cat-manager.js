(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
  const text = value => String(value ?? '').trim();
  const list = value => Array.isArray(value) ? value : [];
  const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const currentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };
  const cleanMonth = value => {
    const match = /^(\d{4})-(\d{2})$/.exec(text(value));
    if (!match) return currentMonth();
    const month = Number(match[2]);
    return month >= 1 && month <= 12 ? `${match[1]}-${match[2]}` : currentMonth();
  };
  const monthLabel = value => {
    const [year, month] = cleanMonth(value).split('-');
    return `${year}.${Number(month)}`;
  };

  function normalize(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const legacy = list(source.items).map(item => ({
      id:item?.id || newId(),
      month:cleanMonth(item?.month || item?.date),
      title:text(item?.title) || 'MY CAT',
      description:text(item?.description),
      photos:[text(item?.image)].filter(Boolean),
      createdAt:text(item?.createdAt) || new Date().toISOString()
    }));
    const albums = (Array.isArray(source.albums) ? source.albums : legacy).map(item => ({
      id:text(item?.id) || newId(),
      month:cleanMonth(item?.month),
      title:text(item?.title) || 'UNTITLED ALBUM',
      description:text(item?.description),
      photos:list(item?.photos || item?.images).map(text).filter(Boolean),
      createdAt:text(item?.createdAt) || new Date().toISOString()
    }));
    return {
      version:2,
      hero:{
        image:text(source.hero?.image || source.mainImage),
        title:text(source.hero?.title),
        description:text(source.hero?.description)
      },
      albums
    };
  }

  const init = async () => {
    if (!$('#cat-timeline')) return;
    try { if (window.SUY_ADMIN_READY) await window.SUY_ADMIN_READY; } catch {}
    const api = window.SUY_ADMIN;
    if (!api) return;
    let payload = normalize(await api.loadContent('my-cats').catch(() => null));
    let editorState = null;

    const sortedAlbums = () => [...payload.albums].sort((a, b) => b.month.localeCompare(a.month) || b.createdAt.localeCompare(a.createdAt));
    const findAlbum = id => payload.albums.find(item => item.id === id);

    function closeEditor() {
      editorState?.previewUrls?.forEach(url => URL.revokeObjectURL(url));
      editorState = null;
      $('#cat-editor')?.close();
    }

    function mediaPreviewMarkup() {
      if (!editorState) return '';
      const existing = editorState.existing.map((src, index) => `<figure><img src="${esc(src)}" alt=""><button type="button" data-cat-remove-existing="${index}" aria-label="Remove photo">×</button></figure>`);
      const pending = editorState.previewUrls.map((src, index) => `<figure><img src="${esc(src)}" alt=""><button type="button" data-cat-remove-pending="${index}" aria-label="Remove photo">×</button></figure>`);
      return [...existing, ...pending].join('');
    }

    function refreshMediaPreview() {
      const root = $('#cat-editor-media');
      if (root) root.innerHTML = mediaPreviewMarkup();
    }

    function openHeroEditor() {
      if (!window.SUY_IS_ADMIN) return;
      const hero = payload.hero;
      editorState = { kind:'hero', existing:[hero.image].filter(Boolean), pending:[], previewUrls:[] };
      $('.cat-editor-head strong').textContent = 'EDIT MAIN IMAGE';
      $('#cat-editor-body').innerHTML = `<div class="cat-editor-fields">
        <label>TITLE<input id="cat-editor-title" value="${esc(hero.title)}" maxlength="80"></label>
        <label>DESCRIPTION<textarea id="cat-editor-description" rows="3">${esc(hero.description)}</textarea></label>
        <label class="cat-editor-upload">MAIN IMAGE<input id="cat-editor-files" type="file" accept="image/*"></label>
        <div id="cat-editor-media" class="cat-editor-media">${mediaPreviewMarkup()}</div>
      </div>`;
      $('#cat-status').textContent = '';
      $('#cat-editor').showModal();
    }

    function openAlbumEditor(id = '') {
      if (!window.SUY_IS_ADMIN) return;
      const album = findAlbum(id) || { id:'', month:currentMonth(), title:'', description:'', photos:[] };
      editorState = { kind:'album', id:album.id, existing:[...album.photos], pending:[], previewUrls:[] };
      $('.cat-editor-head strong').textContent = album.id ? 'EDIT ALBUM' : 'NEW ALBUM';
      $('#cat-editor-body').innerHTML = `<div class="cat-editor-fields">
        <label>YEAR · MONTH<input id="cat-editor-month" type="month" value="${esc(album.month)}" required></label>
        <label>ALBUM TITLE<input id="cat-editor-title" value="${esc(album.title)}" maxlength="80" required></label>
        <label>DESCRIPTION<textarea id="cat-editor-description" rows="4">${esc(album.description)}</textarea></label>
        <label class="cat-editor-upload">ADD PHOTOS<input id="cat-editor-files" type="file" accept="image/*" multiple></label>
        <div id="cat-editor-media" class="cat-editor-media">${mediaPreviewMarkup()}</div>
      </div>`;
      $('#cat-status').textContent = '';
      $('#cat-editor').showModal();
      requestAnimationFrame(() => $('#cat-editor-month')?.focus());
    }

    function openAlbum(id) {
      const album = findAlbum(id);
      if (!album) return;
      $('#cat-viewer-month').textContent = monthLabel(album.month);
      $('#cat-viewer-title').textContent = album.title;
      $('#cat-viewer-description').textContent = album.description;
      $('#cat-viewer-description').hidden = !album.description;
      $('#cat-viewer-grid').innerHTML = album.photos.map((src, index) => `<figure><img src="${esc(src)}" alt="${esc(album.title)} ${index + 1}" loading="lazy"></figure>`).join('');
      const dialog = $('#cat-album-viewer');
      if (!dialog.open) dialog.showModal();
    }

    async function render() {
      const admin = await api.isAdmin().catch(() => false);
      const hero = payload.hero;
      const heroMedia = $('#cat-hero-media');
      heroMedia.innerHTML = hero.image ? `<img src="${esc(hero.image)}" alt="${esc(hero.title || 'My cat')}">` : '<span>MAIN IMAGE</span>';
      $('#cat-hero').classList.toggle('is-empty', !hero.image);
      $('#cat-hero-copy').innerHTML = `${hero.title ? `<h1>${esc(hero.title)}</h1>` : ''}${hero.description ? `<p>${esc(hero.description)}</p>` : ''}`;
      $('#cat-edit-hero').hidden = !admin;
      $('#cat-add-album').hidden = !admin;

      const groups = new Map();
      sortedAlbums().forEach(album => {
        if (!groups.has(album.month)) groups.set(album.month, []);
        groups.get(album.month).push(album);
      });
      $('#cat-timeline').innerHTML = [...groups].map(([month, albums]) => `<section class="cat-month-group">
        <header class="cat-month-label"><time datetime="${esc(month)}">${esc(monthLabel(month))}</time><span>${albums.length} ALBUM${albums.length === 1 ? '' : 'S'}</span></header>
        <div class="cat-album-grid">${albums.map(album => {
          const cover = album.photos[0] ? `<img src="${esc(album.photos[0])}" alt="${esc(album.title)}" loading="lazy">` : '<span>NO IMAGE</span>';
          const controls = admin ? `<div class="cat-card-admin"><button type="button" data-cat-edit="${esc(album.id)}">EDIT</button><button type="button" data-cat-delete="${esc(album.id)}">DELETE</button></div>` : '';
          return `<article class="cat-album-card">
            <button type="button" class="cat-album-open" data-cat-open="${esc(album.id)}"><figure>${cover}</figure><div><h2>${esc(album.title)}</h2>${album.description ? `<p>${esc(album.description)}</p>` : ''}<small>${album.photos.length} PHOTO${album.photos.length === 1 ? '' : 'S'}</small></div></button>
            ${controls}
          </article>`;
        }).join('')}</div>
      </section>`).join('');
      $('#cats-empty').hidden = payload.albums.length > 0;
    }

    async function persist() {
      if (!await api.ensureAdminSession()) throw new Error('ADMIN LOGIN REQUIRED');
      await api.saveContent('my-cats', payload);
    }

    async function saveEditor(event) {
      event.preventDefault();
      if (!editorState || !await api.ensureAdminSession()) return;
      const button = $('#cat-save');
      const status = $('#cat-status');
      button.disabled = true;
      status.textContent = 'SAVING…';
      try {
        const uploaded = [];
        for (let index = 0; index < editorState.pending.length; index += 1) {
          status.textContent = `UPLOADING ${index + 1}/${editorState.pending.length}…`;
          uploaded.push(await api.uploadPublic(editorState.pending[index], editorState.kind === 'hero' ? 'my-cats/main' : 'my-cats/albums'));
        }
        const title = text($('#cat-editor-title')?.value);
        const description = text($('#cat-editor-description')?.value);
        if (editorState.kind === 'hero') {
          payload.hero = { image:uploaded.at(-1) || editorState.existing.at(-1) || '', title, description };
        } else {
          const month = cleanMonth($('#cat-editor-month')?.value);
          if (!title) throw new Error('PLEASE ENTER AN ALBUM TITLE');
          const nextAlbum = {
            id:editorState.id || newId(), month, title, description,
            photos:[...editorState.existing, ...uploaded],
            createdAt:findAlbum(editorState.id)?.createdAt || new Date().toISOString()
          };
          const index = payload.albums.findIndex(item => item.id === editorState.id);
          if (index >= 0) payload.albums[index] = nextAlbum;
          else payload.albums.push(nextAlbum);
        }
        await persist();
        await render();
        closeEditor();
      } catch (error) {
        status.textContent = error?.message || 'SAVE FAILED';
      } finally {
        button.disabled = false;
      }
    }

    $('#cat-edit-hero').addEventListener('click', openHeroEditor);
    $('#cat-add-album').addEventListener('click', () => openAlbumEditor());
    $('#cat-editor-close').addEventListener('click', closeEditor);
    $('#cat-editor-form').addEventListener('submit', saveEditor);
    $('#cat-editor').addEventListener('click', event => { if (event.target === event.currentTarget) closeEditor(); });
    $('#cat-editor').addEventListener('cancel', event => { event.preventDefault(); closeEditor(); });
    $('#cat-editor-body').addEventListener('change', event => {
      if (event.target?.id !== 'cat-editor-files' || !editorState) return;
      const files = [...event.target.files];
      if (editorState.kind === 'hero') {
        editorState.existing = [];
        editorState.previewUrls.forEach(url => URL.revokeObjectURL(url));
        editorState.pending = files.slice(-1);
        editorState.previewUrls = editorState.pending.map(file => URL.createObjectURL(file));
      } else {
        editorState.pending.push(...files);
        editorState.previewUrls.push(...files.map(file => URL.createObjectURL(file)));
      }
      event.target.value = '';
      refreshMediaPreview();
    });
    $('#cat-editor-body').addEventListener('click', event => {
      if (!(event.target instanceof Element) || !editorState) return;
      const existing = event.target.closest('[data-cat-remove-existing]');
      if (existing) { editorState.existing.splice(Number(existing.dataset.catRemoveExisting), 1); refreshMediaPreview(); return; }
      const pending = event.target.closest('[data-cat-remove-pending]');
      if (pending) {
        const index = Number(pending.dataset.catRemovePending);
        URL.revokeObjectURL(editorState.previewUrls[index]);
        editorState.previewUrls.splice(index, 1);
        editorState.pending.splice(index, 1);
        refreshMediaPreview();
      }
    });
    $('#cat-timeline').addEventListener('click', async event => {
      if (!(event.target instanceof Element)) return;
      const open = event.target.closest('[data-cat-open]');
      if (open) { openAlbum(open.dataset.catOpen); return; }
      const edit = event.target.closest('[data-cat-edit]');
      if (edit) { openAlbumEditor(edit.dataset.catEdit); return; }
      const remove = event.target.closest('[data-cat-delete]');
      if (!remove || !window.SUY_IS_ADMIN || !confirm('Delete this album?')) return;
      payload.albums = payload.albums.filter(item => item.id !== remove.dataset.catDelete);
      try { await persist(); await render(); } catch (error) { alert(error?.message || 'DELETE FAILED'); }
    });
    $('#cat-viewer-close').addEventListener('click', () => $('#cat-album-viewer').close());
    $('#cat-album-viewer').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
    document.addEventListener('suyoon-admin-state', () => { void render(); });
    await render();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

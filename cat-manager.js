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
    const match = /^(\d{4})-(\d{1,2})/.exec(text(value));
    if (!match) return currentMonth();
    const month = Number(match[2]);
    return month >= 1 && month <= 12 ? `${match[1]}-${String(month).padStart(2, '0')}` : currentMonth();
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
      title:text(item?.title),
      description:text(item?.description),
      photos:[text(item?.image)].filter(Boolean),
      createdAt:text(item?.createdAt) || new Date().toISOString()
    }));
    const albums = (Array.isArray(source.albums) ? source.albums : legacy).map(item => ({
      id:text(item?.id) || newId(),
      month:cleanMonth(item?.month || item?.date),
      title:text(item?.title),
      description:text(item?.description),
      photos:list(item?.photos || item?.images).map(text).filter(Boolean),
      createdAt:text(item?.createdAt) || new Date().toISOString()
    }));
    return {
      version:3,
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
    const dateGroups = () => {
      const groups = new Map();
      sortedAlbums().forEach(album => {
        if (!groups.has(album.month)) groups.set(album.month, { month:album.month, albumIds:[], photos:[], createdAt:album.createdAt });
        const group = groups.get(album.month);
        group.albumIds.push(album.id);
        group.photos.push(...album.photos);
      });
      return [...groups.values()].filter(group => group.photos.length > 0);
    };
    const findGroup = month => dateGroups().find(group => group.month === cleanMonth(month));

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

    function openImageEditor() {
      if (!window.SUY_IS_ADMIN) return;
      editorState = { kind:'image', existing:[payload.hero.image].filter(Boolean), pending:[], previewUrls:[] };
      $('.cat-editor-head strong').textContent = 'CHANGE CAT IMAGE';
      $('#cat-editor-body').innerHTML = `<div class="cat-editor-fields">
        <label class="cat-editor-upload">CHOOSE IMAGE<input id="cat-editor-files" type="file" accept="image/*"></label>
        <div id="cat-editor-media" class="cat-editor-media">${mediaPreviewMarkup()}</div>
      </div>`;
      $('#cat-status').textContent = '';
      $('#cat-editor').showModal();
    }

    function openDateEditor(month = '') {
      if (!window.SUY_IS_ADMIN) return;
      const group = month ? findGroup(month) : null;
      editorState = {
        kind:'date',
        sourceMonth:group?.month || '',
        existing:[...(group?.photos || [])],
        pending:[],
        previewUrls:[]
      };
      $('.cat-editor-head strong').textContent = group ? 'EDIT DATE' : 'ADD PHOTOS';
      $('#cat-editor-body').innerHTML = `<div class="cat-editor-fields">
        <label>YEAR · MONTH<input id="cat-editor-month" type="month" value="${esc(group?.month || currentMonth())}" required></label>
        <label class="cat-editor-upload">ADD PHOTOS<input id="cat-editor-files" type="file" accept="image/*" multiple></label>
        <div id="cat-editor-media" class="cat-editor-media">${mediaPreviewMarkup()}</div>
      </div>`;
      $('#cat-status').textContent = '';
      $('#cat-editor').showModal();
      requestAnimationFrame(() => $('#cat-editor-month')?.focus());
    }

    function renderProfile(admin = window.SUY_IS_ADMIN) {
      const hero = payload.hero;
      const view = $('#cat-profile-view');
      const form = $('#cat-profile-form');
      view.hidden = admin;
      form.hidden = !admin;
      view.innerHTML = `${hero.title ? `<h2>${esc(hero.title)}</h2>` : '<h2>MY CAT</h2>'}${hero.description ? `<p>${esc(hero.description).replace(/\n/g, '<br>')}</p>` : ''}`;
      if (admin) {
        $('#cat-profile-title').value = hero.title;
        $('#cat-profile-description').value = hero.description;
        $('#cat-profile-status').textContent = '';
      }
    }

    async function openProfile() {
      const admin = await api.isAdmin().catch(() => false);
      renderProfile(admin);
      const dialog = $('#cat-profile');
      if (!dialog.open) dialog.showModal();
      if (admin) requestAnimationFrame(() => $('#cat-profile-title')?.focus());
    }

    function openDate(month) {
      const group = findGroup(month);
      if (!group) return;
      const label = monthLabel(group.month);
      $('#cat-viewer-month').dateTime = group.month;
      $('#cat-viewer-month').textContent = label;
      $('#cat-viewer-grid').innerHTML = group.photos.map((src, index) => `<figure><img src="${esc(src)}" alt="${esc(label)} photo ${index + 1}" loading="lazy"></figure>`).join('');
      const dialog = $('#cat-album-viewer');
      if (!dialog.open) dialog.showModal();
    }

    async function render() {
      const admin = await api.isAdmin().catch(() => false);
      const hero = payload.hero;
      const heroMedia = $('#cat-hero-media');
      heroMedia.innerHTML = hero.image ? `<img src="${esc(hero.image)}" alt="${esc(hero.title || 'My cat')}">` : '<span>MY CAT</span>';
      heroMedia.classList.toggle('has-image', !!hero.image);
      $('#cat-hero').classList.toggle('is-empty', !hero.image);
      const heroCopy = $('#cat-copy-open');
      heroCopy.innerHTML = `${hero.title ? `<strong>${esc(hero.title)}</strong>` : ''}${hero.description ? `<span>${esc(hero.description).replace(/\n/g, '<br>')}</span>` : ''}`;
      if (admin && !heroCopy.innerHTML) heroCopy.innerHTML = '<span>+ ADD TEXT</span>';
      heroCopy.hidden = !admin && !hero.title && !hero.description;
      $('#cat-edit-hero').hidden = !admin;
      $('#cat-add-album').hidden = !admin;

      const groups = dateGroups();
      $('#cat-timeline').innerHTML = groups.map(group => `<article class="cat-date-row">
        <button type="button" class="cat-date-open" data-cat-open-month="${esc(group.month)}"><time datetime="${esc(group.month)}">${esc(monthLabel(group.month))}</time></button>
        ${admin ? `<div class="cat-date-admin"><button type="button" data-cat-edit-month="${esc(group.month)}">EDIT</button><button type="button" data-cat-delete-month="${esc(group.month)}">DELETE</button></div>` : ''}
      </article>`).join('');
      $('#cats-empty').hidden = groups.length > 0;
      if ($('#cat-profile').open) renderProfile(admin);
    }

    async function persist() {
      if (!await api.ensureAdminSession()) throw new Error('ADMIN LOGIN REQUIRED');
      await api.saveContent('my-cats', payload);
    }

    async function saveProfile(event) {
      event.preventDefault();
      if (!await api.ensureAdminSession()) return;
      const button = $('#cat-profile-save');
      const status = $('#cat-profile-status');
      button.disabled = true;
      status.textContent = 'SAVING…';
      try {
        payload.hero.title = text($('#cat-profile-title').value);
        payload.hero.description = text($('#cat-profile-description').value);
        await persist();
        await render();
        status.textContent = 'SAVED';
      } catch (error) {
        status.textContent = error?.message || 'SAVE FAILED';
      } finally {
        button.disabled = false;
      }
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
          uploaded.push(await api.uploadPublic(editorState.pending[index], editorState.kind === 'image' ? 'my-cats/main' : 'my-cats/albums'));
        }
        if (editorState.kind === 'image') {
          payload.hero.image = uploaded.at(-1) || editorState.existing.at(-1) || '';
        } else {
          const month = cleanMonth($('#cat-editor-month')?.value);
          const sourceGroup = editorState.sourceMonth ? findGroup(editorState.sourceMonth) : null;
          const targetGroup = findGroup(month);
          const targetPhotos = targetGroup && targetGroup.month !== sourceGroup?.month ? targetGroup.photos : [];
          const photos = [...new Set([...targetPhotos, ...editorState.existing, ...uploaded])];
          if (!photos.length) throw new Error('PLEASE ADD AT LEAST ONE PHOTO');
          const removeIds = new Set([...(sourceGroup?.albumIds || []), ...(targetGroup?.albumIds || [])]);
          payload.albums = payload.albums.filter(album => !removeIds.has(album.id));
          payload.albums.push({
            id:sourceGroup?.albumIds[0] || targetGroup?.albumIds[0] || newId(),
            month,
            title:'',
            description:'',
            photos,
            createdAt:sourceGroup?.createdAt || targetGroup?.createdAt || new Date().toISOString()
          });
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

    $('#cat-hero-open').addEventListener('click', () => { void openProfile(); });
    $('#cat-copy-open').addEventListener('click', () => { void openProfile(); });
    $('#cat-edit-hero').addEventListener('click', openImageEditor);
    $('#cat-add-album').addEventListener('click', () => openDateEditor());
    $('#cat-profile-close').addEventListener('click', () => $('#cat-profile').close());
    $('#cat-profile-form').addEventListener('submit', saveProfile);
    $('#cat-profile').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
    $('#cat-editor-close').addEventListener('click', closeEditor);
    $('#cat-editor-form').addEventListener('submit', saveEditor);
    $('#cat-editor').addEventListener('click', event => { if (event.target === event.currentTarget) closeEditor(); });
    $('#cat-editor').addEventListener('cancel', event => { event.preventDefault(); closeEditor(); });
    $('#cat-editor-body').addEventListener('change', event => {
      if (event.target?.id !== 'cat-editor-files' || !editorState) return;
      const files = [...event.target.files];
      if (editorState.kind === 'image') {
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
      if (existing) {
        editorState.existing.splice(Number(existing.dataset.catRemoveExisting), 1);
        refreshMediaPreview();
        return;
      }
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
      const open = event.target.closest('[data-cat-open-month]');
      if (open) { openDate(open.dataset.catOpenMonth); return; }
      const edit = event.target.closest('[data-cat-edit-month]');
      if (edit) { openDateEditor(edit.dataset.catEditMonth); return; }
      const remove = event.target.closest('[data-cat-delete-month]');
      if (!remove || !window.SUY_IS_ADMIN || !confirm('Delete this date and its photos?')) return;
      const month = cleanMonth(remove.dataset.catDeleteMonth);
      payload.albums = payload.albums.filter(album => album.month !== month);
      try { await persist(); await render(); } catch (error) { alert(error?.message || 'DELETE FAILED'); }
    });
    $('#cat-viewer-close').addEventListener('click', () => $('#cat-album-viewer').close());
    $('#cat-album-viewer').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
    document.addEventListener('suyoon-admin-state', event => {
      void render();
      if ($('#cat-profile').open) renderProfile(!!event.detail?.admin);
    });
    await render();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

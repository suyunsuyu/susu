(() => {
  const $ = (selector, root=document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const layouts = new Set(['grid','masonry','journal']);
  const sizes = new Set(['small','normal','wide']);

  const init = async () => {
    if (!$('#cat-gallery')) return;
    if (window.SUY_ADMIN_READY) await window.SUY_ADMIN_READY;
    const api = window.SUY_ADMIN;
    if (!api) return;
    const { loadContent, saveContent, uploadPublic, isAdmin } = api;
    let payload = await loadContent('my-cats').catch(() => null) || { layout:'grid', items:[] };
    payload.layout = layouts.has(payload.layout) ? payload.layout : 'grid';
    payload.items = Array.isArray(payload.items) ? payload.items : [];
    let draft = [];
    let dragged = -1;

    const cleanItem = item => ({
      id: item?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      image: String(item?.image || ''),
      title: String(item?.title || ''),
      description: String(item?.description || ''),
      size: sizes.has(item?.size) ? item.size : 'normal'
    });
    payload.items = payload.items.map(cleanItem);

    const render = async () => {
      const root = $('#cat-gallery');
      root.dataset.layout = payload.layout;
      root.innerHTML = payload.items.map((item, index) => `
        <article class="cat-story" data-size="${esc(item.size)}">
          <figure class="cat-story-image">${item.image ? `<img src="${esc(item.image)}" alt="${esc(item.title || 'My cat')}">` : '<span>ADD PHOTO</span>'}</figure>
          <div class="cat-story-copy"><small>${String(index + 1).padStart(2,'0')}</small>${item.title ? `<h2>${esc(item.title)}</h2>` : ''}${item.description ? `<p>${esc(item.description)}</p>` : ''}</div>
        </article>`).join('');
      $('#cats-empty').hidden = payload.items.length > 0;
      $('#cat-edit').hidden = !await isAdmin();
    };

    const syncDraftFromFields = () => {
      document.querySelectorAll('.cat-item-editor').forEach(row => {
        const index = Number(row.dataset.index);
        if (!draft[index]) return;
        draft[index].title = $('[data-cat-title]', row)?.value || '';
        draft[index].description = $('[data-cat-description]', row)?.value || '';
        draft[index].size = $('[data-cat-size]', row)?.value || 'normal';
      });
    };

    const drawEditor = () => {
      const root = $('#cat-item-editors');
      root.innerHTML = draft.map((item, index) => `
        <article class="cat-item-editor" data-index="${index}" draggable="true">
          ${item.image ? `<img class="cat-item-preview" src="${esc(item.image)}" alt="">` : '<div class="cat-item-preview"></div>'}
          <div class="cat-item-fields">
            <label>TITLE<input data-cat-title value="${esc(item.title)}" placeholder="Cat name or title"></label>
            <label>SIZE<select data-cat-size><option value="small"${item.size === 'small' ? ' selected' : ''}>SMALL</option><option value="normal"${item.size === 'normal' ? ' selected' : ''}>NORMAL</option><option value="wide"${item.size === 'wide' ? ' selected' : ''}>WIDE</option></select></label>
            <label>DESCRIPTION<textarea data-cat-description placeholder="Write a memory, date or description…">${esc(item.description)}</textarea></label>
            <label>PHOTO<input data-cat-file type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label>
            <div class="cat-item-actions"><button type="button" data-cat-move="-1">← EARLIER</button><button type="button" data-cat-move="1">LATER →</button><button type="button" class="cat-remove" data-cat-remove>REMOVE</button></div>
          </div>
        </article>`).join('');

      root.querySelectorAll('input,textarea,select').forEach(input => input.addEventListener('input', syncDraftFromFields));
      root.querySelectorAll('[data-cat-file]').forEach(input => input.addEventListener('change', async event => {
        const row = event.target.closest('.cat-item-editor');
        const index = Number(row.dataset.index);
        const file = event.target.files?.[0];
        if (!file) return;
        syncDraftFromFields();
        $('#cat-status').textContent = 'UPLOADING PHOTO…';
        try {
          draft[index].image = await uploadPublic(file, 'my-cats');
          $('#cat-status').textContent = 'PHOTO UPLOADED · SAVE ALL WHEN FINISHED';
          drawEditor();
        } catch (error) {
          $('#cat-status').textContent = 'UPLOAD FAILED';
          alert(`Image upload failed: ${error?.message || error}`);
        }
      }));
      root.querySelectorAll('[data-cat-move]').forEach(button => button.addEventListener('click', () => {
        syncDraftFromFields();
        const from = Number(button.closest('.cat-item-editor').dataset.index);
        const to = from + Number(button.dataset.catMove);
        if (to < 0 || to >= draft.length) return;
        [draft[from], draft[to]] = [draft[to], draft[from]];
        drawEditor();
      }));
      root.querySelectorAll('[data-cat-remove]').forEach(button => button.addEventListener('click', () => {
        syncDraftFromFields();
        draft.splice(Number(button.closest('.cat-item-editor').dataset.index), 1);
        drawEditor();
      }));
      root.querySelectorAll('.cat-item-editor').forEach(row => {
        row.addEventListener('dragstart', () => { syncDraftFromFields(); dragged = Number(row.dataset.index); });
        row.addEventListener('dragover', event => event.preventDefault());
        row.addEventListener('drop', event => {
          event.preventDefault();
          const to = Number(row.dataset.index);
          if (dragged < 0 || dragged === to) return;
          const [item] = draft.splice(dragged, 1);
          draft.splice(to, 0, item);
          dragged = -1;
          drawEditor();
        });
      });
    };

    $('#cat-edit').addEventListener('click', async () => {
      if (!await isAdmin()) return;
      draft = payload.items.map(item => ({...item}));
      $('#cat-layout').value = payload.layout;
      $('#cat-status').textContent = '';
      drawEditor();
      $('#cat-editor').showModal();
    });
    $('#cat-editor-close').addEventListener('click', () => $('#cat-editor').close());
    $('#cat-editor').addEventListener('click', event => { if (event.target === $('#cat-editor')) $('#cat-editor').close(); });
    $('#cat-add').addEventListener('click', () => {
      syncDraftFromFields();
      draft.push(cleanItem({}));
      drawEditor();
      $('#cat-item-editors').lastElementChild?.scrollIntoView({behavior:'smooth',block:'center'});
    });
    $('#cat-save').addEventListener('click', async () => {
      if (!await isAdmin()) return;
      syncDraftFromFields();
      $('#cat-status').textContent = 'SAVING…';
      payload = { layout: layouts.has($('#cat-layout').value) ? $('#cat-layout').value : 'grid', items:draft.map(cleanItem) };
      try {
        await saveContent('my-cats', payload);
        $('#cat-status').textContent = 'SAVED';
        await render();
        setTimeout(() => $('#cat-editor').close(), 350);
      } catch (error) {
        $('#cat-status').textContent = 'SAVE FAILED';
        alert(`Save failed: ${error?.message || error}`);
      }
    });

    document.addEventListener('suyoon-admin-state', render);
    await render();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

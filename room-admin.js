(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
  const api = window.SUY_ADMIN;
  const sb = api?.sb;
  if (!api || !sb) return;

  const app = $('#room-admin-app');
  const locked = $('#room-admin-locked');
  const itemDialog = $('#admin-item-dialog');
  const albumDialog = $('#admin-album-dialog');
  const itemList = $('#admin-item-list');
  const albumList = $('#admin-album-list');
  const photoList = $('#admin-photo-list');
  let items = [];
  let albums = [];
  let photos = [];
  let removedPhotoIds = [];

  $('#room-admin-login')?.addEventListener('click', () => $('#admin-auth-button')?.click());

  const setStatus = (selector, message, failed = false) => {
    const el = $(selector);
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('is-error', failed);
  };
  const value = selector => $(selector)?.value?.trim() || '';
  const dateOnly = value => value ? String(value).slice(0, 10) : '';
  const uniqueId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  async function requireAdmin() {
    let admin = !!window.SUY_IS_ADMIN;
    try {
      if (window.SUY_ADMIN?.isAdmin) admin = await window.SUY_ADMIN.isAdmin();
    } catch {}
    locked.hidden = admin;
    app.hidden = !admin;
    return admin;
  }

  async function loadItems() {
    const type = $('#admin-item-type').value;
    itemList.innerHTML = '<p class="room-admin-empty">LOADING</p>';
    const { data, error } = await sb.from('room_items').select('*').eq('item_type', type)
      .order('sort_order', { ascending:true }).order('created_at', { ascending:true });
    if (error) {
      itemList.innerHTML = `<p class="room-admin-empty">${esc(error.message)}</p>`;
      return;
    }
    items = data || [];
    itemList.innerHTML = items.length ? items.map((item, index) => `
      <article class="room-admin-row">
        <span>${String(index + 1).padStart(2, '0')}</span>
        ${item.image_url ? `<img src="${esc(item.image_url)}" alt="">` : '<i></i>'}
        <div><strong>${esc(item.title || 'UNTITLED')}</strong><small>${esc(item.subtitle || type.toUpperCase())}</small><p>${esc(item.description || '')}</p></div>
        <em>${item.published ? 'PUBLIC' : 'DRAFT'} · ${Number(item.sort_order) || 0}</em>
        <button type="button" data-edit-item="${esc(item.id)}">EDIT</button>
        <button type="button" data-delete-item="${esc(item.id)}">DELETE</button>
      </article>`).join('') : '<p class="room-admin-empty">NO CONTENT YET.</p>';
    $$('[data-edit-item]', itemList).forEach(button => button.onclick = () => openItem(items.find(item => item.id === button.dataset.editItem)));
    $$('[data-delete-item]', itemList).forEach(button => button.onclick = () => deleteItem(button.dataset.deleteItem));
  }

  function openItem(item = null) {
    $('#admin-item-form').reset();
    $('#admin-item-id').value = item?.id || '';
    $('#admin-item-title').value = item?.title || '';
    $('#admin-item-subtitle').value = item?.subtitle || '';
    $('#admin-item-description').value = item?.description || '';
    $('#admin-item-date').value = dateOnly(item?.metadata?.date);
    $('#admin-item-sort').value = Number(item?.sort_order) || 0;
    $('#admin-item-link').value = item?.link_url || '';
    $('#admin-item-image-url').value = item?.image_url || '';
    $('#admin-item-media-url').value = item?.media_url || '';
    $('#admin-item-published').checked = item ? item.published !== false : true;
    setStatus('#admin-item-status', '');
    itemDialog.showModal();
  }

  async function saveItem(event) {
    event.preventDefault();
    setStatus('#admin-item-status', 'SAVING...');
    try {
      const id = value('#admin-item-id') || uniqueId();
      let imageUrl = value('#admin-item-image-url');
      let mediaUrl = value('#admin-item-media-url');
      const imageFile = $('#admin-item-image').files?.[0];
      const mediaFile = $('#admin-item-media').files?.[0];
      if (imageFile) imageUrl = await api.uploadPublic(imageFile, `room/items/${id}/images`);
      if (mediaFile) mediaUrl = await api.uploadPublic(mediaFile, `room/items/${id}/media`);
      const payload = {
        id,
        item_type:$('#admin-item-type').value,
        title:value('#admin-item-title'),
        subtitle:value('#admin-item-subtitle'),
        description:value('#admin-item-description'),
        image_url:imageUrl || null,
        media_url:mediaUrl || null,
        link_url:value('#admin-item-link') || null,
        metadata:value('#admin-item-date') ? { date:value('#admin-item-date') } : {},
        published:$('#admin-item-published').checked,
        sort_order:Number($('#admin-item-sort').value) || 0,
        updated_at:new Date().toISOString()
      };
      const { error } = await sb.from('room_items').upsert(payload, { onConflict:'id' });
      if (error) throw error;
      setStatus('#admin-item-status', 'SAVED.');
      await loadItems();
      setTimeout(() => itemDialog.close(), 350);
    } catch (error) {
      setStatus('#admin-item-status', `SAVE FAILED: ${error.message}`, true);
    }
  }

  async function deleteItem(id) {
    if (!confirm('Delete this room content item?')) return;
    const { error } = await sb.from('room_items').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadItems();
  }

  async function loadAlbums() {
    albumList.innerHTML = '<p class="room-admin-empty">LOADING</p>';
    const { data, error } = await sb.from('room_albums').select('*,room_photos(count)')
      .order('sort_order', { ascending:true }).order('created_at', { ascending:true });
    if (error) {
      albumList.innerHTML = `<p class="room-admin-empty">${esc(error.message)}</p>`;
      return;
    }
    albums = data || [];
    albumList.innerHTML = albums.length ? albums.map((album, index) => `
      <article class="room-admin-row room-admin-album-row">
        <span>${String(index + 1).padStart(2, '0')}</span>
        ${album.cover_url ? `<img src="${esc(album.cover_url)}" alt="">` : '<i></i>'}
        <div><strong>${esc(album.title || 'UNTITLED')}</strong><small>${dateOnly(album.album_date) || 'UNDATED'} · ${album.room_photos?.[0]?.count || 0} PHOTOS</small><p>${esc(album.description || '')}</p></div>
        <em>${album.published ? 'PUBLIC' : 'DRAFT'} · ${Number(album.sort_order) || 0}</em>
        <button type="button" data-edit-album="${esc(album.id)}">EDIT</button>
        <button type="button" data-delete-album="${esc(album.id)}">DELETE</button>
      </article>`).join('') : '<p class="room-admin-empty">NO PHOTO ALBUMS YET.</p>';
    $$('[data-edit-album]', albumList).forEach(button => button.onclick = () => openAlbum(albums.find(album => album.id === button.dataset.editAlbum)));
    $$('[data-delete-album]', albumList).forEach(button => button.onclick = () => deleteAlbum(button.dataset.deleteAlbum));
  }

  async function openAlbum(album = null) {
    $('#admin-album-form').reset();
    photos = [];
    removedPhotoIds = [];
    $('#admin-album-id').value = album?.id || uniqueId();
    $('#admin-album-title').value = album?.title || '';
    $('#admin-album-description').value = album?.description || '';
    $('#admin-album-date').value = dateOnly(album?.album_date);
    $('#admin-album-sort').value = Number(album?.sort_order) || 0;
    $('#admin-album-cover-url').value = album?.cover_url || '';
    $('#admin-album-published').checked = album ? album.published !== false : true;
    setStatus('#admin-album-status', album ? 'LOADING PHOTOGRAPHS...' : '');
    albumDialog.showModal();
    if (album) {
      const { data, error } = await sb.from('room_photos').select('*').eq('album_id', album.id)
        .order('sort_order', { ascending:true }).order('created_at', { ascending:true });
      if (error) {
        setStatus('#admin-album-status', error.message, true);
      } else {
        photos = data || [];
        setStatus('#admin-album-status', '');
      }
    }
    renderPhotoRows();
  }

  function renderPhotoRows() {
    photoList.innerHTML = photos.length ? photos.map((photo, index) => `
      <article class="room-admin-photo-row" data-photo-index="${index}">
        <img src="${esc(photo.thumb_url || photo.preview_url || photo.image_url)}" alt="">
        <div>
          <label>CAPTION<input data-photo-field="caption" value="${esc(photo.caption || '')}"></label>
          <label>LOCATION<input data-photo-field="location" value="${esc(photo.location || '')}"></label>
          <div class="room-admin-grid"><label>DATE<input data-photo-field="taken_at" type="date" value="${dateOnly(photo.taken_at)}"></label><label>SORT<input data-photo-field="sort_order" type="number" value="${Number(photo.sort_order) || index}"></label></div>
          <label class="room-admin-check"><input data-photo-field="published" type="checkbox" ${photo.published === false ? '' : 'checked'}> PUBLISHED</label>
        </div>
        <button type="button" data-remove-photo="${index}">×</button>
      </article>`).join('') : '<p class="room-admin-empty">DROP A SMALL SERIES OF PHOTOGRAPHS HERE.</p>';
    $$('[data-photo-field]', photoList).forEach(input => {
      input.oninput = () => updatePhotoFromInput(input);
      input.onchange = () => updatePhotoFromInput(input);
    });
    $$('[data-remove-photo]', photoList).forEach(button => button.onclick = () => {
      const index = Number(button.dataset.removePhoto);
      if (photos[index]?.id && !photos[index].isNew) removedPhotoIds.push(photos[index].id);
      photos.splice(index, 1);
      renderPhotoRows();
    });
  }

  function updatePhotoFromInput(input) {
    const row = input.closest('[data-photo-index]');
    const photo = photos[Number(row?.dataset.photoIndex)];
    if (!photo) return;
    const key = input.dataset.photoField;
    photo[key] = input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) || 0 : input.value;
  }

  async function canvasVariant(file, maxWidth, quality, label) {
    let source;
    if ('createImageBitmap' in window) source = await createImageBitmap(file);
    else source = await new Promise((resolve, reject) => {
      const image = new Image(), url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be opened.')); };
      image.src = url;
    });
    const scale = Math.min(1, maxWidth / source.width);
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha:false });
    context.fillStyle = '#f5f5f2';
    context.fillRect(0, 0, width, height);
    context.drawImage(source, 0, 0, width, height);
    source.close?.();
    const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Image conversion failed.')), 'image/webp', quality));
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-${label}.webp`, { type:'image/webp' });
  }

  async function addPhotos(files) {
    if (!files.length) return;
    setStatus('#admin-album-status', `PREPARING 0 / ${files.length}...`);
    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        if (!file.type.startsWith('image/')) continue;
        setStatus('#admin-album-status', `PREPARING ${index + 1} / ${files.length}...`);
        const [original, preview, thumb] = await Promise.all([
          canvasVariant(file, 2400, .9, 'original'),
          canvasVariant(file, 1400, .83, 'preview'),
          canvasVariant(file, 520, .76, 'thumb')
        ]);
        const albumId = value('#admin-album-id');
        const photoId = uniqueId();
        const [imageUrl, previewUrl, thumbUrl] = await Promise.all([
          api.uploadPublic(original, `room/albums/${albumId}/${photoId}/original`),
          api.uploadPublic(preview, `room/albums/${albumId}/${photoId}/preview`),
          api.uploadPublic(thumb, `room/albums/${albumId}/${photoId}/thumb`)
        ]);
        photos.push({
          id:photoId, album_id:albumId, image_url:imageUrl, preview_url:previewUrl, thumb_url:thumbUrl,
          caption:'', location:'', taken_at:'', published:true, sort_order:photos.length, isNew:true
        });
        renderPhotoRows();
      }
      setStatus('#admin-album-status', `${files.length} PHOTOGRAPHS READY. SAVE THE ALBUM.`);
    } catch (error) {
      setStatus('#admin-album-status', `UPLOAD FAILED: ${error.message}`, true);
    } finally {
      $('#admin-photo-upload').value = '';
    }
  }

  async function saveAlbum(event) {
    event.preventDefault();
    setStatus('#admin-album-status', 'SAVING ALBUM...');
    try {
      const id = value('#admin-album-id') || uniqueId();
      let coverUrl = value('#admin-album-cover-url');
      const coverFile = $('#admin-album-cover').files?.[0];
      if (coverFile) {
        const coverVariant = await canvasVariant(coverFile, 1400, .84, 'cover');
        coverUrl = await api.uploadPublic(coverVariant, `room/albums/${id}/cover`);
      } else if (!coverUrl && photos.length) {
        coverUrl = photos[0].preview_url || photos[0].image_url;
      }
      const albumPayload = {
        id,
        title:value('#admin-album-title'),
        description:value('#admin-album-description'),
        cover_url:coverUrl || null,
        album_date:value('#admin-album-date') || null,
        published:$('#admin-album-published').checked,
        sort_order:Number($('#admin-album-sort').value) || 0,
        updated_at:new Date().toISOString()
      };
      const { error:albumError } = await sb.from('room_albums').upsert(albumPayload, { onConflict:'id' });
      if (albumError) throw albumError;
      if (removedPhotoIds.length) {
        const { error } = await sb.from('room_photos').delete().in('id', removedPhotoIds);
        if (error) throw error;
      }
      if (photos.length) {
        const payloads = photos.map((photo, index) => ({
          id:photo.id || uniqueId(), album_id:id, image_url:photo.image_url,
          preview_url:photo.preview_url || null, thumb_url:photo.thumb_url || null,
          caption:photo.caption || '', location:photo.location || '', taken_at:photo.taken_at || null,
          published:photo.published !== false, sort_order:Number(photo.sort_order) || index,
          updated_at:new Date().toISOString()
        }));
        const { error } = await sb.from('room_photos').upsert(payloads, { onConflict:'id' });
        if (error) throw error;
      }
      setStatus('#admin-album-status', 'ALBUM SAVED.');
      await loadAlbums();
      setTimeout(() => albumDialog.close(), 400);
    } catch (error) {
      setStatus('#admin-album-status', `SAVE FAILED: ${error.message}`, true);
    }
  }

  async function deleteAlbum(id) {
    if (!confirm('Delete this album and every photograph in it?')) return;
    const { error } = await sb.from('room_albums').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadAlbums();
  }

  $$('[data-admin-section]').forEach(button => button.onclick = () => {
    $$('[data-admin-section]').forEach(item => item.classList.toggle('active', item === button));
    $('#room-admin-items').hidden = button.dataset.adminSection !== 'items';
    $('#room-admin-albums').hidden = button.dataset.adminSection !== 'albums';
    if (button.dataset.adminSection === 'albums') loadAlbums();
  });
  $$('[data-close-dialog]').forEach(button => button.onclick = () => button.closest('dialog').close());
  $('#admin-item-type').onchange = loadItems;
  $('#admin-new-item').onclick = () => openItem();
  $('#admin-new-album').onclick = () => openAlbum();
  $('#admin-item-form').onsubmit = saveItem;
  $('#admin-album-form').onsubmit = saveAlbum;
  $('#admin-photo-upload').onchange = event => addPhotos([...event.target.files]);
  itemDialog.addEventListener('click', event => { if (event.target === itemDialog) itemDialog.close(); });
  albumDialog.addEventListener('click', event => { if (event.target === albumDialog) albumDialog.close(); });

  const syncAdmin = async () => { if (await requireAdmin()) await loadItems(); };
  document.addEventListener('suyoon-admin-state', syncAdmin);
  if (window.SUY_ADMIN_READY) window.SUY_ADMIN_READY.then(syncAdmin);
  else syncAdmin();
})();

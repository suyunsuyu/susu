(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const state = { products:[], category:'ALL', sort:'custom', editingImages:[] };

  async function start() {
    if (!window.SUY_ADMIN) return;
    await (window.SUY_ADMIN_READY || Promise.resolve());
    const { sb, isAdmin } = window.SUY_ADMIN;
    const detail = $('#product-detail');
    const editor = $('#product-editor');

    const normalizedImages = value => Array.isArray(value) ? value.filter(Boolean) : [];
    const orderedProducts = () => {
      let items = state.products.filter(item => state.category === 'ALL' || (item.category || 'UNCATEGORIZED') === state.category);
      if (state.sort === 'newest') items.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      else if (state.sort === 'name') items.sort((a,b) => String(a.name).localeCompare(String(b.name), undefined, {sensitivity:'base'}));
      else items.sort((a,b) => (Number(a.sort_order)||0) - (Number(b.sort_order)||0) || new Date(b.created_at) - new Date(a.created_at));
      return items;
    };

    function renderCategories() {
      const categories = [...new Set(state.products.map(item => item.category || 'UNCATEGORIZED'))].sort((a,b) => a.localeCompare(b));
      if (state.category !== 'ALL' && !categories.includes(state.category)) state.category = 'ALL';
      $('#product-categories').innerHTML = ['ALL', ...categories].map(category => `<button type="button" class="${state.category===category?'active':''}" data-product-category="${esc(category)}">${esc(category)}</button>`).join('');
      $$('[data-product-category]').forEach(button => button.onclick = () => { state.category = button.dataset.productCategory; render(); });
    }

    function openDetail(product) {
      const images = normalizedImages(product.images);
      $('#product-detail-category').textContent = product.category || 'UNCATEGORIZED';
      $('#product-detail-name').textContent = product.name || 'UNTITLED';
      $('#product-detail-description').textContent = product.description || '';
      $('#product-detail-main').innerHTML = images[0] ? `<img src="${esc(images[0])}" alt="${esc(product.name)}">` : '<span>NO IMAGE</span>';
      $('#product-detail-thumbs').innerHTML = images.length > 1 ? images.map((src,index) => `<button type="button" data-detail-image="${index}"><img src="${esc(src)}" alt="${esc(product.name)} ${index+1}"></button>`).join('') : '';
      $$('[data-detail-image]').forEach(button => button.onclick = () => { $('#product-detail-main').innerHTML = `<img src="${esc(images[Number(button.dataset.detailImage)])}" alt="${esc(product.name)}">`; });
      detail.showModal();
    }

    async function render() {
      const admin = await isAdmin();
      renderCategories();
      const items = orderedProducts();
      $('#products-empty').hidden = items.length > 0;
      $('#product-grid').innerHTML = items.map(product => {
        const image = normalizedImages(product.images)[0];
        return `<article class="product-card">
          <button class="product-card-open" type="button" data-open-product="${product.id}">
            <span class="product-card-image">${image?`<img src="${esc(image)}" alt="${esc(product.name)}" loading="lazy">`:'<span>NO IMAGE</span>'}</span>
            <small>${esc(product.category || 'UNCATEGORIZED')}</small>
            <strong>${esc(product.name || 'UNTITLED')}</strong>
            <span class="product-card-description">${esc(product.description || '')}</span>
          </button>
          ${admin?`<div class="product-admin-actions"><button type="button" data-edit-product="${product.id}">EDIT</button><button type="button" data-delete-product="${product.id}">DELETE</button></div>`:''}
        </article>`;
      }).join('');
      $$('[data-open-product]').forEach(button => button.onclick = () => openDetail(state.products.find(item => String(item.id) === button.dataset.openProduct)));
      $$('[data-edit-product]').forEach(button => button.onclick = () => openEditor(state.products.find(item => String(item.id) === button.dataset.editProduct)));
      $$('[data-delete-product]').forEach(button => button.onclick = () => removeProduct(state.products.find(item => String(item.id) === button.dataset.deleteProduct)));
    }

    async function loadProducts() {
      const { data, error } = await sb.from('products').select('id,code,category,name,description,images,sort_order,created_at,updated_at').order('sort_order',{ascending:true}).order('created_at',{ascending:false});
      if (error) throw error;
      state.products = data || [];
      await render();
    }

    function renderPreview() {
      $('#product-image-preview').innerHTML = state.editingImages.map((src,index) => `<figure><img src="${esc(src)}" alt=""><button type="button" data-remove-product-image="${index}" aria-label="Remove image">×</button></figure>`).join('');
      $$('[data-remove-product-image]').forEach(button => button.onclick = () => { state.editingImages.splice(Number(button.dataset.removeProductImage),1); renderPreview(); });
    }

    function openEditor(product=null) {
      $('#product-id').value = product?.id || '';
      $('#product-name').value = product?.name || '';
      $('#product-category').value = product?.category || '';
      $('#product-description').value = product?.description || '';
      $('#product-order').value = product?.sort_order ?? (state.products.length ? Math.max(...state.products.map(item => Number(item.sort_order)||0)) + 10 : 0);
      $('#product-images').value = '';
      $('#product-status').textContent = '';
      state.editingImages = normalizedImages(product?.images);
      renderPreview();
      editor.showModal();
    }

    async function uploadImage(file) {
      if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed.');
      if (file.size > 8 * 1024 * 1024) throw new Error('Each image must be under 8MB.');
      const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g,'') || 'jpg';
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await sb.storage.from('product-images').upload(path,file,{upsert:false,cacheControl:'3600'});
      if (error) throw error;
      return sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;
    }

    function productImagePaths(urls) {
      return urls.map(url => { try { const parsed = new URL(url); const marker = '/product-images/'; const at = parsed.pathname.indexOf(marker); return at < 0 ? '' : decodeURIComponent(parsed.pathname.slice(at + marker.length)); } catch { return ''; } }).filter(Boolean);
    }

    async function removeProduct(product) {
      if (!product || !await isAdmin() || !confirm(`Delete “${product.name}”?`)) return;
      const { error } = await sb.from('products').delete().eq('id',product.id);
      if (error) { alert('DELETE FAILED: ' + error.message); return; }
      const paths = productImagePaths(normalizedImages(product.images));
      if (paths.length) await sb.storage.from('product-images').remove(paths);
      await loadProducts();
    }

    $('#product-sort').onchange = event => { state.sort = event.target.value; render(); };
    $('#new-product').onclick = async () => { if (await isAdmin()) openEditor(); };
    $('#close-product-editor').onclick = () => editor.close();
    $('#close-product-detail').onclick = () => detail.close();
    [detail,editor].forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
    $('#product-images').onchange = async event => {
      if (!await isAdmin()) return;
      const files = [...event.target.files];
      $('#product-status').textContent = files.length ? `UPLOADING 0 / ${files.length}...` : '';
      for (let index=0; index<files.length; index++) {
        try { state.editingImages.push(await uploadImage(files[index])); renderPreview(); $('#product-status').textContent = `UPLOADING ${index+1} / ${files.length}...`; }
        catch (error) { $('#product-status').textContent = 'UPLOAD FAILED: ' + error.message; break; }
      }
      event.target.value = '';
      if (files.length && !$('#product-status').textContent.startsWith('UPLOAD FAILED')) $('#product-status').textContent = 'PHOTOS READY.';
    };
    $('#product-form').onsubmit = async event => {
      event.preventDefault();
      if (!await isAdmin()) return;
      const id = $('#product-id').value;
      const payload = {
        name:$('#product-name').value.trim(),
        category:$('#product-category').value.trim(),
        description:$('#product-description').value.trim(),
        images:[...state.editingImages],
        sort_order:Math.max(0,Number($('#product-order').value)||0),
        updated_at:new Date().toISOString()
      };
      if (!payload.name || !payload.category) { $('#product-status').textContent = 'NAME AND CATEGORY ARE REQUIRED.'; return; }
      $('#product-status').textContent = 'SAVING...';
      let result;
      if (id) result = await sb.from('products').update(payload).eq('id',id);
      else result = await sb.from('products').insert({...payload,code:`portfolio-${Date.now()}-${Math.random().toString(36).slice(2,8)}`});
      if (result.error) { $('#product-status').textContent = 'SAVE FAILED: ' + result.error.message; return; }
      editor.close();
      await loadProducts();
    };

    try { await loadProducts(); }
    catch (error) { console.error(error); $('#products-empty').textContent = 'COULD NOT LOAD PRODUCTS.'; }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start); else start();
})();

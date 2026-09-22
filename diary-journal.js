(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const role = (name, root) => root.querySelector(`[data-diary-role="${name}"]`);
  const pad = value => String(value).padStart(2, '0');
  const isoDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const today = () => isoDate(new Date());
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  const makeId = () => crypto.randomUUID?.() || `diary-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const fontMap = {
    hand: "'Caveat','Nanum Pen Script',cursive",
    pen: "'Nanum Pen Script','Caveat',cursive",
    cute: "'Gaegu','Nanum Pen Script',cursive",
    serif: 'var(--serif)',
    sans: "'Noto Sans SC',sans-serif",
    mono: 'var(--mono)'
  };

  const normalizeStyle = style => {
    const source = style && typeof style === 'object' ? style : {};
    const font = fontMap[source.font] ? source.font : 'hand';
    const sizeValue = Number(source.size);
    const size = Number.isFinite(sizeValue) && sizeValue >= 12 && sizeValue <= 64 ? String(sizeValue) : '';
    const color = /^#[0-9a-f]{6}$/i.test(source.color || '') ? source.color.toUpperCase() : '#30302D';
    return { font, size, color };
  };

  const normalizeImages = source => {
    const values = Array.isArray(source?.images) ? source.images : (source?.image ? [source.image] : []);
    return values.map(String).filter(Boolean).slice(0, 4);
  };

  const normalizeEntry = (entry, index) => {
    const source = entry && typeof entry === 'object' ? entry : {};
    const images = normalizeImages(source);
    return {
      ...source,
      id: String(source.id || `legacy-${source.date || 'undated'}-${index}`),
      date: validDate(source.date) ? source.date : '',
      title: String(source.title || ''),
      text: String(source.text || ''),
      images,
      image: images[0] || '',
      style: normalizeStyle(source.style)
    };
  };

  const sortEntries = entries => entries.sort((a, b) => {
    if (!a.date && !b.date) return a.id.localeCompare(b.id);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
  });

  const parseLocalDate = value => {
    if (!validDate(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatLongDate = value => {
    const date = parseLocalDate(value);
    return date ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date).toUpperCase() : 'UNDATED';
  };

  async function initDiaryJournal() {
    if (!$('#diary-book')) return;
    if (window.SUY_SITE_READY) await window.SUY_SITE_READY;
    const api = window.SUY_ADMIN;
    if (!api?.loadContent || !api?.saveContent) return;

    let payload;
    try {
      payload = await api.loadContent('diary');
    } catch (error) {
      console.error('Could not load diary content', error);
      payload = null;
    }
    payload = payload && typeof payload === 'object' ? payload : { items: [] };
    let items = sortEntries((Array.isArray(payload.items) ? payload.items : []).map(normalizeEntry));
    let currentIndex = items.length ? items.length - 1 : -1;
    let calendarCursor = (() => {
      const selected = parseLocalDate(items[currentIndex]?.date);
      const base = selected || new Date();
      return new Date(base.getFullYear(), base.getMonth(), 1);
    })();
    let turning = false;

    const spread = $('#diary-book-spread');
    const turnStage = $('#diary-turn-sheet');
    const prevPage = $('#diary-prev-page');
    const nextPage = $('#diary-next-page');
    const calendarMonth = $('#diary-calendar-month');
    const calendarGrid = $('#diary-calendar-grid');
    const bookSection = $('#diary-book-section');
    const dialog = $('#diary-dialog');
    const form = $('#diary-form');
    const status = $('#diary-editor-status');

    const applyEntryStyle = (element, style) => {
      const normalized = normalizeStyle(style);
      element.style.fontFamily = fontMap[normalized.font];
      element.style.fontSize = normalized.size ? `${normalized.size}px` : '';
      element.style.color = normalized.color;
    };

    function fillSpread(root, index) {
      const entry = items[index];
      const hasEntry = Boolean(entry);
      const images = hasEntry ? normalizeImages(entry) : [];
      const date = role('date', root);
      const photoCount = role('photo-count', root);
      const photos = role('photos', root);
      const placeholder = role('photo-placeholder', root);
      const pageNumber = role('page-number', root);
      const title = role('title', root);
      const copy = role('copy', root);
      const empty = role('empty', root);

      date.textContent = hasEntry ? formatLongDate(entry.date) : '';
      date.dateTime = hasEntry ? entry.date : '';
      photoCount.textContent = images.length ? `${pad(images.length)} PHOTO${images.length === 1 ? '' : 'S'}` : '';
      pageNumber.textContent = hasEntry ? `PAGE ${index + 1} / ${items.length}` : 'PAGE 0 / 0';
      title.textContent = hasEntry ? entry.title : '';
      title.hidden = !entry?.title;
      copy.textContent = hasEntry ? entry.text : '';
      copy.hidden = !hasEntry;
      empty.hidden = hasEntry;
      applyEntryStyle(copy, entry?.style);

      photos.replaceChildren();
      photos.dataset.count = String(images.length);
      images.forEach((src, photoIndex) => {
        const figure = document.createElement('figure');
        figure.className = 'diary-snapshot';
        figure.style.zIndex = String(photoIndex + 1);
        const image = document.createElement('img');
        image.src = src;
        image.alt = entry.date ? `Diary photo from ${entry.date}, ${photoIndex + 1} of ${images.length}` : `Diary photo ${photoIndex + 1}`;
        image.loading = 'lazy';
        figure.append(image);
        photos.append(figure);
      });
      photos.hidden = !images.length;
      placeholder.hidden = Boolean(images.length);
    }

    function updateActiveCalendarDate() {
      $$('.diary-calendar-day.is-active', calendarGrid).forEach(button => button.classList.remove('is-active'));
      const date = items[currentIndex]?.date;
      if (!date) return;
      calendarGrid.querySelector(`[data-date="${date}"]`)?.classList.add('is-active');
    }

    function renderPage() {
      fillSpread(spread, currentIndex);
      prevPage.disabled = currentIndex <= 0;
      nextPage.disabled = currentIndex < 0 || currentIndex >= items.length - 1;
      updateActiveCalendarDate();
    }

    function renderCalendar() {
      const year = calendarCursor.getFullYear();
      const month = calendarCursor.getMonth();
      calendarMonth.textContent = `${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(calendarCursor).toUpperCase()} ${year}`;
      calendarGrid.replaceChildren();

      const entriesByDate = new Map();
      items.forEach((entry, index) => {
        if (!entry.date) return;
        if (!entriesByDate.has(entry.date)) entriesByDate.set(entry.date, []);
        entriesByDate.get(entry.date).push(index);
      });

      const firstWeekday = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
      for (let cell = 0; cell < cellCount; cell += 1) {
        const day = cell - firstWeekday + 1;
        if (day < 1 || day > daysInMonth) {
          const blank = document.createElement('span');
          blank.className = 'diary-calendar-blank';
          blank.setAttribute('aria-hidden', 'true');
          calendarGrid.append(blank);
          continue;
        }

        const dateKey = `${year}-${pad(month + 1)}-${pad(day)}`;
        const indexes = entriesByDate.get(dateKey) || [];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `diary-calendar-day${indexes.length ? ' has-entry' : ''}`;
        button.dataset.date = dateKey;
        const dayText = document.createElement('span');
        dayText.textContent = String(day);
        button.append(dayText);
        if (indexes.length) {
          button.setAttribute('aria-label', `Open diary entry for ${formatLongDate(dateKey)}`);
          button.addEventListener('click', () => selectPage(indexes[0], { scroll: true }));
        } else {
          button.disabled = true;
          button.setAttribute('aria-label', `${formatLongDate(dateKey)}, no diary entry`);
        }
        calendarGrid.append(button);
      }
      renderPage();
    }

    function syncCalendarToCurrentPage() {
      const selected = parseLocalDate(items[currentIndex]?.date);
      if (!selected) {
        renderPage();
        return;
      }
      const needsMonthChange = selected.getFullYear() !== calendarCursor.getFullYear()
        || selected.getMonth() !== calendarCursor.getMonth();
      if (needsMonthChange) {
        calendarCursor = new Date(selected.getFullYear(), selected.getMonth(), 1);
        renderCalendar();
      } else {
        renderPage();
      }
    }

    const cleanClone = node => {
      const clone = node.cloneNode(true);
      clone.removeAttribute('id');
      $$('[id]', clone).forEach(element => element.removeAttribute('id'));
      return clone;
    };

    function createTurnFace(className, paper) {
      const face = document.createElement('div');
      face.className = `diary-turn-face ${className}`;
      face.append(cleanClone(paper));
      return face;
    }

    function selectPage(index, options = {}) {
      if (index < 0 || index >= items.length || turning) return;
      const nextIndex = Number(index);
      const direction = nextIndex > currentIndex ? 'forward' : 'backward';
      if (nextIndex === currentIndex || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        currentIndex = nextIndex;
        syncCalendarToCurrentPage();
        if (options.scroll) bookSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      turning = true;
      const currentSnapshot = cleanClone(spread);
      const targetSnapshot = cleanClone(spread);
      fillSpread(targetSnapshot, nextIndex);
      const currentLeft = role('left-page', currentSnapshot);
      const currentRight = role('right-page', currentSnapshot);
      const targetLeft = role('left-page', targetSnapshot);
      const targetRight = role('right-page', targetSnapshot);

      const stationary = document.createElement('div');
      stationary.className = `diary-turn-stationary is-${direction === 'forward' ? 'left' : 'right'}`;
      stationary.append(cleanClone(direction === 'forward' ? currentLeft : currentRight));

      const leaf = document.createElement('div');
      leaf.className = 'diary-turn-leaf';
      if (direction === 'forward') {
        leaf.append(createTurnFace('diary-turn-face-front', currentRight));
        leaf.append(createTurnFace('diary-turn-face-back', targetLeft));
      } else {
        leaf.append(createTurnFace('diary-turn-face-front', currentLeft));
        leaf.append(createTurnFace('diary-turn-face-back', targetRight));
      }

      turnStage.replaceChildren(stationary, leaf);
      turnStage.className = `diary-turn-stage is-${direction}`;
      turnStage.hidden = false;
      prevPage.disabled = true;
      nextPage.disabled = true;
      requestAnimationFrame(() => requestAnimationFrame(() => turnStage.classList.add('is-turning')));

      window.setTimeout(() => {
        currentIndex = nextIndex;
        syncCalendarToCurrentPage();
      }, 390);
      window.setTimeout(() => stationary.classList.add('is-releasing'), 455);
      window.setTimeout(() => {
        turnStage.hidden = true;
        turnStage.className = 'diary-turn-stage';
        turnStage.replaceChildren();
        turning = false;
        renderPage();
        if (options.scroll) bookSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 960);
    }

    function readEditorStyle() {
      return normalizeStyle({
        font: $('#diary-font').value,
        size: $('#diary-size').value,
        color: $('#diary-color').value
      });
    }

    function updatePreview() {
      const preview = $('#diary-style-preview');
      preview.textContent = $('#diary-text').value || 'Write here…';
      applyEntryStyle(preview, readEditorStyle());
    }

    function syncColor(fromText = false) {
      const picker = $('#diary-color');
      const text = $('#diary-color-hex');
      if (fromText) {
        if (/^#[0-9a-f]{6}$/i.test(text.value)) picker.value = text.value;
      } else {
        text.value = picker.value.toUpperCase();
      }
      updatePreview();
    }

    function renderExistingPhotos(images = []) {
      const root = $('#diary-existing-photos');
      root.replaceChildren();
      images.forEach((src, index) => {
        const image = document.createElement('img');
        image.src = src;
        image.alt = `Current diary photo ${index + 1}`;
        root.append(image);
      });
      root.hidden = !images.length;
      $('#diary-remove-photo-wrap').hidden = !images.length;
    }

    function resetEditor(date = today()) {
      form.reset();
      $('#diary-edit-id').value = '';
      $('#diary-date').value = date;
      $('#diary-title').value = '';
      $('#diary-font').value = 'hand';
      $('#diary-size').value = '';
      $('#diary-color').value = '#30302d';
      $('#diary-color-hex').value = '#30302D';
      $('#diary-remove-photo').checked = false;
      renderExistingPhotos([]);
      $('#save-diary-entry').textContent = 'SAVE PAGE';
      status.textContent = '';
      updatePreview();
    }

    function editEntry(id) {
      const entry = items.find(item => item.id === id);
      if (!entry) return;
      const style = normalizeStyle(entry.style);
      $('#diary-edit-id').value = entry.id;
      $('#diary-date').value = entry.date;
      $('#diary-title').value = entry.title || '';
      $('#diary-text').value = entry.text;
      $('#diary-font').value = style.font;
      $('#diary-size').value = style.size;
      $('#diary-color').value = style.color;
      $('#diary-color-hex').value = style.color;
      $('#diary-images').value = '';
      $('#diary-remove-photo').checked = false;
      renderExistingPhotos(normalizeImages(entry));
      $('#save-diary-entry').textContent = 'UPDATE PAGE';
      status.textContent = '';
      updatePreview();
      dialog.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderManager() {
      const manager = $('#diary-manager');
      manager.replaceChildren();
      $('#diary-manager-count').textContent = String(items.length).padStart(2, '0');
      if (!items.length) {
        const empty = document.createElement('p');
        empty.className = 'diary-empty';
        empty.textContent = 'NO SAVED PAGES.';
        manager.append(empty);
        return;
      }
      [...items].reverse().forEach(entry => {
        const row = document.createElement('div');
        row.className = 'diary-row';
        const label = document.createElement('span');
        label.textContent = entry.title ? `${entry.date || 'UNDATED'} · ${entry.title}` : (entry.date || 'UNDATED');
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.textContent = 'EDIT';
        edit.addEventListener('click', () => editEntry(entry.id));
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'DELETE';
        remove.addEventListener('click', async () => {
          if (!await api.isAdmin() || !confirm(`Delete the diary page for ${entry.date || 'this date'}?`)) return;
          status.textContent = 'DELETING…';
          try {
            items = items.filter(item => item.id !== entry.id);
            await api.saveContent('diary', { ...payload, items });
            payload = { ...payload, items };
            currentIndex = items.length ? Math.min(currentIndex, items.length - 1) : -1;
            const selected = parseLocalDate(items[currentIndex]?.date);
            if (selected) calendarCursor = new Date(selected.getFullYear(), selected.getMonth(), 1);
            renderManager();
            renderCalendar();
            status.textContent = 'PAGE DELETED.';
          } catch (error) {
            status.textContent = `DELETE FAILED: ${error.message}`;
          }
        });
        row.append(label, edit, remove);
        manager.append(row);
      });
    }

    prevPage.addEventListener('click', () => selectPage(currentIndex - 1));
    nextPage.addEventListener('click', () => selectPage(currentIndex + 1));
    $('#diary-calendar-prev').addEventListener('click', () => {
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
      renderCalendar();
    });
    $('#diary-calendar-next').addEventListener('click', () => {
      calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
      renderCalendar();
    });

    ['diary-text', 'diary-font', 'diary-size'].forEach(id => $(`#${id}`).addEventListener('input', updatePreview));
    $('#diary-color').addEventListener('input', () => syncColor(false));
    $('#diary-color-hex').addEventListener('input', () => syncColor(true));
    $('#diary-new-draft').addEventListener('click', () => resetEditor());
    $('#edit-diary').addEventListener('click', async () => {
      if (!await api.isAdmin()) return;
      resetEditor(items[currentIndex]?.date || today());
      renderManager();
      dialog.showModal();
    });
    $('#close-diary-editor').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!await api.isAdmin()) return;
      const date = $('#diary-date').value;
      const text = $('#diary-text').value.trim();
      if (!validDate(date) || !text) {
        status.textContent = 'ADD A DATE AND NOTE FIRST.';
        return;
      }

      const editId = $('#diary-edit-id').value;
      const existingIndex = items.findIndex(item => item.id === editId);
      const existing = existingIndex >= 0 ? items[existingIndex] : null;
      const files = [...($('#diary-images').files || [])];
      let images = $('#diary-remove-photo').checked ? [] : normalizeImages(existing);
      if (images.length + files.length > 4) {
        status.textContent = 'A PAGE CAN HOLD UP TO 4 PHOTOS. REMOVE CURRENT PHOTOS OR SELECT FEWER FILES.';
        return;
      }

      status.textContent = files.length ? `UPLOADING 0 / ${files.length}…` : 'SAVING…';
      try {
        for (let index = 0; index < files.length; index += 1) {
          status.textContent = `UPLOADING ${index + 1} / ${files.length}…`;
          images.push(await api.uploadPublic(files[index], 'diary'));
        }

        const entry = {
          ...(existing || {}),
          id: existing?.id || makeId(),
          date,
          title: $('#diary-title').value.trim(),
          text,
          images,
          image: images[0] || '',
          style: readEditorStyle()
        };
        if (existingIndex >= 0) items[existingIndex] = entry;
        else items.push(entry);
        items = sortEntries(items);
        status.textContent = 'SAVING…';
        await api.saveContent('diary', { ...payload, items });
        payload = { ...payload, items };
        currentIndex = items.findIndex(item => item.id === entry.id);
        calendarCursor = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, 1);
        renderManager();
        renderCalendar();
        status.textContent = 'PAGE SAVED.';
        window.setTimeout(() => dialog.close(), 280);
      } catch (error) {
        status.textContent = `SAVE FAILED: ${error.message}`;
      }
    });

    renderCalendar();
    renderPage();
    updatePreview();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDiaryJournal);
  else initDiaryJournal();
})();

(() => {
  const scene = document.querySelector('#room-scene');
  if (!scene) return;

  const $ = selector => document.querySelector(selector);
  const api = window.SUY_ADMIN || null;
  const itemNames = {
    tv: '电视机 / TV',
    camera: '相机 / CAMERA',
    cat: '小猫 / MY CAT',
    calendar: '日历 / CALENDAR',
    stereo: '音响 / MUSIC',
    lamp: '吊灯 / LAMP',
    plant: '花盆 / FLOWER',
    books: '书 / BOOKS',
    trophy: '奖杯 / TROPHY',
    diary: '日记本 / DIARY',
    postcard: '秘密明信片 / SECRET POSTCARD',
    window: '夜空窗户 / NIGHT WINDOW'
  };
  const defaults = {
    tv: { title: 'MY LITTLE SCREEN', text: '我在这里收藏喜欢的影像、动画和灵感。' },
    camera: { title: 'THE CAMERA I CARRY', text: '点击编辑后，可以上传相机、摄影作品或写下拍摄故事。' },
    cat: { title: 'MY CAT', text: '上传小猫的照片，再写一段只属于它的介绍。' },
    calendar: { title: 'MY BIRTHDAY', text: '在管理模式里标记生日，这一天会一直留在房间里。' },
    stereo: { title: 'NOW PLAYING', text: '添加我喜欢的音乐，让访客听见这个房间的声音。' },
    lamp: { title: 'ROOM LIGHT', text: '每次点击吊灯，房间都会在明亮与夜晚之间切换。' },
    plant: { title: 'MY FAVORITE FLOWER', text: '这里生长着我喜欢的花，也记录它为什么特别。' },
    books: { title: 'BOOKS I KEEP', text: '我喜欢的书、读过的句子，以及还没读完的那一页。' },
    trophy: { title: 'MY UNIVERSITY', text: '在这里添加大学、专业，以及值得纪念的学习经历。' },
    diary: { title: 'WHO I AM', text: '姓名、性格、理想和我正在慢慢成为的人。' },
    postcard: { title: 'A SECRET POSTCARD', text: '这是房间里的隐藏角落：可以留下一段给陌生访客的秘密。' },
    window: { title: 'TONIGHT\'S SKY', text: '窗外永远有一颗缓慢移动的月亮。点击它，停一会儿。' }
  };
  let room = { items: structuredClone(defaults) };
  let selected = 'tv';

  const mergeRoom = value => {
    const incoming = value && typeof value === 'object' ? value : {};
    const items = incoming.items && typeof incoming.items === 'object' ? incoming.items : {};
    room = { ...incoming, items: {} };
    Object.keys(itemNames).forEach(key => {
      room.items[key] = { ...defaults[key], ...(items[key] || {}) };
    });
    const birthday = room.items.calendar?.date || '';
    const day = birthday ? String(Number(birthday.slice(-2)) || '♥') : '♥';
    $('#room-calendar-day').textContent = day;
  };

  const detailDialog = $('#room-detail-dialog');
  const showDetail = key => {
    const item = room.items[key] || defaults[key];
    $('#room-detail-kicker').textContent = itemNames[key] || 'MY ROOM';
    $('#room-detail-title').textContent = item.title || itemNames[key] || '';
    $('#room-detail-text').textContent = item.text || '这里还没有写入内容。';
    const image = $('#room-detail-image');
    if (item.image) {
      image.src = item.image;
      image.alt = item.title || itemNames[key] || '';
      image.hidden = false;
    } else {
      image.hidden = true;
      image.removeAttribute('src');
    }
    const date = $('#room-detail-date');
    if (item.date) {
      const parsed = new Date(`${item.date}T00:00:00`);
      date.textContent = Number.isNaN(parsed.getTime()) ? item.date : parsed.toLocaleDateString(undefined, { month:'long', day:'numeric', year:'numeric' });
      date.dateTime = item.date;
      date.hidden = false;
    } else date.hidden = true;
    const audio = $('#room-detail-audio');
    if (item.audio) {
      audio.src = item.audio;
      audio.hidden = false;
    } else {
      audio.pause();
      audio.hidden = true;
      audio.removeAttribute('src');
    }
    const link = $('#room-detail-link');
    if (item.link) {
      link.href = item.link;
      link.hidden = false;
    } else {
      link.hidden = true;
      link.removeAttribute('href');
    }
    if (!detailDialog.open) detailDialog.showModal();
  };

  const toggleLight = () => {
    const night = scene.classList.toggle('room-lights-off');
    scene.setAttribute('aria-label', night ? 'The room lights are off' : 'The room lights are on');
  };

  document.querySelectorAll('[data-room-item]').forEach(button => {
    button.addEventListener('click', () => {
      const key = button.dataset.roomItem;
      if (key === 'lamp') toggleLight();
      showDetail(key);
    });
  });
  $('#room-detail-close').addEventListener('click', () => detailDialog.close());
  detailDialog.addEventListener('click', event => {
    if (event.target === detailDialog) detailDialog.close();
  });
  detailDialog.addEventListener('close', () => {
    const audio = $('#room-detail-audio');
    audio.pause();
  });

  const editor = $('#room-editor');
  const select = $('#room-editor-item');
  select.innerHTML = Object.entries(itemNames).map(([key, label]) => `<option value="${key}">${label}</option>`).join('');

  const editorPreview = () => {
    const image = $('#room-editor-image').files?.[0];
    const imageUrl = image ? URL.createObjectURL(image) : $('#room-editor-image-url').value.trim();
    const preview = $('#room-editor-preview');
    preview.replaceChildren();
    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = 'Preview';
      preview.appendChild(img);
    } else {
      const empty = document.createElement('span');
      empty.textContent = 'NO IMAGE PREVIEW';
      preview.appendChild(empty);
    }
  };
  const fillEditor = key => {
    selected = key;
    const item = room.items[key] || defaults[key];
    select.value = key;
    $('#room-editor-title').value = item.title || '';
    $('#room-editor-text').value = item.text || '';
    $('#room-editor-date').value = item.date || '';
    $('#room-editor-image-url').value = item.image || '';
    $('#room-editor-link').value = item.link || '';
    $('#room-editor-image').value = '';
    $('#room-editor-audio').value = '';
    $('#room-editor-date-label').hidden = key !== 'calendar';
    $('#room-editor-status').textContent = '';
    editorPreview();
  };
  select.addEventListener('change', () => fillEditor(select.value));
  $('#room-editor-image').addEventListener('change', editorPreview);
  $('#room-editor-image-url').addEventListener('input', editorPreview);
  $('#edit-room').addEventListener('click', async () => {
    if (!api) return;
    if (!await api.isAdmin()) return;
    fillEditor(selected);
    editor.showModal();
  });
  $('#room-editor-close').addEventListener('click', () => editor.close());
  editor.addEventListener('click', event => {
    if (event.target === editor) editor.close();
  });
  $('#room-editor-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!api) return;
    if (!await api.isAdmin()) return;
    const status = $('#room-editor-status');
    status.textContent = 'SAVING...';
    try {
      const previous = room.items[selected] || {};
      const photo = $('#room-editor-image').files?.[0];
      const audioFile = $('#room-editor-audio').files?.[0];
      if (photo && photo.size > 10 * 1024 * 1024) throw new Error('Photo must be under 10MB.');
      if (audioFile && audioFile.size > 20 * 1024 * 1024) throw new Error('Audio must be under 20MB.');
      const image = photo ? await api.uploadPublic(photo, 'about-room') : $('#room-editor-image-url').value.trim();
      const audio = audioFile ? await api.uploadPublic(audioFile, 'about-room-audio') : (previous.audio || '');
      room.items[selected] = {
        title: $('#room-editor-title').value.trim(),
        text: $('#room-editor-text').value.trim(),
        date: $('#room-editor-date').value,
        image,
        link: $('#room-editor-link').value.trim(),
        audio
      };
      mergeRoom(room);
      await api.saveContent('about-room', room);
      status.textContent = 'SAVED · 已保存';
      setTimeout(() => editor.close(), 500);
    } catch (error) {
      status.textContent = `SAVE FAILED · ${error.message}`;
    }
  });

  (async () => {
    if (!api) {
      mergeRoom(null);
      return;
    }
    try {
      mergeRoom(await api.loadContent('about-room'));
    } catch (error) {
      console.warn('About room content could not be loaded.', error);
      mergeRoom(null);
    }
  })();
})();

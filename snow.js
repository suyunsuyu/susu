(() => {
  const isHome = document.body.classList.contains('home');
  const isDiary = document.body.classList.contains('diary-weather');
  if (!isHome && !isDiary) return;

  const storageKey = 'suyoon-weather-v1';
  const validModes = new Set(['snow', 'clear', 'rain']);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = matchMedia('(max-width: 720px)').matches;
  const textStyle = '\uFE0E';
  const shapes = ['❄', '❅', '❆', '✻', '✼'].map(shape => `${shape}${textStyle}`);
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch {}

  let mode = validModes.has(saved.mode) ? saved.mode : 'snow';
  let speed = Math.max(0.5, Math.min(2, Number(saved.speed) || 1));
  const layer = document.createElement('div');
  layer.className = 'weather-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  let snowGround = null;
  let snowDepositCount = 0;
  let snowHeights = [];
  let snowMelting = false;
  let snowMeltTimer = 0;

  const setTiming = particle => {
    const duration = Number(particle.dataset.baseDuration) / speed;
    const delayRatio = Number(particle.dataset.delayRatio);
    particle.style.animationDuration = `${duration.toFixed(2)}s`;
    particle.style.animationDelay = `${(-duration * delayRatio).toFixed(2)}s`;
  };

  const resetSnowState = () => {
    if (snowMeltTimer) clearTimeout(snowMeltTimer);
    snowMeltTimer = 0;
    snowGround = null;
    snowDepositCount = 0;
    snowHeights = [];
    snowMelting = false;
  };

  const startSnowGround = () => {
    snowGround = document.createElement('div');
    snowGround.className = 'weather-snow-ground';
    snowGround.style.setProperty('--snow-progress', '.08');
    layer.appendChild(snowGround);
  };

  const addSnowDeposit = particle => {
    if (mode !== 'snow' || !snowGround || snowMelting) return;
    const threshold = isMobile ? 44 : 70;
    const bucketCount = isMobile ? 16 : 26;
    const left = Math.max(0, Math.min(99.9, parseFloat(particle.style.getPropertyValue('--weather-left')) || 0));
    const bucket = Math.min(bucketCount - 1, Math.floor(left / 100 * bucketCount));
    const rise = Math.min(18, snowHeights[bucket] || 0);
    const deposit = document.createElement('span');
    deposit.className = 'weather-snow-deposit';
    deposit.style.left = `${((bucket + .5) / bucketCount * 100).toFixed(2)}%`;
    deposit.style.bottom = `${rise.toFixed(1)}px`;
    deposit.style.width = `${Math.round(7 + Math.random() * 10)}px`;
    deposit.style.height = `${Math.round(3 + Math.random() * 5)}px`;
    deposit.style.setProperty('--snow-jitter', `${Math.round(-8 + Math.random() * 16)}px`);
    snowGround.appendChild(deposit);
    snowHeights[bucket] = rise + 1.2 + Math.random() * 2.2;
    snowDepositCount += 1;
    snowGround.style.setProperty('--snow-progress', (0.08 + Math.min(1, snowDepositCount / threshold) * 0.92).toFixed(3));
    if (snowDepositCount < threshold) return;
    snowMelting = true;
    snowGround.classList.add('is-melting');
    snowMeltTimer = setTimeout(() => {
      if (mode !== 'snow' || !snowGround) return;
      snowGround.replaceChildren();
      snowGround.classList.remove('is-melting');
      snowGround.style.setProperty('--snow-progress', '.08');
      snowDepositCount = 0;
      snowHeights = [];
      snowMelting = false;
      snowMeltTimer = 0;
    }, 2500);
  };

  const createSnow = index => {
    const particle = document.createElement('span');
    const duration = 9 + Math.random() * 11;
    particle.className = 'weather-particle weather-snowflake';
    particle.textContent = shapes[index % shapes.length];
    particle.dataset.baseDuration = duration.toFixed(2);
    particle.dataset.delayRatio = Math.random().toFixed(3);
    particle.style.setProperty('--weather-left', `${(1 + Math.random() * 98).toFixed(1)}%`);
    particle.style.setProperty('--weather-size', `${(6.5 + Math.random() * 7.5).toFixed(1)}px`);
    particle.style.setProperty('--weather-opacity', (0.2 + Math.random() * 0.34).toFixed(2));
    particle.style.setProperty('--weather-drift', `${(-38 + Math.random() * 76).toFixed(1)}px`);
    particle.style.setProperty('--weather-spin', `${Math.round(180 + Math.random() * 620)}deg`);
    particle.addEventListener('animationiteration', () => addSnowDeposit(particle));
    setTiming(particle);
    return particle;
  };

  const createRain = () => {
    const particle = document.createElement('span');
    const duration = 0.8 + Math.random() * 0.75;
    particle.className = 'weather-particle weather-raindrop';
    particle.dataset.baseDuration = duration.toFixed(2);
    particle.dataset.delayRatio = Math.random().toFixed(3);
    particle.style.setProperty('--weather-left', `${(-3 + Math.random() * 106).toFixed(1)}%`);
    particle.style.setProperty('--rain-length', `${Math.round(8 + Math.random() * 12)}px`);
    particle.style.setProperty('--rain-opacity', (0.18 + Math.random() * 0.22).toFixed(2));
    particle.addEventListener('animationiteration', () => {
      if (mode !== 'rain' || reducedMotion) return;
      const left = parseFloat(particle.style.getPropertyValue('--weather-left')) || 0;
      const splash = document.createElement('span');
      splash.className = 'weather-rain-splash';
      splash.style.left = `${Math.max(-2, Math.min(102, left - 10)).toFixed(1)}%`;
      splash.style.setProperty('--splash-opacity', particle.style.getPropertyValue('--rain-opacity') || '.4');
      splash.addEventListener('animationend', () => splash.remove(), { once:true });
      layer.appendChild(splash);
    });
    setTiming(particle);
    return particle;
  };

  const render = () => {
    resetSnowState();
    layer.replaceChildren();
    document.body.dataset.weather = mode;
    if (mode !== 'clear' && !reducedMotion) {
      if (mode === 'snow') startSnowGround();
      const count = mode === 'snow'
        ? (isMobile ? (isDiary ? 34 : 44) : (isDiary ? 58 : 78))
        : (isMobile ? 48 : 82);
      for (let index = 0; index < count; index += 1) {
        layer.appendChild(mode === 'snow' ? createSnow(index) : createRain());
      }
    }
    document.querySelectorAll('[data-weather-mode]').forEach(button => {
      const active = button.dataset.weatherMode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  const save = () => {
    if (!isHome) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ mode, speed })); } catch {}
  };

  if (isHome) {
    const speedInput = document.querySelector('#weather-speed');
    if (speedInput) {
      speedInput.value = String(speed);
      speedInput.addEventListener('input', () => {
        speed = Math.max(0.5, Math.min(2, Number(speedInput.value) || 1));
        document.querySelectorAll('.weather-particle').forEach(setTiming);
        save();
      });
    }
    document.querySelectorAll('[data-weather-mode]').forEach(button => {
      button.addEventListener('click', () => {
        mode = validModes.has(button.dataset.weatherMode) ? button.dataset.weatherMode : 'snow';
        render();
        save();
      });
    });
  }

  render();
})();

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

  const setTiming = particle => {
    const duration = Number(particle.dataset.baseDuration) / speed;
    const delayRatio = Number(particle.dataset.delayRatio);
    particle.style.animationDuration = `${duration.toFixed(2)}s`;
    particle.style.animationDelay = `${(-duration * delayRatio).toFixed(2)}s`;
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
    setTiming(particle);
    return particle;
  };

  const createRain = () => {
    const particle = document.createElement('span');
    const impactY = 26 + Math.random() * 72;
    const duration = 1.5 + impactY / 100 * (1.2 + Math.random() * 1.6);
    particle.className = 'weather-particle weather-raindrop';
    particle.dataset.baseDuration = duration.toFixed(2);
    particle.dataset.delayRatio = Math.random().toFixed(3);
    particle.style.setProperty('--weather-left', `${(-3 + Math.random() * 106).toFixed(1)}%`);
    particle.style.setProperty('--rain-length', `${Math.round(8 + Math.random() * 12)}px`);
    particle.style.setProperty('--rain-opacity', (0.18 + Math.random() * 0.22).toFixed(2));
    particle.style.setProperty('--rain-end-y', `${(impactY + 16).toFixed(1)}vh`);
    particle.addEventListener('animationiteration', () => {
      if (mode !== 'rain' || reducedMotion) return;
      const left = parseFloat(particle.style.getPropertyValue('--weather-left')) || 0;
      const splash = document.createElement('span');
      splash.className = 'weather-rain-splash';
      splash.style.left = `${Math.max(-2, Math.min(102, left - 10)).toFixed(1)}%`;
      splash.style.setProperty('--impact-top', `${impactY.toFixed(1)}vh`);
      splash.style.setProperty('--splash-opacity', particle.style.getPropertyValue('--rain-opacity') || '.4');
      splash.addEventListener('animationend', () => splash.remove(), { once:true });
      layer.appendChild(splash);
    });
    setTiming(particle);
    return particle;
  };

  const render = () => {
    layer.replaceChildren();
    document.body.dataset.weather = mode;
    if (mode !== 'clear' && !reducedMotion) {
      const count = mode === 'snow'
        ? (isMobile ? (isDiary ? 34 : 44) : (isDiary ? 58 : 78))
        : (isMobile ? 38 : 64);
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

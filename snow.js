(() => {
  const isHome = document.body.classList.contains('home');
  const isDiary = document.body.classList.contains('diary-weather');
  if (!isHome && !isDiary) return;

  const storageKey = 'suyoon-weather-v1';
  const validModes = new Set(['snow', 'clear', 'rain']);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = matchMedia('(max-width: 720px)').matches;
  const shapes = ['❄', '❅', '❆', '✻', '✼'];
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch {}

  let mode = isHome && validModes.has(saved.mode) ? saved.mode : 'snow';
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
    const duration = 0.8 + Math.random() * 0.75;
    particle.className = 'weather-particle weather-raindrop';
    particle.dataset.baseDuration = duration.toFixed(2);
    particle.dataset.delayRatio = Math.random().toFixed(3);
    particle.style.setProperty('--weather-left', `${(-3 + Math.random() * 106).toFixed(1)}%`);
    particle.style.setProperty('--rain-length', `${Math.round(12 + Math.random() * 22)}px`);
    particle.style.setProperty('--rain-opacity', (0.14 + Math.random() * 0.2).toFixed(2));
    setTiming(particle);
    return particle;
  };

  const render = () => {
    layer.replaceChildren();
    document.body.dataset.weather = mode;
    if (mode === 'clear') {
      const sun = document.createElement('span');
      sun.className = 'weather-sun';
      sun.textContent = '☼';
      layer.appendChild(sun);
    } else if (!reducedMotion) {
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

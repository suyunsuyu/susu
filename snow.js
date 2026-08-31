(() => {
  if (!document.body.classList.contains('home') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const shapes = ['❄', '❅', '❆', '✻', '✼'];
  const windowView = document.querySelector('#home-window');
  if (!windowView) return;

  const layer = document.createElement('div');
  layer.className = 'snow-layer';
  layer.setAttribute('aria-hidden', 'true');

  const createFlake = (index, left, drift, duration) => {
    const flake = document.createElement('span');
    const size = 7 + Math.random() * 7;
    flake.className = 'snowflake';
    flake.textContent = shapes[index % shapes.length];
    flake.style.setProperty('--snow-left', `${left.toFixed(1)}%`);
    flake.style.setProperty('--snow-size', `${size.toFixed(1)}px`);
    flake.style.setProperty('--snow-opacity', (0.22 + Math.random() * 0.34).toFixed(2));
    flake.style.setProperty('--snow-drift', `${drift.toFixed(1)}px`);
    flake.style.setProperty('--snow-spin', `${Math.round(160 + Math.random() * 560)}deg`);
    flake.style.setProperty('--snow-duration', `${duration.toFixed(1)}s`);
    flake.style.setProperty('--snow-delay', `${(-Math.random() * duration).toFixed(1)}s`);
    return flake;
  };

  const count = matchMedia('(max-width: 720px)').matches ? 32 : 46;
  for (let index = 0; index < count; index += 1) {
    const drift = -15 + Math.random() * 30;
    const duration = 8 + Math.random() * 10;
    const left = Math.random() < 0.5 ? 4 + Math.random() * 25 : 71 + Math.random() * 25;
    layer.appendChild(createFlake(index, left, drift, duration));
  }

  windowView.appendChild(layer);

  const navLayer = document.createElement('div');
  navLayer.className = 'snow-nav-layer';
  navLayer.setAttribute('aria-hidden', 'true');
  const navCount = matchMedia('(max-width: 720px)').matches ? 12 : 18;
  for (let index = 0; index < navCount; index += 1) {
    const duration = 7 + Math.random() * 8;
    navLayer.appendChild(createFlake(index + count, 3 + Math.random() * 94, -24 + Math.random() * 48, duration));
  }
  document.querySelector('#home-main').appendChild(navLayer);
})();

(() => {
  if (!document.body.classList.contains('home') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const shapes = ['❄', '❅', '❆', '✻', '✼'];
  const layer = document.createElement('div');
  layer.className = 'snow-layer';
  layer.setAttribute('aria-hidden', 'true');

  const count = matchMedia('(max-width: 720px)').matches ? 42 : 58;
  for (let index = 0; index < count; index += 1) {
    const flake = document.createElement('span');
    const size = 7 + Math.random() * 7;
    const drift = -42 + Math.random() * 84;
    const duration = 8 + Math.random() * 10;
    flake.className = 'snowflake';
    flake.textContent = shapes[index % shapes.length];
    flake.style.setProperty('--snow-left', `${Math.random() * 100}%`);
    flake.style.setProperty('--snow-size', `${size.toFixed(1)}px`);
    flake.style.setProperty('--snow-opacity', (0.22 + Math.random() * 0.34).toFixed(2));
    flake.style.setProperty('--snow-drift', `${drift.toFixed(1)}px`);
    flake.style.setProperty('--snow-spin', `${Math.round(160 + Math.random() * 560)}deg`);
    flake.style.setProperty('--snow-duration', `${duration.toFixed(1)}s`);
    flake.style.setProperty('--snow-delay', `${(-Math.random() * duration).toFixed(1)}s`);
    layer.appendChild(flake);
  }

  document.body.appendChild(layer);
})();

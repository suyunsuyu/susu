(() => {
  if (!document.body.classList.contains('home')) return;

  const storageKey = 'suyoon-weather-v2';
  const modes = new Set(['rain', 'snow', 'clear']);
  const modeOrder = ['snow', 'rain', 'clear'];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch {}
  let mode = modes.has(stored.mode) ? stored.mode : 'snow';
  const speed = 1;
  let width = innerWidth;
  let height = innerHeight;
  let dpr = Math.min(devicePixelRatio || 1, 2);
  let last = performance.now();
  let windPhase = Math.random() * Math.PI * 2;
  let particles = [];
  let splashes = [];

  const canvas = document.createElement('canvas');
  canvas.className = 'weather-layer weather-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const context = canvas.getContext('2d', { alpha:true });

  const random = (min, max) => min + Math.random() * (max - min);
  const resize = () => {
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const resetSnow = (particle, fromTop = false) => {
    particle.kind = 'snow';
    particle.x = random(-20, width + 20);
    particle.y = fromTop ? random(-height * .3, -12) : random(-20, height);
    particle.size = random(2.8, 7.2);
    particle.vy = random(12, 31);
    particle.vx = random(-5, 5);
    particle.alpha = random(.22, .63);
    particle.rotation = random(0, Math.PI * 2);
    particle.spin = random(-.35, .35);
    particle.wobble = random(0, Math.PI * 2);
    particle.wobbleSpeed = random(.45, 1.15);
    particle.armStyle = Math.floor(random(0, 3));
  };

  const resetRain = (particle, fromTop = false) => {
    particle.kind = 'rain';
    particle.x = random(-40, width + 30);
    particle.y = fromTop ? random(-height * .5, -15) : random(-30, height);
    particle.length = random(5, 12);
    particle.vy = random(115, 195);
    particle.vx = random(-11, -3);
    particle.alpha = random(.16, .38);
    particle.lineWidth = random(.45, 1.05);
    particle.impactY = random(height * .34, height * .985);
  };

  const desiredCount = () => {
    const mobile = width <= 720;
    if (mode === 'snow') return mobile ? 48 : Math.min(110, Math.round(width / 14));
    if (mode === 'rain') return mobile ? 54 : Math.min(130, Math.round(width / 11));
    return 0;
  };

  const seedParticles = () => {
    particles = [];
    splashes = [];
    const count = reducedMotion ? 0 : desiredCount();
    for (let index = 0; index < count; index += 1) {
      const particle = {};
      if (mode === 'snow') resetSnow(particle, false);
      else resetRain(particle, false);
      particles.push(particle);
    }
  };

  const drawSnowflake = particle => {
    const { x, y, size, alpha, rotation, armStyle } = particle;
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.strokeStyle = `rgba(137,143,146,${alpha})`;
    context.lineWidth = Math.max(.45, size * .105);
    context.lineCap = 'round';
    for (let arm = 0; arm < 6; arm += 1) {
      context.rotate(Math.PI / 3);
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(0, -size);
      const branch = size * (armStyle === 2 ? .45 : .58);
      const spread = size * (armStyle === 1 ? .3 : .22);
      context.moveTo(0, -branch);
      context.lineTo(-spread, -branch - spread);
      context.moveTo(0, -branch);
      context.lineTo(spread, -branch - spread);
      if (armStyle === 2) {
        context.moveTo(0, -size * .75);
        context.lineTo(-size * .15, -size * .88);
        context.moveTo(0, -size * .75);
        context.lineTo(size * .15, -size * .88);
      }
      context.stroke();
    }
    if (armStyle === 1) {
      context.beginPath();
      context.arc(0, 0, size * .22, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  };

  const makeSplash = particle => {
    splashes.push({
      x: particle.x,
      y: particle.impactY,
      age: 0,
      life: random(.34, .58),
      alpha: particle.alpha * 1.5,
      radius: random(4, 10),
      droplets: Array.from({ length: 3 + Math.floor(random(0, 3)) }, () => ({
        vx: random(-18, 18), vy: random(-26, -10), size: random(.5, 1.2)
      }))
    });
    if (splashes.length > 85) splashes.splice(0, splashes.length - 85);
  };

  const drawRain = particle => {
    const angle = particle.vx / particle.vy;
    context.beginPath();
    context.moveTo(particle.x, particle.y);
    context.lineTo(particle.x - particle.length * angle, particle.y - particle.length);
    context.strokeStyle = `rgba(112,126,134,${particle.alpha})`;
    context.lineWidth = particle.lineWidth;
    context.lineCap = 'round';
    context.stroke();
  };

  const drawSplash = splash => {
    const progress = splash.age / splash.life;
    const fade = Math.max(0, 1 - progress);
    context.strokeStyle = `rgba(105,123,132,${splash.alpha * fade})`;
    context.lineWidth = .7;
    context.beginPath();
    context.ellipse(splash.x, splash.y, splash.radius * progress, splash.radius * .24 * progress, 0, Math.PI, Math.PI * 2);
    context.stroke();
    splash.droplets.forEach(drop => {
      const x = splash.x + drop.vx * splash.age;
      const y = splash.y + drop.vy * splash.age + 38 * splash.age * splash.age;
      context.fillStyle = `rgba(105,123,132,${splash.alpha * fade})`;
      context.beginPath();
      context.arc(x, y, drop.size, 0, Math.PI * 2);
      context.fill();
    });
  };

  const tick = time => {
    const delta = Math.min(.05, (time - last) / 1000) * speed;
    last = time;
    context.clearRect(0, 0, width, height);
    if (mode !== 'clear' && !reducedMotion) {
      windPhase += delta * .12;
      const wind = Math.sin(windPhase) * 7;
      particles.forEach(particle => {
        if (particle.kind === 'snow') {
          particle.wobble += delta * particle.wobbleSpeed;
          particle.x += (particle.vx + wind + Math.sin(particle.wobble) * 10) * delta;
          particle.y += particle.vy * delta;
          particle.rotation += particle.spin * delta;
          if (particle.y > height + 14 || particle.x < -45 || particle.x > width + 45) resetSnow(particle, true);
          drawSnowflake(particle);
        } else {
          particle.x += (particle.vx + wind * .25) * delta;
          particle.y += particle.vy * delta;
          if (particle.y >= particle.impactY) {
            makeSplash(particle);
            resetRain(particle, true);
          }
          drawRain(particle);
        }
      });
      splashes.forEach(splash => {
        splash.age += delta;
        drawSplash(splash);
      });
      splashes = splashes.filter(splash => splash.age < splash.life);
    }
    requestAnimationFrame(tick);
  };

  const save = () => {
    try { localStorage.setItem(storageKey, JSON.stringify({ mode })); } catch {}
  };
  const renderControls = () => {
    document.body.dataset.weather = mode;
    document.querySelectorAll('[data-weather-mode]').forEach(button => {
      const active = button.dataset.weatherMode === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };
  // Keep the homepage visually quiet: double-click empty space to cycle
  // through snow → rain → clear. Interactive elements keep their normal use.
  document.addEventListener('dblclick', event => {
    if (event.target.closest('a,button,input,textarea,select,dialog,[contenteditable="true"]')) return;
    const index = modeOrder.indexOf(mode);
    mode = modeOrder[(index + 1) % modeOrder.length];
    seedParticles();
    renderControls();
    save();
  }, { passive:true });
  addEventListener('resize', () => {
    resize();
    seedParticles();
  }, { passive:true });
  resize();
  seedParticles();
  renderControls();
  requestAnimationFrame(tick);
})();

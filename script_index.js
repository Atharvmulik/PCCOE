(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover)').matches;

  /* ---------- WATER BACKGROUND (circular ripple area around cursor) ---------- */
  const canvas = document.getElementById('water-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, dpr;
  const GRID = 40, STEP = 8;
  const R = 190;                       // radius of the water area (px)
  const mouse = { x: -999, y: -999, tx: -999, ty: -999, on: false, strength: 0 };
  const ripples = [];                  // expanding rings
  let lastRipple = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // ambient drifting lines
  const drift = Array.from({ length: 28 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    len: 40 + Math.random() * 80, sp: 0.3 + Math.random() * 0.5,
    a: -0.4 + (Math.random() - 0.5) * 0.2
  }));

  window.addEventListener('mousemove', (e) => {
    mouse.tx = e.clientX; mouse.ty = e.clientY; mouse.on = true;
    const now = performance.now();
    if (now - lastRipple > 140) {
      ripples.push({ x: e.clientX, y: e.clientY, r: 4, life: 1 });
      lastRipple = now;
    }
  });
  window.addEventListener('mousedown', (e) => {
    for (let i = 0; i < 3; i++) ripples.push({ x: e.clientX, y: e.clientY, r: 4 - i * 14, life: 1 });
  });
  document.addEventListener('mouseleave', () => (mouse.on = false));

  function drawGrid(t) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(226,224,216,0.65)';
    const mx = mouse.x, my = mouse.y, k = mouse.strength;

    // displace a point if it is inside the circular water area
    function warp(x, y) {
      const dx = x - mx, dy = y - my, d = Math.hypot(dx, dy);
      if (d >= R || k < 0.01) return [x, y];
      const f = Math.pow(1 - d / R, 2) * k;
      const wave = Math.sin(d * 0.075 - t * 3.2) * 11 * f;
      const nx = d ? dx / d : 0, ny = d ? dy / d : 0;
      return [x + nx * wave + Math.sin(t * 1.6 + y * 0.05) * 2 * f, y + ny * wave + Math.cos(t * 1.4 + x * 0.05) * 2 * f];
    }

    ctx.beginPath();
    for (let x = 0; x <= W + GRID; x += GRID) {
      for (let y = 0; y <= H + STEP; y += STEP) {
        const [px, py] = warp(x, y);
        y === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
    }
    for (let y = 0; y <= H + GRID; y += GRID) {
      for (let x = 0; x <= W + STEP; x += STEP) {
        const [px, py] = warp(x, y);
        x === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  function drawLens() {
    if (mouse.strength < 0.01) return;
    const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, R);
    g.addColorStop(0, `rgba(13,148,136,${0.14 * mouse.strength})`);
    g.addColorStop(0.55, `rgba(2,132,199,${0.07 * mouse.strength})`);
    g.addColorStop(1, 'rgba(2,132,199,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, R, 0, Math.PI * 2); ctx.fill();
  }

  function drawRipples() {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += 2.2; rp.life -= 0.014;
      if (rp.life <= 0 || rp.r > R) { ripples.splice(i, 1); continue; }
      if (rp.r < 0) continue;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(13,148,136,${0.35 * rp.life})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r * 0.72, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(2,132,199,${0.18 * rp.life})`;
      ctx.stroke();
    }
  }

  function drawDrift() {
    ctx.strokeStyle = 'rgba(13,148,136,0.12)';
    ctx.lineWidth = 1;
    drift.forEach((l) => {
      l.x += Math.cos(l.a) * l.sp; l.y += Math.sin(l.a) * l.sp;
      if (l.x < -100) l.x = W + 50; if (l.y < -100) l.y = H + 50;
      if (l.x > W + 100) l.x = -50; if (l.y > H + 100) l.y = -50;
      ctx.beginPath(); ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x + Math.cos(l.a) * l.len, l.y + Math.sin(l.a) * l.len);
      ctx.stroke();
    });
  }

  function frame(ts) {
    const t = ts / 1000;
    if (mouse.x === -999) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    mouse.x += (mouse.tx - mouse.x) * 0.14;      // smooth follow
    mouse.y += (mouse.ty - mouse.y) * 0.14;
    mouse.strength += ((mouse.on ? 1 : 0) - mouse.strength) * 0.06;

    ctx.clearRect(0, 0, W, H);
    drawGrid(t);
    if (!reduced) { drawLens(); drawRipples(); drawDrift(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- CUSTOM CURSOR ---------- */
  if (fine && !reduced) {
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    let rx = 0, ry = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', (e) => {
      cx = e.clientX; cy = e.clientY;
      dot.style.left = cx + 'px'; dot.style.top = cy + 'px';
      document.body.classList.add('cursor-on');
    });
    (function loop() {
      rx += (cx - rx) * 0.18; ry += (cy - ry) * 0.18;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a, button, .stage').forEach((el) => {
      el.addEventListener('mouseenter', () => ring.classList.add('active'));
      el.addEventListener('mouseleave', () => ring.classList.remove('active'));
    });
  }

  /* ---------- 3D TILT ---------- */
  if (fine && !reduced) {
    document.querySelectorAll('.tilt').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top - r.height / 2) / (r.height / 2)) * -5;
        const ry = ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * 5;
        card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
      });
      card.addEventListener('mouseleave', () => (card.style.transform = ''));
    });
  }

  /* ---------- SCROLL REVEAL ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* ---------- NAV SHADOW ON SCROLL ---------- */
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 20), { passive: true });

  /* ---------- COUNT-UP NUMBERS ---------- */
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0), suf = el.dataset.suffix || '';
    if (reduced) return;
    const t0 = performance.now() + 700, dur = 1600;
    (function tick(now) {
      const p = Math.min(Math.max((now - t0) / dur, 0), 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = (end * e).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
      if (p < 1) requestAnimationFrame(tick);
    })(performance.now());
  });

  /* ---------- PIPELINE STAGES (click + auto-advance) ---------- */
  const stages = [...document.querySelectorAll('.stage')];
  const bar = document.getElementById('stage-progress');
  let current = 0, timer;
  function setStage(i) {
    current = i;
    stages.forEach((s, n) => s.classList.toggle('active', n === i));
    bar.style.width = ((i + 1) * 20) + '%';
  }
  function auto() { clearInterval(timer); if (!reduced) timer = setInterval(() => setStage((current + 1) % stages.length), 3500); }
  stages.forEach((s, i) => s.addEventListener('click', () => { setStage(i); auto(); }));
  const pipe = document.getElementById('stages');
  pipe.addEventListener('mouseenter', () => clearInterval(timer));
  pipe.addEventListener('mouseleave', auto);
  setStage(0); auto();
})();
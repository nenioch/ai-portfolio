'use strict';
/* =============================================================================
   main.js: afspeellus, tijdlijn en bediening (opzet als oermens-dag)
   ============================================================================= */
(function () {
  const $ = id => document.getElementById(id);
  const canvas = $('scene'), ctx = canvas.getContext('2d');
  const starts = []; let acc = 0;
  SCENES.forEach(s => { starts.push(acc); acc += s.dur; });
  const TOTAL = acc;

  // ------------------------------------------------------------ formaat + podium
  let W = 0, H = 0, dpr = 1, S = { cx: 0, cy: 0, s: 1 };
  const stars = [];
  { const r = rng(3); for (let i = 0; i < 160; i++) stars.push([r(), r(), r() * 1.4 + 0.3, r() * 6.28, (r() - 0.5) * 0.004]); }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (W < 760) S = { cx: W / 2, cy: H * 0.38, s: Math.min(W * 0.94, H * 0.62) / 640 };
    else S = { cx: W * 0.58, cy: H * 0.42, s: Math.min(W * 0.62, H * 0.8) / 620 };
  }
  resize();
  window.addEventListener('resize', resize);

  // ------------------------------------------------------------ tijdlijn
  const ui = { year: $('year'), sceneNo: $('scene-no'), lower: $('lower'), idx: $('lower-idx'), title: $('lower-title'),
    txt: $('lower-txt'), fact: $('lower-fact'), fade: $('fade'), timeline: $('timeline'), time: $('time') };
  const pad = n => String(n).padStart(2, '0');
  const yearOf = (s, t) => (typeof s.year === 'function' ? s.year(t) : s.year);
  const segs = SCENES.map((s, i) => {
    const el = document.createElement('button');
    el.className = 'seg'; el.type = 'button'; el.style.flex = s.dur + ' 1 0';
    el.setAttribute('aria-label', s.title);
    el.innerHTML = '<i></i><span>' + yearOf(s, 0) + ' · ' + s.title + '</span>';
    el.addEventListener('click', e => {
      const r = el.getBoundingClientRect();
      const f = e.detail === 0 ? 0 : clamp01((e.clientX - r.left) / r.width);
      T = starts[i] + f * s.dur + 0.001;
    });
    ui.timeline.appendChild(el);
    return el;
  });

  let T = 0, playing = true, current = -1;
  function locate(x) { let i = SCENES.length - 1; while (i > 0 && starts[i] > x) i--; return { i, t: x - starts[i] }; }
  function jump(d) {
    const { i, t } = locate(T);
    let j = i + d;
    if (d < 0 && t > 1.5) j = i;
    T = starts[(j + SCENES.length) % SCENES.length] + 0.001;
  }
  function enter(i) {
    current = i;
    const s = SCENES[i];
    ui.lower.classList.remove('show'); void ui.lower.offsetWidth;
    ui.idx.textContent = pad(i + 1) + ' / ' + pad(SCENES.length);
    ui.title.textContent = s.title;
    ui.txt.textContent = s.txt;
    const parts = s.fact.split(': ');
    ui.fact.innerHTML = '';
    if (parts.length > 1) { const b = document.createElement('b'); b.textContent = parts.shift() + ': '; ui.fact.append(b); }
    ui.fact.append(parts.join(': '));
    ui.sceneNo.textContent = 'scène ' + (i + 1) + ' van ' + SCENES.length;
    segs.forEach((el, j) => el.classList.toggle('cur', j === i));
  }

  // ------------------------------------------------------------ bediening
  const playBtn = $('play');
  function setPlaying(p) { playing = p; playBtn.classList.toggle('paused', !p); playBtn.setAttribute('aria-label', p ? 'Pauzeren' : 'Afspelen'); }
  playBtn.addEventListener('click', () => setPlaying(!playing));
  $('prev').addEventListener('click', () => jump(-1));
  $('next').addEventListener('click', () => jump(1));
  canvas.addEventListener('click', () => setPlaying(!playing));
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
    else if (e.code === 'ArrowRight') jump(1);
    else if (e.code === 'ArrowLeft') jump(-1);
    else if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('clean');
    wake();
  });
  let idleTimer = 0;
  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (playing) document.body.classList.add('idle'); }, 3000);
  }
  window.addEventListener('pointermove', wake);
  window.addEventListener('pointerdown', wake);
  wake();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  // ?t=40 start op seconde 40, ?paused pauzeert, ?clean verbergt de tekst (voor schermafbeeldingen)
  const q = new URLSearchParams(location.search);
  if (q.has('t')) T = Math.min(TOTAL - 0.01, Math.max(0, parseFloat(q.get('t')) || 0));
  if (q.has('paused')) setPlaying(false);
  if (q.has('clean')) document.body.classList.add('clean');

  // ------------------------------------------------------------ tekenen
  function background(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#06070c'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(S.cx, S.cy, 0, S.cx, S.cy, Math.max(W, H) * 0.6);
    g.addColorStop(0, 'rgba(40,60,110,0.22)'); g.addColorStop(1, 'rgba(6,7,12,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c8d4ff';
    for (const st of stars) {
      const x = ((st[0] + now * st[4] * 0.01) % 1 + 1) % 1 * W, y = st[1] * H;
      ctx.globalAlpha = 0.12 + 0.18 * (0.5 + 0.5 * Math.sin(now * 0.8 + st[3]));
      ctx.fillRect(x, y, st[2], st[2]);
    }
    ctx.globalAlpha = 1;
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (playing) T = (T + dt) % TOTAL;
    const { i, t } = locate(T);
    if (i !== current) enter(i);
    const s = SCENES[i];

    background(now / 1000);
    ctx.setTransform(dpr * S.s, 0, 0, dpr * S.s, dpr * S.cx, dpr * S.cy);
    ctx.save();
    s.draw(ctx, t);
    ctx.restore();

    ui.lower.classList.toggle('show', t > 0.8 && t < s.dur - 0.6);
    ui.fade.style.opacity = Math.max(1 - t / 0.5, 1 - (s.dur - t) / 0.5, 0).toFixed(3);
    ui.year.textContent = yearOf(s, t);
    segs.forEach((el, j) => { el.firstChild.style.width = ((j < i ? 1 : j > i ? 0 : t / s.dur) * 100).toFixed(2) + '%'; });
    const fmt = x => Math.floor(x / 60) + ':' + pad(Math.floor(x % 60));
    ui.time.textContent = fmt(T) + ' / ' + fmt(TOTAL);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(t => { last = t; loop(t); });
})();

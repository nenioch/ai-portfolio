'use strict';
/* =============================================================================
   main.js — afspeellus, tijdlijn en bediening
   ============================================================================= */

(function () {
  const $ = id => document.getElementById(id);
  const canvas = $('scene');
  const fail = msg => { $('loader').hidden = true; $('error').hidden = false; if (msg) $('error').textContent = msg; };

  if (!window.THREE) return fail('three.js kon niet geladen worden. Deze animatie haalt de 3D-bibliotheek van internet; zet de verbinding aan en herlaad de pagina.');
  window.addEventListener('error', e => fail('Fout: ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')'));

  let W;
  try { W = createWereld(canvas); } catch (e) { return fail('Je browser ondersteunt geen WebGL, dus de animatie kan niet worden getoond.'); }
  const dag = buildDag(W);
  const SCENES = dag.SCENES, TOTAL = DUR * SCENES.length;
  const cam = createCineCam(canvas, W.camera, heightAt);

  // ------------------------------------------------------------ formaat
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    W.renderer.setSize(w, h, false);
    W.camera.aspect = w / h;
    W.camera.fov = w / h < 1 ? 55 : 38;          // smal scherm: iets wijder kijken
    W.camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ------------------------------------------------------------ tijdlijn
  const ui = {
    clock: $('clock'), sceneNo: $('scene-no'), lower: $('lower'), idx: $('lower-idx'),
    title: $('lower-title'), txt: $('lower-txt'), fact: $('lower-fact'), fade: $('fade'),
    timeline: $('timeline'), time: $('time'),
  };
  const pad = n => String(n).padStart(2, '0');
  const segs = SCENES.map((s, i) => {
    const el = document.createElement('button');
    el.className = 'seg'; el.type = 'button';
    el.setAttribute('aria-label', pad(s.h0) + ':00 ' + s.title);
    el.innerHTML = '<i></i><span>' + pad(s.h0) + ':00 · ' + s.title + '</span>';
    el.addEventListener('click', e => {
      const r = el.getBoundingClientRect();
      const f = e.detail === 0 ? 0 : clamp01((e.clientX - r.left) / r.width);   // toetsenbord: begin van scène
      T = i * DUR + f * DUR + 0.001;
    });
    ui.timeline.appendChild(el);
    return el;
  });

  let T = 0, playing = true, current = -1;
  function locate(x) { const i = Math.min(SCENES.length - 1, Math.floor(x / DUR)); return { i, t: x - i * DUR }; }
  function jump(d) {
    const { i, t } = locate(T);
    let j = i + d;
    if (d < 0 && t > 1.5) j = i;
    T = ((j + SCENES.length) % SCENES.length) * DUR + 0.001;
  }
  function enter(i) {
    current = i;
    const s = SCENES[i];
    ui.lower.classList.remove('show');
    void ui.lower.offsetWidth;
    ui.idx.textContent = pad(i + 1) + ' / ' + pad(SCENES.length);
    ui.title.textContent = s.title;
    ui.txt.textContent = s.txt;
    const [b, ...rest] = s.fact.split(': ');
    ui.fact.innerHTML = '';
    const bb = document.createElement('b'); bb.textContent = b + ': ';
    ui.fact.append(bb, rest.join(': '));
    ui.sceneNo.textContent = 'scène ' + (i + 1) + ' van ' + SCENES.length;
    segs.forEach((el, j) => el.classList.toggle('cur', j === i));
  }

  // ------------------------------------------------------------ bediening
  const playBtn = $('play');
  function setPlaying(p) {
    playing = p;
    playBtn.classList.toggle('paused', !p);
    playBtn.setAttribute('aria-label', p ? 'Pauzeren' : 'Afspelen');
    document.body.classList.toggle('is-paused', !p);
  }
  playBtn.addEventListener('click', () => setPlaying(!playing));
  $('prev').addEventListener('click', () => jump(-1));
  $('next').addEventListener('click', () => jump(1));
  cam.onTap = () => setPlaying(!playing);
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
  // ?t=40 start op seconde 40, ?paused pauzeert direct (handig om te delen)
  const q = new URLSearchParams(location.search);
  if (q.has('t')) T = clamp(parseFloat(q.get('t')) || 0, 0, TOTAL - 0.01);
  if (q.has('paused')) setPlaying(false);
  // ?cam=x,y,z,doelX,doelY,doelZ zet een vast standpunt (voor schermafbeeldingen)
  const fixedCam = q.has('cam') ? q.get('cam').split(',').map(Number) : null;

  // ------------------------------------------------------------ lus
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (playing) T = (T + dt) % TOTAL;

    const { i, t } = locate(T);
    if (i !== current) enter(i);
    const s = SCENES[i];
    const hour = lerp(s.h0, s.h1, t / DUR);
    W.setHour(hour);
    dag.update(i, t, T);
    cam.update(dt, s.cam(t), T);
    if (fixedCam) { W.camera.position.set(fixedCam[0], fixedCam[1], fixedCam[2]); W.camera.lookAt(fixedCam[3], fixedCam[4], fixedCam[5]); }
    W.setFocus(cam.a);
    W.update(now / 1000);
    W.renderer.render(W.scene, W.camera);

    // overlays
    ui.lower.classList.toggle('show', t > 0.8 && t < DUR - 0.6);
    ui.fade.style.opacity = Math.max(i === 0 ? 1 - t / 1.2 : 0, i === SCENES.length - 1 ? 1 - (DUR - t) / 1.2 : 0, 0).toFixed(3);
    const hh = Math.floor(hour) % 24, mm = Math.floor((hour % 1) * 12) * 5;
    ui.clock.textContent = pad(hh) + ':' + pad(mm);
    segs.forEach((el, j) => { el.firstChild.style.width = ((j < i ? 1 : j > i ? 0 : t / DUR) * 100).toFixed(2) + '%'; });
    const fmt = x => Math.floor(x / 60) + ':' + pad(Math.floor(x % 60));
    ui.time.textContent = fmt(T) + ' / ' + fmt(TOTAL);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(t => {
    last = t;
    loop(t);
    $('loader').classList.add('gone');
    setTimeout(() => { $('loader').hidden = true; }, 800);
  });
})();

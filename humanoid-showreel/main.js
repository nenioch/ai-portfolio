'use strict';
/* =============================================================================
   main.js — renderer, afspeellus en bediening
   ============================================================================= */

(function () {
  const $ = id => document.getElementById(id);
  const canvas = $('scene');
  window.addEventListener('error', e => {
    $('error').hidden = false;
    $('error').textContent = 'Fout: ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')';
  });

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    $('error').hidden = false;
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  ENV.map = makeEnvironment(renderer);

  const cam = new THREE.PerspectiveCamera(36, 1, 0.05, 300);
  const scenes = buildScenes();
  scenes.forEach(s => renderer.compile(s.scene, cam));     // geen hapering bij scènewissel

  const ui = {
    fade: $('fade'), lower: $('lower'), lowerIdx: $('lower-idx'), lowerTitle: $('lower-title'), lowerSub: $('lower-sub'),
    hud: $('hud'), card: $('card'), cardBig: $('card-big'), cardSmall: $('card-small'), cardNote: $('card-note'),
    timeline: $('timeline'), time: $('time'), tc: $('tc'),
  };
  const dir = new Director(scenes, ui);

  // ------------------------------------------------------------ formaat + letterbox
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    const bar = Math.max(0, Math.min((h - w / 2.39) / 2, h * 0.11));
    document.documentElement.style.setProperty('--bar', bar.toFixed(1) + 'px');
  }
  resize();
  window.addEventListener('resize', resize);

  // ------------------------------------------------------------ bediening
  const playBtn = $('play');
  function setPlaying(p) {
    dir.playing = p;
    playBtn.classList.toggle('paused', !p);
    playBtn.setAttribute('aria-label', p ? 'Pauzeren' : 'Afspelen');
    document.body.classList.toggle('is-paused', !p);
  }
  playBtn.addEventListener('click', () => setPlaying(!dir.playing));
  $('prev').addEventListener('click', () => dir.jump(-1));
  $('next').addEventListener('click', () => dir.jump(1));
  canvas.addEventListener('click', () => setPlaying(!dir.playing));
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!dir.playing); }
    else if (e.code === 'ArrowRight') dir.jump(1);
    else if (e.code === 'ArrowLeft') dir.jump(-1);
    else if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('clean');
    wake();
  });

  let idleTimer = 0;
  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (dir.playing) document.body.classList.add('idle'); }, 2500);
  }
  window.addEventListener('pointermove', wake);
  window.addEventListener('pointerdown', wake);
  wake();

  // ?t=23 start op seconde 23, ?paused pauzeert direct (handig om te delen)
  const q = new URLSearchParams(location.search);
  if (q.has('t')) dir.seek(parseFloat(q.get('t')) || 0);
  if (q.has('paused')) setPlaying(false);

  // ------------------------------------------------------------ lus
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (dir.playing) dir.seek(dir.time + dt);

    const scene = dir.frame(cam);
    // subtiele "handheld" camerabeweging
    const T = dir.time;
    cam.rotateX(0.0022 * Math.sin(T * 1.7) + 0.0012 * Math.sin(T * 3.3));
    cam.rotateY(0.0018 * Math.sin(T * 1.3 + 1.0));
    cam.updateProjectionMatrix();

    renderer.render(scene, cam);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

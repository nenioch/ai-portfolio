'use strict';
/* =============================================================================
   main.js — renderer, afspeellus en bediening (zoals humanoid-showreel/main.js)
   ============================================================================= */

(function () {
  const $ = id => document.getElementById(id);
  const canvas = $('scene');
  const fail = msg => { $('loader').hidden = true; $('error').hidden = false; if (msg) $('error').textContent = msg; };

  if (!window.THREE) return fail('three.js kon niet geladen worden. Deze animatie haalt de 3D-bibliotheek van internet; zet de verbinding aan en herlaad de pagina.');
  window.addEventListener('error', e => fail('Fout: ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')'));

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return fail();
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  ENV.map = makeEnvironment(renderer);

  const cam = new THREE.PerspectiveCamera(36, 1, 0.02, 400);

  // teksttexturen gebruiken de webfonts: eerst laden (maximaal 1,2 s wachten)
  const fonts = document.fonts ? Promise.all([
    document.fonts.load('600 64px "JetBrains Mono"'),
    document.fonts.load('700 64px "JetBrains Mono"'),
    document.fonts.load('400 64px "Young Serif"'),
  ]) : Promise.resolve();
  Promise.race([fonts, new Promise(r => setTimeout(r, 1200))]).catch(() => {}).then(start);

  function start() {
    const scenes = [
      sceneEngine(), sceneTuring(), scenePerceptron(), sceneWinter(), sceneChess(),
      sceneDeep(), sceneGo(), sceneTransformer(), sceneDatacenter(), sceneFold(),
      sceneGreenhouse(), sceneFuture(),
    ];
    // Shaders compileren is het traagste deel van het laden. Alleen de eerste
    // scène gebeurt vooraf; de rest daarna één voor één tijdens het afspelen,
    // de eerstvolgende scène eerst. Een eigen camera, zodat het beeld niet verspringt.
    const prepCam = cam.clone(), pending = new Set(scenes.map((_, i) => i));
    function prep(i) {
      if (!pending.delete(i)) return;
      const s = scenes[i];
      s.update(0.01); s.camera(0.01, prepCam);
      renderer.compile(s.scene, prepCam);
    }
    let lastPrep = 0;
    function prepNext(now, cur) {
      if (!pending.size || now - lastPrep < 250) return;
      lastPrep = now;
      const n = scenes.length;
      prep([...pending].sort((a, b) => (a - cur + n) % n - (b - cur + n) % n)[0]);
    }

    const ui = {
      fade: $('fade'), lower: $('lower'), idx: $('lower-idx'), title: $('lower-title'), txt: $('lower-txt'), fact: $('lower-fact'),
      hud: $('hud'), card: $('card'), cardBig: $('card-big'), cardSmall: $('card-small'), cardNote: $('card-note'),
      clock: $('clock'), sceneNo: $('scene-no'), timeline: $('timeline'), time: $('time'),
    };
    const dir = new Director(scenes, ui);
    const orbit = createOrbit(canvas);

    // ---------------------------------------------------------- formaat + letterbox
    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      const bar = Math.max(0, Math.min((h - w / 2.39) / 2, h * 0.08));
      document.documentElement.style.setProperty('--bar', bar.toFixed(1) + 'px');
    }
    resize();
    window.addEventListener('resize', resize);

    // ---------------------------------------------------------- bediening
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
    orbit.onTap = () => setPlaying(!dir.playing);
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
      idleTimer = setTimeout(() => { if (dir.playing) document.body.classList.add('idle'); }, 3000);
    }
    window.addEventListener('pointermove', wake);
    window.addEventListener('pointerdown', wake);
    wake();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);

    // ?t=40 start op seconde 40, ?paused pauzeert direct (handig om te delen)
    const q = new URLSearchParams(location.search);
    if (q.has('t')) dir.seek(parseFloat(q.get('t')) || 0);
    if (q.has('paused')) setPlaying(false);
    const shake = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------------------------------------------------------- lus
    let last = performance.now();
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (dir.playing) dir.seek(dir.time + dt);

      const scene = dir.frame(cam);
      orbit.apply(cam, dt);
      if (cam.aspect < 1) cam.fov = Math.min(cam.fov * 1.45, 70);      // staand scherm: wijder kijken
      if (shake) {                                                        // subtiele "handheld" beweging
        const T = dir.time;
        cam.rotateX(0.0018 * Math.sin(T * 1.7) + 0.001 * Math.sin(T * 3.3));
        cam.rotateY(0.0015 * Math.sin(T * 1.3 + 1.0));
      }
      cam.updateProjectionMatrix();
      renderer.render(scene, cam);
      const cur = dir.locate(dir.time).i;
      pending.delete(cur);                 // renderen heeft deze scène al gecompileerd
      prepNext(now, cur);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(t => {
      last = t;
      loop(t);
      $('loader').classList.add('gone');
      setTimeout(() => { $('loader').hidden = true; }, 800);
    });
  }
})();

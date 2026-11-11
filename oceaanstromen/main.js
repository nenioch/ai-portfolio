'use strict';
/* =============================================================================
   main.js — echte oppervlaktestroming (HYCOM) als stroomlijnen op de NASA Blue Marble.
   • Deeltjes leven in een float-textuur (lengte, breedte, geboorte, snelheid) en worden
     op de GPU met Runge-Kutta (2e orde) door het stromingsveld verplaatst.
   • Elke paar frames wordt hun positie in een geschiedenis-textuur geschreven; daaruit
     tekenen we per deeltje een lijn van HIST stukjes in 3D. Zo blijven de lijnen
     haarscherp op elke zoomstand, net als in NASA's "Perpetual Ocean".
   • Nieuwe deeltjes worden alleen op het zichtbare deel van de bol gezaaid, dus hoe
     verder je inzoomt, hoe dichter de lijnen.
   ============================================================================= */

(function () {
  const $ = id => document.getElementById(id);
  const q = new URLSearchParams(location.search);
  function fail(msg) { const e = $('error'); e.hidden = false; if (msg) e.textContent = msg; }
  window.addEventListener('error', e => fail('Fout: ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')'));
  if (typeof THREE === 'undefined') { fail('three.js kon niet worden geladen. Controleer je internetverbinding.'); return; }

  const PI = Math.PI, D2R = PI / 180, R_EARTH = 6371000;
  const SIZE = [64, 128, 192, 224, 256, 320].includes(+q.get('n')) ? +q.get('n') : 224;   // SIZE² deeltjes
  const N = SIZE * SIZE;
  const HIST = 40;                     // lengte van een spoor in geschiedenis-stappen
  const WRITE_EVERY = 3;               // elke 3e frame een stap in de geschiedenis

  const canvas = $('scene');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { fail(); return; }
  if (!renderer.capabilities.isWebGL2 || !renderer.extensions.get('EXT_color_buffer_float')) { fail(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 1);
  renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(36, 1, 0.01, 100);

  function loadImage(src) { return new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; }); }

  Promise.all([loadImage(OCEAN.png), loadImage(EARTH_JPG)]).then(([fieldImg, earthImg]) => start(fieldImg, earthImg))
    .catch(e => fail('Kon de data niet laden: ' + e));

  function start(fieldImg, earthImg) {
    // ------------------------------------------------------------ stromingsveld
    const cv = document.createElement('canvas'); cv.width = OCEAN.w; cv.height = OCEAN.h;
    const cx = cv.getContext('2d'); cx.drawImage(fieldImg, 0, 0);
    const field = cx.getImageData(0, 0, OCEAN.w, OCEAN.h).data;      // rij 0 = noord
    const fieldTex = new THREE.DataTexture(new Uint8Array(field.buffer.slice(0)), OCEAN.w, OCEAN.h, THREE.RGBAFormat, THREE.UnsignedByteType);
    fieldTex.minFilter = fieldTex.magFilter = THREE.LinearFilter; fieldTex.generateMipmaps = false;
    fieldTex.wrapS = THREE.RepeatWrapping; fieldTex.wrapT = THREE.ClampToEdgeWrapping; fieldTex.needsUpdate = true;
    const dlat = (OCEAN.lat1 - OCEAN.lat0) / (OCEAN.h - 1);
    const dec = b => { const s = (b - 128) / 127; return Math.sign(s) * s * s * OCEAN.max; };
    function oceanAt(lonDeg, latDeg) {                                 // voor de uitlezing (dichtstbijzijnde rasterpunt)
      if (latDeg > OCEAN.lat1 || latDeg < OCEAN.lat0) return null;
      const i = ((Math.round((lonDeg - OCEAN.lon0) / OCEAN.dlon) % OCEAN.w) + OCEAN.w) % OCEAN.w;
      const j = Math.round((OCEAN.lat1 - latDeg) / dlat);
      const o = (j * OCEAN.w + i) * 4;
      if (field[o + 2] < 128) return null;
      return [dec(field[o]), dec(field[o + 1])];
    }

    // ------------------------------------------------------------ aarde
    const earthTex = new THREE.Texture(earthImg);
    earthTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    earthTex.needsUpdate = true;
    const globeMat = new THREE.ShaderMaterial({
      uniforms: { tEarth: { value: earthTex }, tField: { value: fieldTex }, uLight: { value: new THREE.Vector3(0, 0, 1) } },
      vertexShader: `
        varying vec3 vN, vView;
        void main(){ vN = normalize(position); vView = normalize(cameraPosition - position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tEarth, tField; uniform vec3 uLight;
        varying vec3 vN, vView;
        const float PI = 3.14159265;
        void main(){
          vec3 n = normalize(vN);
          vec2 uv = vec2(atan(n.x, n.z) / (2.0 * PI) + 0.5, asin(clamp(n.y, -1.0, 1.0)) / PI + 0.5);
          vec3 c = pow(texture2D(tEarth, uv).rgb, vec3(2.2));     // sRGB-plaatje naar lineair
          // in lineaire ruimte: iets meer verzadiging en contrast, zoals de NASA-render
          // de oceaan van de Blue Marble is erg donker: optillen naar het heldere blauw van de NASA-film
          float lonD = degrees(atan(n.x, n.z)), latD = degrees(asin(clamp(n.y, -1.0, 1.0)));
          float sea = texture2D(tField, vec2(((lonD - (${OCEAN.lon0.toFixed(4)})) / ${OCEAN.dlon.toFixed(6)} + 0.5) / ${OCEAN.w}.0, ((${OCEAN.lat1.toFixed(4)} - latD) / ${dlat.toFixed(6)} + 0.5) / ${OCEAN.h}.0)).b;
          sea *= step(abs(latD), 79.5);
          c = mix(c, c * 1.75 + vec3(0.0, 0.008, 0.045), sea * (1.0 - smoothstep(0.08, 0.3, c.b) * 0.45));
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = mix(vec3(l), c, 1.15 - 0.2 * sea);
          float lam = clamp(dot(n, normalize(uLight)), 0.0, 1.0);
          c *= 0.55 + 0.75 * lam;
          float fr = pow(1.0 - clamp(dot(n, normalize(vView)), 0.0, 1.0), 3.0);
          c = mix(c, vec3(0.25, 0.5, 1.0) * 0.55, fr * 0.65);
          gl_FragColor = vec4(c, 1.0);
          #include <encodings_fragment>
        }`,
    });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120), globeMat);
    scene.add(globe);
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.035, 96, 64), new THREE.ShaderMaterial({
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vN; void main(){ float i = pow(max(0.0, 0.66 - dot(vN, vec3(0.0, 0.0, 1.0))), 3.2); gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * i * 1.6; }',
      side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    }));
    scene.add(atmo);
    { // sterren
      const n = 2400, p = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const r = 50, th = Math.random() * 2 * PI, ph = Math.acos(2 * Math.random() - 1); p[i * 3] = r * Math.sin(ph) * Math.cos(th); p[i * 3 + 1] = r * Math.cos(ph); p[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xc8d6ff, size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0.6 })));
    }

    // ------------------------------------------------------------ GPGPU: deeltjes
    const simCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    const simScene = new THREE.Scene(); simScene.add(quad);
    const SIM_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
    const rtOpts = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, type: THREE.FloatType, depthBuffer: false, stencilBuffer: false };
    const pos = [new THREE.WebGLRenderTarget(SIZE, SIZE, rtOpts), new THREE.WebGLRenderTarget(SIZE, SIZE, rtOpts)];
    const hist = new THREE.WebGLRenderTarget(SIZE * HIST, SIZE, rtOpts);
    let cur = 0, writes = 0, frameNo = 0;

    const COMMON = `
      const float PI = 3.14159265;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float lifeOf(vec2 uv, float birth){ return 50.0 + 100.0 * hash(uv * 7.13 + fract(birth * 0.0137)); }
      vec3 toXYZ(vec2 ll){ float c = cos(ll.y); return vec3(c * sin(ll.x), sin(ll.y), c * cos(ll.x)); }`;

    const simMat = new THREE.ShaderMaterial({
      uniforms: {
        tPos: { value: null }, tField: { value: fieldTex }, uFS: { value: new THREE.Vector2(OCEAN.w, OCEAN.h) },
        uDt: { value: 0.016 }, uK: { value: 1e5 }, uW: { value: 0 }, uSeed: { value: 0 }, uCapCos: { value: 0 }, uCamDir: { value: new THREE.Vector3(0, 0, 1) },
        uLat0: { value: OCEAN.lat0 }, uLat1: { value: OCEAN.lat1 }, uLon0: { value: OCEAN.lon0 }, uDlon: { value: OCEAN.dlon }, uDlat: { value: dlat }, uMax: { value: OCEAN.max },
      },
      vertexShader: SIM_VERT,
      fragmentShader: `
        precision highp float;
        uniform sampler2D tPos, tField;
        uniform vec2 uFS;
        uniform float uDt, uK, uW, uSeed, uCapCos, uLat0, uLat1, uLon0, uDlon, uDlat, uMax;
        uniform vec3 uCamDir;
        varying vec2 vUv;
        ${COMMON}
        vec3 fieldAt(vec2 ll){
          float lonD = degrees(ll.x), latD = degrees(ll.y);
          vec2 t = vec2(((lonD - uLon0) / uDlon + 0.5) / uFS.x, ((uLat1 - latD) / uDlat + 0.5) / uFS.y);
          vec4 f = texture2D(tField, t);
          vec2 s = (f.rg * 255.0 - 128.0) / 127.0;
          float m = (latD > uLat1 - 0.2 || latD < uLat0 + 0.2) ? 0.0 : f.b;
          return vec3(sign(s) * s * s * uMax, m);
        }
        vec2 rate(vec2 ll){ vec3 f = fieldAt(ll); return vec2(f.x / max(cos(ll.y), 0.05), f.y) * (uK / 6371000.0); }
        void main(){
          vec4 P = texture2D(tPos, vUv);
          vec2 ll = P.xy; float birth = P.z;
          // Runge-Kutta 2: halve stap vooruit, dan met die snelheid de hele stap
          vec2 k1 = rate(ll);
          vec2 k2 = rate(ll + k1 * uDt * 0.5);
          ll += k2 * uDt;
          if (ll.x > PI) ll.x -= 2.0 * PI; if (ll.x < -PI) ll.x += 2.0 * PI;
          vec3 f = fieldAt(ll);
          bool dead = (uW - birth) > lifeOf(vUv, birth) || f.z < 0.5 || dot(toXYZ(ll), uCamDir) < uCapCos - 0.03 || birth < 0.0;
          if (dead) {
            // opnieuw zaaien, gelijkmatig verdeeld over het zichtbare deel van de bol, alleen op zee
            vec3 n = uCamDir;
            vec3 t = normalize(cross(abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), n));
            vec3 b = cross(n, t);
            for (int i = 0; i < 14; i++) {
              vec2 r = vec2(hash(vUv * 91.7 + uSeed + float(i) * 1.37), hash(vUv.yx * 53.3 + uSeed * 1.7 + float(i) * 2.11));
              float cz = mix(uCapCos, 1.0, r.x), sz = sqrt(max(0.0, 1.0 - cz * cz)), a = 2.0 * PI * r.y;
              vec3 p = n * cz + (t * cos(a) + b * sin(a)) * sz;
              ll = vec2(atan(p.x, p.z), asin(clamp(p.y, -1.0, 1.0)));
              f = fieldAt(ll);
              if (f.z > 0.6) break;
            }
            birth = f.z > 0.6 ? uW : -1.0;                 // -1: geen plek gevonden, volgende frame opnieuw
          }
          gl_FragColor = vec4(ll, birth, length(f.xy));
        }`,
      depthTest: false, depthWrite: false,
    });
    const copyMat = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null } }, vertexShader: SIM_VERT,
      fragmentShader: 'precision highp float; uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tSrc, vUv); }',
      depthTest: false, depthWrite: false,
    });
    function runPass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(simScene, simCam); renderer.setRenderTarget(null); }
    { // alle deeltjes beginnen "dood", zodat ze meteen op zee worden gezaaid
      const init = new Float32Array(N * 4); for (let i = 0; i < N; i++) init[i * 4 + 2] = -1;
      const t = new THREE.DataTexture(init, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType); t.needsUpdate = true;
      copyMat.uniforms.tSrc.value = t; runPass(copyMat, pos[0]); runPass(copyMat, pos[1]); t.dispose();
    }
    function writeHistory() {
      const slot = writes % HIST;
      hist.viewport.set(slot * SIZE, 0, SIZE, SIZE); hist.scissor.set(slot * SIZE, 0, SIZE, SIZE); hist.scissorTest = true;
      copyMat.uniforms.tSrc.value = pos[cur].texture;
      runPass(copyMat, hist);
      writes++;
    }

    // ------------------------------------------------------------ stroomlijnen
    const lineGeo = new THREE.InstancedBufferGeometry();
    {
      const nv = HIST * 2, k = new Float32Array(nv), e = new Float32Array(nv);
      for (let s = 0; s < HIST; s++) { k[s * 2] = s; k[s * 2 + 1] = s; e[s * 2] = 0; e[s * 2 + 1] = 1; }
      lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
      lineGeo.setAttribute('aK', new THREE.BufferAttribute(k, 1));
      lineGeo.setAttribute('aE', new THREE.BufferAttribute(e, 1));
      const ref = new Float32Array(N * 2);
      for (let i = 0; i < N; i++) { ref[i * 2] = ((i % SIZE) + 0.5) / SIZE; ref[i * 2 + 1] = (Math.floor(i / SIZE) + 0.5) / SIZE; }
      // willekeurige volgorde, zodat het verlagen van instanceCount (bij een trage GPU) gelijkmatig dunner maakt
      for (let i = N - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const a = ref[i * 2], b = ref[i * 2 + 1]; ref[i * 2] = ref[j * 2]; ref[i * 2 + 1] = ref[j * 2 + 1]; ref[j * 2] = a; ref[j * 2 + 1] = b; }
      lineGeo.setAttribute('aRef', new THREE.InstancedBufferAttribute(ref, 2));
      lineGeo.instanceCount = N;
    }
    const lineMat = new THREE.ShaderMaterial({
      uniforms: { tPos: { value: null }, tHist: { value: hist.texture }, uSize: { value: SIZE }, uHist: { value: HIST }, uW: { value: 0 }, uAlpha: { value: 0.75 }, uRad: { value: 1.0015 } },
      vertexShader: `
        attribute vec2 aRef; attribute float aK, aE;
        uniform sampler2D tPos, tHist;
        uniform float uSize, uHist, uW, uAlpha, uRad;
        varying float vA, vS;
        ${COMMON}
        void main(){
          ivec2 ip = ivec2(aRef * uSize);
          vec4 P0 = texelFetch(tPos, ip, 0);
          float birth = P0.z, avail = uW - birth;
          float j = aK + aE;
          vec4 P = P0;
          if (j > 0.5) { int slot = int(mod(uW - j, uHist)); P = texelFetch(tHist, ivec2(slot * int(uSize) + ip.x, ip.y), 0); }
          bool valid = birth >= 0.0 && (aK + 1.0) <= avail;
          float life = lifeOf(aRef, birth);
          float fade = smoothstep(0.0, 8.0, avail) * smoothstep(life, life - 25.0, avail);
          float tail = pow(1.0 - j / uHist, 1.3);
          float sp = P.w;
          vA = valid ? uAlpha * fade * tail * clamp((sp - 0.04) * 1.7, 0.04, 1.0) : 0.0;
          vS = sp;
          vec3 p = toXYZ(valid ? P.xy : P0.xy) * uRad;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        precision mediump float;
        varying float vA, vS;
        void main(){ gl_FragColor = vec4(mix(vec3(0.72, 0.85, 1.0), vec3(1.0), clamp(vS * 2.0, 0.0, 1.0)), vA); }`,
      transparent: true, depthTest: true, depthWrite: false, blending: THREE.NormalBlending,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    lines.frustumCulled = false;
    lines.renderOrder = 2;
    scene.add(lines);

    // ------------------------------------------------------------ camera
    const view = { lon: -55 * D2R, lat: 28 * D2R, dist: 3.0 }, goal = { lon: view.lon, lat: view.lat, dist: view.dist };
    if (q.get('lon')) goal.lon = view.lon = parseFloat(q.get('lon')) * D2R;
    if (q.get('lat')) goal.lat = view.lat = parseFloat(q.get('lat')) * D2R;
    if (q.get('dist')) goal.dist = view.dist = parseFloat(q.get('dist'));
    const camDir = new THREE.Vector3();
    function placeCamera() {
      const cl = Math.cos(view.lat);
      camDir.set(Math.sin(view.lon) * cl, Math.sin(view.lat), Math.cos(view.lon) * cl);
      cam.position.copy(camDir).multiplyScalar(view.dist);
      cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
    }
    const angDiff = (a, b) => { let d = (b - a) % (2 * PI); if (d > PI) d -= 2 * PI; if (d < -PI) d += 2 * PI; return d; };
    // hoek (vanuit het middelpunt van de aarde) van het zichtbare deel: horizon of beeldrand, wat het eerst komt
    function visibleCapCos() {
      const d = view.dist, horizon = Math.acos(1 / d);
      const beta = Math.atan(Math.tan(cam.fov * D2R / 2) * Math.sqrt(1 + cam.aspect * cam.aspect));
      const s = d * Math.sin(beta);
      const theta = s < 1 ? Math.asin(s) - beta : horizon;
      return Math.cos(Math.min(horizon, theta) * 1.04);
    }

    // ------------------------------------------------------------ plekken en rondleiding
    const PLACES = [
      { id: 'golf', label: 'Golfstroom', lon: -72, lat: 31, dist: 1.75, title: 'De Golfstroom', sub: 'Warm water uit de Golf van Mexico schiet langs Florida naar het noorden en slingert dan de Atlantische Oceaan op. Afgesnoerde lussen worden wervels van honderd kilometer breed.' },
      { id: 'kuro', label: 'Kuroshio', lon: 146, lat: 33, dist: 1.85, title: 'De Kuroshio', sub: 'Japans tegenhanger van de Golfstroom: een snelle, warme stroom langs de kust die bij Tokio de Stille Oceaan op buigt en daar uiteenvalt in wervels.' },
      { id: 'agul', label: 'Agulhas', lon: 26, lat: -37, dist: 1.8, title: 'De Agulhasstroom', sub: 'Langs Zuid-Afrika stroomt de Agulhas naar het zuiden en keert bij de Kaap abrupt om. Losgeraakte ringen brengen warm water uit de Indische Oceaan naar de Atlantische.' },
      { id: 'equ', label: 'Evenaar', lon: -125, lat: 2, dist: 2.1, title: 'Langs de evenaar', sub: 'Passaatwinden duwen het water naar het westen. Daartussen loopt een tegenstroom naar het oosten, en golven van duizend kilometer lang trekken door het patroon.' },
      { id: 'acc', label: 'Antarctica', lon: -62, lat: -57, dist: 2.0, title: 'De Antarctische Circumpolaire Stroom', sub: 'De grootste stroom op aarde verplaatst ruim honderd keer zoveel water als alle rivieren samen en wordt alleen in de Straat Drake ingesnoerd.' },
      { id: 'som', label: 'Somalië', lon: 55, lat: 7, dist: 1.9, title: 'De Somalische stroom', sub: 'In de Indische Oceaan draait de stroming mee met de moesson. In maart, de datum van deze data, is hij rustig. In de zomer wordt hij een van de snelste ter wereld.' },
      { id: 'all', label: 'Overzicht', lon: -30, lat: 18, dist: 3.1, title: 'De oceaan in beweging', sub: 'De echte oppervlaktestroming van alle oceanen op 10 maart 2017. Sleep om te draaien en zoom in: hoe dichterbij, hoe meer stroomlijnen.' },
    ];
    let tourOn = q.get('tour') !== '0', tourIdx = 0, tourT = 0, idleT = 0;
    const ui = { title: $('title'), h: $('title-h'), p: $('title-p'), idx: $('title-idx') };
    let titleTimer = 0;
    function showPlace(i) {
      const P = PLACES[i];
      goal.lon = P.lon * D2R; goal.lat = P.lat * D2R; goal.dist = P.dist;
      document.querySelectorAll('#places button').forEach((b, k) => b.classList.toggle('on', k === i));
      ui.title.classList.add('swap'); clearTimeout(titleTimer);
      titleTimer = setTimeout(() => { ui.idx.textContent = 'OCEAANSTROMEN · ' + P.label.toUpperCase(); ui.h.textContent = P.title; ui.p.textContent = P.sub; ui.title.classList.remove('swap'); }, 350);
    }
    function setTour(v) { tourOn = v; $('tour').classList.toggle('on', v); if (v) { tourIdx = (tourIdx + 1) % PLACES.length; tourT = 0; showPlace(tourIdx); } }
    PLACES.forEach((P, i) => {
      const b = document.createElement('button'); b.textContent = P.label;
      b.addEventListener('click', () => { tourOn = false; $('tour').classList.remove('on'); tourIdx = i; showPlace(i); });
      $('places').appendChild(b);
    });
    $('tour').addEventListener('click', () => setTour(!tourOn));
    let speedK = 1;
    $('speed').addEventListener('input', e => { speedK = e.target.value / 100; });

    // ------------------------------------------------------------ bediening
    const stopTour = () => { if (tourOn) { tourOn = false; $('tour').classList.remove('on'); } document.querySelectorAll('#places button').forEach(b => b.classList.remove('on')); };
    let dragging = false, lx = 0, ly = 0, moved = 0, vLon = 0, vLat = 0;
    canvas.addEventListener('pointerdown', e => { dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; vLon = vLat = 0; canvas.setPointerCapture(e.pointerId); wake(); });
    canvas.addEventListener('pointermove', e => {
      wake();
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 5) {
        stopTour();
        const k = 0.0035 * (view.dist - 0.95) / 2;
        view.lon -= dx * k; view.lat = Math.max(-1.4, Math.min(1.4, view.lat + dy * k));
        goal.lon = view.lon; goal.lat = view.lat; vLon = -dx * k; vLat = dy * k;
      }
    });
    canvas.addEventListener('pointerup', e => { dragging = false; if (moved <= 5) pick(e.clientX, e.clientY); });
    canvas.addEventListener('wheel', e => { e.preventDefault(); stopTour(); goal.dist = Math.max(1.12, Math.min(5, 1 + (goal.dist - 1) * (1 + e.deltaY * 0.0015))); wake(); }, { passive: false });
    window.addEventListener('keydown', e => {
      if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('clean');
      else if (e.key === 't' || e.key === 'T') setTour(!tourOn);
      wake();
    });
    let idleTimer = 0;
    function wake() { idleT = 0; document.body.classList.remove('idle'); clearTimeout(idleTimer); idleTimer = setTimeout(() => document.body.classList.add('idle'), 4000); }
    wake();

    let picked = null;
    const rayV = new THREE.Vector3();
    const compass = ['noorden', 'noordoosten', 'oosten', 'zuidoosten', 'zuiden', 'zuidwesten', 'westen', 'noordwesten'];
    function pick(px, py) {
      const r = canvas.getBoundingClientRect();
      rayV.set(((px - r.left) / r.width) * 2 - 1, -(((py - r.top) / r.height) * 2 - 1), 0.5).unproject(cam).sub(cam.position).normalize();
      const b = cam.position.dot(rayV), c = cam.position.lengthSq() - 1, disc = b * b - c;
      if (disc < 0) { picked = null; $('readout').classList.remove('show'); $('marker').style.display = 'none'; return; }
      const p = cam.position.clone().addScaledVector(rayV, -b - Math.sqrt(disc));
      const lon = Math.atan2(p.x, p.z) / D2R, lat = Math.asin(Math.max(-1, Math.min(1, p.y))) / D2R;
      picked = { p };
      const o = oceanAt(lon, lat);
      let html = '<div class="t">' + Math.abs(lat).toFixed(1).replace('.', ',') + '°' + (lat >= 0 ? 'N' : 'Z') + ' · ' + Math.abs(lon).toFixed(1).replace('.', ',') + '°' + (lon >= 0 ? 'O' : 'W') + '</div>';
      if (!o) html += 'Land of buiten het modelgebied';
      else {
        const s = Math.hypot(o[0], o[1]), to = ((Math.atan2(o[0], o[1]) / D2R) + 360) % 360;
        html += 'Stroming <b>' + s.toFixed(2).replace('.', ',') + ' m/s</b> (' + (s * 3.6).toFixed(1).replace('.', ',') + ' km/u)<br>richting het ' + compass[Math.round(to / 45) % 8];
        html += '<br>Dat is ' + Math.round(s * 86.4) + ' km per dag';
      }
      $('readout').innerHTML = html; $('readout').classList.add('show');
    }

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.fov = w / h < 1 ? Math.min(70, 36 / Math.max(0.5, w / h)) : 36;
      cam.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    // ------------------------------------------------------------ lus
    $('count').textContent = N.toLocaleString('nl-NL');
    let last = performance.now(), frames = 0, fpsT = 0, slow = 0;

    function step(dt) {
      // snelheid op het scherm ongeveer gelijk houden: dichterbij = trager in kilometers
      const zoomK = Math.max(0.06, Math.min(1.2, (view.dist - 1) / 1.6));
      simMat.uniforms.uK.value = 4.2e5 * zoomK * speedK;
      simMat.uniforms.uDt.value = dt;
      simMat.uniforms.uW.value = writes;
      simMat.uniforms.uSeed.value = (frameNo * 0.6180339) % 1 * 97.0;
      simMat.uniforms.uCamDir.value.copy(camDir);
      simMat.uniforms.uCapCos.value = visibleCapCos();
      simMat.uniforms.tPos.value = pos[cur].texture;
      runPass(simMat, pos[1 - cur]); cur = 1 - cur;
      if (frameNo % WRITE_EVERY === 0) writeHistory();
      frameNo++;
    }

    placeCamera();
    if (tourOn) showPlace(0); else showPlace(PLACES.length - 1);
    if (!tourOn) { $('tour').classList.remove('on'); }
    if (q.get('place')) { const k = PLACES.findIndex(p => p.id === q.get('place')); if (k >= 0) { tourIdx = k; showPlace(k); view.lon = goal.lon; view.lat = goal.lat; view.dist = goal.dist; placeCamera(); } }
    // opwarmen: sporen meteen gevuld
    const warm = q.get('warm') !== null ? parseFloat(q.get('warm')) : 2.5;
    for (let t = 0; t < warm; t += 1 / 60) step(1 / 60);
    $('loading').classList.add('done');

    function frame(now) {
      const real = Math.min(0.05, (now - last) / 1000); last = now;
      idleT += real;

      if (tourOn) { tourT += real; if (tourT > 15) { tourT = 0; tourIdx = (tourIdx + 1) % PLACES.length; showPlace(tourIdx); } }
      else if (!dragging && idleT > 10) goal.lon += real * 0.02;
      if (!dragging) {
        if (Math.abs(vLon) > 1e-5 || Math.abs(vLat) > 1e-5) {
          view.lon += vLon; view.lat = Math.max(-1.4, Math.min(1.4, view.lat + vLat)); vLon *= 0.92; vLat *= 0.92;
          goal.lon = view.lon; goal.lat = view.lat;
        }
        const k = 1 - Math.exp(-real * (tourOn ? 0.8 : 3));
        view.lon += angDiff(view.lon, goal.lon) * k; view.lat += (goal.lat - view.lat) * k;
      }
      view.dist += (goal.dist - view.dist) * (1 - Math.exp(-real * (tourOn ? 0.8 : 3)));
      placeCamera();
      globeMat.uniforms.uLight.value.copy(camDir).add(new THREE.Vector3(-0.3, 0.5, 0).applyQuaternion(cam.quaternion)).normalize();

      step(Math.min(real, 1 / 30));
      lineMat.uniforms.tPos.value = pos[cur].texture;
      lineMat.uniforms.uW.value = writes;
      lineMat.uniforms.uAlpha.value = 0.55 + 0.35 * Math.min(1, Math.max(0, (2.6 - view.dist) / 1.2));

      if (picked) {
        const p = picked.p.clone().project(cam);
        if (picked.p.dot(cam.position) > 1.0) { $('marker').style.display = 'block'; $('marker').style.transform = 'translate(' + ((p.x * 0.5 + 0.5) * window.innerWidth).toFixed(1) + 'px,' + ((-p.y * 0.5 + 0.5) * window.innerHeight).toFixed(1) + 'px)'; }
        else $('marker').style.display = 'none';
      }

      renderer.setRenderTarget(null);
      renderer.render(scene, cam);

      frames++; fpsT += real;
      if (fpsT > 0.5) {
        const fps = frames / fpsT; $('fps').textContent = Math.round(fps); frames = 0; fpsT = 0;
        // trage GPU: minder lijnen tekenen (de volgorde is willekeurig, dus het wordt gelijkmatig dunner)
        if (fps < 34) { if (++slow >= 3 && lineGeo.instanceCount > N / 8) { lineGeo.instanceCount = Math.floor(lineGeo.instanceCount * 0.8); slow = 0; $('count').textContent = lineGeo.instanceCount.toLocaleString('nl-NL'); } }
        else slow = 0;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(t => { last = t; frame(t); });
  }
})();

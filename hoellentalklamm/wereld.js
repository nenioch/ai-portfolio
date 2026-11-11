'use strict';
/* =============================================================================
   wereld.js — renderer, hemel en licht door de ochtend (zoals oermens-dag/
   wereld.js), en de Höllentalklamm zelf: kloofwanden, de Hammersbach met
   watervallen, het pad met leuning, tunnels, de brug, twee hutten en de
   bergen van het Wettersteingebergte.

   Alles hangt aan één as (KL): s = meters stroomopwaarts langs de kloof,
   u = meters opzij (+ = linkerhand als je stroomopwaarts loopt), y = hoogte.
   Het dal is ingekort en de hoogtes zijn schematisch, niet op schaal.
   ============================================================================= */

const KL = (() => {
  const ctrl = [[0, 80], [0, 20], [0, -40], [1, -100], [3, -140], [-2, -185], [3, -230], [-2, -275], [1, -320], [0, -370], [0, -440], [0, -560], [0, -800], [0, -1100], [0, -1350]];
  const curve = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  curve.arcLengthDivisions = 2000;
  const L = curve.getLength(), N = Math.round(L * 2), ds = L / N;
  const pts = curve.getSpacedPoints(N);

  // vorm langs de as: s, breedte, wandhoogte, helling (m opzij per m omhoog), ruwheid
  const SHAPE = [
    [0, 40, 30, 1.3, 0.6], [150, 34, 35, 1.2, 0.6], [185, 9, 55, 0.05, 1.4], [215, 6, 70, 0, 1.5],
    [280, 5.2, 85, 0.01, 1.5], [300, 5.6, 85, 0.01, 1.5], [340, 7, 80, 0.02, 1.5], [395, 8, 70, 0.05, 1.4],
    [430, 44, 55, 0.9, 3], [700, 76, 60, 1.0, 3.5], [900, 120, 90, 1.0, 4], [1450, 160, 120, 1.0, 4],
  ];
  // waterspiegel; de sprongen bij 286 en 370 zijn watervallen. Na de hut
  // (s ≈ 530) loopt het dal op naar de gletsjer.
  const WATER = [[0, 0], [180, 12], [200, 14], [240, 17], [286, 19.5], [289, 23.5], [330, 26], [370, 28], [373, 31], [420, 34], [700, 58], [900, 100], [1450, 200]];
  const BRUG = [335, 343];
  const TUNNELS = [[208, 238], [252, 264], [305, 318], [380, 392]];

  function keyed(keys, s, col, ease) {
    if (s <= keys[0][0]) return keys[0][col];
    for (let i = 0; i < keys.length - 1; i++) {
      const a = keys[i], b = keys[i + 1];
      if (s < b[0]) { const k = (s - a[0]) / (b[0] - a[0]); return lerp(a[col], b[col], ease ? smooth(k) : k); }
    }
    return keys[keys.length - 1][col];
  }

  const arr = () => new Float32Array(N + 1);
  const CX = arr(), CZ = arr(), TX = arr(), TZ = arr(), NX = arr(), NZ = arr();
  const Wd = arr(), H = arr(), SL = arr(), AMP = arr(), WW = arr(), WAT = arr(), K = arr(), PU = arr(), PY = arr();
  for (let i = 0; i <= N; i++) {
    const s = i * ds, p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    let tx = b.x - a.x, tz = b.z - a.z; const l = Math.hypot(tx, tz); tx /= l; tz /= l;
    CX[i] = p.x; CZ[i] = p.z; TX[i] = tx; TZ[i] = tz; NX[i] = tz; NZ[i] = -tx;
    Wd[i] = keyed(SHAPE, s, 1, true); H[i] = keyed(SHAPE, s, 2, true); SL[i] = keyed(SHAPE, s, 3, true); AMP[i] = keyed(SHAPE, s, 4, true);
    WAT[i] = keyed(WATER, s, 1, false);
    K[i] = smoothstep(14, 8, Wd[i]);
    WW[i] = Math.min(Wd[i] / 2, lerp(3, Wd[i] / 2, K[i]));
  }
  // pad: richel boven het water, die de watervallen glad volgt
  const R = 24;
  for (let i = 0; i <= N; i++) {
    let sum = 0, n = 0;
    for (let j = Math.max(0, i - R); j <= Math.min(N, i + R); j++) { sum += WAT[j]; n++; }
    const s = i * ds, side = s < BRUG[0] ? -1 : 1;
    PU[i] = side * Math.min(lerp(WW[i] + 3, Wd[i] / 2 - 0.7, K[i]), Wd[i] / 2 - 0.7);
    PY[i] = Math.max(sum / n + 0.8 + 2.6 * K[i], WAT[i] + 0.8 + 1.8 * K[i]) + 0.03;
  }
  // over de brug: rechte lijn van wand naar wand
  const i0 = Math.round(BRUG[0] / ds), i1 = Math.round(BRUG[1] / ds);
  const u0 = -Math.abs(PU[i0]), u1 = Math.abs(PU[i1]), y0 = PY[i0], y1 = PY[i1];
  for (let i = i0; i <= i1; i++) { const f = (i - i0) / (i1 - i0); PU[i] = lerp(u0, u1, f); PY[i] = lerp(y0, y1, f); }

  function samp(a, s) {
    const f = s / ds;
    if (f <= 0) return a[0];
    if (f >= N) return a[N];
    const i = f | 0;
    return a[i] + (a[i + 1] - a[i]) * (f - i);
  }
  function world(s, u, y, out = V()) {
    return out.set(samp(CX, s) + samp(NX, s) * u, y, samp(CZ, s) + samp(NZ, s) * u);
  }
  // afstand van de as tot de wand aan kant side (±1) op hoogte h boven het water
  function wallU(side, s, h) {
    const lh = samp(PY, s) - samp(WAT, s);
    const n = fbm(s * 0.06 + side * 37, h * 0.08 + side * 11, 3);
    const lo = Math.max(0, n - 0.35) * 2, hi = (n - 0.42) * 1.6;     // laag alleen naar buiten, hoger mag iets overhangen
    const w2 = samp(Wd, s) / 2;
    return Math.max(w2 * 0.7, w2 + samp(SL, s) * Math.max(0, h) + samp(AMP, s) * lerp(lo, hi, smoothstep(lh + 2.6, lh + 6, h)));
  }
  function groundY(s, u) {
    const ww = samp(WW, s), a = Math.abs(u);
    return samp(WAT, s) + lerp(-0.35, 0.8, smoothstep(ww, ww + 1.2, a));
  }
  function pathAt(s, out = V()) { return world(s, samp(PU, s), samp(PY, s), out); }
  const _a = V(), _b = V();
  function pathYaw(s) {
    pathAt(s - 0.6, _a); pathAt(s + 0.6, _b);
    return Math.atan2(_b.x - _a.x, _b.z - _a.z);
  }
  // richting (als camera-th) vanaf het pad: naar het midden van de kloof gedraaid
  // over ang (0 = opzij, +π/2 = achter de wandelaar, −π/2 = ervoor)
  function dirTh(s, ang) {
    const g = -Math.sign(samp(PU, s)) || 1, nx = samp(NX, s) * g, nz = samp(NZ, s) * g, tx = samp(TX, s), tz = samp(TZ, s);
    const c = Math.cos(ang), si = Math.sin(ang);
    return Math.atan2(nx * c - tx * si, nz * c - tz * si);
  }
  function nearestS(x, z) {
    let best = 1e9, bi = 0;
    for (let i = 0; i <= N; i++) { const dx = x - CX[i], dz = z - CZ[i], d = dx * dx + dz * dz; if (d < best) { best = d; bi = i; } }
    return bi * ds;
  }
  // camera binnen de wanden en boven het water houden
  function keep(p) {
    const s = nearestS(p.x, p.z);
    const cx = samp(CX, s), cz = samp(CZ, s), nx = samp(NX, s), nz = samp(NZ, s), tx = samp(TX, s), tz = samp(TZ, s);
    let u = (p.x - cx) * nx + (p.z - cz) * nz;
    const v = (p.x - cx) * tx + (p.z - cz) * tz, wat = samp(WAT, s);
    if (p.y < wat + 1.3) p.y = wat + 1.3;
    const h = p.y - wat;
    if (h < samp(H, s) + 3) u = clamp(u, -(wallU(-1, s, h) - 0.6), wallU(1, s, h) - 0.6);
    p.x = cx + nx * u + tx * v; p.z = cz + nz * u + tz * v;
  }
  return {
    L, N, ds, CX, CZ, TX, TZ, NX, NZ, W: Wd, H, SL, WW, WAT, K, PU, PY, BRUG, TUNNELS,
    samp, world, wallU, groundY, pathAt, pathYaw, dirTh, nearestS, keep,
    inward: s => -Math.sign(samp(PU, s)) || 1,
  };
})();

function createWereld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xdfeaf0, 150, 3000);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 6000);
  const { samp, world } = KL;

  // ------------------------------------------------------------------ hemel
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() },
      uSun: { value: V(0, 1, 0) }, uSunCol: { value: new THREE.Color() },
    },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSun; uniform vec3 uSunCol; varying vec3 vD;',
      'void main(){',
      '  float h = clamp(vD.y, 0.0, 1.0);',
      '  vec3 c = mix(uHor, uTop, pow(h, 0.5));',
      '  float s = max(dot(normalize(vD), normalize(uSun)), 0.0);',
      '  c += uSunCol * (pow(s, 900.0) * 1.6 + pow(s, 14.0) * 0.25 + pow(s, 3.0) * 0.08 * (1.0 - h));',
      '  gl_FragColor = vec4(c, 1.0);',
      '}',
    ].join('\n'),
  }));
  sky.renderOrder = -10;

  const clouds = (() => {
    const g = new THREE.Group(), r = rng(404);
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.9, fog: false });
    const bol = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 14; i++) {
      const a = r() * TAU, d = 300 + r() * 350, w = new THREE.Group(), n = 4 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) {
        const b = new THREE.Mesh(bol, m), s = 14 + r() * 16;
        b.scale.set(s * 1.4, s * 0.5, s); b.position.set((k - n / 2) * 15 + r() * 6, r() * 5, r() * 10 - 5); w.add(b);
      }
      w.position.set(Math.cos(a) * d, 260 + r() * 120, Math.sin(a) * d); w.rotation.y = r() * Math.PI;
      g.add(w);
    }
    return g;
  })();
  scene.add(sky, clouds);

  // ------------------------------------------------------------------ licht
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 480 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  const hemi = new THREE.HemisphereLight(0xcfe3f5, 0x5d5a4c, 0.55);
  scene.add(sun, sun.target, hemi);

  // ------------------------------------------------------------------ helpers
  // rasterlint langs de as: cols × rows hoekpunten, fill(i, j, pos, col) vult één punt
  function strip(cols, rows, fill) {
    const pos = new Float32Array(cols * rows * 3), col = new Float32Array(cols * rows * 3), idx = [];
    const p = V(), c = new THREE.Color();
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      fill(i, j, p, c);
      pos.set([p.x, p.y, p.z], (i * rows + j) * 3);
      col.set([c.r, c.g, c.b], (i * rows + j) * 3);
    }
    for (let i = 0; i < cols - 1; i++) for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j, b = a + rows;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  function labelTex(text, w, h, bg, fg, font) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    return t;
  }

  // ------------------------------------------------------------------ wanden
  const cWet = C(0x3d403d), cRock = C(0x8b887f), cLight = C(0xb6b1a6), cMoss = C(0x4d6233), cGrass = C(0x667342), cForest = C(0x3b4a2c), cScree = C(0xaaa69b);
  function wallColor(c, s, h, Hs, k, i) {
    c.copy(cWet).lerp(cRock, smoothstep(0, 10, h)).lerp(cLight, smoothstep(Hs * 0.45, Hs, h));
    if (h < 16) c.lerp(cMoss, smoothstep(0.55, 0.7, fbm(s * 0.15, h * 0.12, 2)) * 0.75);
    c.multiplyScalar(1 - 0.3 * smoothstep(0.55, 0.7, fbm(s * 0.5 + 3, h * 0.015, 2)));     // natte strepen
    const dal = smoothstep(260, 160, s);                      // beneden de klamm bos, erboven puin en kale kalk
    c.lerp(cGrass, (1 - k) * dal * smoothstep(0.35, 0.6, fbm(s * 0.05, h * 0.05, 2)) * 0.85);
    c.lerp(cScree, (1 - k) * (1 - dal) * smoothstep(Hs * 0.3, 0, h) * 0.7);
    c.multiplyScalar(0.92 + hash(i) * 0.12);
  }
  const wallMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const step = 2, cols = Math.floor(KL.N / step) + 1, RW = 26, PL = 6;
    const geo = strip(cols, RW + 1 + PL, (ci, j, p, c) => {
      const i = Math.min(KL.N, ci * step), s = i * KL.ds, Hs = KL.H[i], wat = KL.WAT[i], k = KL.K[i];
      if (j <= RW) {
        const h = -1.5 + (Hs + 1.5) * Math.pow(j / RW, 1.25);
        world(s, side * KL.wallU(side, s, h), wat + h, p);
        wallColor(c, s, h, Hs, k, ci * 97 + j);
      } else {
        const q = j - RW, n = fbm(s * 0.02 + side * 5, q * 0.3, 2);
        const h = Hs + q * 2 + 7 * n;
        world(s, side * (KL.wallU(side, s, Hs) + q * q * 1.5 + q * 3), wat + h, p);
        c.copy(cForest).lerp(cRock, smoothstep(0.5, 0.7, n)).multiplyScalar(0.9 + hash(ci * 31 + j) * 0.15);
      }
    });
    const m = new THREE.Mesh(geo, wallMat);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
  }

  // ------------------------------------------------------------------ bodem
  (() => {
    const cBed = C(0x5a5c55), cGravel = C(0x8d887c), cMeadow = C(0x6f7a3e);
    const cols = KL.N + 1, rows = 15;
    const geo = strip(cols, rows, (i, j, p, c) => {
      const s = i * KL.ds, half = KL.W[i] / 2 + 1, u = lerp(-half, half, j / (rows - 1));
      world(s, u, KL.groundY(s, u), p);
      const a = Math.abs(u), ww = KL.WW[i];
      const wei = s < 400 ? 1.4 : 0.55;                       // in het Höllental vooral puin, wat schraal gras
      c.copy(cBed).lerp(cGravel, smoothstep(ww - 0.3, ww + 0.8, a)).lerp(cMeadow, smoothstep(ww + 2, ww + 5, a) * fbm(s * 0.08, u * 0.08, 2) * wei);
      c.multiplyScalar(0.9 + hash(i * 15 + j) * 0.15);
    });
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
    m.receiveShadow = true;
    scene.add(m);
    // keien in de bedding
    // daarna puinblokken in het Höllental
    const r = rng(5), NB = 260, N = NB + 320, im = new THREE.InstancedMesh(rockGeo(9, 0), mat(0x8a877e, 0.9, { flatShading: true }), N);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = V(), p = V();
    for (let n = 0; n < N; n++) {
      let s, u, k;
      if (n < NB) { s = r() * 700; u = (r() * 2 - 1) * (samp(KL.WW, s) + 1); k = 0.2 + r() * r() * 0.9; }
      else {
        s = 405 + r() * 300; u = (r() * 2 - 1) * samp(KL.W, s) / 2; k = 0.2 + r() * r() * 1.6;
        if (Math.abs(u - samp(KL.PU, s)) < 2 || (Math.abs(s - 530) < 14 && u > 4)) { n--; continue; }
      }
      world(s, u, KL.groundY(s, u) - 0.1, p);
      q.setFromAxisAngle(_up, r() * TAU);
      im.setMatrixAt(n, m4.compose(p, q, sc.set(k * 1.3, k * 0.7, k)));
    }
    im.castShadow = true; im.receiveShadow = true;
    scene.add(im);
    // vlakte onder alles, zodat er aan de randen nooit een gat te zien is
    const under = mesh(new THREE.PlaneGeometry(9000, 9000), mat(0x404a33, 1), 0, -6, -800, scene, false);
    under.rotation.x = -Math.PI / 2;
  })();

  // ------------------------------------------------------------------ water
  const waterU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uLight: { value: 1 },
    uDeep: { value: new THREE.Color(0x1f5c60) }, uShallow: { value: new THREE.Color(0x56b3ad) }, uFoam: { value: new THREE.Color(0xe9f4f2) },
  }]);
  (() => {
    const cols = KL.N + 1, rows = 7;
    const pos = new Float32Array(cols * rows * 3), uv = new Float32Array(cols * rows * 2), foam = new Float32Array(cols * rows), edge = new Float32Array(cols * rows), idx = [];
    const p = V();
    for (let i = 0; i < cols; i++) {
      const s = i * KL.ds, ww = KL.WW[i];
      const slope = Math.abs(KL.WAT[Math.min(KL.N, i + 1)] - KL.WAT[Math.max(0, i - 1)]) / (2 * KL.ds);
      for (let j = 0; j < rows; j++) {
        const u = lerp(-ww, ww, j / (rows - 1)), n = i * rows + j;
        world(s, u, KL.WAT[i] + 0.06, p);
        pos.set([p.x, p.y, p.z], n * 3);
        uv.set([u, s], n * 2);
        foam[n] = smoothstep(0.06, 0.5, slope);
        edge[n] = Math.abs(u) / ww;
      }
    }
    for (let i = 0; i < cols - 1; i++) for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j, b = a + rows;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aFoam', new THREE.BufferAttribute(foam, 1));
    g.setAttribute('aEdge', new THREE.BufferAttribute(edge, 1));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: waterU, fog: true, side: THREE.DoubleSide,
      vertexShader: [
        'attribute float aFoam; attribute float aEdge;',
        'varying vec2 vUv; varying float vFoam; varying float vEdge;',
        '#include <fog_pars_vertex>',
        'void main(){',
        '  vUv = uv; vFoam = aFoam; vEdge = aEdge;',
        '  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);',
        '  gl_Position = projectionMatrix * mvPosition;',
        '  #include <fog_vertex>',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform float uTime; uniform float uLight; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFoam;',
        'varying vec2 vUv; varying float vFoam; varying float vEdge;',
        '#include <fog_pars_fragment>',
        'float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
        'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
        '  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }',
        'void main(){',
        '  float sp = 2.0 + 7.0 * vFoam;',
        // het water stroomt naar kleinere s (stroomafwaarts)
        '  vec2 p = vec2(vUv.x * 1.6, vUv.y * 0.5 + uTime * sp * 0.5);',
        '  float n = vn(p) * 0.6 + vn(p * 2.7 + 3.1) * 0.4;',
        '  float st = vn(vec2(vUv.x * 5.0, vUv.y * 0.18 + uTime * sp * 0.18));',
        '  float foam = clamp(vFoam * 1.4 + smoothstep(0.75, 1.0, vEdge) * 0.5 + (n - 0.6) * 1.8 + (st - 0.72) * 1.4, 0.0, 1.0);',
        '  vec3 c = mix(uDeep, uShallow, smoothstep(0.2, 1.0, vEdge) * 0.5 + n * 0.3);',
        '  c = mix(c, uFoam, foam) * uLight;',
        '  gl_FragColor = vec4(c, 1.0);',
        '  #include <fog_fragment>',
        '}',
      ].join('\n'),
    }));
    scene.add(m);
  })();

  // watervallen van de wand: smalle vlakken met een stromende streep-textuur
  const fallTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const g = c.getContext('2d'), r = rng(8);
    for (let i = 0; i < 46; i++) {
      const x = r() * 64, w = 1 + r() * 5, y = r() * 256, h = 30 + r() * 140;
      g.fillStyle = 'rgba(255,255,255,' + (0.25 + r() * 0.6).toFixed(2) + ')';
      g.fillRect(x, y, w, h); g.fillRect(x, y - 256, w, h);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })();
  const fallMat = new THREE.MeshBasicMaterial({ map: fallTex, color: 0xdfeceb, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
  const mistSrc = [];
  [[292, 1], [360, -1]].forEach(([s, side]) => {
    const wat = samp(KL.WAT, s), hgt = samp(KL.H, s) * 0.92, w2 = samp(KL.W, s) / 2;
    const tex = fallTex.clone(); tex.needsUpdate = true; tex.repeat.set(1, hgt / 14);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, hgt), Object.assign(fallMat.clone(), { map: tex }));
    world(s, side * (w2 - 0.15), wat + hgt / 2, m.position);
    m.rotation.y = Math.atan2(-side * samp(KL.NX, s), -side * samp(KL.NZ, s));
    scene.add(m);
    m.userData.tex = tex;
    mistSrc.push({ p: world(s, side * (w2 - 0.9), wat + 0.3), fall: m });
  });
  [287.5, 371.5].forEach(s => mistSrc.push({ p: world(s - 2, 0, samp(KL.WAT, s - 2) + 0.2) }));
  const mistTex = softTexture('rgba(235,242,242,0.9)', 'rgba(235,242,242,0)');
  const mist = [];
  mistSrc.forEach((src, k) => {
    for (let i = 0; i < 10; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0 }));
      scene.add(sp); mist.push({ sp, src, i, k });
    }
  });
  // druppels die langs de wanden vallen (rond het brandpunt)
  const dripN = 180, dripPos = new Float32Array(dripN * 3);
  const dripGeo = new THREE.BufferGeometry(); dripGeo.setAttribute('position', new THREE.BufferAttribute(dripPos, 3));
  const drips = new THREE.Points(dripGeo, new THREE.PointsMaterial({ color: 0xcfe6e8, size: 0.05, transparent: true, opacity: 0.8, depthWrite: false }));
  drips.frustumCulled = false;
  scene.add(drips);

  // ------------------------------------------------------------------ pad
  const inBrug = s => s > KL.BRUG[0] - 0.3 && s < KL.BRUG[1] + 0.3;
  const inTunnel = s => KL.TUNNELS.some(([a, b]) => s > a && s < b);
  (() => {
    const cTop = C(0x8a8172), cFace = C(0x66635c), segs = [];
    let cur = null;
    for (let i = 0; i <= KL.N; i++) {
      const s = i * KL.ds;
      if (inBrug(s)) { cur = null; continue; }
      if (!cur) { cur = []; segs.push(cur); }
      cur.push(i);
    }
    const pos = [], col = [], idx = [], p = V();
    for (const sg of segs) {
      const start = pos.length / 3;
      sg.forEach(i => {
        const s = i * KL.ds, u = KL.PU[i], y = KL.PY[i], sd = Math.sign(u), g = -sd;
        [[u + sd * 1.0, y - 1.4, cFace], [u + g * 0.75, y - 0.5, cFace], [u + g * 0.75, y, cTop], [u + sd * 1.0, y, cTop]].forEach(([uu, yy, c]) => {
          world(s, uu, yy, p); pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b);
        });
      });
      for (let k = 0; k < sg.length - 1; k++) for (let j = 0; j < 3; j++) {
        const a = start + k * 4 + j, b = a + 4;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide }));
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);

    // leuning: paaltjes en twee kabels, alleen in de klamm en buiten de tunnels
    const posts = [];
    for (let s = 2; s < KL.L - 2; s += 2.4) {
      if (samp(KL.K, s) < 0.5 || inBrug(s) || inTunnel(s)) continue;
      const u = samp(KL.PU, s), y = samp(KL.PY, s);
      posts.push(world(s, u - Math.sign(u) * 0.68, y, V()));
    }
    const iron = mat(0x55585a, 0.5, { metalness: 0.5 });
    const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 6).translate(0, 0.525, 0), iron, posts.length);
    const rm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 5), iron, posts.length * 2);
    const m4 = new THREE.Matrix4(), dummy = new THREE.Object3D();
    let nr = 0;
    posts.forEach((q, n) => {
      pm.setMatrixAt(n, m4.makeTranslation(q.x, q.y, q.z));
      const nx = posts[n + 1];
      if (!nx || q.distanceTo(nx) > 3) return;
      for (const hh of [1.0, 0.55]) {
        between(dummy, V(q.x, q.y + hh, q.z), V(nx.x, nx.y + hh, nx.z));
        dummy.updateMatrix(); rm.setMatrixAt(nr++, dummy.matrix);
      }
    });
    rm.count = nr;
    pm.castShadow = true;
    scene.add(pm, rm);
  })();

  // ------------------------------------------------------------------ tunnels
  // halve buis over het pad, met vensters naar de kloof (zoals in de klamm)
  const tunnelOut = new THREE.MeshStandardMaterial({ color: C(0x7a776f), roughness: 1, flatShading: true });
  const tunnelIn = new THREE.MeshStandardMaterial({ color: C(0x3a3733), roughness: 1, flatShading: true, side: THREE.BackSide });
  KL.TUNNELS.forEach(([s0, s1], ti) => {
    const st = 0.5, cols = Math.round((s1 - s0) / st) + 1, rows = 17, Rr = 1.3;
    const pos = new Float32Array(cols * rows * 3), idx = [], p = V();
    let sd = 1;
    for (let i = 0; i < cols; i++) {
      const s = s0 + i * st, u = samp(KL.PU, s), y = samp(KL.PY, s) + 0.95;
      sd = Math.sign(u); const g = -sd;
      for (let j = 0; j < rows; j++) {
        const th = lerp(-0.8, Math.PI + 0.4, j / (rows - 1));
        const r = Rr * (1 + 0.16 * (fbm(s * 0.5 + ti * 9, th * 2, 2) - 0.5)) * (i === 0 || i === cols - 1 ? 1.12 : 1);
        world(s, u + g * Math.cos(th) * r, y + Math.sin(th) * r * 1.1, p);
        pos.set([p.x, p.y, p.z], (i * rows + j) * 3);
      }
    }
    for (let i = 0; i < cols - 1; i++) for (let j = 0; j < rows - 1; j++) {
      const s = s0 + (i + 0.5) * st, th = lerp(-0.8, Math.PI + 0.4, (j + 0.5) / (rows - 1));
      const f = frac((s - s0) / 7);
      if (th > -0.1 && th < 0.85 && f > 0.35 && f < 0.7 && s > s0 + 3 && s < s1 - 3) continue;   // venster
      const a = i * rows + j, b = a + rows;
      if (sd < 0) idx.push(a, a + 1, b, b, a + 1, b + 1);
      else idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const o = new THREE.Mesh(g, tunnelOut), n = new THREE.Mesh(g, tunnelIn);
    o.castShadow = true; o.receiveShadow = true; n.receiveShadow = true;
    scene.add(o, n);
  });

  // ------------------------------------------------------------------ brug
  const wood = mat(0x7a5a3a, 0.9), woodDark = mat(0x4e3a26, 0.95);
  (() => {
    const a = KL.pathAt(KL.BRUG[0] - 0.3), b = KL.pathAt(KL.BRUG[1] + 0.3), len = a.distanceTo(b);
    const g = new THREE.Group();
    g.position.copy(a).lerp(b, 0.5); g.lookAt(b);
    mesh(new THREE.BoxGeometry(1.3, 0.1, len), wood, 0, -0.05, 0, g);
    for (const x of [-0.5, 0.5]) mesh(new THREE.BoxGeometry(0.16, 0.24, len + 0.6), woodDark, x, -0.22, 0, g);
    for (const x of [-0.66, 0.66]) {
      for (let z = -len / 2; z <= len / 2 + 0.01; z += len / 6) mesh(new THREE.BoxGeometry(0.07, 1.05, 0.07), woodDark, x, 0.52, z, g);
      mesh(new THREE.BoxGeometry(0.06, 0.08, len), wood, x, 1.04, 0, g);
      mesh(new THREE.BoxGeometry(0.04, 0.05, len), wood, x, 0.55, 0, g);
    }
    scene.add(g);
    // lawinesneeuw onder de brug, vuil en half gesmolten
    const snow = mat(0xd6d7d2, 0.8, { flatShading: true }), dirty = mat(0xa9a69c, 0.9, { flatShading: true });
    const r = rng(21);
    for (let k = 0; k < 9; k++) {
      const s = 333 + k * 1.5 + r(), w2 = samp(KL.W, s) / 2, wat = samp(KL.WAT, s);
      const m = mesh(rockGeo(800 + k, 1), k % 3 ? snow : dirty, 0, 0, 0, scene);
      world(s, (r() - 0.5) * w2 * 0.6, wat + 0.4 + r() * 0.3, m.position);
      m.scale.set(w2 * 0.9, 0.8 + r() * 0.6, 1.4 + r());
      m.rotation.y = Math.atan2(samp(KL.NX, s), samp(KL.NZ, s)) + Math.PI / 2;
    }
  })();

  // ------------------------------------------------------------------ hutten
  function hut(o) {
    const g = new THREE.Group(), { w, d, wall } = o;
    const T = 0.14;
    const box = (sx, sy, sz, m, x, y, z) => mesh(new THREE.BoxGeometry(sx, sy, sz), m, x, y, z, g);
    // achter- en zijwanden
    box(w, wall, T, o.wallMat, 0, wall / 2, -d / 2 + T / 2);
    box(T, wall, d, o.wallMat, -w / 2 + T / 2, wall / 2, 0);
    box(T, wall, d, o.wallMat, w / 2 - T / 2, wall / 2, 0);
    // voorwand met een raam (x0..x1, y0..y1)
    const [x0, x1, y0, y1] = o.win || [0, 0, 0, 0];
    if (o.win) {
      box(x0 + w / 2, wall, T, o.wallMat, (-w / 2 + x0) / 2, wall / 2, d / 2 - T / 2);
      box(w / 2 - x1, wall, T, o.wallMat, (x1 + w / 2) / 2, wall / 2, d / 2 - T / 2);
      box(x1 - x0, y0, T, o.wallMat, (x0 + x1) / 2, y0 / 2, d / 2 - T / 2);
      box(x1 - x0, wall - y1, T, o.wallMat, (x0 + x1) / 2, (wall + y1) / 2, d / 2 - T / 2);
      box(x1 - x0 + 0.2, 0.08, 0.35, woodDark, (x0 + x1) / 2, y0, d / 2 + 0.05);          // toonbank
    } else box(w, wall, T, o.wallMat, 0, wall / 2, d / 2 - T / 2);
    box(w - 0.1, 0.1, d - 0.1, woodDark, 0, 0.05, 0);
    // zadeldak: driehoekig prisma met twee dakvlakken
    const rise = o.rise, half = d / 2 + 0.05;
    const gable = new THREE.CylinderGeometry(1, 1, w, 3).rotateY(Math.PI / 2).rotateZ(Math.PI / 2).scale(1, rise / 1.5, half / 0.866);
    mesh(gable, o.gableMat, 0, wall + rise / 3, 0, g);
    const ang = Math.atan2(rise, half), sl = Math.hypot(rise, half) + 0.45;
    for (const sd of [1, -1]) {
      const r = box(w + 0.7, 0.14, sl, o.roofMat, 0, wall + rise / 2 + 0.06, sd * (half / 2 + 0.2));
      r.rotation.x = sd * ang;
    }
    return g;
  }
  function placeHut(g, s, u, faceSign) {
    world(s, u, KL.groundY(s, u), g.position);
    g.rotation.y = Math.atan2(faceSign * samp(KL.NX, s), faceSign * samp(KL.NZ, s));
    scene.add(g);
    g.updateMatrixWorld(true);
    return g;
  }
  // Klammeingangshütte: houten kassahuisje met luik
  const kassa = hut({ w: 4.2, d: 3, wall: 2.5, rise: 1.2, win: [-0.6, 0.6, 1.0, 1.95], wallMat: mat(0x7a5434, 0.9), gableMat: mat(0x6a482c, 0.9), roofMat: mat(0x3d3734, 0.9) });
  (() => {
    const sign = mesh(new THREE.PlaneGeometry(2.4, 0.42), new THREE.MeshStandardMaterial({ map: labelTex('HÖLLENTALKLAMM', 512, 100, '#e8dcc0', '#3a2a1a', '600 52px Georgia, serif'), roughness: 0.8 }), 0, 2.24, 1.58, kassa, false);
    sign.castShadow = false;
    // bankje en een bord met helmen
    mesh(new THREE.BoxGeometry(1.4, 0.06, 0.4), wood, -1.4, 0.45, 2.0, kassa);
    for (const x of [-1.95, -0.85]) mesh(new THREE.BoxGeometry(0.08, 0.45, 0.35), woodDark, x, 0.22, 2.0, kassa);
    [0xf2c230, 0xe8e8e2, 0xd2462e, 0x3d7fc0].forEach((c, k) => {
      const hm = mesh(new THREE.SphereGeometry(0.13, 12, 8, 0, TAU, 0, Math.PI / 2), mat(c, 0.45), 1.0 + k * 0.3, 1.28, 1.62, kassa);
      hm.rotation.x = -0.3;
    });
    mesh(new THREE.BoxGeometry(1.3, 0.05, 0.25), woodDark, 1.45, 1.15, 1.6, kassa);
  })();
  placeHut(kassa, 160, -8.6, 1);

  // Höllentalangerhütte: wit gepleisterde onderbouw, houten bovenbouw, terras
  const anger = hut({ w: 12, d: 8, wall: 5.6, rise: 2.6, wallMat: mat(0xe6e1d5, 0.9), gableMat: mat(0x7a5434, 0.9), roofMat: mat(0x4a4744, 0.85) });
  (() => {
    const g = anger;
    mesh(new THREE.BoxGeometry(12.1, 2.6, 8.1), mat(0x7a5434, 0.9), 0, 4.3, 0, g);      // houten verdieping
    const glass = mat(0x1b2226, 0.3), shut = mat(0x2f5a3a, 0.8);
    for (let k = 0; k < 5; k++) {
      const x = -4.8 + k * 2.4;
      for (const y of [1.7, 4.4]) {
        mesh(new THREE.BoxGeometry(0.8, 0.95, 0.06), glass, x, y, 4.07, g, false);
        for (const sx of [-0.6, 0.6]) mesh(new THREE.BoxGeometry(0.38, 0.95, 0.05), shut, x + sx, y, 4.09, g, false);
        mesh(new THREE.BoxGeometry(0.9, 0.16, 0.22), mat(0xb83a2a, 0.8), x, y - 0.56, 4.15, g);   // bloembak
      }
    }
    mesh(new THREE.BoxGeometry(1.1, 2.1, 0.08), woodDark, 0, 1.05, 4.06, g, false);
    mesh(new THREE.PlaneGeometry(5.2, 0.7), new THREE.MeshStandardMaterial({ map: labelTex('HÖLLENTALANGERHÜTTE · 1387 m', 1024, 140, '#efe6cf', '#3a2a1a', '600 60px Georgia, serif'), roughness: 0.8 }), 0, 3.15, 4.12, g, false);
    // terras met tafels en banken
    mesh(new THREE.BoxGeometry(12, 0.3, 5.5), mat(0x8b7a62, 0.95), 0, 0.15, 6.75, g);
    const seats = [];
    [-3.6, 0, 3.6].forEach(x => {
      mesh(new THREE.BoxGeometry(1.9, 0.07, 0.8), wood, x, 1.05, 6.8, g);
      mesh(new THREE.BoxGeometry(0.1, 0.72, 0.6), woodDark, x, 0.66, 6.8, g);
      for (const z of [6.0, 7.6]) {
        mesh(new THREE.BoxGeometry(1.9, 0.06, 0.32), wood, x, 0.75, z, g);
        for (const bx of [-0.8, 0.8]) mesh(new THREE.BoxGeometry(0.07, 0.42, 0.26), woodDark, x + bx, 0.51, z, g);
        for (const dx of [-0.45, 0.45]) seats.push({ local: V(x + dx, 0.3, z), yaw: z < 6.8 ? 0 : Math.PI });
      }
    });
    g.userData.seats = seats;
  })();
  placeHut(anger, 530, 19, -1);

  // ------------------------------------------------------------------ dennen
  (() => {
    const N = 900, r = rng(12);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.25, 2.4, 6), mat(0x4c3a28, 1), N);
    const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(1.9, 6.5, 8), mat(0x2f432c, 1), N);
    const crown2 = new THREE.InstancedMesh(new THREE.ConeGeometry(1.3, 4.3, 8), mat(0x37502f, 1), N);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = V(), p = V(), hutPos = [kassa.position, anger.position];
    let n = 0, tries = 0;
    while (n < N && tries++ < 20000) {
      const s = r() * 400, side = r() < 0.5 ? -1 : 1, k = samp(KL.K, s), wat = samp(KL.WAT, s), Hs = samp(KL.H, s);
      let y;
      if (k > 0.3) {                       // op de rand boven de klamm
        const o = 3 + r() * 22;
        world(s, side * (KL.wallU(side, s, Hs) + o), 0, p);
        y = wat + Hs + o * 0.25 + 7 * fbm(s * 0.02 + side * 5, o / 8 * 0.3, 2) - 1;
      } else if (r() < 0.45) {             // op de dalbodem
        const u = side * (samp(KL.WW, s) + 2 + r() * (samp(KL.W, s) / 2 - samp(KL.WW, s) - 2));
        if (Math.abs(u - samp(KL.PU, s)) < 2.5) continue;
        world(s, u, 0, p); y = KL.groundY(s, u);
      } else {                             // op de hellingen
        const h = r() * Hs * 0.85;
        world(s, side * (KL.wallU(side, s, h) - 0.2), 0, p); y = wat + h - 0.3;
      }
      if (hutPos.some(hp => Math.hypot(hp.x - p.x, hp.z - p.z) < 9)) continue;
      const sz = 0.7 + r() * 0.8;
      q.setFromAxisAngle(_up, r() * TAU);
      trunk.setMatrixAt(n, m4.compose(p.set(p.x, y + sz * 1.2, p.z), q, sc.set(sz, sz, sz)));
      crown.setMatrixAt(n, m4.compose(p.set(p.x, y + sz * 4.8, p.z), q, sc));
      crown2.setMatrixAt(n, m4.compose(p.set(p.x, y + sz * 7.6, p.z), q, sc));
      n++;
    }
    for (const m of [trunk, crown, crown2]) { m.count = n; m.castShadow = true; m.receiveShadow = true; scene.add(m); }
  })();

  // ------------------------------------------------------------------ bergen
  // Zugspitze met de Höllentalferner aan het eind, rotskammen langs het dal
  (() => {
    const cRockM = C(0x8a877f), cDark = C(0x5f5d58), cSnow = C(0xf2f5f7), cGreen = C(0x47553a), c = new THREE.Color(), v = V();
    function berg(seed, x, y, z, sx, sy, sz, snowY, ice) {
      const g = rockGeo(seed, 3), p = g.attributes.position, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const wy = y + v.y * sy, n = fbm(v.x * 3 + seed, v.z * 3, 3);
        c.copy(cDark).lerp(cRockM, n);
        c.lerp(cGreen, smoothstep(220, 60, wy) * 0.8);
        c.lerp(cSnow, ice ? 1 : smoothstep(snowY, snowY + 80, wy + 160 * (n - 0.5)) * smoothstep(-0.1, 0.4, v.y));
        col.set([c.r, c.g, c.b], i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
      m.position.set(x, y, z); m.scale.set(sx, sy, sz);
      scene.add(m);
      return m;
    }
    berg(901, 0, -200, -2300, 1100, 1500, 520, 700);           // Zugspitzmassief
    berg(902, 420, -200, -1950, 500, 1050, 420, 650);
    berg(903, -480, -200, -2000, 520, 1150, 420, 650);
    berg(904, 30, 250, -1550, 380, 80, 320, 0, true).rotation.x = 0.18;   // Höllentalferner
    const r = rng(77);
    for (let k = 0; k < 9; k++) for (const side of [-1, 1]) {
      const z = 120 - k * 220 - r() * 60, x = side * (300 + r() * 110);
      berg(910 + k * 2 + (side > 0 ? 1 : 0), x, -120, z, 230 + r() * 80, 420 + r() * 520 + k * 40, 240, 520);
    }
  })();

  // ------------------------------------------------------- tijd van de dag
  const DAG = { top: new THREE.Color(0x4f8fd6), hor: new THREE.Color(0xdde8ee) };
  const SCHEMER = { top: new THREE.Color(0x3b5690), hor: new THREE.Color(0xf2b07c) };
  const top = new THREE.Color(), hor = new THREE.Color(), sunDir = V();
  const warm = new THREE.Color(0xffa060), wit = new THREE.Color(0xfff3e0), mistCol = new THREE.Color(0x8fa3a4);
  const focus = V();

  const W = {
    renderer, scene, camera, KL, keepCam: KL.keep, focusS: 0, gorge: 0,
    kassa, anger,
    setHour(h) {
      const a = (h - 6) / 12 * Math.PI;
      sunDir.set(Math.cos(a) * 0.9, Math.sin(a) * 0.8, -0.3).normalize();
      const e = sunDir.y, dag = smoothstep(0.1, 0.55, e);
      top.copy(SCHEMER.top).lerp(DAG.top, dag);
      hor.copy(SCHEMER.hor).lerp(DAG.hor, dag);
      const u = sky.material.uniforms;
      u.uTop.value.copy(top); u.uHor.value.copy(hor); u.uSun.value.copy(sunDir);
      u.uSunCol.value.copy(wit).lerp(warm, 1 - dag);
      sun.color.copy(warm).lerp(wit, 0.4 + 0.6 * dag);
      clouds.children.forEach(c => c.children[0].material.color.copy(hor).lerp(wit, 0.5 + 0.5 * dag));
    },
    setFocus(v) { focus.copy(v); W.focusS = KL.nearestS(v.x, v.z); },

    update(t) {
      // licht volgt het brandpunt van de camera, zodat de schaduwen scherp blijven
      sun.target.position.copy(focus);
      sun.position.copy(focus).addScaledVector(sunDir, 220);
      sky.position.copy(camera.position);
      clouds.rotation.y = t * 0.002;

      // in de klamm: minder hemellicht, dichtere koele nevel
      const g = W.gorge = samp(KL.K, W.focusS);
      hemi.intensity = 0.6 - 0.25 * g;
      sun.intensity = 1.7 - 0.3 * g;
      scene.fog.color.copy(hor).lerp(mistCol, 0.7 * g);
      scene.fog.near = lerp(150, 18, g);
      scene.fog.far = lerp(3200, 340, g);
      renderer.toneMappingExposure = lerp(1.0, 1.25, g);
      waterU.uTime.value = t;
      waterU.uLight.value = lerp(1.0, 0.62, g);

      // watervallen en nevel
      mistSrc.forEach(m => { if (m.fall) m.fall.userData.tex.offset.y = t * 0.9; });
      mist.forEach(({ sp, src, i, k }) => {
        const a = frac(t * 0.16 + i / 10 + k * 0.13);
        sp.position.set(src.p.x + Math.sin(i * 7.3 + k) * (0.5 + a * 1.4), src.p.y + a * 3.5, src.p.z + Math.cos(i * 4.1 + k) * (0.5 + a * 1.4));
        sp.scale.setScalar(1.2 + a * 4.5);
        sp.material.opacity = (1 - a) * smoothstep(0, 0.15, a) * 0.32;
      });
      // druppels rond het brandpunt
      for (let i = 0; i < dripN; i++) {
        const s = clamp(W.focusS + (hash(i) - 0.5) * 34, 0, KL.L), side = hash(i + 7) < 0.5 ? -1 : 1;
        const wat = samp(KL.WAT, s), top0 = 3 + hash(i + 3) * 14, a = frac(t * (0.35 + hash(i + 11) * 0.3) + hash(i + 5));
        const y = wat + top0 * (1 - a * a);
        const on = samp(KL.K, s) > 0.4;
        const u = side * (KL.wallU(side, s, top0) - 0.25);
        const cx = samp(KL.CX, s), cz = samp(KL.CZ, s), nx = samp(KL.NX, s), nz = samp(KL.NZ, s);
        dripPos[i * 3] = cx + nx * u; dripPos[i * 3 + 1] = on ? y : -999; dripPos[i * 3 + 2] = cz + nz * u;
      }
      dripGeo.attributes.position.needsUpdate = true;
    },
  };
  return W;
}

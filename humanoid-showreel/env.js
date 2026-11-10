'use strict';
/* =============================================================================
   env.js — gedeelde helpers: tijd & easing, kleuren, materialen, bouwblokken
   ============================================================================= */

const TAU = Math.PI * 2;
const ENV = { map: null };               // reflectie-omgeving, gezet in main.js

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = hex => new THREE.Color(hex).convertSRGBToLinear();

// ------------------------------------------------------------------ tijd
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const smooth = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
const easeIO = t => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOut = t => 1 - Math.pow(1 - clamp01(t), 3);
const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));      // 0 → 1 → 0

// Afgelegde afstand D tussen t0 en t1 met optrekken (rin) en afremmen (rout)
function travel(t, D, t0, t1, rin = 0.5, rout = rin) {
  const T = t1 - t0;
  const v = D / (T - rin / 2 - rout / 2);
  const u = Math.max(0, Math.min(t - t0, T));
  if (u < rin) return v * u * u / (2 * rin);
  if (u <= T - rout) return v * (u - rin / 2);
  const w = T - u;
  return D - v * w * w / (2 * rout);
}

function rng(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------ materialen
const _mats = {};
function mat(color, rough = 0.7, metal = 0, opts) {
  const key = color + '|' + rough + '|' + metal + '|' + (opts ? JSON.stringify(opts) : '');
  if (!_mats[key]) {
    const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: rough, metalness: metal }, opts || {}));
    m.color = C(color);
    if (opts && opts.emissive !== undefined) m.emissive = C(opts.emissive);
    if (metal >= 0.3 && ENV.map) m.envMap = ENV.map;
    _mats[key] = m;
  }
  return _mats[key];
}

// Zelflichtend (led-strips, lampen, schermen) — niet tone-mapped zodat het "gloeit"
const _glows = {};
function glow(color, opacity = 1) {
  const key = color + '|' + opacity;
  if (!_glows[key]) {
    _glows[key] = new THREE.MeshBasicMaterial({
      color: C(color), toneMapped: false,
      transparent: opacity < 1, opacity,
    });
  }
  return _glows[key];
}

// Unieke glow (voor animeerbare opacity / kleur)
function glowOwn(color, opacity = 1, additive = false) {
  return new THREE.MeshBasicMaterial({
    color: C(color), toneMapped: false, transparent: true, opacity,
    depthWrite: false, side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

// ------------------------------------------------------------------ bouwblokken
function mesh(geo, material, x = 0, y = 0, z = 0, parent, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  if (parent) parent.add(m);
  return m;
}
function box(parent, w, h, d, material, x, y, z, shadow = true) {
  return mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent, shadow);
}
function cyl(parent, rt, rb, h, material, x, y, z, segs = 20, shadow = true) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, segs), material, x, y, z, parent, shadow);
}
function sphere(parent, r, material, x, y, z, shadow = true) {
  return mesh(new THREE.SphereGeometry(r, 20, 14), material, x, y, z, parent, shadow);
}
// Open bak (vloer + vier wanden), yTop = bovenrand
function tray(parent, w, h, d, material, x, yTop, z, t = 0.02) {
  const g = new THREE.Group();
  g.position.set(x, yTop - h, z);
  box(g, w, t, d, material, 0, t / 2, 0);
  box(g, w, h, t, material, 0, h / 2, d / 2 - t / 2);
  box(g, w, h, t, material, 0, h / 2, -d / 2 + t / 2);
  box(g, t, h, d, material, w / 2 - t / 2, h / 2, 0);
  box(g, t, h, d, material, -w / 2 + t / 2, h / 2, 0);
  parent.add(g);
  return g;
}

// ------------------------------------------------------------------ decor
function stage(bg, fogNear, fogFar) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(bg);
  if (fogFar) s.fog = new THREE.Fog(C(bg), fogNear, fogFar);
  return s;
}

function lights(scene, o = {}) {
  const hemi = new THREE.HemisphereLight(C(o.sky || 0xffffff), C(o.ground || 0x222222), o.hemi !== undefined ? o.hemi : 0.5);
  const sun = new THREE.DirectionalLight(C(o.sun || 0xffffff), o.sunI !== undefined ? o.sunI : 1.4);
  sun.position.copy(o.sunPos || V(4, 8, 3));
  sun.target.position.copy(o.target || V());
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = o.shadow || 8;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: 60 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(hemi, sun, sun.target);
  return { hemi, sun };
}

function floor(scene, color, rough = 0.8, metal = 0, size = 80) {
  // eigen materiaal zonder reflectie-omgeving: vloeren blijven donker en gelijkmatig
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color: C(color), roughness: rough, metalness: metal }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

// Verloopende lucht (koepel)
function skyDome(scene, top, horizon, bottom) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(top) },
      mid: { value: new THREE.Color(horizon) },
      bot: { value: new THREE.Color(bottom) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;' +
      'void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.55)) : mix(mid, bot, pow(-h, 0.4)); gl_FragColor = vec4(c, 1.0); }',
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), m);
  dome.renderOrder = -1;
  scene.add(dome);
  return dome;
}

// Streeptextuur voor lopende banden
function stripeTexture(bg = '#24272c', line = '#4a5059') {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 64, 64);
  g.fillStyle = line; g.fillRect(0, 0, 10, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

// Lichtgevende "softboxen" als reflectie-omgeving voor metaal en vizieren
function makeEnvironment(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x0b0d11);
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const add = (color, k, x, y, z, sx, sy, sz) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) }));
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); s.add(m);
  };
  add(0xffffff, 3.0, 0, 6, 0, 8, 0.2, 8);
  add(0xdbe8ff, 1.8, -6, 2, 0, 0.2, 4, 7);
  add(0xffe6cc, 1.4, 6, 2.5, -2, 0.2, 3, 5);
  add(0xffffff, 1.0, 0, 2, 6, 6, 2, 0.2);
  add(0x3a4048, 1.0, 0, -2, 0, 20, 0.2, 20);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.04).texture;
  pm.dispose();
  return tex;
}

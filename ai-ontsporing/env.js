'use strict';
/* =============================================================================
   env.js — gedeelde helpers: tijd & easing, kleuren, ruis, materialen,
   bouwblokken, teksttexturen (opzet uit humanoid-showreel/env.js en
   aarde-geschiedenis/env.js)
   ============================================================================= */

const TAU = Math.PI * 2;
const ENV = { map: null };               // reflectie-omgeving, gezet in main.js

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = hex => new THREE.Color(hex).convertSRGBToLinear();

// ------------------------------------------------------------------ tijd
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const smooth = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
const smoothstep = (a, b, x) => smooth((x - a) / (b - a));
const easeIO = t => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeOut = t => 1 - Math.pow(1 - clamp01(t), 3);
const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));      // 0 → 1 → 0
const frac = x => x - Math.floor(x);
const hash = n => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);

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

// ------------------------------------------------------------------ ruis
function noise2(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const h = (a, b) => frac(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(h(xi, zi), h(xi + 1, zi), u), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v);
}
function fbm(x, z, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise2(x * f, z * f); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
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

// Zelflichtend (lampjes, schermen) — niet tone-mapped zodat het "gloeit"
const _glows = {};
function glow(color, opacity = 1) {
  const key = color + '|' + opacity;
  if (!_glows[key]) {
    _glows[key] = new THREE.MeshBasicMaterial({ color: C(color), toneMapped: false, transparent: opacity < 1, opacity });
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

// Zet een mesh die langs y loopt (lengte 1) tussen twee punten
const _up = V(0, 1, 0), _dir = V();
function between(m, a, b) {
  _dir.subVectors(b, a);
  const len = _dir.length();
  m.position.copy(a).addScaledVector(_dir, 0.5);
  if (len > 1e-6) m.quaternion.setFromUnitVectors(_up, _dir.multiplyScalar(1 / len));
  m.scale.set(1, Math.max(len, 1e-4), 1);
}

// Tandwiel, as langs y
function gearGeo(r, teeth, h, depth = r * 0.14) {
  const s = new THREE.Shape(), n = teeth * 4;
  for (let i = 0; i < n; i++) {
    const a = (i + 0.5) / n * TAU, k = i % 4, rr = k === 1 || k === 2 ? r : r - depth;
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, r * 0.16, 0, TAU, true);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -h / 2);
  g.rotateX(Math.PI / 2);
  return g;
}

// ------------------------------------------------------------------ decor
function stage(bg, fogNear, fogFar) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(bg);
  if (fogFar) s.fog = new THREE.Fog(new THREE.Color(bg), fogNear, fogFar);
  return s;
}

function lights(scene, o = {}) {
  const hemi = new THREE.HemisphereLight(C(o.sky || 0xffffff), C(o.ground || 0x222222), o.hemi !== undefined ? o.hemi : 0.5);
  const sun = new THREE.DirectionalLight(C(o.sun || 0xffffff), o.sunI !== undefined ? o.sunI : 1.4);
  sun.position.copy(o.sunPos || V(4, 8, 3));
  sun.target.position.copy(o.target || V());
  sun.castShadow = o.shadows !== false;
  sun.shadow.mapSize.set(2048, 2048);
  const s = o.shadow || 8;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: 60 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(hemi, sun, sun.target);
  return { hemi, sun };
}

function floor(scene, color, rough = 0.8, metal = 0, size = 80, map) {
  // eigen materiaal zonder reflectie-omgeving: vloeren blijven donker en gelijkmatig
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color: C(color), roughness: rough, metalness: metal, map: map || null }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  scene.add(m);
  return m;
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

// InstancedMesh zonder culling (r128 cullt op de bol rond de oorsprong)
function instanced(geo, material, n) {
  const m = new THREE.InstancedMesh(geo, material, n);
  m.frustumCulled = false;
  return m;
}

// Spotlicht met schaduw
function spot(scene, color, I, pos, target, angle = 0.5, pen = 0.5, dist = 16) {
  const s = new THREE.SpotLight(C(color), I, dist, angle, pen, 1.2);
  s.position.copy(pos);
  s.target.position.copy(target);
  s.castShadow = true;
  s.shadow.mapSize.set(1024, 1024);
  s.shadow.bias = -0.0005;
  scene.add(s, s.target);
  return s;
}

// Zwevende stofdeeltjes rond een middelpunt (pure functie van t)
function dust(scene, n, center, size, color = 0xffe0b0, opacity = 0.5, seed = 3) {
  const r = rng(seed), base = [], pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) base.push([r() - 0.5, r() - 0.5, r() - 0.5, r() * TAU]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: C(color), size: 0.02, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, map: dotTexture() });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  scene.add(p);
  return {
    points: p,
    update(t) {
      for (let i = 0; i < n; i++) {
        const b = base[i];
        pos[i * 3] = center.x + (b[0] + 0.04 * Math.sin(t * 0.3 + b[3])) * size.x;
        pos[i * 3 + 1] = center.y + (frac(b[1] + 0.5 + t * 0.006 + 0.02 * Math.sin(t * 0.2 + b[3])) - 0.5) * size.y;
        pos[i * 3 + 2] = center.z + (b[2] + 0.04 * Math.cos(t * 0.25 + b[3])) * size.z;
      }
      g.attributes.position.needsUpdate = true;
    },
  };
}

let _dot = null;
function dotTexture() {
  if (_dot) return _dot;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.6)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  _dot = new THREE.CanvasTexture(c);
  return _dot;
}

// ------------------------------------------------------------------ tekst
// Tekst op een canvas als textuur; tex.aspect = breedte / hoogte
function textTex(text, o = {}) {
  const fs = o.size || 64, pad = o.pad === undefined ? 16 : o.pad;
  const font = (o.weight || 600) + ' ' + fs + 'px ' + (o.font || '"JetBrains Mono", ui-monospace, monospace');
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = font;
  const lines = String(text).split('\n');
  const w = Math.ceil(Math.max(o.minW || 0, ...lines.map(l => g.measureText(l).width))) + pad * 2;
  const h = Math.ceil(lines.length * fs * 1.25) + pad * 2;
  c.width = w; c.height = h;
  if (o.bg) {
    g.fillStyle = o.bg;
    const r = o.radius || 0;
    g.beginPath();
    g.moveTo(r, 0); g.arcTo(w, 0, w, h, r); g.arcTo(w, h, 0, h, r); g.arcTo(0, h, 0, 0, r); g.arcTo(0, 0, w, 0, r);
    g.fill();
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = o.borderW || 4; g.stroke(); }
  }
  g.font = font;
  g.fillStyle = o.color || '#ffffff';
  g.textBaseline = 'middle';
  g.textAlign = o.align || 'center';
  lines.forEach((l, i) => g.fillText(l, o.align === 'left' ? pad : w / 2, pad + fs * 1.25 * (i + 0.5)));
  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = 4;
  tex.aspect = w / h;
  return tex;
}

// Vlak met tekst, hoogte in meters
function label(text, height, o = {}) {
  const tex = textTex(text, o);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(height * tex.aspect, height), new THREE.MeshBasicMaterial({
    map: tex, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide,
    opacity: o.opacity === undefined ? 1 : o.opacity,
  }));
  m.userData.w = height * tex.aspect;
  return m;
}

// ------------------------------------------------------------------ camera
// Keyframes: [[t, [px,py,pz], [tx,ty,tz], fov], ...] → aim(cam) met easeIO tussen de sleutels
const _tgt = V();
function aim(cam, px, py, pz, tx, ty, tz, fov) {
  cam.position.set(px, py, pz);
  cam.userData.tgt = cam.userData.tgt || V();
  cam.userData.tgt.set(tx, ty, tz);
  cam.lookAt(_tgt.set(tx, ty, tz));
  if (fov) cam.fov = fov;
}
function camPath(keys) {
  return (t, cam) => {
    let i = 0;
    while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1] || a;
    const k = b === a ? 0 : easeIO(seg(t, a[0], b[0]));
    const L = j => lerp(a[1][j], b[1][j], k), T = j => lerp(a[2][j], b[2][j], k);
    aim(cam, L(0), L(1), L(2), T(0), T(1), T(2), lerp(a[3] || 36, b[3] || 36, k));
  };
}

// ------------------------------------------------------------------ figuur
// Gestileerde mens (paspop), kijkt naar +z. pose: { sit, lSh, rSh, lEl, rEl, headX, headY, lean, lShO, rShO }
function createFigure(o = {}) {
  const cloth = mat(o.color || 0x5b6472, 0.85), skin = mat(o.skin || 0xc8a184, 0.65), legs = mat(o.legs || 0x2b2f36, 0.85);
  const root = new THREE.Group();
  const hips = new THREE.Group(); root.add(hips);
  mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.16, 16).scale(1, 1, 0.7), legs, 0, 0, 0, hips);
  const spine = new THREE.Group(); spine.position.y = 0.06; hips.add(spine);
  mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.52, 18).scale(1, 1, 0.62), cloth, 0, 0.28, 0, spine);
  mesh(new THREE.SphereGeometry(0.19, 18, 10, 0, TAU, 0, Math.PI / 2).scale(1, 0.45, 0.62), cloth, 0, 0.54, 0, spine);
  mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 10), skin, 0, 0.6, 0, spine);
  const head = new THREE.Group(); head.position.y = 0.64; spine.add(head);
  mesh(new THREE.SphereGeometry(0.1, 20, 14).scale(0.9, 1.15, 1), skin, 0, 0.1, 0, head);
  if (o.hair !== false) mesh(new THREE.SphereGeometry(0.104, 20, 10, 0, TAU, 0, Math.PI * 0.55).scale(0.92, 1.12, 1.02), mat(o.hair || 0x2a1d16, 0.9), 0, 0.115, -0.008, head);
  const J = { hips, spine, head };
  for (const s of [1, -1]) {
    const k = s > 0 ? 'l' : 'r';
    const sh = new THREE.Group(); sh.position.set(s * 0.21, 0.5, 0); spine.add(sh);
    mesh(new THREE.CylinderGeometry(0.05, 0.042, 0.28, 10), cloth, 0, -0.14, 0, sh);
    const el = new THREE.Group(); el.position.y = -0.28; sh.add(el);
    mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.26, 10), cloth, 0, -0.13, 0, el);
    mesh(new THREE.SphereGeometry(0.04, 10, 8).scale(0.8, 1.2, 0.6), skin, 0, -0.29, 0, el);
    const hip = new THREE.Group(); hip.position.set(s * 0.085, -0.04, 0); hips.add(hip);
    mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.44, 12), legs, 0, -0.22, 0, hip);
    const knee = new THREE.Group(); knee.position.y = -0.44; hip.add(knee);
    mesh(new THREE.CylinderGeometry(0.052, 0.04, 0.42, 12), legs, 0, -0.21, 0, knee);
    mesh(new THREE.BoxGeometry(0.09, 0.06, 0.24), mat(0x1a1a1a, 0.6), 0, -0.44, 0.05, knee);
    J[k + 'Sh'] = sh; J[k + 'El'] = el; J[k + 'Hip'] = hip; J[k + 'Knee'] = knee;
  }
  function setPose(p = {}) {
    const g = k => p[k] || 0, sit = g('sit');
    hips.position.y = lerp(0.93, 0.5, sit);
    J.lHip.rotation.x = J.rHip.rotation.x = -Math.PI / 2 * sit;
    J.lKnee.rotation.x = J.rKnee.rotation.x = Math.PI / 2 * sit;
    spine.rotation.set(g('lean'), g('twist'), 0);
    head.rotation.set(g('headX'), g('headY'), 0);
    J.lSh.rotation.set(-g('lSh'), 0, g('lShO') + 0.06);
    J.rSh.rotation.set(-g('rSh'), 0, -g('rShO') - 0.06);
    J.lEl.rotation.x = -g('lEl');
    J.rEl.rotation.x = -g('rEl');
  }
  setPose(o.pose);
  root.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { root, J, setPose };
}

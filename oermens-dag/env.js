'use strict';
/* =============================================================================
   env.js — gedeelde helpers: tijd & easing, kleuren, ruis, materialen
   (opzet uit humanoid-showreel/env.js)
   ============================================================================= */

const TAU = Math.PI * 2;
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
function mat(color, rough = 0.85, opts) {
  const key = color + '|' + rough + '|' + (opts ? JSON.stringify(opts) : '');
  if (!_mats[key]) {
    const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: rough, metalness: 0 }, opts || {}));
    m.color = C(color);
    _mats[key] = m;
  }
  return _mats[key];
}
function glowMat(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color: C(color), toneMapped: false, transparent: true, opacity,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

function mesh(geo, material, x = 0, y = 0, z = 0, parent, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  if (parent) parent.add(m);
  return m;
}

// Ronde, zachte stip als textuur voor rook, gloed en vonken
function softTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, inner); r.addColorStop(1, outer);
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Rotsblok: icosaëder met verschoven hoekpunten
function rockGeo(seed, detail = 1) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position, r = rng(seed), v = V();
  const seen = new Map();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = v.x.toFixed(3) + v.y.toFixed(3) + v.z.toFixed(3);
    if (!seen.has(k)) seen.set(k, 0.78 + r() * 0.4);
    v.multiplyScalar(seen.get(k));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// Zet een cilinder/mesh (langs y) tussen twee punten
const _up = V(0, 1, 0), _dir = V();
function between(m, a, b) {
  _dir.subVectors(b, a);
  const len = _dir.length();
  m.position.copy(a).addScaledVector(_dir, 0.5);
  m.quaternion.setFromUnitVectors(_up, _dir.normalize());
  m.scale.set(1, len, 1);
}

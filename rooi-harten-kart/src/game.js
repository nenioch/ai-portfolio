// Rooi Harten Kart: een kartrace rond en door het Missiehuis van het Heilig
// Hart, Bredaseweg 204, Tilburg. Het klooster, de kapel en het terrein komen
// rechtstreeks uit het 3D-model in ../rooi-harten-tilburg-3d.
import * as THREE from 'three';
import { makeMaterials } from '../../rooi-harten-tilburg-3d/src/textures.js';
import { world } from '../../rooi-harten-tilburg-3d/src/kit.js';
import { buildKlooster } from '../../rooi-harten-tilburg-3d/src/klooster.js';
import { buildKapel } from '../../rooi-harten-tilburg-3d/src/kapel.js';
import { buildExterior } from '../../rooi-harten-tilburg-3d/src/exterior.js';
import { cutOut, subtractColliders } from './cut.js';
import { buildInterior, INSIDE_CUTS, OPENING_CUTS } from './interior.js';
import { Track } from './track.js';
import { Kart, ColliderGrid } from './kart.js';
import { AIDriver } from './ai.js';
import { TouchControls, IS_TOUCH } from './touch.js';

const LAPS = 3;
const HASH = decodeURIComponent(location.hash.slice(1));
const TEST = HASH === 'test';
const DBG = new URLSearchParams(location.search).get('dbg') ?? '';

// laat het laadbericht eerst verschijnen; het opbouwen duurt even
await new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0)));

// --------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, IS_TOUCH ? 1.5 : 2));   // telefoons: minder pixels, vloeiender
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.08, 2600);
scene.fog = new THREE.Fog(0xc3d9ea, 160, 900);

// lucht: middag op een zomerdag, zon in het zuidwesten (zie main.js van het model)
const sunDir = new THREE.Vector3(-0.196, 0.86, 0.472).normalize();
{
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color('#4a82c4') }, horizon: { value: new THREE.Color('#c3d9ea') },
      ground: { value: new THREE.Color('#2f332d') }, sunDir: { value: sunDir }, sunCol: { value: new THREE.Color('#fff2dc') },
    },
    vertexShader: `varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunDir; uniform vec3 sunCol;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 c = d.y > 0.0 ? mix(horizon, top, pow(min(d.y * 1.6, 1.0), 0.6)) : mix(horizon, ground, min(-d.y * 6.0, 1.0));
        float s = max(dot(d, sunDir), 0.0);
        c += sunCol * (smoothstep(0.9993, 0.9997, s) * 3.0 + pow(s, 24.0) * 0.1);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);
}
scene.add(new THREE.HemisphereLight(0xcfe2f5, 0xa49d8c, 1.1), new THREE.AmbientLight(0xffffff, 0.27));
const sun = new THREE.DirectionalLight(0xfff1de, 2.8);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(IS_TOUCH ? 2048 : 4096);
Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 1, far: 450 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.04;
sun.target.position.set(0, 0, 42);
sun.position.copy(sun.target.position).addScaledVector(sunDir, 220);
scene.add(sun, sun.target);

// --------------------------------------------------------------------------
// het klooster uit het model, met gaten waar de baan erdoor gaat
const M = makeMaterials();
M.bulb.emissiveIntensity = 1.6;
const klooster = buildKlooster(M);
const kapel = buildKapel(M);
const ext = buildExterior(M);
const HEDGE_CUT = { min: [35.9, 0.05, -4.5], max: [46.1, 1.6, -3.5] };   // haag voor het oostelijke hoekblok
const GATE_CUT = { min: [-45.68, 0.13, -5.3], max: [-40.32, 2.2, -4.7] }; // zijpoortje: hekvak tussen de pijlers op x = -46 en -40
cutOut(klooster.group, [...INSIDE_CUTS, ...OPENING_CUTS]);
cutOut(ext.group, [HEDGE_CUT, GATE_CUT]);
world.colliders = subtractColliders(world.colliders, [...OPENING_CUTS, HEDGE_CUT, GATE_CUT]);
const interior = buildInterior(M);
scene.add(klooster.group, kapel.group, ext.group, interior.group);
if (DBG.includes('noshadow')) renderer.shadowMap.enabled = false;
if (DBG.includes('nolights')) for (const l of interior.lights) l.visible = false;
if (DBG.includes('noklooster')) klooster.group.visible = false;

const track = new Track(M);
scene.add(track.group);
const S = track.S;
const grid = new ColliderGrid(world.colliders);

// --------------------------------------------------------------------------
// karts
const DRIVERS = [
  { name: 'Jij', color: '#c4141e', suit: '#f3f0ea', hat: '#c4141e' },
  { name: 'Pater Jan', color: '#2457c5', suit: '#1a1a1c', hat: '#1a1a1c' },
  { name: 'Broeder Kees', color: '#2f9a45', suit: '#5b4636', hat: '#d8c79a' },
  { name: 'Zuster Anna', color: '#e7b416', suit: '#1f2a44', hat: '#f4f4f4' },
];
const karts = DRIVERS.map((d) => new Kart(d));
for (const k of karts) scene.add(k.mesh);
const player = karts[0];
const ais = karts.slice(1).map((k, i) => new AIDriver(k, { skill: [0.97, 0.94, 0.91][i], lane: [-0.6, 0.6, 0][i], seed: i + 1 }));
if (TEST) ais.unshift(new AIDriver(player, { skill: 0.97, lane: 0.3, seed: 9 }));

function grid0() {
  // startopstelling achter de streep, twee aan twee
  karts.forEach((k, i) => {
    const order = TEST ? i : [3, 2, 1, 0][i];             // de speler start achteraan
    k.place(track, 0, (order % 2 ? -1.8 : 1.8), 4 + order * 3.2);
    k.dist = k.idx - S.N;
    k.lapTimes = []; k.lapStart = 0; k.finished = false; k.finishTime = 0; k.item = null;
    k.respawns = 0; k.wallHits = 0; k.stuckMax = 0;
  });
}

// --------------------------------------------------------------------------
// itemblokken en bananen
const items = [];
{
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 128, 128);
  gr.addColorStop(0, '#ff5f6d'); gr.addColorStop(0.5, '#ffc371'); gr.addColorStop(1, '#5ee7df');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(6, 6, 116, 116);
  g.fillStyle = gr; g.fillRect(14, 14, 100, 100);
  g.font = 'bold 84px "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#fff'; g.fillText('?', 64, 70);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.88, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.35, roughness: 0.3 });
  const geo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
  for (const j of track.itemRows) {
    const room = S.hw[j] - 0.9;
    for (const f of [-0.75, -0.25, 0.25, 0.75]) {
      const m = new THREE.Mesh(geo, mat);
      track.point(j, f * room * 2 * 0.75, m.position);
      m.position.y += 0.95;
      m.castShadow = true;
      scene.add(m);
      items.push({ mesh: m, timer: 0, ph: Math.random() * 6 });
    }
  }
}
const bananas = [];
const bananaMat = new THREE.MeshStandardMaterial({ color: '#f2d12e', roughness: 0.5 });
const bananaGeo = new THREE.TorusGeometry(0.28, 0.1, 8, 14, Math.PI * 1.2);
const itemWorld = {
  dropBanana(k) {
    const [fx, fz] = k.fwd;
    const m = new THREE.Mesh(bananaGeo, bananaMat);
    m.position.set(k.pos.x - fx * 1.9, (k.floorY ?? k.pos.y) + 0.12, k.pos.z - fz * 1.9);
    m.rotation.set(Math.PI / 2, 0, Math.random() * 6);
    m.castShadow = true;
    scene.add(m);
    bananas.push({ mesh: m, owner: k, age: 0 });
  },
};

// --------------------------------------------------------------------------
// HUD
const $ = (id) => document.getElementById(id);
const el = {
  loading: $('loading'), menu: $('menu'), hud: $('hud'), lap: $('lap'), pos: $('pos'), time: $('time'),
  best: $('best'), speed: $('speed'), zone: $('zone'), item: $('item'), msg: $('msg'), results: $('results'),
  resultsList: $('results-list'), minimap: $('minimap'), pause: $('pause'),
};
const fmt = (t) => {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
};
let bestLap = null;
try { const v = parseFloat(localStorage.getItem('rhk-best-lap')); if (v > 0) bestLap = v; } catch { /* geen opslag */ }
let msgTimer = 0;
function message(text, t = 1.6, big = false) {
  el.msg.textContent = text;
  el.msg.className = big ? 'show big' : 'show';
  msgTimer = t;
}

// minimap: voetafdrukken uit het model, de baan en de karts
const mm = { W: 220, H: 230, x0: -52, x1: 52, z0: -22, z1: 106 };
mm.s = Math.min(mm.W / (mm.x1 - mm.x0), mm.H / (mm.z1 - mm.z0));
const mmBg = document.createElement('canvas');
{
  mmBg.width = mm.W; mmBg.height = mm.H;
  const c = mmBg.getContext('2d');
  const X = (x) => (x - mm.x0) * mm.s, Z = (z) => (z - mm.z0) * mm.s;
  c.fillStyle = 'rgba(70,100,50,.35)';
  c.fillRect(X(-72), Z(-5), (144) * mm.s, 127 * mm.s);
  for (const f of world.footprints) {
    c.fillStyle = f.fill;
    c.beginPath();
    f.pts.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))));
    c.closePath();
    c.fill();
  }
  c.lineCap = c.lineJoin = 'round';
  for (const [w, col] of [[6, 'rgba(20,20,22,.85)'], [3, '#e9e4da']]) {
    c.lineWidth = w;
    c.strokeStyle = col;
    c.beginPath();
    for (let j = 0; j <= S.N; j++) {
      const k = j % S.N;
      j ? c.lineTo(X(S.x[k]), Z(S.z[k])) : c.moveTo(X(S.x[k]), Z(S.z[k]));
    }
    c.stroke();
  }
  // binnen-stuk gestippeld in rood
  c.setLineDash([3, 3]);
  c.strokeStyle = '#c4141e';
  c.lineWidth = 3;
  c.beginPath();
  let on = false;
  for (let j = 0; j < S.N; j++) {
    if (S.indoor[j]) { on ? c.lineTo(X(S.x[j]), Z(S.z[j])) : c.moveTo(X(S.x[j]), Z(S.z[j])); on = true; } else on = false;
  }
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = '#fff';
  c.fillRect(X(S.x[0]) - 1, Z(S.z[0]) - 6, 3, 12);
}
const mmCtx = el.minimap.getContext('2d');
function drawMinimap() {
  mmCtx.clearRect(0, 0, mm.W, mm.H);
  mmCtx.drawImage(mmBg, 0, 0);
  for (const k of [...karts].reverse()) {
    const x = (k.pos.x - mm.x0) * mm.s, z = (k.pos.z - mm.z0) * mm.s;
    mmCtx.fillStyle = k.color;
    mmCtx.strokeStyle = k === player ? '#fff' : 'rgba(0,0,0,.7)';
    mmCtx.lineWidth = k === player ? 2.5 : 1.5;
    mmCtx.beginPath();
    mmCtx.arc(x, z, k === player ? 5 : 4, 0, Math.PI * 2);
    mmCtx.fill();
    mmCtx.stroke();
  }
}

// --------------------------------------------------------------------------
// besturing
const keys = new Set();
let camMode = 0;
let paused = false;
addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (state === 'race' && (e.code === 'KeyE' || e.code === 'KeyX' || e.code === 'ControlLeft')) player.useItem(itemWorld);
  if (state === 'race' && e.code === 'KeyR') player.respawn(track);
  if (e.code === 'KeyC') camMode = (camMode + 1) % 3;
  if ((e.code === 'KeyP' || e.code === 'Escape') && (state === 'race' || state === 'countdown')) setPaused(!paused);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); if (state === 'race') setPaused(true); });
function setPaused(p) {
  paused = p;
  el.pause.hidden = !p;
}
// aanraakbesturing (telefoon, tablet)
const touch = IS_TOUCH ? new TouchControls() : null;
if (touch) document.body.classList.add('touch');

let steerSmooth = 0;
function playerInput(dt) {
  const k = (...c) => c.some((x) => keys.has(x));
  let throttle = (k('ArrowUp', 'KeyW') ? 1 : 0) - (k('ArrowDown', 'KeyS') ? 1 : 0);
  let target = (k('ArrowRight', 'KeyD') ? 1 : 0) - (k('ArrowLeft', 'KeyA') ? 1 : 0);
  let drift = k('Space', 'ShiftLeft', 'ShiftRight');
  if (touch) {
    if (!throttle) throttle = touch.throttle;
    if (!target) target = touch.steer;
    drift = drift || touch.drift;
  }
  steerSmooth += (target - steerSmooth) * Math.min(1, dt * (target === 0 ? 14 : 9));
  return { throttle, steer: steerSmooth, drift };
}

// --------------------------------------------------------------------------
// race
let state = 'menu';
let raceTime = 0;
let countdown = 0;
let doneTimer = 0;

function startRace() {
  grid0();
  for (const it of items) { it.timer = 0; it.mesh.visible = true; }
  for (const b of bananas) scene.remove(b.mesh);
  bananas.length = 0;
  raceTime = 0;
  countdown = 3.2;
  state = 'countdown';
  el.menu.hidden = true;
  el.results.hidden = true;
  el.hud.hidden = false;
  setPaused(false);
  camSnap = true;
}

function step(dt) {
  if (state === 'countdown') {
    const before = Math.ceil(countdown - 0.2);
    countdown -= dt;
    const now = Math.ceil(countdown - 0.2);
    if (now !== before && now > 0) message(String(now), 0.9, true);
    if (countdown <= 0.2) { state = 'race'; message('START!', 1.0, true); }
    for (const k of karts) k.syncMesh(track, dt);
    return;
  }
  if (state !== 'race' && state !== 'done') return;
  raceTime += dt;

  for (const k of karts) {
    let input;
    const ai = ais.find((a) => a.kart === k);
    if (ai) input = ai.think(dt, track, k === player ? null : player);
    else if (k.finished) input = { throttle: 0, steer: 0, drift: false };
    else input = playerInput(dt);
    k.steerVis = -input.steer * 0.4;
    if (input.item) k.useItem(itemWorld);
    const prev = k.idx;
    k.update(dt, input, track, grid);
    k.stuckMax = Math.max(k.stuckMax ?? 0, k.stuck);

    // afgelegde weg en rondes
    let d = k.idx - prev;
    if (d < -S.N / 2) d += S.N;
    if (d > S.N / 2) d -= S.N;
    const lapBefore = Math.floor(k.dist / S.N);
    k.dist += d;
    const lapNow = Math.floor(k.dist / S.N);
    if (lapNow > lapBefore && lapNow >= 1 && lapNow > k.lapTimes.length && !k.finished) {
      const t = raceTime - (k.lapStart ?? 0);
      k.lapTimes.push(t);
      k.lapStart = raceTime;
      if (k === player) {
        if (bestLap === null || t < bestLap) {
          bestLap = t;
          try { localStorage.setItem('rhk-best-lap', String(t)); } catch { /* geen opslag */ }
        }
        if (lapNow === LAPS - 1) message('Laatste ronde!', 2);
        else if (lapNow < LAPS) message(`Ronde ${lapNow + 1}`, 1.5);
      }
      if (lapNow >= LAPS) {
        k.finished = true;
        k.finishTime = raceTime;
        if (k === player) { message('FINISH!', 2.5, true); state = 'done'; doneTimer = 0; }
      }
    }

    // boostpads
    if (k.grounded) {
      for (const p of track.pads) {
        let dj = k.idx - p.j;
        if (dj < -S.N / 2) dj += S.N;
        if (dj >= -3 && dj <= 3 && Math.abs(k.lat) < 1.2) k.boost = Math.max(k.boost, 1.0);
      }
    }
  }

  // karts tegen elkaar
  for (let a = 0; a < karts.length; a++) for (let b = a + 1; b < karts.length; b++) {
    const A = karts[a], B = karts[b];
    const dx = B.pos.x - A.pos.x, dz = B.pos.z - A.pos.z, dy = B.pos.y - A.pos.y;
    const d = Math.hypot(dx, dz);
    if (d < 1.5 && d > 1e-4 && Math.abs(dy) < 1) {
      const nx = dx / d, nz = dz / d, push = (1.5 - d) / 2;
      A.pos.x -= nx * push; A.pos.z -= nz * push;
      B.pos.x += nx * push; B.pos.z += nz * push;
      const rel = (B.vx - A.vx) * nx + (B.vz - A.vz) * nz;
      if (rel < 0) {
        A.vx += nx * rel * 0.5; A.vz += nz * rel * 0.5;
        B.vx -= nx * rel * 0.5; B.vz -= nz * rel * 0.5;
      }
    }
  }

  // itemblokken
  for (const it of items) {
    if (it.timer > 0) { it.timer -= dt; if (it.timer <= 0) it.mesh.visible = true; continue; }
    for (const k of karts) {
      if (k.pos.distanceToSquared(it.mesh.position) < 1.6 * 1.6 + 0.9) {
        it.timer = 4;
        it.mesh.visible = false;
        if (!k.item) {
          const rank = karts.filter((o) => o.dist > k.dist).length;
          k.item = Math.random() < 0.3 + rank * 0.18 ? 'paddenstoel' : 'banaan';
        }
        break;
      }
    }
  }
  // bananen
  for (let i = bananas.length - 1; i >= 0; i--) {
    const b = bananas[i];
    b.age += dt;
    for (const k of karts) {
      if (b.owner === k && b.age < 0.6) continue;
      if (k.pos.distanceToSquared(b.mesh.position) < 1.0 && k.spin <= 0) {
        k.spin = 0.9;
        k.vx *= 0.35; k.vz *= 0.35;
        if (k === player) message('Uitgegleden!', 1);
        scene.remove(b.mesh);
        bananas.splice(i, 1);
        break;
      }
    }
  }

  if (state === 'done') {
    doneTimer += dt;
    if (doneTimer > 3 && !TEST) showResults();
  }
}

function standings() {
  return [...karts].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    return b.dist - a.dist;
  });
}

let resultsShown = false;
function showResults() {
  if (resultsShown) return;
  resultsShown = true;
  const list = standings();
  el.resultsList.innerHTML = list.map((k, i) => {
    const t = k.finished ? fmt(k.finishTime) : 'onderweg';
    return `<li class="${k === player ? 'me' : ''}"><span class="place">${i + 1}</span><span class="dot" style="background:${k.color}"></span><span class="name">${k.name}</span><span class="t">${t}</span></li>`;
  }).join('');
  const lapsTxt = player.lapTimes.map((t, i) => `ronde ${i + 1}: ${fmt(t)}`).join(' · ');
  $('results-laps').textContent = lapsTxt + (bestLap ? ` · beste ronde ooit: ${fmt(bestLap)}` : '');
  el.results.hidden = false;
  if (touch) touch.el.hidden = true;
}

// --------------------------------------------------------------------------
// camera
let camSnap = true;
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
let camYaw = 0;
let indoorBlend = 0;
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3();

function updateCamera(dt) {
  const k = player;
  // binnen (en net na de sprong) volgt de camera de baan, zodat hij niet door muren gaat
  let inside = false;
  for (let s = 0; s <= 24; s += 3) if (S.indoor[(k.idx - s + S.N) % S.N]) inside = true;
  indoorBlend += ((inside ? 1 : 0) - indoorBlend) * Math.min(1, dt * 4);
  if (camSnap) indoorBlend = inside ? 1 : 0;

  let dyaw = k.h - camYaw;
  dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
  camYaw += dyaw * Math.min(1, dt * (camSnap ? 1e3 : 5));

  const far = camMode === 1;
  const dist = far ? 8.5 : 5.6, height = far ? 3.6 : 2.3;
  const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
  // buiten: recht achter de kart
  tmpA.set(k.pos.x - fx * dist, k.pos.y + height, k.pos.z - fz * dist);
  // binnen: een stuk terug langs de baan
  const back = Math.round(4.2 / S.step);
  const jb = (k.idx - back + S.N) % S.N;
  track.point(jb, k.lat * 0.6, tmpB);
  tmpB.y = Math.max(S.floor[jb] + 1.75, k.pos.y + 1.45);
  if (camMode === 2) {
    // achteruitkijken
    tmpA.set(k.pos.x + fx * 4.5, k.pos.y + 1.8, k.pos.z + fz * 4.5);
    tmpB.copy(tmpA);
  }
  tmpC.copy(tmpA).lerp(tmpB, indoorBlend);
  if (camSnap) camPos.copy(tmpC);
  else camPos.lerp(tmpC, 1 - Math.exp(-dt * (indoorBlend > 0.5 ? 12 : 7)));

  const lookAhead = camMode === 2 ? -4 : 4;
  tmpA.set(k.pos.x + Math.sin(k.h) * lookAhead, k.pos.y + 0.9, k.pos.z + Math.cos(k.h) * lookAhead);
  if (camSnap) camLook.copy(tmpA); else camLook.lerp(tmpA, 1 - Math.exp(-dt * 10));
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  const fov = 70 + (k.boost > 0 ? 8 : 0) + Math.min(6, k.speed * 0.2);
  camera.fov += (fov - camera.fov) * Math.min(1, dt * 4);
  camera.updateProjectionMatrix();
  camSnap = false;
}

// --------------------------------------------------------------------------
function updateHud() {
  const lap = Math.min(LAPS, Math.max(1, Math.floor(player.dist / S.N) + 1));
  el.lap.innerHTML = `<small>Ronde</small> ${lap}<small>/${LAPS}</small>`;
  const place = standings().indexOf(player) + 1;
  el.pos.innerHTML = `${place}<small>${place === 1 ? 'ste' : 'de'}</small>`;
  el.time.textContent = fmt(raceTime);
  el.best.textContent = bestLap ? `beste ronde ${fmt(bestLap)}` : '';
  el.speed.innerHTML = `${Math.round(player.speed * 3.6)}<small> km/u</small>`;
  el.zone.textContent = track.zone(player.idx);
  el.item.className = player.item ? 'has ' + player.item : '';
  if (touch) $('t-item').className = player.item ?? '';
  el.item.title = player.item ?? '';
  drawMinimap();
}

function animate(dt, t) {
  for (const it of items) {
    it.mesh.rotation.set(0.4, t * 1.6 + it.ph, 0.2);
    it.mesh.position.y += Math.sin(t * 2.4 + it.ph) * 0.004;
  }
  for (const p of track.pads) p.mesh.material.color.setHSL(0, 0, 0.85 + 0.15 * Math.sin(t * 8));
  if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) el.msg.className = ''; }
}

// --------------------------------------------------------------------------
el.loading.hidden = true;
$('btn-start').addEventListener('click', () => { touch?.begin(); resultsShown = false; startRace(); });
$('btn-again').addEventListener('click', () => { touch?.begin(); resultsShown = false; startRace(); });
$('btn-resume').addEventListener('click', () => setPaused(false));
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// menu-achtergrond: de camera draait langzaam om het klooster
function menuCamera(t) {
  const a = t * 0.06 + 2.4;
  camera.position.set(Math.sin(a) * 85, 38, 40 + Math.cos(a) * 85);
  camera.lookAt(0, 6, 34);
  camera.fov = 50;
  camera.updateProjectionMatrix();
}

grid0();
const clock = new THREE.Clock();
let elapsed = 0;

if (TEST) runTest();
else if (HASH.startsWith('view=') || HASH.startsWith('cam=')) viewMode();
else renderer.setAnimationLoop(frame);

function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  elapsed += dt;
  if (touch) {
    if (touch.takePause() && (state === 'race' || state === 'countdown')) setPaused(!paused);
    if (touch.takeItem() && state === 'race' && !paused) player.useItem(itemWorld);
  }
  if (!paused) {
    // vaste stapjes voor stabiele fysica
    const n = Math.ceil(dt / (1 / 120));
    for (let i = 0; i < n; i++) step(dt / n);
  }
  animate(dt, elapsed);
  if (state === 'menu') menuCamera(elapsed);
  else { updateCamera(paused ? 0 : dt); updateHud(); }
  renderer.render(scene, camera);
}

// --------------------------------------------------------------------------
// #view=<punt> of #cam=x,y,z,tx,ty,tz: vast beeld, voor schermafdrukken
function viewMode() {
  el.menu.hidden = true;
  el.hud.hidden = false;
  if (touch) { touch.el.hidden = false; document.body.classList.add('touching'); }
  if (HASH.startsWith('view=')) {
    const [wp, lat] = HASH.slice(5).split(',').map(Number);
    if (Number.isNaN(wp)) grid0();                    // #view=start: de startopstelling
    else {
      player.place(track, track.firstOf(wp), lat || 0);
      karts.slice(1).forEach((k, i) => k.place(track, track.firstOf(wp), (i - 1) * 1.6, 5 + i * 3));
    }
    state = 'race';
    camSnap = true;
    updateCamera(0.016);
    updateHud();
  } else {
    const v = HASH.slice(4).split(',').map(Number);
    camera.position.set(v[0], v[1], v[2]);
    camera.lookAt(v[3], v[4], v[5]);
  }
  renderer.setAnimationLoop(() => {
    animate(0.016, (elapsed += 0.016));
    renderer.render(scene, camera);
  });
}

// --------------------------------------------------------------------------
// #test: race zonder beeld met vier computerkarts, plus een controle van de baan
function runTest() {
  const report = { lapLength: +S.total.toFixed(1), samples: S.N, blocked: [], karts: [] };
  // baancontrole: raakt de middenlijn buiten ergens een botsingsbox?
  for (let j = 0; j < S.N; j++) {
    if (S.indoor[j] || S.jump[j]) continue;
    for (const lat of [-1, 0, 1]) {
      const l = lat * Math.max(0, S.hw[j] - 1.2);
      const x = S.x[j] - S.tz[j] * l, z = S.z[j] + S.tx[j] * l;
      for (const c of grid.near(x, z)) {
        if (c.y0 > 1.2 || c.y1 < 0.1) continue;
        if (x > c.x0 - 0.7 && x < c.x1 + 0.7 && z > c.z0 - 0.7 && z < c.z1 + 0.7) {
          report.blocked.push({ j, seg: S.seg[j], lat: +l.toFixed(1), x: +x.toFixed(1), z: +z.toFixed(1), box: [c.x0, c.z0, c.x1, c.z1].map((v) => +v.toFixed(2)) });
          break;
        }
      }
    }
  }
  startRace();
  countdown = 0;
  state = 'race';
  const dt = 1 / 120;
  let t = 0;
  const zoneTime = {};
  function chunk() {
    for (let i = 0; i < 6000 && t < 320; i++) {
      step(dt);
      t += dt;
      const z = track.zone(player.idx);
      zoneTime[z] = (zoneTime[z] ?? 0) + dt;
      if (karts.every((k) => k.finished)) { t = 1e9; break; }
    }
    if (t < 320) { setTimeout(chunk, 0); return; }
    report.simTime = +raceTime.toFixed(1);
    report.karts = karts.map((k) => ({
      name: k.name, finished: k.finished, time: +k.finishTime.toFixed(2), laps: k.lapTimes.map((v) => +v.toFixed(2)),
      respawns: k.respawns, where: k.respawnLog, wallHits: k.wallHits, stuckMax: +(k.stuckMax ?? 0).toFixed(2), dist: k.dist,
    }));
    report.zoneTimeFirstKart = Object.fromEntries(Object.entries(zoneTime).map(([a, b]) => [a, +b.toFixed(1)]));
    report.colliders = world.colliders.length;
    const pre = document.createElement('pre');
    pre.id = 'report';
    pre.textContent = JSON.stringify(report, null, 1);
    document.body.innerHTML = '';
    document.body.appendChild(pre);
    document.title = 'DONE';
  }
  chunk();
}

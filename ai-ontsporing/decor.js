'use strict';
/* =============================================================================
   decor.js — bouwstenen die meerdere scènes delen: lichtlinten over de grond,
   rastervloer, raam- en schermtexturen, lopende figuren, bomen, windmolens.
   ============================================================================= */

// Plat lint langs een curve dat kan "groeien": grow(0..1) zet het tekenbereik
function ribbon(curve, width, n, material, y = 0.012) {
  const pts = curve.getSpacedPoints(n), pos = new Float32Array(n * 18);
  const side = i => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
    return [-dz / l * width / 2, dx / l * width / 2];
  };
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[i + 1], sa = side(i), sb = side(i + 1);
    const v = [
      a.x - sa[0], a.z - sa[1], a.x + sa[0], a.z + sa[1], b.x - sb[0], b.z - sb[1],
      b.x - sb[0], b.z - sb[1], a.x + sa[0], a.z + sa[1], b.x + sb[0], b.z + sb[1],
    ];
    for (let k = 0; k < 6; k++) pos.set([v[k * 2], y + (k === 0 || k === 1 || k === 4 ? a.y : b.y), v[k * 2 + 1]], i * 18 + k * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.Mesh(g, material);
  m.frustumCulled = false;
  m.grow = k => g.setDrawRange(0, Math.floor(clamp01(k) * n) * 6);
  return m;
}

// Donkere vloer met een fijn lichtraster (herhalende textuur)
function gridTexture(bg = '#07080c', line = 'rgba(160,180,220,0.16)', cells = 4) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = line; g.lineWidth = 2;
  for (let i = 0; i <= cells; i++) {
    const p = i * 256 / cells;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 256); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(256, p); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = 8;
  return tex;
}

// Gevel met ramen; lit = kans dat een raam brandt
function windowTexture(cols, rows, o = {}) {
  const c = document.createElement('canvas');
  c.width = cols * 16; c.height = rows * 16;
  const g = c.getContext('2d'), r = rng(o.seed || 1);
  g.fillStyle = o.wall || '#0d1016'; g.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const on = r() < (o.lit === undefined ? 0.7 : o.lit);
    g.fillStyle = on ? (o.light || '#bfe6ff') : (o.dark || '#1a2028');
    g.globalAlpha = on ? 0.6 + r() * 0.4 : 1;
    g.fillRect(x * 16 + 3, y * 16 + 3, 10, 10);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

// Beeldscherm-inhoud: titelbalk + regels tekst, als textuur
function screenTexture(title, lines, o = {}) {
  const W = 512, H = 300, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = o.bg || '#0f1620'; g.fillRect(0, 0, W, H);
  g.fillStyle = o.bar || '#1f2b3a'; g.fillRect(0, 0, W, 46);
  g.font = '600 24px "JetBrains Mono", ui-monospace, monospace';
  g.textBaseline = 'middle';
  g.fillStyle = o.accent || '#7dd3fc'; g.fillText(title, 18, 24);
  g.font = '500 22px "JetBrains Mono", ui-monospace, monospace';
  lines.forEach((l, i) => {
    g.fillStyle = l.startsWith('✓') ? (o.accent || '#7dd3fc') : l.startsWith('!') ? '#fca5a5' : (o.ink || '#cbd5e1');
    g.fillText(l, 18, 82 + i * 36);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = 4;
  return tex;
}

// Scherm (vlak met textuur) dat altijd helder blijft
function screenMesh(parent, w, h, tex, x, y, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// Figuur uit env.js laten lopen; ph = fase van de stap
function walkFigure(f, ph, a = 1, extra) {
  const s = Math.sin(ph);
  f.setPose(Object.assign({ lSh: -0.35 * a * s, rSh: 0.35 * a * s, lEl: 0.25, rEl: 0.25 }, extra || {}));
  f.J.lHip.rotation.x = -0.45 * a * s;
  f.J.rHip.rotation.x = 0.45 * a * s;
  f.J.lKnee.rotation.x = 0.6 * a * Math.max(0, Math.cos(ph));
  f.J.rKnee.rotation.x = 0.6 * a * Math.max(0, -Math.cos(ph));
  f.J.hips.position.y = 0.93 + 0.02 * Math.abs(Math.cos(ph)) * a;
}

// Boom: stam + kruin van een paar bollen
function tree(parent, x, z, s = 1, seed = 1, leaf = 0x3f7a34) {
  const g = new THREE.Group(), r = rng(seed);
  g.position.set(x, 0, z); g.scale.setScalar(s);
  cyl(g, 0.08, 0.12, 1.4, mat(0x5a4030, 0.9), 0, 0.7, 0, 8);
  const lm = mat(leaf, 0.85);
  for (let i = 0; i < 4; i++) {
    const b = mesh(new THREE.IcosahedronGeometry(0.55 + r() * 0.25, 1), lm, (r() - 0.5) * 0.6, 1.7 + r() * 0.5, (r() - 0.5) * 0.6, g);
    b.rotation.set(r() * 3, r() * 3, 0);
  }
  parent.add(g);
  return g;
}

// Windmolen; geeft de rotor terug om te draaien (rotation.z)
function turbine(parent, x, z, h = 14) {
  const white = mat(0xeef2f5, 0.5);
  cyl(parent, 0.18, 0.35, h, white, x, h / 2, z, 12);
  const hub = new THREE.Group(); hub.position.set(x, h, z + 0.35); parent.add(hub);
  sphere(hub, 0.3, white, 0, 0, 0);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Group(); arm.rotation.z = i * TAU / 3; hub.add(arm);
    box(arm, 0.32, h * 0.42, 0.06, white, 0, h * 0.21, 0);
  }
  return hub;
}

// Verlopende lucht (koepel), zoals humanoid-showreel/env.js
function skyDome(scene, top, horizon, bottom, R = 220) {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(horizon) }, bot: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;' +
      'void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.55)) : mix(mid, bot, pow(-h, 0.4)); gl_FragColor = vec4(c, 1.0); }',
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 16), m);
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  scene.add(dome);
  return dome;
}

// Sterren op een bol met straal R
function starField(scene, n, R, seed = 5, opacity = 0.8) {
  const r = rng(seed), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const y = r() * 0.95 + 0.05, a = r() * TAU, s = Math.sqrt(1 - y * y);
    p.set([s * Math.cos(a) * R, y * R, s * Math.sin(a) * R], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false, transparent: true, opacity, fog: false, depthWrite: false }));
  pts.frustumCulled = false;
  scene.add(pts);
  return pts;
}

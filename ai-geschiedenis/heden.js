'use strict';
/* =============================================================================
   heden.js — scènes 6 t/m 10: diep leren, AlphaGo, taalmodellen,
   datacenters en AlphaFold. Zelfde opzet als verleden.js.
   ============================================================================= */

// =============================================================================
// 6 — 2012: diep leren. Een netwerk herkent een kat
// =============================================================================
function sceneDeep() {
  const scene = stage(0x04060a, 7, 22);
  lights(scene, { sky: 0x6a8aa8, ground: 0x050608, hemi: 0.3, sunI: 0.5, sunPos: V(2, 8, 4), shadow: 6 });
  floor(scene, 0x07090c, 0.3, 0.5);
  const grid = new THREE.GridHelper(40, 80, 0x1d4456, 0x0c1a22);
  grid.position.y = 0.002;
  scene.add(grid);

  // invoer: een gepixelde kat
  const ic = document.createElement('canvas'); ic.width = ic.height = 24;
  const g = ic.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 24); grd.addColorStop(0, '#6a8a5a'); grd.addColorStop(1, '#3a5a3a');
  g.fillStyle = grd; g.fillRect(0, 0, 24, 24);
  g.fillStyle = '#d88a3a';
  g.beginPath(); g.ellipse(12, 15, 7.5, 6.5, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(5, 12); g.lineTo(6, 3); g.lineTo(11, 9); g.fill();
  g.beginPath(); g.moveTo(19, 12); g.lineTo(18, 3); g.lineTo(13, 9); g.fill();
  g.fillStyle = '#f0c890'; g.beginPath(); g.ellipse(12, 18, 3.5, 2.5, 0, 0, TAU); g.fill();
  g.fillStyle = '#1a2a10'; g.fillRect(8, 13, 2, 2); g.fillRect(14, 13, 2, 2);
  g.fillStyle = '#c04a4a'; g.fillRect(11, 16, 2, 1);
  const catTex = new THREE.CanvasTexture(ic);
  catTex.magFilter = THREE.NearestFilter; catTex.minFilter = THREE.NearestFilter; catTex.encoding = THREE.sRGBEncoding;
  const IX = -3.3, CY = 1.6;
  const input = mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: catTex, toneMapped: false, side: THREE.DoubleSide }), IX, CY, 0, scene, false);
  input.rotation.y = -Math.PI / 2;
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.01, 1.36, 1.36)), new THREE.LineBasicMaterial({ color: 0x7dd3fc }));
  frame.position.set(IX, CY, 0); scene.add(frame);

  // lagen met knopen
  const SIZES = [6, 5, 4, 3], SP = 0.27, nodes = [];
  SIZES.forEach((n, L) => {
    const x = -2.0 + L * 1.25;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) nodes.push({ L, p: V(x, CY + (i - (n - 1) / 2) * SP, (j - (n - 1) / 2) * SP), a: 0.3 + 0.7 * hash(nodes.length * 3.1) });
  });
  const OUT = ['kat  97 %', 'hond  2 %', 'auto  1 %'];
  OUT.forEach((_, k) => nodes.push({ L: 4, p: V(3.1, CY + (1 - k) * 0.5, 0), a: k === 0 ? 1 : 0.15, out: k }));
  // invoerpunten op het plaatje
  const inPts = [];
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) inPts.push(V(IX + 0.01, CY + (i - 3) * 0.17, (j - 3) * 0.17));

  const nodeMesh = instanced(new THREE.SphereGeometry(0.055, 14, 10), new THREE.MeshBasicMaterial({ toneMapped: false }), nodes.length);
  const o = new THREE.Object3D();
  nodes.forEach((n, i) => { o.position.copy(n.p); o.scale.setScalar(n.L === 4 ? 1.8 : 1); o.updateMatrix(); nodeMesh.setMatrixAt(i, o.matrix); nodeMesh.setColorAt(i, C(0x1a2a34)); });
  scene.add(nodeMesh);

  // verbindingen tussen opeenvolgende lagen
  const r = rng(42), links = [];
  const layer = L => (L < 0 ? inPts : nodes.filter(n => n.L === L).map(n => n.p));
  for (let L = -1; L < 4; L++) {
    const A = layer(L), B = layer(L + 1), n = L < 0 ? 90 : 70;
    for (let k = 0; k < n; k++) links.push([A[Math.floor(r() * A.length)], B[Math.floor(r() * B.length)], L]);
  }
  const lp = [];
  for (const [a, b] of links) lp.push(a.x, a.y, a.z, b.x, b.y, b.z);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: C(0x38bdf8), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
  scene.add(new THREE.LineSegments(lg, lineMat));
  // pulsen langs de verbindingen
  const NP = 260, pp = new Float32Array(NP * 3), pinfo = [];
  for (let i = 0; i < NP; i++) pinfo.push({ l: links[Math.floor(r() * links.length)], ph: r() });
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const pm = new THREE.PointsMaterial({ color: C(0xbfe9ff), size: 0.06, map: dotTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; scene.add(pts);

  const labels = OUT.map((s, k) => {
    const l = label(s, 0.17, { size: 56, weight: 600, color: k === 0 ? '#ffffff' : '#7a8a96', pad: 10 });
    l.geometry.translate(l.userData.w / 2, 0, 0);
    l.position.set(3.32, CY + (1 - k) * 0.5, 0); scene.add(l);
    return l;
  });

  // twee grafische kaarten als sokkel
  const fans = [];
  [-0.55, 0.55].forEach(z => {
    const gpu = new THREE.Group(); gpu.position.set(0.4, 0.32, z); scene.add(gpu);
    box(gpu, 2.6, 0.16, 0.9, mat(0x1a1d22, 0.35, 0.7), 0, 0, 0);
    box(gpu, 2.6, 0.02, 0.9, mat(0x2e333a, 0.3, 0.8), 0, 0.09, 0);
    box(gpu, 2.5, 0.02, 0.03, glow(0x4ade80), 0, 0.0, 0.46, false);
    for (const x of [-0.75, 0, 0.75]) {
      cyl(gpu, 0.3, 0.3, 0.02, mat(0x0c0e10, 0.5, 0.3), x, 0.1, 0, 30);
      const f = new THREE.Group(); f.position.set(x, 0.115, 0); gpu.add(f);
      for (let b = 0; b < 7; b++) { const bl = box(f, 0.26, 0.008, 0.08, mat(0x30353c, 0.4, 0.5), 0.13, 0, 0, false); bl.geometry.translate(0, 0, 0); bl.rotation.y = 0; const piv = new THREE.Group(); piv.rotation.y = b / 7 * TAU; piv.add(bl); bl.rotation.x = 0.35; f.add(piv); }
      fans.push(f);
    }
  });

  const off = C(0x14232c), hi = C(0x7dd3fc), white = C(0xffffff), col = new THREE.Color();
  const cam = camPath([
    [0, [-5.4, 2.0, 2.4], [-3.2, 1.6, 0], 36],
    [4.5, [-2.2, 2.7, 4.6], [-1.0, 1.5, 0], 38],
    [9.0, [1.8, 2.2, 3.6], [2.4, 1.55, 0], 36],
    [13, [4.8, 2.6, 4.4], [1.0, 1.35, 0], 40],
  ]);

  return {
    y0: 2006, y1: 2012, phase: 'heden', era: 'Doorbraak · 2012', duration: 13,
    title: 'Diep leren',
    txt: 'Het idee van kunstmatige neurale netwerken is oud, maar pas nu zijn er genoeg data en rekenkracht. Grafische kaarten uit de gamewereld doen duizenden kleine sommen tegelijk. Een netwerk met acht lagen, AlexNet, leert zelf welke vormen een kat een kat maken.',
    fact: 'ImageNet 2012: AlexNet zat bij het herkennen van foto’s in 1000 categorieën 15 procent van de tijd fout, tegen 26 procent voor de beste concurrent. Het werd getraind op twee gamekaarten.',
    hud: [
      { at: 1.0, text: '1,2 MLN TRAININGSFOTO’S' },
      { at: 1.7, text: '60 MLN PARAMETERS' },
      { at: 2.4, text: 'GPU × 2' },
    ],
    scene,
    update(t) {
      const ph = frac((t - 0.8) / 4.2), front = lerp(-3.6, 3.6, ph), live = smooth(seg(t, 0.8, 1.6));
      const done = smooth(seg(t, 5.5, 7));
      nodes.forEach((n, i) => {
        const w = Math.exp(-Math.pow((n.p.x - front) / 0.45, 2)) * live;
        let v = 0.12 + n.a * w;
        if (n.L === 4) v = Math.max(v, n.a * done);
        nodeMesh.setColorAt(i, col.copy(off).lerp(n.L === 4 && n.out === 0 && done > 0.5 ? white : hi, clamp01(v)));
      });
      nodeMesh.instanceColor.needsUpdate = true;
      pm.opacity = 0.9 * live;
      pinfo.forEach((q, i) => {
        const [a, b] = q.l, u = frac(q.ph + t * 0.7);
        pp[i * 3] = lerp(a.x, b.x, u); pp[i * 3 + 1] = lerp(a.y, b.y, u); pp[i * 3 + 2] = lerp(a.z, b.z, u);
      });
      pg.attributes.position.needsUpdate = true;
      lineMat.opacity = 0.06 + 0.1 * live;
      labels.forEach((l, k) => { l.material.opacity = smooth(seg(t, 5.8 + k * 0.25, 6.6 + k * 0.25)); });
      fans.forEach((f, i) => { f.rotation.y = t * (9 + i); });
    },
    camera(t, c) {
      cam(t, c);
      labels.forEach(l => l.quaternion.copy(c.quaternion));
    },
  };
}

// =============================================================================
// 7 — 2016: AlphaGo en zet 37
// =============================================================================
function sceneGo() {
  const scene = stage(0x0d0a07, 3, 12);
  lights(scene, { sky: 0xffe8c8, ground: 0x2a2018, hemi: 0.35, sun: 0xfff0dc, sunI: 0.9, sunPos: V(1.5, 5, 2), shadow: 1.2 });
  const key = spot(scene, 0xfff2dc, 2.2, V(-0.3, 2.4, 0.5), V(0, 0.2, 0), 0.5, 0.6, 6);
  // tatami
  const tc = document.createElement('canvas'); tc.width = 256; tc.height = 512;
  const tg = tc.getContext('2d'); tg.fillStyle = '#b8a670'; tg.fillRect(0, 0, 256, 512);
  for (let y = 0; y < 512; y += 3) { tg.fillStyle = y % 6 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)'; tg.fillRect(0, y, 256, 2); }
  tg.fillStyle = '#2a2a24'; tg.fillRect(0, 0, 10, 512); tg.fillRect(246, 0, 10, 512);
  const tex = new THREE.CanvasTexture(tc); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(8, 4); tex.encoding = THREE.sRGBEncoding;
  floor(scene, 0xffffff, 0.85, 0, 16, tex);
  // shoji-wanden met licht erachter
  const sc = document.createElement('canvas'); sc.width = sc.height = 256;
  const sg = sc.getContext('2d'); sg.fillStyle = '#f4e6c8'; sg.fillRect(0, 0, 256, 256); sg.fillStyle = '#3a2a1a';
  for (let i = 0; i <= 4; i++) { sg.fillRect(i * 63, 0, 4, 256); sg.fillRect(0, i * 63, 256, 4); }
  const stex = new THREE.CanvasTexture(sc); stex.wrapS = stex.wrapT = THREE.RepeatWrapping; stex.repeat.set(6, 2); stex.encoding = THREE.sRGBEncoding;
  const shoji = new THREE.MeshBasicMaterial({ map: stex, color: C(0xc8a878), toneMapped: false });
  mesh(new THREE.PlaneGeometry(9, 2.6), shoji, 0, 1.3, -2.4, scene, false);
  const side = mesh(new THREE.PlaneGeometry(9, 2.6), shoji, -2.6, 1.3, 0, scene, false); side.rotation.y = Math.PI / 2;

  // goban
  const N = 19, BW = 0.46, GS = 0.42, CELL = GS / 18, TOP = 0.2;
  const bc = document.createElement('canvas'); bc.width = bc.height = 1024;
  const bg = bc.getContext('2d');
  bg.fillStyle = '#d9a95e'; bg.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 60; i++) { bg.strokeStyle = 'rgba(120,70,20,' + (0.04 + hash(i) * 0.06) + ')'; bg.lineWidth = 2 + hash(i + 9) * 6; bg.beginPath(); bg.moveTo(0, hash(i * 3) * 1024); bg.bezierCurveTo(300, hash(i * 5) * 1024, 700, hash(i * 7) * 1024, 1024, hash(i * 11) * 1024); bg.stroke(); }
  const px = 1024 * GS / BW, m0 = (1024 - px) / 2, step = px / 18;
  bg.strokeStyle = '#1a120a'; bg.lineWidth = 2.4;
  for (let i = 0; i < N; i++) { bg.beginPath(); bg.moveTo(m0, m0 + i * step); bg.lineTo(m0 + px, m0 + i * step); bg.moveTo(m0 + i * step, m0); bg.lineTo(m0 + i * step, m0 + px); bg.stroke(); }
  bg.fillStyle = '#1a120a';
  for (const a of [3, 9, 15]) for (const b of [3, 9, 15]) { bg.beginPath(); bg.arc(m0 + a * step, m0 + b * step, 6, 0, TAU); bg.fill(); }
  const btex = new THREE.CanvasTexture(bc); btex.encoding = THREE.sRGBEncoding; btex.anisotropy = 8;
  const wood = mat(0xc8924a, 0.55);
  box(scene, BW, TOP - 0.06, BW + 0.03, wood, 0, (TOP + 0.06) / 2, 0);
  for (const x of [-0.15, 0.15]) for (const z of [-0.15, 0.15]) cyl(scene, 0.035, 0.025, 0.06, mat(0x6a4422, 0.6), x, 0.03, z, 12);
  const topM = mesh(new THREE.PlaneGeometry(BW, BW + 0.03), new THREE.MeshStandardMaterial({ map: btex, roughness: 0.45 }), 0, TOP + 0.0005, 0, scene);
  topM.rotation.x = -Math.PI / 2;
  // stenenpotten
  for (const [x, c] of [[-0.36, 0x111111], [0.36, 0xf0f0ea]]) {
    const pot = cyl(scene, 0.06, 0.07, 0.09, mat(0x5a3418, 0.5), x, 0.045, 0.12, 24);
    sphere(scene, 0.058, mat(c, 0.3), x, 0.09, 0.12).scale.set(1, 0.35, 1);
  }

  const stoneGeo = new THREE.SphereGeometry(CELL * 0.48, 24, 12);
  const SB = mat(0x121212, 0.25, 0.1), SW = mat(0xf2f0e8, 0.3);
  const posOf = (c, r) => V((c - 9) * CELL, TOP + CELL * 0.2, (r - 9) * CELL);
  function stone(c, r, black) { const m = mesh(stoneGeo, black ? SB : SW, 0, 0, 0, scene); m.scale.y = 0.42; m.position.copy(posOf(c, r)); return m; }
  const PRE = [[3, 15, 1], [15, 3, 0], [16, 15, 1], [2, 3, 0], [13, 16, 1], [5, 2, 0], [2, 10, 1], [16, 9, 0], [3, 13, 1], [15, 12, 0], [4, 16, 1], [16, 13, 0], [13, 2, 1], [15, 5, 0], [10, 16, 1], [3, 5, 0], [6, 15, 1], [16, 4, 0], [14, 3, 1], [14, 4, 0], [12, 3, 1], [13, 5, 0], [2, 15, 1], [4, 3, 0], [17, 14, 1], [16, 16, 0], [15, 16, 1], [17, 16, 0]];
  PRE.forEach(([c, r, b]) => stone(c, r, b));
  const ANIM = [[11, 15, 0], [4, 6, 1], [12, 15, 0], [15, 10, 1], [16, 11, 0], [14, 11, 1], [17, 12, 0], [15, 8, 1]].map(([c, r, b], i) => ({ m: stone(c, r, b), p: posOf(c, r), t0: 0.8 + i * 0.75 }));
  const P37 = posOf(14, 9);
  const s37 = stone(14, 9, 1);
  const ring = mesh(new THREE.RingGeometry(0.9, 1, 48), glowOwn(0x38bdf8, 0, true), P37.x, TOP + 0.002, P37.z, scene, false);
  ring.rotation.x = -Math.PI / 2;
  const ring2 = mesh(new THREE.RingGeometry(0.9, 1, 48), glowOwn(0x38bdf8, 0, true), P37.x, TOP + 0.002, P37.z, scene, false);
  ring2.rotation.x = -Math.PI / 2;
  const tag = label('37', 0.04, { size: 90, weight: 700, color: '#7dd3fc', pad: 6 });
  scene.add(tag);
  const T37 = 7.4;

  const cam = camPath([
    [0, [0.05, 0.95, 0.5], [0, 0.2, 0], 36],
    [5.5, [0.48, 0.52, 0.42], [0.04, 0.2, 0], 36],
    [9.0, [0.36, 0.33, 0.2], [P37.x, TOP, P37.z], 34],
    [13, [0.22, 0.27, 0.13], [P37.x - 0.02, TOP, P37.z - 0.01], 32],
  ]);

  return {
    y0: 2015, y1: 2016, phase: 'heden', era: 'Heden · 2016', duration: 13,
    title: 'Zet 37',
    txt: 'Go heeft meer mogelijke stellingen dan er atomen in het heelal zijn; vooruitrekenen zoals bij schaken werkt hier niet. AlphaGo leert van menselijke partijen en daarna door miljoenen keren tegen zichzelf te spelen. Tegen topspeler Lee Sedol doet het een zet die geen mens zou spelen. Commentatoren denken eerst aan een fout.',
    fact: 'Zet 37: AlphaGo schatte zelf de kans dat een mens deze zet zou kiezen op 1 op 10.000. Het won de match met 4–1.',
    hud: [
      { at: 1.0, text: 'TRAINING · ZELFSPEL' },
      { at: 7.6, text: 'ZET 37 · KANS 1 : 10.000' },
      { at: 8.4, text: 'EINDSTAND 4 – 1' },
    ],
    scene,
    update(t) {
      for (const a of ANIM) {
        const u = seg(t, a.t0, a.t0 + 0.5);
        a.m.visible = t >= a.t0;
        a.m.position.set(a.p.x, a.p.y + 0.05 * Math.pow(1 - easeOut(u), 2), a.p.z);
      }
      const u = seg(t, T37, T37 + 1.1);
      s37.visible = t >= T37;
      s37.position.set(P37.x, P37.y + 0.09 * Math.pow(1 - easeOut(u), 2), P37.z);
      const r1 = seg(t, T37 + 1.0, T37 + 3.2), r2 = seg(t, T37 + 1.7, T37 + 3.9);
      ring.scale.setScalar(0.01 + 0.09 * easeOut(r1)); ring.material.opacity = 0.9 * (1 - r1) * (r1 > 0 ? 1 : 0);
      ring2.scale.setScalar(0.01 + 0.09 * easeOut(r2)); ring2.material.opacity = 0.9 * (1 - r2) * (r2 > 0 ? 1 : 0);
      tag.material.opacity = smooth(seg(t, T37 + 1.2, T37 + 1.8));
      tag.position.set(P37.x, TOP + 0.045 + 0.004 * Math.sin(t * 2), P37.z);
      key.intensity = 2.2 + 0.6 * smooth(seg(t, T37 + 1, T37 + 2));
    },
    camera(t, c) {
      cam(t, c);
      tag.quaternion.copy(c.quaternion);
    },
  };
}

// =============================================================================
// 8 — 2017–2022: transformers en taalmodellen
// =============================================================================
function sceneTransformer() {
  const scene = stage(0x05070b, 6, 20);
  lights(scene, { sky: 0x7a90b0, ground: 0x05060a, hemi: 0.4, sunI: 0.3, sunPos: V(2, 8, 4), shadows: false });
  floor(scene, 0x080a0e, 0.25, 0.6);
  const grid = new THREE.GridHelper(40, 100, 0x18303c, 0x0c161c); grid.position.y = 0.002; scene.add(grid);

  const PROMPT = ['Kunnen', 'machines', 'denken', '?'];
  const GEN = ['Dat', 'hangt', 'ervan', 'af', 'wat', 'je', 'onder', '“denken”', 'verstaat', '.'];
  const H = 0.2, GAP = 0.07, ROWY = 1.2, T0 = 2.4, DT = 0.85;
  const tiles = [];
  let x = 0;
  [...PROMPT, ...GEN].forEach((w, k) => {
    const gen = k >= PROMPT.length;
    const l = label(w, H, { size: 56, weight: 600, color: gen ? '#e0f6ff' : '#f4f7fb', bg: gen ? 'rgba(14,60,84,0.92)' : 'rgba(40,46,56,0.92)', border: gen ? '#38bdf8' : 'rgba(244,247,251,0.35)', borderW: 4, radius: 14, pad: 20 });
    const wdt = l.userData.w;
    l.position.set(x + wdt / 2, ROWY, 0);
    scene.add(l);
    tiles.push({ m: l, cx: x + wdt / 2, t0: gen ? T0 + (k - PROMPT.length) * DT : 0.3 + k * 0.25, gen });
    x += wdt + GAP;
  });
  const total = x - GAP;
  tiles.forEach(tl => { tl.cx -= total / 2; tl.m.position.x = tl.cx; });

  // aandachtsbogen van elk nieuw woord naar alle eerdere
  const arcs = [];
  tiles.forEach((tk, k) => {
    if (!tk.gen) return;
    const ws = [];
    for (let j = 0; j < k; j++) ws.push(Math.pow(hash(k * 13.7 + j * 7.3), 3) + (j === k - 1 ? 0.3 : 0) + (j < PROMPT.length ? 0.15 : 0));
    const mx = Math.max(...ws);
    for (let j = 0; j < k; j++) {
      const a = V(tk.cx, ROWY + H / 2 + 0.01, 0), b = V(tiles[j].cx, ROWY + H / 2 + 0.01, 0);
      const d = Math.abs(a.x - b.x);
      const c = new THREE.QuadraticBezierCurve3(a, V((a.x + b.x) / 2, ROWY + 0.22 + d * 0.15, -0.05), b);
      const w = ws[j] / mx;
      const m = mesh(new THREE.TubeGeometry(c, 40, 0.004 + 0.008 * w, 6), glowOwn(0x38bdf8, 0, true), 0, 0, 0, scene, false);
      arcs.push({ m, w, t0: tk.t0 });
    }
  });

  // toren van lagen onder de rij: rekent elk volgend woord uit, dat er daarna uit opstijgt
  const tower = new THREE.Group(); scene.add(tower);
  const layers = [];
  for (let i = 0; i < 12; i++) {
    const fr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.7, 0.012, 0.5)), new THREE.LineBasicMaterial({ color: C(0x38bdf8), transparent: true, opacity: 0.2 }));
    fr.position.set(0, 0.22 + i * 0.065, -0.25);
    const pl = mesh(new THREE.PlaneGeometry(0.7, 0.5), glowOwn(0x38bdf8, 0.03, true), 0, 0.22 + i * 0.065, -0.25, null, false);
    pl.rotation.x = -Math.PI / 2;
    tower.add(fr, pl);
    layers.push({ fr, pl });
  }
  const genTiles = tiles.filter(tl => tl.gen);

  function headX(t) {
    const f = clamp((t - T0) / DT, -1, genTiles.length - 1);
    const i = Math.floor(f), k = smooth(f - i);
    const a = i < 0 ? tiles[PROMPT.length - 1].cx : genTiles[i].cx;
    const b = genTiles[Math.min(i + 1, genTiles.length - 1)].cx;
    return lerp(a, b, k);
  }

  return {
    y0: 2017, y1: 2022, phase: 'heden', era: 'Heden · 2017–2022', duration: 13,
    title: 'Aandacht is alles',
    txt: 'In 2017 bedenken onderzoekers van Google de transformer: een netwerk dat bij elk woord naar alle andere woorden kijkt en weegt welke ertoe doen. Getraind op een groot deel van het internet leren zulke taalmodellen telkens het volgende woord te voorspellen. Eind 2022 verschijnt ChatGPT, en iedereen kan ermee praten.',
    fact: 'Snelste groei ooit: ChatGPT had binnen twee maanden naar schatting 100 miljoen gebruikers.',
    hud: [
      { at: 1.0, text: 'WOORD VOOR WOORD' },
      { at: 1.7, text: 'AANDACHT · ALLE EERDERE WOORDEN' },
      { at: 2.4, text: 'PARAMETERS · MILJARDEN' },
    ],
    scene,
    update(t) {
      for (const tl of tiles) {
        const u = seg(t, tl.t0, tl.t0 + 0.35);
        tl.m.visible = t >= tl.t0;
        tl.m.material.opacity = smooth(u);
        tl.m.scale.setScalar(0.6 + 0.4 * easeOut(u));
        tl.m.position.y = ROWY - (tl.gen ? 0.45 * (1 - easeOut(u)) : 0);
      }
      for (const a of arcs) a.m.material.opacity = 0.95 * a.w * bump(t, a.t0 - 0.35, a.t0 + 1.0);
      // toren schuift mee naar de plek van het volgende woord
      const nextI = clamp(Math.ceil((t - T0) / DT), 0, genTiles.length - 1);
      tower.position.x = headX(t + DT * 0.6);
      tower.visible = t < T0 + genTiles.length * DT;
      const tk = genTiles[nextI].t0;
      layers.forEach((L, i) => {
        const b = bump(t, tk - 0.75 + i * 0.045, tk - 0.75 + i * 0.045 + 0.3);
        L.fr.material.opacity = 0.15 + 0.85 * b;
        L.pl.material.opacity = 0.03 + 0.25 * b;
      });
    },
    camera(t, c) {
      const hx = headX(t), end = easeIO(seg(t, 10.6, 13));
      // woordenrij boven het midden, nieuwste woord rechts: weg van de tekst linksonder
      aim(c,
        lerp(hx - 0.5, -0.6, end), lerp(1.45, 1.6, end), lerp(3.0, 5.6, end),
        lerp(hx - 1.15, -0.9, end), lerp(0.95, 0.95, end), 0,
        lerp(38, 42, end));
    },
  };
}

// =============================================================================
// 9 — nu: datacenters vol rekenkracht
// =============================================================================
function sceneDatacenter() {
  const scene = stage(0x03070c, 4, 26);
  lights(scene, { sky: 0x6aa0d0, ground: 0x05080c, hemi: 0.35, sun: 0xbcd8ff, sunI: 0.3, sunPos: V(1, 9, 2), target: V(0, 0, -6), shadow: 10 });
  // geperforeerde tegels
  const tc = document.createElement('canvas'); tc.width = tc.height = 64;
  const tg = tc.getContext('2d'); tg.fillStyle = '#2a3038'; tg.fillRect(0, 0, 64, 64); tg.fillStyle = '#1a1e24';
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { tg.beginPath(); tg.arc(4 + i * 8, 4 + j * 8, 1.6, 0, TAU); tg.fill(); }
  tg.fillStyle = '#12161a'; tg.fillRect(0, 0, 64, 2); tg.fillRect(0, 0, 2, 64);
  const tex = new THREE.CanvasTexture(tc); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(66, 66); tex.encoding = THREE.sRGBEncoding;
  floor(scene, 0xffffff, 0.5, 0.3, 40, tex);

  // serverfront
  const fc = document.createElement('canvas'); fc.width = 128; fc.height = 512;
  const fg = fc.getContext('2d'); fg.fillStyle = '#0c0f13'; fg.fillRect(0, 0, 128, 512);
  for (let s = 0; s < 12; s++) {
    const y = 20 + s * 40;
    fg.fillStyle = '#1c2128'; fg.fillRect(6, y, 116, 34);
    fg.fillStyle = '#0a0c0f'; for (let k = 0; k < 14; k++) fg.fillRect(12 + k * 6, y + 6, 3, 22);
  }
  const ftex = new THREE.CanvasTexture(fc); ftex.encoding = THREE.sRGBEncoding;
  const frontMat = new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.5, metalness: 0.5 });
  const rackMat = mat(0x14181e, 0.4, 0.6);
  const NR = 18, PITCH = 0.64, AX = 0.62, LEDS_PER = 12 * 3;
  const ledMesh = instanced(new THREE.BoxGeometry(0.008, 0.012, 0.025), new THREE.MeshBasicMaterial({ toneMapped: false }), NR * 2 * LEDS_PER);
  const o = new THREE.Object3D();
  let n = 0;
  for (const s of [-1, 1]) for (let i = 0; i < NR; i++) {
    const z = 2 - i * PITCH;
    box(scene, 1.0, 2.1, 0.6, rackMat, s * (AX + 0.5), 1.05, z);
    const f = mesh(new THREE.PlaneGeometry(0.58, 2.04), frontMat, s * (AX - 0.002), 1.05, z, scene, false);
    f.rotation.y = -s * Math.PI / 2;
    for (let k = 0; k < 12; k++) for (let j = 0; j < 3; j++) {
      o.position.set(s * (AX - 0.004), 1.05 + 1.02 - (20 + k * 40 + 17) / 512 * 2.04, z + (0.2 - j * 0.035) * -s);
      o.updateMatrix(); ledMesh.setMatrixAt(n, o.matrix); ledMesh.setColorAt(n, C(0x38bdf8)); n++;
    }
  }
  scene.add(ledMesh);
  // goten, leidingen, lichtlijnen
  for (const s of [-1, 1]) {
    box(scene, 0.4, 0.06, NR * PITCH + 2, mat(0xd4a017, 0.6, 0.3), s * (AX + 0.5), 2.45, 2 - NR * PITCH / 2, false);
    for (const dx of [-0.12, 0.12]) { const p = cyl(scene, 0.05, 0.05, NR * PITCH + 2, mat(0x2f6fb5, 0.35, 0.6), s * (AX + 0.5) + dx, 2.7, 2 - NR * PITCH / 2, 14, false); p.rotation.x = Math.PI / 2; }
    box(scene, 0.03, 0.01, NR * PITCH + 2, glow(0x5ab8ff), s * (AX - 0.06), 0.006, 2 - NR * PITCH / 2, false);
  }
  for (let i = 0; i < 8; i++) {
    const z = 1.5 - i * 1.6;
    box(scene, 0.5, 0.02, 0.12, glow(0xdbeaff), 0, 2.97, z, false);
    const l = new THREE.PointLight(C(0xcfe2ff), 0.5, 5, 2); l.position.set(0, 2.8, z); scene.add(l);
  }
  box(scene, 6, 0.1, 30, mat(0x0a0d11, 0.8), 0, 3.05, -6, false);
  const air = dust(scene, 400, V(0, 1.4, -4), V(1.2, 2.6, 14), 0x9ad0ff, 0.35, 8);

  const col = new THREE.Color(), cyan = C(0x38bdf8), green = C(0x4ade80), amber = C(0xf59e0b), dark = C(0x06121a);
  const cam = camPath([
    [0, [0.25, 1.25, 4.4], [0.05, 1.2, -4], 40],
    [8.5, [-0.15, 1.35, -3.2], [0.1, 1.25, -11], 40],
    [13, [0.0, 2.9, -4.2], [0.0, 1.0, -12], 42],
  ]);

  return {
    y0: 2023, y1: 2026, phase: 'heden', era: 'Heden · nu', duration: 13,
    title: 'Fabrieken van rekenkracht',
    txt: 'AI zit nu in je telefoon, je zoekmachine, je mailbox en op je werk. Daarachter staan enorme datacenters met tienduizenden chips die dag en nacht rekenen. Ze vragen veel stroom en koelwater, en de vraag groeit snel.',
    fact: 'Stroomverbruik: datacenters gebruikten in 2024 zo’n 1,5 procent van alle elektriciteit ter wereld. Het Internationaal Energieagentschap verwacht dat dat tegen 2030 ongeveer verdubbelt.',
    hud: [
      { at: 1.0, text: 'RACKS · DUIZENDEN CHIPS' },
      { at: 1.7, text: 'KOELING · VLOEISTOF' },
      { at: 2.4, text: 'STROOM · ~1,5 % WERELDWIJD', warn: true },
    ],
    scene,
    update(t) {
      const tick = Math.floor(t * 7);
      for (let i = 0; i < n; i++) {
        const h = hash(i * 1.37 + tick * 0.0731), kind = hash(i * 3.3);
        const base = kind > 0.92 ? amber : kind > 0.6 ? green : cyan;
        ledMesh.setColorAt(i, col.copy(dark).lerp(base, h > 0.35 ? 1 : 0.15));
      }
      ledMesh.instanceColor.needsUpdate = true;
      air.update(t);
    },
    camera: cam,
  };
}

// =============================================================================
// 10 — 2020–2024: AlphaFold vouwt eiwitten
// =============================================================================
function sceneFold() {
  const scene = stage(0x03060c, 6, 20);
  lights(scene, { sky: 0xb0c8ff, ground: 0x0a0c14, hemi: 0.55, sun: 0xffffff, sunI: 1.0, sunPos: V(3, 6, 4), target: V(0, 1.4, 0), shadows: false });
  const rimL = new THREE.PointLight(C(0x7a5aff), 1.2, 10, 2); rimL.position.set(-2.5, 2.5, -2); scene.add(rimL);
  floor(scene, 0x05080e, 0.3, 0.6);

  // gevouwen doelvorm: drie helices in een bundel, verbonden door lussen
  const R = 0.23, RISE = 0.15, TURN = 100 * Math.PI / 180, NH = 14, Y0 = 0.45;
  const centers = [V(-0.42, 0, -0.24), V(0.42, 0, -0.24), V(0, 0, 0.48)];
  const helix = (c, up, ph) => { const p = []; for (let i = 0; i < NH; i++) { const a = ph + i * TURN; p.push(V(c.x + R * Math.cos(a), up ? Y0 + i * RISE : Y0 + (NH - 1 - i) * RISE, c.z + R * Math.sin(a))); } return p; };
  const loop = (a, b, n, lift) => { const p = [], mid = a.clone().lerp(b, 0.5); mid.y += lift; mid.x *= 1.6; mid.z *= 1.6; const cv = new THREE.QuadraticBezierCurve3(a, mid, b); for (let i = 1; i <= n; i++) p.push(cv.getPoint(i / (n + 1))); return p; };
  const h1 = helix(centers[0], true, 0), h2 = helix(centers[1], false, 1), h3 = helix(centers[2], true, 2);
  const tailA = [V(-0.9, 0.15, -0.6), V(-0.75, 0.25, -0.45), V(-0.6, 0.33, -0.33)];
  const tailB = [V(0.15, 2.6, 0.8), V(0.3, 2.75, 0.95), V(0.5, 2.82, 1.05)];
  const target = [...tailA, ...h1, ...loop(h1[NH - 1], h2[0], 5, 0.45), ...h2, ...loop(h2[NH - 1], h3[0], 5, -0.4), ...h3, ...tailB];
  const N = target.length, CY = 1.4;
  target.forEach(p => { p.y += CY - (Y0 + NH * RISE / 2); });
  // uitgestrekte keten: een golvende draad
  const ext = target.map((_, i) => { const u = i / (N - 1); return V(lerp(-5.2, 5.2, u), CY + 0.35 * Math.sin(u * 17) + 0.2 * Math.sin(u * 41), 0.4 * Math.sin(u * 23 + 1)); });

  const beads = instanced(new THREE.SphereGeometry(0.1, 18, 12), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 }), N);
  const sticks = instanced(new THREE.CylinderGeometry(0.035, 0.035, 1, 10), mat(0xc8d4e0, 0.4, 0.2), N - 1);
  scene.add(beads, sticks);
  for (let i = 0; i < N; i++) beads.setColorAt(i, C(0xff7d45));     // kleurbuffer bestaat vóór het compileren
  const PL = [C(0xff7d45), C(0xffdb13), C(0x65cbf3), C(0x0053d6)];
  const plddt = (k, out) => { const f = clamp01(k) * 3, i = Math.min(2, Math.floor(f)); return out.copy(PL[i]).lerp(PL[i + 1], f - i); };

  // reeks letters (de invoer)
  const AA = 'ACDEFGHIKLMNPQRSTVWY', rr = rng(77);
  let seqStr = '';
  for (let i = 0; i < N; i++) seqStr += AA[Math.floor(rr() * 20)];
  const seq = label(seqStr, 0.16, { size: 48, weight: 600, color: '#9fb6d0', pad: 8 });
  seq.position.set(0, 0.35, 0.8); scene.add(seq);
  const motes = dust(scene, 300, V(0, 1.6, 0), V(9, 3.2, 6), 0x8ab4ff, 0.4, 12);

  const cur = target.map(() => V()), o = new THREE.Object3D(), col = new THREE.Color();
  return {
    y0: 2020, y1: 2024, phase: 'heden', era: 'Heden · 2020–2024', duration: 13,
    title: 'AI ontrafelt het leven',
    txt: 'Eiwitten zijn de machientjes in je cellen, en hun vorm bepaalt wat ze doen. Die vorm uitzoeken kostte onderzoekers soms jaren. AlphaFold voorspelt hem uit de reeks bouwstenen, vaak bijna net zo precies als een experiment. AI helpt nu ook bij medicijnen, materialen en wiskunde.',
    fact: 'Nobelprijs: Demis Hassabis en John Jumper kregen in 2024 de Nobelprijs voor Scheikunde, samen met David Baker. AlphaFold voorspelde de vorm van zo’n 200 miljoen eiwitten.',
    hud: [
      { at: 1.0, text: 'VOLGORDE → VORM' },
      { at: 7.0, text: 'ZEKERHEID · HOOG' },
      { at: 7.7, text: 'NOBELPRIJS 2024' },
    ],
    scene,
    update(t) {
      for (let i = 0; i < N; i++) {
        const st = 1.8 + (i / N) * 2.2, k = easeIO(seg(t, st, st + 3.6));
        const w = (1 - k) * 0.06;
        cur[i].lerpVectors(ext[i], target[i], k);
        cur[i].x += w * Math.sin(t * 2.1 + i); cur[i].y += w * Math.sin(t * 1.7 + i * 1.3); cur[i].z += w * Math.cos(t * 1.9 + i * 0.7);
        o.position.copy(cur[i]); o.quaternion.identity(); o.scale.setScalar(1); o.updateMatrix();
        beads.setMatrixAt(i, o.matrix);
        beads.setColorAt(i, plddt(k * smooth(seg(t, st + 1.5, st + 5.5)) * 1.0 + 0.0, col));
      }
      for (let i = 0; i < N - 1; i++) { between(o, cur[i], cur[i + 1]); o.updateMatrix(); sticks.setMatrixAt(i, o.matrix); }
      beads.instanceMatrix.needsUpdate = true; beads.instanceColor.needsUpdate = true; sticks.instanceMatrix.needsUpdate = true;
      seq.material.opacity = 1 - smooth(seg(t, 3, 5));
      motes.update(t);
    },
    camera(t, c) {
      // eiwit rechts van het midden, weg van de tekst linksonder
      const k = easeIO(seg(t, 0, 9)), th = 0.25 + t * 0.11, d = lerp(7.8, 4.9, k);
      const sx = -Math.cos(th) * 0.8, sz = Math.sin(th) * 0.8;
      aim(c, Math.sin(th) * d + sx, lerp(1.9, 2.0, k), Math.cos(th) * d + sz, sx, CY, sz, 38);
    },
  };
}

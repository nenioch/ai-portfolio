'use strict';
/* =============================================================================
   verleden.js — scènes 1 t/m 5: van tandwiel tot schaakcomputer.
   Elke scène: { y0, y1 (jaartal), phase, era, title, txt, fact, hud, card?,
   duration, scene, update(t), camera(t, cam) }. Alles is een pure functie van
   de lokale tijd t, zodat pauzeren en spoelen werkt (zoals humanoid-showreel).
   ============================================================================= */

// =============================================================================
// 1 — 1843: de Analytical Engine van Babbage en het programma van Ada Lovelace
// =============================================================================
function sceneEngine() {
  const scene = stage(0x0c0906, 6, 18);
  lights(scene, { sky: 0x6a5440, ground: 0x0a0806, hemi: 0.22, sun: 0xffd2a0, sunI: 0.55, sunPos: V(-3, 7, 4), shadow: 4 });
  const lamp = new THREE.PointLight(C(0xffa850), 0, 8, 2);
  lamp.position.set(1.1, 2.3, 1.5);
  scene.add(lamp);
  const key = spot(scene, 0xffd9a8, 0, V(-1.5, 4.5, 2.5), V(-0.6, 1, 0), 0.6, 0.6, 12);

  floor(scene, 0x2a1c12, 0.75);
  box(scene, 14, 6, 0.2, mat(0x1c150f, 0.95), 0, 3, -2.6, false);
  for (let x = -6; x <= 6; x += 1.5) box(scene, 0.08, 6, 0.06, mat(0x2a1f16, 0.9), x, 3, -2.48, false);

  const brass = mat(0xc89b52, 0.3, 0.85), dark = mat(0x8a6a38, 0.35, 0.8), iron = mat(0x2a2826, 0.55, 0.6), wood = mat(0x4a3020, 0.7);

  // sokkel en frame
  box(scene, 3.6, 0.14, 1.3, wood, 0, 0.07, 0);
  box(scene, 3.6, 0.05, 1.3, iron, 0, 2.0, 0);
  for (const x of [-1.75, 1.75]) for (const z of [-0.6, 0.6]) cyl(scene, 0.028, 0.028, 1.86, iron, x, 1.07, z, 10);

  // cijferwielen: kolommen met messing schijven, cijfers rond de rand
  const dc = document.createElement('canvas');
  dc.width = 640; dc.height = 64;
  const g = dc.getContext('2d');
  g.fillStyle = '#c99e58'; g.fillRect(0, 0, 640, 64);
  g.fillStyle = '#2a1a08'; g.font = '700 44px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < 10; i++) g.fillText(String(i), i * 64 + 32, 34);
  const digitTex = new THREE.CanvasTexture(dc);
  digitTex.encoding = THREE.sRGBEncoding;
  const wheelMat = new THREE.MeshStandardMaterial({ map: digitTex, roughness: 0.35, metalness: 0.75, envMap: ENV.map });
  const wheelGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 40);
  const smallGear = gearGeo(0.07, 14, 0.03), bigGear = gearGeo(0.5, 48, 0.05);
  const wheels = [], gears = [];
  for (let c = 0; c < 7; c++) {
    const x = -1.2 + c * 0.4;
    cyl(scene, 0.012, 0.012, 1.8, iron, x, 1.05, 0, 8);
    cyl(scene, 0.01, 0.01, 1.8, iron, x + 0.19, 1.05, 0.06, 8);
    for (let j = 0; j < 12; j++) {
      const y = 0.32 + j * 0.13;
      const w = mesh(wheelGeo, [wheelMat, brass, brass], x, y, 0, scene);
      wheels.push({ m: w, c, j });
      const gg = mesh(smallGear, j % 2 ? dark : brass, x + 0.19, y + 0.065, 0.06, scene);
      gears.push({ m: gg, dir: (c + j) % 2 ? 1 : -1 });
    }
  }
  // groot aandrijfwiel met slinger
  const drive = mesh(bigGear, brass, 1.95, 1.05, 0.25, scene);
  drive.rotation.z = Math.PI / 2;
  const driveG = new THREE.Group(); driveG.position.set(1.95, 1.05, 0.25); scene.add(driveG);
  drive.position.set(0, 0, 0); driveG.add(drive);
  const crank = box(driveG, 0.04, 0.42, 0.04, iron, 0.06, 0.2, 0);
  const pinion = mesh(gearGeo(0.16, 16, 0.05), dark, 1.95, 1.05 + 0.64, 0.25, scene);
  pinion.rotation.z = Math.PI / 2;

  // ponskaarten aan een ketting over een lezer
  const cc = document.createElement('canvas');
  cc.width = 256; cc.height = 40;
  const cg = cc.getContext('2d'), rr = rng(11);
  cg.fillStyle = '#e8d8b4'; cg.fillRect(0, 0, 256, 40);
  cg.fillStyle = '#1a120a';
  for (let i = 0; i < 24; i++) for (let j = 0; j < 3; j++) if (rr() > 0.5) { cg.beginPath(); cg.arc(10 + i * 10.2, 9 + j * 11, 3.2, 0, TAU); cg.fill(); }
  const cardTex = new THREE.CanvasTexture(cc);
  cardTex.encoding = THREE.sRGBEncoding;
  const cardMat = new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.9 });
  const path = new THREE.CatmullRomCurve3([
    V(-2.3, 0.16, 0.62), V(-2.3, 0.75, 0.5), V(-2.3, 1.3, 0.28), V(-2.3, 1.47, 0), V(-2.3, 1.3, -0.28), V(-2.3, 0.75, -0.5), V(-2.3, 0.16, -0.62),
  ]);
  const PL = path.getLength(), STEP = 0.068;
  const cards = [];
  for (let i = 0; i < Math.floor(PL / STEP); i++) {
    const m = mesh(new THREE.BoxGeometry(0.52, 0.064, 0.004), cardMat, 0, 0, 0, scene);
    cards.push(m);
  }
  box(scene, 0.66, 0.1, 0.24, iron, -2.3, 1.43, 0);
  cyl(scene, 0.05, 0.05, 0.7, brass, -2.3, 1.49, 0, 16).rotation.z = Math.PI / 2;
  box(scene, 0.55, 0.04, 0.04, iron, -2.0, 1.5, 0);
  box(scene, 0.4, 0.04, 0.04, iron, -1.6, 1.5, 0.0).rotation.z = -0.15;
  box(scene, 0.12, 1.3, 0.12, wood, -2.3, 0.72, 0);

  // tafel met lamp, papier en ganzenveer
  box(scene, 1.2, 0.05, 0.7, wood, 1.1, 0.78, 1.5);
  for (const x of [0.6, 1.6]) for (const z of [1.2, 1.8]) box(scene, 0.05, 0.76, 0.05, wood, x, 0.38, z);
  box(scene, 0.3, 0.004, 0.42, mat(0xe6d6b0, 0.9), 1.0, 0.805, 1.5).rotation.y = 0.2;
  cyl(scene, 0.06, 0.08, 0.04, brass, 1.4, 0.82, 1.35, 16);
  const flame = mesh(new THREE.SphereGeometry(0.03, 12, 8).scale(1, 1.8, 1), glowOwn(0xffc070, 1), 1.4, 0.92, 1.35, scene, false);
  const chimney = mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.18, 16), new THREE.MeshStandardMaterial({ color: C(0xfff0d8), transparent: true, opacity: 0.25, roughness: 0.1 }), 1.4, 0.93, 1.35, scene, false);
  chimney.castShadow = false;
  lamp.position.set(1.4, 1.0, 1.35);

  const motes = dust(scene, 260, V(0, 1.4, 0.6), V(5, 2.6, 2.6), 0xffd6a0, 0.5, 5);

  const cam = camPath([
    [0, [3.4, 2.4, 4.6], [0, 1.1, 0], 34],
    [5.0, [2.5, 1.7, 3.2], [-0.2, 1.05, 0], 34],
    [9.0, [-0.3, 1.75, 2.3], [-1.75, 1.05, 0], 38],
    [15, [0.95, 1.15, 1.25], [-0.4, 1.0, 0], 34],
  ]);

  return {
    y0: 1837, y1: 1843, phase: 'verleden', era: 'Verleden · 19e eeuw', duration: 15,
    title: 'De rekenmachine van Babbage',
    txt: 'Charles Babbage ontwerpt de Analytical Engine: een rekenmachine van tandwielen, bestuurd met ponskaarten. Ada Lovelace ziet verder dan rekenen. Zo’n machine zou ook muziek of andere symbolen kunnen bewerken, schrijft ze, en ze maakt er het eerste computerprogramma voor.',
    fact: 'Nooit gebouwd: de Analytical Engine bleef op papier. Het programma van Lovelace uit 1843 (Note G) berekent Bernoulli-getallen.',
    hud: [
      { at: 5.6, text: 'INVOER · PONSKAARTEN' },
      { at: 6.2, text: 'MOLEN · REKENEENHEID' },
      { at: 6.8, text: 'NOTE G · 1843' },
    ],
    card: { at: 0.6, until: 4.6, big: 'AI', small: 'Van tandwiel tot taalmodel: de geschiedenis van kunstmatige intelligentie', note: 'VERLEDEN · HEDEN · TOEKOMST' },
    lowerAt: 5.0,
    scene,
    update(t) {
      const on = smooth(seg(t, 0.2, 2.5));
      lamp.intensity = 1.6 * on * (0.92 + 0.08 * Math.sin(t * 13) * Math.sin(t * 7.3));
      key.intensity = 1.8 * on;
      flame.scale.y = 1 + 0.12 * Math.sin(t * 17);
      const drv = t * 0.7;
      driveG.rotation.x = drv;
      pinion.rotation.x = -drv * 3;
      for (const w of wheels) {
        const u = t * 1.4 / Math.pow(2.3, w.j % 4) + w.c * 0.37 + w.j * 0.11;
        w.m.rotation.y = (Math.floor(u) + smooth(frac(u) * 3)) * TAU / 10;
      }
      for (const gg of gears) gg.m.rotation.y = gg.dir * t * 1.6;
      const a = V(), tan = V();
      cards.forEach((m, i) => {
        const u = frac((i * STEP + t * 0.07) / PL);
        path.getPointAt(u, a);
        path.getTangentAt(u, tan);
        m.position.copy(a);
        m.quaternion.setFromUnitVectors(_up, tan);
      });
      motes.update(t);
    },
    camera: cam,
  };
}

// =============================================================================
// 2 — 1950: Turing en het imitatiespel
// =============================================================================
function sceneTuring() {
  const scene = stage(0x0b0e0c, 9, 26);
  lights(scene, { sky: 0x9fb4a8, ground: 0x1a1c18, hemi: 0.32, sun: 0xe4f0e6, sunI: 0.45, sunPos: V(2, 9, 5), shadow: 6 });
  floor(scene, 0x3a3e38, 0.9);

  const wallMat = mat(0x5f665c, 0.92), deskMat = mat(0x4a3424, 0.7), metal = mat(0x3c4146, 0.45, 0.6);
  const H = 1.5;                         // lage schotten: de camera kijkt eroverheen
  box(scene, 6.4, H, 0.12, wallMat, 0, H / 2, 0);
  box(scene, 0.12, H, 3.2, wallMat, 0, H / 2, -1.6);
  box(scene, 6.4, H, 0.12, wallMat, 0, H / 2, -3.2);
  box(scene, 0.12, H, 3.2, wallMat, -3.2, H / 2, -1.6);
  box(scene, 0.12, H, 3.2, wallMat, 3.2, H / 2, -1.6);

  // teleprinter: kast met papierrol
  function teleprinter(x, z, yaw) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; scene.add(g);
    box(g, 1.1, 0.05, 0.6, deskMat, 0, 0.74, 0);
    for (const dx of [-0.5, 0.5]) for (const dz of [-0.25, 0.25]) box(g, 0.05, 0.72, 0.05, deskMat, dx, 0.36, dz);
    box(g, 0.48, 0.16, 0.36, mat(0x2c3a33, 0.5, 0.3), 0, 0.85, -0.02);
    // bedieningskant is lokaal -z
    box(g, 0.4, 0.02, 0.14, mat(0x111111, 0.6), 0, 0.94, -0.14).rotation.x = 0.25;
    cyl(g, 0.05, 0.05, 0.36, metal, 0, 1.0, 0.12, 14).rotation.z = Math.PI / 2;
    const paper = box(g, 0.3, 1, 0.004, mat(0xf2ecd8, 0.9), 0, 1.0, 0.16, false);
    paper.geometry.translate(0, 0.5, 0);
    paper.position.y = 1.0;
    return { g, paper };
  }
  const judgeTP = teleprinter(0, 1.6, Math.PI);
  const aTP = teleprinter(-1.6, -1.2, 0);
  const bTP = teleprinter(1.0, -1.0, 0);

  const judge = createFigure({ color: 0x3c4a5c, pose: { sit: 1, lSh: 0.75, rSh: 0.7, lEl: 0.9, rEl: 0.95, lean: 0.12, headX: 0.25 } });
  judge.root.position.set(0, 0, 2.15); judge.root.rotation.y = Math.PI; scene.add(judge.root);
  box(scene, 0.42, 0.04, 0.42, deskMat, 0, 0.46, 2.18);
  const human = createFigure({ color: 0x6a5446, hair: 0x5a3a20, pose: { sit: 1, lSh: 0.75, rSh: 0.7, lEl: 0.9, rEl: 0.95, lean: 0.1, headX: 0.2 } });
  human.root.position.set(-1.6, 0, -1.75); scene.add(human.root);
  box(scene, 0.42, 0.04, 0.42, deskMat, -1.6, 0.46, -1.78);

  // machine B: kast met radiobuizen en bandspoelen
  const mach = new THREE.Group(); mach.position.set(1.7, 0, -2.6); scene.add(mach);
  box(mach, 1.7, 2.0, 0.6, mat(0x4b5258, 0.5, 0.4), 0, 1.0, 0);
  box(mach, 1.5, 1.1, 0.02, mat(0x14181b, 0.4, 0.5), 0, 1.35, 0.31);
  const tubes = [];
  for (let i = 0; i < 10; i++) for (let j = 0; j < 4; j++) {
    const m = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 10), glowOwn(0xffa040, 0.8), -0.62 + i * 0.138, 1.0 + j * 0.24, 0.34, mach, false);
    m.rotation.x = Math.PI / 2;
    tubes.push({ m, ph: hash(i * 7 + j) * TAU, f: 2 + hash(i + j * 13) * 5 });
  }
  const reels = [-0.4, 0.4].map(x => { const r = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 30), mat(0x777f88, 0.35, 0.8), x, 0.45, 0.32, mach); r.rotation.x = Math.PI / 2; box(r, 0.3, 0.035, 0.03, mat(0x222222, 0.5), 0, 0, 0); return r; });

  // lampen boven elke kamer
  const lampY = 2.15;
  for (const [x, z] of [[0, 1.6], [-1.6, -1.6], [1.6, -1.6]]) {
    const l = new THREE.PointLight(C(0xfff2d6), 1.1, 5, 2); l.position.set(x, lampY, z); scene.add(l);
    cyl(scene, 0.04, 0.22, 0.14, mat(0x2a3a30, 0.5, 0.4), x, lampY + 0.07, z, 18, false);
    mesh(new THREE.SphereGeometry(0.05, 10, 8), glow(0xfff0c8), x, lampY, z, scene, false);
  }

  // kabels en pulsen (vragen heen, antwoorden terug)
  const cable = mat(0x151515, 0.6);
  const routes = [[V(0, 0.02, 1.4), V(-0.4, 0.02, 0.4), V(-1.2, 0.02, -0.4), V(-1.6, 0.02, -1.0)], [V(0, 0.02, 1.4), V(0.4, 0.02, 0.4), V(0.8, 0.02, -0.4), V(1.0, 0.02, -0.8)]]
    .map(pts => { const c = new THREE.CatmullRomCurve3(pts); mesh(new THREE.TubeGeometry(c, 40, 0.012, 6), cable, 0, 0, 0, scene, false); return c; });
  const pulses = [];
  for (let i = 0; i < 8; i++) {
    const m = mesh(new THREE.SphereGeometry(0.045, 12, 8), glowOwn(0x7dd3fc, 0, true), 0, 0, 0, scene, false);
    pulses.push(m);
  }
  const q = label('?', 0.6, { size: 160, weight: 700, font: '"Young Serif", Georgia, serif', color: '#e8a64a', pad: 8 });
  q.position.set(0, 2.9, 1.6); scene.add(q);
  const lA = label('A', 0.42, { size: 140, weight: 700, color: '#f1eee8', pad: 6 }); lA.position.set(-1.6, 2.75, -1.6); scene.add(lA);
  const lB = label('B', 0.42, { size: 140, weight: 700, color: '#f1eee8', pad: 6 }); lB.position.set(1.6, 2.75, -1.6); scene.add(lB);

  const cam = camPath([
    [0, [0.6, 6.4, 5.4], [0.2, 0.4, -0.8], 38],
    [6.0, [3.2, 3.1, 4.3], [0.4, 0.8, -0.9], 36],
    [10.0, [0.9, 1.85, 3.5], [0.3, 1.0, -0.6], 36],
    [13, [-1.6, 2.5, 3.0], [0.8, 0.9, -2.0], 38],
  ]);
  const p = V();

  return {
    y0: 1950, y1: 1952, phase: 'verleden', era: 'Verleden · 1950', duration: 13,
    title: 'Kunnen machines denken?',
    txt: 'Alan Turing stelt een test voor. Een ondervrager typt vragen naar twee verborgen gesprekspartners: een mens en een machine. Kan hij aan de antwoorden niet zien wie wie is, dan mag je volgens Turing zeggen dat de machine denkt.',
    fact: 'Voorspelling: Turing verwachtte dat machines rond het jaar 2000 een gemiddelde ondervrager na vijf minuten vragen in drie op de tien gevallen zouden misleiden.',
    hud: [
      { at: 1.0, text: 'IMITATIESPEL' },
      { at: 1.7, text: 'A · MENS OF MACHINE?' },
      { at: 2.4, text: 'B · MENS OF MACHINE?' },
    ],
    scene,
    update(t) {
      judgeTP.paper.scale.y = 0.05 + 0.03 * Math.floor(t / 0.8);
      aTP.paper.scale.y = 0.05 + 0.025 * Math.floor(t / 1.1);
      bTP.paper.scale.y = 0.05 + 0.025 * Math.floor(t / 0.9);
      const type = Math.sin(t * 22) * 0.06;
      judge.setPose({ sit: 1, lSh: 0.75, rSh: 0.7, lEl: 0.9 + type, rEl: 0.95 - type, lean: 0.12, headX: 0.25 });
      human.setPose({ sit: 1, lSh: 0.75, rSh: 0.7, lEl: 0.9 - type * bump(frac(t / 3), 0.3, 0.9), rEl: 0.95 + type * bump(frac(t / 3), 0.3, 0.9), lean: 0.1, headX: 0.2 });
      for (const tb of tubes) tb.m.material.opacity = 0.45 + 0.45 * (Math.sin(t * tb.f + tb.ph) > 0.2 ? 1 : 0.2);
      reels[0].rotation.y = t * 2.2; reels[1].rotation.y = -t * 1.7;
      pulses.forEach((m, i) => {
        const r = routes[i % 2], period = 3.2, off = Math.floor(i / 2) * 0.8 + (i % 2) * 0.4;
        const u = frac((t + off) / period), back = Math.floor((t + off) / period) % 2 === 1;
        r.getPointAt(back ? 1 - u : u, p);
        m.position.copy(p).setY(0.05);
        m.material.color.copy(C(back ? 0xe8a64a : 0x7dd3fc));
        m.material.opacity = bump(u, 0, 1) * smooth(seg(t, 1, 2));
      });
      q.position.y = 2.9 + 0.06 * Math.sin(t * 1.4);
      q.material.opacity = smooth(seg(t, 0.8, 2));
      lA.material.opacity = lB.material.opacity = smooth(seg(t, 1.6, 2.8));
    },
    camera(t, c) {
      cam(t, c);
      [q, lA, lB].forEach(l => l.quaternion.copy(c.quaternion));
    },
  };
}

// =============================================================================
// 3 — 1958: de Mark I Perceptron leert letters herkennen
// =============================================================================
function scenePerceptron() {
  const scene = stage(0x0a0c0f, 7, 22);
  lights(scene, { sky: 0xb8c4d0, ground: 0x15171a, hemi: 0.28, sunI: 0.5, sunPos: V(3, 8, 5), shadow: 5 });
  floor(scene, 0x24272b, 0.8);
  box(scene, 14, 5, 0.2, mat(0x1d2126, 0.95), 0, 2.5, -2.4, false);
  const top = spot(scene, 0xf0f4ff, 2.2, V(0.2, 4.6, 2.4), V(0, 0.9, 0), 0.75, 0.6, 12);

  const panelMat = mat(0x3b4148, 0.5, 0.4), dark = mat(0x16191d, 0.5, 0.4);
  // het "oog": 20 × 20 lichtcellen
  const N = 20, S = 0.052, PX = -1.25, PY = 1.35;
  box(scene, N * S + 0.24, N * S + 0.24, 0.12, panelMat, PX, PY, -0.06);
  box(scene, 0.1, PY - 0.5, 0.1, panelMat, PX, (PY - 0.5) / 2, -0.06);
  box(scene, 0.7, 0.05, 0.5, panelMat, PX, 0.025, -0.06);
  const cells = instanced(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ toneMapped: false }), N * N);
  const o = new THREE.Object3D();
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    o.position.set(PX + (i - (N - 1) / 2) * S, PY + ((N - 1) / 2 - j) * S, 0.01);
    o.updateMatrix();
    cells.setMatrixAt(j * N + i, o.matrix);
    cells.setColorAt(j * N + i, C(0x1a1a18));
  }
  scene.add(cells);

  // letters als 20 × 20-bitmaps, berekend (een canvas uitlezen is traag)
  function bitmap(on) {
    const b = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) b.push(on(i + 0.5, j + 0.5) ? 1 : 0);
    return b;
  }
  const LETTERS = [
    bitmap((x, y) => Math.min(Math.abs(x - y), Math.abs(x + y - N)) < 2.1 && x > 3 && x < N - 3),
    bitmap((x, y) => Math.abs(Math.hypot(x - N / 2, y - N / 2) - 6.2) < 1.6),
  ];

  // projector met lichtbundel
  const proj = new THREE.Group(); proj.position.set(-2.7, 1.35, 1.9); scene.add(proj);
  box(proj, 0.3, 0.26, 0.42, mat(0x2b2f35, 0.45, 0.5), 0, 0, 0);
  box(proj, 0.36, 0.05, 0.46, panelMat, 0, -0.68, 0);
  box(proj, 0.06, 0.62, 0.06, panelMat, 0, -0.36, 0);
  const tgt = V(PX, PY, 0.02);
  proj.lookAt(tgt);
  const lens = cyl(proj, 0.07, 0.07, 0.08, glow(0xfff4d0), 0, 0, 0.24, 18, false);
  lens.rotation.x = Math.PI / 2;
  const beamLen = proj.position.distanceTo(tgt);
  const beam = mesh(new THREE.CylinderGeometry(0.62, 0.05, beamLen, 24, 1, true).rotateX(Math.PI / 2), glowOwn(0xfff2c8, 0.1, true), 0, 0, beamLen / 2 + 0.2, proj, false);

  // rek met potmeters (de gewichten)
  const rack = new THREE.Group(); rack.position.set(1.35, 0, -0.3); scene.add(rack);
  box(rack, 2.1, 1.9, 0.55, mat(0x46505a, 0.55, 0.35), 0, 0.95, 0);
  box(rack, 1.9, 1.5, 0.02, dark, 0, 1.08, 0.28);
  const knobs = [];
  const kg = new THREE.CylinderGeometry(0.045, 0.05, 0.05, 16).rotateX(Math.PI / 2);
  for (let i = 0; i < 12; i++) for (let j = 0; j < 8; j++) {
    const k = new THREE.Group(); k.position.set(-0.85 + i * 0.155, 0.48 + j * 0.172, 0.31); rack.add(k);
    mesh(kg, mat(0xd8d2c4, 0.5), 0, 0, 0.02, k);
    box(k, 0.008, 0.04, 0.006, mat(0x111111, 0.5), 0, 0.02, 0.048, false);
    knobs.push({ k, r: hash(i * 31 + j) * 2 - 1, s: hash(i + j * 17) * 2 - 1 });
  }
  // uitgang: twee lampen X en O
  const outs = ['X', 'O'].map((ch, i) => {
    const x = -0.35 + i * 0.7;
    cyl(rack, 0.1, 0.1, 0.04, dark, x, 2.0, 0.1, 18);
    const bulb = mesh(new THREE.SphereGeometry(0.085, 18, 12), glowOwn(0x333333, 1), x, 2.07, 0.1, rack, false);
    const l = label(ch, 0.16, { size: 120, weight: 700, color: '#f1eee8', pad: 4 }); l.position.set(x, 2.28, 0.1); rack.add(l);
    return bulb;
  });

  // draadkluwen tussen oog en rek
  const r = rng(21), wpos = [], wcol = [];
  const cols = [0xd04a3a, 0xe8b23a, 0x3a7ad0, 0xd8d2c4, 0x3aa060].map(c => C(c));
  for (let i = 0; i < 160; i++) {
    const a = V(PX + (r() - 0.5) * 1.0, PY - 0.55 + r() * 0.05, -0.12 - r() * 0.05);
    const b = V(1.35 - 0.9 + r() * 1.8, 0.2 + r() * 0.2, -0.0 - r() * 0.2);
    const mid = a.clone().lerp(b, 0.5); mid.y = 0.05 + r() * 0.25; mid.z += (r() - 0.5) * 0.8;
    const pts = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(14);
    const col = cols[Math.floor(r() * cols.length)];
    for (let k = 0; k < pts.length - 1; k++) { wpos.push(pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z); wcol.push(col.r, col.g, col.b, col.r, col.g, col.b); }
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
  wg.setAttribute('color', new THREE.Float32BufferAttribute(wcol, 3));
  scene.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ vertexColors: true })));

  const T0 = 1.2, TRIAL = 1.25;
  const WRONG = new Set([0, 1, 3, 4, 6]);
  const on = C(0xfff0b8), off = C(0x1c1c1a), green = C(0x4ade80), red = C(0xef4444), dim = C(0x2a2a2a);
  let lastKey = '';

  const cam = camPath([
    [0, [-1.0, 1.4, 1.35], [-1.25, 1.33, 0], 34],
    [4.5, [-0.4, 1.55, 2.7], [-0.6, 1.2, 0], 36],
    [9.0, [1.6, 1.9, 4.2], [0.1, 1.05, -0.2], 36],
    [13, [2.9, 1.6, 2.6], [0.6, 1.1, -0.3], 34],
  ]);

  return {
    y0: 1956, y1: 1958, phase: 'verleden', era: 'Verleden · 1956–1958', duration: 13,
    title: 'De perceptron leert kijken',
    txt: 'In 1956 krijgt het vakgebied zijn naam: artificial intelligence. Twee jaar later bouwt Frank Rosenblatt de Mark I Perceptron, met een oog van 400 lichtcellen en een kluwen draden als zenuwen. Bij elke fout draaien motortjes aan de knoppen, tot de machine X en O uit elkaar kan houden.',
    fact: 'Hoge verwachtingen: de New York Times schreef in 1958 dat zo’n machine ooit zou kunnen lopen, praten, zien, schrijven en zich van zichzelf bewust zou zijn.',
    hud: [
      { at: 0.8, text: '20 × 20 LICHTCELLEN' },
      { at: 1.5, text: 'GEWICHTEN · MOTOR-POTMETERS' },
      { at: 2.2, text: 'FOUT → KNOPPEN BIJSTELLEN' },
    ],
    scene,
    update(t) {
      const k = Math.max(0, Math.floor((t - T0) / TRIAL)), u = t - T0 - k * TRIAL;
      const active = t >= T0;
      const letter = k % 2, bright = active ? smooth(seg(u, 0, 0.15)) * (1 - smooth(seg(u, TRIAL - 0.15, TRIAL))) : 0;
      const keyStr = k + '|' + Math.round(bright * 8);
      if (keyStr !== lastKey) {
        lastKey = keyStr;
        const bm = LETTERS[letter], c = new THREE.Color();
        for (let n = 0; n < N * N; n++) cells.setColorAt(n, c.copy(off).lerp(on, bm[n] * bright));
        cells.instanceColor.needsUpdate = true;
      }
      beam.material.opacity = 0.03 + 0.09 * bright;
      // uitkomst na 0,55 s: goed (groen) of fout (rood, knoppen draaien)
      const wrong = WRONG.has(k), shown = active && u > 0.55 && u < TRIAL - 0.1;
      const guess = wrong ? 1 - letter : letter;
      outs.forEach((b, i) => b.material.color.copy(shown && i === guess ? (wrong ? red : green) : dim));
      let turns = 0;
      for (let j = 0; j <= k && active; j++) if (WRONG.has(j)) turns += j < k ? 1 : smooth(seg(u, 0.65, 1.15));
      for (const kn of knobs) kn.k.rotation.z = kn.r * 2 + kn.s * 0.5 * turns;
    },
    camera: cam,
  };
}

// =============================================================================
// 4 — 1974–1993: AI-winter. Het geld en de verwachtingen bevriezen
// =============================================================================
function sceneWinter() {
  const scene = stage(0x0b0f14, 6, 22);
  const L = lights(scene, { sky: 0xc8d4e0, ground: 0x202428, hemi: 0.45, sun: 0xdde8f4, sunI: 0.4, sunPos: V(2, 9, 3), target: V(0, 0, -4), shadow: 9 });
  // verhoogde vloer met tegels
  const tc = document.createElement('canvas'); tc.width = tc.height = 64;
  const tg = tc.getContext('2d'); tg.fillStyle = '#9aa0a4'; tg.fillRect(0, 0, 64, 64); tg.fillStyle = '#6a7074'; tg.fillRect(0, 0, 64, 2); tg.fillRect(0, 0, 2, 64);
  const tileTex = new THREE.CanvasTexture(tc); tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(66, 66); tileTex.encoding = THREE.sRGBEncoding;
  const fl = floor(scene, 0xffffff, 0.7, 0, 40, tileTex);
  const snowFloor = mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: C(0xf2f6fa), roughness: 1, transparent: true, opacity: 0 }), 0, 0.005, 0, scene, false);
  snowFloor.rotation.x = -Math.PI / 2; snowFloor.receiveShadow = true;
  box(scene, 20, 3.2, 0.2, mat(0xb8b8ae, 0.9), 0, 1.6, -11, false);
  for (const x of [-4.5, 4.5]) box(scene, 0.2, 3.2, 24, mat(0xb0b2aa, 0.9), x, 1.6, -2, false);

  // twee rijen mainframes met bandspoelen
  const cab = mat(0xd9d4c4, 0.55, 0.1), cabDark = mat(0x3a4048, 0.5, 0.3), reelMat = mat(0x8a9098, 0.3, 0.8);
  const reels = [], leds = [], caps = [];
  const reelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.025, 28).rotateX(Math.PI / 2);
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
    const z = -0.6 - i * 1.25, x = side * 1.5;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -side * Math.PI / 2; scene.add(g);
    box(g, 1.0, 1.9, 0.75, cab, 0, 0.95, 0);
    box(g, 0.8, 0.85, 0.02, cabDark, 0, 1.3, 0.38);
    if (i % 2 === 0) {
      for (const dx of [-0.2, 0.2]) {
        const rl = mesh(reelGeo, reelMat, dx, 1.42, 0.4, g);
        box(rl, 0.03, 0.24, 0.03, mat(0x222222, 0.5), 0, 0, 0, false);
        reels.push({ m: rl, d: dx > 0 ? 1 : -1.3 });
      }
    } else {
      for (let k = 0; k < 6; k++) for (let j = 0; j < 4; j++) {
        const l = mesh(new THREE.BoxGeometry(0.05, 0.03, 0.01), glowOwn(k % 3 ? 0xff5a3a : 0xfff2a0, 1), -0.28 + k * 0.11, 1.05 + j * 0.15, 0.4, g, false);
        leds.push({ m: l, ph: hash(i * 50 + k * 7 + j + side * 3) });
      }
    }
    box(g, 0.6, 0.2, 0.02, cabDark, 0, 0.45, 0.38);
    const cap = box(g, 1.0, 1, 0.75, mat(0xf4f8fb, 1), 0, 1.9, 0, false);
    cap.geometry.translate(0, 0.5, 0); cap.scale.y = 0.001;
    caps.push(cap);
  }

  // terminal vooraan
  const term = new THREE.Group(); term.position.set(0.5, 0, 1.5); term.rotation.y = -0.4; scene.add(term);
  box(term, 0.9, 0.05, 0.6, mat(0xc8c2b0, 0.6), 0, 0.74, 0);
  box(term, 0.84, 0.72, 0.55, cabDark, 0, 0.36, 0);
  box(term, 0.46, 0.38, 0.4, cab, 0, 0.97, -0.05);
  const screen = label('> SUBSIDIE STOPGEZET_', 0.06, { size: 44, weight: 600, color: '#7dffa0', bg: '#06140a', pad: 18, minW: 640 });
  screen.position.set(0, 0.99, 0.152); term.add(screen);

  // tl-lampen die één voor één uitgaan
  const tl = [];
  for (let i = 0; i < 6; i++) {
    const z = 0.5 - i * 1.8;
    const m = box(scene, 0.12, 0.03, 1.2, glowOwn(0xeef4ff, 1), 0, 3.15, z, false);
    const l = new THREE.PointLight(C(0xe8f0ff), 0.9, 6, 2); l.position.set(0, 2.9, z); scene.add(l);
    tl.push({ m, l, off: 3 + i * 1.0 + hash(i) * 0.6 });
  }

  // sneeuw
  const NS = 1800, sp = new Float32Array(NS * 3), sb = [];
  const r = rng(9);
  for (let i = 0; i < NS; i++) sb.push([(r() - 0.5) * 8, r(), -10 + r() * 13, r() * TAU, 0.2 + r() * 0.25]);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sm = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, map: dotTexture(), transparent: true, opacity: 0, depthWrite: false });
  const snow = new THREE.Points(sg, sm); snow.frustumCulled = false; scene.add(snow);

  const cam = camPath([
    [0, [0.2, 1.65, 4.6], [0, 1.25, -2], 36],
    [7, [0.05, 1.5, 1.4], [-0.6, 1.2, -5], 38],
    [13, [-0.2, 2.1, -1.8], [0.4, 1.0, -8], 40],
  ]);

  return {
    y0: 1974, y1: 1993, phase: 'verleden', era: 'Verleden · 1974–1993', duration: 13,
    title: 'AI-winter',
    txt: 'De beloftes waren te groot. Computers zijn te traag, de problemen te moeilijk, en in 1969 tonen onderzoekers precies aan wat een eenvoudige perceptron niet kan. Het geld droogt op. In de jaren tachtig volgt een opleving met expertsystemen vol handgeschreven regels, daarna een tweede winter.',
    fact: 'Lighthill-rapport: in 1973 concludeerde de Britse wiskundige James Lighthill dat AI zijn grote beloftes nergens had waargemaakt. Het Britse AI-onderzoek kreeg daarna jarenlang nauwelijks geld.',
    hud: [
      { at: 1.5, text: 'FINANCIERING ▼', warn: true },
      { at: 2.2, text: 'VERWACHTINGEN ▼', warn: true },
      { at: 2.9, text: 'REKENKRACHT · TE KLEIN' },
    ],
    scene,
    update(t) {
      const cold = smooth(seg(t, 1.5, 12));
      const u = seg(t, 3, 10), ang = 9 * (Math.min(t, 3) + 7 * (u - u * u * u + u * u * u * u / 2));
      for (const rl of reels) rl.m.rotation.z = ang * rl.d;
      const blinkOn = 1 - smooth(seg(t, 4, 11));
      for (const l of leds) l.m.material.opacity = (Math.sin(t * 6 + l.ph * 40) > 0 ? 1 : 0.15) * blinkOn + 0.05;
      for (const lt of tl) {
        const f = t < lt.off ? 1 : t < lt.off + 0.4 ? (Math.sin(t * 60) > 0 ? 0.8 : 0.1) : 0.05;
        lt.m.material.opacity = f; lt.l.intensity = 0.9 * f;
      }
      L.hemi.intensity = lerp(0.45, 0.32, cold);
      L.hemi.color.copy(C(0xc8d4e0)).lerp(C(0x9ab8e0), cold);
      scene.fog.near = lerp(6, 2, cold); scene.fog.far = lerp(22, 12, cold);
      scene.fog.color.setHex(0x0b0f14).lerp(new THREE.Color(0x4a5a6c), cold * 0.8);
      scene.background.copy(scene.fog.color);
      snowFloor.material.opacity = 0.85 * smooth(seg(t, 3, 12.5));
      for (const c of caps) c.scale.y = 0.001 + 0.06 * smooth(seg(t, 3.5, 12.5));
      screen.material.opacity = 0.3 + 0.7 * (Math.sin(t * 3) > -0.3 ? 1 : 0) * (1 - 0.6 * cold);
      sm.opacity = 0.9 * smooth(seg(t, 0.8, 4));
      for (let i = 0; i < NS; i++) {
        const b = sb[i], y = 3.1 * (1 - frac(b[1] + t * b[4] * 0.3));
        sp[i * 3] = b[0] + 0.15 * Math.sin(t * 0.8 + b[3]);
        sp[i * 3 + 1] = y;
        sp[i * 3 + 2] = b[2] + 0.1 * Math.cos(t * 0.6 + b[3]);
      }
      sg.attributes.position.needsUpdate = true;
    },
    camera: cam,
  };
}

// =============================================================================
// 5 — 1997: Deep Blue verslaat Kasparov
// =============================================================================
function sceneChess() {
  const scene = stage(0x050505, 6, 16);
  lights(scene, { sky: 0x8090a0, ground: 0x050505, hemi: 0.12, sunI: 0.15, sunPos: V(-2, 8, 2), shadows: false });
  const key = spot(scene, 0xfff4e4, 3, V(0.2, 3.4, 0.4), V(0, 0.76, 0), 0.42, 0.55, 8);
  const rim = new THREE.PointLight(C(0x5aa8ff), 1.2, 6, 2); rim.position.set(0, 1.6, -1.7); scene.add(rim);
  floor(scene, 0x0e0e10, 0.45, 0.3);

  // tafel en bord
  const S = 0.06, TOP = 0.78;
  box(scene, 1.0, 0.04, 1.4, mat(0x161616, 0.4, 0.2), 0, TOP - 0.02, 0);
  cyl(scene, 0.06, 0.12, TOP - 0.04, mat(0x161616, 0.4, 0.4), 0, (TOP - 0.04) / 2, 0, 18);
  const bc = document.createElement('canvas'); bc.width = bc.height = 512;
  const bg = bc.getContext('2d');
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { bg.fillStyle = (i + j) % 2 ? '#d8c09a' : '#6a4426'; bg.fillRect(i * 64, j * 64, 64, 64); }
  const btex = new THREE.CanvasTexture(bc); btex.encoding = THREE.sRGBEncoding;
  box(scene, 8 * S + 0.06, 0.02, 8 * S + 0.06, mat(0x3a2414, 0.5), 0, TOP + 0.01, 0);
  const sq = mesh(new THREE.PlaneGeometry(8 * S, 8 * S), new THREE.MeshStandardMaterial({ map: btex, roughness: 0.35 }), 0, TOP + 0.021, 0, scene);
  sq.rotation.x = -Math.PI / 2;
  const Y0 = TOP + 0.021;

  // stukken
  const whiteM = mat(0xeee6d4, 0.35), blackM = mat(0x1a1714, 0.3, 0.1);
  const prof = pts => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0] * S, p[1] * S)), 24);
  const base = [[0, 0], [0.38, 0], [0.38, 0.08], [0.3, 0.13], [0.2, 0.18]];
  const GEO = {
    p: prof([...base, [0.13, 0.42], [0.22, 0.48], [0.12, 0.53], [0.2, 0.62], [0.21, 0.72], [0.14, 0.82], [0, 0.86]]),
    r: prof([...base, [0.2, 0.62], [0.28, 0.66], [0.28, 0.86], [0.2, 0.86], [0.2, 0.8], [0, 0.8]]),
    b: prof([...base, [0.14, 0.6], [0.24, 0.65], [0.13, 0.7], [0.2, 0.86], [0.12, 1.02], [0.07, 1.06], [0.08, 1.12], [0, 1.16]]),
    q: prof([...base, [0.14, 0.75], [0.26, 0.8], [0.15, 0.86], [0.26, 1.12], [0.12, 1.16], [0.1, 1.22], [0, 1.26]]),
    k: prof([...base, [0.15, 0.8], [0.28, 0.85], [0.16, 0.9], [0.25, 1.15], [0.05, 1.2], [0, 1.2]]),
    n: prof([...base, [0.2, 0.3], [0, 0.32]]),
  };
  const kingCross = [new THREE.BoxGeometry(0.05 * S, 0.3 * S, 0.05 * S * 2), new THREE.BoxGeometry(0.2 * S, 0.06 * S, 0.1 * S)];
  const knightHead = new THREE.BoxGeometry(0.28 * S, 0.62 * S, 0.5 * S);
  const pieces = {};
  const at = (sqr, out = V()) => out.set((sqr.charCodeAt(0) - 100.5) * S, Y0, (Number(sqr[1]) - 4.5) * S);
  function piece(type, white, sqr) {
    const g = new THREE.Group(), m = white ? whiteM : blackM;
    mesh(GEO[type], m, 0, 0, 0, g);
    if (type === 'k') { mesh(kingCross[0], m, 0, 1.33 * S, 0, g); mesh(kingCross[1], m, 0, 1.35 * S, 0, g); }
    if (type === 'n') { const h = mesh(knightHead, m, 0, 0.62 * S, 0.05 * S, g); h.rotation.x = 0.35; mesh(new THREE.BoxGeometry(0.26 * S, 0.24 * S, 0.42 * S), m, 0, 0.82 * S, 0.3 * S, g).rotation.x = 0.9; }
    if (!white && type === 'n') g.rotation.y = Math.PI;
    at(sqr, g.position);
    scene.add(g);
    pieces[sqr] = g;
    g.userData.home = g.position.clone();
    return g;
  }
  // wit (de computer) staat aan de verre kant
  const W = { a2: 'p', b2: 'p', c3: 'p', f2: 'p', g2: 'p', h2: 'p', e5: 'p', a1: 'r', f1: 'r', f3: 'n', c4: 'b', d1: 'q', g1: 'k' };
  const B = { a7: 'p', b7: 'p', c7: 'p', f7: 'p', g7: 'p', h7: 'p', d5: 'p', a8: 'r', f8: 'r', c6: 'n', e7: 'b', d8: 'q', g8: 'k' };
  for (const k in W) piece(W[k], true, k);
  for (const k in B) piece(B[k], false, k);
  // zetten: Lxd5, Pxe5, Pxe5, h6, Dh5 — [van, naar, start]
  const MOVES = [['c4', 'd5', 2.0], ['c6', 'e5', 4.3], ['f3', 'e5', 6.6], ['h7', 'h6', 8.6], ['d1', 'h5', 10.6]];
  const movers = MOVES.map(([from, to, t0]) => ({ obj: pieces[from], from: at(from), to: at(to), t0, victim: null }));
  movers[0].victim = pieces.d5;          // zwarte pion
  movers[1].victim = pieces.e5;          // witte pion
  movers[2].victim = movers[1].obj;      // het zwarte paard dat net op e5 kwam

  // de computer: zwarte kast met knipperende lampjes
  const tower = new THREE.Group(); tower.position.set(0, 0, -1.55); scene.add(tower);
  box(tower, 0.95, 2.0, 0.85, mat(0x0d0f12, 0.25, 0.7), 0, 1.0, 0);
  box(tower, 0.75, 1.4, 0.02, mat(0x050608, 0.2, 0.9), 0, 1.15, 0.43);
  const NL = 16 * 12, ledM = instanced(new THREE.BoxGeometry(0.03, 0.03, 0.01), new THREE.MeshBasicMaterial({ toneMapped: false }), NL);
  const o = new THREE.Object3D();
  for (let i = 0; i < 16; i++) for (let j = 0; j < 12; j++) { o.position.set(-0.33 + i * 0.044, 0.55 + j * 0.105, 0.445); o.updateMatrix(); ledM.setMatrixAt(i * 12 + j, o.matrix); ledM.setColorAt(i * 12 + j, C(0x38bdf8)); }
  tower.add(ledM);
  // operator-scherm aan de kant van de computer
  const mon = new THREE.Group(); mon.position.set(-0.32, TOP, -0.5); mon.rotation.y = 0.35; scene.add(mon);
  box(mon, 0.28, 0.2, 0.04, mat(0x1a1a1a, 0.4), 0, 0.12, 0);
  const scr = label('EVAL +1.48\nDIEPTE 12', 0.16, { size: 40, weight: 600, color: '#9ad8ff', bg: '#04121c', pad: 14, minW: 220, align: 'left' });
  scr.position.set(0, 0.12, 0.021); mon.add(scr);

  // de mens
  const human = createFigure({ color: 0x2a2f3a, hair: 0x1a120c, pose: { sit: 1, lean: 0.35, headX: 0.35, rSh: 1.2, rEl: 2.2, lSh: 0.5, lEl: 1.2, rShO: 0.2 } });
  human.root.position.set(0, 0, 0.92); human.root.rotation.y = Math.PI; scene.add(human.root);
  box(scene, 0.44, 0.04, 0.44, mat(0x222222, 0.5), 0, 0.46, 0.95);

  const cam = camPath([
    [0, [0.75, 1.15, 0.7], [-0.1, 0.8, -0.1], 34],
    [5.5, [-0.85, 1.2, 0.75], [0.05, 0.82, -0.05], 34],
    [9.5, [0.95, 1.15, -0.55], [-0.05, 0.84, 0.05], 34],
    [13, [1.9, 1.6, 2.1], [-0.1, 0.95, -0.3], 36],
  ]);
  const p = V(), col = new THREE.Color(), blue = C(0x38bdf8), off = C(0x0a1a22);

  return {
    y0: 1996, y1: 1997, phase: 'verleden', era: 'Verleden · 1997', duration: 13,
    title: 'Schaakmat',
    txt: 'Rekenkracht wordt goedkoper. Een IBM-supercomputer, Deep Blue, verslaat wereldkampioen Garri Kasparov in een match van zes partijen. Deep Blue denkt niet zoals een mens. Hij rekent razendsnel miljoenen zetten vooruit, met beoordelingsregels die mensen hebben bedacht.',
    fact: 'Brute kracht: Deep Blue bekeek zo’n 200 miljoen stellingen per seconde. Kasparov verloor de match met 2½ tegen 3½.',
    hud: [
      { at: 1.0, text: '200 MLN STELLINGEN / S' },
      { at: 1.7, text: 'PARTIJ 6 · 11 MEI 1997' },
      { at: 2.4, text: 'EINDSTAND 3½ – 2½' },
    ],
    scene,
    update(t) {
      for (const m of movers) {
        const u = seg(t, m.t0, m.t0 + 1.1), e = easeIO(u);
        p.lerpVectors(m.from, m.to, e); p.y += 0.07 * bump(u, 0, 1);
        if (t >= m.t0) m.obj.position.copy(p); else m.obj.position.copy(m.from);
        if (m.victim) {
          const v = seg(t, m.t0 + 0.8, m.t0 + 1.2);
          m.victim.visible = v < 1;
          m.victim.scale.setScalar(1 - 0.6 * v);
        }
      }
      for (let n = 0; n < NL; n++) ledM.setColorAt(n, col.copy(off).lerp(blue, hash(n + Math.floor(t * 9) * 0.137) > 0.55 ? 1 : 0.1));
      ledM.instanceColor.needsUpdate = true;
      const think = Math.floor(t * 4) % 3;
      scr.material.opacity = 0.7 + 0.3 * (think === 0 ? 1 : 0.6);
      human.setPose({ sit: 1, lean: 0.35 + 0.04 * Math.sin(t * 0.7), headX: 0.35, rSh: 1.2, rEl: 2.2 + 0.05 * Math.sin(t), lSh: 0.5, lEl: 1.2, rShO: 0.2 });
      key.intensity = 7 * smooth(seg(t, 0, 1));
    },
    camera: cam,
  };
}

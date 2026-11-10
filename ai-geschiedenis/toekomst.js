'use strict';
/* =============================================================================
   toekomst.js — scènes 11 en 12: een mogelijke toekomst. De robot komt uit
   humanoid-showreel (robot.js, poses.js).
   ============================================================================= */

const STYLE = { white: { shell: 0xf1f3f5, trim: 0x262b33, accent: 0xa78bfa } };
const walkPhase = d => (d / STRIDE_WALK) * TAU;

// =============================================================================
// 11 — ±2035: een robot met een taalmodel als brein werkt in de kas
// =============================================================================
function sceneGreenhouse() {
  const scene = stage(0xc9d8de, 9, 34);
  const L = lights(scene, { sky: 0xeaf4ff, ground: 0x6a5a40, hemi: 0.75, sun: 0xfff1d8, sunI: 1.9, sunPos: V(4, 9, 5), shadow: 6 });
  floor(scene, 0x8a8478, 0.9);
  const soil = mat(0x4a3424, 0.95), green = mat(0x3f7a34, 0.8), green2 = mat(0x2f6a2c, 0.85), red = mat(0xd8321e, 0.45), steel = mat(0xdfe4e8, 0.4, 0.6);

  // robot en kalibratie van pluk- en legplek
  const robot = createRobot(STYLE.white);
  scene.add(robot.root);
  const reach = P({ lean: 0.22, headX: 0.35, lHip: 0.12, rHip: 0.12, lKnee: 0.18, rKnee: 0.18, lSh: 1.2, rSh: 1.2, lEl: 0.3, rEl: 0.3, lShO: -0.12, rShO: -0.12 });
  const hold = P({ lean: 0.04, headX: 0.25, lHip: 0.04, rHip: 0.04, lKnee: 0.08, rKnee: 0.08, lSh: 0.55, rSh: 0.55, lEl: 1.25, rEl: 1.25, lShO: -0.12, rShO: -0.12 });
  const place = P({ lean: 0.42, headX: 0.45, lHip: 0.35, rHip: 0.35, lKnee: 0.5, rKnee: 0.5, lSh: 0.85, rSh: 0.85, lEl: 0.3, rEl: 0.3, lShO: -0.12, rShO: -0.12 });
  const pick = calibrate(robot, reach, V(0, 0, 0), Math.PI / 2);
  const drop = calibrate(robot, place, V(0, 0, 0), -Math.PI / 2);

  // plantenrijen links en rechts van het pad
  const rowR = pick.x + 0.2, rowL = -1.45;
  const leafGeo = new THREE.IcosahedronGeometry(0.12, 0);
  const leaves = instanced(leafGeo, green, 2 * 14 * 9);
  const toms = instanced(new THREE.SphereGeometry(0.035, 12, 8), red, 2 * 14 * 6);
  leaves.frustumCulled = toms.frustumCulled = false;
  leaves.castShadow = leaves.receiveShadow = true;
  const o = new THREE.Object3D(), r = rng(5);
  let nl = 0, nt = 0;
  for (const x of [rowR, rowL]) {
    box(scene, 0.5, 0.2, 14, soil, x + (x > 0 ? 0.1 : -0.1), 0.1, -2.5);
    for (let i = 0; i < 14; i++) {
      const z = 3.4 - i * 0.65;
      cyl(scene, 0.012, 0.016, 2.1, green2, x + 0.08 * Math.sign(x), 1.15, z, 6);
      for (let k = 0; k < 9; k++) {
        o.position.set(x + Math.sign(x) * 0.1 + (r() - 0.5) * 0.25, 0.45 + k * 0.2 + r() * 0.1, z + (r() - 0.5) * 0.3);
        o.rotation.set(r() * 3, r() * 3, r() * 3); o.scale.set(1 + r() * 0.4, 0.5 + r() * 0.3, 1 + r() * 0.4);
        o.updateMatrix(); leaves.setMatrixAt(nl++, o.matrix);
      }
      for (let k = 0; k < 6; k++) {
        o.position.set(x - Math.sign(x) * (0.02 + r() * 0.06), 0.75 + r() * 0.6, z + (r() - 0.5) * 0.2);
        o.rotation.set(0, 0, 0); o.scale.setScalar(0.8 + r() * 0.5);
        o.updateMatrix(); toms.setMatrixAt(nt++, o.matrix);
      }
    }
  }
  leaves.count = nl; toms.count = nt;
  scene.add(leaves, toms);
  const tomato = sphere(scene, 0.04, red, pick.x, pick.y, pick.z);
  cyl(scene, 0.004, 0.004, 0.2, green2, pick.x + 0.05, pick.y + 0.1, pick.z, 5).rotation.z = 0.5;

  // kar met krat
  const cart = new THREE.Group(); scene.add(cart);
  const ct = drop.y - 0.07;
  box(cart, 0.5, 0.03, 0.4, steel, drop.x, ct - 0.2, drop.z);
  box(cart, 0.46, 0.2, 0.36, mat(0x2a7a4a, 0.6), drop.x, ct - 0.09, drop.z);
  for (const dx of [-0.2, 0.2]) for (const dz of [-0.16, 0.16]) box(cart, 0.03, ct - 0.2, 0.03, steel, drop.x + dx, (ct - 0.2) / 2, drop.z + dz);
  for (let i = 0; i < 9; i++) sphere(cart, 0.04, red, drop.x - 0.15 + (i % 3) * 0.13 + (r() - 0.5) * 0.03, ct + 0.02, drop.z - 0.11 + Math.floor(i / 3) * 0.11);

  // kasconstructie
  for (let i = 0; i < 6; i++) {
    const z = 3.6 - i * 2.2;
    for (const x of [-2.4, 2.4]) box(scene, 0.06, 3, 0.06, steel, x, 1.5, z);
    const a = box(scene, 2.6, 0.05, 0.05, steel, -1.2, 3.35, z); a.rotation.z = 0.28;
    const b = box(scene, 2.6, 0.05, 0.05, steel, 1.2, 3.35, z); b.rotation.z = -0.28;
  }
  const glass = new THREE.MeshStandardMaterial({ color: C(0xdff0ff), transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false });
  for (const s of [-1, 1]) { const g = mesh(new THREE.PlaneGeometry(2.6, 14), glass, s * 1.2, 3.38, -2, scene, false); g.rotation.set(-Math.PI / 2, 0, 0); g.rotation.y = s * 0.28; }

  // mens met tablet
  const human = createFigure({ color: 0x4a6a8a, legs: 0x2a3440, hair: 0x6a4a2a });
  human.root.position.set(-0.45, 0, 2.5); human.root.rotation.y = Math.PI - 0.15; scene.add(human.root);
  const tablet = box(human.J.spine, 0.22, 0.15, 0.012, mat(0x111418, 0.3, 0.5), 0, 0.28, 0.32, false);
  tablet.rotation.x = -0.9;

  // zwevend takenpaneel
  const panel = new THREE.Group(); scene.add(panel);
  const STEPS = [['1  ZOEK RIJPE TOMAAT', 4.8], ['2  PLUK VOORZICHTIG', 6.6], ['3  LEG IN KRAT', 9.5], ['4  MELD: KLAAR', 10.4]];
  const lines = STEPS.map(([s, at], i) => {
    const l = label(s, 0.075, { size: 44, weight: 600, color: '#ede9fe', bg: 'rgba(46,30,92,0.75)', border: '#a78bfa', borderW: 3, radius: 8, pad: 14, minW: 520, align: 'left' });
    l.position.set(0, -i * 0.095, 0); panel.add(l);
    return { l, at };
  });
  const head = V();

  const pose = track([
    [4.6, () => POSES.walk(walkPhase(4.4), 0)], [5.3, POSES.stand],
    [6.2, reach], [6.7, reach], [7.4, hold], [8.4, hold],
    [9.2, place], [9.6, place], [10.3, POSES.stand], [10.8, POSES.wave], [12.4, POSES.wave], [13.0, POSES.stand],
  ]);
  const yawTo = Math.atan2(human.root.position.x, human.root.position.z);

  const cam = camPath([
    // de camera blijft in het pad tussen de plantenrijen
    [0, [0.2, 1.6, 4.4], [-0.1, 1.0, -2.5], 38],
    [4.8, [0.3, 1.5, 2.1], [-0.15, 1.0, -0.4], 38],
    [8.6, [-0.2, 1.5, 1.9], [0.0, 0.95, -0.3], 38],
    [14, [0.25, 1.75, 4.2], [-0.25, 1.1, 0.4], 40],
  ]);

  return {
    y0: 2030, y1: 2040, phase: 'toekomst', era: 'Toekomst · een scenario', duration: 14,
    title: 'Verstand krijgt een lichaam',
    txt: 'Een mogelijke volgende stap: AI die niet alleen praat, maar ook ziet, plant en handelt in de echte wereld. Je legt een robot in gewone taal een klus uit en hij zoekt zelf uit hoe het moet: in de kas, in de zorg, in huis.',
    fact: 'Onzeker: hoe snel dit gaat, weet niemand. Schattingen van wanneer AI de meeste menselijke taken aankan, lopen uiteen van een paar jaar tot vele decennia.',
    hud: [
      { at: 0.8, text: 'OPDRACHT · “OOGST DE RIJPE TOMATEN”' },
      { at: 1.5, text: 'ZIEN · PLANNEN · DOEN' },
      { at: 2.2, text: 'MENS IN DE BUURT · LANGZAAM' },
    ],
    scene,
    update(t) {
      // lopen, draaien, plukken, leggen, zwaaien
      const d = travel(t, 4.4, 0.2, 4.6, 0.6, 0.8);
      robot.root.position.set(0, 0, -4.4 + d);
      let yaw = 0;
      if (t > 4.7) yaw = lerp(0, Math.PI / 2, easeIO(seg(t, 4.7, 5.5)));
      if (t > 7.4) yaw = lerp(Math.PI / 2, -Math.PI / 2, easeIO(seg(t, 7.4, 8.6)));
      if (t > 10.0) yaw = lerp(-Math.PI / 2, yawTo, easeIO(seg(t, 10.0, 10.8)));
      robot.root.rotation.y = yaw;
      robot.setPose(t < 4.6 ? POSES.walk(walkPhase(d), 1 - smooth(seg(t, 4.0, 4.6))) : pose(t));
      robot.setGlow(1);
      if (t < 6.5) tomato.position.copy(pick);
      else if (t < 9.4) robot.handsMid(tomato.position);
      else tomato.position.set(drop.x, lerp(drop.y, ct + 0.06, smooth(seg(t, 9.4, 9.6))), drop.z);
      // de mens zwaait terug
      const w = bump(t, 11.0, 12.8);
      human.setPose({ lSh: 0.7, lEl: 1.3, rSh: lerp(0.7, 0.3, w), rShO: 2.3 * w, rEl: lerp(1.3, 0.7 + 0.4 * Math.sin(t * 9), w), headX: 0.15 * (1 - w) });
      robot.headPos(head);
      panel.position.set(head.x + 0.45, head.y + 0.35, head.z + 0.1);
      lines.forEach(({ l, at }) => { l.material.opacity = 0.95 * smooth(seg(t, at, at + 0.4)); });
    },
    camera(t, c) {
      cam(t, c);
      panel.quaternion.copy(c.quaternion);
    },
  };
}

// =============================================================================
// 12 — 2050 en verder: de aarde, verbonden. Wat willen we ermee?
// =============================================================================
function sceneFuture() {
  const scene = stage(0x000000);
  // zon van opzij: de camera ziet een half verlichte aarde met een nachtkant vol lichtjes
  const SUN = V(-6, 2.5, 3);
  lights(scene, { sky: 0x304870, ground: 0x000000, hemi: 0.18, sun: 0xfff4e4, sunI: 2.2, sunPos: SUN, shadows: false });
  const RP = 2;

  // planeettextuur (equirectangulair) uit ruis
  const W = 512, Hh = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
  const g = cv.getContext('2d'), img = g.createImageData(W, Hh);
  const landAt = (lon, lat) => fbm(lon * 1.4 + 10, lat * 2.6 + 4, 5) + 0.12 * Math.cos(lat * 2) - 0.06;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const lon = (x / W) * TAU - Math.PI, lat = (0.5 - y / Hh) * Math.PI;
    const v = landAt(lon, lat), land = v > 0.52, ice = Math.abs(lat) > 1.25;
    const k = (y * W + x) * 4;
    const c = ice ? [220, 228, 236] : land ? [58 + 40 * (v - 0.52), 74, 46] : [10, 32 + 20 * v, 64 + 30 * v];
    img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const ptex = new THREE.CanvasTexture(cv); ptex.encoding = THREE.sRGBEncoding;
  const planet = mesh(new THREE.SphereGeometry(RP, 96, 64), new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.8 }), 0, 0, 0, scene, false);

  // atmosfeer (fresnel-gloed)
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(RP * 1.06, 64, 48), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { col: { value: new THREE.Color(0x5aa0ff) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 col; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.5); gl_FragColor = vec4(col * f * 1.4, f); }',
  }));
  scene.add(atmo);

  // stadslichten op het land, en verbindingen die groeien
  // zelfde afbeelding als de uv's van SphereGeometry: u = (lon + π) / 2π
  const dirOf = (lon, lat) => V(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon));
  const globe = new THREE.Group(); scene.add(globe);
  globe.add(planet);
  const cities = [], r = rng(19);
  while (cities.length < 2600) {
    const lon = r() * TAU - Math.PI, lat = Math.asin(r() * 2 - 1) * 0.85;
    const v = landAt(lon, lat);
    if (v > 0.55 && r() < (v - 0.5) * 4) cities.push(dirOf(lon, lat).multiplyScalar(RP * 1.003));
  }
  const cp = new Float32Array(cities.length * 3);
  cities.forEach((p, i) => cp.set([p.x, p.y, p.z], i * 3));
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cp, 3));
  const cm = new THREE.PointsMaterial({ color: C(0xffc87a), size: 0.04, map: dotTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  globe.add(new THREE.Points(cg, cm));
  const arcs = [];
  for (let i = 0; i < 70; i++) {
    const a = cities[Math.floor(r() * cities.length)], b = cities[Math.floor(r() * cities.length)];
    const d = a.distanceTo(b);
    if (d < 0.6) { i--; continue; }
    const mid = a.clone().add(b).normalize().multiplyScalar(RP + 0.1 + d * 0.13);
    const pts = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(60);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: C(i % 3 ? 0xa78bfa : 0x7dd3fc), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    geo.setDrawRange(0, 0);
    globe.add(m);
    arcs.push({ geo, t0: 1.5 + r() * 6.5 });
  }

  // sterren en opkomende zon
  const sp = new Float32Array(3000 * 3);
  for (let i = 0; i < 3000; i++) { const y = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - y * y); sp.set([s * Math.cos(a) * 80, y * 80, s * Math.sin(a) * 80], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.8 })));
  const sunDir = SUN.clone().normalize();
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: C(0xfff0d8), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  sunGlow.position.copy(sunDir).multiplyScalar(40); sunGlow.scale.setScalar(9);
  scene.add(sunGlow);

  // eerst laag over het oppervlak, iets vóór de camera uit; daarna uitzoomen naar de hele bol
  const orbitDir = (th, el) => V(Math.sin(th) * Math.cos(el), Math.sin(el), Math.cos(th) * Math.cos(el));
  const start = orbitDir(0.95, 0.3).multiplyScalar(RP);
  return {
    y0: 2040, y1: 2060, phase: 'toekomst', era: 'Toekomst · open einde', duration: 15,
    title: 'Wat willen we ermee?',
    txt: 'Misschien helpt AI ziektes genezen, het klimaat begrijpen en saai werk overnemen. Misschien maakt het ook nepnieuws, banenverlies en machtsconcentratie groter. Hoe slimmer de systemen, hoe belangrijker de vraag of ze doen wat wij willen. Dat is geen natuurwet: daar kiezen we zelf voor.',
    fact: 'Regels: de Europese AI-verordening uit 2024 is de eerste brede AI-wet ter wereld. Ze wordt sinds 2025 stap voor stap van kracht.',
    hud: [
      { at: 1.0, text: 'KANSEN · ZORG · KLIMAAT · KENNIS' },
      { at: 1.8, text: 'RISICO’S · NEP · MACHT · CONTROLE', warn: true },
      { at: 2.6, text: 'KOERS · ?' },
    ],
    card: { at: 9.6, until: 15, big: 'MORGEN', small: 'De toekomst van AI schrijven we zelf', note: 'VAN 1843 TOT ?' },
    lowerUntil: 9.2,
    scene,
    update(t) {
      globe.rotation.y = t * 0.03;
      cm.opacity = 0.9 * smooth(seg(t, 0.4, 2.5));
      for (const a of arcs) a.geo.setDrawRange(0, Math.floor(61 * easeOut(seg(t, a.t0, a.t0 + 1.6))));
      sunGlow.material.opacity = smooth(seg(t, 6, 12));
    },
    camera(t, c) {
      const k = easeIO(seg(t, 0.5, 12.5));
      const th = 0.5 + t * 0.035, el = lerp(0.45, 0.22, k), d = lerp(2.75, 7.4, k);
      const tg = start.clone().multiplyScalar(lerp(1, 0, k));
      const p = orbitDir(th, el).multiplyScalar(d);
      aim(c, p.x, p.y, p.z, tg.x, tg.y, tg.z, 38);
    },
  };
}

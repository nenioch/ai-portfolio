'use strict';
/* =============================================================================
   stad.js — kleuren van de film en de stad met AI-agents in het midden.
   Lijnen lopen van de AI-kern naar zes plekken waar de samenleving op draait;
   per plek kan een lijn groeien (grow), ontsporen (danger) en een risico
   tonen (risk). Gebruikt door scène 3, 4 en de slotscène.
   ============================================================================= */

const KLEUR = {
  blauw: '#38bdf8',     // AI die doet wat we bedoelen
  oranje: '#fb923c',    // doel en bedoeling lopen uiteen
  rood: '#f43f5e',      // ontspoord
  groen: '#4ade80',     // grip
  amber: '#e8a64a',
};
const hexNum = s => parseInt(s.slice(1), 16);

const PLEKKEN = [
  { naam: 'ZIEKENHUIS', kleur: 0xe8ecef, h: 4.2, risico: 'ÉÉN FOUT · DUIZENDEN PATIËNTEN' },
  { naam: 'BANK', kleur: 0x9aa4b4, h: 5.4, risico: 'SNELLER DAN HET TOEZICHT' },
  { naam: 'GEMEENTE', kleur: 0xc9b89a, h: 3.4, risico: 'WIE IS VERANTWOORDELIJK?' },
  { naam: 'STROOMNET', kleur: 0x6a7480, h: 3.0, risico: 'TE AFHANKELIJK OM UIT TE ZETTEN' },
  { naam: 'NIEUWS', kleur: 0xb07a6a, h: 4.6, risico: 'WAT IS NOG ECHT?' },
  { naam: 'AI-LAB', kleur: 0x5a5a72, h: 3.8, risico: 'VERBERGT WAT HET DOET' },
];

function buildStad(o = {}) {
  const scene = stage(o.bg || 0x0d1018, 22, 95);
  const L = lights(scene, { sky: o.sky || 0x5a6a8a, ground: 0x050505, hemi: o.hemi || 0.55, sun: o.sun || 0xc8d4ff, sunI: o.sunI || 0.9, sunPos: V(-8, 14, 6), shadow: 16 });
  const tex = gridTexture(o.floor || '#0a0c12', 'rgba(160,180,220,0.10)', 4);
  tex.repeat.set(60, 60);
  floor(scene, 0xffffff, 0.95, 0, 240, tex);
  starField(scene, 600, 150, 9, 0.5);
  const r = rng(31);

  // ---------------------------------------------------------------- de rest van de stad
  const F = [];
  for (let i = 0; i < 420 && F.length < 150; i++) {
    const a = r() * TAU, d = 13 + r() * 30;
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    if (F.some(f => Math.abs(f.x - x) < 2.6 && Math.abs(f.z - z) < 2.6)) continue;
    F.push({ x, z, w: 1.6 + r() * 1.4, h: 1.5 + r() * (d < 20 ? 4 : 9), yaw: r() * 0.4 });
  }
  const wt = windowTexture(8, 14, { light: '#ffd29a', lit: 0.55, seed: 4 });
  const filler = instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: C(0x5a606c), map: wt, emissive: C(0xffffff), emissiveMap: wt, emissiveIntensity: 0.7, roughness: 0.8 }), F.length);
  const ob = new THREE.Object3D();
  F.forEach((f, i) => {
    ob.position.set(f.x, f.h / 2, f.z); ob.rotation.set(0, f.yaw, 0); ob.scale.set(f.w, f.h, f.w);
    ob.updateMatrix(); filler.setMatrixAt(i, ob.matrix);
  });
  filler.castShadow = filler.receiveShadow = true;
  scene.add(filler);

  // ---------------------------------------------------------------- de AI-kern
  const blauw = hexNum(KLEUR.blauw);
  cyl(scene, 0.9, 1.15, 3, mat(0x14161e, 0.3, 0.8), 0, 1.5, 0, 6);
  const kernM = glowOwn(blauw, 0.9, true);
  for (let k = 0; k < 3; k++) mesh(new THREE.TorusGeometry(1.0 + k * 0.04, 0.025, 6, 6), kernM, 0, 0.6 + k * 0.9, 0, scene, false).rotation.x = Math.PI / 2;
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: C(blauw), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  core.position.set(0, 3.5, 0); core.scale.setScalar(3.2);
  scene.add(core);
  const kernLabel = label('AI-AGENTS', 0.5, { size: 48, weight: 700, color: '#e0f2fe' });
  kernLabel.position.set(0, 5.3, 0);
  scene.add(kernLabel);

  // ---------------------------------------------------------------- zes plekken
  const rood = C(hexNum(KLEUR.rood)), blauwC = C(blauw), warm = C(0xffd29a), alarm = C(0xff3a3a);
  const plekken = PLEKKEN.map((p, j) => {
    const a = j / PLEKKEN.length * TAU + 0.35, R = 9;
    const pos = V(Math.sin(a) * R, 0, Math.cos(a) * R);
    const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = a + Math.PI; scene.add(g);
    const wtx = windowTexture(10, Math.round(p.h * 3), { light: '#ffffff', lit: 0.7, seed: 10 + j });
    const m = new THREE.MeshStandardMaterial({ color: C(p.kleur), map: wtx, emissive: warm.clone(), emissiveMap: wtx, emissiveIntensity: 0.9, roughness: 0.6, metalness: 0.1 });
    mesh(new THREE.BoxGeometry(2.6, p.h, 2.6), m, 0, p.h / 2, 0, g);
    box(g, 2.7, 0.12, 2.7, mat(0x1a1c22, 0.6), 0, p.h + 0.06, 0);
    const band = box(g, 2.62, 0.08, 2.62, glowOwn(blauw, 0.9), 0, 0.6, 0, false);
    const naam = label(p.naam, 0.62, { size: 48, weight: 700, color: '#f2f0ec', bg: 'rgba(10,12,16,0.7)', radius: 8, pad: 14 });
    naam.position.set(pos.x, p.h + 0.9, pos.z); naam.material.opacity = 0;
    scene.add(naam);
    const risk = label(p.risico, 0.46, { size: 40, weight: 700, color: '#fff1f2', bg: 'rgba(90,10,20,0.85)', border: KLEUR.rood, borderW: 3, radius: 8, pad: 12 });
    risk.position.set(pos.x * 0.8, p.h + 1.9, pos.z * 0.8); risk.material.opacity = 0;
    scene.add(risk);

    const dir = pos.clone().normalize();
    const curve = new THREE.LineCurve3(dir.clone().multiplyScalar(1.4), dir.clone().multiplyScalar(R - 1.5));
    const lijnM = glowOwn(blauw, 0.9, true);
    const lijn = ribbon(curve, 0.14, 80, lijnM, 0.02);
    scene.add(lijn);
    const pulses = [0, 1, 2].map(() => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: C(blauw), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      s.scale.setScalar(0.55); scene.add(s);
      return s;
    });
    return { p, m, band, naam, risk, curve, lijn, lijnM, pulses, ph: r() };
  });

  // ---------------------------------------------------------------- koepel (alleen slotscène)
  const koepelM = glowOwn(hexNum(KLEUR.groen), 0, true);
  const koepel = mesh(new THREE.SphereGeometry(12, 48, 20, 0, TAU, 0, Math.PI / 2), koepelM, 0, 0, 0, scene, false);
  const koepelLijnen = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(12.02, 24, 8, 0, TAU, 0, Math.PI / 2)),
    new THREE.LineBasicMaterial({ color: C(hexNum(KLEUR.groen)), transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
  scene.add(koepelLijnen);
  koepel.visible = koepelLijnen.visible = false;

  const kleur = V();
  return {
    scene, L, plekken, core,
    // st: { grow(j), danger(j), risk(j), dome }
    update(t, st) {
      core.scale.setScalar(3.2 + 0.3 * Math.sin(t * 2.4));
      let maxD = 0;
      plekken.forEach((pl, j) => {
        const g = st.grow(j), d = st.danger ? st.danger(j) : 0;
        maxD = Math.max(maxD, d);
        pl.lijn.grow(g);
        pl.lijnM.color.copy(blauwC).lerp(rood, d);
        pl.band.material.color.copy(blauwC).lerp(rood, d);
        pl.naam.material.opacity = smooth(seg(g, 0.6, 1));
        pl.risk.material.opacity = st.risk ? st.risk(j) : 0;
        const flick = d > 0 ? 0.55 + 0.45 * Math.sign(Math.sin(t * (9 + j * 2.3) + j)) : 1;
        pl.m.emissive.copy(warm).lerp(alarm, d * 0.7);
        pl.m.emissiveIntensity = 0.9 * lerp(1, flick, d);
        // pulsen: van de kern naar de plek, sneller als het ontspoort
        pl.pulses.forEach((s, i) => {
          const f = frac(t * (0.22 + 0.45 * d) + i / 3 + pl.ph);
          s.position.copy(pl.curve.getPointAt(f)); s.position.y = 0.16;
          s.material.color.copy(blauwC).lerp(rood, d);
          s.material.opacity = f < g ? 0.95 * bump(f, 0, 1) : 0;
        });
      });
      core.material.color.copy(blauwC).lerp(C(hexNum(KLEUR.oranje)), maxD);
      kernM.color.copy(blauwC).lerp(rood, maxD);
      const dome = st.dome || 0;
      koepel.visible = koepelLijnen.visible = dome > 0.001;
      koepelM.opacity = 0.06 * dome;
      koepelLijnen.material.opacity = 0.22 * dome;
      koepel.scale.setScalar(lerp(0.85, 1, easeOut(dome)));
      koepelLijnen.scale.copy(koepel.scale);
      koepelLijnen.rotation.y = t * 0.04;
    },
    face(cam) {
      kernLabel.quaternion.copy(cam.quaternion);
      for (const pl of plekken) { pl.naam.quaternion.copy(cam.quaternion); pl.risk.quaternion.copy(cam.quaternion); }
    },
  };
}

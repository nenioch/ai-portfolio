'use strict';
/* =============================================================================
   mens.js — procedurele wandelaar: geometrie, gewrichten, houdingen
   Skelet, setPose en houdingen uit oermens-dag/mens.js; de kleding is van nu:
   regenjas, broek, bergschoenen, rugzak, helm met hoofdlamp, wandelstokken.
   Assen: kijkt naar +z, links = +x, omhoog = +y. Eenheden in meters.
   ============================================================================= */

const MB = {
  hipW: 0.09, hipDrop: 0.05, thigh: 0.4, shin: 0.4, ankle: 0.07,
  shW: 0.19, shY: 0.38, upper: 0.28, fore: 0.25,
};

let MG = null;
function mensGeometry() {
  if (MG) return MG;
  const cyl = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
  const sph = (r, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h);
  MG = {
    pelvis: sph(0.13).scale(1.15, 0.75, 0.85),
    hem: new THREE.CylinderGeometry(0.17, 0.19, 0.14, 12, 1, true),
    torso: cyl(0.17, 0.15, 0.46, 12).scale(1, 1, 0.74),
    collar: new THREE.TorusGeometry(0.1, 0.04, 7, 14).rotateX(Math.PI / 2).scale(1.1, 1, 0.9),
    neck: cyl(0.045, 0.05, 0.08, 8),
    head: sph(0.105, 18, 14).scale(0.95, 1.12, 1.05),
    brow: new THREE.BoxGeometry(0.15, 0.022, 0.04),
    nose: new THREE.ConeGeometry(0.02, 0.045, 6).rotateX(Math.PI / 2 + 0.4),
    eye: sph(0.011, 6, 5),
    hair: new THREE.SphereGeometry(0.115, 16, 10, 0, TAU, 0, Math.PI * 0.56).scale(1, 1.1, 1.12),
    longHair: cyl(0.09, 0.1, 0.24, 10).scale(1, 1, 0.5),
    beard: new THREE.SphereGeometry(0.1, 12, 8, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.45, Math.PI * 0.4),
    helmet: new THREE.SphereGeometry(0.13, 16, 9, 0, TAU, 0, Math.PI * 0.5).scale(1, 0.95, 1.1),
    lamp: cyl(0.024, 0.024, 0.035, 10).rotateX(Math.PI / 2),
    pack: new THREE.BoxGeometry(0.3, 0.44, 0.17),
    lid: new THREE.BoxGeometry(0.28, 0.08, 0.2),
    shoulder: sph(0.058, 10, 8),
    upper: cyl(0.054, 0.046, 0.28, 9),
    elbow: sph(0.046, 8, 6),
    fore: cyl(0.044, 0.036, 0.25, 9),
    hand: sph(0.042, 8, 6).scale(0.9, 1.3, 0.65),
    hip: sph(0.072, 10, 8),
    thigh: cyl(0.074, 0.057, 0.4, 9),
    knee: sph(0.056, 8, 6),
    shin: cyl(0.056, 0.046, 0.4, 9),
    foot: new THREE.BoxGeometry(0.11, 0.08, 0.26),
  };
  return MG;
}

const KLEDING = {
  anna:  { skin: 0xd9a888, jacket: 0xc8402e, pants: 0x3b4048, hair: 0x5a3a22, helmet: 0xf2c230, pack: 0x2f5d73, boot: 0x4a3a2c, long: true },
  bram:  { skin: 0xc89272, jacket: 0x2f6fa8, pants: 0x5b5246, hair: 0x2a1d14, helmet: 0xe8e8e2, pack: 0x8a3b2b, boot: 0x3a2f26, beard: true },
  waard: { skin: 0xd4a07d, jacket: 0x3d5c3a, pants: 0x4b3a2a, hair: 0x8c8a85, boot: 0x3a2f26, beard: true },
  gast1: { skin: 0xc28a5e, jacket: 0x7a3f8f, pants: 0x34363c, hair: 0x1d1714, pack: 0x50565c, boot: 0x3a2f26 },
  gast2: { skin: 0xe0b394, jacket: 0xe07a1f, pants: 0x2f3a33, hair: 0xb08a4e, pack: 0x2b4a34, boot: 0x4a3a2c, long: true },
  gast3: { skin: 0xa36c45, jacket: 0x2e8b6e, pants: 0x3b3a36, hair: 0x2a1d14, boot: 0x3a2f26, beard: true },
};

function createMens(who, scale = 1) {
  const k = KLEDING[who];
  const G = mensGeometry();
  const M = {
    skin: mat(k.skin, 0.75), jacket: mat(k.jacket, 0.6), pants: mat(k.pants, 0.9), hair: mat(k.hair, 0.9),
    boot: mat(k.boot, 0.8), eye: mat(0x14100c, 0.4), hem: mat(k.jacket, 0.6, { side: THREE.DoubleSide }),
  };
  const add = (geo, m, x, y, z, parent) => mesh(geo, m, x, y, z, parent);
  const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

  const base = new THREE.Group();         // plaats + richting in de wereld
  const root = grp(base);
  base.scale.setScalar(scale);

  const pelvis = grp(root, 0, 0.92, 0);
  add(G.pelvis, M.pants, 0, 0, 0, pelvis);
  add(G.hem, M.hem, 0, 0.04, 0, pelvis);
  const spine = grp(pelvis, 0, 0.04, 0);
  add(G.torso, M.jacket, 0, 0.21, 0, spine);
  add(G.collar, M.jacket, 0, 0.42, 0, spine);
  if (k.pack) {
    add(G.pack, mat(k.pack, 0.8), 0, 0.22, -0.2, spine);
    add(G.lid, mat(k.pack, 0.8), 0, 0.45, -0.19, spine).rotation.x = 0.15;
  }

  const neck = grp(spine, 0, 0.43, 0);
  add(G.neck, M.skin, 0, 0.03, 0, neck);
  const head = grp(neck, 0, 0.07, 0);
  add(G.head, M.skin, 0, 0.1, 0.005, head);
  add(G.brow, M.skin, 0, 0.145, 0.085, head);
  add(G.nose, M.skin, 0, 0.1, 0.115, head);
  add(G.eye, M.eye, 0.036, 0.125, 0.098, head);
  add(G.eye, M.eye, -0.036, 0.125, 0.098, head);
  const hair = add(G.hair, M.hair, 0, 0.115, -0.012, head);
  hair.rotation.x = -0.35;
  if (k.long) add(G.longHair, M.hair, 0, 0.0, -0.075, head);
  if (k.beard) add(G.beard, M.hair, 0, 0.08, 0.012, head).scale.set(1, 1.1, 1.05);

  // helm met hoofdlamp (aan/uit per frame)
  const helmMat = mat(k.helmet || 0xdddddd, 0.45);
  const helmet = add(G.helmet, helmMat, 0, 0.135, -0.005, head);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0x222222, toneMapped: false });
  const lamp = add(G.lamp, lampMat, 0, 0.19, 0.135, head);
  const beam = new THREE.SpotLight(0xfff0d8, 0, 16, 0.55, 0.6, 1.6);
  beam.position.set(0, 0.19, 0.14);
  beam.target.position.set(0, -0.6, 4);
  head.add(beam, beam.target);

  const J = { pelvis, spine, neck, head };
  for (const s of [1, -1]) {
    const kk = s > 0 ? 'l' : 'r';
    const sh = grp(spine, s * MB.shW, MB.shY, 0);
    add(G.shoulder, M.jacket, 0, 0, 0, sh);
    add(G.upper, M.jacket, 0, -0.14, 0, sh);
    const el = grp(sh, 0, -MB.upper, 0);
    add(G.elbow, M.jacket, 0, 0, 0, el);
    add(G.fore, M.jacket, 0, -0.12, 0, el);
    const hand = grp(el, 0, -MB.fore, 0);
    add(G.hand, M.skin, 0, -0.04, 0, hand);
    const grip = grp(hand, 0, -0.05, 0);
    J[kk + 'Sh'] = sh; J[kk + 'El'] = el; J[kk + 'Hand'] = hand; J[kk + 'Grip'] = grip;

    const hip = grp(pelvis, s * MB.hipW, -MB.hipDrop, 0);
    add(G.hip, M.pants, 0, 0, 0, hip);
    add(G.thigh, M.pants, 0, -0.2, 0, hip);
    const knee = grp(hip, 0, -MB.thigh, 0);
    add(G.knee, M.pants, 0, 0, 0, knee);
    add(G.shin, M.pants, 0, -0.2, 0, knee);
    const ank = grp(knee, 0, -MB.shin, 0);
    add(G.foot, M.boot, 0, -0.035, 0.045, ank);
    J[kk + 'Hip'] = hip; J[kk + 'Knee'] = knee; J[kk + 'Ank'] = ank;
  }

  // spullen in de hand (aan/uit per frame)
  const stok = () => {
    const g = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.1, 6), mat(0x9aa0a6, 0.3, { metalness: 0.6 }), 0, -0.5, 0, g);
    mesh(new THREE.CylinderGeometry(0.018, 0.016, 0.12, 8), mat(0x1e1e1e, 0.7), 0, 0.02, 0, g);
    g.rotation.x = 0.6;          // ongeveer rechtop, ook met gebogen elleboog
    return g;
  };
  const props = {
    poleL: stok(), poleR: stok(),
    cam: mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), mat(0x1c1c1e, 0.4), 0.04, 0, 0.04),
    cup: mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.1, 10), mat(0xb7462e, 0.5), 0, 0, 0.03),
    helm: mesh(G.helmet, helmMat, 0, -0.06, 0.06),
  };
  props.helm.rotation.x = Math.PI;
  J.rGrip.add(props.poleR, props.cam, props.cup);
  J.lGrip.add(props.poleL, props.helm);

  // Beenlengte in verticale richting (voor automatisch grondcontact)
  const ext = (h, kn, o) => (MB.thigh * Math.cos(h) + MB.shin * Math.cos(kn - h)) * Math.cos(o) + MB.ankle;

  function setPose(p) {
    const g = key => p[key] || 0;
    const hL = g('lHip'), hR = g('rHip'), kL = g('lKnee'), kR = g('rKnee');
    J.spine.rotation.set(g('lean'), g('twist'), g('side'));
    J.head.rotation.set(g('headX'), g('headY'), 0);
    J.lSh.rotation.set(-g('lSh'), g('lTw'), g('lShO'));
    J.rSh.rotation.set(-g('rSh'), -g('rTw'), -g('rShO'));
    J.lEl.rotation.x = -g('lEl');
    J.rEl.rotation.x = -g('rEl');
    J.lHip.rotation.set(-hL, 0, g('lHipO'));
    J.rHip.rotation.set(-hR, 0, -g('rHipO'));
    J.lKnee.rotation.x = kL;
    J.rKnee.rotation.x = kR;
    J.lAnk.rotation.x = hL - kL + g('lAnk');
    J.rAnk.rotation.x = hR - kR + g('rAnk');
    J.pelvis.position.y = Math.max(ext(hL, kL, g('lHipO')), ext(hR, kR, g('rHipO'))) + MB.hipDrop + g('lift');
    J.pelvis.rotation.set(g('pitch'), 0, 0);
  }

  const m = {
    base, root, J, props, setPose, who,
    // zet op plek (x, y, z) met kijkrichting yaw
    place(x, y, z, yaw) {
      base.visible = true;
      base.position.set(x, y, z);
      base.rotation.y = yaw;
    },
    hold(list) { for (const key in props) props[key].visible = !!list && list.indexOf(key) >= 0; },
    setHelmet(on) { helmet.visible = on; lamp.visible = on; },
    setLamp(v) {
      beam.intensity = 2.2 * v;
      lampMat.color.setRGB(0.13 + 0.9 * v, 0.13 + 0.85 * v, 0.13 + 0.7 * v);
    },
    grip(side, out = V()) { base.updateMatrixWorld(true); return J[side + 'Grip'].getWorldPosition(out); },
  };
  m.hold(null);
  m.setHelmet(false);
  setPose({});
  return m;
}

// =============================================================================
// Houdingen (sleutels en mengen zoals oermens-dag/mens.js)
// =============================================================================
const POSE_KEYS = [
  'lean', 'twist', 'side', 'headX', 'headY',
  'lSh', 'lShO', 'lTw', 'lEl', 'rSh', 'rShO', 'rTw', 'rEl',
  'lHip', 'lHipO', 'lKnee', 'lAnk', 'rHip', 'rHipO', 'rKnee', 'rAnk',
  'lift', 'pitch',
];
function P(o) { const p = {}; for (const k of POSE_KEYS) p[k] = (o && o[k]) || 0; return p; }
function mixPose(a, b, t) { const p = {}; for (const k of POSE_KEYS) p[k] = a[k] + (b[k] - a[k]) * t; return p; }
function over(base, o) { const p = Object.assign({}, base); for (const k in o) p[k] = o[k]; return p; }

// Keyframes: [[tijd, houding of functie(t)], ...] → functie(t) → houding
function track(keys) {
  const ev = (v, t) => (typeof v === 'function' ? v(t) : v);
  const n = keys.length;
  return t => {
    if (t <= keys[0][0]) return ev(keys[0][1], t);
    for (let i = 0; i < n - 1; i++) {
      const t1 = keys[i + 1][0];
      if (t < t1) {
        const t0 = keys[i][0], a = keys[i][1], b = keys[i + 1][1];
        if (a === b) return ev(a, t);
        return mixPose(ev(a, t), ev(b, t), smooth((t - t0) / (t1 - t0)));
      }
    }
    return ev(keys[n - 1][1], t);
  };
}

const STRIDE_WALK = 1.25;

const POSES = {
  stand: P({ lShO: 0.1, rShO: 0.1, lEl: 0.2, rEl: 0.2, lHip: 0.04, rHip: 0.04, lKnee: 0.08, rKnee: 0.08 }),
  // stokken voor je neergezet
  standPoles: P({ lSh: 0.45, rSh: 0.45, lEl: 0.7, rEl: 0.7, lShO: 0.12, rShO: 0.12, lHip: 0.04, rHip: 0.04, lKnee: 0.08, rKnee: 0.08 }),
  sitLog: P({ lean: 0.12, headX: 0.05, lHip: 1.45, rHip: 1.4, lKnee: 1.5, rKnee: 1.45, lSh: 0.45, rSh: 0.4, lEl: 1.0, rEl: 1.1, lShO: 0.12, rShO: 0.12 }),
  lookUp: P({ lean: -0.12, headX: -0.75, lShO: 0.15, rShO: 0.15, lEl: 0.25, rEl: 0.25, lHip: 0.04, rHip: 0.04, lKnee: 0.06, rKnee: 0.06 }),
  point: P({ lean: -0.06, headX: -0.55, headY: 0.2, rSh: 2.5, rShO: 0.25, rEl: 0.1, lShO: 0.12, lEl: 0.25, lHip: 0.04, rHip: 0.04, lKnee: 0.08, rKnee: 0.08 }),
  photo: P({ headX: -0.1, lSh: 1.45, rSh: 1.45, lEl: 1.95, rEl: 1.95, lShO: -0.4, rShO: -0.4, lHip: 0.04, rHip: 0.04, lKnee: 0.08, rKnee: 0.08 }),
  helmetOn: P({ headX: 0.1, lSh: 2.6, rSh: 2.6, lEl: 1.7, rEl: 1.7, lShO: 0.35, rShO: 0.35, lHip: 0.04, rHip: 0.04, lKnee: 0.08, rKnee: 0.08 }),
  sip: P({ lean: 0.12, headX: -0.1, lHip: 1.45, rHip: 1.4, lKnee: 1.5, rKnee: 1.45, lSh: 0.45, lEl: 1.0, lShO: 0.12, rSh: 0.7, rEl: 2.3, rShO: -0.2 }),

  walk(ph, a = 1) {
    const s = Math.sin(ph), c = Math.cos(ph);
    return P({
      lHip: 0.05 + 0.42 * a * s, rHip: 0.05 - 0.42 * a * s,
      lKnee: 0.1 + 0.75 * a * Math.max(0, c), rKnee: 0.1 + 0.75 * a * Math.max(0, -c),
      lSh: 0.25 - 0.35 * a * s, rSh: 0.25 + 0.35 * a * s,
      lEl: 0.5 + 0.2 * a * Math.max(0, -s), rEl: 0.5 + 0.2 * a * Math.max(0, s),
      lShO: 0.14, rShO: 0.14, lean: 0.1 * a, twist: 0.07 * a * s,
    });
  },
  wave(t) {
    return P({ rSh: 2.6, rShO: 0.35 + 0.3 * Math.sin(t * 8), rEl: 0.4, lShO: 0.1, lEl: 0.2, lHip: 0.04, rHip: 0.04, lKnee: 0.08, rKnee: 0.08 });
  },
};

// Lopen tussen twee punten (x,z): positie, kijkrichting en loopcyclus
function walkPath(t, from, to, t0, t1, stride = STRIDE_WALK) {
  const dx = to[0] - from[0], dz = to[1] - from[1], D = Math.hypot(dx, dz);
  const d = travel(t, D, t0, t1, 0.5);
  const k = D > 0 ? d / D : 0;
  const amp = Math.min(1, seg(t, t0, t0 + 0.5) * 3, seg(t, t1, t1 - 0.5) * 3);
  return {
    x: from[0] + dx * k, z: from[1] + dz * k, k, yaw: Math.atan2(dx, dz),
    pose: POSES.walk((d / stride) * TAU, t > t0 && t < t1 ? Math.max(0.15, amp) : 0),
    moving: t > t0 && t < t1,
  };
}

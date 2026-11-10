'use strict';
/* =============================================================================
   mens.js — procedurele oermens: geometrie, gewrichten, houdingen
   Gewrichtsopbouw en setPose zoals humanoid-showreel/robot.js.
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
    skirt: new THREE.CylinderGeometry(0.17, 0.25, 0.34, 9, 1, true),
    torso: cyl(0.165, 0.14, 0.44, 12).scale(1, 1, 0.72),
    collar: new THREE.TorusGeometry(0.13, 0.065, 7, 14).rotateX(Math.PI / 2).scale(1.15, 1, 0.85),
    neck: cyl(0.045, 0.05, 0.08, 8),
    head: sph(0.105, 18, 14).scale(0.95, 1.12, 1.05),
    brow: new THREE.BoxGeometry(0.15, 0.025, 0.04),
    nose: new THREE.ConeGeometry(0.022, 0.05, 6).rotateX(Math.PI / 2 + 0.4),
    eye: sph(0.011, 6, 5),
    hair: new THREE.SphereGeometry(0.118, 16, 10, 0, TAU, 0, Math.PI * 0.56).scale(1, 1.1, 1.12),
    longHair: cyl(0.1, 0.12, 0.3, 10).scale(1, 1, 0.5),
    beard: new THREE.SphereGeometry(0.1, 12, 8, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.45, Math.PI * 0.4),
    shoulder: sph(0.055, 10, 8),
    upper: cyl(0.05, 0.042, 0.28, 9),
    elbow: sph(0.042, 8, 6),
    fore: cyl(0.04, 0.032, 0.25, 9),
    hand: sph(0.045, 8, 6).scale(0.9, 1.3, 0.65),
    hip: sph(0.07, 10, 8),
    thigh: cyl(0.075, 0.055, 0.4, 9),
    knee: sph(0.055, 8, 6),
    shin: cyl(0.056, 0.042, 0.4, 9),
    foot: new THREE.BoxGeometry(0.1, 0.07, 0.24),
  };
  return MG;
}

const KLEDING = {
  elder:  { skin: 0xb07a52, hide: 0x6a4a2e, fur: 0xb9ab92, hair: 0xc9c2b4, leg: 0x5a3f27, beard: true },
  vrouw1: { skin: 0xc28a5e, hide: 0x8f6b45, fur: 0xd8c7a6, hair: 0x2a1d14, leg: 0x7a5a38, long: true },
  vrouw2: { skin: 0xa36c45, hide: 0x9b7b55, fur: 0x6e5a44, hair: 0x3b2a1c, leg: 0x7f6240, long: true },
  jager1: { skin: 0x8d5a37, hide: 0x6f4f32, fur: 0x4a3a2a, hair: 0x1d1714, leg: 0x5d4228, beard: true },
  jager2: { skin: 0xad774c, hide: 0x5f4630, fur: 0xa08c6c, hair: 0x2a1d14, leg: 0x4f3a26, beard: true },
  jager3: { skin: 0x9a6440, hide: 0x86643f, fur: 0x5c4936, hair: 0x3b2a1c, leg: 0x6a4d30 },
  kind:   { skin: 0xc99568, hide: 0x9f8058, fur: 0xcab894, hair: 0x3b2a1c, leg: 0x806240 },
  kind2:  { skin: 0x9c6b45, hide: 0x7a5c3c, fur: 0x8c7556, hair: 0x1d1714, leg: 0x6a4d30 },
};

function createMens(who, scale = 1) {
  const k = KLEDING[who];
  const G = mensGeometry();
  const M = {
    skin: mat(k.skin, 0.75), hide: mat(k.hide, 0.95), fur: mat(k.fur, 1), hair: mat(k.hair, 0.9),
    leg: mat(k.leg, 0.95), eye: mat(0x14100c, 0.4), skirt: mat(k.hide, 0.95, { side: THREE.DoubleSide }),
  };
  const add = (geo, m, x, y, z, parent) => mesh(geo, m, x, y, z, parent);
  const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

  const base = new THREE.Group();         // plaats + richting in de wereld
  const root = grp(base);                 // liggen = root kantelen
  base.scale.setScalar(scale);

  const pelvis = grp(root, 0, 0.92, 0);
  add(G.pelvis, M.hide, 0, 0, 0, pelvis);
  add(G.skirt, M.skirt, 0, -0.1, 0, pelvis);
  const spine = grp(pelvis, 0, 0.04, 0);
  add(G.torso, M.hide, 0, 0.2, 0, spine);
  add(G.collar, M.fur, 0, 0.39, 0, spine);

  const neck = grp(spine, 0, 0.42, 0);
  add(G.neck, M.skin, 0, 0.03, 0, neck);
  const head = grp(neck, 0, 0.07, 0);
  add(G.head, M.skin, 0, 0.1, 0.005, head);
  add(G.brow, M.skin, 0, 0.145, 0.085, head);
  add(G.nose, M.skin, 0, 0.1, 0.115, head);
  add(G.eye, M.eye, 0.036, 0.125, 0.098, head);
  add(G.eye, M.eye, -0.036, 0.125, 0.098, head);
  const hair = add(G.hair, M.hair, 0, 0.115, -0.012, head);
  hair.rotation.x = -0.35;
  if (k.long) add(G.longHair, M.hair, 0, -0.02, -0.07, head);
  if (k.beard) add(G.beard, M.hair, 0, 0.08, 0.012, head).scale.set(1, 1.1, 1.05);

  const J = { pelvis, spine, neck, head };
  for (const s of [1, -1]) {
    const kk = s > 0 ? 'l' : 'r';
    const sh = grp(spine, s * MB.shW, MB.shY, 0);
    add(G.shoulder, M.fur, 0, 0, 0, sh);
    add(G.upper, M.skin, 0, -0.14, 0, sh);
    const el = grp(sh, 0, -MB.upper, 0);
    add(G.elbow, M.skin, 0, 0, 0, el);
    add(G.fore, M.skin, 0, -0.125, 0, el);
    const hand = grp(el, 0, -MB.fore, 0);
    add(G.hand, M.skin, 0, -0.04, 0, hand);
    const grip = grp(hand, 0, -0.05, 0);
    J[kk + 'Sh'] = sh; J[kk + 'El'] = el; J[kk + 'Hand'] = hand; J[kk + 'Grip'] = grip;

    const hip = grp(pelvis, s * MB.hipW, -MB.hipDrop, 0);
    add(G.hip, M.leg, 0, 0, 0, hip);
    add(G.thigh, M.leg, 0, -0.2, 0, hip);
    const knee = grp(hip, 0, -MB.thigh, 0);
    add(G.knee, M.leg, 0, 0, 0, knee);
    add(G.shin, M.leg, 0, -0.2, 0, knee);
    const ank = grp(knee, 0, -MB.shin, 0);
    add(G.foot, M.fur, 0, -0.035, 0.045, ank);
    J[kk + 'Hip'] = hip; J[kk + 'Knee'] = knee; J[kk + 'Ank'] = ank;
  }

  // gereedschap in de hand (aan/uit per frame)
  const props = {
    stick: mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.75, 6), mat(0x6b4c2a, 0.9), 0, -0.25, 0.02),
    stone: mesh(new THREE.DodecahedronGeometry(0.045), mat(0x6f7178, 0.6), 0, -0.01, 0.02),
    flint: mesh(new THREE.DodecahedronGeometry(0.055).scale(1, 0.6, 1.2), mat(0x3d3a3a, 0.35), 0, -0.01, 0.03),
    brush: mesh(new THREE.SphereGeometry(0.028, 8, 6), mat(0xa8331d, 0.8), 0, -0.02, 0.03),
    basket: (() => {
      const b = new THREE.Group();
      mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.2, 12, 1, true), mat(0xa07a45, 0.95, { side: THREE.DoubleSide }), 0, -0.2, 0, b);
      mesh(new THREE.TorusGeometry(0.12, 0.008, 4, 16, Math.PI), mat(0x8a6638, 0.95), 0, -0.1, 0, b).rotation.y = Math.PI / 2;
      b.userData.berries = [];
      for (let i = 0; i < 9; i++) {
        const be = mesh(new THREE.SphereGeometry(0.022, 6, 5), mat(0x9b1c2a, 0.5), Math.cos(i * 2.4) * 0.07, -0.13, Math.sin(i * 2.4) * 0.07, b);
        b.userData.berries.push(be);
      }
      return b;
    })(),
  };
  props.stick.rotation.x = 0.1;
  J.rGrip.add(props.stick, props.stone, props.brush);
  J.lGrip.add(props.flint, props.basket);

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

  const tmpA = V(), tmpB = V();
  const m = {
    base, root, J, props, setPose, who,
    // zet op plek (x,z), kijkrichting yaw, en eventueel liggend
    place(x, z, yaw, lying = false) {
      base.visible = true;
      base.position.set(x, 0, z);
      base.rotation.y = yaw;
      root.rotation.x = lying ? -Math.PI / 2 : 0;
      root.position.y = lying ? 0.13 : 0;
      root.position.z = lying ? 0.9 : 0;
    },
    hold(list) { for (const k in props) props[k].visible = !!list && list.indexOf(k) >= 0; },
    grip(side, out = V()) { base.updateMatrixWorld(true); return J[side + 'Grip'].getWorldPosition(out); },
    handsMid(out = V()) {
      base.updateMatrixWorld(true);
      J.lGrip.getWorldPosition(tmpA); J.rGrip.getWorldPosition(tmpB);
      return out.copy(tmpA).add(tmpB).multiplyScalar(0.5);
    },
  };
  m.hold(null);
  setPose({});
  return m;
}

// =============================================================================
// Houdingen (sleutels en mengen zoals humanoid-showreel/poses.js)
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

const STRIDE_WALK = 1.25, STRIDE_RUN = 2.1;

const POSES = {
  stand: P({ lShO: 0.1, rShO: 0.1, lEl: 0.2, rEl: 0.2, lHip: 0.04, rHip: 0.04, lKnee: 0.08, rKnee: 0.08 }),
  sitLog: P({ lean: 0.12, headX: 0.05, lHip: 1.45, rHip: 1.4, lKnee: 1.5, rKnee: 1.45, lSh: 0.45, rSh: 0.4, lEl: 1.0, rEl: 1.1, lShO: 0.12, rShO: 0.12 }),
  sitGround: P({ lean: 0.18, lHip: 1.45, rHip: 1.45, lKnee: 0.2, rKnee: 0.35, lSh: 0.3, rSh: 0.25, lEl: 0.3, rEl: 0.35, lShO: 0.2, rShO: 0.2 }),
  crouch: P({ lean: 0.55, headX: -0.3, lHip: 1.25, rHip: 1.0, lKnee: 2.2, rKnee: 2.0, lSh: 0.8, rSh: 0.8, lEl: 0.4, rEl: 0.4, lShO: 0.1, rShO: 0.1 }),
  lie: P({ headY: 0.35, lHip: 0.1, rHip: 0.25, lKnee: 0.25, rKnee: 0.5, lSh: 0.15, rSh: 0.4, lEl: 0.5, rEl: 1.2, lShO: 0.15, rShO: 0.1 }),
  stretch: P({ lean: -0.12, headX: -0.35, lSh: 2.9, rSh: 2.9, lShO: 0.35, rShO: 0.35, lEl: 0.2, rEl: 0.2, lHip: 0.02, rHip: 0.02 }),
  windup: P({ twist: -0.55, lean: -0.08, headY: 0.45, lHip: 0.4, rHip: -0.2, lKnee: 0.35, rKnee: 0.15, lSh: 1.3, lShO: 0.15, lEl: 0.2, rSh: 2.7, rShO: 0.25, rEl: 1.3 }),
  release: P({ twist: 0.45, lean: 0.32, headY: -0.2, lHip: 0.55, rHip: -0.3, lKnee: 0.45, rKnee: 0.2, lSh: 0.3, lShO: 0.3, lEl: 0.3, rSh: 1.35, rShO: 0.1, rEl: 0.1 }),
  carry: P({ lSh: 2.75, rSh: 2.75, lEl: 1.9, rEl: 1.9, lShO: 0.25, rShO: 0.25, headX: 0.1 }),

  walk(ph, a = 1) {
    const s = Math.sin(ph), c = Math.cos(ph);
    return P({
      lHip: 0.05 + 0.42 * a * s, rHip: 0.05 - 0.42 * a * s,
      lKnee: 0.1 + 0.75 * a * Math.max(0, c), rKnee: 0.1 + 0.75 * a * Math.max(0, -c),
      lSh: -0.3 * a * s, rSh: 0.3 * a * s,
      lEl: 0.3 + 0.15 * a * Math.max(0, -s), rEl: 0.3 + 0.15 * a * Math.max(0, s),
      lShO: 0.1, rShO: 0.1, lean: 0.06 * a, twist: 0.07 * a * s,
    });
  },
  run(ph) {
    const s = Math.sin(ph), c = Math.cos(ph);
    return P({
      lHip: 0.1 + 0.75 * s, rHip: 0.1 - 0.75 * s,
      lKnee: 0.3 + 1.3 * Math.max(0, c), rKnee: 0.3 + 1.3 * Math.max(0, -c),
      lSh: -0.7 * s, rSh: 0.7 * s, lEl: 1.3, rEl: 1.3, lShO: 0.14, rShO: 0.14,
      lean: 0.22, twist: 0.12 * s, headX: -0.15, lift: 0.05 * Math.abs(s),
    });
  },
  // gebukt sluipen met de speer naar voren
  sneak(ph, a = 1) {
    const s = Math.sin(ph), c = Math.cos(ph);
    return P({
      lean: 0.5, headX: -0.45,
      lHip: 0.75 + 0.3 * a * s, rHip: 0.75 - 0.3 * a * s,
      lKnee: 1.2 + 0.5 * a * Math.max(0, c), rKnee: 1.2 + 0.5 * a * Math.max(0, -c),
      lSh: 0.9, rSh: 0.55, lEl: 0.7, rEl: 1.1, lShO: 0.1, rShO: 0.2,
    });
  },
  cheer(t) {
    const w = Math.sin(t * 9);
    return P({ lean: -0.1, headX: -0.3, lSh: 2.8 + 0.15 * w, rSh: 2.8 - 0.15 * w, lShO: 0.4, rShO: 0.4, lEl: 0.3, rEl: 0.3, lift: 0.08 * Math.abs(Math.sin(t * 6)), lKnee: 0.1, rKnee: 0.1 });
  },
};

// Lopen tussen twee punten: positie, kijkrichting en loopcyclus
function walkPath(t, from, to, t0, t1, stride = STRIDE_WALK, gait = POSES.walk) {
  const dx = to[0] - from[0], dz = to[1] - from[1], D = Math.hypot(dx, dz);
  const d = travel(t, D, t0, t1, 0.5);
  const k = D > 0 ? d / D : 0;
  const amp = Math.min(1, seg(t, t0, t0 + 0.5) * 3, seg(t, t1, t1 - 0.5) * 3);
  return {
    x: from[0] + dx * k, z: from[1] + dz * k, yaw: Math.atan2(dx, dz),
    pose: gait((d / stride) * TAU, t > t0 && t < t1 ? Math.max(0.15, amp) : 0),
    moving: t > t0 && t < t1,
  };
}

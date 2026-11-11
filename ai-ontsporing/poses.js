'use strict';
/* =============================================================================
   poses.js — houdingen, bewegingscycli (lopen, rennen, salto, trap) en een
   keyframe-tracker die houdingen vloeiend in elkaar laat overlopen.
   ============================================================================= */

const POSE_KEYS = [
  'lean', 'twist', 'side', 'headX', 'headY',
  'lSh', 'lShO', 'lTw', 'lEl', 'rSh', 'rShO', 'rTw', 'rEl',
  'lHip', 'lHipO', 'lKnee', 'lAnk', 'rHip', 'rHipO', 'rKnee', 'rAnk',
  'lift', 'pitch', 'yaw', 'fwd',
];
const ARM_KEYS = ['lSh', 'lShO', 'lTw', 'lEl', 'rSh', 'rShO', 'rTw', 'rEl'];

function P(o) {
  const p = {};
  for (const k of POSE_KEYS) p[k] = (o && o[k]) || 0;
  return p;
}
function mix(a, b, t) {
  const p = {};
  for (const k of POSE_KEYS) p[k] = a[k] + (b[k] - a[k]) * t;
  return p;
}
function over(base, o) {
  const p = Object.assign({}, base);
  for (const k in o) p[k] = o[k];
  return p;
}
// Benen/romp van `base`, armen van `src`
function arms(base, src) {
  const p = Object.assign({}, base);
  for (const k of ARM_KEYS) p[k] = src[k];
  return p;
}

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
        return mix(ev(a, t), ev(b, t), smooth((t - t0) / (t1 - t0)));
      }
    }
    return ev(keys[n - 1][1], t);
  };
}

const STRIDE_WALK = 1.18;   // meter per volledige loopcyclus
const STRIDE_RUN = 1.9;

const POSES = {
  stand: P({ lShO: 0.1, rShO: 0.1, lEl: 0.18, rEl: 0.18, lHip: 0.04, rHip: 0.04, lKnee: 0.08, rKnee: 0.08 }),

  dormant: P({
    lean: 0.45, headX: 0.6, lHip: 0.5, rHip: 0.5, lKnee: 0.9, rKnee: 0.9,
    lSh: 0.3, rSh: 0.3, lEl: 0.25, rEl: 0.25, lShO: 0.04, rShO: 0.04,
  }),

  crouchPrep: P({
    lean: 0.4, headX: -0.2, lHip: 0.9, rHip: 0.9, lKnee: 1.6, rKnee: 1.6,
    lSh: -0.7, rSh: -0.7, lEl: 0.2, rEl: 0.2, lShO: 0.12, rShO: 0.12,
  }),

  guard: P({
    lean: 0.08, twist: -0.35, headY: 0.3, lHip: 0.38, rHip: 0.05, lKnee: 0.5, rKnee: 0.42,
    lHipO: 0.12, rHipO: 0.18, lSh: 0.75, rSh: 0.55, lEl: 1.9, rEl: 2.05, lShO: 0.2, rShO: 0.35,
  }),

  walk(ph, a = 1) {
    const s = Math.sin(ph), c = Math.cos(ph);
    return P({
      lHip: 0.05 + 0.42 * a * s, rHip: 0.05 - 0.42 * a * s,
      lKnee: 0.1 + 0.75 * a * Math.max(0, c), rKnee: 0.1 + 0.75 * a * Math.max(0, -c),
      lSh: -0.32 * a * s, rSh: 0.32 * a * s,
      lEl: 0.35 + 0.15 * a * Math.max(0, -s), rEl: 0.35 + 0.15 * a * Math.max(0, s),
      lShO: 0.1, rShO: 0.1, lean: 0.06 * a, twist: 0.07 * a * s,
    });
  },

  run(ph) {
    const s = Math.sin(ph), c = Math.cos(ph);
    return P({
      lHip: 0.1 + 0.75 * s, rHip: 0.1 - 0.75 * s,
      lKnee: 0.3 + 1.3 * Math.max(0, c), rKnee: 0.3 + 1.3 * Math.max(0, -c),
      lSh: -0.75 * s, rSh: 0.75 * s, lEl: 1.4, rEl: 1.4, lShO: 0.14, rShO: 0.14,
      lean: 0.22, twist: 0.12 * s, headX: -0.15, lift: 0.05 * Math.abs(s),
    });
  },

  wave(t) {
    return P({
      lShO: 0.1, lEl: 0.18, lHip: 0.04, rHip: 0.04, lKnee: 0.08, rKnee: 0.08,
      rShO: 2.45, rSh: 0.25, rEl: 0.65 + 0.4 * Math.sin(t * 9), headY: -0.12, side: 0.04,
    });
  },

  // Achterwaartse salto, u = 0..1 (afzet → tuck → landing)
  flip(u) {
    const take = smooth(u / 0.14);
    const tuck = bump(u, 0.12, 0.85);
    const land = smooth((u - 0.8) / 0.2);
    const air = seg(u, 0.08, 0.92);
    const turn = easeIO(seg(u, 0.1, 0.86));
    const legH = lerp(0.9, 0.05, take) + 1.55 * tuck + 0.65 * land;
    const legK = lerp(1.6, 0.15, take) + 2.0 * tuck + 0.95 * land;
    const sh = lerp(-0.7, 2.9, take) - 2.1 * tuck - 1.6 * land;
    return P({
      lean: lerp(0.4, -0.15, take) + 0.35 * tuck + 0.2 * land,
      headX: lerp(-0.2, -0.4, take) + 0.5 * tuck,
      lHip: legH, rHip: legH, lKnee: legK, rKnee: legK,
      lSh: sh, rSh: sh, lEl: 0.2 + 0.9 * tuck, rEl: 0.2 + 0.9 * tuck, lShO: 0.12, rShO: 0.12,
      lift: 0.95 * Math.sin(Math.PI * air),
      pitch: turn >= 1 ? 0 : -TAU * turn,
    });
  },

  // Draaitrap (360°), u = 0..1; begint en eindigt in dezelfde gevechtshouding
  kick(u) {
    const e = easeIO(u);
    const leg = bump(u, 0.25, 0.85);
    const hop = bump(u, 0.2, 0.8);
    return P({
      yaw: e >= 1 ? 0 : TAU * e,
      lift: 0.12 * hop,
      lean: -0.25 * leg, side: 0.35 * leg,
      rHip: 0.1 + 1.35 * leg, rHipO: 0.9 * leg, rKnee: 0.25 + 0.9 * (1 - leg) * hop,
      lHip: 0.12, lKnee: 0.3,
      lSh: 0.5, rSh: 0.4, lShO: 0.3 + 0.8 * leg, rShO: 0.3 + 0.5 * leg,
      lEl: 1.2 - 0.8 * leg, rEl: 1.4 - 0.6 * leg,
    });
  },
};
POSES.ready = POSES.kick(0);

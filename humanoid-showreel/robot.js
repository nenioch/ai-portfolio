'use strict';
/* =============================================================================
   robot.js — procedurele humanoïde robot: geometrie, gewrichten, houding
   Assen: robot kijkt naar +z, links = +x, omhoog = +y. Eenheden in meters.
   ============================================================================= */

const RB = {
  hipW: 0.095, hipDrop: 0.05, thigh: 0.36, shin: 0.36, ankle: 0.065,
  shW: 0.205, shY: 0.36, upper: 0.25, fore: 0.23,
};

let RG = null;
function robotGeometry() {
  if (RG) return RG;
  const cyl = (rt, rb, h, s = 18) => new THREE.CylinderGeometry(rt, rb, h, s);
  const sph = (r, w = 18, h = 14) => new THREE.SphereGeometry(r, w, h);
  RG = {
    pelvis: new THREE.BoxGeometry(0.25, 0.11, 0.15),
    waist: cyl(0.075, 0.085, 0.1),
    torso: cyl(0.165, 0.125, 0.3, 24).scale(1, 1, 0.66),
    chest: new THREE.BoxGeometry(0.2, 0.12, 0.04),
    pack: new THREE.BoxGeometry(0.2, 0.22, 0.08),
    stripe: new THREE.BoxGeometry(0.13, 0.012, 0.012),
    neck: cyl(0.034, 0.04, 0.07, 12),
    head: sph(0.1, 28, 20).scale(1, 1.12, 1.02),
    visor: new THREE.SphereGeometry(0.104, 28, 14, Math.PI * 0.08, Math.PI * 0.84, Math.PI * 0.3, Math.PI * 0.34).scale(1, 1.12, 1.02),
    eye: new THREE.BoxGeometry(0.1, 0.014, 0.012),
    ear: cyl(0.04, 0.04, 0.035, 16).rotateZ(Math.PI / 2),
    shoulder: sph(0.06),
    upper: cyl(0.047, 0.04, 0.2),
    elbow: sph(0.043),
    fore: cyl(0.04, 0.032, 0.19),
    palm: new THREE.BoxGeometry(0.03, 0.085, 0.07),
    thumb: new THREE.BoxGeometry(0.022, 0.045, 0.02),
    hip: sph(0.063),
    thigh: cyl(0.068, 0.05, 0.29),
    knee: sph(0.053),
    shin: cyl(0.05, 0.038, 0.3),
    shinPlate: new THREE.BoxGeometry(0.075, 0.2, 0.03),
    foot: new THREE.BoxGeometry(0.095, 0.045, 0.22),
  };
  return RG;
}

const RM = {};
function robotMaterials(shell, trim) {
  const k = shell + '/' + trim;
  if (!RM[k]) {
    const std = o => { const m = new THREE.MeshStandardMaterial(o); if (ENV.map) m.envMap = ENV.map; return m; };
    RM[k] = {
      shell: std({ color: C(shell), roughness: 0.32, metalness: 0.3, envMapIntensity: 0.8 }),
      trim: std({ color: C(trim), roughness: 0.42, metalness: 0.6, envMapIntensity: 0.9 }),
      joint: std({ color: C(0x3a3f47), roughness: 0.3, metalness: 0.9 }),
      visor: std({ color: C(0x050608), roughness: 0.07, metalness: 1.0, envMapIntensity: 1.4 }),
    };
  }
  return RM[k];
}

function createRobot(opts = {}) {
  const o = Object.assign({ shell: 0xeef1f4, trim: 0x23272e, accent: 0x38bdf8 }, opts);
  const G = robotGeometry(), M = robotMaterials(o.shell, o.trim);
  const accent = C(o.accent);
  const led = new THREE.MeshBasicMaterial({ color: accent.clone(), toneMapped: false });

  const add = (geo, m, x, y, z, parent) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const grp = (parent, x = 0, y = 0, z = 0) => {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g;
  };

  // romp
  const root = new THREE.Group();
  const pelvis = grp(root, 0, 0.83, 0);
  add(G.pelvis, M.trim, 0, 0, 0, pelvis);
  const spine = grp(pelvis, 0, 0.05, 0);
  add(G.waist, M.joint, 0, 0.03, 0, spine);
  add(G.torso, M.shell, 0, 0.22, 0, spine);
  add(G.chest, M.trim, 0, 0.25, 0.1, spine);
  add(G.stripe, led, 0, 0.285, 0.121, spine);
  add(G.pack, M.trim, 0, 0.22, -0.09, spine);

  // hoofd
  const neck = grp(spine, 0, 0.38, 0);
  add(G.neck, M.joint, 0, 0.03, 0, neck);
  const head = grp(neck, 0, 0.05, 0);
  add(G.head, M.shell, 0, 0.1, 0, head);
  add(G.visor, M.visor, 0, 0.1, 0, head);
  add(G.eye, led, 0, 0.11, 0.106, head);
  add(G.ear, M.trim, 0.1, 0.1, 0, head);
  add(G.ear, M.trim, -0.1, 0.1, 0, head);

  const J = { pelvis, spine, neck, head };

  // armen en benen; s = +1 links, -1 rechts
  for (const s of [1, -1]) {
    const k = s > 0 ? 'l' : 'r';
    const sh = grp(spine, s * RB.shW, RB.shY, 0);
    add(G.shoulder, M.joint, 0, 0, 0, sh);
    add(G.upper, M.shell, 0, -0.12, 0, sh);
    const el = grp(sh, 0, -RB.upper, 0);
    add(G.elbow, M.joint, 0, 0, 0, el);
    add(G.fore, M.trim, 0, -0.11, 0, el);
    const hand = grp(el, 0, -RB.fore, 0);
    add(G.palm, M.joint, 0, -0.045, 0, hand);
    add(G.thumb, M.joint, -s * 0.02, -0.03, 0.04, hand);
    const grip = grp(hand, 0, -0.05, 0);
    J[k + 'Sh'] = sh; J[k + 'El'] = el; J[k + 'Hand'] = hand; J[k + 'Grip'] = grip;

    const hip = grp(pelvis, s * RB.hipW, -RB.hipDrop, 0);
    add(G.hip, M.joint, 0, 0, 0, hip);
    add(G.thigh, M.shell, 0, -0.17, 0, hip);
    const knee = grp(hip, 0, -RB.thigh, 0);
    add(G.knee, M.joint, 0, 0, 0, knee);
    add(G.shin, M.trim, 0, -0.18, 0, knee);
    add(G.shinPlate, M.shell, 0, -0.14, 0.035, knee);
    const ank = grp(knee, 0, -RB.shin, 0);
    add(G.foot, M.trim, 0, -0.04, 0.035, ank);
    J[k + 'Hip'] = hip; J[k + 'Knee'] = knee; J[k + 'Ank'] = ank;
  }

  // Beenlengte in verticale richting (voor automatisch grondcontact)
  const ext = (h, k, o) => (RB.thigh * Math.cos(h) + RB.shin * Math.cos(k - h)) * Math.cos(o) + RB.ankle;

  // Houding: hoeken in radialen, "intuïtief" (positief = naar voren / naar buiten)
  function setPose(p) {
    const g = k => p[k] || 0;
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
    J.pelvis.position.y = Math.max(ext(hL, kL, g('lHipO')), ext(hR, kR, g('rHipO'))) + RB.hipDrop + g('lift');
    J.pelvis.position.z = g('fwd');
    J.pelvis.rotation.set(g('pitch'), g('yaw'), 0);
  }

  const tmpA = V(), tmpB = V();
  const robot = {
    root, J, led, accent, setPose,
    setGlow(k) { led.color.copy(accent).multiplyScalar(k); },
    // Wereldpositie van een punt in de lokale ruimte van een hand ('l' / 'r')
    point(side, x, y, z, out = V()) {
      root.updateMatrixWorld(true);
      return J[side + 'Hand'].localToWorld(out.set(x, y, z));
    },
    grip(side, out = V()) {
      root.updateMatrixWorld(true);
      return J[side + 'Grip'].getWorldPosition(out);
    },
    handsMid(out = V()) {
      root.updateMatrixWorld(true);
      J.lGrip.getWorldPosition(tmpA);
      J.rGrip.getWorldPosition(tmpB);
      return out.copy(tmpA).add(tmpB).multiplyScalar(0.5);
    },
    handsGap() {
      root.updateMatrixWorld(true);
      return J.lGrip.getWorldPosition(tmpA).distanceTo(J.rGrip.getWorldPosition(tmpB));
    },
    headPos(out = V()) {
      root.updateMatrixWorld(true);
      return J.head.localToWorld(out.set(0, 0.1, 0));
    },
  };
  setPose({});
  return robot;
}

// Plaats robot in een houding en geef de positie van de handen terug.
// Wordt gebruikt om meubels/objecten precies onder de handen te zetten.
function calibrate(robot, pose, pos, yaw, side = 'mid', local) {
  robot.root.position.copy(pos);
  robot.root.rotation.y = yaw;
  robot.setPose(pose);
  if (local) return robot.point(side, local.x, local.y, local.z, V());
  return side === 'mid' ? robot.handsMid(V()) : robot.grip(side, V());
}

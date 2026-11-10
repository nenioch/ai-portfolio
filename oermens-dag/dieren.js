'use strict';
/* =============================================================================
   dieren.js — edelhert (grazen, opkijken, rennen, vallen, gedragen worden)
   en een kudde wolharige mammoeten in de verte.
   Dieren kijken naar +z, net als de mensen.
   ============================================================================= */

function createHert() {
  const body = mat(0x8b5b34, 0.9), dark = mat(0x5e3c22, 0.9), belly = mat(0xcaa47c, 0.9);
  const ant = mat(0xd8c7a6, 0.7), tail = mat(0xefe6d6, 0.9), eye = mat(0x120d0a, 0.3);
  const root = new THREE.Group();
  const inner = new THREE.Group(); root.add(inner);
  const torso = new THREE.Group(); torso.position.y = 1.05; inner.add(torso);
  mesh(new THREE.SphereGeometry(0.3, 16, 12).scale(0.95, 1, 2.1), body, 0, 0, 0, torso);
  mesh(new THREE.SphereGeometry(0.24, 12, 8).scale(0.9, 0.6, 1.8), belly, 0, -0.14, 0, torso);
  mesh(new THREE.SphereGeometry(0.06, 8, 6), tail, 0, 0.08, -0.62, torso);

  // nek + kop draaien om de schouder
  const neck = new THREE.Group(); neck.position.set(0, 0.12, 0.5); torso.add(neck);
  mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.6, 10), body, 0, 0.28, 0.06, neck).rotation.x = 0.35;
  const head = new THREE.Group(); head.position.set(0, 0.56, 0.18); neck.add(head);
  mesh(new THREE.SphereGeometry(0.1, 12, 8).scale(0.9, 0.9, 1.9), body, 0, 0, 0.1, head).rotation.x = 0.5;
  mesh(new THREE.SphereGeometry(0.018, 6, 4), eye, 0.075, 0.03, 0.06, head);
  mesh(new THREE.SphereGeometry(0.018, 6, 4), eye, -0.075, 0.03, 0.06, head);
  for (const s of [1, -1]) {
    mesh(new THREE.SphereGeometry(0.05, 8, 6).scale(0.5, 1.4, 0.3), body, s * 0.09, 0.1, -0.02, head).rotation.z = -s * 0.7;
    // gewei
    const a = new THREE.Group(); a.position.set(s * 0.05, 0.08, -0.02); a.rotation.set(-0.5, 0, -s * 0.45); head.add(a);
    const beam = new THREE.CylinderGeometry(0.012, 0.022, 0.55, 5);
    mesh(beam, ant, 0, 0.27, 0, a);
    const tine = new THREE.CylinderGeometry(0.008, 0.014, 0.2, 4);
    [[0.12, 0.9], [0.3, 0.7], [0.48, 1.1]].forEach(([y, r]) => {
      const t = mesh(tine, ant, 0, y, 0.06, a); t.rotation.x = r; t.position.z += 0.04;
    });
  }

  // poten: bovenbeen-groep en onderbeen-groep
  const legs = [];
  const upG = new THREE.CylinderGeometry(0.06, 0.04, 0.45, 7), loG = new THREE.CylinderGeometry(0.03, 0.025, 0.5, 6);
  [[0.13, 0.42, 0], [-0.13, 0.42, 1.6], [0.13, -0.45, 3.2], [-0.13, -0.45, 4.8]].forEach(([x, z, off]) => {
    const up = new THREE.Group(); up.position.set(x, -0.12, z); torso.add(up);
    mesh(upG, body, 0, -0.2, 0, up);
    const lo = new THREE.Group(); lo.position.y = -0.42; up.add(lo);
    mesh(loG, dark, 0, -0.25, 0, lo);
    legs.push({ up, lo, off, front: z > 0 });
  });

  const spear = mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.9, 6), mat(0x7a5b34, 0.9), 0.2, 0.6, 0.0, torso);
  spear.rotation.set(0.5, 0, -0.9);
  spear.visible = false;

  return {
    root, spear,
    // state: { x, z, yaw, head (0 grazen..1 op), gait (0 stil..1 rennen), ph, fall (0..1), hang }
    set(o) {
      root.visible = true;
      root.position.set(o.x, o.y || 0, o.z);
      root.rotation.y = o.yaw || 0;
      const h = o.head === undefined ? 1 : o.head;
      neck.rotation.x = lerp(1.9, -0.1, h);
      head.rotation.x = lerp(0.6, 0.1, h);
      const g = o.gait || 0, ph = o.ph || 0;
      for (const L of legs) {
        const s = Math.sin(ph + L.off);
        L.up.rotation.x = g * 0.6 * s;
        L.lo.rotation.x = (L.front ? 1 : -1) * g * 0.5 * Math.max(0, Math.cos(ph + L.off));
      }
      torso.position.y = 1.05 + g * 0.06 * Math.abs(Math.sin(ph));
      torso.rotation.x = g * 0.06 * Math.sin(ph * 2);
      const f = o.fall || 0;
      inner.rotation.z = f * Math.PI / 2;
      inner.position.set(f * 1.05, f * 0.3, 0);
      if (f > 0) { neck.rotation.x = lerp(neck.rotation.x, 0.9, f); for (const L of legs) { L.up.rotation.x = lerp(L.up.rotation.x, L.front ? 0.5 : -0.4, f); L.lo.rotation.x *= 1 - f; } }
      if (o.hang) {   // ondersteboven aan de draagstok: hoeven bij de oorsprong
        inner.rotation.z = Math.PI; inner.position.set(0, 0, 0);
        neck.rotation.x = 1.9; head.rotation.x = 0.4;
        for (const L of legs) { L.up.rotation.x = 0; L.lo.rotation.x = 0; }
      }
      spear.visible = !!o.spear;
    },
  };
}

function createMammoet(seed) {
  const r = rng(seed);
  const fur = mat([0x5b3b22, 0x6a4529, 0x4e331f][seed % 3], 1), tusk = mat(0xe8dcc0, 0.5);
  const root = new THREE.Group();
  const s = 1.1 + r() * 0.3;
  root.scale.setScalar(s);
  mesh(new THREE.SphereGeometry(1, 16, 12).scale(1.35, 1.25, 2.0), fur, 0, 2.5, 0, root);
  mesh(new THREE.SphereGeometry(0.9, 14, 10).scale(1.1, 1.1, 1.0), fur, 0, 3.3, 1.2, root);     // schouderbult
  const head = new THREE.Group(); head.position.set(0, 3.2, 2.1); root.add(head);
  mesh(new THREE.SphereGeometry(0.75, 14, 10).scale(1, 1.15, 0.95), fur, 0, 0, 0, head);
  // slurf in drie stukken
  let p = head;
  [[0.28, 0.7], [0.22, 0.7], [0.16, 0.6]].forEach(([rad, len], i) => {
    const g = new THREE.Group(); g.position.set(0, i === 0 ? -0.35 : -len, i === 0 ? 0.55 : 0); g.rotation.x = 0.25; p.add(g);
    mesh(new THREE.CylinderGeometry(rad * 0.8, rad, len, 8), fur, 0, -len / 2, 0, g);
    p = g;
  });
  const trunk = head.children.find(c => c.isGroup);
  for (const sd of [1, -1]) {
    const t = mesh(new THREE.TorusGeometry(0.9, 0.08, 6, 12, Math.PI * 0.85), tusk, sd * 0.35, -0.75, 0.75, head);
    t.rotation.set(0, Math.PI / 2, Math.PI * 0.95);
  }
  const legs = [];
  [[0.6, 1.1], [-0.6, 1.1], [0.6, -1.1], [-0.6, -1.1]].forEach(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, 2.0, z); root.add(g);
    mesh(new THREE.CylinderGeometry(0.34, 0.3, 2.0, 8), fur, 0, -1.0, 0, g);
    legs.push({ g, off: i % 2 ? Math.PI : 0 });
  });
  return {
    root,
    set(x, z, yaw, ph) {
      root.position.set(x, 0, z); root.rotation.y = yaw;
      for (const L of legs) L.g.rotation.x = 0.22 * Math.sin(ph + L.off + (L.g.position.z > 0 ? 0 : Math.PI / 2));
      if (trunk) trunk.rotation.x = 0.25 + 0.12 * Math.sin(ph * 0.5);
    },
  };
}

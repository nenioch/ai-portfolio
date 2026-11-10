'use strict';
/* =============================================================================
   scenes.js — de acht shots van de showreel.
   Elke scène: { title, subtitle, duration, hud, card?, scene, update(t), camera(t, cam) }
   Alles is een pure functie van de lokale tijd t, zodat pauzeren/spoelen werkt.
   ============================================================================= */

// Generieke robotstijlen (geïnspireerd op bekende humanoïden, zonder merken)
const STYLE = {
  white: { shell: 0xf1f3f5, trim: 0x262b33, accent: 0x38bdf8 },
  silver: { shell: 0xb4bcc6, trim: 0x16191e, accent: 0xff7a1a },
  graphite: { shell: 0x59616c, trim: 0x15181c, accent: 0xa3e635 },
};

const _tgt = V();
function aim(cam, px, py, pz, tx, ty, tz, fov) {
  cam.position.set(px, py, pz);
  cam.lookAt(_tgt.set(tx, ty, tz));
  if (fov) cam.fov = fov;
}
const walkPhase = d => (d / STRIDE_WALK) * TAU;

// =============================================================================
// 1 — Intro: robot ontwaakt in een donkere studio
// =============================================================================
function sceneIntro() {
  const scene = stage(0x040507, 7, 22);
  lights(scene, { sky: 0x405064, ground: 0x050505, hemi: 0.12, sunI: 0.45, sunPos: V(-3, 6, 3), shadow: 4 });

  const spot = new THREE.SpotLight(C(0xe6eeff), 0, 14, 0.42, 0.55, 1.1);
  spot.position.set(0.4, 6, 1.6);
  spot.target.position.set(0, 0.8, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.0005;
  scene.add(spot, spot.target);
  const rim = new THREE.PointLight(C(0x38bdf8), 0, 7, 2);
  rim.position.set(0, 1.7, -1.6);
  scene.add(rim);

  floor(scene, 0x0b0d12, 0.28, 0.5);

  const rings = [0.75, 1.15, 1.6].map(r => {
    const m = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.012, 96), glowOwn(0x38bdf8, 0));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.004;
    scene.add(m);
    return m;
  });
  const bars = [];
  for (let i = -5; i <= 5; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 3.2, 0.05), glowOwn(0xbfd8ff, 0));
    b.position.set(i * 0.9, 1.6, -5 + Math.abs(i) * 0.25);
    b.userData.d = Math.abs(i);
    scene.add(b);
    bars.push(b);
  }

  const robot = createRobot(STYLE.white);
  scene.add(robot.root);
  const pose = track([
    [0, POSES.dormant], [3.0, POSES.dormant], [4.8, POSES.stand],
    [5.4, over(POSES.stand, { headY: 0.2 })], [6.2, POSES.stand],
    [6.6, POSES.wave], [8.0, POSES.wave], [8.7, POSES.stand],
  ]);
  const head = V();

  return {
    title: 'Humanoids', subtitle: '', duration: 9, noLower: true,
    hud: [
      { at: 3.0, text: 'SYSTEEM ONLINE' },
      { at: 3.5, text: 'ACTUATOREN 23/23 OK' },
      { at: 4.0, text: 'BALANS GEKALIBREERD' },
    ],
    card: { at: 5.0, until: 8.7, big: 'HUMANOIDS', small: 'De toekomst werkt mee' },
    scene,
    update(t) {
      robot.setPose(pose(t));
      const on = seg(t, 2.2, 3.0);
      const flick = t < 2.2 ? 0 : t >= 3 ? 1 : (Math.sin(t * 53) * Math.sin(t * 17) > -0.2 ? on : 0.1 * on);
      robot.setGlow(flick);
      spot.intensity = 2.6 * smooth(seg(t, 0.3, 2.2));
      rim.intensity = 2.0 * flick;
      rings.forEach((r, i) => {
        r.material.opacity = 0.7 * smooth(seg(t, 3.0 + i * 0.25, 3.6 + i * 0.25)) * (0.75 + 0.25 * Math.sin(t * 2 + i));
      });
      bars.forEach(b => {
        const d = b.userData.d;
        b.material.opacity = 0.5 * smooth(seg(t, 3.4 + d * 0.12, 3.6 + d * 0.12));
      });
    },
    camera(t, cam) {
      robot.headPos(head);
      const k = easeIO(seg(t, 2.6, 8.8));
      const z0 = lerp(1.75, 1.5, seg(t, 0, 2.6));
      aim(cam,
        lerp(0.45, 1.7, k), lerp(head.y + 0.02, 1.15, k), lerp(z0, 3.9, k),
        0, lerp(head.y - 0.05, 0.85, k), 0,
        lerp(30, 36, k));
    },
  };
}

// =============================================================================
// 2 — Productie: twee robots pakken onderdelen van een lopende band
// =============================================================================
function sceneFactory() {
  const scene = stage(0x20262e, 9, 30);
  lights(scene, { sky: 0xe3ecf7, ground: 0x3a3a3a, hemi: 0.6, sunI: 1.4, sunPos: V(3, 9, 6), shadow: 6 });
  floor(scene, 0x5d636b, 0.85, 0.05);
  const rnd = rng(7);

  const PERIOD = 2.4, V_BELT = 0.75, PH = 0.12, PD = 0.18;
  const ready = over(POSES.stand, { lSh: 0.35, rSh: 0.35, lEl: 0.95, rEl: 0.95, lShO: -0.04, rShO: -0.04, headX: 0.25 });
  const reach = P({ lean: 0.42, headX: 0.4, lHip: 0.3, rHip: 0.3, lKnee: 0.38, rKnee: 0.38, lSh: 1.05, rSh: 1.05, lEl: 0.25, rEl: 0.25, lShO: -0.12, rShO: -0.12 });
  const lift = P({ lean: 0.12, headX: 0.25, lHip: 0.06, rHip: 0.06, lKnee: 0.12, rKnee: 0.12, lSh: 0.62, rSh: 0.62, lEl: 1.0, rEl: 1.0, lShO: -0.1, rShO: -0.1 });
  const place = d => P({ lean: 0.3, twist: d * 1.05, headX: 0.35, headY: d * 0.5, lHip: 0.22, rHip: 0.22, lKnee: 0.3, rKnee: 0.3, lSh: 0.95, rSh: 0.95, lEl: 0.32, rEl: 0.32, lShO: -0.1, rShO: -0.1 });

  const cells = [{ x: -0.9, dir: -1, T0: 1.0 }, { x: 0.9, dir: 1, T0: 2.2 }];
  for (const c of cells) {
    c.robot = createRobot(STYLE.white);
    scene.add(c.robot.root);
    c.grab = calibrate(c.robot, reach, V(c.x, 0, 0), 0);
    c.gap = c.robot.handsGap();
    c.place = calibrate(c.robot, place(c.dir), V(c.x, 0, 0), 0);
    c.cycle = track([[-0.95, ready], [-0.2, reach], [0.1, reach], [0.6, lift], [1.0, place(c.dir)], [1.2, place(c.dir)], [1.45, ready]]);
    c.hm = V();
  }
  const PW = Math.max(0.16, cells[0].gap - 0.05);
  const beltY = cells[0].grab.y - PH / 2, beltZ = cells[0].grab.z;

  // lopende band
  const tex = stripeTexture();
  tex.repeat.set(30, 1);
  const beltMat = new THREE.MeshStandardMaterial({ color: C(0xffffff), map: tex, roughness: 0.8 });
  box(scene, 10, 0.04, 0.5, beltMat, 0, beltY - 0.02, beltZ);
  const railMat = mat(0xa3acb6, 0.35, 0.7), frameMat = mat(0x39404a, 0.6, 0.3);
  box(scene, 10, 0.07, 0.035, railMat, 0, beltY + 0.005, beltZ + 0.27);
  box(scene, 10, 0.07, 0.035, railMat, 0, beltY + 0.005, beltZ - 0.27);
  box(scene, 10, 0.12, 0.46, frameMat, 0, beltY - 0.1, beltZ);
  for (let x = -4.5; x <= 4.5; x += 1.5) {
    box(scene, 0.06, beltY - 0.16, 0.06, frameMat, x, (beltY - 0.16) / 2, beltZ + 0.2);
    box(scene, 0.06, beltY - 0.16, 0.06, frameMat, x, (beltY - 0.16) / 2, beltZ - 0.2);
  }

  // bakken naast de robots
  const binMat = mat(0x2f6fb5, 0.6, 0.1);
  for (const c of cells) {
    const top = c.place.y - 0.12;
    tray(scene, 0.5, 0.3, 0.45, binMat, c.place.x, top, c.place.z);
    box(scene, 0.46, top - 0.3, 0.4, frameMat, c.place.x, (top - 0.3) / 2, c.place.z);
    c.binFloor = top - 0.3 + 0.02;
  }

  // onderdelen
  const partGeo = new THREE.BoxGeometry(PW, PH, PD);
  const partMat = mat(0x8f9aa6, 0.35, 0.75), capMat = mat(0xf59e0b, 0.5, 0.1);
  for (const c of cells) {
    c.parts = [];
    for (let k = -3; k <= 5; k++) {
      const g = new THREE.Group();
      mesh(partGeo, partMat, 0, 0, 0, g);
      box(g, PW * 0.5, 0.02, PD * 0.5, capMat, 0, PH / 2 + 0.01, 0);
      scene.add(g);
      c.parts.push({
        k, obj: g, jx: rnd() - 0.5, jz: rnd() - 0.5, ry: (rnd() - 0.5) * 0.8,
        yFinal: c.binFloor + PH / 2 + Math.min(k + 3, 4) * 0.035,
      });
    }
  }

  // hal: achterwand, ramen, pilaren, lampen, machines
  box(scene, 30, 7, 0.2, mat(0x2b323b, 0.9), 0, 3.5, -9, false);
  for (let x = -9; x <= 9; x += 3) box(scene, 2.2, 1.6, 0.02, glow(0xcfe3ff), x, 4.6, -8.88, false);
  for (const x of [-6, -2, 2, 6]) box(scene, 0.4, 7, 0.4, mat(0x3a414b, 0.7), x, 3.5, -6);
  for (const z of [-2.5, 1.8]) for (let x = -6; x <= 6; x += 3) box(scene, 2.4, 0.05, 0.22, glow(0xf2f6ff), x, 5, z, false);
  const yellow = mat(0xf2c230, 0.6);
  box(scene, 7, 0.004, 0.07, yellow, 0, 0.002, -0.75, false);
  box(scene, 7, 0.004, 0.07, yellow, 0, 0.002, beltZ + 0.6, false);
  const cnc = new THREE.Group(); cnc.position.set(-4.2, 0, -2.4); scene.add(cnc);
  box(cnc, 1.6, 1.9, 1.2, mat(0xd9dee4, 0.5, 0.2), 0, 0.95, 0);
  box(cnc, 0.9, 0.6, 0.02, mat(0x0d1117, 0.1, 0.8), 0, 1.25, 0.61);
  const status = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), glowOwn(0x22c55e, 1));
  status.position.set(0.6, 1.75, 0.61); cnc.add(status);
  const pal = new THREE.Group(); pal.position.set(4.3, 0, -2.2); scene.add(pal);
  box(pal, 1.2, 0.14, 1.0, mat(0x9c7a4f, 0.9), 0, 0.07, 0);
  for (let i = 0; i < 6; i++) box(pal, 0.36, 0.3, 0.45, mat(0xb88d5a, 0.95), -0.38 + (i % 3) * 0.38, 0.29 + Math.floor(i / 3) * 0.31, 0.2 - (i % 2) * 0.4);

  // achtergrondrobot loopt door de hal
  const bg = createRobot(STYLE.graphite);
  bg.root.rotation.y = Math.PI / 2;
  scene.add(bg.root);

  return {
    title: 'Productie', subtitle: 'Samenwerkende humanoïden aan de assemblagelijn', duration: 10,
    hud: [
      { at: 0.8, text: 'TAAK · PICK & PLACE' },
      { at: 1.5, text: 'CYCLUSTIJD 2,4 s' },
      { at: 2.2, text: 'GRIJPSUCCES 99,7 %' },
    ],
    scene,
    update(t) {
      tex.offset.x = -(t * V_BELT) / 10 * 30;
      status.material.opacity = Math.sin(t * 6) > 0 ? 1 : 0.25;
      for (const c of cells) {
        const n = Math.floor((t - c.T0 + 0.95) / PERIOD);
        const u = t - c.T0 - n * PERIOD;
        const p = c.cycle(u);
        c.robot.setPose(p);
        c.robot.handsMid(c.hm);
        for (const part of c.parts) {
          const Tk = c.T0 + part.k * PERIOD, o = part.obj;
          if (t < Tk) {
            const x = c.x + (t - Tk) * V_BELT;
            o.visible = x > -4.9;
            o.position.set(x, beltY + PH / 2, beltZ);
            o.rotation.y = 0;
          } else if (t < Tk + 1.1) {
            o.visible = true;
            o.position.copy(c.hm);
            o.rotation.y = p.twist;
          } else {
            const s = Math.pow(seg(t, Tk + 1.1, Tk + 1.35), 2);
            o.visible = true;
            o.position.set(c.place.x + part.jx * 0.12 * s, lerp(c.place.y, part.yFinal, s), c.place.z + part.jz * 0.1 * s);
            o.rotation.y = c.dir * 1.05 + part.ry * s;
          }
        }
      }
      const bx = -6.5 + 1.0 * t;
      bg.root.position.set(bx, 0, -4.2);
      bg.setPose(POSES.walk(walkPhase(bx + 6.5)));
    },
    camera(t, cam) {
      if (t < 5.6) {
        const k = easeIO(seg(t, 0, 5.6));
        aim(cam, lerp(-2.6, 0.6, k), lerp(1.35, 1.7, k), lerp(3.0, 2.9, k), lerp(-0.6, 0.1, k), 0.95, 0.1, 36);
      } else {
        const k = easeOut(seg(t, 5.6, 10));
        aim(cam, lerp(2.1, 1.75, k), lerp(1.3, 1.25, k), lerp(1.7, 1.45, k), 0.75, 0.95, 0.15, 34);
      }
    },
  };
}

// =============================================================================
// 3 — Logistiek: krat uit een stelling halen en op een orderkar zetten
// =============================================================================
function sceneWarehouse() {
  const scene = stage(0x1b2027, 8, 30);
  lights(scene, { sky: 0xdde6f2, ground: 0x2b2b2b, hemi: 0.65, sunI: 1.25, sunPos: V(3, 9, 5), target: V(0, 0, 2), shadow: 8 });
  floor(scene, 0x7d838b, 0.55, 0.1);
  const rnd = rng(21);

  const robot = createRobot(STYLE.white);
  scene.add(robot.root);
  const reachS = P({ lean: 0.12, headX: 0.15, lSh: 1.3, rSh: 1.3, lEl: 0.2, rEl: 0.2, lShO: -0.1, rShO: -0.1, lHip: 0.05, rHip: 0.05, lKnee: 0.08, rKnee: 0.08 });
  const carry = over(POSES.stand, { lSh: 0.52, rSh: 0.52, lEl: 1.05, rEl: 1.05, lShO: -0.07, rShO: -0.07 });
  const placeC = P({ lean: 0.35, headX: 0.3, lHip: 0.32, rHip: 0.32, lKnee: 0.45, rKnee: 0.45, lSh: 0.9, rSh: 0.9, lEl: 0.5, rEl: 0.5, lShO: -0.08, rShO: -0.08 });

  const pick = calibrate(robot, reachS, V(0, 0, 0), -Math.PI / 2);
  const CW = Math.max(0.24, robot.handsGap() - 0.05), CH = 0.22, CD = 0.3;
  const drop = calibrate(robot, placeC, V(0, 0, 3.6), 0);

  // stellingen (instanced kratten voor snelheid)
  const plank = pick.y - CH / 2;
  const levels = [0.12, plank - 0.48, plank, plank + 0.5, plank + 1.0];
  const uprightMat = mat(0x2563eb, 0.5, 0.3), beamMat = mat(0xe8742a, 0.5, 0.3), deckMat = mat(0x9aa1a9, 0.6, 0.4);
  const crateCols = [0x2f6fb5, 0x56606b, 0xe0a92e, 0x3f8f5a];
  const crateGeo = new THREE.BoxGeometry(CW, CH, CD);
  const slots = crateCols.map(() => []);
  const front = pick.x + CD / 2 + 0.02;
  function rack(xFront, side, skipPick) {
    const xc = xFront - side * 0.3;
    for (let z = -6; z <= 9.01; z += 1.5) {
      box(scene, 0.07, 3.2, 0.07, uprightMat, xFront - side * 0.03, 1.6, z);
      box(scene, 0.07, 3.2, 0.07, uprightMat, xFront - side * 0.57, 1.6, z);
    }
    for (const y of levels) {
      box(scene, 0.06, 0.08, 15, beamMat, xFront - side * 0.03, y - 0.04, 1.5);
      box(scene, 0.6, 0.02, 15, deckMat, xc, y - 0.01, 1.5);
      for (let z = -5.7; z <= 8.7; z += 0.42) {
        if (skipPick && y === plank && Math.abs(z - pick.z) < 0.35) continue;
        if (rnd() < 0.3) continue;
        const m = new THREE.Matrix4().makeRotationY(Math.PI / 2);
        m.setPosition(xc, y + CH / 2, z);
        slots[Math.floor(rnd() * crateCols.length)].push(m);
      }
    }
  }
  rack(front, 1, true);
  rack(1.25, -1, false);
  crateCols.forEach((col, i) => {
    const im = new THREE.InstancedMesh(crateGeo, mat(col, 0.7, 0.05), slots[i].length);
    slots[i].forEach((m, j) => im.setMatrixAt(j, m));
    im.castShadow = true; im.receiveShadow = true;
    scene.add(im);
  });

  // het krat dat verplaatst wordt
  const crate = new THREE.Group();
  mesh(crateGeo, mat(0xe0a92e, 0.65, 0.05), 0, 0, 0, crate);
  box(crate, CW * 0.6, 0.012, 0.02, mat(0x222222, 0.6), 0, CH / 2 + 0.006, 0);
  scene.add(crate);

  // orderkar
  const cartTop = drop.y - CH / 2;
  const cart = new THREE.Group(); cart.position.set(drop.x, 0, drop.z + 0.25); scene.add(cart);
  const cartMat = mat(0x9aa3ad, 0.4, 0.7);
  box(cart, 0.7, 0.04, 0.9, cartMat, 0, cartTop - 0.02, 0);
  for (const sx of [-0.31, 0.31]) for (const sz of [-0.4, 0.4]) {
    box(cart, 0.03, cartTop - 0.1, 0.03, cartMat, sx, (cartTop + 0.06) / 2, sz);
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 14).rotateZ(Math.PI / 2), mat(0x1c1c1c, 0.8), sx, 0.05, sz, cart);
  }
  box(cart, 0.7, 0.6, 0.03, cartMat, 0, cartTop + 0.3, 0.44);
  mesh(crateGeo, mat(0x2f6fb5, 0.7, 0.05), 0, cartTop + CH / 2, 0.15, cart);

  // lichtstrips, vloerlijnen
  for (let z = -6; z <= 10; z += 4) box(scene, 0.15, 0.04, 3, glow(0xf4f8ff), 0.4, 4.6, z, false);
  box(scene, 0.06, 0.004, 16, mat(0xf2c230, 0.6), front + 0.08, 0.002, 1.5, false);
  box(scene, 0.06, 0.004, 16, mat(0xf2c230, 0.6), 1.15, 0.002, 1.5, false);

  // tweede robot loopt achterin dwars door het beeld
  const bg = createRobot(STYLE.graphite);
  bg.root.rotation.y = -Math.PI / 2;
  scene.add(bg.root);

  const turnStep = t => arms(POSES.walk(t * 7, 0.3), carry);
  const dist = t => travel(t, 3.6, 3.4, 7.8, 0.5);
  const carryWalk = t => arms(POSES.walk(walkPhase(dist(t)), 0.9), carry);
  const pose = track([
    [0, POSES.stand], [0.7, POSES.stand], [1.5, reachS], [1.95, reachS], [2.5, carry],
    [2.6, turnStep], [3.3, turnStep], [3.6, carryWalk], [7.4, carryWalk], [7.9, carry],
    [8.1, carry], [8.8, placeC], [9.15, placeC], [9.9, POSES.stand],
  ]);
  const hm = V();

  return {
    title: 'Logistiek', subtitle: 'Kratten verplaatsen van stelling naar orderkar', duration: 10,
    hud: [
      { at: 0.8, text: 'MAGAZIJN · ORDERPICKING' },
      { at: 1.6, text: 'LAST 8,0 kg' },
      { at: 3.4, text: 'ROUTE 3,6 m · VRIJ' },
    ],
    scene,
    update(t) {
      const p = pose(t);
      const yaw = lerp(-Math.PI / 2, 0, easeIO(seg(t, 2.6, 3.5)));
      const z = dist(t);
      robot.root.position.set(0, 0, z);
      robot.root.rotation.y = yaw;
      robot.setPose(p);
      if (t < 1.8) { crate.position.copy(pick); crate.rotation.y = -Math.PI / 2; }
      else if (t < 9.0) { crate.position.copy(robot.handsMid(hm)); crate.rotation.y = yaw + p.twist; }
      else { crate.position.copy(drop); crate.rotation.y = 0; }

      const bx = 6.5 - 1.1 * t;
      bg.root.position.set(bx, 0, 10.5);
      bg.setPose(POSES.walk(walkPhase(6.5 - bx)));
    },
    camera(t, cam) {
      const z = robot.root.position.z;
      if (t < 2.6) {
        const k = easeIO(seg(t, 0, 2.6));
        aim(cam, lerp(1.0, 0.85, k), lerp(1.45, 1.35, k), lerp(2.4, 2.0, k), -0.45, 1.0, 0, 38);
      } else if (t < 8.0) {
        aim(cam, 0.7, 1.15, z + 2.7 - 0.15 * seg(t, 2.6, 8), 0, 1.0, z, 40);
      } else {
        const k = easeOut(seg(t, 8, 10));
        aim(cam, lerp(1.0, 0.95, k), lerp(1.4, 1.3, k), lerp(5.6, 5.3, k), 0, 0.85, 3.8, 36);
      }
    },
  };
}

// =============================================================================
// 4 — Thuis: mok van het aanrecht naar tafel, tafel afnemen
// =============================================================================
function sceneKitchen() {
  const scene = stage(0x2a221c, 8, 22);
  lights(scene, { sky: 0xfff1de, ground: 0x6b4f3a, hemi: 0.7, sun: 0xffe2b8, sunI: 1.3, sunPos: V(-3, 6, 4), target: V(0, 0, 0.5), shadow: 5 });
  floor(scene, 0xa57c55, 0.7);

  const robot = createRobot(STYLE.white);
  scene.add(robot.root);
  const MUG = V(0.055, -0.05, 0);                       // mok aan binnenkant rechterhand
  const CLOTH = V(0, -0.09, 0);
  const reach1 = P({ lean: 0.22, headX: 0.4, lHip: 0.12, rHip: 0.12, lKnee: 0.18, rKnee: 0.18, rSh: 1.05, rEl: 0.4, rShO: -0.06, lShO: 0.1, lEl: 0.2, lSh: 0.05 });
  const holdMug = over(POSES.stand, { rSh: 0.45, rEl: 1.15, rShO: -0.05, headX: 0.15 });
  const placeM = P({ lean: 0.3, headX: 0.45, lHip: 0.2, rHip: 0.2, lKnee: 0.28, rKnee: 0.28, rSh: 1.0, rEl: 0.38, rShO: -0.06, lShO: 0.1, lEl: 0.2 });
  const W0 = 6.3, W1 = 8.8;
  const wipe = t => {
    const w = (t - W0) * 5;
    return P({
      lean: 0.32, headX: 0.5, lHip: 0.22, rHip: 0.22, lKnee: 0.3, rKnee: 0.3,
      lSh: 0.95 + 0.12 * Math.sin(w), lShO: 0.08 + 0.18 * (1 - Math.cos(w)), lEl: 0.38,
      rShO: 0.1, rEl: 0.25, rSh: 0.05, twist: 0.05 * Math.sin(w),
    });
  };

  const pick = calibrate(robot, reach1, V(0, 0, 0), Math.PI, 'r', MUG);
  const put = calibrate(robot, placeM, V(0, 0, 0.9), 0, 'r', MUG);
  const cloth0 = calibrate(robot, wipe(W0), V(0, 0, 0.9), 0, 'l', CLOTH);
  const cloth1 = calibrate(robot, wipe(W1), V(0, 0, 0.9), 0, 'l', CLOTH);
  const counterTop = pick.y - 0.05, counterFront = pick.z - 0.12;
  const tableTop = put.y - 0.05;

  // aanrecht + keukenkastjes
  const white = mat(0xf3efe7, 0.6), dark = mat(0x2f3135, 0.35, 0.2), wall = mat(0xe9e1d4, 0.95);
  const cz = counterFront - 0.3;
  box(scene, 3.4, counterTop - 0.04, 0.6, white, 0.2, (counterTop - 0.04) / 2, cz);
  box(scene, 3.44, 0.04, 0.64, dark, 0.2, counterTop - 0.02, cz);
  for (let x = -1.2; x <= 1.6; x += 0.56) box(scene, 0.008, counterTop - 0.14, 0.01, mat(0xcfc8bc, 0.6), x, (counterTop - 0.04) / 2, counterFront + 0.005, false);
  box(scene, 0.5, 0.02, 0.38, mat(0x9aa3ad, 0.25, 0.8), 0.9, counterTop + 0.002, cz);
  cyl(scene, 0.015, 0.015, 0.3, mat(0xc9ced4, 0.2, 0.9), 0.9, counterTop + 0.15, cz - 0.22);
  cyl(scene, 0.08, 0.09, 0.2, mat(0x1f2937, 0.3, 0.4), -0.9, counterTop + 0.1, cz);
  const wallZ = counterFront - 0.62;
  box(scene, 8, 3.2, 0.1, wall, 0, 1.6, wallZ - 0.05, false).castShadow = false;
  box(scene, 0.1, 3.2, 6, wall, -2.6, 1.6, wallZ + 3, false).castShadow = false;
  box(scene, 2.6, 0.7, 0.35, white, -0.1, counterTop + 0.95, wallZ + 0.18);
  box(scene, 1.0, 0.9, 0.02, glow(0xfff2d6), 1.65, counterTop + 0.85, wallZ + 0.01, false);
  box(scene, 1.08, 0.04, 0.06, white, 1.65, counterTop + 0.38, wallZ + 0.03);
  box(scene, 0.75, 2.0, 0.65, mat(0xdfe3e6, 0.35, 0.35), -1.95, 1.0, cz);
  box(scene, 0.02, 0.6, 0.03, mat(0x9aa3ad, 0.3, 0.8), -1.62, 1.2, cz + 0.34);

  // tafel
  const wood = mat(0x8b5e3c, 0.55);
  const tz = put.z + 0.35;
  box(scene, 1.3, 0.04, 0.9, wood, 0, tableTop - 0.02, tz);
  for (const sx of [-0.58, 0.58]) for (const sz of [-0.38, 0.38]) box(scene, 0.05, tableTop - 0.04, 0.05, wood, sx, (tableTop - 0.04) / 2, tz + sz);
  cyl(scene, 0.12, 0.12, 0.012, mat(0xf8f8f6, 0.3), 0.32, tableTop + 0.006, tz + 0.15);
  cyl(scene, 0.14, 0.09, 0.07, mat(0xd6cfc2, 0.5), 0.25, tableTop + 0.035, tz - 0.15);
  for (let i = 0; i < 4; i++) sphere(scene, 0.04, mat([0xd94a38, 0xf59e0b, 0x84cc16, 0xd94a38][i], 0.5), 0.22 + (i % 2) * 0.06, tableTop + 0.08 + Math.floor(i / 2) * 0.03, tz - 0.17 + (i > 1 ? 0.02 : -0.02));
  // hanglamp
  cyl(scene, 0.005, 0.005, 0.9, dark, 0, 2.75, tz, 6, false);
  cyl(scene, 0.06, 0.22, 0.18, mat(0x1f2937, 0.5, 0.3), 0, 2.25, tz);
  const lamp = new THREE.PointLight(C(0xffd9a0), 0.9, 4, 2);
  lamp.position.set(0, 2.1, tz); scene.add(lamp);

  // mok en doekje
  const mug = new THREE.Group();
  cyl(mug, 0.042, 0.038, 0.1, mat(0x0ea5e9, 0.35), 0, 0, 0);
  mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 16), mat(0x0ea5e9, 0.35), 0.045, 0, 0, mug);
  scene.add(mug);
  const cloth = box(scene, 0.14, 0.012, 0.1, mat(0x2dd4bf, 0.9), 0, 0, 0);

  const turnStep = t => arms(POSES.walk(t * 7, 0.3), holdMug);
  const dist = t => travel(t, 0.9, 3.55, 4.75, 0.35);
  const mugWalk = t => arms(POSES.walk(walkPhase(dist(t)), 0.8), holdMug);
  const pose = track([
    [0, POSES.stand], [0.8, POSES.stand], [1.6, reach1], [2.0, reach1], [2.6, holdMug],
    [2.7, turnStep], [3.5, turnStep], [3.7, mugWalk], [4.5, mugWalk], [4.8, holdMug],
    [5.3, placeM], [5.75, placeM], [W0, wipe], [W1, wipe], [9.0, POSES.stand],
  ]);
  const tmp = V();

  return {
    title: 'Thuis', subtitle: 'Helpen met alledaagse klusjes in huis', duration: 9,
    hud: [
      { at: 0.8, text: 'HUISHOUDEN · TAFEL DEKKEN' },
      { at: 1.6, text: 'OBJECT · MOK 0,3 kg' },
      { at: 6.3, text: 'TAAK · TAFEL AFNEMEN' },
    ],
    scene,
    update(t) {
      const yaw = lerp(Math.PI, 0, easeIO(seg(t, 2.7, 3.6)));
      robot.root.position.set(0, 0, dist(t));
      robot.root.rotation.y = yaw;
      robot.setPose(pose(t));
      if (t < 1.85) mug.position.copy(pick);
      else if (t < 5.6) mug.position.copy(robot.point('r', MUG.x, MUG.y, MUG.z, tmp));
      else mug.position.copy(put);
      if (t < W0) cloth.position.copy(cloth0);
      else if (t < W1) cloth.position.copy(robot.point('l', CLOTH.x, CLOTH.y, CLOTH.z, tmp));
      else cloth.position.copy(cloth1);
      cloth.position.y = tableTop + 0.006;
    },
    camera(t, cam) {
      if (t < 3.0) {
        const k = easeIO(seg(t, 0, 3));
        aim(cam, lerp(1.5, 1.3, k), lerp(1.55, 1.5, k), lerp(1.3, 1.1, k), 0, 1.0, pick.z + 0.1, 40);
      } else {
        const k = easeIO(seg(t, 3, 9));
        aim(cam, lerp(1.6, 1.0, k), lerp(1.3, 1.25, k), lerp(3.0, 2.5, k), 0, 0.9, 1.0, 40);
      }
    },
  };
}

// =============================================================================
// 5 — Zorg: robot brengt een kopje thee naar een oudere persoon
// =============================================================================
function makePerson() {
  const root = new THREE.Group();
  const fabric = mat(0x7a6252, 0.95), sweater = mat(0x7c8fa6, 0.9), trousers = mat(0x3d4450, 0.9);
  const skin = mat(0xd9b39a, 0.7), hair = mat(0xd4d4d4, 0.9);
  // fauteuil
  box(root, 0.74, 0.14, 0.66, fabric, 0, 0.38, 0);
  box(root, 0.74, 0.75, 0.16, fabric, 0, 0.8, -0.3);
  box(root, 0.13, 0.28, 0.66, fabric, 0.37, 0.58, 0);
  box(root, 0.13, 0.28, 0.66, fabric, -0.37, 0.58, 0);
  for (const sx of [-0.33, 0.33]) for (const sz of [-0.28, 0.28]) box(root, 0.05, 0.31, 0.05, mat(0x3b2a1e, 0.6), sx, 0.155, sz);
  // persoon (zittend, kijkt naar +z in lokale ruimte)
  for (const s of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.42, 14).rotateX(Math.PI / 2), trousers, s * 0.1, 0.53, 0.13, root);
    cyl(root, 0.055, 0.05, 0.46, trousers, s * 0.1, 0.29, 0.36);
    box(root, 0.09, 0.06, 0.2, mat(0x2a2522, 0.7), s * 0.1, 0.03, 0.4);
  }
  const torso = cyl(root, 0.15, 0.17, 0.5, sweater, 0, 0.78, -0.1);
  torso.rotation.x = -0.1;
  sphere(root, 0.1, skin, 0, 1.16, -0.12);
  mesh(new THREE.SphereGeometry(0.105, 20, 12, 0, TAU, 0, Math.PI * 0.55), hair, 0, 1.17, -0.135, root);
  // rechterarm (lokaal -x) rust op armleuning
  const rest = new THREE.Group(); rest.position.set(-0.2, 0.98, -0.1); root.add(rest);
  mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.42, 10).rotateX(Math.PI / 2).translate(0, 0, 0.21), sweater, 0, 0, 0, rest);
  rest.lookAt(-0.33, 0.72, 0.2);
  // linkerarm (lokaal +x) reikt naar het kopje
  const shoulder = new THREE.Group(); shoulder.position.set(0.2, 0.98, -0.1); root.add(shoulder);
  const arm = new THREE.Group(); shoulder.add(arm);
  return { root, shoulder, arm, sweater, skin };
}

function sceneCare() {
  const scene = stage(0x2b2420, 7, 20);
  lights(scene, { sky: 0xffeedd, ground: 0x5a4636, hemi: 0.65, sun: 0xffd6a5, sunI: 1.2, sunPos: V(-2, 5, 5), target: V(0, 0, 0), shadow: 5 });
  floor(scene, 0x8c6a4c, 0.75);

  const person = makePerson();
  person.root.position.set(1.0, 0, 0);
  person.root.rotation.y = -Math.PI / 2;
  scene.add(person.root);
  person.root.updateMatrixWorld(true);
  const S = person.shoulder.getWorldPosition(V());
  const restAim = person.root.localToWorld(V(0.36, 0.72, 0.15));
  const drinkAim = person.root.localToWorld(V(0.06, 1.06, 0.28));

  const robot = createRobot(STYLE.white);
  scene.add(robot.root);
  const CUP = V(0.055, -0.05, 0);
  const holdCup = over(POSES.stand, { rSh: 0.45, rEl: 1.2, rShO: -0.04 });
  const offer = P({ lean: 0.18, headX: 0.35, lHip: 0.25, rHip: 0.25, lKnee: 0.45, rKnee: 0.45, rSh: 1.0, rEl: 0.5, rShO: -0.04, lShO: 0.08, lEl: 0.2 });

  // robot zo neerzetten dat het aangeboden kopje binnen armbereik is
  const off = calibrate(robot, offer, V(0, 0, 0), Math.PI / 2, 'r', CUP);
  const dyz2 = Math.pow(off.y - S.y, 2) + Math.pow(off.z - S.z, 2);
  const dx = Math.sqrt(Math.max(0.0225, 0.27 - dyz2));
  const XR = S.x - dx - off.x, X0 = -3.4;
  const handoff = V(XR + off.x, off.y, off.z);
  const L = handoff.distanceTo(S);
  mesh(new THREE.CylinderGeometry(0.045, 0.04, L - 0.06, 10).rotateX(Math.PI / 2).translate(0, 0, (L - 0.06) / 2), person.sweater, 0, 0, 0, person.arm);
  sphere(person.arm, 0.04, person.skin, 0, 0, L - 0.03);

  // kopje
  const cup = new THREE.Group();
  cyl(cup, 0.04, 0.032, 0.08, mat(0xf8fafc, 0.3), 0, 0, 0);
  cyl(cup, 0.036, 0.036, 0.004, mat(0x9a5b2c, 0.2), 0, 0.033, 0, 16, false);
  mesh(new THREE.TorusGeometry(0.022, 0.006, 8, 16), mat(0xf8fafc, 0.3), 0.044, 0, 0, cup);
  scene.add(cup);

  // kamer
  const wallMat = mat(0xe8dccb, 0.95);
  box(scene, 10, 3.2, 0.1, wallMat, 0, 1.6, -1.6, false).castShadow = false;
  box(scene, 1.3, 1.2, 0.02, glow(0xfff1d6), -1.3, 1.6, -1.54, false);
  box(scene, 1.38, 0.05, 0.08, mat(0xf5f0e8, 0.6), -1.3, 0.98, -1.52);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), mat(0xc9b79c, 1));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0.3, 0.004, 0.1); rug.receiveShadow = true; scene.add(rug);
  for (const [x, c] of [[0.6, 0x3b6e8f], [1.25, 0xc2785a]]) {
    box(scene, 0.42, 0.52, 0.03, mat(0x2b2b2b, 0.5), x, 1.75, -1.53);
    box(scene, 0.36, 0.46, 0.01, mat(c, 0.8), x, 1.75, -1.51, false);
  }
  cyl(scene, 0.16, 0.12, 0.3, mat(0xb45f3c, 0.8), 2.0, 0.15, -1.1);
  for (let i = 0; i < 7; i++) sphere(scene, 0.17 - i * 0.012, mat(0x3f7a3a, 0.9), 2.0 + Math.sin(i * 2.3) * 0.08, 0.42 + i * 0.12, -1.1 + Math.cos(i * 2.3) * 0.08);
  cyl(scene, 0.012, 0.012, 1.5, mat(0x2b2b2b, 0.4, 0.6), 1.55, 0.75, -0.75, 8);
  cyl(scene, 0.12, 0.2, 0.22, glow(0xffe4b8), 1.55, 1.55, -0.75, 20, false);
  const lamp = new THREE.PointLight(C(0xffd9a0), 1.1, 5, 2);
  lamp.position.set(1.55, 1.45, -0.75); scene.add(lamp);
  box(scene, 0.4, 0.5, 0.4, mat(0x6b4a33, 0.6), 1.05, 0.25, 0.75);
  box(scene, 0.2, 0.04, 0.28, mat(0x7f1d1d, 0.7), 1.05, 0.52, 0.75);

  const dist = t => travel(t, XR - X0, 0, 4.2, 0.6);
  const cupWalk = t => arms(POSES.walk(walkPhase(dist(t)), 0.75), holdCup);
  const nod = t => over(POSES.stand, { headX: 0.12 + 0.12 * bump(t, 7.8, 8.6), headY: -0.1 });
  const pose = track([
    [0, cupWalk], [4.0, cupWalk], [4.4, holdCup], [4.7, holdCup], [5.6, offer], [6.7, offer], [7.6, nod], [9, nod],
  ]);
  const tmp = V(), aimP = V(), hand = V(), dir = V();

  return {
    title: 'Zorg', subtitle: 'Ondersteuning voor ouderen en zorgverleners', duration: 9,
    hud: [
      { at: 0.8, text: 'ZORG · ASSISTENTIE' },
      { at: 1.5, text: 'SNELHEID BEGRENSD 0,8 m/s' },
      { at: 4.6, text: 'AANRAKINGSVEILIG · KRACHT < 10 N' },
    ],
    scene,
    update(t) {
      robot.root.position.set(X0 + dist(t), 0, 0);
      robot.root.rotation.y = Math.PI / 2;
      robot.setPose(pose(t));

      // arm van de persoon: rust → kopje aanpakken → naar zich toe
      aimP.copy(restAim).lerp(handoff, smooth(seg(t, 5.2, 6.0)));
      aimP.lerp(drinkAim, smooth(seg(t, 6.8, 8.0)));
      person.arm.lookAt(aimP);
      dir.copy(aimP).sub(S).normalize();
      hand.copy(S).addScaledVector(dir, L);

      const rp = robot.point('r', CUP.x, CUP.y, CUP.z, tmp);
      if (t < 6.0) cup.position.copy(rp);
      else if (t < 6.5) cup.position.copy(rp).lerp(hand, smooth(seg(t, 6.0, 6.5)));
      else cup.position.copy(hand);
    },
    camera(t, cam) {
      if (t < 4.3) {
        const x = robot.root.position.x;
        aim(cam, x + 0.6, 1.35, 3.1, x + 0.5, 0.95, 0, 36);
      } else {
        const k = easeIO(seg(t, 4.3, 9));
        aim(cam, lerp(-0.1, 0.15, k), lerp(1.4, 1.3, k), lerp(3.3, 2.7, k), 0.35, 0.9, 0, 36);
      }
    },
  };
}

// =============================================================================
// 6 — Inspectie: patrouille over industrieel terrein bij schemering
// =============================================================================
function sceneInspection() {
  const scene = stage(0xd9a37c, 12, 55);
  skyDome(scene, 0x1e2f4f, 0xeaa77a, 0x3a3631);
  lights(scene, { sky: 0x9fb4d1, ground: 0x4a3b2a, hemi: 0.55, sun: 0xffc58a, sunI: 1.7, sunPos: V(-8, 6, 7), target: V(0, 0, -1), shadow: 10 });
  const H = (x, z) => 0.18 * Math.sin(x * 0.55 + 1) * Math.cos(z * 0.45) + 0.08 * Math.sin(x * 1.4 - z * 0.9);
  const rnd = rng(3);

  // terrein met vertex-kleuren (pad iets lichter)
  const geo = new THREE.PlaneGeometry(90, 90, 180, 180).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cols = [];
  const cBase = C(0x6f6a58), cDark = C(0x4f4c3f), cPath = C(0x9a917a), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, H(x, z));
    c.copy(cBase).lerp(cDark, 0.5 + 0.5 * Math.sin(x * 0.9) * Math.cos(z * 1.3));
    c.lerp(cPath, Math.max(0, 1 - Math.abs(z) / 0.9) * 0.8);
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
  ground.receiveShadow = true;
  scene.add(ground);

  for (let i = 0; i < 60; i++) {
    const x = (rnd() - 0.5) * 26, z = (rnd() - 0.5) * 18;
    if (Math.abs(z) < 1.2 || (z < -2 && z > -3.2)) continue;
    const r = 0.08 + rnd() * 0.35;
    const m = mesh(new THREE.DodecahedronGeometry(r, 0), mat(0x7d776a, 0.95, 0, { flatShading: true }), x, H(x, z) + r * 0.3, z, scene);
    m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    m.scale.set(1, 0.6 + rnd() * 0.5, 1);
  }

  // leidingbrug langs het pad
  const PZ = -2.6, steel = mat(0x6b7178, 0.5, 0.6);
  for (let x = -12; x <= 12; x += 2.5) {
    for (const dz of [-0.2, 0.2]) {
      const y0 = H(x, PZ + dz);
      box(scene, 0.1, 1.75 - y0, 0.1, steel, x, (1.75 + y0) / 2, PZ + dz);
    }
    box(scene, 0.1, 0.08, 0.5, steel, x, 1.12, PZ);
  }
  const pipeA = mesh(new THREE.CylinderGeometry(0.13, 0.13, 26, 20).rotateZ(Math.PI / 2), mat(0xa9b0b7, 0.35, 0.7), 0, 1.29, PZ, scene);
  const pipeB = mesh(new THREE.CylinderGeometry(0.09, 0.09, 26, 16).rotateZ(Math.PI / 2), mat(0xc2532f, 0.6, 0.2), 0, 1.58, PZ, scene);
  pipeA.receiveShadow = pipeB.receiveShadow = true;
  const VX = 3.4;
  for (const dx of [-0.12, 0.12]) mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 20).rotateZ(Math.PI / 2), steel, VX + dx, 1.29, PZ, scene);
  cyl(scene, 0.02, 0.02, 0.32, steel, VX, 1.55, PZ, 8);
  const wheel = mesh(new THREE.TorusGeometry(0.12, 0.016, 8, 24), mat(0xdc2626, 0.5, 0.2), VX, 1.72, PZ, scene);
  wheel.rotation.x = Math.PI / 2;
  const alarm = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 8, 48), glowOwn(0xff8a3d, 0, true));
  alarm.position.set(VX, 1.29, PZ + 0.01);
  scene.add(alarm);

  // tanks en schoorsteen op afstand
  const tankMat = mat(0xd7dadf, 0.5, 0.3);
  for (const [x, z, r, h] of [[-9, -11, 2.4, 4.5], [-3.5, -12, 2.0, 3.8], [3.5, -11.5, 2.6, 5], [10, -10, 1.8, 3.4]]) {
    cyl(scene, r, r, h, tankMat, x, h / 2 + H(x, z), z, 32);
    mesh(new THREE.SphereGeometry(r, 32, 12, 0, TAU, 0, Math.PI / 2), tankMat, x, h + H(x, z), z, scene).scale.y = 0.35;
  }
  for (let i = 0; i < 6; i++) cyl(scene, 0.42, 0.42, 1.8, mat(i % 2 ? 0xf3f4f6 : 0xc62828, 0.6), 13.5, 0.9 + i * 1.8, -14, 20);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), glowOwn(0xff2a2a, 1));
  beacon.position.set(13.5, 11, -14); scene.add(beacon);

  // robot + lidar
  const robot = createRobot(STYLE.silver);
  scene.add(robot.root);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.6, 32, 1, true).translate(0, -1.3, 0).rotateX(-Math.PI / 2), glowOwn(0x7dd3fc, 0.04, true));
  cone.position.set(0, 0.1, 0.08);
  robot.J.head.add(cone);
  const rings = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 64), glowOwn(0x7dd3fc, 0, true));
    m.rotation.x = -Math.PI / 2;
    scene.add(m);
    return m;
  });

  const X0 = -4.5, D = 7.5;
  const dist = t => travel(t, D, 0, 6.3, 0.5, 0.7);
  const walkFn = t => POSES.walk(walkPhase(dist(t)), 1);
  const inspect = over(POSES.stand, { twist: 0.5, headY: 0.75, headX: -0.08, lSh: 1.35, lShO: 0.25, lEl: 0.1, rShO: 0.12, rEl: 0.25 });
  const pose = track([[0, walkFn], [6.0, walkFn], [6.5, POSES.stand], [7.1, inspect], [9, inspect]]);

  return {
    title: 'Inspectie', subtitle: 'Autonoom patrouilleren op industrieel terrein', duration: 9,
    hud: [
      { at: 0.8, text: 'INSPECTIE · LEIDINGNET' },
      { at: 1.5, text: 'LIDAR 360° · 2,4 M pts/s' },
      { at: 7.1, text: 'AFWIJKING · KLEP K-12 · 41 °C', warn: true },
    ],
    scene,
    update(t) {
      const x = X0 + dist(t);
      robot.root.position.set(x, H(x, 0), 0);
      robot.root.rotation.y = Math.PI / 2;
      robot.setPose(pose(t));
      const scan = seg(t, 6.8, 7.3);
      cone.rotation.y = 0.5 * Math.sin(t * 2.2) * (1 - scan);
      cone.material.opacity = 0.035 + 0.045 * scan;
      rings.forEach((r, i) => {
        const u = ((t + i * 0.6) % 1.8) / 1.8;
        r.position.set(x, H(x, 0) + 0.06, 0);
        r.scale.setScalar(0.2 + 3.5 * u);
        r.material.opacity = 0.45 * (1 - u);
      });
      alarm.material.opacity = t > 7.0 ? 0.5 + 0.5 * Math.sin(t * 9) : 0;
      alarm.scale.setScalar(1 + 0.15 * Math.sin(t * 9));
      beacon.material.opacity = Math.sin(t * 4) > 0.3 ? 1 : 0.15;
    },
    camera(t, cam) {
      const x = robot.root.position.x;
      if (t < 4.6) {
        aim(cam, x - 1.6, 3.3, 6.4, x + 0.8, 0.8, -0.6, 38);
      } else {
        const k = easeIO(seg(t, 4.6, 9));
        aim(cam, lerp(x + 2.6, x + 2.0, k), lerp(0.7, 0.8, k), lerp(2.5, 2.1, k), lerp(x, 3.0, k), 1.1, lerp(-0.6, -1.2, k), 40);
      }
    },
  };
}

// =============================================================================
// 7 — Agiliteit: rennen, salto achterwaarts, draaitrap
// =============================================================================
function sceneAgility() {
  const scene = stage(0x07090d, 10, 34);
  lights(scene, { sky: 0x64748b, ground: 0x0a0a0a, hemi: 0.6, sunI: 1.6, sunPos: V(3, 9, 5), target: V(0, 0, -2), shadow: 9 });
  const rim = new THREE.DirectionalLight(C(0xff9a4d), 1.1);
  rim.position.set(-4, 3, -8);
  scene.add(rim);
  floor(scene, 0x0c0f14, 0.35, 0.4);
  const grid = new THREE.GridHelper(60, 60, C(0xff7a1a), C(0x334155));
  grid.material.transparent = true; grid.material.opacity = 0.25;
  grid.position.y = 0.003;
  scene.add(grid);
  for (const x of [-6, 6]) for (const y of [0.4, 2.6]) box(scene, 0.04, 0.04, 40, glow(0xff7a1a), x, y, -6, false);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.04, 8, 96), glow(0xff7a1a));
  ring.position.set(0, 3.2, -14); scene.add(ring);
  for (const z of [-6, -2, 1.5]) {
    const s = new THREE.SpotLight(C(0xffffff), 1.6, 12, 0.5, 0.7, 1.2);
    s.position.set(0, 7, z); s.target.position.set(0, 0, z);
    scene.add(s, s.target);
  }

  const robot = createRobot(STYLE.silver);
  scene.add(robot.root);

  const RUNV = 2.6, Z0 = -7.4;
  const zAt = t => {
    let z;
    if (t < 2.4) z = Z0 + RUNV * t;
    else { const u = Math.min(t - 2.4, 0.6); z = Z0 + RUNV * 2.4 + RUNV * (u - u * u / 1.2); }
    return z - 0.4 * smooth(seg(t, 3.7, 5.3));
  };
  const runFn = t => POSES.run(((zAt(t) - Z0) / STRIDE_RUN) * TAU);
  const flipFn = t => POSES.flip(seg(t, 3.7, 5.3));
  const kickFn = t => POSES.kick(seg(t, 6.45, 7.6));
  const guardFn = t => over(POSES.guard, { lKnee: 0.5 + 0.05 * Math.sin(t * 6), rKnee: 0.42 + 0.05 * Math.sin(t * 6), headY: 0.3 });
  const pose = track([
    [0, runFn], [2.4, runFn], [3.05, POSES.stand], [3.3, POSES.stand], [3.65, POSES.crouchPrep],
    [3.7, flipFn], [5.3, flipFn], [5.75, POSES.stand], [6.1, POSES.ready], [6.45, kickFn],
    [7.6, kickFn], [8.1, guardFn], [10, guardFn],
  ]);

  return {
    title: 'Agiliteit', subtitle: 'Dynamische balans: rennen, springen, landen', duration: 10,
    hud: [
      { at: 0.6, text: 'BALANS & AGILITEIT' },
      { at: 1.2, text: 'SPRINT 2,6 m/s' },
      { at: 3.7, text: 'SALTO ACHTERWAARTS · 0,5×' },
      { at: 6.45, text: 'DRAAITRAP 360°' },
    ],
    scene,
    update(t) {
      robot.root.position.set(0, 0, zAt(t));
      robot.setPose(pose(t));
    },
    camera(t, cam) {
      const z = robot.root.position.z;
      if (t < 2.7) {
        aim(cam, 0.9, 0.55, z + 3.4, 0, 0.95, z, 40);
      } else if (t < 6.1) {
        const a = lerp(0.35, 1.55, easeIO(seg(t, 2.7, 5.8)));
        const zc = -0.6;
        aim(cam, 3.8 * Math.sin(a), lerp(0.8, 1.2, seg(t, 2.7, 5.8)), zc + 3.8 * Math.cos(a), 0, 1.15, zc, 40);
      } else {
        const k = easeOut(seg(t, 6.1, 10));
        aim(cam, lerp(-1.9, -1.4, k), lerp(0.7, 0.85, k), z + lerp(2.6, 2.1, k), 0, 1.0, z - 0.1, 40);
      }
    },
  };
}

// =============================================================================
// 8 — Outro: een formatie robots loopt naar de camera
// =============================================================================
function sceneOutro() {
  const scene = stage(0x060912, 7, 30);
  lights(scene, { sky: 0x3b4a6b, ground: 0x050505, hemi: 0.35, sunI: 1.4, sunPos: V(2, 7, 6), target: V(0, 0, -4), shadow: 8 });
  const back = new THREE.DirectionalLight(C(0x5eead4), 0.6);
  back.position.set(0, 4, -12);
  scene.add(back);
  floor(scene, 0x0a0d14, 0.45, 0.5);
  for (let x = -6; x <= 6; x += 1.5) box(scene, 0.02, 0.003, 40, glow(0x38bdf8, 0.35), x, 0.002, -10, false);
  box(scene, 40, 0.04, 0.04, glow(0x5eead4), 0, 0.05, -22, false);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(7, 0.05, 8, 128, Math.PI), glow(0x38bdf8, 0.6));
  arc.position.set(0, 0, -20); scene.add(arc);

  const styles = [STYLE.white, STYLE.silver, STYLE.graphite];
  const dist = t => travel(t, 4.4, 0, 5.8, 0, 1.0);
  const walkFn = t => POSES.walk(walkPhase(dist(t)), 1);
  const bots = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const i = bots.length;
    const robot = createRobot(styles[(r + c) % 3]);
    scene.add(robot.root);
    const w = 6.4 + i * 0.08;
    bots.push({
      robot, x: (c - 1) * 1.05, z: -5.8 - r * 1.25, i,
      pose: track([[0, walkFn], [5.3, walkFn], [5.9, POSES.stand], [w, POSES.stand], [w + 0.4, POSES.wave], [w + 1.8, POSES.wave], [w + 2.4, POSES.stand]]),
    });
  }

  return {
    title: 'Humanoids', subtitle: '', duration: 10, noLower: true,
    hud: [{ at: 1.0, text: 'FORMATIE · 9 EENHEDEN' }, { at: 1.6, text: 'SYNCHROON · ±2 ms' }],
    card: {
      at: 6.6, until: 10, big: 'HUMANOIDS',
      small: 'Productie · Logistiek · Thuis · Zorg · Inspectie',
      note: 'Fictieve demo — volledig procedureel gerenderd met three.js',
    },
    scene,
    update(t) {
      const d = dist(t);
      for (const b of bots) {
        b.robot.root.position.set(b.x, 0, b.z + d);
        b.robot.setPose(b.pose(t));
        b.robot.setGlow(0.6 + 0.4 * Math.sin(t * 3 - b.i * 0.5));
      }
    },
    camera(t, cam) {
      const zf = -5.8 + dist(t);
      if (t < 5.8) {
        aim(cam, 0.3 * Math.sin(t * 0.3), 0.55, zf + 3.6, 0, 1.05, zf - 0.8, 40);
      } else {
        const k = easeIO(seg(t, 5.8, 10));
        aim(cam, lerp(0.3 * Math.sin(5.8 * 0.3), 1.0, k), lerp(0.55, 2.4, k), zf + lerp(3.6, 6.4, k), 0, lerp(1.05, 0.7, k), zf - 1.0, 40);
      }
    },
  };
}

function buildScenes() {
  return [sceneIntro(), sceneFactory(), sceneWarehouse(), sceneKitchen(), sceneCare(), sceneInspection(), sceneAgility(), sceneOutro()];
}

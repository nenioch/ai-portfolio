'use strict';
/* =============================================================================
   dag.js — de dag in zeven scènes, in één doorlopende wereld.
   Elke scène: { h0, h1, title, txt, fact, update(t), cam(t) }.
   Alles is een pure functie van de lokale tijd t (0..DUR), zodat pauzeren en
   spoelen werkt. cam(t) geeft een doel voor de camera; die glijdt er rustig
   naartoe (camera.js).
   ============================================================================= */

const DUR = 13;

function buildDag(W) {
  const scene = W.scene;
  const A = {
    elder: createMens('elder'), vrouw1: createMens('vrouw1', 0.95), vrouw2: createMens('vrouw2', 0.96),
    jager1: createMens('jager1', 1.04), jager2: createMens('jager2'), jager3: createMens('jager3', 0.98),
    kind: createMens('kind', 0.62), kind2: createMens('kind2', 0.56),
  };
  for (const k in A) scene.add(A[k].base);
  const hert = createHert(); scene.add(hert.root);
  const mammoets = [0, 1, 2].map(i => { const m = createMammoet(i + 1); scene.add(m.root); return m; });

  // speren: schacht langs +z, punt vooraan
  const spearGeo = new THREE.CylinderGeometry(0.014, 0.016, 2.1, 6).rotateX(Math.PI / 2).translate(0, 0, -0.25);
  const tipGeo = new THREE.ConeGeometry(0.03, 0.14, 5).rotateX(Math.PI / 2).translate(0, 0, 0.87);
  const spears = [0, 1, 2, 3].map(() => {
    const g = new THREE.Group();
    mesh(spearGeo, mat(0x7a5b34, 0.9), 0, 0, 0, g); mesh(tipGeo, mat(0x4d4f55, 0.4), 0, 0, 0, g);
    scene.add(g); return g;
  });
  const pole = mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 7), mat(0x6b4c2a, 0.9), 0, 0, 0, scene);
  const flakes = [0, 1, 2, 3, 4].map(() => mesh(new THREE.TetrahedronGeometry(0.025), mat(0xd9d4c8, 0.4), 0, 0, 0, scene, false));

  const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  const F = PLEK.vuur, G = PLEK.bessen, H = PLEK.jacht;
  const tmp = V(), tmp2 = V();

  function put(a, x, z, yaw, pose, opts = {}) {
    const m = A[a];
    m.place(x, z, yaw, false);
    if (opts.lie !== undefined) {
      const k = opts.lie;
      m.root.rotation.x = -Math.PI / 2 * k; m.root.position.y = 0.13 * k; m.root.position.z = 0.9 * k;
    }
    m.setPose(pose);
    m.hold(opts.hold || null);
  }
  const lie = (a, x, z) => put(a, x, z, face(x, z, F[0], F[1]), POSES.lie, { lie: 1 });
  function spearAt(s, p, yaw, pitch) {
    s.visible = true; s.position.copy(p);
    s.rotation.set(-pitch, yaw, 0, 'YXZ');
  }
  function holdSpear(i, a, pitch = 0.08) {
    spearAt(spears[i], A[a].grip('r', tmp), A[a].base.rotation.y, pitch);
  }
  // armen van de ene houding op de benen van een andere
  const ARMS = ['lSh', 'lShO', 'lTw', 'lEl', 'rSh', 'rShO', 'rTw', 'rEl'];
  const withArms = (legs, arms) => { const p = Object.assign({}, legs); for (const k of ARMS) p[k] = arms[k]; return p; };
  const sitWarm = over(POSES.sitLog, { lSh: 1.0, rSh: 1.0, lEl: 0.7, rEl: 0.7, lShO: -0.1, rShO: -0.1 });

  // ---------------------------------------------------------------- scènes
  const SCENES = [
    {
      h0: 6, h1: 8, title: 'Wakker worden',
      txt: 'De groep slaapt dicht bij het vuur op huiden en droog gras. De gloeiende kolen van gisteravond worden opgepookt: vuur geeft warmte en licht en houdt roofdieren op afstand.',
      fact: 'Groepsgrootte: meestal 20 tot 30 mensen, een paar families samen.',
      update(t) {
        // jager1 wordt wakker, gaat zitten, staat op en rekt zich uit
        const up = smooth(seg(t, 4.2, 5.4));
        const p1 = track([[0, POSES.lie], [4.2, POSES.lie], [5.4, POSES.sitGround], [8.4, POSES.sitGround], [9.4, POSES.stand], [9.9, POSES.stretch], [11.8, POSES.stretch], [12.6, POSES.stand]])(t);
        put('jager1', -1.7, 1.6, face(-1.7, 1.6, 0, 0), p1, { lie: 1 - up });
        const pokeArm = 0.95 + 0.25 * Math.sin(t * 4) * seg(t, 1.5, 2.5);
        put('vrouw1', -0.85, 0.95, face(-0.85, 0.95, 0, 0), over(POSES.crouch, { rSh: pokeArm, rEl: 0.2, lSh: 0.5 }), { hold: ['stick'] });
        lie('kind', 0.2, 2.1);
        const up2 = smooth(seg(t, 6.6, 7.6));
        put('vrouw2', 1.6, 1.7, face(1.6, 1.7, 0, 0), up2 > 0 ? POSES.sitGround : POSES.lie, { lie: 1 - up2 });
        put('elder', 1.55, -1.75, face(1.55, -1.75, 0, 0), sitWarm);
        const w = walkPath(t, [6.0, -1.6], [2.7, -0.7], 5, 10);
        put('jager2', w.x, w.z, w.moving ? w.yaw : face(2.7, -0.7, 0, 0), w.moving ? w.pose : POSES.stand);
        lie('jager3', 2.1, -1.2);
        lie('kind2', -1.4, -1.6);
        W.setFire(lerp(0.15, 0.5, smooth(seg(t, 2.5, 8))));
      },
      cam: t => ({ a: V(0, 0.7, 0.3), d: lerp(9, 7, smooth(t / DUR)), phi: 1.27, th: 0.6 - t * 0.03 }),
    },
    {
      h0: 8, h1: 10, title: 'Verzamelen',
      txt: 'Bessen, noten, wortels en knollen. Met een graafstok halen ze eetbare wortels uit de grond. Kinderen lopen mee en leren welke planten je kunt eten en welke giftig zijn.',
      fact: 'Kennis: jager-verzamelaars kennen vaak honderden planten bij naam, en weten waar en wanneer die te vinden zijn.',
      update(t) {
        const gx = G[0], gz = G[1];
        const pick = Math.sin(t * 2.4);
        put('vrouw1', gx - 0.65, gz + 0.35, face(gx - 0.65, gz + 0.35, gx - 1.3, gz - 0.4),
          over(POSES.stand, { lean: 0.15, rSh: 1.45 + 0.3 * pick, rShO: 0.1, rEl: 0.3 - 0.2 * pick, lSh: 0.5, lEl: 1.1, headX: 0.2 }), { hold: ['basket'] });
        A.vrouw1.props.basket.userData.berries.forEach((b, i) => { b.visible = i < 4 + t / 2; });
        const dig = Math.sin(t * 4.5);
        put('vrouw2', gx + 0.7, gz + 1.5, -Math.PI / 2 - 0.3, over(POSES.crouch, { rSh: 0.75 + 0.35 * dig, rEl: 0.4, lSh: 0.7 + 0.2 * dig, lEl: 0.5 }), { hold: ['stick'] });
        // kind loopt heen en weer tussen de struiken
        const n = Math.floor(t / 4.3), u = t - n * 4.3;
        const P0 = [gx - 0.2, gz + 1.0], P1 = [gx + 2.4, gz - 0.5];
        const w = n % 2 ? walkPath(u, P1, P0, 0.2, 4.1) : walkPath(u, P0, P1, 0.2, 4.1);
        put('kind', w.x, w.z, w.yaw, w.pose, { hold: ['basket'] });
        A.kind.props.basket.userData.berries.forEach((b, i) => { b.visible = i < t / 1.5; });
        const eat = bump(t % 3, 0.6, 2.4);
        put('kind2', gx + 1.6, gz + 2.7, face(gx + 1.6, gz + 2.7, gx, gz), over(POSES.sitGround, { rSh: 0.4 + 1.0 * eat, rEl: 0.4 + 1.9 * eat, headX: -0.1 * eat }));
        // in het kamp
        put('elder', 1.55, -1.75, face(1.55, -1.75, 0, 0), sitWarm);
        put('jager3', 2.3, 0.0, -Math.PI / 2, over(POSES.sitLog, { rSh: 0.9, rEl: 1.1 + 0.2 * Math.sin(t * 3) }), { hold: ['stick'] });
        // jagers vertrekken
        const j1 = walkPath(t, [3.2, 1.5], [12.5, 9.2], 0.5, 12.5), j2 = walkPath(t, [2.4, 2.3], [11.5, 10.2], 1.0, 13);
        put('jager1', j1.x, j1.z, j1.yaw, j1.pose); holdSpear(0, 'jager1', 0.35);
        put('jager2', j2.x, j2.z, j2.yaw, j2.pose); holdSpear(1, 'jager2', 0.35);
        W.setBerries(1 - 0.7 * t / DUR);
        W.setFire(0.28);
      },
      cam: t => ({ a: V(G[0] + 0.3, 0.8, G[1] + 0.6), d: lerp(8.5, 7, smooth(t / DUR)), phi: 1.22, th: -0.25 + t * 0.035 }),
    },
    {
      h0: 10, h1: 13, title: 'Op jacht',
      txt: 'Drie jagers besluipen een edelhert, tegen de wind in zodat het dier hen niet ruikt. Ze werken samen en gooien speren met een punt van vuursteen. De meeste jachten mislukken. Vandaag lukt het.',
      fact: 'Prooi: rendier, paard, edelhert, bizon en soms een mammoet. Kijk maar achter op de vlakte.',
      update(t) {
        const hx = H[0], hz = H[1];
        const D0 = [hx + 3.5, hz - 0.5], D1 = [hx + 5.7, hz - 3.7];
        const runYaw = Math.atan2(D1[0] - D0[0], D1[1] - D0[1]);
        // hert
        if (t < 8) hert.set({ x: D0[0], z: D0[1], yaw: Math.PI * 0.92, head: smooth(seg(t, 5.2, 5.8)) * (1 - 0.3 * bump(t, 2, 4)), spear: false });
        else {
          const d = travel(t, Math.hypot(D1[0] - D0[0], D1[1] - D0[1]), 8, 9.9, 0.15, 0.5), k = d / Math.hypot(D1[0] - D0[0], D1[1] - D0[1]);
          hert.set({ x: lerp(D0[0], D1[0], k), z: lerp(D0[1], D1[1], k), yaw: runYaw, head: 1, gait: 1 - seg(t, 9.4, 10), ph: d / 1.7 * TAU, fall: smooth(seg(t, 9.7, 10.5)), spear: true });
        }
        // jagers
        const rows = [['jager1', -8, 0.3], ['jager2', -8.8, -1.3], ['jager3', -9.5, 1.7]];
        rows.forEach(([a, dx, dz], i) => {
          const from = [hx + dx, hz + dz], to = [hx + dx + 6.2, hz + dz];
          let x, z, yaw, pose;
          if (t < 9) {
            const w = walkPath(t, from, to, 0.4, 6.4, 0.75, POSES.sneak);
            x = w.x; z = w.z; yaw = w.yaw;
            pose = w.moving ? w.pose : (i === 0 ? track([[6.4, POSES.sneak(0, 0)], [7.0, POSES.windup], [7.25, POSES.windup], [7.45, POSES.release], [8.6, POSES.release], [9, POSES.stand]])(t) : POSES.sneak(0, 0));
            if (i > 0 && t > 8) pose = mixPose(POSES.sneak(0, 0), POSES.stand, smooth(seg(t, 8, 8.8)));
          } else {
            const goal = [D1[0] - 1.8 + i * 0.4, D1[1] + 1.2 + i * 0.9];
            const w = walkPath(t, to, goal, 9, 11.2, STRIDE_RUN, POSES.run);
            x = w.x; z = w.z; yaw = w.moving ? w.yaw : face(x, z, D1[0], D1[1]);
            pose = w.moving ? w.pose : POSES.cheer(t + i);
          }
          put(a, x, z, yaw, pose);
          if (!(i === 0 && t > 7.35)) holdSpear(i, a, i === 0 && t > 6.6 ? 0.25 : 0.04);
        });
        // vliegende speer
        if (t > 7.35 && t < 8) {
          const u = seg(t, 7.35, 8), S = V(hx - 1.6, 1.95, hz + 0.3), E = V(D0[0] - 0.1, 1.15, D0[1] + 0.05);
          const p = tmp.lerpVectors(S, E, u); p.y += Math.sin(u * Math.PI) * 0.9;
          const vy = (E.y - S.y) + Math.cos(u * Math.PI) * Math.PI * 0.9, horiz = Math.hypot(E.x - S.x, E.z - S.z);
          spearAt(spears[3], p, Math.atan2(E.x - S.x, E.z - S.z), Math.atan2(vy, horiz));
        }
        put('elder', 1.55, -1.75, face(1.55, -1.75, 0, 0), sitWarm);
        W.setFire(0.22);
      },
      cam: t => {
        const k = smooth(seg(t, 7.5, 11));
        return { a: V(H[0] + lerp(-1.5, 3, k), 1.0, H[1] + lerp(0, -2, k)), d: lerp(12, 10, smooth(t / DUR)), phi: 1.3, th: 0.15 - t * 0.03 };
      },
    },
    {
      h0: 13, h1: 16, title: 'Werktuigen maken',
      txt: 'In de middag wordt vuursteen bewerkt. Met een klopsteen slaat een ervaren maker scherpe afslagen los voor messen, schrabbers en speerpunten. Een huid wordt schoongeschraapt voor kleding.',
      fact: 'Snel werk: een ervaren maker heeft in een paar minuten een vlijmscherp mes.',
      update(t) {
        const strike = Math.abs(Math.sin(t * 3.5));
        put('elder', 1.55, -1.75, face(1.55, -1.75, 0, 0),
          over(POSES.sitLog, { lean: 0.35, headX: 0.35, lSh: 0.75, lEl: 1.25, lShO: -0.2, rSh: 0.55 + 0.5 * strike, rEl: 1.5 - 0.3 * strike, rShO: -0.15 }), { hold: ['stone', 'flint'] });
        // splinters bij elke slag
        const A0 = A.elder.grip('l', tmp2), ph = (t * 3.5) / Math.PI, n = Math.floor(ph), u = ph - n;
        flakes.forEach((f, i) => {
          f.visible = u < 0.7;
          const vx = (hash(n * 5 + i) - 0.5) * 1.4, vz = (hash(n * 7 + i) - 0.5) * 1.4, vy = 0.8 + hash(n * 3 + i);
          const s = u * 0.6;
          f.position.set(A0.x + vx * s, Math.max(0.02, A0.y + vy * s - 4.9 * s * s), A0.z + vz * s);
          f.rotation.set(u * 9 + i, u * 7, 0);
        });
        // huid schrapen bij het droogrek
        const [hx, hz] = PLEK.huid, nx = Math.sin(-0.5), nz = Math.cos(-0.5);
        const scr = Math.sin(t * 3.4);
        put('vrouw2', hx + nx * 0.75, hz + nz * 0.75, -0.5 + Math.PI,
          over(POSES.stand, { lean: 0.12, rSh: 1.25 + 0.3 * scr, rEl: 0.5 - 0.2 * scr, lSh: 1.15 + 0.3 * scr, lEl: 0.55, rShO: -0.1, lShO: -0.1 }), { hold: ['stone'] });
        put('vrouw1', -2.3, -0.25, Math.PI / 2, over(POSES.sitLog, { lSh: 0.7, lEl: 1.5, rSh: 0.6 + 0.1 * Math.sin(t * 5), rEl: 1.6, headX: 0.35 }));
        put('jager3', 2.3, 0.0, -Math.PI / 2, over(POSES.sitLog, { rSh: 0.9, rEl: 1.1 + 0.2 * Math.sin(t * 3), lSh: 0.8, lEl: 1.2 }), { hold: ['stick'] });
        // kinderen spelen tikkertje
        [['kind', 0], ['kind2', -0.7]].forEach(([a, off]) => {
          const ang = t * 0.8 + off, r = 2.3;
          const x = 1.6 + Math.cos(ang) * r, z = 5.4 + Math.sin(ang) * r;
          put(a, x, z, Math.atan2(-Math.sin(ang), Math.cos(ang)), POSES.run(ang * r / STRIDE_RUN * TAU * 1.6));
        });
        W.setFire(0.3);
      },
      cam: t => ({ a: V(1.4, 0.8, 1.0), d: lerp(11, 9.5, smooth(t / DUR)), phi: 1.18, th: -0.15 + t * 0.035 }),
    },
    {
      h0: 16, h1: 19, title: 'Terug naar het kamp',
      txt: 'De jagers dragen de buit aan een stok terug. Het vlees wordt verdeeld over de hele groep. Delen is een verzekering voor de dagen dat de jacht mislukt.',
      fact: 'Werktijd: voedsel zoeken kost bij hedendaagse jager-verzamelaars zo’n 4 tot 6 uur per dag. De rest is werktuigen, zorg en samenzijn.',
      update(t) {
        const A0 = [12, 12], B = [2.4, 4.6], gap = 1.8;
        const dx = B[0] - A0[0], dz = B[1] - A0[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
        const deerSpot = [2.0, 5.3];
        if (t < 8.4) {
          const f = walkPath(t, A0, B, 0.3, 8);
          const b = walkPath(t, [A0[0] - ux * gap, A0[1] - uz * gap], [B[0] - ux * gap, B[1] - uz * gap], 0.3, 8);
          put('jager1', f.x, f.z, f.yaw, withArms(f.pose, POSES.carry));
          put('jager2', b.x, b.z, b.yaw, withArms(over(b.pose, {}), POSES.carry));
          const pa = A.jager1.handsMid(V()), pb = A.jager2.handsMid(V());
          pa.y += 0.04; pb.y += 0.04;
          const ext = tmp.subVectors(pa, pb).normalize().multiplyScalar(0.35);
          pole.visible = true;
          between(pole, pb.clone().sub(ext), pa.clone().add(ext));
          const mid = pa.clone().add(pb).multiplyScalar(0.5);
          hert.set({ x: mid.x, y: mid.y, z: mid.z, yaw: f.yaw, hang: true, spear: false });
        } else {
          hert.set({ x: deerSpot[0], z: deerSpot[1], yaw: 0.4, fall: 1, spear: false });
          pole.visible = true;
          between(pole, V(B[0] + 0.6, 0.04, B[1] + 1.4), V(B[0] - 1.4, 0.04, B[1] + 0.7));
          put('jager1', 3.4, 4.6, face(3.4, 4.6, deerSpot[0], deerSpot[1]), over(POSES.stand, { lSh: 0.3, rSh: 1.0 + 0.4 * Math.sin(t * 2), rShO: 0.4, rEl: 0.7 }));
          put('jager2', 2.6, 6.8, face(2.6, 6.8, deerSpot[0], deerSpot[1]), POSES.stand);
        }
        const cut = Math.sin(t * 6);
        if (t > 9) put('vrouw2', 1.0, 5.9, face(1.0, 5.9, deerSpot[0], deerSpot[1]), over(POSES.crouch, { rSh: 0.9 + 0.25 * cut, rEl: 0.5 }), { hold: ['flint'] });
        else {
          const w = walkPath(t, [4.0, 2.0], [1.0, 5.9], 6.3, 8.8);
          put('vrouw2', w.x, w.z, w.moving ? w.yaw : -0.5 + Math.PI, w.moving ? w.pose : POSES.stand);
        }
        put('elder', 1.55, -1.75, face(1.55, -1.75, 0, 0), sitWarm);
        const g = walkPath(t, [-2.3, -0.25], [0.9, 3.9], 6.8, 10);
        put('vrouw1', g.x, g.z, g.moving ? g.yaw : face(g.x, g.z, deerSpot[0], deerSpot[1]), g.moving ? g.pose : POSES.stand);
        const k1 = walkPath(t, [0.6, 3.0], [6.0, 7.6], 2.5, 5.5, STRIDE_RUN, POSES.run);
        put('kind', k1.x, k1.z, k1.moving ? k1.yaw : face(k1.x, k1.z, 9, 7), k1.moving ? k1.pose : (t < 9 ? POSES.cheer(t) : POSES.stand));
        put('kind2', 2.2, 1.8, face(2.2, 1.8, 9, 6), t > 4 && t < 10 ? POSES.cheer(t + 1) : POSES.stand);
        const j3 = walkPath(t, [2.3, 0.0], [3.4, 6.2], 8.4, 10.6);
        if (t < 8) put('jager3', 2.3, 0.0, -Math.PI / 2, POSES.sitLog);
        else put('jager3', j3.x, j3.z, j3.moving ? j3.yaw : face(j3.x, j3.z, deerSpot[0], deerSpot[1]), j3.moving ? j3.pose : POSES.stand);
        W.setFire(0.32);
      },
      cam: t => {
        const k = smooth(seg(t, 0, 9));
        return { a: V(lerp(10.5, 2.6, k), 1.1, lerp(10, 4.8, k)), d: lerp(11, 9, k), phi: 1.24, th: 0.75 - t * 0.03 };
      },
    },
    {
      h0: 19, h1: 22, title: 'Vuur en verhalen',
      txt: 'Met een vuurboor wordt het vuur opnieuw aangewakkerd. Vlees roostert boven de vlammen. Rond het vuur worden verhalen verteld en liederen gezongen, en zo gaat kennis over van oud naar jong.',
      fact: 'Vuur: mensen gebruiken al honderdduizenden jaren vuur. Gekookt voedsel is makkelijker te verteren.',
      update(t) {
        if (t < 4) {
          const r = Math.sin(t * 16);
          put('vrouw2', 0.0, 1.1, Math.PI, over(POSES.crouch, { lSh: 1.15, rSh: 1.15, lEl: 0.9 + 0.35 * r, rEl: 0.9 - 0.35 * r, lShO: -0.25, rShO: -0.25 }));
        } else {
          const w = walkPath(t, [0, 1.1], [-2.3, 0.65], 4, 5.6);
          put('vrouw2', w.x, w.z, w.moving ? w.yaw : Math.PI / 2, w.moving ? w.pose : POSES.sitLog);
        }
        W.setFire(t < 2.5 ? 0.06 : lerp(0.06, 1, smooth(seg(t, 2.5, 5.5))));
        W.setSpit(t > 5);
        put('vrouw1', -2.3, -0.3, Math.PI / 2, POSES.sitLog);
        put('jager2', 2.3, 0.85, -Math.PI / 2, sitWarm);
        put('jager3', 2.3, -0.05, -Math.PI / 2, POSES.sitLog);
        put('elder', 1.55, -1.75, face(1.55, -1.75, 0, 0), over(POSES.sitLog, { headX: -0.1, headY: -0.4 }));
        put('kind', 0.9, 2.0, face(0.9, 2.0, 0, 0), POSES.sitGround);
        put('kind2', -1.1, 2.1, face(-1.1, 2.1, 0, 0), over(POSES.sitGround, { lean: 0.35, lSh: 0.8, rSh: 0.8, lEl: 1.4, rEl: 1.4 }));
        // de verteller
        if (t < 5.2) put('jager1', -0.3, -2.4, 0, POSES.sitLog);
        else {
          const s = smooth(seg(t, 5.2, 6.2));
          const talk = P({
            twist: 0.25 * Math.sin(t * 0.9), headY: 0.35 * Math.sin(t * 0.7), headX: -0.05,
            rSh: 1.1 + 0.6 * Math.sin(t * 1.7), rShO: 0.5 + 0.3 * Math.sin(t * 1.1), rEl: 0.8 + 0.4 * Math.sin(t * 2.3),
            lSh: 0.8 + 0.5 * Math.sin(t * 1.3 + 1), lShO: 0.4, lEl: 0.6, lHip: 0.04, rHip: 0.04, lKnee: 0.08, rKnee: 0.08,
          });
          put('jager1', -0.3, lerp(-2.4, -1.75, s), 0, mixPose(POSES.sitLog, talk, s));
        }
      },
      cam: t => ({ a: V(0, 0.95, -0.4), d: lerp(8.2, 6.2, smooth(t / DUR)), phi: 1.3, th: 0.3 - t * 0.04 }),
    },
    {
      h0: 22, h1: 24, title: 'Nacht',
      txt: 'Bij het licht van een vetlampje brengt iemand met rode oker een hert op de rotswand aan en blaast handafdrukken. Daarna slaapt de groep dicht bij elkaar, terwijl het vuur smeult tot de ochtend.',
      fact: 'Oker: rode aarde vol ijzeroxide, gemengd met water of vet. De schilderingen in de Chauvetgrot zijn ruim 30.000 jaar oud.',
      update(t) {
        const [wx, wz] = PLEK.wand;
        W.setPainting(seg(t, 0.4, 8.2));
        W.setLamp(1 - smooth(seg(t, 8.8, 9.6)));
        if (t < 8.5) {
          const b = Math.sin(t * 2.2), c = Math.sin(t * 1.6);
          const reachX = lerp(-0.4, 0.9, seg(t, 0.4, 8.2));
          put('vrouw1', wx + reachX, wz + 0.72, Math.PI, over(POSES.stand, { rSh: 2.15 + 0.2 * b, rShO: 0.15 + 0.2 * c, rEl: 0.35, lSh: 0.3, headX: -0.25 }), { hold: ['brush'] });
        } else if (t < 12) {
          const w = walkPath(t, [wx + 0.9, wz + 0.72], [-2.5, -0.7], 8.6, 11.8);
          put('vrouw1', w.x, w.z, w.yaw, w.pose);
        } else lie('vrouw1', -2.5, -0.7);
        lie('elder', -1.4, -1.6); lie('jager1', 1.6, 1.7); lie('jager2', 2.1, -1.2);
        lie('kind', 0.2, 2.1); lie('vrouw2', -1.7, 1.6); lie('kind2', -1.05, 2.25);
        if (t < 7) put('jager3', 2.3, 0.4, -Math.PI / 2, sitWarm);
        else lie('jager3', 2.9, 0.9);
        W.setFire(lerp(0.6, 0.32, seg(t, 0, DUR)));
      },
      cam: t => {
        const k = smooth(seg(t, 8.2, 11.5));
        return {
          a: V(lerp(PLEK.wand[0] + 0.3, 0, k), lerp(1.55, 0.5, k), lerp(PLEK.wand[1] + 0.8, 0, k)),
          d: lerp(4.6, 9, k), phi: lerp(1.42, 1.12, k), th: lerp(0.35 - t * 0.02, 0.2, k),
        };
      },
    },
  ];

  const ALL = Object.values(A);
  return {
    SCENES,
    update(i, t, T) {
      for (const a of ALL) { a.base.visible = false; a.hold(null); }
      hert.root.visible = false;
      spears.forEach(s => { s.visible = false; });
      flakes.forEach(f => { f.visible = false; });
      pole.visible = false;
      W.setSpit(false); W.setLamp(0);
      if (i !== 6) W.setPainting(0);          // het nieuwe hert wordt pas vannacht geschilderd
      if (i !== 1) W.setBerries(i < 1 ? 1 : 0.3);
      SCENES[i].update(t);
      // mammoeten trekken de hele dag langzaam over de vlakte
      mammoets.forEach((m, k) => m.set(lerp(75, 12, T / (DUR * SCENES.length)) + k * 7, -30 + k * 4 - k * k * 2, -Math.PI / 2 + 0.05 * k, T * 1.1 + k));
    },
  };
}

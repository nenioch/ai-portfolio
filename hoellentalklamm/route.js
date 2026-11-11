'use strict';
/* =============================================================================
   route.js — de wandeling in zeven scènes, in één doorlopende kloof (opzet als
   oermens-dag/dag.js). Elke scène: { h0, h1, alt0, alt1, title, txt, fact,
   update(t), cam(t) }. Alles is een pure functie van de lokale tijd t
   (0..DUR), zodat pauzeren en spoelen werkt. Posities langs het pad gaan in
   meters s langs de kloofas (zie wereld.js).
   ============================================================================= */

const DUR = 13;

function buildRoute(W) {
  const { KL, scene, kassa, anger } = W;
  const A = {
    anna: createMens('anna', 0.97), bram: createMens('bram', 1.04), waard: createMens('waard'),
    gast1: createMens('gast1'), gast2: createMens('gast2', 0.95), gast3: createMens('gast3', 1.02),
  };
  for (const k in A) scene.add(A[k].base);
  const POLES = ['poleL', 'poleR'];
  const tmp = V();

  function put(a, x, y, z, yaw, pose, o = {}) {
    const m = A[a];
    m.place(x, y, z, yaw);
    m.setPose(pose);
    m.hold(o.hold || null);
    m.setHelmet(!!o.helmet);
    m.setLamp(o.lamp || 0);
  }
  function onPath(a, s, yaw, pose, o) { const p = KL.pathAt(s, tmp); put(a, p.x, p.y, p.z, yaw, pose, o); }
  // langs het pad lopen van s0 naar s1 tussen t0 en t1
  function walk(t, s0, s1, t0, t1) {
    const d = travel(t, s1 - s0, t0, t1, 0.6), s = s0 + d;
    const amp = Math.min(1, seg(t, t0, t0 + 0.5) * 3, seg(t, t1, t1 - 0.5) * 3);
    const moving = t > t0 && t < t1;
    return { s, yaw: KL.pathYaw(s), moving, pose: moving ? POSES.walk(d / STRIDE_WALK * TAU, Math.max(0.15, amp)) : POSES.standPoles };
  }
  const turn = (a, b, k) => { let d = b - a; d -= Math.round(d / TAU) * TAU; return a + d * k; };
  const local = (g, x, y, z) => g.localToWorld(V(x, y, z));
  const gorgeYaw = s => Math.atan2(KL.samp(KL.TX, s), KL.samp(KL.TZ, s));       // stroomopwaarts
  // camera: brandpunt op het pad bij s, gezien vanuit richting ang (zie KL.dirTh)
  const camAt = (s, ang, d, phi, dy = 1.3) => { const a = KL.pathAt(s, V()); a.y += dy; return { a, d, phi, th: KL.dirTh(s, ang) }; };
  const seatOf = i => { const st = anger.userData.seats[i]; return { p: anger.localToWorld(st.local.clone()), yaw: st.yaw + anger.rotation.y }; };

  // ---------------------------------------------------------------- scènes
  const SCENES = [
    {
      h0: 8, h1: 8.75, alt0: 760, alt1: 1000, title: 'Hammersbach',
      txt: 'De tocht begint in Hammersbach, een gehucht van Grainau aan de voet van de Zugspitze. Het pad volgt de beek met dezelfde naam het bos in, stroomopwaarts naar de klamm.',
      fact: 'Hoogteverschil: van Hammersbach (ca. 760 m) tot de Höllentalangerhütte (1387 m) is het ruim 600 meter klimmen.',
      update(t) {
        const a = walk(t, 92, 106, 0.4, 12.6), b = walk(t, 90.2, 104.2, 0.7, 12.8);
        onPath('anna', a.s, a.yaw, a.pose, { hold: POLES });
        onPath('bram', b.s, b.yaw, b.pose, { hold: POLES });
      },
      cam: t => camAt(lerp(96, 104, t / DUR), -0.5 + t * 0.03, 11.5, 1.36),
    },
    {
      h0: 8.75, h1: 9, alt0: 1045, alt1: 1045, title: 'Klammeingangshütte',
      txt: 'Bij de ingangshut betaal je toegang. Met dat geld wordt het pad onderhouden, dat elke winter door lawines en ijs beschadigd raakt. Een helm is hier geen overbodige luxe: er kan steen naar beneden komen.',
      fact: 'Seizoen: de klamm is alleen open van ongeveer eind mei tot in oktober, afhankelijk van sneeuw en lawinegevaar.',
      update(t) {
        const hutYaw = kassa.rotation.y + Math.PI;
        const after = t > 10;
        const a = after ? walk(t, 159.6, 165.5, 10, 12.9) : walk(t, 148, 159.6, 0.3, 5);
        const b = after ? walk(t, 158.3, 164, 10.3, 13) : walk(t, 146.5, 158.3, 0.5, 5.4);
        const look = after ? 0 : smooth(seg(t, 5, 5.7));
        const helmOn = t > 8.6;
        const arms = track([[5.6, POSES.standPoles], [6.1, over(POSES.stand, { rSh: 1.25, rEl: 0.35 })], [7.0, over(POSES.stand, { rSh: 1.25, rEl: 0.35 })], [7.5, POSES.stand], [7.8, POSES.helmetOn], [8.8, POSES.helmetOn], [9.4, POSES.standPoles]]);
        const pa = a.moving ? a.pose : (t < 5.6 || after ? POSES.standPoles : arms(t));
        const pb = b.moving ? b.pose : (t < 7.6 || after ? POSES.standPoles : arms(t - 0.3));
        const holdA = t < 7.9 ? ['helm'] : helmOn ? POLES : [];
        onPath('anna', a.s, turn(a.yaw, hutYaw, look), pa, { hold: holdA, helmet: helmOn });
        onPath('bram', b.s, turn(b.yaw, hutYaw, look * 0.8), pb, { hold: t < 8.2 ? ['helm'] : t > 9 ? POLES : [], helmet: t > 8.9 });
        // de kassier achter het luik
        const w = local(kassa, 0, 0.1, 0.45);
        const wp = t > 2.5 && t < 5 ? POSES.wave(t) : t > 6 && t < 7 ? over(POSES.stand, { lSh: 1.2, lEl: 0.3 }) : POSES.stand;
        put('waard', w.x, w.y, w.z, kassa.rotation.y, wp);
      },
      cam: t => camAt(158.6, -0.55 + t * 0.03, 8, 1.3, 1.4),
    },
    {
      h0: 9, h1: 9.25, alt0: 1045, alt1: 1075, title: 'Door de tunnels',
      txt: 'Het pad is uit de rots gehakt en gestraald. Een groot deel loopt door tunnels, met hier en daar een venster naar de kloof. Het druipt van het plafond; een hoofdlamp is handig.',
      fact: 'Aanleg: tussen 1902 en 1905 werd het pad aangelegd; op 15 augustus 1905 ging de klamm open. Van de ongeveer 1 km loopt zo’n 450 m door tien tunnels.',
      update(t) {
        const a = walk(t, 211, 226, 0.5, 12.5), b = walk(t, 209.3, 224.3, 0.8, 12.8);
        onPath('anna', a.s, a.yaw, a.pose, { hold: POLES, helmet: true, lamp: 1 });
        onPath('bram', b.s, b.yaw, b.pose, { hold: POLES, helmet: true, lamp: 1 });
      },
      cam: t => {
        const s = lerp(211, 226, smooth(seg(t, 0.5, 12.5))) + 3.2;
        return camAt(s - 1.5, -Math.PI / 2 + 0.12, 4.2, 1.42, 1.35);
      },
    },
    {
      h0: 9.25, h1: 9.5, alt0: 1075, alt1: 1110, title: 'Het smalste stuk',
      txt: 'Hier staan de wanden soms maar een paar meter uit elkaar en rijzen ze tot 150 meter op. De Hammersbach dondert eronder door; overal stuift nevel en er stromen watervallen langs de wand.',
      fact: 'Gletsjerwater: de beek wordt gevoed door smeltwater van de Höllentalferner, de gletsjer onder de Zugspitze. Daarom is het water zo koud.',
      update(t) {
        const a = walk(t, 276, 283, 0.3, 5.5), b = walk(t, 274.5, 281.4, 0.6, 6);
        onPath('anna', a.s, a.yaw, a.moving ? a.pose : mixPose(POSES.standPoles, POSES.lookUp, smooth(seg(t, 5.8, 6.8))), { hold: POLES, helmet: true });
        const pb = b.moving ? b.pose : track([[6.5, POSES.standPoles], [7.3, POSES.point], [10, POSES.point], [10.8, POSES.lookUp]])(t);
        onPath('bram', b.s, b.yaw + (b.moving ? 0 : 0.35 * smooth(seg(t, 6.5, 7.3))), pb, { hold: b.moving || t < 6.6 ? POLES : ['poleL'], helmet: true });
      },
      cam: t => {
        // het brandpunt stijgt midden in de kloof, de camera blijft laag en kijkt omhoog
        // van voren op de wandelaars; daarna kantelt het beeld langzaam omhoog langs de wanden
        const k = smooth(seg(t, 5.5, 11.5)), s = lerp(278, 282, smooth(seg(t, 0.3, 5.5)));
        const a = KL.world(s, KL.samp(KL.PU, s) * 0.4, KL.samp(KL.PY, s) + lerp(1.5, 4, k));
        return { a, d: lerp(7.5, 6.5, k), phi: lerp(1.48, 1.8, k), th: KL.dirTh(s, -1.3) };
      },
    },
    {
      h0: 9.5, h1: 9.75, alt0: 1110, alt1: 1140, title: 'Over de brug',
      txt: 'Een houten brug voert naar de overkant. Eronder ligt vaak tot ver in de zomer een vuile sneeuwbrug: lawinesneeuw die in de schaduw van de kloof maar langzaam smelt.',
      fact: 'Schaduw: de zon komt maar kort tot op de bodem van de klamm. Ook in hartje zomer blijft het er koel en vochtig.',
      update(t) {
        const down = gorgeYaw(339) + Math.PI;
        const a = t < 10.8 ? walk(t, 328, 339, 0.4, 6.5) : walk(t, 339, 348, 10.8, 13);
        const b = t < 11 ? walk(t, 326.4, 337.3, 0.7, 6.8) : walk(t, 337.3, 346.3, 11, 13);
        const fa = a.moving ? 0 : smooth(seg(t, 6.5, 7.1)) * (1 - smooth(seg(t, 10.2, 10.8)));
        const pa = a.moving ? a.pose : track([[6.6, POSES.standPoles], [7.2, POSES.photo], [10.1, POSES.photo], [10.7, POSES.standPoles]])(t);
        onPath('anna', a.s, turn(a.yaw, down, fa), pa, { hold: t > 6.8 && t < 10.4 ? ['cam'] : POLES, helmet: true });
        const fb = b.moving ? 0 : smooth(seg(t, 6.8, 7.6)) * 0.6;
        onPath('bram', b.s, turn(b.yaw, down, fb), b.moving ? b.pose : mixPose(POSES.standPoles, over(POSES.lookUp, { headX: 0.45, lean: 0.15 }), fb), { hold: POLES, helmet: true });
      },
      cam: t => {
        const a = KL.pathAt(339, V()); a.y += 0.6;
        return { a, d: lerp(11, 9, smooth(t / DUR)), phi: 1.62, th: gorgeYaw(339) + Math.PI + 0.12 * Math.sin(t * 0.25) };
      },
    },
    {
      h0: 9.75, h1: 10.25, alt0: 1150, alt1: 1250, title: 'Uit de klamm',
      txt: 'De wanden wijken en het Höllental opent zich: een breed dal vol puin, omringd door steile kalkwanden van het Wettersteingebergte. In de verte glanst de gletsjer.',
      fact: 'Kalksteen: het Wettersteingebergte bestaat uit kalk die ruim 200 miljoen jaar geleden in een warme, ondiepe zee werd afgezet.',
      update(t) {
        const a = walk(t, 408, 426, 0.4, 12.6), b = walk(t, 406.4, 424.4, 0.7, 12.9);
        onPath('anna', a.s, a.yaw, a.pose, { hold: POLES, helmet: true });
        onPath('bram', b.s, b.yaw, b.pose, { hold: POLES, helmet: true });
      },
      cam: t => {
        const k = smooth(seg(t, 1, 12.5)), s = lerp(408, 426, smooth(seg(t, 0.4, 12.6)));
        return camAt(s + 2, 1.3, lerp(6.5, 10, k), 1.36, lerp(1.6, 2.4, k));
      },
    },
    {
      h0: 10.25, h1: 10.75, alt0: 1387, alt1: 1387, title: 'Höllentalangerhütte',
      txt: 'Na zo’n 1,2 km door het open dal wacht de Höllentalangerhütte. Tijd voor iets warms op het terras. Wie verder wil, klimt over de gletsjer en een klettersteig naar de top van de Zugspitze.',
      fact: 'Zugspitze: met 2962 m de hoogste berg van Duitsland. Vanaf de hut is het nog bijna 1600 hoogtemeters.',
      update(t) {
        const toSeat = (who, s0, s1, t0, i, delay) => {
          const st = seatOf(i), side = local(anger, -5.5, 0.3, 6.0), seat = st.p;
          if (t < t0 + 5.6) { const w = walk(t, s0, s1, t0, t0 + 5.6); onPath(who, w.s, w.yaw, w.pose, { hold: POLES, helmet: true }); return; }
          const P0 = KL.pathAt(s1, V());
          if (t < t0 + 9 + delay) {
            const w = walkPath(t, [P0.x, P0.z], [side.x, side.z], t0 + 5.8, t0 + 9 + delay);
            put(who, w.x, lerp(P0.y, side.y, w.k), w.z, w.yaw, w.pose, { hold: POLES, helmet: true });
            return;
          }
          if (t < t0 + 10.1 + delay) {
            const w = walkPath(t, [side.x, side.z], [seat.x, seat.z], t0 + 9 + delay, t0 + 10 + delay);
            put(who, w.x, seat.y, w.z, turn(w.yaw, st.yaw, smooth(seg(t, t0 + 9.6 + delay, t0 + 10.1 + delay))), w.pose, { helmet: true });
            return;
          }
          const sit = smooth(seg(t, t0 + 10.1 + delay, t0 + 10.8 + delay));
          let pose = mixPose(POSES.standPoles, POSES.sitLog, sit);
          if (who === 'anna') pose = mixPose(pose, POSES.sip, smooth(seg(t, 11.6, 12.2)));
          put(who, seat.x, seat.y, seat.z, st.yaw, pose, { hold: who === 'anna' && t > 11.6 ? ['cup'] : null, helmet: false });
        };
        toSeat('anna', 513, 526, -0.4, 0, 0);
        toSeat('bram', 511.4, 524.6, -0.2, 1, 0.6);
        // gasten op het terras
        const g = (who, i, pose, hold) => { const st = seatOf(i); put(who, st.p.x, st.p.y, st.p.z, st.yaw, pose, { hold }); };
        g('gast1', 3, over(POSES.sitLog, { headY: 0.3 * Math.sin(t * 0.8), rSh: 0.9 + 0.3 * Math.sin(t * 1.7), rEl: 1.0 }));
        g('gast2', 9, POSES.sip, ['cup']);
        g('gast3', 11, over(POSES.sitLog, { headY: -0.4, headX: -0.15 }));
        // de waard brengt iets naar de tafel
        const door = [0, 4.6], stop = [-2.2, 6.9];
        const there = t < 8, w = there ? walkPath(t, door, stop, 1, 4.5) : walkPath(t, stop, door, 8, 11.5);
        const p = local(anger, w.x, 0.3, w.z), yaw = (w.moving ? w.yaw : there ? -Math.PI / 2 : Math.PI) + anger.rotation.y;
        const pose = w.moving ? (there ? over(w.pose, { rSh: 1.2, rEl: 1.1 }) : w.pose) : (there ? over(POSES.stand, { rSh: 1.0, rEl: 0.6 }) : POSES.stand);
        put('waard', p.x, p.y, p.z, yaw, pose, { hold: there && t < 5.5 ? ['cup'] : null });
      },
      cam: t => {
        const k = smooth(t / DUR);
        const a = local(anger, -2, 2.5, 6.5), c = local(anger, lerp(-15, -10, k), 0, lerp(16, 12, k));
        return { a, d: lerp(19, 14, k), phi: 1.3, th: Math.atan2(c.x - a.x, c.z - a.z) };
      },
    },
  ];

  const ALL = Object.values(A);
  return {
    SCENES,
    update(i, t) {
      for (const a of ALL) { a.base.visible = false; a.hold(null); a.setLamp(0); }
      SCENES[i].update(t);
    },
  };
}

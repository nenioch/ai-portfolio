/* Leven in de stad: voorbijgangers op de lanen en dijkwegen, rond het heilige
   plein en tussen de marktkramen; priesters in het zwart die de trappen van de
   Templo Mayor op en af gaan; kano's door de kanalen en over het meer; en
   reigers die boven het water rondcirkelen. */

(function (MC) {
  'use strict';
  if (!window.THREE) return;

  const P = MC.PLAN;
  const TUNIEK = [0xf2ead8, 0xe9dfc8, 0xd9c7a0, 0xf6f1e4, 0xf0e6cf, 0xc8452c, 0x2f8f8a, 0xd9a441, 0x3b6fa8, 0xe8e0cc];
  const HUID = [0xa8714a, 0x8e5c3b, 0xb57f55, 0x9a6640];
  const PRIESTER = 0x26221f;

  // Een pad is een lijst punten [x, y, z]; lus = terug naar het begin.
  function pad(punten, lus) {
    const p = punten.map((q) => new THREE.Vector3(q[0], q[1], q[2]));
    if (lus) p.push(p[0].clone());
    const lengtes = [0];
    for (let i = 1; i < p.length; i++) lengtes.push(lengtes[i - 1] + p[i].distanceTo(p[i - 1]));
    return { p, lengtes, lengte: lengtes[lengtes.length - 1], lus: !!lus };
  }

  const tmp = new THREE.Vector3();
  function opPad(pd, s, uit) {
    let i = 1;
    while (i < pd.lengtes.length - 1 && pd.lengtes[i] < s) i++;
    const a = pd.p[i - 1], b = pd.p[i];
    const l = pd.lengtes[i] - pd.lengtes[i - 1] || 1;
    const t = MC.clamp((s - pd.lengtes[i - 1]) / l, 0, 1);
    uit.copy(a).lerp(b, t);
    return tmp.copy(b).sub(a);         // richting van dit stuk
  }

  // Rechthoek met afgeschuinde hoeken, op hoogte y.
  function rechthoekPad(hx, hz, y, schuin, cx, cz) {
    cx = cx || 0; cz = cz || 0;
    const c = schuin;
    return pad([
      [cx + hx - c, y, cz + hz], [cx - hx + c, y, cz + hz], [cx - hx, y, cz + hz - c], [cx - hx, y, cz - hz + c],
      [cx - hx + c, y, cz - hz], [cx + hx - c, y, cz - hz], [cx + hx, y, cz - hz + c], [cx + hx, y, cz + hz - c]
    ], true);
  }

  // Cirkel (of ellips) op hoogte y.
  function rondPad(rx, rz, y, cx, cz, n) {
    const pts = [];
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz]);
    }
    return pad(pts, true);
  }

  MC.maakLeven = function () {
    const S = MC.S;
    const r = MC.rng(77);
    const PY = P.PY, DY = P.DY, PLY = P.PLY;

    // ------------------------------------------------------------- wandelaars
    const wegen = [];
    for (const [n, tot, gewicht] of [[[0, -1], P.EIND, 50], [[0, 1], P.EIND, 50], [[-1, 0], P.EIND, 50], [[1, 0], P.RAND + 1.5, 25]]) {
      const pts = [];
      for (let d = P.R + 0.5; d <= tot; d += 1) pts.push([n[0] * d, DY, n[1] * d]);
      wegen.push({ pd: pad(pts, false), gewicht, breed: 1.4 });
    }
    // rond het heilige plein, binnen de slangenmuur
    wegen.push({ pd: rechthoekPad(11.75, 11.75, PY, 0.8), gewicht: 50, breed: 0.4, lus: true });
    // van de zuidpoort langs de tempel naar de noordpoort, en van de westpoort om Ehecatl heen
    wegen.push({ pd: pad([[0, PY, 12.4], [-1.1, PY, 6.6], [-1.1, PY, -6.0], [0, PY, -12.4]], false), gewicht: 18, breed: 0.5 });
    wegen.push({ pd: pad([[-12.4, PY, 0], [-7.3, PY, 0], [-7.3, PY, 3.0], [-1.1, PY, 3.0]], false), gewicht: 12, breed: 0.4 });
    wegen.push({ pd: pad([[-12.4, PY, 0.3], [-7.3, PY, -0.3], [-7.3, PY, -3.0], [-1.1, PY, -3.0], [-1.1, PY, -5.0]], false), gewicht: 10, breed: 0.4 });
    // markten
    const markt = MC.blokRect(-1, 1, 0, 1);
    wegen.push({ pd: rechthoekPad(4.6, 4.6, PLY, 0.6, markt.cx, markt.cz), gewicht: 30, breed: 0.6, lus: true });
    wegen.push({ pd: rechthoekPad(2.3, 3.2, PLY, 0.4, markt.cx, markt.cz), gewicht: 16, breed: 0.5, lus: true });
    const T = MC.TLATELOLCO.markt;
    const tcx = (T.x0 + T.x1) / 2, tcz = (T.z0 + T.z1) / 2;
    wegen.push({ pd: rechthoekPad((T.x1 - T.x0) / 2, (T.z1 - T.z0) / 2, PLY, 0.6, tcx, tcz), gewicht: 40, breed: 0.5, lus: true });
    for (const dz of [-3.15, -1.05, 1.05, 3.15]) {
      wegen.push({ pd: pad([[T.x0 + 0.4, PLY, tcz + dz], [T.x1 - 0.4, PLY, tcz + dz]], false), gewicht: 12, breed: 0.3 });
    }
    // de binnenplaatsen van het paleis van Moctezuma
    const mo = MC.blokRect(1, 1, 0, 1);
    wegen.push({ pd: rechthoekPad(1.4, 1.2, PLY, 0.3, mo.cx, mo.cz - 1.4), gewicht: 8, breed: 0.3, lus: true });

    const mensen = [];
    function mens(w, s, kleur) {
      const i = S.lijf.add(0, -10, 0, 0, 1, kleur);
      S.hoofd.add(0, -10, 0, 0, 1, HUID[Math.floor(r() * HUID.length)]);
      mensen.push({ i, w, s, dir: r() < 0.5 ? 1 : -1, v: 0.35 + r() * 0.3, zij: (r() - 0.5) * w.breed, fase: r() * 9, rust: 0 });
    }
    for (const w of wegen) {
      for (let k = 0; k < w.gewicht; k++) {
        const u = r();
        const s = w.lus ? u * w.pd.lengte : Math.pow(u, 1.6) * w.pd.lengte;   // drukker bij de stad
        mens(w, s, r() < 0.06 ? PRIESTER : TUNIEK[Math.floor(r() * TUNIEK.length)]);
      }
    }

    // priesters op de trappen van de Templo Mayor
    const TM = MC.TM;
    for (const lx of [-1.2, 1.2]) {
      const pts = [[-0.35, 0, 7.6], [-0.35, 0.37, 6.8], [0, 0.37, 5.95], [0, 4.37, 2.55], [0, 4.37, 1.9], [0.55, 4.37, 1.9]].map(function ([dx, y, lz]) {
        const [x, z] = MC.lokaal(TM.x, TM.z, TM.ry, lx + dx * Math.sign(lx), lz);
        return [x, PY + y, z];
      });
      const w = { pd: pad(pts, false), breed: 0.9 };
      for (let k = 0; k < 4; k++) mens(w, r() * w.pd.lengte, PRIESTER);
    }

    // ----------------------------------------------------------------- kano's
    // Rooster van knooppunten op de kruisingen van de hoofdkanalen.
    const L = [];
    for (const k of P.KANALEN) { L.push(k); L.push(-k); }
    L.sort((a, b) => a - b);
    const TL = MC.TLATELOLCO;
    function dicht(x, z) {
      return x > TL.x0 && x < TL.x1 && z > TL.z0 && z < TL.z1;
    }
    function buren(a, b) {
      const uit = [];
      for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const na = a + da, nb = b + db;
        if (na < 0 || nb < 0 || na >= L.length || nb >= L.length) continue;
        if (Math.sign(L[na]) !== Math.sign(L[a]) || Math.sign(L[nb]) !== Math.sign(L[b])) continue;
        if (dicht((L[a] + L[na]) / 2, (L[b] + L[nb]) / 2)) continue;
        uit.push([na, nb]);
      }
      return uit;
    }
    const knopen = [];
    for (let a = 0; a < L.length; a++) for (let b = 0; b < L.length; b++) if (!dicht(L[a], L[b])) knopen.push([a, b]);

    const kanos = [];
    for (let k = 0; k < 120; k++) {
      const serie = r() < 0.5 ? S.kanoVol : S.kano;
      const i = serie.add(0, -10, 0, 0, 1, 0xffffff);
      const [a, b] = knopen[Math.floor(r() * knopen.length)];
      kanos.push({ serie, i, a, b, na: a, nb: b, t: 1, v: 0.5 + r() * 0.35, da: 0, db: 0, hoek: 0 });
    }
    function volgende(kn) {
      kn.a = kn.na; kn.b = kn.nb;
      const opties = buren(kn.a, kn.b);
      if (!opties.length) return;
      const recht = opties.find(([x, y]) => x - kn.a === kn.da && y - kn.b === kn.db);
      const niet = opties.filter(([x, y]) => !(x - kn.a === -kn.da && y - kn.b === -kn.db));
      const keuze = recht && r() < 0.6 ? recht : (niet.length ? niet : opties)[Math.floor(r() * (niet.length || opties.length))];
      kn.da = keuze[0] - kn.a; kn.db = keuze[1] - kn.b;
      kn.na = keuze[0]; kn.nb = keuze[1];
      kn.t = 0;
    }

    // kano's op het open meer: ellipsen rond de stad
    const meerKanos = [];
    for (let k = 0; k < 60; k++) {
      const rr = P.RAND + 5 + r() * (P.MEER - P.RAND - 20);
      const pd = rondPad(rr * (1 + r() * 0.15), rr, 0.02, 0, 0, 64);
      const serie = r() < 0.6 ? S.kanoVol : S.kano;
      meerKanos.push({ serie, i: serie.add(0, -10, 0, 0, 1, 0xffffff), pd, s: r() * pd.lengte, dir: r() < 0.5 ? 1 : -1, v: 0.6 + r() * 0.4, zij: 0 });
    }
    // de ring rond het heilige plein
    const ringPad = rechthoekPad(13.8, 13.8, 0.02, 1.0);
    for (let k = 0; k < 10; k++) {
      const serie = r() < 0.5 ? S.kanoVol : S.kano;
      meerKanos.push({ serie, i: serie.add(0, -10, 0, 0, 1, 0xffffff), pd: ringPad, s: r() * ringPad.lengte, dir: r() < 0.5 ? 1 : -1, v: 0.4 + r() * 0.3, zij: (r() - 0.5) * 0.7 });
    }

    // ----------------------------------------------------------------- reigers
    const vogels = [];
    for (let k = 0; k < 22; k++) {
      const i = S.vogel.add(0, -10, 0, 0, 1, 0xffffff);
      const groep = k % 3;
      const c = [[-20, -8], [40, 30], [-60, 50]][groep];
      vogels.push({ i, cx: c[0] + (r() - 0.5) * 8, cz: c[1] + (r() - 0.5) * 8, rr: 14 + r() * 18, h: 9 + r() * 8, w: (0.12 + r() * 0.08) * (r() < 0.5 ? 1 : -1), a: r() * 7 });
    }

    // ------------------------------------------------------------------ update
    const pos = new THREE.Vector3();

    function volgPad(o, pd, dt) {
      o.s += o.dir * o.v * dt;
      if (pd.lus) o.s = ((o.s % pd.lengte) + pd.lengte) % pd.lengte;
      else if (o.s > pd.lengte || o.s < 0) { o.dir *= -1; o.s = MC.clamp(o.s, 0, pd.lengte); }
      const rv = opPad(pd, o.s, pos);
      rv.y = 0;
      rv.normalize().multiplyScalar(o.dir);
      // zijwaartse verschuiving: iedereen houdt een eigen baan aan
      pos.x += -rv.z * o.zij;
      pos.z += rv.x * o.zij;
      return rv;
    }

    return {
      update: function (dt, tijd) {
        for (const m of mensen) {
          if (m.rust > 0) m.rust -= dt;
          else if (r() < dt * 0.02) m.rust = 1 + r() * 3;
          const stap = m.rust > 0 ? 0 : dt;
          const rv = volgPad(m, m.w.pd, stap);
          const ry = Math.atan2(rv.x, rv.z);
          const hup = m.rust > 0 ? 0 : Math.abs(Math.sin(tijd * 9 + m.fase)) * 0.012;
          S.lijf.zet(m.i, pos.x, pos.y + hup, pos.z, ry, 1);
          S.hoofd.zet(m.i, pos.x, pos.y + hup, pos.z, ry, 1);
        }
        for (const kn of kanos) {
          const lx = MC.lerp(L[kn.a], L[kn.na], kn.t), lz = MC.lerp(L[kn.b], L[kn.nb], kn.t);
          const lengte = Math.abs(L[kn.na] - L[kn.a]) + Math.abs(L[kn.nb] - L[kn.b]) || 1;
          kn.t += dt * kn.v / lengte;
          if (kn.t >= 1) volgende(kn);
          const dx = L[kn.nb] === L[kn.b] ? Math.sign(L[kn.na] - L[kn.a]) : 0;
          const dz = L[kn.na] === L[kn.a] ? Math.sign(L[kn.nb] - L[kn.b]) : 0;
          if (dx || dz) {
            const doel = Math.atan2(-dz, dx);
            let d = doel - kn.hoek;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            kn.hoek += d * Math.min(1, dt * 3);
          }
          // rechts houden
          const x = lx - dz * 0.3, z = lz + dx * 0.3;
          kn.serie.zet(kn.i, x, 0.03 + Math.sin(tijd * 1.7 + kn.i) * 0.01, z, kn.hoek, 1);
        }
        for (const g of meerKanos) {
          const rv = volgPad(g, g.pd, dt);
          g.serie.zet(g.i, pos.x, pos.y + Math.sin(tijd * 1.3 + g.i) * 0.012, pos.z, Math.atan2(-rv.z, rv.x), 1);
        }
        for (const v of vogels) {
          v.a += v.w * dt;
          const x = v.cx + Math.cos(v.a) * v.rr, z = v.cz + Math.sin(v.a) * v.rr;
          // raaklijn van de cirkel; voorkant van de vogel is +x
          const tx = -Math.sin(v.a) * Math.sign(v.w), tz = Math.cos(v.a) * Math.sign(v.w);
          S.vogel.zet(v.i, x, v.h + Math.sin(tijd * 0.7 + v.a) * 0.6, z, Math.atan2(-tz, tx), 1);
        }
        S.lijf.klaar(); S.hoofd.klaar(); S.kano.klaar(); S.kanoVol.klaar(); S.vogel.klaar();
      }
    };
  };
})(window.MC);

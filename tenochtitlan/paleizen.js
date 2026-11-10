/* De blokken rond het heilige plein die geen gewone wijk zijn: het nieuwe
   paleis van Moctezuma, het paleis van Axayácatl, het vogelhuis met zijn
   vijvers, het grote plein met de markt, en in het noorden de zusterstad
   Tlatelolco met haar tempel en de grootste markt van het dal. */

(function (MC) {
  'use strict';
  if (!window.THREE) return;

  const K = MC.KLEUR;
  const P = MC.PLAN;
  const PLY = P.PLY;

  // Stenen platform onder een heel blok (of een paar samengevoegde blokken).
  function platform(b, x0, x1, z0, z1) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    b.doos('steen', 0xffffff, cx, -0.6, cz, w, PLY + 0.57, d, { tegel: 1.2 });
    b.doos('plein', 0xffffff, cx, PLY - 0.03, cz, w - 0.06, 0.03, d - 0.06, { tegel: 2.4 });
  }

  /* Paleis in lokale coördinaten (voorkant +z): vier vleugels rond een grote
     binnenplaats, een dwarsvleugel die er twee hoven van maakt, een zuilengang
     bij de ingang en tuinen met een vijver. Geeft de plekken voor bomen terug. */
  function paleis(b, W, D, verd) {
    const vd = 1.7, h = verd * 0.85, gat = 1.6;
    const vleugels = [
      [0, -(D / 2 - vd / 2), W, vd],
      [-(W / 2 - vd / 2), 0, vd, D - 2 * vd],
      [W / 2 - vd / 2, 0, vd, D - 2 * vd]
    ];
    const fw = (W - gat) / 2;
    for (const s of [-1, 1]) vleugels.push([s * (gat / 2 + fw / 2), D / 2 - vd / 2, fw, vd]);
    // dwarsvleugel met een doorgang in het midden
    const zDw = -0.9, dw = (W - 2 * vd - 1.0) / 2;
    for (const s of [-1, 1]) vleugels.push([s * (0.5 + dw / 2), zDw, dw, 1.1]);

    for (const [x, z, w, d] of vleugels) {
      b.doos('stuc', K.stuc, x, 0, z, w, h, d, { tegel: 1 });
      b.doos('vlak', K.rood, x, 0, z, w + 0.03, 0.14, d + 0.03);
      if (verd > 1) b.doos('stuc', K.stucD, x, 0.85, z, w + 0.04, 0.06, d + 0.04);
      MC.meanderBand(b, x, h - 0.2, z, w + 0.03, d + 0.03, 0.2);
      b.doos('stuc', K.stucD, x, h, z, w + 0.08, 0.06, d + 0.08);
    }
    // latei boven de ingang en kantelen langs de buitenranden
    b.doos('stuc', K.stuc, 0, h - 0.4, D / 2 - vd / 2, gat, 0.4, vd);
    MC.meanderBand(b, 0, h - 0.2, D / 2 - vd / 2, gat + 0.03, vd + 0.03, 0.2);
    MC.kantelen(b, -W / 2, W / 2, h + 0.06, D / 2 - 0.02, 0.5);
    MC.kantelen(b, -W / 2, W / 2, h + 0.06, -D / 2 + 0.02, 0.5);
    b.push(0, 0, 0, Math.PI / 2);
    MC.kantelen(b, -D / 2, D / 2, h + 0.06, W / 2 - 0.02, 0.5);
    MC.kantelen(b, -D / 2, D / 2, h + 0.06, -W / 2 + 0.02, 0.5);
    b.pop();
    // ramen in elke verdieping aan de buitenkant
    for (let v = 0; v < verd; v++) {
      const y = 0.3 + v * 0.85;
      for (let t = -W / 2 + 0.6; t < W / 2 - 0.4; t += 0.75) {
        if (Math.abs(t) > gat / 2 + 0.2) b.doos('raam', K.raam, t, y, D / 2 + 0.015, 0.2, 0.26, 0.02);
        b.doos('raam', K.raam, t, y, -D / 2 - 0.015, 0.2, 0.26, 0.02);
      }
      for (let t = -D / 2 + 0.6; t < D / 2 - 0.4; t += 0.75) {
        b.doos('raam', K.raam, W / 2 + 0.015, y, t, 0.02, 0.26, 0.2);
        b.doos('raam', K.raam, -W / 2 - 0.015, y, t, 0.02, 0.26, 0.2);
      }
    }
    // zuilengang voor de ingang
    for (let k = 0; k < 6; k++) b.cil('stuc', K.stuc, -2.0 + k * 0.8, 0, D / 2 + 0.4, 0.08, 0.09, 1.2, 8);
    b.doos('stuc', K.stucD, 0, 1.2, D / 2 + 0.3, 4.6, 0.1, 0.8);
    b.doos('vlak', K.rood, 0, 1.3, D / 2 + 0.3, 4.6, 0.06, 0.8);
    // tuinen: gras, een vijver en paden
    const zVoor = (zDw + 0.55 + D / 2 - vd) / 2, dVoor = D / 2 - vd - (zDw + 0.55);
    const zAchter = (zDw - 0.55 - (D / 2 - vd)) / 2, dAchter = (zDw - 0.55) + (D / 2 - vd);
    const wb = W - 2 * vd;
    b.doos('vlak', 0x6f8f45, 0, 0, zVoor, wb - 0.4, 0.04, dVoor - 0.4);
    b.doos('vlak', 0x6a8a42, 0, 0, zAchter, wb - 0.4, 0.04, dAchter - 0.4);
    b.doos('plein', 0xffffff, 0, 0.005, zVoor, 0.6, 0.04, dVoor, { tegel: 1.2 });
    b.doos('stuc', K.stuc, 0, 0, zAchter, 2.6, 0.12, 1.6);
    b.doos('kanaal', 0xffffff, 0, 0.02, zAchter, 2.3, 0.12, 1.3);
    // plantjes op de daken
    const bomen = [];
    for (const s of [-1, 1]) {
      bomen.push([s * (wb / 2 - 0.7), zVoor - dVoor / 4]);
      bomen.push([s * (wb / 2 - 0.7), zVoor + dVoor / 4]);
      bomen.push([s * (wb / 2 - 0.6), zAchter]);
      for (let k = 0; k < 3; k++) b.bol('blad', 0x6a9444, s * (W / 2 - 0.85), h + 0.1, -D / 2 + 1.5 + k * 2.6, 0.18, 0.14, 0.18, 6, 4);
    }
    return { bomen, h, zVoor, zAchter };
  }

  function zetBomen(cx, cz, ry, y, lijst, serie, r) {
    for (const [lx, lz] of lijst) {
      const [x, z] = MC.lokaal(cx, cz, ry, lx, lz);
      serie.add(x, y, z, r() * 6, 0.9 + r() * 0.3);
    }
  }

  MC.bouwPaleizen = function (stad, wereld) {
    const S = MC.S;
    const r = MC.rng(1502);

    // --------------------------------------------- paleis van Moctezuma
    {
      const q = MC.blokRect(1, 1, 0, 1);
      const b = new MC.Bouwer();
      platform(b, q.x0, q.x1, q.z0, q.z1);
      const ry = Math.PI;               // voorkant naar het noorden, naar het heilige plein
      b.push(q.cx, PLY, q.cz, ry);
      const p = paleis(b, 10.2, 9.6, 2);
      b.pop();
      stad.add(b.mesh('Paleis van Moctezuma'));
      zetBomen(q.cx, q.cz, ry, PLY, p.bomen, S.wilg, r);
    }

    // ---------------------------------------------- paleis van Axayácatl
    {
      const q = MC.blokRect(-1, 1, 1, 0);
      const b = new MC.Bouwer();
      platform(b, q.x0, q.x1, q.z0, q.z1);
      const ry = MC.draaiNaar(1, 0);    // voorkant naar het oosten
      b.push(q.cx, PLY, q.cz, ry);
      const p = paleis(b, 9.8, 9.8, 1);
      b.pop();
      stad.add(b.mesh('Paleis van Axayácatl'));
      zetBomen(q.cx, q.cz, ry, PLY, p.bomen, S.wilg, r);
    }

    // ------------------------------------------------------- vogelhuis
    {
      const q = MC.blokRect(-1, -1, 1, 0);
      const b = new MC.Bouwer();
      platform(b, q.x0, q.x1, q.z0, q.z1);
      // galerij aan de noordkant
      b.push(q.cx, PLY, q.z0 + 1.0, 0);
      b.doos('stuc', K.stuc, 0, 0, -0.3, 10.2, 0.85, 1.0, { tegel: 1 });
      b.doos('vlak', K.rood, 0, 0, -0.3, 10.24, 0.12, 1.04);
      for (let k = 0; k < 13; k++) b.cil('stuc', K.stuc, -4.8 + k * 0.8, 0, 0.4, 0.07, 0.08, 0.85, 8);
      b.doos('stuc', K.stucD, 0, 0.85, 0.05, 10.3, 0.08, 1.7);
      MC.meanderBand(b, 0, 0.93, 0.05, 10.3, 1.7, 0.16);
      b.pop();
      // vijvers voor de watervogels
      for (const [x, z, w, d] of [[-2.8, 1.0, 3.6, 2.6], [2.6, 0.6, 2.8, 3.2], [-0.4, 3.9, 6.4, 1.6]]) {
        b.doos('stuc', K.stuc, q.cx + x, PLY, q.cz + z, w + 0.3, 0.1, d + 0.3);
        b.doos('kanaal', 0xffffff, q.cx + x, PLY + 0.02, q.cz + z, w, 0.1, d);
      }
      // twee volières van houten latten
      for (const [x, z] of [[-3.0, -2.4], [2.8, -2.6]]) {
        const cx = q.cx + x, cz = q.cz + z;
        b.doos('vlak', 0x6f8f45, cx, PLY, cz, 2.2, 0.03, 1.7);
        for (let k = 0; k <= 5; k++) {
          for (const e of [-0.85, 0.85]) b.doos('vlak', K.hout, cx - 1.1 + k * 0.44, PLY, cz + e, 0.04, 1.3, 0.04);
        }
        for (let k = 0; k <= 4; k++) for (const e of [-1.1, 1.1]) b.doos('vlak', K.hout, cx + e, PLY, cz - 0.85 + k * 0.425, 0.04, 1.3, 0.04);
        for (let k = 0; k <= 6; k++) b.doos('vlak', K.houtD, cx - 1.1 + k * 0.367, PLY + 1.3, cz, 0.03, 0.03, 1.74);
        for (let k = 0; k <= 4; k++) b.doos('vlak', K.houtD, cx, PLY + 1.3, cz - 0.85 + k * 0.425, 2.24, 0.03, 0.03);
        for (let k = 0; k < 5; k++) b.bol('vlak', [0xd8443a, 0x2f8f8a, 0xe0b040, 0x3b6fa8, 0x4f9a3f][k], cx - 0.6 + k * 0.3, PLY + 0.5 + (k % 2) * 0.3, cz, 0.06, 0.05, 0.05, 6, 4);
      }
      stad.add(b.mesh('Vogelhuis van Moctezuma'));
      for (const [x, z] of [[-4.6, 3.6], [4.5, 3.5], [0.3, -0.4], [-0.6, 1.9], [4.6, -1.0], [-4.6, -0.5]]) {
        S.ahuehuete.add(q.cx + x, PLY, q.cz + z, r() * 6, 0.85 + r() * 0.3);
      }
      for (let k = 0; k < 120; k++) {
        const x = q.cx + (r() - 0.5) * 10, z = q.cz + 5.15 + (r() - 0.5) * 0.4;
        S.bloem.add(x, PLY, z, 0, 0.9, [0xf29a1d, 0xf4c430, 0xc0407a, 0xe8702a][k % 4]);
      }
    }

    // ---------------------------------------------- plein met markt
    {
      const q = MC.blokRect(-1, 1, 0, 1);
      const b = new MC.Bouwer();
      platform(b, q.x0, q.x1, q.z0, q.z1);
      // fontein in het midden, gevoed door het aquaduct
      b.cil('stuc', K.stuc, q.cx, PLY, q.cz, 0.9, 0.95, 0.3, 16);
      b.cil('kanaal', 0xffffff, q.cx, PLY + 0.1, q.cz, 0.78, 0.78, 0.22, 16);
      b.cil('stuc', K.stuc, q.cx, PLY, q.cz, 0.12, 0.15, 0.7, 8);
      stad.add(b.mesh('Plein en markt'));
      const kleuren = [0xc8452c, 0xf0e6cf, 0xe0b53a, 0x2f8f8a, 0x3b6fa8, 0xd9a441, 0xa8392b];
      for (let a = 0; a < 6; a++) {
        for (let c = 0; c < 5; c++) {
          const x = q.x0 + 1.3 + a * 1.68, z = q.z0 + 1.3 + c * 2.1;
          if (Math.abs(x - q.cx) < 1.4 && Math.abs(z - q.cz) < 1.4) continue;
          S.kraam.add(x, PLY, z, (r() - 0.5) * 0.3 + (c % 2) * Math.PI, 1.1, kleuren[(a + c * 2) % kleuren.length]);
        }
      }
    }

    // ------------------------------------------------------- Tlatelolco
    {
      const a = MC.blokRect(-1, -1, 1, 3), c = MC.blokRect(-1, -1, 0, 3);
      const x0 = a.x0, x1 = c.x1, z0 = a.z0, z1 = a.z1, cz = (z0 + z1) / 2;
      MC.TLATELOLCO = { x0, x1, z0, z1 };
      const b = new MC.Bouwer();
      platform(b, x0, x1, z0, z1);
      // zuilengangen langs de markt
      const mx = x0 + 6.3;
      for (const zr of [z0 + 0.6, z1 - 0.6]) {
        const zi = zr < cz ? 1 : -1;
        b.doos('stuc', K.stuc, mx, PLY, zr - zi * 0.15, 12.2, 0.8, 0.5, { tegel: 1 });
        for (let k = 0; k < 16; k++) b.cil('stuc', K.stuc, x0 + 0.6 + k * 0.78, PLY, zr + zi * 0.45, 0.06, 0.07, 0.8, 8);
        b.doos('stuc', K.stucD, mx, PLY + 0.8, zr + zi * 0.1, 12.3, 0.08, 1.2);
        b.doos('vlak', K.rood, mx, PLY + 0.88, zr + zi * 0.1, 12.3, 0.05, 1.2);
      }
      stad.add(b.mesh('Markt van Tlatelolco'));

      // de tempel: een kleinere tweelingpiramide
      const tb = new MC.Bouwer();
      const tx = x1 - 4.4, ry = MC.draaiNaar(-1, 0), s = 0.68;
      tb.push(tx, PLY, cz, ry, s);
      const t = MC.templo(tb);
      tb.pop();
      stad.add(tb.mesh('Tempel van Tlatelolco'));
      const [lx, lz] = MC.lokaal(tx, cz, ry, 0, 1.65 * s);
      const lamp = new THREE.PointLight(0xff9a40, 0, 12, 2);
      lamp.position.set(lx, PLY + (t.top + 0.5) * s, lz);
      stad.add(lamp);
      wereld.lampen.push(lamp);

      // de marktkramen in straten, per soort waar
      const kleuren = [0xc8452c, 0xf0e6cf, 0xe0b53a, 0x2f8f8a, 0x3b6fa8, 0xd9a441, 0x7a5a3a];
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 4; j++) {
          const x = x0 + 1.2 + i * 1.5, z = z0 + 2.4 + j * 2.1;
          S.kraam.add(x, PLY, z, (j % 2) * Math.PI + (r() - 0.5) * 0.2, 1.1, kleuren[(i + j) % kleuren.length]);
        }
      }
      MC.TLATELOLCO.markt = { x0: x0 + 0.4, x1: x0 + 12.6, z0: z0 + 1.4, z1: z1 - 1.4 };
    }
  };
})(window.MC);

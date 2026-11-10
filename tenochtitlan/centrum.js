/* Het heilige plein in het hart van de stad, omringd door de coatepantli, de
   slangenmuur met kantelen en stenen slangenkoppen. Aan de oostkant de Templo
   Mayor: vier getrapte lagen, twee trappen en bovenop de heiligdommen van
   Huitzilopochtli (rood, zuid) en Tlaloc (blauw, noord). Ervoor de ronde
   tempel van Ehecatl, verder het balspelveld, het schedelrek, de zonnesteen,
   het Huis van de Adelaars, de tempel van Tezcatlipoca en de priesterschool. */

(function (MC) {
  'use strict';
  if (!window.THREE) return;

  const K = MC.KLEUR;
  const P = MC.PLAN;
  const PY = P.PY;
  const R = P.R;                  // hartlijn van de slangenmuur
  const POORT = 1.9;              // halve breedte van een doorgang in de muur
  const TM = { x: 6.5, z: 0 };    // midden van de Templo Mayor
  MC.TM = TM;

  /* De Templo Mayor in lokale coördinaten: voorkant (de trappen) naar +z,
     Huitzilopochtli op +x, Tlaloc op -x. Geeft de hoogte van de top en de
     plekken van de vuren terug. */
  MC.templo = function (b) {
    // basisplatform met een kleine trede rondom
    b.doos('steen', 0xffffff, 0, 0, 1.0, 11.2, 0.35, 12.0, { tegel: 1.2 });
    b.doos('stuc', K.stucD, 0, 0.33, 1.0, 11.0, 0.04, 11.8, { tegel: 2 });
    const y0 = 0.37;
    for (let k = 0; k < 4; k++) {
      const w = 9.4 - k, d = 8.4 - k;
      b.talud('stuc', K.stuc, 0, y0 + k, 0, w, d, w - 0.3, d - 0.3, 0.92, { tegel: 1.5 });
      b.doos('stuc', K.stucD, 0, y0 + k + 0.92, 0, w - 0.18, 0.08, d - 0.18);
      // een rode en een blauwe band: de twee helften van de berg
      b.doos('vlak', K.rood, (w - 0.22) / 4, y0 + k + 0.8, 0, (w - 0.22) / 2, 0.06, d - 0.22);
      b.doos('vlak', K.blauw, -(w - 0.22) / 4, y0 + k + 0.8, 0, (w - 0.22) / 2, 0.06, d - 0.22);
    }
    const yT = y0 + 4;
    b.doos('plein', 0xffffff, 0, yT - 0.02, 0, 6.0, 0.04, 5.0, { tegel: 1.5 });

    // twee trappen met balustrades; bovenaan de knik naar steilere blokken
    const zTop = 2.55, run = 3.4;
    for (const sx of [-1.2, 1.2]) MC.trap(b, 'stuc', K.stuc, sx, y0, zTop, 1.75, 4, run, { kleur2: K.stucD, tegel: 1.2 });
    const hoek = Math.atan2(4, run), lang = Math.hypot(4, run);
    for (const [x, w] of [[-2.3, 0.4], [0, 0.6], [2.3, 0.4]]) {
      b.doos('stuc', K.stuc, x, y0 + 2 + 0.12, zTop + run / 2, w, 0.3, lang, { rx: hoek, midden: true });
      // blok bovenaan in de kleur van de god aan die kant
      if (x === 0) {
        b.doos('vlak', K.rood, 0.15, yT - 0.35, zTop + 0.35, 0.3, 0.85, 0.7);
        b.doos('vlak', K.blauw, -0.15, yT - 0.35, zTop + 0.35, 0.3, 0.85, 0.7);
      } else {
        b.doos('vlak', x > 0 ? K.rood : K.blauw, x, yT - 0.35, zTop + 0.35, w, 0.85, 0.7);
      }
      // slangenkop aan de voet
      b.doos('stuc', K.oker, x, y0, zTop + run + 0.12, w + 0.1, 0.32, 0.5);
      b.doos('vlak', K.rood, x, y0 + 0.04, zTop + run + 0.38, w * 0.6, 0.05, 0.04);
      for (const s of [-1, 1]) b.bol('vlak', 0xf4f0e6, x + s * w * 0.3, y0 + 0.26, zTop + run + 0.3, 0.05, 0.05, 0.05, 6, 4);
    }

    // de twee heiligdommen
    function heiligdom(x, tlaloc) {
      const kleur = tlaloc ? K.blauw : K.rood;
      const z = -0.6;
      b.doos('stuc', K.stuc, x, yT, z, 2.5, 0.2, 2.9);
      b.doos('vlak', kleur, x, yT + 0.2, z, 2.2, 1.3, 2.4);
      if (tlaloc) {
        for (let k = 0; k < 6; k++) b.doos('stuc', K.stuc, x - 0.95 + k * 0.38, yT + 0.2, z + 1.215, 0.16, 1.3, 0.03);
      } else {
        for (let k = 0; k < 8; k++) b.bol('vlak', 0xf4f0e6, x - 0.88 + k * 0.25, yT + 1.32, z + 1.22, 0.07, 0.08, 0.04, 6, 4);
      }
      b.doos('raam', K.raam, x, yT + 0.2, z + 1.22, 0.72, 0.9, 0.04);
      b.doos('stuc', K.stuc, x, yT + 1.5, z, 2.36, 0.08, 2.56);
      // hoog, taps toelopend dak
      const yd = yT + 1.58;
      if (tlaloc) {
        for (let k = 0; k < 4; k++) {
          const f0 = 1 - k * 0.09, f1 = 1 - (k + 1) * 0.09;
          b.talud('vlak', k % 2 ? K.stuc : K.blauw, x, yd + k * 0.28, z, 2.2 * f0, 2.4 * f0, 2.2 * f1, 2.4 * f1, 0.28);
        }
      } else {
        b.talud('vlak', K.roodD, x, yd, z, 2.2, 2.4, 1.43, 1.56, 1.12);
        for (let k = 0; k < 5; k++) b.bol('vlak', 0xf4f0e6, x - 0.6 + k * 0.3, yd + 0.55, z + 1.0, 0.06, 0.06, 0.04, 6, 4);
      }
      const yk = yd + 1.12;
      for (let k = 0; k < 5; k++) {
        const xk = x - 0.6 + k * 0.3;
        if (tlaloc) {
          b.cil('vlak', K.stuc, xk, yk + 0.12, z + 0.5, 0.12, 0.12, 0.06, 10, { rx: Math.PI / 2 });
          b.cil('vlak', K.blauw, xk, yk + 0.12, z + 0.54, 0.05, 0.05, 0.02, 8, { rx: Math.PI / 2 });
        } else {
          b.doos('stuc', K.stuc, xk, yk, z + 0.5, 0.16, 0.36, 0.08);
          b.doos('vlak', K.rood, xk, yk + 0.18, z + 0.545, 0.07, 0.07, 0.02);
        }
      }
      for (const s of [-0.75, 0.75]) MC.vuurschaal(b, x + s, yT, 1.65, 1.1);
    }
    heiligdom(1.45, false);
    heiligdom(-1.45, true);
    // chac-mool voor Tlaloc, offersteen voor Huitzilopochtli
    b.doos('stuc', 0xb8ad98, -1.45, yT, 1.0, 0.3, 0.12, 0.55);
    b.doos('stuc', 0xb8ad98, -1.45, yT + 0.12, 0.82, 0.22, 0.2, 0.14);
    b.doos('stuc', 0x6a6058, 1.45, yT, 1.0, 0.3, 0.32, 0.25);
    // de maangodin Coyolxauhqui als ronde steen aan de voet van de rode trap
    b.cil('vlak', 0xc9a07a, 1.2, 0.35, 6.4, 0.6, 0.6, 0.05, 20);
    b.cil('vlak', K.rood, 1.2, 0.36, 6.4, 0.3, 0.3, 0.05, 16);

    return { top: yT, vuren: [[1.45, yT + 0.5, 1.65], [-1.45, yT + 0.5, 1.65]] };
  };

  MC.bouwCentrum = function (stad, wereld) {
    const S = MC.S;
    const r = MC.rng(1325);

    // ------------------------------------------------------------ het plein
    const plein = new MC.Bouwer();
    const H = R + 0.7;
    plein.doos('steen', 0xffffff, 0, -0.7, 0, 2 * H, PY + 0.67, 2 * H, { tegel: 1.2 });
    plein.doos('plein', 0xffffff, 0, PY - 0.03, 0, 2 * H - 0.06, 0.03, 2 * H - 0.06, { tegel: 2.4 });
    // kleine altaren (momoztli)
    for (const [x, z] of [[1.9, -9.6], [-9.9, 9.9], [1.9, 9.9], [-10.2, -2.8], [-1.0, -9.9]]) {
      plein.doos('stuc', K.stuc, x, PY, z, 0.9, 0.32, 0.9);
      plein.doos('vlak', K.rood, x, PY + 0.32, z, 0.94, 0.05, 0.94);
      MC.vuurschaal(plein, x, PY + 0.37, z, 0.8);
    }
    stad.add(plein.mesh('Heilig plein'));

    // -------------------------------------------------------- de slangenmuur
    const muur = new MC.Bouwer();
    for (const n of MC.ZIJDEN) {
      muur.push(n[0] * R, PY, n[1] * R, MC.draaiNaar(n[0], n[1]));
      for (const s of [-1, 1]) {
        const van = POORT, tot = R + 0.25, len = tot - van, x = s * (van + len / 2);
        muur.doos('stuc', K.stuc, x, 0, 0, len, 0.95, 0.45, { tegel: 1 });
        muur.doos('vlak', K.rood, x, 0, 0, len, 0.14, 0.47);
        muur.doos('stuc', K.stucD, x, 0.95, 0, len, 0.05, 0.5);
        MC.kantelen(muur, Math.min(s * van, s * tot), Math.max(s * van, s * tot), 1.0, 0, 0.5);
        // slangenkoppen aan de buitenkant
        for (let t = van + 0.8; t < tot - 0.4; t += 1.6) {
          const xs = s * t;
          muur.doos('stuc', 0x8aa04a, xs, 0.12, 0.34, 0.24, 0.2, 0.26);
          muur.doos('stuc', K.oker, xs, 0.32, 0.31, 0.26, 0.1, 0.22);
          muur.doos('vlak', K.rood, xs, 0.1, 0.48, 0.05, 0.02, 0.08);
          muur.bol('vlak', 0xf4f0e6, xs - 0.07, 0.3, 0.44, 0.03, 0.03, 0.03, 5, 3);
          muur.bol('vlak', 0xf4f0e6, xs + 0.07, 0.3, 0.44, 0.03, 0.03, 0.03, 5, 3);
        }
        // poortpijler met meanderfries en een vuurschaal
        const px = s * (van + 0.3);
        muur.doos('stuc', K.stuc, px, 0, 0, 0.6, 1.5, 0.7, { tegel: 1 });
        MC.meanderBand(muur, px, 1.15, 0, 0.62, 0.72, 0.2);
        MC.vuurschaal(muur, px, 1.5, 0, 0.9);
      }
      muur.pop();
    }
    stad.add(muur.mesh('Slangenmuur'));

    // --------------------------------------------------------- Templo Mayor
    const tb = new MC.Bouwer();
    const ryTM = MC.draaiNaar(-1, 0);
    tb.push(TM.x, PY, TM.z, ryTM);
    const tm = MC.templo(tb);
    tb.pop();
    stad.add(tb.mesh('Templo Mayor'));
    for (const [lx, ly, lz] of tm.vuren) {
      const [x, z] = MC.lokaal(TM.x, TM.z, ryTM, lx, lz);
      const lamp = new THREE.PointLight(0xff9a40, 0, 16, 2);
      lamp.position.set(x, PY + ly, z);
      stad.add(lamp);
      wereld.lampen.push(lamp);
    }
    MC.TM.top = PY + tm.top;
    MC.TM.ry = ryTM;

    // ------------------------------------------------- tempel van Ehecatl
    const eb = new MC.Bouwer();
    eb.push(-4.6, PY, 0, MC.draaiNaar(1, 0));
    eb.talud('stuc', K.stuc, 0, 0, 0, 4.2, 4.2, 4.0, 4.0, 0.5, { tegel: 1.2 });
    eb.doos('stuc', K.stucD, 0, 0.5, 0, 4.06, 0.05, 4.06);
    eb.cil('stuc', K.stuc, 0, 0.5, 0, 1.75, 1.85, 0.55, 24);
    eb.cil('vlak', K.rood, 0, 0.97, 0, 1.77, 1.77, 0.08, 24);
    eb.cil('stuc', K.stuc, 0, 1.05, 0, 1.4, 1.5, 0.55, 24);
    eb.cil('vlak', K.stuc, 0, 1.6, 0, 0.95, 0.95, 1.1, 20);
    eb.cil('vlak', K.rood, 0, 1.6, 0, 0.97, 0.97, 0.2, 20);
    eb.cil('vlak', K.rood, 0, 2.5, 0, 0.97, 0.97, 0.2, 20);
    eb.doos('raam', K.raam, 0, 1.8, 0.88, 0.5, 0.62, 0.16);
    for (const s of [-1, 1]) eb.kegel('vlak', 0xf4f0e6, s * 0.16, 2.28, 0.97, 0.05, 0.16, 4, { rx: Math.PI });
    eb.kegel('stro', 0xffffff, 0, 2.7, 0, 1.3, 1.5, 18);
    eb.cil('vlak', K.rood, 0, 4.15, 0, 0.06, 0.08, 0.3, 6);
    MC.trap(eb, 'stuc', K.stuc, 0, 0, 1.3, 1.0, 1.6, 1.6, { kleur2: K.stucD, wangen: true, wangKleur: K.rood, tegel: 1.2 });
    eb.pop();
    stad.add(eb.mesh('Tempel van Ehecatl'));

    // --------------------------------------------------------- balspelveld
    const bb = new MC.Bouwer();
    bb.push(-5.2, PY, -7.6, MC.draaiNaar(1, 0));
    bb.doos('plein', 0xe8dcc4, 0, 0, 0, 3.1, 0.03, 7.5, { tegel: 1.2 });
    bb.doos('vlak', K.rood, 0, 0.03, 0, 1.1, 0.01, 0.06);
    for (const s of [-1, 1]) {
      bb.doos('stuc', K.stuc, s * 1.2, 0, 0, 0.8, 0.75, 4.8, { tegel: 1 });
      bb.doos('vlak', K.rood, s * 1.2, 0.75, 0, 0.84, 0.06, 4.84);
      bb.doos('stuc', K.stucD, s * 0.72, 0.28, 0, 0.12, 0.66, 4.8, { rz: -s * 0.5, midden: true });
      // stenen ring halverwege de muur
      bb.voeg('stuc', K.oker, new THREE.TorusGeometry(0.15, 0.04, 6, 14), MC.matrixVan(s * 0.78, 0.62, 0, 0, Math.PI / 2, 0));
      // eindzones van de I-vorm
      bb.doos('stuc', K.stuc, s * 1.45, 0, s * 3.15, 0.3, 0.5, 1.2);
      bb.doos('stuc', K.stuc, -s * 1.45, 0, s * 3.15, 0.3, 0.5, 1.2);
      bb.doos('stuc', K.stuc, 0, 0, s * 3.85, 3.2, 0.5, 0.25);
      bb.doos('vlak', K.rood, 0, 0.5, s * 3.85, 3.24, 0.05, 0.28);
    }
    bb.pop();
    stad.add(bb.mesh('Balspelveld'));

    // ------------------------------------------------------------ schedelrek
    const zb = new MC.Bouwer();
    const zx = -4.8, zz = 7.4;
    zb.doos('stuc', 0xd8d0c0, zx, PY, zz, 4.6, 0.5, 1.4, { tegel: 1 });
    zb.doos('vlak', K.rood, zx, PY + 0.5, zz, 4.64, 0.04, 1.44);
    for (let k = 0; k < 18; k++) {
      for (const y of [0.15, 0.33]) zb.bol('vlak', 0xeae4d6, zx - 2.1 + k * 0.247, PY + y, zz + 0.71, 0.06, 0.07, 0.03, 6, 4);
    }
    for (let k = 0; k <= 5; k++) zb.cil('vlak', K.hout, zx - 2.1 + k * 0.84, PY + 0.54, zz, 0.035, 0.04, 1.45, 6);
    for (const h of [0.75, 1.0, 1.25]) {
      for (const dz of [-0.14, 0.14]) {
        zb.doos('vlak', K.houtD, zx, PY + 0.54 + h, zz + dz, 4.3, 0.02, 0.02);
        for (let q = 0; q < 30; q++) zb.bol('vlak', 0xeae4d6, zx - 2.05 + q * 0.141, PY + 0.53 + h, zz + dz, 0.045, 0.05, 0.045, 5, 3);
      }
    }
    stad.add(zb.mesh('Tzompantli'));

    // ------------------------------------------------------------ zonnesteen
    const sb = new MC.Bouwer();
    const zr = MC.draaiNaar(-0.35, 1);
    sb.push(-9.5, PY, 4.3, zr);
    sb.doos('stuc', K.stuc, 0, 0, 0, 3.0, 0.3, 1.2);
    sb.doos('vlak', K.rood, 0, 0.3, 0, 3.04, 0.04, 1.24);
    MC.trap(sb, 'stuc', K.stuc, 0, 0, 0.6, 1.0, 0.3, 0.35);
    sb.voeg('zon', 0xffffff, new THREE.CylinderGeometry(1.15, 1.15, 0.25, 40), MC.matrixVan(0, 1.5, -0.1, Math.PI / 2, 0, 0));
    sb.doos('stuc', 0x7a7266, 0, 0.34, -0.1, 1.2, 0.12, 0.4);
    sb.pop();
    stad.add(sb.mesh('Zonnesteen'));

    // ----------------------------------------------- Huis van de Adelaars
    const ab = new MC.Bouwer();
    ab.push(7.5, PY, -9.6, 0);
    ab.doos('stuc', K.stuc, 0, 0, 0, 5.0, 0.4, 2.6, { tegel: 1 });
    ab.doos('vlak', K.rood, 0, 0, 0, 5.04, 0.1, 2.64);
    ab.doos('stuc', K.stuc, 0, 0.4, -0.55, 4.4, 0.9, 1.3, { tegel: 1 });
    for (let k = 0; k < 6; k++) ab.cil('stuc', K.stuc, -2.0 + k * 0.8, 0.4, 0.75, 0.08, 0.09, 0.9, 8);
    ab.doos('stuc', K.stucD, 0, 1.3, 0.1, 4.6, 0.1, 2.4);
    MC.meanderBand(ab, 0, 1.4, 0.1, 4.62, 2.42, 0.18);
    MC.kantelen(ab, -2.3, 2.3, 1.58, 1.25, 0.46);
    ab.doos('raam', K.raam, 0, 0.4, 0.11, 0.5, 0.7, 0.03);
    MC.trap(ab, 'stuc', K.stuc, 0, 0, 1.3, 1.1, 0.4, 0.55, { wangen: true, wangKleur: K.oker });
    for (const s of [-1, 1]) {
      ab.doos('stuc', K.oker, s * 0.68, 0, 1.92, 0.2, 0.25, 0.3);
      ab.kegel('vlak', 0xe0b040, s * 0.68, 0.12, 2.1, 0.05, 0.14, 4, { rx: Math.PI / 2 });
    }
    ab.pop();
    stad.add(ab.mesh('Huis van de Adelaars'));

    // ------------------------------------------- tempel van Tezcatlipoca
    const xb = new MC.Bouwer();
    xb.push(6.6, PY, 9.4, MC.draaiNaar(-1, 0));
    MC.piramide(xb, {
      lagen: [[3.6, 3.4, 0.7], [2.9, 2.7, 0.7], [2.2, 2.0, 0.7]],
      trapBreed: 0.9, run: 1.3, vuur: 1, wangKleur: K.zwart,
      tempel: { w: 1.3, d: 1.1, h: 0.8, kleur: K.zwart, dakKleur: 0x4a4440 }
    });
    xb.pop();
    stad.add(xb.mesh('Tempel van Tezcatlipoca'));

    // ------------------------------------------------------------ calmecac
    const cb = new MC.Bouwer();
    cb.push(-10.15, PY, -7.4, MC.draaiNaar(1, 0));
    cb.doos('stuc', K.stuc, 0, 0, 0, 6.6, 0.85, 1.7, { tegel: 1 });
    cb.doos('vlak', K.rood, 0, 0, 0, 6.64, 0.12, 1.74);
    MC.meanderBand(cb, 0, 0.67, 0, 6.64, 1.74, 0.16);
    cb.doos('stuc', K.stucD, 0, 0.85, 0, 6.7, 0.05, 1.8);
    MC.kantelen(cb, -3.3, 3.3, 0.9, 0.82, 0.44);
    for (let k = 0; k < 5; k++) cb.doos('raam', K.raam, -2.6 + k * 1.3, 0, 0.86, 0.3, 0.5, 0.03);
    cb.pop();
    stad.add(cb.mesh('Calmecac'));

    // een paar ahuejotes langs de muur
    for (const [x, z] of [[-11.3, 11.2], [11.3, 11.2], [-11.3, -11.2], [11.2, -11.3], [-2.6, 11.3], [2.8, -11.3]]) {
      S.wilg.add(x, PY, z, r() * 6, 1.1 + r() * 0.3);
    }
  };
})(window.MC);

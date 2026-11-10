/* De wijken van Tenochtitlan: een strak raster van blokken met brede kanalen
   ertussen. Dicht bij het centrum gekalkte huizen, patiohuizen en
   wijktempels; verder naar buiten de chinampa's, drijvende akkers met maïs,
   groente en bloemen. Drie dijkwegen lopen over het meer naar de oever, met
   houten bruggen die je kunt weghalen. Langs de westelijke dijk komt het
   aquaduct van Chapultepec binnen en op de zuidelijke staat fort Xoloc. */

(function (MC) {
  'use strict';
  if (!window.THREE) return;

  const K = MC.KLEUR;
  const P = MC.PLAN;
  const SB = P.SB, KY = P.KY, DY = P.DY;

  const MAIS = [0x4f8a2c, 0x5b9533, 0x6b9d3a, 0x467d28, 0x7a9a3c];
  const GROEN = [0x5fa83a, 0x7cb552, 0x3f8a33, 0x8cc05a, 0x4f9a3f];
  const BLOEM = [0xf29a1d, 0xf4c430, 0xe8702a, 0xc0407a];
  const MUREN = [0xffffff, 0xf8f0e2, 0xf4e6cc, 0xfaf4ea, 0xefe0c8];

  // Blokken met een eigen invulling (zie centrum.js en paleizen.js).
  function bijzonder(sx, sz, i, j) {
    if (i === 0 && j === 0) return 'heilig';
    if (sx > 0 && sz > 0 && i === 0 && j === 1) return 'paleis';
    if (sx < 0 && sz > 0 && i === 0 && j === 1) return 'plein';
    if (sx < 0 && i === 1 && j === 0) return 'paleis';
    if (sx < 0 && sz < 0 && i <= 1 && j === 3) return 'tlatelolco';
    return null;
  }
  MC.bijzonderBlok = bijzonder;

  MC.bouwWijken = function (stad) {
    const S = MC.S;
    const r = MC.rng(13250);

    // ----------------------------------------------- lanen en dijkwegen
    const dijk = new MC.Bouwer();
    const brug = new MC.Bouwer();
    // Waar een kanaal de laan kruist, ligt een houten brug.
    const gaten = [];
    for (const k of P.KANALEN) gaten.push(k);
    for (let d = P.RAND + 9; d < P.EIND - 6; d += 11) gaten.push(d);

    function laan(n, van, tot) {
      const ry = MC.draaiNaar(n[0], n[1]);
      dijk.push(0, 0, 0, ry);
      brug.push(0, 0, 0, ry);
      let a = van;
      const stukken = gaten.filter((g) => g > van && g < tot).concat([tot + 0.7]);
      for (const g of stukken) {
        const b = g - 0.7, len = b - a;
        if (len > 0.1) {
          const mid = (a + b) / 2;
          const buiten = mid > P.RAND;
          dijk.doos('steen', 0xffffff, 0, -1.4, mid, buiten ? 2.5 : 2.6, DY + 1.4, len, { tegel: 1.2 });
          dijk.doos('plein', 0xe8dcc8, 0, DY - 0.02, mid, 2.3, 0.03, len, { tegel: 1.6 });
          if (buiten) for (const sx of [-1, 1]) dijk.doos('steen', 0xffffff, sx * 1.2, DY, mid, 0.14, 0.12, len, { tegel: 1.2 });
        }
        if (g < tot) {
          brug.doos('vlak', K.hout, 0, DY - 0.1, g, 2.3, 0.1, 1.6);
          for (let p = -1; p <= 1; p += 0.25) brug.doos('vlak', K.houtD, p, DY, g, 0.03, 0.005, 1.6);
          for (const sx of [-1, 1]) {
            brug.doos('vlak', K.houtD, sx * 1.12, DY, g, 0.06, 0.32, 1.6);
            for (const e of [-0.75, 0.75]) brug.doos('vlak', K.houtD, sx * 1.12, -0.8, g + e, 0.1, DY + 0.8, 0.1);
          }
        }
        a = g + 0.7;
      }
      dijk.pop();
      brug.pop();
    }
    laan([0, -1], P.R + 0.7, P.EIND);       // Tepeyac, naar het noorden
    laan([0, 1], P.R + 0.7, P.EIND);        // Iztapalapa, naar het zuiden
    laan([-1, 0], P.R + 0.7, P.EIND);       // Tlacopan, naar het westen
    laan([1, 0], P.R + 0.7, P.RAND + 0.3);  // oostlaan, naar de aanlegplaats
    stad.add(dijk.mesh('Dijkweg'));
    stad.add(brug.mesh('Houten brug'));

    // ---------------------------------------------------------- aquaduct
    {
      const b = new MC.Bouwer();
      const z = -1.62, van = MC.CHAPULTEPEC.x + 13, tot = -P.R - 0.8, len = tot - van;
      const top = 1.05;
      b.doos('steen', 0xffffff, (van + tot) / 2, top - 0.3, z, len, 0.3, 0.52, { tegel: 1.2 });
      for (const e of [-0.22, 0.22]) b.doos('stuc', K.stucD, (van + tot) / 2, top, z + e, len, 0.06, 0.08);
      b.doos('kanaal', 0xffffff, (van + tot) / 2, top - 0.02, z, len, 0.05, 0.34);
      // pijlers staan in het water naast de dijk
      for (let x = van + 0.6; x < tot; x += 1.3) {
        b.doos('steen', 0xffffff, x, -1.5, z, 0.3, top + 1.2, 0.36, { tegel: 1.2 });
      }
      // bronbekken op de helling van Chapultepec en een verdeelbak bij het plein
      const hb = MC.landHoogte(van - 0.8, z);
      b.doos('stuc', K.stuc, van - 0.8, hb - 0.4, z, 2.0, top - hb + 0.65, 2.0, { tegel: 1 });
      b.doos('kanaal', 0xffffff, van - 0.8, top + 0.2, z, 1.7, 0.06, 1.7);
      b.doos('stuc', K.stuc, tot + 0.2, DY, z - 0.1, 1.0, top - DY + 0.2, 0.9, { tegel: 1 });
      stad.add(b.mesh('Aquaduct van Chapultepec'));
    }

    // ------------------------------------------------------ fort Xoloc
    {
      const b = new MC.Bouwer();
      const z = 84;
      for (const sx of [-1, 1]) {
        b.doos('steen', 0xffffff, sx * 2.0, -1.4, z, 1.6, DY + 1.4, 3.0, { tegel: 1.2 });
        b.doos('stuc', K.stuc, sx * 2.0, DY, z, 1.4, 2.2, 2.6, { tegel: 1 });
        b.doos('vlak', K.rood, sx * 2.0, DY, z, 1.44, 0.14, 2.64);
        MC.meanderBand(b, sx * 2.0, DY + 1.9, z, 1.44, 2.64, 0.2);
        b.doos('stuc', K.stucD, sx * 2.0, DY + 2.2, z, 1.5, 0.06, 2.7);
        b.push(sx * 2.0, 0, z, 0);
        MC.kantelen(b, -0.7, 0.7, DY + 2.26, 1.28, 0.35);
        MC.kantelen(b, -0.7, 0.7, DY + 2.26, -1.28, 0.35);
        b.pop();
      }
      b.doos('stuc', K.stuc, 0, DY + 1.6, z, 2.6, 0.6, 1.6, { tegel: 1 });
      MC.meanderBand(b, 0, DY + 1.6, z, 2.62, 1.62, 0.2);
      MC.kantelen(b, -1.3, 1.3, DY + 2.2, z + 0.75, 0.43);
      stad.add(b.mesh('Fort Xoloc'));
    }

    // ----------------------------------------------- aanlegplaats in het oosten
    {
      const b = new MC.Bouwer();
      const x0 = P.RAND + 0.3;
      b.doos('steen', 0xffffff, x0 + 0.8, -1.4, 0, 1.6, DY + 1.4, 8, { tegel: 1.2 });
      b.doos('plein', 0xe8dcc8, x0 + 0.8, DY - 0.02, 0, 1.5, 0.03, 7.9, { tegel: 1.6 });
      for (const z of [-3.2, -1.1, 1.1, 3.2]) {
        b.doos('vlak', K.hout, x0 + 3.2, DY - 0.12, z, 3.6, 0.08, 0.5);
        for (const e of [1.6, 3.4, 4.8]) b.doos('vlak', K.houtD, x0 + e, -0.8, z + 0.22, 0.08, DY + 0.9, 0.08);
        for (const s of [-1, 1]) S.kanoStil.add(x0 + 3.3 + r() * 1.2, 0.03, z + s * 0.5, 0, 1);
      }
      stad.add(b.mesh('Aanlegplaats'));
    }

    // ------------------------------------------------------------- kavels
    function kavel(px, pz, wx, wz, soort, d) {
      const langsZ = wz >= wx;
      const L = langsZ ? wz : wx, W = langsZ ? wx : wz;
      const naar = (u, v) => (langsZ ? [px + u, pz + v] : [px + v, pz + u]);
      // draaiing waarmee de voorkant van een huis naar +u (s = 1) of -u wijst
      const naarU = (s) => (langsZ ? MC.draaiNaar(s, 0) : MC.draaiNaar(0, s));
      const naarV = (s) => (langsZ ? MC.draaiNaar(0, s) : MC.draaiNaar(s, 0));
      const naam = { mais: 'Maïsakker', groente: 'Groenteakker', bloem: 'Bloemenakker', woon: 'Woonerf', hutrij: 'Woonerf', stad: 'Stadswijk' }[soort];
      const woon = soort === 'woon' || soort === 'hutrij';

      const v = 0.9 + r() * 0.18;
      if (soort === 'stad') {
        S.kavelRand.add(px, -0.4, pz, 0, [wx, 0.71, wz], new THREE.Color(0x8c7d6c).multiplyScalar(v), naam);
        S.kavelTop.add(px, KY - 0.04, pz, 0, [wx - 0.1, 0.05, wz - 0.1], new THREE.Color(0xd6c9ae).multiplyScalar(0.92 + r() * 0.12), naam);
      } else {
        S.kavelRand.add(px, -0.4, pz, 0, [wx, 0.66, wz], new THREE.Color(0x4a3927).multiplyScalar(v), naam);
        const grond = woon ? new THREE.Color(0xa38d69) : new THREE.Color(0x3d2e20);
        S.kavelTop.add(px, KY - 0.06, pz, 0, [wx - 0.12, 0.07, wz - 0.12], grond.multiplyScalar(0.92 + r() * 0.16), naam);
      }
      const muur = () => new THREE.Color(MUREN[Math.floor(r() * MUREN.length)]);

      if (soort === 'stad') {
        const k = r();
        if (k < 0.3 && W >= 2.3) {
          // patiohuizen op een rij
          const s = Math.min(1.0, (W - 0.2) / 2.2);
          const stap = 2.3 * s;
          const n = Math.floor((L - 0.2) / stap);
          for (let q = 0; q < n; q++) {
            const vv = -L / 2 + (L - n * stap) / 2 + (q + 0.5) * stap;
            const [x, z] = naar(0, vv);
            S.patio.add(x, KY, z, naarU(q % 2 ? 1 : -1), s, muur());
          }
          return;
        }
        const tempel = k < 0.42;
        for (let vv = -L / 2 + 0.5; vv < L / 2 - 0.4; vv += 0.98) {
          if (tempel && Math.abs(vv) < 1.6) continue;
          for (const s of [-1, 1]) {
            const [x, z] = naar(s * (W / 2 - 0.45), vv);
            S.huis.add(x, KY, z, naarU(s) + (r() - 0.5) * 0.06, 0.95 + r() * 0.1, muur());
          }
          // middenstrook: tuintjes met maguey, nopal, groente en een boom
          if (W > 2.2) {
            const [x, z] = naar((r() - 0.5) * 0.3, vv);
            const t = r();
            if (t < 0.3) S.agave.add(x, KY, z, r() * 6, 0.8 + r() * 0.4);
            else if (t < 0.45) S.nopal.add(x, KY, z, r() * 6, 0.9 + r() * 0.3);
            else if (t < 0.6) S.wilg.add(x, KY, z, 0, 0.8 + r() * 0.3);
            else if (t < 0.68) S.temazcal.add(x, KY, z, naarV(1), 0.9);
            else for (let q = 0; q < 4; q++) {
              const [gx, gz] = naar((r() - 0.5) * 0.5, vv + (r() - 0.5) * 0.5);
              S.groente.add(gx, KY, gz, 0, 0.8, GROEN[q % GROEN.length]);
            }
          }
        }
        if (tempel) {
          const [x, z] = naar(0, 0);
          S.wijktempel.add(x, KY, z, naarU(r() < 0.5 ? 1 : -1), Math.min(1.1, (W - 0.2) / 2.0));
        }
      } else if (soort === 'mais') {
        const nr = Math.max(2, Math.floor((W - 0.2) / 0.3));
        const groei = 0.75 + r() * 0.45;
        const kl = MAIS[Math.floor(r() * MAIS.length)];
        for (let q = 0; q < nr; q++) {
          const u = -W / 2 + 0.1 + (q + 0.5) * (W - 0.2) / nr;
          for (let vv = -L / 2 + 0.16; vv < L / 2 - 0.1; vv += 0.27) {
            const [x, z] = naar(u + (r() - 0.5) * 0.04, vv);
            const s = 0.85 + r() * 0.3;
            S.mais.add(x, KY, z, r() * 6, [s, s * groei, s], new THREE.Color(kl).multiplyScalar(0.9 + r() * 0.2));
          }
        }
      } else if (soort === 'groente') {
        const nr = Math.max(2, Math.floor((W - 0.16) / 0.28));
        const kl = GROEN[Math.floor(r() * GROEN.length)];
        const kl2 = GROEN[Math.floor(r() * GROEN.length)];
        for (let q = 0; q < nr; q++) {
          const u = -W / 2 + 0.08 + (q + 0.5) * (W - 0.16) / nr;
          const rij = q % 2 ? kl : kl2;
          const pompoen = r() < 0.12;
          for (let vv = -L / 2 + 0.15; vv < L / 2 - 0.1; vv += 0.26) {
            const [x, z] = naar(u, vv);
            const kleur = pompoen && r() < 0.3 ? 0xe08a2c : rij;
            S.groente.add(x, KY, z, r() * 6, 0.8 + r() * 0.45, new THREE.Color(kleur).multiplyScalar(0.9 + r() * 0.2));
          }
        }
      } else if (soort === 'bloem') {
        const nr = Math.max(2, Math.floor((W - 0.16) / 0.24));
        for (let q = 0; q < nr; q++) {
          const u = -W / 2 + 0.08 + (q + 0.5) * (W - 0.16) / nr;
          const kl = BLOEM[(q + Math.floor(r() * 2)) % BLOEM.length];
          for (let vv = -L / 2 + 0.12; vv < L / 2 - 0.08; vv += 0.17) {
            const [x, z] = naar(u, vv);
            S.bloem.add(x, KY, z, 0, 0.8 + r() * 0.4, kl);
          }
        }
      } else if (soort === 'woon') {
        const cols = Math.max(1, Math.floor((W - 0.1) / 0.95));
        const rows = Math.max(1, Math.floor((L - 0.1) / 0.95));
        for (let a = 0; a < cols; a++) {
          for (let c = 0; c < rows; c++) {
            const u = -W / 2 + (a + 0.5) * W / cols, vv = -L / 2 + (c + 0.5) * L / rows;
            const [x, z] = naar(u + (r() - 0.5) * 0.08, vv + (r() - 0.5) * 0.08);
            const q = r();
            const ry = (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.2;
            if (q < 0.55) S.hut.add(x, KY, z, ry, 0.9 + r() * 0.2, new THREE.Color(0xffffff).multiplyScalar(0.9 + r() * 0.15));
            else if (q < 0.74 - d * 0.04) S.adobe.add(x, KY, z, ry, 0.84, 0xffffff);
            else if (q < 0.82) S.agave.add(x, KY, z, r() * 6, 0.9 + r() * 0.3);
            else if (q < 0.9) S.wilg.add(x, KY, z, 0, 0.9 + r() * 0.3);
            else {
              for (let g = 0; g < 5; g++) {
                const [gx, gz] = naar(u + (r() - 0.5) * 0.6, vv + (r() - 0.5) * 0.6);
                S.groente.add(gx, KY, gz, 0, 0.9, GROEN[g % GROEN.length]);
              }
            }
          }
        }
      } else if (soort === 'hutrij') {
        for (let vv = -L / 2 + 0.45; vv < L / 2 - 0.35; vv += 0.85) {
          const [x, z] = naar((r() - 0.5) * 0.1, vv);
          if (r() < 0.8) S.hut.add(x, KY, z, (r() < 0.5 ? 0 : Math.PI / 2), 0.9 + r() * 0.15);
          else S.agave.add(x, KY, z, r() * 6, 0.9);
        }
      }

      // ahuejotes langs de lange randen houden de akker vast
      if (soort !== 'woon' && soort !== 'stad') {
        for (let vv = -L / 2 + 0.4; vv < L / 2 - 0.3; vv += 1.05) {
          for (const s of [-1, 1]) {
            if (r() < 0.22) {
              const [x, z] = naar(s * (W / 2 - 0.08), vv + (r() - 0.5) * 0.3);
              S.wilg.add(x, KY, z, 0, 0.8 + r() * 0.35);
            }
          }
        }
      }
    }

    // Een blok van 11 × 11: stroken met smalle kanaaltjes ertussen.
    function blok(q, soort, draai, rand, d) {
      const n = soort === 'veld' ? 6 : 3, gap = soort === 'veld' ? 0.5 : 0.6;
      const sw = (SB - (n - 1) * gap) / n, pl = (SB - 0.6) / 2;
      for (let a = 0; a < n; a++) {
        for (let c = 0; c < 2; c++) {
          const u0 = a * (sw + gap), v0 = c * (pl + 0.6);
          let px, pz, wx, wz;
          if (draai === 0) { px = q.x0 + u0 + sw / 2; pz = q.z0 + v0 + pl / 2; wx = sw; wz = pl; }
          else { px = q.x0 + v0 + pl / 2; pz = q.z0 + u0 + sw / 2; wx = pl; wz = sw; }
          if (rand && r() < 0.35) continue;
          let s = soort;
          if (soort === 'veld') {
            const k = r();
            const huis = d <= 2 ? 0.12 : 0.06;
            if (k < huis) s = 'hutrij';
            else if (k < huis + 0.45) s = 'mais';
            else if (k < 0.93) s = 'groente';
            else s = 'bloem';
          }
          kavel(px, pz, wx, wz, s, d);
        }
      }
    }

    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        for (let i = 0; i < P.RINGEN; i++) {
          for (let j = 0; j < P.RINGEN; j++) {
            if (bijzonder(sx, sz, i, j)) continue;
            const d = Math.max(i, j);
            const k = r();
            let soort;
            if (d === 1) soort = 'stad';
            else if (d === 2) soort = k < 0.7 ? 'stad' : k < 0.92 ? 'woon' : 'veld';
            else if (d === 3) soort = k < 0.2 ? 'stad' : k < 0.55 ? 'woon' : 'veld';
            else soort = k < 0.15 ? 'woon' : 'veld';
            blok(MC.blokRect(sx, sz, i, j), soort, r() < 0.5 ? 0 : 1, d === P.RINGEN - 1, d);
          }
        }
      }
    }

    // ------------------------------------------------------------ rietvelden
    for (let k = 0; k < 100; k++) {
      const a = r() * Math.PI * 2, dd = 72 + r() * (P.EIND - 82);
      const cx = Math.cos(a) * dd, cz = Math.sin(a) * dd;
      if (Math.abs(cx) < 4 || Math.abs(cz) < 4 || Math.max(Math.abs(cx), Math.abs(cz)) < P.RAND + 4) continue;
      for (let q = 0; q < 26; q++) {
        const x = cx + (r() - 0.5) * 3.5, z = cz + (r() - 0.5) * 2.5;
        S.riet.add(x, -0.05, z, r() * 6, 0.8 + r() * 0.5, r() < 0.5 ? 0xa3ad5e : 0x7b8a42);
      }
    }

    // ---------------------------------------------- Chapultepec en de oevers
    const C = MC.CHAPULTEPEC;
    for (let k = 0; k < 60; k++) {
      const a = r() * Math.PI * 2, dd = Math.sqrt(r()) * 15;
      const x = C.x + Math.cos(a) * dd, z = C.z + Math.sin(a) * dd;
      const h = MC.landHoogte(x, z);
      if (h > 0.6) S.ahuehuete.add(x, h - 0.1, z, r() * 6, 1.2 + r() * 0.8);
    }
    // dorpen aan de oever waar de dijkwegen aankomen: Tepeyac, Iztapalapa, Tlacopan
    for (const [cx, cz] of [[0, -P.EIND - 8], [0, P.EIND + 8], [-P.EIND - 6, -16], [-130, P.EIND + 10], [P.EIND / 0.7 + 14, -30]]) {
      let tempel = false;
      for (let k = 0; k < 70; k++) {
        const x = cx + (r() - 0.5) * 22, z = cz + (r() - 0.5) * 16;
        if (Math.abs(x) < 2 || Math.abs(z) < 2) continue;
        const h = MC.landHoogte(x, z);
        if (h < 0.5 || h > 7) continue;
        const q = r();
        if (!tempel && q < 0.08) { S.wijktempel.add(x, h - 0.05, z, r() * 6, 1.2); tempel = true; }
        else if (q < 0.55) S.hut.add(x, h - 0.05, z, r() * 6, 1);
        else if (q < 0.75) S.adobe.add(x, h - 0.05, z, r() * 6, 0.9);
        else if (q < 0.88) S.agave.add(x, h, z, r() * 6, 1.1);
        else S.wilg.add(x, h - 0.05, z, 0, 1.1);
      }
    }
  };
})(window.MC);

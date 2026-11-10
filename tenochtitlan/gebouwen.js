/* De prefabs: alles wat vaker dan een paar keer in de stad staat. Elk prefab
   wordt één keer in lokale coördinaten opgebouwd (voorkant naar +z, onderkant
   op y = 0) en daarna als Serie honderden keren neergezet. Daarnaast een paar
   bouwhulpjes die ook het centrum gebruikt: trappen, piramides en vuurschalen. */

(function (MC) {
  'use strict';
  if (!window.THREE) return;

  const K = MC.KLEUR = {
    stuc: 0xf3ede0, stucD: 0xe0d4bc, rood: 0xa8392b, roodD: 0x7e2a20, oker: 0xc99a45,
    turkoois: 0x2f8f8a, blauw: 0x3b6fa8, zwart: 0x2c2724,
    hout: 0x6e4a2c, houtD: 0x4a3220, raam: 0x2a2420, steen: 0x8c7d6c,
    adobe: 0xdcc9a3, adobeD: 0xc2ab82, huid: 0xa8714a,
    blad: 0x4a6d34, bladD: 0x3a5a2e, agave: 0x6f9a86
  };

  // ------------------------------------------------------------ bouwhulpjes

  // Trap die vanaf de bovenrand (z0, op hoogte y0 + hoog) naar +z afdaalt.
  // o: kleur2 (om en om), wangen (balustrades), wangKleur, wangBreed, tegel.
  MC.trap = function (b, mat, kleur, x, y0, z0, breed, hoog, run, o) {
    o = o || {};
    const n = Math.max(3, Math.round(hoog / 0.17)), sh = hoog / n, sd = run / n;
    for (let k = 0; k < n; k++) {
      const len = (n - k) * sd;
      b.doos(mat, k % 2 && o.kleur2 ? o.kleur2 : kleur, x, y0, z0 + len / 2, breed, (k + 1) * sh, len, { tegel: o.tegel });
    }
    if (o.wangen) {
      const hoek = Math.atan2(hoog, run), lang = Math.hypot(hoog, run), w = o.wangBreed || 0.14;
      for (const s of [-1, 1]) {
        b.doos('stuc', o.wangKleur || K.stuc, x + s * (breed / 2 + w / 2), y0 + hoog / 2 + 0.06, z0 + run / 2, w, 0.17, lang, { rx: hoek, midden: true });
      }
    }
  };

  // Vuurschaal op een korte voet; het vuur gloeit 's nachts.
  MC.vuurschaal = function (b, x, y, z, s) {
    s = s || 1;
    b.cil('vlak', 0x5a4a3c, x, y, z, 0.05 * s, 0.08 * s, 0.22 * s, 6);
    b.cil('vlak', 0x8a5a3a, x, y + 0.22 * s, z, 0.15 * s, 0.08 * s, 0.1 * s, 8);
    b.kegel('vuur', 0xff9a3c, x, y + 0.3 * s, z, 0.1 * s, 0.24 * s, 6);
    b.kegel('vuur', 0xffe070, x, y + 0.32 * s, z, 0.05 * s, 0.15 * s, 5);
  };

  // Rij kantelen (almenas) langs lokale x, op hoogte y.
  MC.kantelen = function (b, x0, x1, y, z, stap, kleur, ry) {
    for (let x = x0 + stap / 2; x <= x1 - stap / 2 + 1e-6; x += stap) {
      b.doos('stuc', kleur || K.stuc, x, y, z, stap * 0.42, 0.16, 0.08, { ry: ry || 0 });
      b.doos('stuc', kleur || K.stuc, x, y + 0.16, z, stap * 0.24, 0.08, 0.08, { ry: ry || 0 });
    }
  };

  // Band met de trapmeander, rondom een doos van w × d (één rij van de textuur).
  MC.meanderBand = function (b, x, y, z, w, d, h) {
    b.doos('fries', 0xffffff, x, y, z, w, h, d, { tegel: h * 4 });
  };

  /* Getrapte piramide met een trap aan de voorkant (+z) en een heiligdom op de
     top. o.lagen: [[breedte, diepte, hoogte], …] van onder naar boven. */
  MC.piramide = function (b, o) {
    const inz = o.inzet || 0.16;
    let y = 0;
    for (const [w, d, h] of o.lagen) {
      b.talud('stuc', o.kleur || K.stuc, 0, y, 0, w, d, w - inz, d - inz, h - 0.06, { tegel: 1.2 });
      b.doos('stuc', K.stucD, 0, y + h - 0.06, 0, w - inz + 0.06, 0.06, d - inz + 0.06);
      y += h;
    }
    const laatste = o.lagen[o.lagen.length - 1];
    const dTop = laatste[1] - inz, wTop = laatste[0] - inz;
    MC.trap(b, 'stuc', K.stuc, 0, 0, dTop / 2, o.trapBreed, y, o.run, {
      kleur2: K.stucD, wangen: true, wangKleur: o.wangKleur || K.rood, wangBreed: o.trapBreed * 0.16, tegel: 1.2
    });
    const t = o.tempel;
    if (!t) return y;
    const tz = -dTop / 2 + t.d / 2 + 0.06;
    b.doos('vlak', t.kleur, 0, y, tz, t.w, t.h, t.d);
    b.doos('raam', K.raam, 0, y, tz + t.d / 2 + 0.005, t.w * 0.34, t.h * 0.64, 0.02);
    b.doos('stuc', K.stuc, 0, y + t.h, tz, t.w + 0.08, 0.06, t.d + 0.08);
    const yd = y + t.h + 0.06;
    if (t.dak === 'stro') {
      b.kegel('stro', 0xffffff, 0, yd, tz, Math.max(t.w, t.d) * 0.82, t.w * 0.95, 4, { plat: true, ry: Math.PI / 4 });
    } else {
      b.talud('vlak', t.dakKleur, 0, yd, tz, t.w, t.d, t.w * 0.72, t.d * 0.72, t.h * 0.75);
      MC.kantelen(b, -t.w * 0.36, t.w * 0.36, yd + t.h * 0.75, tz + t.d * 0.3, t.w * 0.18, K.stuc);
    }
    if (o.vuur) for (const s of [-1, 1]) MC.vuurschaal(b, s * wTop * 0.36, y, dTop / 2 - 0.15, o.vuur);
    return y;
  };

  // -------------------------------------------------------------- woningen

  // Huis van een gewone familie: gekalkte muren, een rode plint, plat dak met
  // een opstaande rand en uitstekende balken boven de deur.
  function huis() {
    const b = new MC.Bouwer();
    b.doos('stuc', K.stuc, 0, 0, 0, 0.9, 0.5, 0.8, { tegel: 1 });
    b.doos('vlak', K.rood, 0, 0, 0, 0.92, 0.08, 0.82);
    for (const [x, z, w, d] of [[0, 0.385, 0.92, 0.05], [0, -0.385, 0.92, 0.05], [0.435, 0, 0.05, 0.72], [-0.435, 0, 0.05, 0.72]]) {
      b.doos('stuc', K.stucD, x, 0.5, z, w, 0.07, d);
    }
    b.doos('raam', K.raam, -0.15, 0, 0.403, 0.2, 0.32, 0.02);
    b.doos('raam', K.raam, 0.46, 0.22, 0, 0.02, 0.12, 0.16);
    for (const x of [-0.3, 0, 0.3]) b.doos('vlak', K.hout, x, 0.4, 0.43, 0.04, 0.04, 0.1);
    // een paar potten en een bundel riet tegen de gevel
    b.cil('vlak', 0xa0603a, 0.25, 0, 0.47, 0.06, 0.05, 0.12, 7);
    b.cil('vlak', 0x8a5030, 0.36, 0, 0.46, 0.045, 0.04, 0.09, 7);
    return b.geometrie();
  }

  // Lemen huis met plat dak (op de chinampa's).
  function adobe() {
    const b = new MC.Bouwer();
    b.doos('vlak', 0xe3d3b2, 0, 0, 0, 0.95, 0.55, 0.85);
    for (const [x, z, w, d] of [[0, 0.41, 0.95, 0.05], [0, -0.41, 0.95, 0.05], [0.46, 0, 0.05, 0.85], [-0.46, 0, 0.05, 0.85]]) {
      b.doos('vlak', K.adobeD, x, 0.55, z, w, 0.07, d);
    }
    b.doos('raam', K.raam, -0.18, 0, 0.428, 0.18, 0.32, 0.02);
    b.doos('raam', K.raam, 0.22, 0.26, 0.428, 0.14, 0.12, 0.02);
    for (const x of [-0.3, 0, 0.3]) b.doos('vlak', K.hout, x, 0.44, 0.44, 0.04, 0.04, 0.1);
    return b.geometrie();
  }

  // Rieten hut: lichte adobe onderbouw onder een hoog, afgerond strodak.
  function hut() {
    const b = new MC.Bouwer();
    b.doos('vlak', K.adobe, 0, 0, 0, 0.62, 0.36, 0.62);
    b.doos('raam', K.raam, 0, 0, 0.312, 0.16, 0.25, 0.02);
    const pts = [[0.44, 0.33], [0.47, 0.42], [0.43, 0.58], [0.34, 0.73], [0.2, 0.84], [0.05, 0.9], [0, 0.905]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    b.voeg('stro', 0xf4ecdc, new THREE.LatheGeometry(pts, 12));
    return b.geometrie();
  }

  // Patiohuis van een koopman of edelman: vier vleugels rond een binnenplaats
  // met een boom, een meanderfries onder de dakrand en kantelen erbovenop.
  function patiohuis() {
    const b = new MC.Bouwer();
    const W = 2.2, h = 0.72, vl = 0.62, gat = 0.5, y = 0.04;
    b.doos('plein', 0xffffff, 0, 0, 0, W, 0.04, W, { tegel: 1 });
    const vleugels = [
      [0, -(W / 2 - vl / 2), W, vl],
      [-(W / 2 - vl / 2), 0, vl, W - 2 * vl],
      [W / 2 - vl / 2, 0, vl, W - 2 * vl]
    ];
    const fw = (W - gat) / 2;
    for (const s of [-1, 1]) vleugels.push([s * (gat / 2 + fw / 2), W / 2 - vl / 2, fw, vl]);
    for (const [x, z, w, d] of vleugels) {
      b.doos('stuc', K.stuc, x, y, z, w, h, d, { tegel: 1 });
      b.doos('stuc', K.stucD, x, y + h, z, w + 0.04, 0.05, d + 0.04);
    }
    // rode plint en meanderfries rondom de buitenkant
    for (const [x, z, w, d] of [[0, W / 2, W + 0.03, 0.02], [0, -W / 2, W + 0.03, 0.02], [W / 2, 0, 0.02, W + 0.03], [-W / 2, 0, 0.02, W + 0.03]]) {
      b.doos('vlak', K.rood, x, y, z, w, 0.12, d);
      MC.meanderBand(b, x, y + h - 0.16, z, w, d, 0.14);
    }
    // latei boven de ingang
    b.doos('stuc', K.stuc, 0, y + h - 0.18, W / 2 - vl / 2, gat, 0.18, vl);
    // ramen
    for (const t of [-0.6, 0.6]) {
      b.doos('raam', K.raam, t, y + 0.3, -W / 2 - 0.012, 0.16, 0.18, 0.02);
      b.doos('raam', K.raam, W / 2 + 0.012, y + 0.3, t, 0.02, 0.18, 0.16);
      b.doos('raam', K.raam, -W / 2 - 0.012, y + 0.3, t, 0.02, 0.18, 0.16);
    }
    // kantelen langs de voorgevel
    MC.kantelen(b, -W / 2, W / 2, y + h + 0.05, W / 2 - 0.05, 0.36);
    // binnenplaats: boom en struikjes, plantjes op het dak
    b.cil('vlak', 0x5a4632, 0, y, 0, 0.035, 0.05, 0.5, 6);
    b.bol('blad', K.blad, 0, y + 0.72, 0, 0.3, 0.28, 0.3, 8, 6);
    for (const [x, z] of [[-0.35, -0.3], [0.35, -0.3], [0.33, 0.25]]) b.bol('blad', 0x5f8a3e, x, y + 0.06, z, 0.09, 0.08, 0.09, 6, 4);
    for (const [x, z] of [[-0.8, -0.8], [0.8, -0.75], [-0.75, 0.6]]) b.bol('blad', 0x6a9444, x, y + h + 0.1, z, 0.1, 0.08, 0.1, 6, 4);
    return b.geometrie();
  }

  // Wijktempel van een calpulli: drie trappen, een rood heiligdom en een rieten dak.
  function wijktempel() {
    const b = new MC.Bouwer();
    MC.piramide(b, {
      lagen: [[2.0, 2.0, 0.45], [1.55, 1.55, 0.45], [1.1, 1.1, 0.42]],
      trapBreed: 0.5, run: 0.95, vuur: 0.7,
      tempel: { w: 0.62, d: 0.5, h: 0.42, kleur: K.rood, dak: 'stro' }
    });
    return b.geometrie();
  }

  // Temazcal: koepelvormig zweetbad van leem met een laag deurtje.
  function temazcal() {
    const b = new MC.Bouwer();
    b.bol('vlak', 0xcdb48a, 0, 0, 0, 0.38, 0.32, 0.38, 10, 6);
    b.doos('vlak', 0xb59a70, 0, 0, 0.3, 0.26, 0.2, 0.16);
    b.doos('raam', K.raam, 0, 0, 0.385, 0.14, 0.14, 0.02);
    b.cil('vlak', 0x8a6a4a, 0.18, 0.2, -0.12, 0.04, 0.05, 0.16, 6);
    return b.geometrie();
  }

  // ------------------------------------------------------------- planten

  // Ahuejote: de slanke wilg die de chinampa's met zijn wortels vasthoudt.
  function wilg() {
    const b = new MC.Bouwer();
    b.cil('vlak', 0x5a4632, 0, 0, 0, 0.03, 0.04, 0.55, 6);
    b.bol('blad', 0x4a6d34, 0, 0.95, 0, 0.16, 0.55, 0.16, 7, 6);
    b.bol('blad', 0x5e8440, 0.03, 1.1, 0.02, 0.1, 0.38, 0.1, 6, 5);
    return b.geometrie();
  }

  // Ahuehuete: brede, oude moerascipres zoals in de bossen van Chapultepec.
  function ahuehuete() {
    const b = new MC.Bouwer();
    b.cil('vlak', 0x5b4535, 0, 0, 0, 0.09, 0.16, 0.9, 7);
    b.bol('blad', 0x3d5a32, 0, 1.3, 0, 0.62, 0.55, 0.62, 9, 6);
    b.bol('blad', 0x4a6a3a, 0.28, 1.05, 0.2, 0.4, 0.34, 0.4, 8, 5);
    b.bol('blad', 0x35502c, -0.3, 1.15, -0.15, 0.42, 0.38, 0.42, 8, 5);
    b.bol('blad', 0x4f7040, 0.05, 1.7, 0.05, 0.36, 0.3, 0.36, 8, 5);
    return b.geometrie();
  }

  // Maguey (agave): een rozet van dikke, blauwgroene bladeren.
  function agave() {
    const b = new MC.Bouwer();
    for (let k = 0; k < 11; k++) {
      const g = new THREE.ConeGeometry(0.045, 0.42, 3);
      g.translate(0, 0.21, 0);
      const tilt = k < 6 ? 0.85 : 0.4;
      b.voeg('blad', k % 2 ? K.agave : 0x5f8a78, g, MC.matrixVan(0, 0.02, 0, tilt, k * 2.4, 0));
    }
    return b.geometrie();
  }

  // Nopal: schijfcactus, het teken van de stad.
  function nopal() {
    const b = new MC.Bouwer();
    const schijf = (x, y, z, ry, rz, s) => b.voeg('blad', 0x5f8f3e, new THREE.SphereGeometry(1, 8, 5),
      MC.matrixVan(x, y, z, 0, ry, rz, 0.1 * s, 0.13 * s, 0.025 * s));
    schijf(0, 0.12, 0, 0, 0, 1);
    schijf(0.07, 0.3, 0, 0.3, -0.5, 0.85);
    schijf(-0.07, 0.29, 0.02, -0.4, 0.45, 0.8);
    schijf(0.13, 0.44, 0.01, 0.1, -0.2, 0.6);
    b.bol('vlak', 0xd8443a, 0.12, 0.53, 0, 0.02, 0.025, 0.02, 5, 3);
    return b.geometrie();
  }

  const maisGeo = () => MC.eenVorm(function (b) {
    b.kegel('gewas', 0xffffff, 0, 0, 0, 0.075, 0.82, 4, { plat: true });
    b.kegel('gewas', 0xdfe8c8, 0, 0.12, 0, 0.1, 0.42, 3, { plat: true, ry: 0.8 });
  });

  const groenteGeo = () => MC.eenVorm(function (b) {
    b.bol('gewas', 0xffffff, 0, 0.06, 0, 0.12, 0.09, 0.12, 7, 5);
  });

  const bloemGeo = () => MC.eenVorm(function (b) {
    b.cil('vlak', 0x4a7a2e, 0, 0, 0, 0.012, 0.012, 0.12, 4);
    b.bol('vlak', 0xffffff, 0, 0.14, 0, 0.065, 0.05, 0.065, 6, 4);
  });

  const rietGeo = () => MC.eenVorm(function (b) {
    b.kegel('gewas', 0xffffff, 0, 0, 0, 0.03, 0.8, 3, { plat: true });
    b.kegel('gewas', 0xffffff, 0.05, 0, 0.03, 0.025, 0.65, 3, { plat: true });
    b.bol('vlak', 0x6b5236, 0.0, 0.75, 0, 0.025, 0.06, 0.025, 4, 3);
  });

  // Eenheidsdoos met de onderkant op y = 0, voor kavels van elke maat.
  const doosGeo = (mat) => MC.eenVorm(function (b) {
    b.doos(mat || 'vlak', 0xffffff, 0, 0, 0, 1, 1, 1);
  });

  // Marktkraam: palen met een doek in de tint van de instantie, en waren op een mat.
  function kraam() {
    const b = new MC.Bouwer();
    b.doos('vlak', 0xc9b27e, 0, 0, 0, 0.7, 0.02, 0.5);
    for (const [x, z] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) b.doos('vlak', 0x7a5a3a, x, 0, z, 0.03, 0.5, 0.03);
    b.doos('vlak', 0xffffff, 0, 0.5, 0, 0.74, 0.03, 0.54, { rx: 0.12 });
    const waren = [0xe0a92c, 0x7cb552, 0xc8452c, 0xe8c85a, 0x8a5a3a, 0x3d8f8a];
    for (let k = 0; k < 6; k++) {
      const x = -0.22 + (k % 3) * 0.22, z = k < 3 ? -0.1 : 0.1;
      b.bol('vlak', waren[k], x, 0.04, z, 0.08, 0.05, 0.07, 6, 4);
    }
    b.cil('vlak', 0xa0603a, 0.3, 0, 0.32, 0.06, 0.05, 0.12, 7);
    return b.geometrie();
  }

  // -------------------------------------------------------------- vaartuigen

  // Kano (acalli) met roeier; met lading heeft hij een bundel groen aan boord.
  function kano(lading) {
    const b = new MC.Bouwer();
    b.doos('vlak', 0x3a2a1c, 0, -0.04, 0, 0.9, 0.09, 0.17);
    b.doos('vlak', 0x2e2016, 0.47, -0.04, 0, 0.1, 0.07, 0.1, { ry: 0.78 });
    b.doos('vlak', 0x6a5236, 0, 0.05, 0, 0.74, 0.01, 0.12);
    b.cil('vlak', 0xece3cf, -0.25, 0.05, 0, 0.03, 0.04, 0.1, 6);
    b.bol('vlak', 0x2a1e16, -0.25, 0.19, 0, 0.028, 0.028, 0.028, 6, 4);
    b.doos('vlak', 0x5a4630, -0.2, 0.0, 0.07, 0.015, 0.34, 0.015, { rx: 0.5, rz: 0.4 });
    if (lading) {
      b.bol('vlak', 0x7fae4a, 0.12, 0.09, 0, 0.16, 0.06, 0.07, 7, 4);
      b.bol('vlak', 0xd8a23a, 0.3, 0.08, 0, 0.06, 0.05, 0.05, 6, 4);
    }
    return b.geometrie();
  }

  // ------------------------------------------------------------------ mensen

  const lijfGeo = () => MC.eenVorm(function (b) {
    b.cil('vlak', 0xffffff, 0, 0, 0, 0.04, 0.06, 0.15, 6);
    b.cil('vlak', 0xffffff, 0, 0.15, 0, 0.045, 0.04, 0.04, 6);
  });
  const hoofdGeo = () => MC.eenVorm(function (b) {
    b.bol('vlak', 0xffffff, 0, 0.225, 0, 0.032, 0.036, 0.032, 6, 4);
    b.bol('vlak', 0x7a7a7a, 0, 0.245, -0.008, 0.034, 0.022, 0.034, 6, 3);
  });

  // Reiger: slanke vogel met gespreide vleugels (voorkant naar +x).
  const vogelGeo = () => MC.eenVorm(function (b) {
    b.bol('vlak', 0xf2f2ee, 0, 0, 0, 0.16, 0.035, 0.035, 6, 4);
    b.doos('vlak', 0xe8e8e2, -0.02, -0.01, 0, 0.12, 0.012, 0.62);
    b.doos('vlak', 0x3a3a3a, -0.05, -0.01, 0, 0.05, 0.013, 0.64);
    b.doos('vlak', 0xe0a030, 0.2, 0, 0, 0.1, 0.012, 0.012);
  });

  // ------------------------------------------------------------------ series

  MC.maakSeries = function () {
    MC.S = {
      huis: new MC.Serie(huis(), 'Woonhuis'),
      adobe: new MC.Serie(adobe(), 'Adobehuis'),
      hut: new MC.Serie(hut(), 'Rieten hut'),
      patio: new MC.Serie(patiohuis(), 'Patiohuis'),
      wijktempel: new MC.Serie(wijktempel(), 'Wijktempel'),
      temazcal: new MC.Serie(temazcal(), 'Temazcal'),
      wilg: new MC.Serie(wilg(), 'Ahuejote'),
      ahuehuete: new MC.Serie(ahuehuete(), 'Ahuehuete'),
      agave: new MC.Serie(agave(), 'Maguey', { pick: false }),
      nopal: new MC.Serie(nopal(), 'Nopal', { pick: false }),
      kraam: new MC.Serie(kraam(), 'Marktkraam'),
      mais: new MC.Serie(maisGeo(), 'Maïs', { pick: false }),
      groente: new MC.Serie(groenteGeo(), 'Groente', { pick: false }),
      bloem: new MC.Serie(bloemGeo(), 'Bloemen', { pick: false, schaduw: false }),
      riet: new MC.Serie(rietGeo(), 'Riet', { pick: false }),
      kavelRand: new MC.Serie(doosGeo('vlak'), 'Chinampa'),
      kavelTop: new MC.Serie(doosGeo('vlak'), 'Chinampa', { schaduw: false }),
      kanoStil: new MC.Serie(kano(true), 'Kano', { pick: false }),
      // bewegend
      kano: new MC.Serie(kano(false), 'Kano', { beweegt: true, pick: false }),
      kanoVol: new MC.Serie(kano(true), 'Kano met oogst', { beweegt: true, pick: false }),
      lijf: new MC.Serie(lijfGeo(), 'Voorbijganger', { beweegt: true, pick: false }),
      hoofd: new MC.Serie(hoofdGeo(), 'Voorbijganger', { beweegt: true, pick: false, schaduw: false }),
      vogel: new MC.Serie(vogelGeo(), 'Reiger', { beweegt: true, pick: false, schaduw: false })
    };
  };

  MC.bouwSeries = function (ouder) {
    for (const k in MC.S) MC.S[k].bouw(ouder);
  };
})(window.MC);

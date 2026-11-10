/* De gebouwen van de kolonie. Elke bouwer levert een THREE.Group met de voet
   op y = 0; de spelcode zet die groep op de planeet en draait hem mee met de
   normaal. Bewegende onderdelen (zonnepanelen, de pompjack, een schip) staan
   in group.userData.refs. */

(function (BNW) {
  'use strict';
  if (!window.THREE) return;

  // ---------------------------------------------------------- materialen

  function std(kleur, ruw, metaal, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({
      color: kleur, roughness: ruw, metalness: metaal, flatShading: true
    }, extra || {}));
  }

  const MAT = {
    romp:    std(0xd8dee4, 0.45, 0.25),
    donker:  std(0x454f58, 0.60, 0.45),
    staal:   std(0x9aa4ae, 0.35, 0.65),
    oranje:  std(0xff8b45, 0.50, 0.10),
    rood:    std(0xb3413a, 0.55, 0.10),
    aarde:   std(0x6b5a45, 0.95, 0.00),
    gewas:   std(0x5cbf58, 0.85, 0.00),
    hout:    std(0x7a5a3a, 0.85, 0.00),
    erts:    std(0x8a6b52, 0.90, 0.05),
    olie:    std(0x17140f, 0.35, 0.15),
    kunststof: std(0x2f8f86, 0.35, 0.10),
    elektro: std(0x2c6fbf, 0.30, 0.35),
    glas: new THREE.MeshStandardMaterial({
             color: 0x9fe4ff, roughness: 0.08, metalness: 0.05,
             transparent: true, opacity: 0.35, side: THREE.DoubleSide
           }),
    raam:    std(0xffd9a0, 0.4, 0.0, { emissive: 0xffb257, emissiveIntensity: 1.0 }),
    lamp:    std(0xff8b45, 0.5, 0.0, { emissive: 0xff6a1e, emissiveIntensity: 1.2 }),
    vlam:    new THREE.MeshBasicMaterial({ color: 0xffc46a, transparent: true, opacity: 0.9 })
  };

  function deel(geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  // -------------------------------------------------------------- solar

  function bouwZonnepark() {
    const g = new THREE.Group();
    g.add(deel(new THREE.CylinderGeometry(1.5, 1.65, 0.14, 14), MAT.donker, 0, 0.07, 0));

    const rij = new THREE.Group();
    g.add(rij);
    [-0.95, 0, 0.95].forEach(function (x) {
      const post = deel(new THREE.CylinderGeometry(0.07, 0.07, 0.85, 8), MAT.staal, x, 0.55, 0);
      rij.add(post);
      const paneel = deel(new THREE.BoxGeometry(0.85, 0.06, 1.5), MAT.elektro, x, 0.98, 0);
      paneel.rotation.x = -0.5;
      rij.add(paneel);
      rij.add(deel(new THREE.BoxGeometry(0.85, 0.03, 0.03), MAT.staal, x, 1.14, 0.62));
    });

    g.userData.refs = { arm: rij };
    return g;
  }

  // ------------------------------------------------------------ habitat

  function bouwWoonwijk() {
    const g = new THREE.Group();
    g.add(deel(new THREE.BoxGeometry(3.6, 0.14, 2.6), MAT.donker, 0, 0.07, 0));

    const ramen = [];
    [-1.15, 0, 1.15].forEach(function (x, i) {
      const huis = new THREE.Group();
      huis.position.set(x, 0.14, 0);
      const breed = 0.95;
      huis.add(deel(new THREE.BoxGeometry(breed, 0.7, 1.5), MAT.romp, 0, 0.35, 0));
      const dak = deel(new THREE.ConeGeometry(0.78, 0.5, 4), MAT.rood, 0, 0.95, 0);
      dak.rotation.y = Math.PI / 4;
      huis.add(dak);
      for (let z = -0.5; z <= 0.5; z += 1.0) {
        const raam = deel(new THREE.BoxGeometry(0.05, 0.22, 0.28), MAT.raam, breed / 2 + 0.01, 0.4, z);
        ramen.push(raam);
        huis.add(raam);
        const raam2 = deel(new THREE.BoxGeometry(0.05, 0.22, 0.28), MAT.raam, -breed / 2 - 0.01, 0.4, z);
        ramen.push(raam2);
        huis.add(raam2);
      }
      huis.add(deel(new THREE.BoxGeometry(0.3, 0.02, 0.02), MAT.staal, 0, 1.25, 0.1));
      g.add(huis);
    });

    g.userData.refs = { ramen: ramen };
    return g;
  }

  // ---------------------------------------------------------------- akker

  function bouwAkker() {
    const g = new THREE.Group();
    g.add(deel(new THREE.BoxGeometry(3.8, 0.12, 2.8), MAT.aarde, 0, 0.06, 0));

    const rijen = [];
    for (let z = -1.05; z <= 1.05; z += 0.42) {
      const geo = new THREE.BoxGeometry(3.4, 0.4, 0.22);
      geo.translate(0, 0.2, 0);
      const rij = deel(geo, MAT.gewas, 0, 0.12, z);
      rij.scale.y = 0.12;
      rijen.push(rij);
      g.add(rij);
    }

    // een silo als herkenningspunt
    const silo = new THREE.Group();
    silo.position.set(-1.9, 0.12, -1.55);
    silo.add(deel(new THREE.CylinderGeometry(0.34, 0.34, 1.3, 12), MAT.romp, 0, 0.65, 0));
    silo.add(deel(new THREE.ConeGeometry(0.36, 0.4, 12), MAT.donker, 0, 1.5, 0));
    g.add(silo);

    g.userData.refs = { rijen: rijen };
    return g;
  }

  // ------------------------------------------------------------ ijzermijn

  function bouwIjzermijn() {
    const g = new THREE.Group();
    g.add(deel(new THREE.BoxGeometry(2.6, 0.14, 2.2), MAT.donker, 0, 0.07, 0));

    // schachttoren met een wiel bovenin
    const toren = new THREE.Group();
    toren.position.set(-0.6, 0.14, -0.2);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      toren.add(deel(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 6), MAT.staal,
        Math.cos(a) * 0.4, 1.1, Math.sin(a) * 0.4));
    }
    toren.add(deel(new THREE.BoxGeometry(0.85, 0.06, 0.06), MAT.staal, 0, 1.9, 0));
    toren.add(deel(new THREE.BoxGeometry(0.06, 0.06, 0.85), MAT.staal, 0, 1.9, 0));
    const wiel = deel(new THREE.TorusGeometry(0.32, 0.05, 8, 16), MAT.staal, 0, 2.25, 0);
    toren.add(wiel);
    toren.add(deel(new THREE.SphereGeometry(0.09, 8, 6), MAT.lamp, 0, 2.6, 0));
    g.add(toren);

    // ertshoop en band naar buiten
    const hoop = deel(new THREE.ConeGeometry(0.55, 0.55, 10), MAT.erts, 0.9, 0.28 + 0.14, 0.7);
    g.add(hoop);
    const band = deel(new THREE.BoxGeometry(1.6, 0.1, 0.4), MAT.staal, 0.4, 0.3, 0.7);
    band.rotation.y = -0.3;
    g.add(band);

    g.userData.refs = { wiel: wiel, hoop: hoop };
    return g;
  }

  // ------------------------------------------------------------ oliebron

  function bouwOliebron() {
    const g = new THREE.Group();
    g.add(deel(new THREE.CylinderGeometry(1.15, 1.25, 0.14, 12), MAT.donker, 0, 0.07, 0));

    // samsonpaal (het a-frame) met de wip erop
    const paal = new THREE.Group();
    paal.position.set(0, 0.14, -0.3);
    [-0.4, 0.4].forEach(function (x) {
      const poot = deel(new THREE.CylinderGeometry(0.05, 0.06, 1.4, 6), MAT.staal, x * 0.5, 0.7, 0);
      poot.rotation.z = x > 0 ? -0.18 : 0.18;
      paal.add(poot);
    });
    paal.add(deel(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6), MAT.staal, 0, 1.5, 0));
    g.add(paal);

    // de wip (walking beam) met paardenkop en contragewicht, draait om de bovenkant
    const wip = new THREE.Group();
    wip.position.set(0, 1.5, -0.3);
    wip.add(deel(new THREE.BoxGeometry(2.6, 0.12, 0.14), MAT.rood, 0, 0, 0));
    wip.add(deel(new THREE.CylinderGeometry(0.22, 0.16, 0.5, 10), MAT.staal, -1.1, -0.1, 0));   // paardenkop
    wip.add(deel(new THREE.BoxGeometry(0.5, 0.4, 0.4), MAT.donker, 1.05, 0.15, 0));               // contragewicht
    g.add(wip);

    // stang naar de put
    const stang = deel(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6), MAT.staal, -1.1, 0.95, -0.3);
    g.add(stang);
    g.add(deel(new THREE.CylinderGeometry(0.18, 0.2, 0.3, 10), MAT.donker, -1.1, 0.22, -0.3));

    // motorhuisje en een klein olievat
    g.add(deel(new THREE.BoxGeometry(0.6, 0.4, 0.5), MAT.romp, 0.9, 0.34, 0.5));
    g.add(deel(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 12), MAT.olie, -0.9, 0.39, 0.7));

    g.userData.refs = { wip: wip, stang: stang };
    return g;
  }

  // --------------------------------------------------------- staalfabriek

  function bouwStaalfabriek() {
    const g = new THREE.Group();
    g.add(deel(new THREE.BoxGeometry(3.0, 0.14, 2.6), MAT.donker, 0, 0.07, 0));
    g.add(deel(new THREE.BoxGeometry(2.4, 1.3, 1.8), MAT.staal, -0.2, 0.79, 0));

    const gloed = deel(new THREE.BoxGeometry(0.5, 0.35, 0.06), MAT.vlam, -0.2, 0.55, 0.93);
    g.add(gloed);

    const schoorstenen = [];
    [-1.0, -0.4].forEach(function (x) {
      const s = deel(new THREE.CylinderGeometry(0.22, 0.26, 1.9, 10), MAT.donker, x, 2.0, -0.5);
      schoorstenen.push(s);
      g.add(s);
      const band = deel(new THREE.TorusGeometry(0.24, 0.04, 6, 12), MAT.oranje, x, 1.1, -0.5);
      band.rotation.x = Math.PI / 2;
      g.add(band);
    });

    g.add(deel(new THREE.ConeGeometry(0.6, 0.5, 10), MAT.erts, 1.15, 0.28 + 0.14, 0.9));

    g.userData.refs = { gloed: gloed, schoorstenen: schoorstenen };
    return g;
  }

  // --------------------------------------------------------- raffinaderij

  function bouwRaffinaderij() {
    const g = new THREE.Group();
    g.add(deel(new THREE.BoxGeometry(3.0, 0.14, 2.6), MAT.donker, 0, 0.07, 0));

    [-0.9, -0.1, 0.7].forEach(function (x, i) {
      const h = 1.1 + (i % 2) * 0.3;
      g.add(deel(new THREE.CylinderGeometry(0.42, 0.42, h, 14), MAT.romp, x, 0.14 + h / 2, -0.3));
      g.add(deel(new THREE.CylinderGeometry(0.44, 0.44, 0.06, 14), MAT.staal, x, 0.14 + h, -0.3));
    });

    // fakkeltoren met een vlammetje
    const toren = deel(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 8), MAT.staal, 1.3, 0.14 + 1.2, 1.0);
    g.add(toren);
    const vlam = deel(new THREE.ConeGeometry(0.16, 0.5, 8), MAT.vlam, 1.3, 0.14 + 2.55, 1.0);
    g.add(vlam);

    // buizen tussen de tanks
    const pijp = deel(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 8), MAT.staal, -0.5, 0.5, -0.3);
    pijp.rotation.z = Math.PI / 2;
    g.add(pijp);

    g.userData.refs = { vlam: vlam };
    return g;
  }

  // ----------------------------------------------------- elektronicafabriek

  function bouwElektronicafabriek() {
    const g = new THREE.Group();
    g.add(deel(new THREE.BoxGeometry(3.2, 0.14, 2.4), MAT.donker, 0, 0.07, 0));
    g.add(deel(new THREE.BoxGeometry(2.9, 1.0, 2.0), MAT.romp, 0, 0.64, 0));

    // een lichtstrook rondom, als een schone-techfabriek
    const strook = deel(new THREE.BoxGeometry(2.92, 0.16, 2.02), MAT.elektro, 0, 0.5, 0);
    g.add(strook);
    g.add(deel(new THREE.BoxGeometry(2.94, 0.02, 2.04), MAT.glas, 0, 0.62, 0));

    // dakopbouw met een schotel en een knipperlicht
    g.add(deel(new THREE.BoxGeometry(0.9, 0.3, 0.7), MAT.staal, 0.8, 1.29, 0));
    const schotel = deel(new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      MAT.romp, -0.7, 1.2, 0);
    schotel.rotation.set(0.6, 0, 0.3);
    g.add(schotel);
    const licht = deel(new THREE.SphereGeometry(0.06, 8, 6), MAT.lamp, 0, 1.48, 0);
    g.add(licht);

    g.userData.refs = { licht: licht };
    return g;
  }

  // -------------------------------------------------------------- haven

  function bouwSchip() {
    const s = new THREE.Group();
    s.add(deel(new THREE.BoxGeometry(0.5, 0.28, 1.5), MAT.staal, 0, 0.14, 0));
    s.add(deel(new THREE.BoxGeometry(0.4, 0.3, 0.5), MAT.romp, 0, 0.42, -0.4));
    s.add(deel(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), MAT.staal, 0, 0.7, -0.4));
    [-0.7, 0, 0.7].forEach(function (z) {
      s.add(deel(new THREE.BoxGeometry(0.42, 0.16, 0.22), MAT.elektro, 0, 0.34, z));
    });
    return s;
  }

  function bouwExporthaven() {
    const g = new THREE.Group();
    g.add(deel(new THREE.BoxGeometry(2.2, 0.14, 2.0), MAT.donker, 0, 0.07, 0));

    // de pier, het water op
    const pier = deel(new THREE.BoxGeometry(1.0, 0.16, 3.4), MAT.hout, 0.3, 0.15, 1.9);
    g.add(pier);
    for (let z = 0.6; z <= 3.4; z += 0.9) {
      [-0.42, 0.42].forEach(function (x) {
        g.add(deel(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), MAT.hout, 0.3 + x, -0.05, z));
      });
    }

    // een kleine kraan
    const kraan = new THREE.Group();
    kraan.position.set(-0.6, 0.14, 0.4);
    kraan.add(deel(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 8), MAT.staal, 0, 0.8, 0));
    const arm = deel(new THREE.BoxGeometry(1.6, 0.1, 0.1), MAT.oranje, 0.7, 1.55, 0);
    kraan.add(arm);
    kraan.add(deel(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), MAT.staal, 1.3, 1.28, 0));
    g.add(kraan);

    const schip = bouwSchip();
    schip.position.set(0.3, 0.23, 2.6);
    g.add(schip);

    g.userData.refs = { schip: schip, kraan: arm };
    return g;
  }

  // ------------------------------------------------------------ definities

  const DEFS = {
    solar: {
      naam: 'Zonnepark', glyph: '◫', kosten: 50,
      omschrijving: 'Levert stroom zolang de zon erop schijnt, en vergroot de accu.',
      opwekking: 4.2, accu: 70,
      bouw: bouwZonnepark
    },
    habitat: {
      naam: 'Woonwijk', glyph: '⌂', kosten: 130,
      omschrijving: 'Onderdak voor zes kolonisten. Heeft zelf wat stroom en voedsel nodig.',
      stroom: -0.4, woonruimte: 6,
      bouw: bouwWoonwijk
    },
    farm: {
      naam: 'Akker', glyph: '❋', kosten: 80,
      omschrijving: 'Verbouwt voedsel op het land. Zonder stroom voor de irrigatie groeit er niets.',
      stroom: -0.5, voedsel: 0.7, voedselOpslag: 50,
      bouw: bouwAkker
    },
    ironmine: {
      naam: 'IJzermijn', glyph: '⛏', kosten: 150,
      omschrijving: 'Wint ijzererts — alleen te bouwen op een ijzeraders (bruine vlek).',
      alleenOp: 'ijzer',
      stroom: -1.6, ijzerWinning: 0.55, ijzerOpslag: 80,
      bouw: bouwIjzermijn
    },
    oilwell: {
      naam: 'Oliebron', glyph: '⛽', kosten: 170,
      omschrijving: 'Pompt ruwe olie op — alleen te bouwen op een olieveld (zwarte vlek).',
      alleenOp: 'olie',
      stroom: -1.4, olieWinning: 0.48, olieOpslag: 80,
      bouw: bouwOliebron
    },
    steelmill: {
      naam: 'Staalfabriek', glyph: '▦', kosten: 260,
      omschrijving: 'Smelt ijzererts om tot staal. Verbruikt meer erts dan er staal uitkomt.',
      stroom: -2.2, ijzerVerbruik: 0.6, staalProductie: 0.4, staalOpslag: 60,
      bouw: bouwStaalfabriek
    },
    refinery: {
      naam: 'Raffinaderij', glyph: '⬢', kosten: 280,
      omschrijving: 'Kraakt ruwe olie tot kunststof.',
      stroom: -2.0, olieVerbruik: 0.55, kunststofProductie: 0.35, kunststofOpslag: 60,
      bouw: bouwRaffinaderij
    },
    electronics: {
      naam: 'Elektronicafabriek', glyph: '◆', kosten: 420,
      omschrijving: 'Bouwt elektronica uit staal en kunststof — verreweg het meest waard op de kade.',
      stroom: -2.6, staalVerbruik: 0.3, kunststofVerbruik: 0.3,
      elektronicaProductie: 0.22, elektronicaOpslag: 40,
      bouw: bouwElektronicafabriek
    },
    harbor: {
      naam: 'Exporthaven', glyph: '⚓', kosten: 200,
      omschrijving: 'Verscheept de voorraad naar de rest van de wereld voor krediet — alleen aan de kust.',
      alleenKust: true,
      stroom: -0.8,
      bouw: bouwExporthaven
    }
  };

  BNW.Buildings = {
    MAT: MAT,
    DEFS: DEFS,
    volgorde: ['solar', 'habitat', 'farm', 'ironmine', 'oilwell', 'steelmill', 'refinery', 'electronics', 'harbor'],
    PRIJZEN: { ijzererts: 0.8, ruweOlie: 0.9, staal: 3.0, kunststof: 2.6, elektronica: 9.0 },
    maak: function (type) {
      const def = DEFS[type];
      const g = def.bouw();
      g.userData.type = type;
      return g;
    }
  };
})(window.BNW);

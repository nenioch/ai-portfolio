/* De modules van het station. Elke bouwer levert een THREE.Group met de voet
   op y = 0; de spelcode zet die groep op het oppervlak van de planetoïde en
   draait hem mee met de normaal. Onderdelen die later nog bewegen (schip,
   meter, montagearm, rotor) worden in group.userData bewaard. */

(function (MB) {
  'use strict';
  if (!window.THREE) return;

  // ---------------------------------------------------------- materialen

  function std(kleur, ruw, metaal, extra) {
    return new THREE.MeshStandardMaterial(Object.assign({
      color: kleur, roughness: ruw, metalness: metaal, flatShading: true
    }, extra || {}));
  }

  const MAT = {
    romp:      std(0xd5dde5, 0.45, 0.25),
    licht:     std(0xeef2f6, 0.55, 0.10),
    donker:    std(0x4d5966, 0.60, 0.45),
    staal:     std(0x8f9aa6, 0.40, 0.60),
    oranje:    std(0xff8b45, 0.50, 0.10),
    rood:      std(0xd8433a, 0.55, 0.10),
    aarde:     std(0x6b6156, 0.95, 0.00),
    paneel:    std(0x1c3c6b, 0.25, 0.70),
    glas:      new THREE.MeshStandardMaterial({
                 color: 0x9fe4ff, roughness: 0.08, metalness: 0.05,
                 transparent: true, opacity: 0.30, side: THREE.DoubleSide
               }),
    raam:      new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb257, emissiveIntensity: 1.0, roughness: 0.4 }),
    lamp:      new THREE.MeshStandardMaterial({ color: 0xff8b45, emissive: 0xff6a1e, emissiveIntensity: 1.2, roughness: 0.5 }),
    laadLamp:  new THREE.MeshStandardMaterial({ color: 0x9dffb0, emissive: 0x3fe06a, emissiveIntensity: 1.3, roughness: 0.4 }),
    vlam:      new THREE.MeshBasicMaterial({ color: 0xffc46a, transparent: true, opacity: 0.9 }),
    // nieuw: zuurstof (groen-cyaan) en water (blauw)
    zuurstof:  std(0xcfe9e2, 0.40, 0.15),
    zuurstofLamp: new THREE.MeshStandardMaterial({ color: 0x6bf0c2, emissive: 0x39d69f, emissiveIntensity: 1.3, roughness: 0.4 }),
    water:     std(0xc9dced, 0.40, 0.15),
    waterLamp: new THREE.MeshStandardMaterial({ color: 0x62b4ff, emissive: 0x2f7fe6, emissiveIntensity: 1.3, roughness: 0.4 })
  };

  function deel(geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  // ------------------------------------------------------- dockingstation

  function bouwDockingstation() {
    const g = new THREE.Group();

    g.add(deel(new THREE.CylinderGeometry(2.35, 2.6, 0.4, 8), MAT.donker, 0, 0.20, 0));
    g.add(deel(new THREE.CylinderGeometry(2.05, 2.05, 0.08, 8), MAT.staal, 0, 0.44, 0));

    // waarschuwingsring van lampjes langs de rand
    const lampjes = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const l = deel(new THREE.SphereGeometry(0.10, 8, 6), MAT.lamp,
        Math.cos(a) * 2.2, 0.5, Math.sin(a) * 2.2);
      lampjes.push(l);
      g.add(l);
    }

    // drie dokklemmen die naar het schip toe wijzen
    const klemmen = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const klem = new THREE.Group();
      klem.position.set(Math.cos(a) * 1.55, 0.48, Math.sin(a) * 1.55);
      klem.rotation.y = -a;
      klem.userData.hoek = a;          // de spelcode schuift ze hierlangs open
      klem.add(deel(new THREE.BoxGeometry(0.55, 0.14, 0.14), MAT.staal, -0.22, 0, 0));
      klem.add(deel(new THREE.BoxGeometry(0.16, 0.16, 0.16), MAT.oranje, -0.48, 0, 0));
      klemmen.push(klem);
      g.add(klem);
    }

    // oprit naar het dek
    const oprit = deel(new THREE.BoxGeometry(1.3, 0.09, 1.7), MAT.donker, 0, 0.24, 2.3);
    oprit.rotation.x = 0.22;
    g.add(oprit);

    // controletoren met baken
    const toren = new THREE.Group();
    toren.position.set(-2.0, 0, 0);
    toren.add(deel(new THREE.BoxGeometry(0.24, 4.8, 0.24), MAT.staal, 0, 2.4, 0));
    toren.add(deel(new THREE.BoxGeometry(1.3, 0.14, 0.14), MAT.staal, 0.65, 2.0, 0));
    toren.add(deel(new THREE.BoxGeometry(1.3, 0.14, 0.14), MAT.staal, 0.65, 3.4, 0));
    toren.add(deel(new THREE.SphereGeometry(0.12, 8, 6), MAT.lamp, 0, 4.9, 0));
    g.add(toren);

    // ---- het vrachtschip
    const schip = new THREE.Group();
    schip.position.y = 0.48;
    schip.add(deel(new THREE.CylinderGeometry(0.30, 0.52, 0.55, 12), MAT.donker, 0, 0.28, 0));
    schip.add(deel(new THREE.CylinderGeometry(0.50, 0.50, 2.1, 14), MAT.romp, 0, 1.60, 0));
    schip.add(deel(new THREE.CylinderGeometry(0.52, 0.52, 0.30, 14), MAT.staal, 0, 2.15, 0));
    // stompe neus, een shuttle dockt neus-eerst in plaats van een raketpunt
    schip.add(deel(new THREE.SphereGeometry(0.50, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.licht, 0, 2.85, 0));

    // cockpitraam
    schip.add(deel(new THREE.BoxGeometry(0.30, 0.22, 0.10), MAT.raam, 0, 2.55, 0.46));

    // brede, platte vleugels in plaats van raketvinnen
    [-1, 1].forEach(function (s) {
      const vleugel = deel(new THREE.BoxGeometry(1.1, 0.06, 0.7), MAT.oranje, s * 0.78, 0.85, -0.1);
      vleugel.rotation.z = s * 0.12;
      schip.add(vleugel);
    });

    const vlam = deel(new THREE.ConeGeometry(0.40, 1.6, 12), MAT.vlam, 0, -0.72, 0);
    vlam.rotation.x = Math.PI;
    vlam.visible = false;
    schip.add(vlam);

    g.add(schip);

    g.userData.refs = { schip: schip, vlam: vlam, lampjes: lampjes, klemmen: klemmen };
    return g;
  }

  // ------------------------------------------------------- geloste vracht

  /* Wat er uit het vrachtruim van het eerste schip komt: kisten met
     bouwmateriaal. Puur decor — ze staan naast het dok en herinneren eraan
     waar de modules vandaan komen. De groep hangt in het dockingstation, dus
     hij staat al goed op de grond. */
  function bouwVracht() {
    const g = new THREE.Group();
    const rnd = MB.rng(4711);

    // laadklep die van het dek is gezakt, tussen de klem en de oprit in
    const klep = deel(new THREE.BoxGeometry(1.0, 0.07, 1.5), MAT.staal, 1.30, 0.30, 1.60);
    klep.rotation.set(0.26, -0.5, 0);
    g.add(klep);

    for (let i = 0; i < 5; i++) {
      const kist = new THREE.Group();
      const b = 0.42 + rnd() * 0.22;
      const h = 0.34 + rnd() * 0.20;
      kist.add(deel(new THREE.BoxGeometry(b, h, b * 0.85), MAT.licht, 0, h / 2, 0));
      kist.add(deel(new THREE.BoxGeometry(b * 1.02, 0.05, b * 0.87), MAT.oranje, 0, h * 0.62, 0));
      const a = -0.35 + i * 0.42 + rnd() * 0.18;
      const r = 2.9 + rnd() * 0.9;
      kist.position.set(Math.cos(a) * r, 0, Math.sin(a) * r + 1.4);
      kist.rotation.y = rnd() * Math.PI;
      // een enkele kist ligt scheef, zoals dat gaat bij uitladen
      if (i === 3) kist.rotation.z = 0.22;
      g.add(kist);
    }

    return g;
  }

  // ---------------------------------------------------- robotwerkplaats

  /* Een open hangar waarin een montagearm nieuwe robots in elkaar zet, met
     laadplaten ervoor en een kleine reactor erachter. */
  function bouwRobotwerkplaats() {
    const g = new THREE.Group();

    g.add(deel(new THREE.BoxGeometry(3.6, 0.3, 3.0), MAT.donker, 0, 0.15, 0));

    // hangar: achterwand, twee zijwanden en een dak; de voorkant is open
    g.add(deel(new THREE.BoxGeometry(2.6, 1.7, 0.16), MAT.romp, 0, 1.15, -0.95));
    [-1.22, 1.22].forEach(function (x) {
      g.add(deel(new THREE.BoxGeometry(0.16, 1.7, 2.0), MAT.romp, x, 1.15, 0));
    });
    g.add(deel(new THREE.BoxGeometry(2.8, 0.14, 2.2), MAT.licht, 0, 2.06, 0));
    g.add(deel(new THREE.BoxGeometry(2.8, 0.1, 0.1), MAT.oranje, 0, 1.96, 1.05));

    // montageplaat met een half afgebouwde robot erop
    g.add(deel(new THREE.CylinderGeometry(0.55, 0.6, 0.12, 14), MAT.staal, 0, 0.36, -0.2));
    g.add(deel(new THREE.BoxGeometry(0.42, 0.36, 0.34), MAT.licht, 0, 0.6, -0.2));
    g.add(deel(new THREE.SphereGeometry(0.06, 8, 6), MAT.raam, 0, 0.66, -0.02));

    // montagearm aan het dak die heen en weer zwaait
    const arm = new THREE.Group();
    arm.position.set(0, 1.98, -0.2);
    arm.add(deel(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8), MAT.staal, 0, -0.25, 0));
    const knik = deel(new THREE.BoxGeometry(0.12, 0.12, 0.7), MAT.oranje, 0, -0.5, 0.3);
    knik.rotation.x = 0.7;
    arm.add(knik);
    arm.add(deel(new THREE.ConeGeometry(0.07, 0.2, 6), MAT.lamp, 0, -0.78, 0.55));
    g.add(arm);

    // twee laadplaten voor de hangar
    [-0.75, 0.75].forEach(function (x) {
      g.add(deel(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 14), MAT.donker, x, 0.33, 1.35));
      const ring = deel(new THREE.TorusGeometry(0.36, 0.04, 6, 18), MAT.laadLamp, x, 0.37, 1.35);
      ring.rotation.x = -Math.PI / 2;
      g.add(ring);
    });

    // reactortje achter de hangar: basisstroom, dag en nacht
    g.add(deel(new THREE.CylinderGeometry(0.38, 0.42, 0.9, 12), MAT.staal, 1.15, 0.75, -1.35));
    const band = deel(new THREE.TorusGeometry(0.4, 0.05, 6, 16), MAT.lamp, 1.15, 0.95, -1.35);
    band.rotation.x = -Math.PI / 2;
    g.add(band);

    // antenne voor de afstandsbediening vanaf aarde
    g.add(deel(new THREE.CylinderGeometry(0.045, 0.045, 1.0, 6), MAT.staal, -0.9, 2.6, -0.6));
    const schotel = deel(new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      MAT.licht, -0.9, 3.05, -0.6);
    schotel.rotation.set(0.6, 0, 0.35);
    g.add(schotel);

    g.userData.refs = { arm: arm };
    return g;
  }

  // ------------------------------------------------------- brandstoftank

  function bouwBrandstoftank() {
    const g = new THREE.Group();

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      g.add(deel(new THREE.CylinderGeometry(0.10, 0.12, 0.62, 6), MAT.staal,
        Math.cos(a) * 0.85, 0.31, Math.sin(a) * 0.85));
    }
    g.add(deel(new THREE.CylinderGeometry(1.25, 1.25, 0.16, 16), MAT.donker, 0, 0.66, 0));

    g.add(deel(new THREE.CylinderGeometry(0.95, 0.95, 2.2, 18), MAT.romp, 0, 1.84, 0));
    g.add(deel(new THREE.SphereGeometry(0.95, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.romp, 0, 2.94, 0));
    const onder = deel(new THREE.SphereGeometry(0.95, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.romp, 0, 0.74, 0);
    onder.rotation.x = Math.PI;
    g.add(onder);

    [1.25, 2.45].forEach(function (y) {
      const t = deel(new THREE.TorusGeometry(0.97, 0.06, 8, 24), MAT.oranje, 0, y, 0);
      t.rotation.x = -Math.PI / 2;
      g.add(t);
    });

    // leiding naar buiten
    const pijp = deel(new THREE.CylinderGeometry(0.13, 0.13, 1.5, 10), MAT.staal, 0, 0.5, 1.3);
    pijp.rotation.x = Math.PI / 2;
    g.add(pijp);
    g.add(deel(new THREE.BoxGeometry(0.5, 0.5, 0.4), MAT.donker, 0, 0.45, 2.1));

    // peilglas: een staafje dat met de vulling meegroeit
    const achter = deel(new THREE.BoxGeometry(0.30, 1.9, 0.10), MAT.donker, 0, 1.85, 0.96);
    g.add(achter);
    const meterGeo = new THREE.BoxGeometry(0.20, 1.8, 0.10);
    meterGeo.translate(0, 0.9, 0);                       // groeit vanaf de onderkant
    const meter = deel(meterGeo, MAT.lamp, 0, 0.92, 1.00);
    meter.scale.y = 0.001;
    g.add(meter);

    g.add(deel(new THREE.SphereGeometry(0.10, 8, 6), MAT.lamp, 0, 3.05, 0));

    g.userData.refs = { meter: meter };
    return g;
  }


  // --------------------------------------------------------- zonnepaneel

  function bouwZonnepaneel() {
    const g = new THREE.Group();

    g.add(deel(new THREE.CylinderGeometry(0.38, 0.5, 0.26, 10), MAT.donker, 0, 0.13, 0));
    g.add(deel(new THREE.CylinderGeometry(0.10, 0.10, 1.1, 8), MAT.staal, 0, 0.7, 0));

    const arm = new THREE.Group();
    arm.position.y = 1.25;
    arm.rotation.x = -0.55;
    arm.add(deel(new THREE.BoxGeometry(2.8, 0.09, 1.6), MAT.paneel, 0, 0, 0));
    for (let i = -1; i <= 1; i++) {
      arm.add(deel(new THREE.BoxGeometry(0.05, 0.11, 1.6), MAT.staal, i * 0.7, 0, 0));
    }
    arm.add(deel(new THREE.BoxGeometry(2.9, 0.05, 0.06), MAT.staal, 0, 0, 0.8));
    arm.add(deel(new THREE.BoxGeometry(2.9, 0.05, 0.06), MAT.staal, 0, 0, -0.8));
    g.add(arm);

    g.userData.refs = { arm: arm };
    return g;
  }

  // -------------------------------------------------------- zuurstoffabriek

  function bouwZuurstoffabriek() {
    const g = new THREE.Group();

    g.add(deel(new THREE.BoxGeometry(2.6, 0.28, 1.9), MAT.donker, 0, 0.14, 0));

    // twee elektrolyse-tanks
    const tanks = [];
    [-0.62, 0.62].forEach(function (x) {
      const tank = deel(new THREE.CylinderGeometry(0.46, 0.46, 1.5, 14), MAT.zuurstof, x, 1.03, 0);
      g.add(tank);
      g.add(deel(new THREE.SphereGeometry(0.46, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.zuurstof, x, 1.78, 0));
      const band = deel(new THREE.TorusGeometry(0.47, 0.045, 6, 18), MAT.zuurstofLamp, x, 1.35, 0);
      band.rotation.x = -Math.PI / 2;
      g.add(band);
      tanks.push(tank);
    });

    // compressor met draaiende rotorbladen bovenop, in het midden
    const compressor = deel(new THREE.CylinderGeometry(0.34, 0.4, 0.4, 12), MAT.staal, 0, 2.15, 0);
    g.add(compressor);
    const rotor = new THREE.Group();
    rotor.position.set(0, 2.38, 0);
    for (let i = 0; i < 4; i++) {
      const blad = deel(new THREE.BoxGeometry(0.55, 0.04, 0.13), MAT.zuurstofLamp, 0, 0, 0);
      blad.rotation.y = (i / 4) * Math.PI * 2;
      rotor.add(blad);
    }
    g.add(rotor);

    // leidingen tussen de tanks en de compressor
    [-1, 1].forEach(function (s) {
      const pijp = deel(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 8), MAT.staal, s * 0.62, 2.0, 0);
      pijp.rotation.z = s * 0.55;
      g.add(pijp);
    });

    // peilglas voor de zuurstofvoorraad
    const achter = deel(new THREE.BoxGeometry(0.26, 1.3, 0.10), MAT.donker, 0, 0.95, 0.62);
    g.add(achter);
    const meterGeo = new THREE.BoxGeometry(0.17, 1.22, 0.10);
    meterGeo.translate(0, 0.61, 0);
    const meter = deel(meterGeo, MAT.zuurstofLamp, 0, 0.34, 0.64);
    meter.scale.y = 0.001;
    g.add(meter);

    g.userData.refs = { rotor: rotor, meter: meter };
    return g;
  }

  // ----------------------------------------------------------- waterfabriek

  function bouwWaterfabriek() {
    const g = new THREE.Group();

    g.add(deel(new THREE.CylinderGeometry(1.15, 1.15, 0.16, 16), MAT.donker, 0, 0.66, 0));

    // opslagtank
    g.add(deel(new THREE.CylinderGeometry(0.85, 0.85, 2.0, 18), MAT.water, 0, 1.72, 0));
    g.add(deel(new THREE.SphereGeometry(0.85, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.water, 0, 2.72, 0));
    const onder = deel(new THREE.SphereGeometry(0.85, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.water, 0, 0.74, 0);
    onder.rotation.x = Math.PI;
    g.add(onder);

    [1.15, 2.25].forEach(function (y) {
      const t = deel(new THREE.TorusGeometry(0.87, 0.055, 8, 24), MAT.waterLamp, 0, y, 0);
      t.rotation.x = -Math.PI / 2;
      g.add(t);
    });

    // winningsboor die schuin het gesteente in gaat, met een draaiende punt
    const boorArm = new THREE.Group();
    boorArm.position.set(1.55, 0.35, 0.6);
    boorArm.rotation.z = -0.85;
    boorArm.rotation.y = 0.3;
    boorArm.add(deel(new THREE.CylinderGeometry(0.10, 0.10, 1.3, 8), MAT.staal, 0, 0.5, 0));
    const boor = deel(new THREE.ConeGeometry(0.14, 0.5, 8), MAT.staal, 0, -0.1, 0);
    boorArm.add(boor);
    g.add(boorArm);

    // leiding van de boor naar de tank
    const pijp = deel(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 10), MAT.staal, 0.75, 0.75, 0.35);
    pijp.rotation.z = 0.7;
    g.add(pijp);

    // peilglas voor de watervoorraad
    const achter = deel(new THREE.BoxGeometry(0.28, 1.7, 0.10), MAT.donker, 0, 1.68, 0.88);
    g.add(achter);
    const meterGeo = new THREE.BoxGeometry(0.19, 1.6, 0.10);
    meterGeo.translate(0, 0.8, 0);
    const meter = deel(meterGeo, MAT.waterLamp, 0, 0.82, 0.90);
    meter.scale.y = 0.001;
    g.add(meter);

    g.add(deel(new THREE.SphereGeometry(0.09, 8, 6), MAT.waterLamp, 0, 2.82, 0));

    g.userData.refs = { boor: boor, meter: meter };
    return g;
  }

  // ------------------------------------------------------- regolietgraver

  function bouwRegolietgraver() {
    const g = new THREE.Group();

    g.add(deel(new THREE.BoxGeometry(2.4, 0.3, 1.8), MAT.donker, 0, 0.15, 0));

    // trechter en sinteroven waar het gruis tot bouwblokken wordt gebakken
    g.add(deel(new THREE.BoxGeometry(1.2, 1.0, 1.1), MAT.romp, -0.5, 0.8, 0));
    g.add(deel(new THREE.CylinderGeometry(0.62, 0.3, 0.6, 4), MAT.staal, -0.5, 1.6, 0));
    g.add(deel(new THREE.BoxGeometry(0.5, 0.18, 0.9), MAT.lamp, -0.5, 0.75, 0.56));

    // transportband van het graafwiel naar de trechter
    const band = deel(new THREE.BoxGeometry(1.9, 0.12, 0.4), MAT.staal, 0.55, 1.15, 0);
    band.rotation.z = -0.5;
    g.add(band);

    // graafwiel met bakken aan het eind van de band
    const wiel = new THREE.Group();
    wiel.position.set(1.4, 0.65, 0);
    wiel.add(deel(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 12), MAT.oranje, 0, 0, 0));
    wiel.children[0].rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      wiel.add(deel(new THREE.BoxGeometry(0.22, 0.22, 0.26), MAT.donker,
        Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0));
    }
    g.add(wiel);

    // hoopje gezeefd regoliet naast de oven
    g.add(deel(new THREE.ConeGeometry(0.5, 0.45, 9), MAT.aarde, -0.6, 0.52, -0.95));

    g.userData.refs = { wiel: wiel };
    return g;
  }

  // ------------------------------------------------------------ definities

  /* Geld is niets waard op een kale rots: bouwen kost grondstoffen. Regoliet
     (gesinterd maangruis) is het bouwmateriaal; wie verder uitbreidt heeft ook
     water, zuurstof of brandstof nodig om een module te vullen. */
  const DEFS = {
    dockingstation: {
      naam: 'Dockingstation',
      glyph: '⚓',
      kosten: { regoliet: 150, brandstof: 40 },
      omschrijving: 'Hier koppelen vrachtschepen aan. Stuur er een met 60 brandstof naar de naburige brokstukken; het komt terug met een lading regoliet.',
      stroom: -0.3,
      bouw: bouwDockingstation
    },
    regolithmine: {
      naam: 'Regolietgraver',
      glyph: '⛏',
      kosten: { regoliet: 45 },
      omschrijving: 'Graaft maangruis af en bakt het tot bouwblokken. Zonder regoliet bouw je niets bij.',
      stroom: -0.7,
      regoliet: 0.45,
      bouw: bouwRegolietgraver
    },
    // de sleutel heet nog 'habitat' zodat oude saves hun woonmodules terugkrijgen
    habitat: {
      naam: 'Robotwerkplaats',
      glyph: '⚙',
      kosten: { regoliet: 110 },
      omschrijving: 'Zet nieuwe robots in elkaar van 30 regoliet per stuk en biedt laadplaatsen aan vier. De kleine reactor levert wat basisstroom, dag en nacht.',
      stroom: 0.9,
      robotplaatsen: 4,
      bouw: bouwRobotwerkplaats
    },
    fueltank: {
      naam: 'Brandstoftank',
      glyph: '⬤',
      kosten: { regoliet: 80, water: 15 },
      omschrijving: 'Maakt raketbrandstof van water en zuurstof en slaat 100 eenheden op. Stopt vanzelf als de tank vol is. Slurpt stroom.',
      stroom: -1.3,
      brandstof: 0.8,
      verbruik: { water: 0.4, zuurstof: 0.3 },
      brandstofOpslag: 100,
      bouw: bouwBrandstoftank
    },
    solar: {
      naam: 'Zonnepaneel',
      glyph: '◫',
      kosten: { regoliet: 40 },
      omschrijving: 'Levert stroom zolang de zon op het station schijnt, en vergroot de accu.',
      opwekking: 3.6,
      accu: 60,
      bouw: bouwZonnepaneel
    },
    oxygenplant: {
      naam: 'Zuurstoffabriek',
      glyph: '☁',
      kosten: { regoliet: 70 },
      omschrijving: 'Splitst zuurstof uit het gesteente en slaat 50 eenheden op. Robots ademen niet; de zuurstof is oxidator voor de raketbrandstof. Slurpt stroom.',
      stroom: -1.0,
      zuurstof: 0.7,
      zuurstofOpslag: 50,
      bouw: bouwZuurstoffabriek
    },
    waterplant: {
      naam: 'Waterfabriek',
      glyph: '≋',
      kosten: { regoliet: 65 },
      omschrijving: 'Boort waterijs uit de planetoïde en smelt het; 60 eenheden opslag. Water gaat naar de brandstoftanks en de bouw.',
      stroom: -0.8,
      water: 0.65,
      waterOpslag: 60,
      bouw: bouwWaterfabriek
    }
  };

  MB.Buildings = {
    MAT: MAT,
    DEFS: DEFS,
    vracht: bouwVracht,
    volgorde: ['solar', 'regolithmine', 'oxygenplant', 'waterplant', 'fueltank', 'habitat', 'dockingstation'],
    maak: function (type) {
      const def = DEFS[type];
      const g = def.bouw();
      g.userData.type = type;
      return g;
    }
  };
})(window.MB);

/* De planeet: een bol met continenten en oceanen, en een vaste verzameling
   bouwplekken op het land — waarvan er een aantal een ijzer- of oliebron
   herbergen. Anders dan de kale maan uit maanbasis is dit geen enkele
   vlakke basis, maar een hele wereld: je mag overal op het land bouwen.

   De vorm komt uit dezelfde soort ruisformule als het aardse bolletje in de
   achtergrond van maanbasis (zie world.js daar), maar nu is dít de planeet
   waar je op staat. Drempelwaarde en aantal bouwplekken zijn vooraf in Node
   doorgerekend (los van three.js) om op ongeveer 38% land en een stuk of
   twintig grondstofplekken uit te komen. */

(function (BNW) {
  'use strict';
  if (!window.THREE) return;

  const R = 26;                    // straal van de planeet
  const DETAIL = 32;               // zoals de maan: 20 * (33)^2 ≈ 21.800 driehoeken
  const CONTINENT_DREMPEL = 0.115; // boven deze ruiswaarde is het land

  // --------------------------------------------------------------- vorm

  function continentRuis(d) {
    return (
      Math.sin(d.x * 2.1 + 0.7) * Math.sin(d.y * 1.8 + 1.9) * Math.sin(d.z * 2.4 + 0.3) +
      0.5 * Math.sin(d.x * 4.3 + 2.2) * Math.sin(d.y * 3.9 + 0.4) * Math.sin(d.z * 4.6 + 1.1) +
      0.25 * Math.sin(d.x * 8.1 + 0.4) * Math.sin(d.y * 7.5 + 5.2) * Math.sin(d.z * 7.8 + 2.6)
    );
  }

  function bergRuis(d) {
    return (
      0.5 * Math.sin(d.x * 9.1 + 1.1) * Math.sin(d.y * 8.4 + 2.7) * Math.sin(d.z * 8.9 + 0.4) +
      0.25 * Math.sin(d.x * 18.0 + 3.0) * Math.sin(d.y * 16.0 + 1.0) * Math.sin(d.z * 17.0 + 2.0)
    );
  }

  function isLand(d) { return continentRuis(d) > CONTINENT_DREMPEL; }

  /* Hoogte (afstand tot het middelpunt) voor een genormaliseerde richting.
     Land steekt licht boven de straal uit met wat zacht reliëf; oceanen
     liggen als een kom eronder. De kustlijn zelf loopt vloeiend in elkaar
     over, geen harde rand. */
  function hoogteBij(d) {
    const c = continentRuis(d);
    const landT = BNW.smoothstep(CONTINENT_DREMPEL - 0.02, CONTINENT_DREMPEL + 0.03, c);
    const landHoogte = R + 0.15 + bergRuis(d) * 0.55;
    const zeeHoogte = R - 0.55;
    return BNW.lerp(zeeHoogte, landHoogte, landT);
  }

  // ------------------------------------------------------ orientatie

  /* In tegenstelling tot de maan (met één vaste basisrichting) mag hier
     overal gebouwd worden: elk gebouw richt zich zelf op het noorden. Vlak
     bij de polen bestaat "noorden" niet meer; dan valt hij terug op een
     vaste as, wat daar toch nauwelijks opvalt. */
  const NOORD = new THREE.Vector3(0, 1, 0);

  function orientatie(dir) {
    const up = dir.clone();
    let fwd = NOORD.clone().addScaledVector(up, -NOORD.dot(up));
    if (fwd.lengthSq() < 1e-8) fwd = new THREE.Vector3(1, 0, 0).addScaledVector(up, -up.x);
    fwd.normalize();

    const x = new THREE.Vector3().crossVectors(up, fwd).normalize();
    const z = new THREE.Vector3().crossVectors(x, up).normalize();
    const m = new THREE.Matrix4().makeBasis(x, up, z);
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }

  function puntOpOppervlak(dir) {
    return dir.clone().multiplyScalar(hoogteBij(dir));
  }

  /* Een lokaal tangentieel stelsel rond een middelpunt — hetzelfde principe
     als het vlakke u/v-stelsel van de maanbasis, maar hier per gebouw in
     plaats van rond één vaste basis. De kolonisten van elke woonwijk lopen
     in zo'n eigen stelsel rond, zodat colonists.js vrijwel ongewijzigd kan
     blijven. */
  function maakVlak(middelpunt) {
    const c = middelpunt.clone().normalize();
    const tanU = new THREE.Vector3(0, 1, 0).cross(c);
    if (tanU.lengthSq() < 1e-8) tanU.set(1, 0, 0).cross(c);
    tanU.normalize();
    const tanV = new THREE.Vector3().crossVectors(c, tanU).normalize();

    return {
      centrum: c,
      richtingUitOffset: function (u, v) {
        const off = new THREE.Vector3().addScaledVector(tanU, u).addScaledVector(tanV, v);
        const len = off.length();
        if (len < 1e-6) return c.clone();
        const hoek = len / R;
        return c.clone()
          .multiplyScalar(Math.cos(hoek))
          .addScaledVector(off.multiplyScalar(1 / len), Math.sin(hoek))
          .normalize();
      },
      // de inverse: waar ligt een willekeurige richting in dit u/v-stelsel?
      projecteer: function (dir) {
        const hoek = Math.acos(BNW.clamp(dir.dot(c), -1, 1));
        if (hoek < 1e-6) return { u: 0, v: 0 };
        const tang = dir.clone().addScaledVector(c, -dir.dot(c));
        const tl = tang.length();
        if (tl < 1e-8) return { u: 0, v: 0 };
        tang.multiplyScalar(1 / tl);
        const r = hoek * R;
        return { u: tang.dot(tanU) * r, v: tang.dot(tanV) * r };
      }
    };
  }

  // --------------------------------------------------------- bouwplekken

  /* Fibonacci-bol: een vrijwel gelijkmatige verdeling van punten, veel
     goedkoper dan willekeurig strooien en filteren. */
  function fibonacciBol(n) {
    const punten = [];
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = ga * i;
      punten.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
    }
    return punten;
  }

  // ligt er water binnen een paar stappen? gebruikt voor een havenmarkering
  function kustBij(dir) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const buur = new THREE.Vector3(
        dir.x + Math.cos(a) * 0.09, dir.y, dir.z + Math.sin(a) * 0.09
      ).normalize();
      if (!isLand(buur)) return true;
    }
    return false;
  }

  const N_PUNTEN = 240;
  const SLOTS = [];
  (function bouwSlots() {
    const ruw = fibonacciBol(N_PUNTEN);
    ruw.forEach(function (dir, i) {
      if (!isLand(dir)) return;
      const h1 = BNW.hash(i * 7.13);
      let soort = 'land';
      if (h1 < 0.11) soort = 'ijzer';
      else if (h1 < 0.20) soort = 'olie';
      SLOTS.push({
        index: SLOTS.length, dir: dir, soort: soort,
        kust: soort === 'land' && kustBij(dir), bezet: null
      });
    });
  })();

  // -------------------------------------------------------------- mesh

  function bouwMesh() {
    const geo = new THREE.IcosahedronGeometry(R, DETAIL);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const h = hoogteBij(v);
      pos.setXYZ(i, v.x * h, v.y * h, v.z * h);
    }

    const ijzerSlots = SLOTS.filter((s) => s.soort === 'ijzer');
    const olieSlots = SLOTS.filter((s) => s.soort === 'olie');
    const PATCH = 0.05;   // hoekstraal van een grondstofplek, in radialen

    const kleuren = new Float32Array(pos.count * 3);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const oceaanDiep = new THREE.Color(0x123a63);
    const oceaanOndiep = new THREE.Color(0x1c6f96);
    const laagland = new THREE.Color(0x3f7a44);
    const hoogland = new THREE.Color(0x8a7f5f);
    const sneeuw = new THREE.Color(0xe8ecef);
    const ijzerKleur = new THREE.Color(0x6e5b4f);
    const olieKleur = new THREE.Color(0x18140f);
    const kleur = new THREE.Color();

    for (let f = 0; f < pos.count / 3; f++) {
      a.fromBufferAttribute(pos, f * 3);
      b.fromBufferAttribute(pos, f * 3 + 1);
      c.fromBufferAttribute(pos, f * 3 + 2);
      const mid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
      const straal = mid.length();
      const dir = mid.clone().normalize();
      const cont = continentRuis(dir);
      const landT = BNW.smoothstep(CONTINENT_DREMPEL - 0.02, CONTINENT_DREMPEL + 0.03, cont);

      if (landT < 0.5) {
        const diepte = BNW.smoothstep(R - 0.55, R - 0.05, straal);
        kleur.copy(oceaanDiep).lerp(oceaanOndiep, diepte);
      } else {
        const hoogte = BNW.clamp((straal - (R + 0.15)) / 0.55, 0, 1);
        kleur.copy(laagland).lerp(hoogland, BNW.smoothstep(0.35, 0.75, hoogte));
        if (hoogte > 0.85) kleur.lerp(sneeuw, BNW.smoothstep(0.85, 1.0, hoogte));
        kleur.offsetHSL(0, 0, (BNW.hash(f * 0.731) - 0.5) * 0.05);

        // grondstofplekken: een zichtbare, iets ruwere vlek op het land
        for (let i = 0; i < ijzerSlots.length; i++) {
          if (dir.angleTo(ijzerSlots[i].dir) < PATCH) {
            kleur.lerp(ijzerKleur, 0.8); break;
          }
        }
        for (let i = 0; i < olieSlots.length; i++) {
          if (dir.angleTo(olieSlots[i].dir) < PATCH) {
            kleur.lerp(olieKleur, 0.8); break;
          }
        }
      }

      for (let k = 0; k < 3; k++) {
        kleuren[(f * 3 + k) * 3 + 0] = kleur.r;
        kleuren[(f * 3 + k) * 3 + 1] = kleur.g;
        kleuren[(f * 3 + k) * 3 + 2] = kleur.b;
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(kleuren, 3));
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0.0
    }));
    mesh.name = 'planeet-oppervlak';
    return mesh;
  }

  // Een dun, wazig schilletje eromheen: de dampkring die de maan niet had.
  function bouwDampkring() {
    return new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.045, 40, 24),
      new THREE.MeshBasicMaterial({
        color: 0x9fd0ff, transparent: true, opacity: 0.10, side: THREE.BackSide
      })
    );
  }

  BNW.Planeet = {
    R: R,
    SLOTS: SLOTS,
    hoogteBij: hoogteBij,
    orientatie: orientatie,
    puntOpOppervlak: puntOpOppervlak,
    maakVlak: maakVlak,
    isLand: isLand,
    bouwMesh: bouwMesh,
    bouwDampkring: bouwDampkring
  };
})(window.BNW);

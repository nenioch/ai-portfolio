/* De robots: er gaan geen mensen mee, de kolonie bestaat uit tweebenige
   werkrobots die over het dok-platform stappen. Ze hangen in dezelfde groep
   als de planetoïde, dus ze draaien mee. Hun plaats
   houden we bij in u/v — dezelfde vlakke coördinaten waarin ook de
   bouwplekken liggen — en pas bij het tekenen wordt daar een punt op de bol
   van gemaakt. */

(function (MB) {
  'use strict';
  if (!window.THREE) return;

  const Rock = MB.Rock;
  const MAT = MB.Buildings.MAT;

  const MAX = 20;                 // meer robots wordt een mierenhoop
  const TEMPO = 1.15;             // eenheden per seconde
  const AANKOMST = 0.4;
  const MIJD = 2.9;               // zo dicht komen ze niet langs een module
  const VLAKTE = 10.6;            // binnen deze straal blijft de grond vlak

  // ------------------------------------------------------------ materialen

  function std(kleur, ruw, metaal) {
    return new THREE.MeshStandardMaterial({
      color: kleur, roughness: ruw, metalness: metaal, flatShading: true
    });
  }

  const ROMP = std(0xc9d1da, 0.45, 0.55);
  const GEWRICHT = std(0x3b444f, 0.55, 0.6);
  const OOG = new THREE.MeshStandardMaterial({
    color: 0x9fe8ff, emissive: 0x3cc8ff, emissiveIntensity: 1.6, roughness: 0.3
  });
  // elke robot krijgt een eigen accentkleur, zo houd je ze uit elkaar
  const ACCENTEN = [0xff8b45, 0x62d8ff, 0x6fd66a, 0xd8433a, 0xffd166, 0xb98bff]
    .map((k) => std(k, 0.50, 0.10));

  // ----------------------------------------------------------- onderdelen

  /* Eén set geometrie voor alle robots; alleen de accentkleur verschilt. */
  const G = {
    been: new THREE.BoxGeometry(0.09, 0.34, 0.09),
    voet: new THREE.BoxGeometry(0.15, 0.06, 0.22),
    heup: new THREE.BoxGeometry(0.28, 0.08, 0.14),
    lijf: new THREE.BoxGeometry(0.34, 0.32, 0.24),
    paneel: new THREE.BoxGeometry(0.18, 0.12, 0.02),
    accu: new THREE.BoxGeometry(0.22, 0.22, 0.10),
    schouder: new THREE.SphereGeometry(0.06, 8, 6),
    arm: new THREE.BoxGeometry(0.06, 0.30, 0.06),
    grijper: new THREE.BoxGeometry(0.10, 0.06, 0.08),
    nek: new THREE.CylinderGeometry(0.035, 0.035, 0.08, 6),
    kop: new THREE.BoxGeometry(0.24, 0.16, 0.18),
    oog: new THREE.BoxGeometry(0.17, 0.05, 0.02),
    spriet: new THREE.CylinderGeometry(0.012, 0.012, 0.18, 4),
    lampje: new THREE.SphereGeometry(0.032, 6, 5)
  };
  G.been.translate(0, -0.17, 0);        // draait om de heup
  G.arm.translate(0, -0.15, 0);         // draait om de schouder

  function deel(geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  /* Een robot met de voeten op y = 0 en de camera-ogen naar +Z. */
  function maakRobot(accent) {
    const g = new THREE.Group();

    const benen = [];
    [-0.09, 0.09].forEach(function (x) {
      const been = new THREE.Group();
      been.position.set(x, 0.34, 0);
      been.add(deel(G.been, GEWRICHT, 0, 0, 0));
      been.add(deel(G.voet, MAT.donker, 0, -0.31, 0.03));
      benen.push(been);
      g.add(been);
    });

    g.add(deel(G.heup, GEWRICHT, 0, 0.36, 0));
    g.add(deel(G.lijf, ROMP, 0, 0.56, 0));
    g.add(deel(G.paneel, accent, 0, 0.58, 0.125));          // borstplaat in de eigen kleur
    g.add(deel(G.accu, MAT.donker, 0, 0.56, -0.17));         // accupakket op de rug
    g.add(deel(G.lampje, MAT.lamp, 0.1, 0.66, 0.125));       // statuslampje

    const armen = [];
    [-0.21, 0.21].forEach(function (x) {
      g.add(deel(G.schouder, GEWRICHT, x, 0.67, 0));
      const arm = new THREE.Group();
      arm.position.set(x, 0.67, 0);
      arm.add(deel(G.arm, ROMP, 0, 0, 0));
      arm.add(deel(G.grijper, accent, 0, -0.32, 0.02));
      armen.push(arm);
      g.add(arm);
    });

    g.add(deel(G.nek, GEWRICHT, 0, 0.76, 0));
    g.add(deel(G.kop, ROMP, 0, 0.87, 0));
    g.add(deel(G.oog, OOG, 0, 0.88, 0.095));
    g.add(deel(G.spriet, MAT.staal, 0.08, 1.03, -0.04));
    g.add(deel(G.lampje, MAT.lamp, 0.08, 1.12, -0.04));

    g.userData.robot = true;
    g.userData.refs = { benen: benen, armen: armen };
    return g;
  }

  // -------------------------------------------------------------- de robots

  MB.Robots = {
    MAX: MAX,

    maak: function (kern) {
      const groep = new THREE.Group();
      kern.add(groep);

      const leden = [];
      const dir = new THREE.Vector3();
      const voorUit = new THREE.Vector3();
      const asX = new THREE.Vector3();
      const asZ = new THREE.Vector3();
      const basis = new THREE.Matrix4();
      const doelQ = new THREE.Quaternion();

      const volk = {
        groep: groep,
        doelen: [],        // waar iets te doen is; het spel houdt dit bij
        leden: leden
      };

      function nieuwDoel(k) {
        const d = volk.doelen;
        if (d.length && Math.random() < 0.72) {
          // naast een module gaan staan, net buiten de ontwijkring
          const p = d[(Math.random() * d.length) | 0];
          const a = Math.random() * Math.PI * 2;
          k.doelU = p.u + Math.cos(a) * 3.4;
          k.doelV = p.v + Math.sin(a) * 3.4;
        } else {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * (VLAKTE - 0.6);
          k.doelU = Math.cos(a) * r;
          k.doelV = Math.sin(a) * r;
        }
        const len = Math.hypot(k.doelU, k.doelV);
        if (len > VLAKTE) {
          k.doelU *= VLAKTE / len;
          k.doelV *= VLAKTE / len;
        }
      }

      function voegToe() {
        const g = maakRobot(ACCENTEN[leden.length % ACCENTEN.length]);
        groep.add(g);

        // ergens bij het midden van het platform naar buiten stappen
        const a = Math.random() * Math.PI * 2;
        const r = 2.5 + Math.random() * 3;
        const k = {
          groep: g,
          refs: g.userData.refs,
          u: Math.cos(a) * r, v: Math.sin(a) * r,
          doelU: 0, doelV: 0,
          koersU: Math.cos(a), koersV: Math.sin(a),
          wacht: Math.random() * 3,
          fase: Math.random() * 6.28,
          zwaai: 0
        };
        nieuwDoel(k);
        leden.push(k);
      }

      volk.zetAantal = function (n) {
        n = MB.clamp(n, 0, MAX);
        while (leden.length < n) voegToe();
        while (leden.length > n) groep.remove(leden.pop().groep);
      };

      volk.update = function (dt) {
        for (let i = 0; i < leden.length; i++) {
          const k = leden[i];
          let loopt = false;

          if (k.wacht > 0) {
            k.wacht -= dt;
          } else {
            let du = k.doelU - k.u, dv = k.doelV - k.v;
            const afstand = Math.hypot(du, dv);

            if (afstand < AANKOMST) {
              k.wacht = 1.5 + Math.random() * 4.5;       // even rondkijken
              nieuwDoel(k);
            } else {
              du /= afstand;
              dv /= afstand;

              // niet dwars door een module heen lopen
              for (let j = 0; j < volk.doelen.length; j++) {
                const p = volk.doelen[j];
                const ou = k.u - p.u, ov = k.v - p.v;
                const d = Math.hypot(ou, ov);
                if (d > 1e-3 && d < MIJD) {
                  const w = ((MIJD - d) / MIJD) * 1.8;
                  du += (ou / d) * w;
                  dv += (ov / d) * w;
                }
              }
              const len = Math.hypot(du, dv) || 1;
              du /= len;
              dv /= len;

              k.u += du * TEMPO * dt;
              k.v += dv * TEMPO * dt;
              k.koersU = du;
              k.koersV = dv;
              k.fase += dt * 7.5;
              loopt = true;
            }
          }

          // ---- op de bol zetten
          dir.copy(Rock.richtingUitOffset(k.u, k.v));
          k.zwaai += ((loopt ? 1 : 0) - k.zwaai) * Math.min(1, dt * 5);

          // in lage zwaartekracht stuitert een robot bij elke stap wat op
          const wip = Math.abs(Math.sin(k.fase)) * 0.07 * k.zwaai;
          k.groep.position.copy(dir).multiplyScalar(Rock.hoogteBij(dir) + wip);

          // kijkrichting: de normaal is omhoog, de looprichting is +Z
          voorUit.copy(Rock.richtingUitOffset(k.u + k.koersU * 0.3, k.v + k.koersV * 0.3))
            .sub(dir);
          voorUit.addScaledVector(dir, -voorUit.dot(dir));
          if (voorUit.lengthSq() > 1e-10) {
            voorUit.normalize();
            asX.crossVectors(dir, voorUit).normalize();
            asZ.crossVectors(asX, dir).normalize();
            basis.makeBasis(asX, dir, asZ);
            doelQ.setFromRotationMatrix(basis);
            k.groep.quaternion.slerp(doelQ, Math.min(1, dt * 7));
          }

          // ---- armen en benen
          const s = Math.sin(k.fase) * 0.75 * k.zwaai;
          k.refs.benen[0].rotation.x = s;
          k.refs.benen[1].rotation.x = -s;
          k.refs.armen[0].rotation.x = -s * 0.6;
          k.refs.armen[1].rotation.x = s * 0.6;
        }
      };

      return volk;
    }
  };
})(window.MB);

/* De kolonisten: poppetjes die rond hun woonwijk lopen. Anders dan op de
   maan — waar iedereen op één basis woonde — staan hier woonwijken verspreid
   over de hele planeet. Elke woonwijk krijgt daarom zijn eigen groepje
   wandelaars in een eigen lokaal u/v-stelsel (BNW.Planeet.maakVlak), zodat
   deze code verder vrijwel gelijk kan blijven aan die van maanbasis. */

(function (BNW) {
  'use strict';
  if (!window.THREE) return;

  const Planeet = BNW.Planeet;
  const MAT = BNW.Buildings.MAT;

  const TEMPO = 1.15;
  const AANKOMST = 0.4;
  const MIJD = 2.6;
  const VLAKTE = 6.5;      // straal waarbinnen een groepje om zijn woonwijk blijft
  const PER_WIJK = 4;      // hoeveel wandelaars één woonwijk hoogstens laat zien

  // ------------------------------------------------------------ materialen

  function std(kleur, ruw, metaal) {
    return new THREE.MeshStandardMaterial({ color: kleur, roughness: ruw, metalness: metaal, flatShading: true });
  }

  const KLEDING = std(0xdfe6ec, 0.65, 0.05);
  const HUID = std(0xd9a877, 0.7, 0.0);
  const ACCENTEN = [0xff8b45, 0x62d8ff, 0x6fd66a, 0xd8433a, 0xffd166, 0xb98bff]
    .map((k) => std(k, 0.55, 0.10));

  // ----------------------------------------------------------- onderdelen

  const G = {
    been: new THREE.CylinderGeometry(0.052, 0.045, 0.36, 6),
    voet: new THREE.BoxGeometry(0.11, 0.06, 0.18),
    lijf: new THREE.CylinderGeometry(0.15, 0.17, 0.34, 10),
    arm: new THREE.CylinderGeometry(0.042, 0.038, 0.30, 6),
    hand: new THREE.SphereGeometry(0.05, 7, 5),
    schouder: new THREE.SphereGeometry(0.07, 8, 6),
    hoofd: new THREE.SphereGeometry(0.135, 12, 9),
    pet: new THREE.CylinderGeometry(0.14, 0.145, 0.10, 12)
  };
  G.been.translate(0, -0.18, 0);
  G.arm.translate(0, -0.15, 0);

  function deel(geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  /* Een poppetje met de voeten op y = 0 en het gezicht naar +Z. */
  function maakPoppetje(accent) {
    const g = new THREE.Group();

    const benen = [];
    [-0.08, 0.08].forEach(function (x) {
      const been = new THREE.Group();
      been.position.set(x, 0.36, 0);
      been.add(deel(G.been, accent, 0, 0, 0));
      been.add(deel(G.voet, MAT.donker, 0, -0.34, 0.03));
      benen.push(been);
      g.add(been);
    });

    g.add(deel(G.lijf, KLEDING, 0, 0.55, 0));

    const armen = [];
    [-0.185, 0.185].forEach(function (x) {
      g.add(deel(G.schouder, KLEDING, x, 0.68, 0));
      const arm = new THREE.Group();
      arm.position.set(x, 0.68, 0);
      arm.add(deel(G.arm, KLEDING, 0, 0, 0));
      arm.add(deel(G.hand, HUID, 0, -0.31, 0));
      armen.push(arm);
      g.add(arm);
    });

    g.add(deel(G.hoofd, HUID, 0, 0.87, 0));
    g.add(deel(G.pet, accent, 0, 0.96, 0));

    g.userData.kolonist = true;
    g.userData.refs = { benen: benen, armen: armen };
    return g;
  }

  // ------------------------------------------------------------ het groepje

  /* Eén "volk" is de bevolking rond precies één woonwijk, in zijn eigen
     tangentiële stelsel. `middelpunt` is de wereldrichting van die woonwijk. */
  function maakVolk(planeet, middelpunt, accentIndex) {
    const vlak = Planeet.maakVlak(middelpunt);
    const groep = new THREE.Group();
    planeet.add(groep);

    const leden = [];
    const dir = new THREE.Vector3();
    const voorUit = new THREE.Vector3();
    const asX = new THREE.Vector3();
    const asZ = new THREE.Vector3();
    const basis = new THREE.Matrix4();
    const doelQ = new THREE.Quaternion();

    const volk = { groep: groep, doelen: [{ u: 0, v: 0 }], leden: leden, middelpunt: middelpunt };

    function nieuwDoel(k) {
      const d = volk.doelen;
      if (d.length && Math.random() < 0.72) {
        const p = d[(Math.random() * d.length) | 0];
        const a = Math.random() * Math.PI * 2;
        k.doelU = p.u + Math.cos(a) * 2.6;
        k.doelV = p.v + Math.sin(a) * 2.6;
      } else {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * (VLAKTE - 0.6);
        k.doelU = Math.cos(a) * r;
        k.doelV = Math.sin(a) * r;
      }
      const len = Math.hypot(k.doelU, k.doelV);
      if (len > VLAKTE) { k.doelU *= VLAKTE / len; k.doelV *= VLAKTE / len; }
    }

    function voegToe() {
      const g = maakPoppetje(ACCENTEN[(accentIndex + leden.length) % ACCENTEN.length]);
      groep.add(g);
      const a = Math.random() * Math.PI * 2;
      const r = 1.6 + Math.random() * 2;
      const k = {
        groep: g, refs: g.userData.refs,
        u: Math.cos(a) * r, v: Math.sin(a) * r,
        doelU: 0, doelV: 0, koersU: Math.cos(a), koersV: Math.sin(a),
        wacht: Math.random() * 3, fase: Math.random() * 6.28, zwaai: 0
      };
      nieuwDoel(k);
      leden.push(k);
    }

    volk.zetAantal = function (n) {
      n = BNW.clamp(n, 0, PER_WIJK);
      while (leden.length < n) voegToe();
      while (leden.length > n) groep.remove(leden.pop().groep);
    };

    // gebouwen in de buurt (als wereldrichtingen) worden loopdoelen in het eigen u/v-stelsel
    volk.zetDoelenVanWereldrichtingen = function (richtingen) {
      volk.doelen = richtingen.map((r) => vlak.projecteer(r.clone().normalize()));
      if (!volk.doelen.length) volk.doelen.push({ u: 0, v: 0 });
    };

    volk.verwijder = function () { planeet.remove(groep); };

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
            k.wacht = 1.5 + Math.random() * 4.5;
            nieuwDoel(k);
          } else {
            du /= afstand; dv /= afstand;
            for (let j = 0; j < volk.doelen.length; j++) {
              const p = volk.doelen[j];
              const ou = k.u - p.u, ov = k.v - p.v;
              const d = Math.hypot(ou, ov);
              if (d > 1e-3 && d < MIJD) {
                const w = ((MIJD - d) / MIJD) * 1.8;
                du += (ou / d) * w; dv += (ov / d) * w;
              }
            }
            const len = Math.hypot(du, dv) || 1;
            du /= len; dv /= len;
            k.u += du * TEMPO * dt;
            k.v += dv * TEMPO * dt;
            k.koersU = du; k.koersV = dv;
            k.fase += dt * 7.5;
            loopt = true;
          }
        }

        dir.copy(vlak.richtingUitOffset(k.u, k.v));
        k.zwaai += ((loopt ? 1 : 0) - k.zwaai) * Math.min(1, dt * 5);
        const wip = Math.abs(Math.sin(k.fase)) * 0.05 * k.zwaai;
        k.groep.position.copy(dir).multiplyScalar(Planeet.hoogteBij(dir) + wip);

        voorUit.copy(vlak.richtingUitOffset(k.u + k.koersU * 0.3, k.v + k.koersV * 0.3)).sub(dir);
        voorUit.addScaledVector(dir, -voorUit.dot(dir));
        if (voorUit.lengthSq() > 1e-10) {
          voorUit.normalize();
          asX.crossVectors(dir, voorUit).normalize();
          asZ.crossVectors(asX, dir).normalize();
          basis.makeBasis(asX, dir, asZ);
          doelQ.setFromRotationMatrix(basis);
          k.groep.quaternion.slerp(doelQ, Math.min(1, dt * 7));
        }

        const s = Math.sin(k.fase) * 0.75 * k.zwaai;
        k.refs.benen[0].rotation.x = s;
        k.refs.benen[1].rotation.x = -s;
        k.refs.armen[0].rotation.x = -s * 0.6;
        k.refs.armen[1].rotation.x = s * 0.6;
      }
    };

    return volk;
  }

  BNW.Kolonisten = { PER_WIJK: PER_WIJK, maakVolk: maakVolk };
})(window.BNW);

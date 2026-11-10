/* Bouwstenen voor de geometrie.

   - Bouwer: verzamelt dozen, cilinders en andere vormen (elk met een eigen
     kleur, als vertexkleur ingebakken) en voegt ze per materiaal samen tot één
     mesh. Zo wordt een hele piramide of slangenmuur één tekenopdracht.
   - Serie: een samengesteld "prefab" (huis, hut, maïsstengel…) dat honderden
     keren terugkomt, als InstancedMesh. Elke instantie kan een eigen tint en
     naam krijgen; die naam verschijnt als je er met de muis boven hangt.
   - Materialen: gedeelde materialen, allemaal met vertexkleuren. */

(function (MC) {
  'use strict';
  if (!window.THREE) return;

  const V = new THREE.Vector3(), S = new THREE.Vector3();
  const Q = new THREE.Quaternion(), E = new THREE.Euler();
  const KL = new THREE.Color();

  // Alles wat je met de muis kunt aanwijzen (voor namen en het draaipunt).
  MC.pickbaar = [];

  // UV's van een BoxGeometry schalen naar de werkelijke maat, zodat een textuur
  // op een lange muur herhaalt in plaats van uitgerekt te worden.
  function doosUV(geo, w, h, d, tegel) {
    const uv = geo.attributes.uv;
    const maten = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) {
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, uv.getX(i) * maten[f][0] / tegel, uv.getY(i) * maten[f][1] / tegel);
      }
    }
  }
  MC.doosUV = doosUV;

  function klaarmaken(geo, kleur, matrix) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    const n = g.attributes.position.count;
    if (!g.attributes.normal) g.computeVertexNormals();
    const uit = new THREE.BufferGeometry();
    uit.setAttribute('position', g.attributes.position);
    uit.setAttribute('normal', g.attributes.normal);
    uit.setAttribute('uv', g.attributes.uv || new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    KL.set(kleur);
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      c[i * 3] = KL.r;
      c[i * 3 + 1] = KL.g;
      c[i * 3 + 2] = KL.b;
    }
    uit.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return uit;
  }

  function samenvoegen(lijst) {
    let n = 0;
    for (const g of lijst) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
    let o = 0;
    for (const g of lijst) {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array, o * 3);
      uv.set(g.attributes.uv.array, o * 2);
      col.set(g.attributes.color.array, o * 3);
      o += c;
    }
    const uit = new THREE.BufferGeometry();
    uit.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    uit.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    uit.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    uit.setAttribute('color', new THREE.BufferAttribute(col, 3));
    uit.computeBoundingSphere();
    uit.computeBoundingBox();
    return uit;
  }

  // Afgeknotte piramide met platte normalen; UV's in wereldmaat (per tegel).
  function taludGeo(w0, d0, w1, d1, h, tegel) {
    const a = w0 / 2, b = d0 / 2, c = w1 / 2, e = d1 / 2;
    const P = [[-a, 0, -b], [a, 0, -b], [a, 0, b], [-a, 0, b], [-c, h, -e], [c, h, -e], [c, h, e], [-c, h, e]];
    const vlakken = [[3, 2, 6, 7], [1, 0, 4, 5], [2, 1, 5, 6], [0, 3, 7, 4], [4, 7, 6, 5], [0, 1, 2, 3]];
    const pos = [], uv = [];
    vlakken.forEach(function (q, f) {
      const p = q.map((i) => P[i]);
      const zij = f < 4;
      const rx = p[1][0] - p[0][0], rz = p[1][2] - p[0][2];
      const l = Math.hypot(rx, rz) || 1;
      const uvVan = (v) => (zij ? [(v[0] * rx + v[2] * rz) / l / tegel, v[1] / tegel] : [v[0] / tegel, v[2] / tegel]);
      for (const k of [0, 1, 2, 0, 2, 3]) {
        pos.push(p[k][0], p[k][1], p[k][2]);
        uv.push.apply(uv, uvVan(p[k]));
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }

  function matrixVan(x, y, z, rx, ry, rz, sx, sy, sz) {
    return new THREE.Matrix4().compose(
      V.set(x, y, z),
      Q.setFromEuler(E.set(rx || 0, ry || 0, rz || 0, 'YXZ')),
      S.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz)
    );
  }
  MC.matrixVan = matrixVan;

  // ------------------------------------------------------------------ Bouwer

  function Bouwer() {
    this.delen = {};
    this.stapel = [new THREE.Matrix4()];
  }
  MC.Bouwer = Bouwer;
  const B = Bouwer.prototype;

  B.top = function () { return this.stapel[this.stapel.length - 1]; };

  // Een lokaal assenstelsel openen: verplaatst, om y gedraaid en geschaald.
  B.push = function (x, y, z, ry, s) {
    this.stapel.push(this.top().clone().multiply(matrixVan(x, y, z, 0, ry || 0, 0, s || 1)));
    return this;
  };
  B.pop = function () { this.stapel.pop(); return this; };

  B.voeg = function (mat, kleur, geo, lokaal) {
    const m = lokaal ? this.top().clone().multiply(lokaal) : this.top();
    (this.delen[mat] = this.delen[mat] || []).push(klaarmaken(geo, kleur, m));
    return this;
  };

  // Doos met de onderkant op y (tenzij o.midden). o: rx, ry, rz, tegel.
  B.doos = function (mat, kleur, x, y, z, w, h, d, o) {
    o = o || {};
    const g = new THREE.BoxGeometry(w, h, d);
    if (o.tegel) doosUV(g, w, h, d, o.tegel);
    return this.voeg(mat, kleur, g, matrixVan(x, o.midden ? y : y + h / 2, z, o.rx, o.ry, o.rz));
  };

  B.cil = function (mat, kleur, x, y, z, rBoven, rOnder, h, seg, o) {
    o = o || {};
    const g = new THREE.CylinderGeometry(rBoven, rOnder, h, seg || 8, 1, !!o.open);
    return this.voeg(mat, kleur, g, matrixVan(x, y + h / 2, z, o.rx, o.ry, o.rz));
  };

  B.kegel = function (mat, kleur, x, y, z, r, h, seg, o) {
    o = o || {};
    let g = new THREE.ConeGeometry(r, h, seg || 8);
    if (o.plat) { g = g.toNonIndexed(); g.computeVertexNormals(); }
    return this.voeg(mat, kleur, g, matrixVan(x, y + h / 2, z, o.rx, o.ry, o.rz, o.sx, o.sy, o.sz));
  };

  // Ellipsoïde rond (x, y, z).
  B.bol = function (mat, kleur, x, y, z, rx, ry, rz, ws, hs) {
    const g = new THREE.SphereGeometry(1, ws || 8, hs || 6);
    return this.voeg(mat, kleur, g, matrixVan(x, y, z, 0, 0, 0, rx, ry, rz));
  };

  // Driehoekig prisma: breedte w over x, hoogte h, diepte d over z; onderkant op y.
  B.prisma = function (mat, kleur, x, y, z, w, h, d, o) {
    o = o || {};
    const vorm = new THREE.Shape();
    vorm.moveTo(-w / 2, 0);
    vorm.lineTo(w / 2, 0);
    vorm.lineTo(0, h);
    vorm.closePath();
    const g = new THREE.ExtrudeGeometry(vorm, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return this.voeg(mat, kleur, g, matrixVan(x, y, z, 0, o.ry, 0));
  };

  // Afgeknotte piramide (talud): onderkant w0 × d0 op y, bovenkant w1 × d1 op y + h.
  B.talud = function (mat, kleur, x, y, z, w0, d0, w1, d1, h, o) {
    o = o || {};
    return this.voeg(mat, kleur, taludGeo(w0, d0, w1, d1, h, o.tegel || 1), matrixVan(x, y, z, 0, o.ry || 0, 0));
  };

  B.geometrie = function () {
    const uit = {};
    for (const k in this.delen) uit[k] = samenvoegen(this.delen[k]);
    return uit;
  };

  // Eén Group met een mesh per materiaal, aanwijsbaar onder de gegeven naam.
  B.mesh = function (naam, o) {
    o = o || {};
    const groep = new THREE.Group();
    const geos = this.geometrie();
    for (const k in geos) {
      const m = new THREE.Mesh(geos[k], MC.MAT[k]);
      m.castShadow = o.schaduw !== false;
      m.receiveShadow = true;
      m.userData.naam = naam;
      groep.add(m);
      if (naam && o.pick !== false) MC.pickbaar.push(m);
    }
    return groep;
  };

  // ------------------------------------------------------------------- Serie

  function Serie(geos, naam, o) {
    this.geos = geos;
    this.naam = naam;
    this.o = o || {};
    this.items = [];
    this.meshes = [];
  }
  MC.Serie = Serie;

  // s is één schaal of [sx, sy, sz]; kleur tint de hele instantie.
  Serie.prototype.add = function (x, y, z, ry, s, kleur, naam) {
    const sc = Array.isArray(s) ? s : [s || 1, s || 1, s || 1];
    this.items.push({
      m: matrixVan(x, y, z, 0, ry || 0, 0, sc[0], sc[1], sc[2]),
      c: new THREE.Color(kleur == null ? 0xffffff : kleur),
      naam: naam || this.naam
    });
    return this.items.length - 1;
  };

  Serie.prototype.bouw = function (ouder) {
    const n = this.items.length;
    if (!n) return;
    const namen = this.items.map((it) => it.naam);
    for (const k in this.geos) {
      const im = new THREE.InstancedMesh(this.geos[k], MC.MAT[k], n);
      for (let i = 0; i < n; i++) {
        im.setMatrixAt(i, this.items[i].m);
        im.setColorAt(i, this.items[i].c);
      }
      im.instanceMatrix.needsUpdate = true;
      if (this.o.beweegt) im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.castShadow = this.o.schaduw !== false;
      im.receiveShadow = true;
      im.frustumCulled = false;       // grenzen van losse instanties kent three niet
      im.userData.namen = namen;
      im.userData.naam = this.naam;
      ouder.add(im);
      this.meshes.push(im);
      if (this.o.pick !== false) MC.pickbaar.push(im);
    }
  };

  // Voor bewegende series (boten, mensen): één instantie verzetten.
  Serie.prototype.zet = function (i, x, y, z, ry, s) {
    const m = matrixVan(x, y, z, 0, ry, 0, s || 1);
    for (const im of this.meshes) im.setMatrixAt(i, m);
  };
  Serie.prototype.klaar = function () {
    for (const im of this.meshes) im.instanceMatrix.needsUpdate = true;
  };

  // Hulpje: geometrie van een Bouwer met één vorm erin.
  MC.eenVorm = function (fn) {
    const b = new Bouwer();
    fn(b);
    return b.geometrie();
  };

  // ------------------------------------------------------------- materialen

  // Tijd voor wuivende gewassen; main.js telt hem op.
  MC.wind = { uTijd: { value: 0 }, uWind: { value: MC.bewegingBeperkt ? 0 : 1 } };

  function wuivend(mat, sterkte) {
    mat.onBeforeCompile = function (shader) {
      shader.uniforms.uTijd = MC.wind.uTijd;
      shader.uniforms.uWind = MC.wind.uWind;
      shader.vertexShader = 'uniform float uTijd;\nuniform float uWind;\n' +
        shader.vertexShader.replace('#include <begin_vertex>', [
          '#include <begin_vertex>',
          '#ifdef USE_INSTANCING',
          '  vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);',
          '#else',
          '  vec2 ip = vec2(0.0);',
          '#endif',
          '  float zw = sin(uTijd * 1.7 + ip.x * 0.55 + ip.y * 0.35) + 0.4 * sin(uTijd * 3.1 + ip.x * 1.3);',
          '  float hy = max(position.y, 0.0);',
          '  transformed.x += zw * ' + sterkte.toFixed(3) + ' * uWind * hy;',
          '  transformed.z += zw * ' + (sterkte * 0.6).toFixed(3) + ' * uWind * hy;'
        ].join('\n'));
    };
    return mat;
  }

  MC.maakMaterialen = function () {
    const T = MC.Tex;
    const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.85, metalness: 0 }, o));

    const meerGolf = T.waterNormaal();
    meerGolf.repeat.set(490, 490);
    const kanaalGolf = meerGolf.clone();
    kanaalGolf.needsUpdate = true;
    kanaalGolf.repeat.set(4, 4);

    MC.MAT = {
      vlak: std({}),
      stuc: std({ map: T.stuc(), roughness: 0.9 }),
      plein: std({ map: T.plein(), roughness: 0.95 }),
      steen: std({ map: T.steen(), roughness: 1 }),
      fries: std({ map: T.meander(), roughness: 0.8 }),
      zon: std({ map: T.zonnesteen(), roughness: 0.95 }),
      stro: std({ map: T.stro(), roughness: 1 }),
      raam: std({ emissive: new THREE.Color(0xffb458), emissiveIntensity: 0 }),
      vuur: new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xffffff }),
      gewas: wuivend(std({ roughness: 0.9 }), 0.09),
      blad: wuivend(std({ roughness: 0.9 }), 0.025),
      meer: new THREE.MeshStandardMaterial({
        color: 0x4b8c96, roughness: 0.3, metalness: 0.05,
        normalMap: meerGolf, normalScale: new THREE.Vector2(0.12, 0.12)
      }),
      // zoet water in vijvers, fonteinen en de goot van het aquaduct
      kanaal: new THREE.MeshStandardMaterial({
        color: 0x3fa9b3, roughness: 0.22, metalness: 0.05,
        normalMap: kanaalGolf, normalScale: new THREE.Vector2(0.12, 0.12)
      })
    };
    MC.golven = [meerGolf, kanaalGolf];
  };
})(window.MC);

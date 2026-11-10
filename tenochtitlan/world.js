/* Renderer, camera, licht en de omgeving: hemel, zon, wolken, sterren, het
   Texcocomeer en het dal van Mexico eromheen, met de heuvel van Chapultepec
   in het westen en de besneeuwde vulkanen Popocatépetl en Iztaccíhuatl in
   het zuidoosten. De tijd van de dag stuurt zon, hemelkleur, mist en de
   vuren op de tempels. */

(function (MC) {
  'use strict';
  if (!window.THREE) return;

  const MEER_RAND = MC.PLAN.MEER;    // waar de oever begint (naar het oosten loopt het meer verder door)
  MC.CHAPULTEPEC = { x: -MEER_RAND - 24, z: 6 };

  // ------------------------------------------------------------------ hemel

  function hemel() {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uBoven: { value: new THREE.Color(0x5b9bd5) },
        uHorizon: { value: new THREE.Color(0xdfeaf0) },
        uZon: { value: new THREE.Vector3(0, 1, 0) },
        uZonKleur: { value: new THREE.Color(0xfff1d6) }
      },
      vertexShader: [
        'varying vec3 vRichting;',
        'void main() {',
        '  vRichting = normalize(position);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uBoven; uniform vec3 uHorizon; uniform vec3 uZon; uniform vec3 uZonKleur;',
        'varying vec3 vRichting;',
        'void main() {',
        '  float h = clamp(vRichting.y, 0.0, 1.0);',
        '  vec3 c = mix(uHorizon, uBoven, pow(h, 0.55));',
        '  float z = max(dot(normalize(vRichting), normalize(uZon)), 0.0);',
        '  c += uZonKleur * (pow(z, 700.0) * 1.2 + pow(z, 18.0) * 0.18);',
        '  gl_FragColor = vec4(c, 1.0);',
        '}'
      ].join('\n')
    });
    const m = new THREE.Mesh(new THREE.SphereGeometry(2600, 32, 16), mat);
    m.renderOrder = -10;
    return m;
  }

  function sterren() {
    const n = 1400;
    const pos = new Float32Array(n * 3);
    const r = MC.rng(9931);
    for (let i = 0; i < n; i++) {
      const y = 0.05 + r() * 0.95;
      const phi = r() * Math.PI * 2;
      const s = Math.sqrt(1 - y * y);
      pos[i * 3] = s * Math.cos(phi) * 2300;
      pos[i * 3 + 1] = y * 2300;
      pos[i * 3 + 2] = s * Math.sin(phi) * 2300;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      size: 1.6, sizeAttenuation: false, color: 0xffffff, transparent: true, opacity: 0, fog: false, depthWrite: false
    }));
  }

  function wolken() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.92 });
    const r = MC.rng(404);
    const bol = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2, d = 450 + r() * 600;
      const w = new THREE.Group();
      const n = 4 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(bol, mat);
        const s = 8 + r() * 10;
        m.scale.set(s * 1.4, s * 0.55, s);
        m.position.set((k - n / 2) * 9 + r() * 5, r() * 4, r() * 8 - 4);
        w.add(m);
      }
      w.position.set(Math.cos(a) * d, 320 + r() * 80, Math.sin(a) * d);
      w.scale.setScalar(1.6);
      w.rotation.y = r() * Math.PI;
      g.add(w);
    }
    return g;
  }

  // ---------------------------------------------------------- meer en bergen

  function meer() {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), MC.MAT.meer);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    m.userData.naam = 'Meer';
    MC.pickbaar.push(m);
    return m;
  }

  // Hoogte van het land rond het meer: een vlakke groene oever, daarachter
  // bergen, de heuvel van Chapultepec en twee vulkanen.
  MC.landHoogte = function (x, z) {
    const r = Math.hypot(x > 0 ? x * 0.7 : x, z);
    const oever = MC.smoothstep(MEER_RAND - 4, MEER_RAND + 8, r);
    let h = -2.5 + oever * 3.4;
    const hoek = Math.atan2(z, x);
    // in het oosten ligt het meer verder door, dus beginnen de bergen later
    const bergRand = MEER_RAND + 70 +40 * Math.sin(hoek * 3 + 1.3) + 25 * Math.sin(hoek * 7) + 90 * MC.smoothstep(-0.1, 0.7, Math.cos(hoek));
    const berg = MC.smoothstep(bergRand - 40, bergRand + 90, Math.hypot(x, z));
    if (berg > 0) {
      const n = MC.fbm(x * 0.012 + 40, z * 0.012 + 17, 5);
      const kam = 1 - Math.abs(MC.fbm(x * 0.02 + 3, z * 0.02 - 9, 3) * 2 - 1);
      h += berg * (20 + 70 * n * n + 45 * kam * n);
    }
    // Chapultepec: een beboste heuvel met de bron van het aquaduct
    const c = MC.CHAPULTEPEC;
    h += 13 * Math.exp(-((x - c.x) ** 2 + (z - c.z) ** 2) / 160);
    // Popocatépetl: een regelmatige kegel; Iztaccíhuatl: een lange, slapende kam
    const vd = MEER_RAND + 360;
    const dp = Math.hypot(x - 0.5 * vd, z - 0.87 * vd);
    h += 240 * Math.pow(Math.max(0, 1 - dp / 170), 1.5);
    const ix = x - 0.8 * (vd + 30), iz = z - 0.6 * (vd + 30);
    const di = Math.hypot((ix * 0.6 + iz * 0.8) * 0.45, -ix * 0.8 + iz * 0.6);
    h += 190 * Math.pow(Math.max(0, 1 - di / 95), 1.2);
    h += (MC.fbm(x * 0.08, z * 0.08, 2) - 0.5) * 1.2 * oever;
    return h;
  };

  function land() {
    const geo = new THREE.PlaneGeometry(2600, 2600, 320, 320);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const kleuren = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const zand = new THREE.Color(0xc9b98c), gras = new THREE.Color(0x6f9448), olijf = new THREE.Color(0x7d8a55);
    const rots = new THREE.Color(0x8f836f), top = new THREE.Color(0xa59a88), sneeuw = new THREE.Color(0xf4f6f8);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = MC.landHoogte(x, z);
      pos.setY(i, h);
      if (h < 0.6) c.copy(zand);
      else if (h < 6) c.copy(gras).lerp(olijf, MC.smoothstep(1, 6, h));
      else if (h < 40) c.copy(olijf).lerp(rots, MC.smoothstep(6, 40, h));
      else if (h < 150) c.copy(rots).lerp(top, MC.smoothstep(40, 110, h));
      else c.copy(top).lerp(sneeuw, MC.smoothstep(150, 170, h));
      const v = 0.92 + MC.hash(i, 7) * 0.12;
      kleuren[i * 3] = c.r * v;
      kleuren[i * 3 + 1] = c.g * v;
      kleuren[i * 3 + 2] = c.b * v;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(kleuren, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
    m.receiveShadow = true;
    m.userData.naam = 'Oever en bergen';
    MC.pickbaar.push(m);
    return m;
  }

  // ------------------------------------------------------------------- init

  MC.World = {
    init: function (canvas) {
      const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0xdfeaf0, 300, 1600);

      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 6000);
      camera.position.set(-40, 35, 50);

      const zon = new THREE.DirectionalLight(0xfff1dc, 1.0);
      zon.castShadow = true;
      zon.shadow.mapSize.set(4096, 4096);
      const sc = zon.shadow.camera;
      sc.left = -68; sc.right = 68; sc.top = 68; sc.bottom = -68;
      sc.near = 10; sc.far = 400;
      zon.shadow.bias = -0.0004;
      zon.shadow.normalBias = 0.03;
      scene.add(zon);
      scene.add(zon.target);

      const maan = new THREE.DirectionalLight(0x8fb0ff, 0);
      maan.position.set(-80, 120, -60);
      scene.add(maan);

      const hemelLicht = new THREE.HemisphereLight(0xcfe3f5, 0x8a7a5a, 0.55);
      scene.add(hemelLicht);

      const lucht = hemel();
      const ster = sterren();
      const wolk = wolken();
      scene.add(lucht, ster, wolk, meer(), land());

      function resize() {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      window.addEventListener('resize', resize);
      resize();

      // --------------------------------------------------- tijd van de dag
      const DAG = { boven: new THREE.Color(0x4f93d6), horizon: new THREE.Color(0xdfeaf0) };
      const SCHEMER = { boven: new THREE.Color(0x3f5f95), horizon: new THREE.Color(0xf3b27a) };
      const NACHT = { boven: new THREE.Color(0x050914), horizon: new THREE.Color(0x172238) };
      const tmpB = new THREE.Color(), tmpH = new THREE.Color();
      const richting = new THREE.Vector3();
      const warm = new THREE.Color(0xffb070), wit = new THREE.Color(0xfff3e0);
      const lampen = [];

      const w = {
        renderer, scene, camera, zon,
        nacht: 0,
        lampen: lampen,

        // uur 0..24
        zetTijd: function (uur) {
          const a = (uur - 6) / 12 * Math.PI;
          richting.set(-Math.cos(a) * 0.82, Math.sin(a), 0.5).normalize();
          const e = richting.y;
          const schemer = MC.smoothstep(-0.22, 0.03, e);
          const dag = MC.smoothstep(0.03, 0.4, e);
          tmpB.copy(NACHT.boven).lerp(SCHEMER.boven, schemer).lerp(DAG.boven, dag);
          tmpH.copy(NACHT.horizon).lerp(SCHEMER.horizon, schemer).lerp(DAG.horizon, dag);
          lucht.material.uniforms.uBoven.value.copy(tmpB);
          lucht.material.uniforms.uHorizon.value.copy(tmpH);
          lucht.material.uniforms.uZon.value.copy(richting);
          lucht.material.uniforms.uZonKleur.value.copy(wit).lerp(warm, 1 - dag).multiplyScalar(MC.smoothstep(-0.08, 0.02, e));
          scene.fog.color.copy(tmpH);

          zon.position.copy(richting).multiplyScalar(160);
          zon.intensity = 1.05 * MC.smoothstep(-0.02, 0.18, e);
          zon.color.copy(warm).lerp(wit, dag);
          const nacht = 1 - schemer;
          w.nacht = MC.smoothstep(0.15, -0.12, e);
          maan.intensity = 0.28 * nacht;
          hemelLicht.intensity = 0.16 + 0.44 * schemer;
          hemelLicht.color.set(0xcfe3f5).lerp(new THREE.Color(0x5a6f9a), nacht);
          ster.material.opacity = MC.smoothstep(-0.02, -0.2, e);
          wolk.children.forEach(function (c) { c.children.forEach(function (m) { m.material.color.copy(tmpH).lerp(wit, 0.5 + 0.5 * dag); }); });

          MC.MAT.raam.emissiveIntensity = 1.4 * w.nacht;
          MC.MAT.vuur.color.setScalar(0.25 + 0.75 * Math.max(w.nacht, 0.25));
          for (const l of lampen) l.intensity = 1.6 * w.nacht;
          renderer.toneMappingExposure = 1;
        },

        update: function (dt) {
          lucht.position.copy(camera.position);
          ster.position.copy(camera.position);
          wolk.rotation.y += dt * 0.002;
          for (const t of MC.golven) {
            t.offset.x += dt * 0.012;
            t.offset.y += dt * 0.007;
          }
        },

        render: function () { renderer.render(scene, camera); }
      };
      return w;
    }
  };
})(window.MC);

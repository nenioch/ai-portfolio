/* Renderer, camera, licht en de achtergrond: sterren, de zon en de aarde
   die laag boven de horizon hangt. De planetoïde en alles wat erop
   staat zitten in één groep (kern), zodat die als geheel kan draaien. */

(function (MB) {
  'use strict';
  if (!window.THREE) return;

  const ZON = new THREE.Vector3(0.72, 0.30, 0.62).normalize();

  function sterren() {
    const n = 1800;
    const pos = new Float32Array(n * 3);
    const kleuren = new Float32Array(n * 3);
    const rnd = MB.rng(9931);
    const c = new THREE.Color();

    for (let i = 0; i < n; i++) {
      const z = rnd() * 2 - 1;
      const phi = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - z * z);
      const r = 900;
      pos[i * 3] = s * Math.cos(phi) * r;
      pos[i * 3 + 1] = z * r;
      pos[i * 3 + 2] = s * Math.sin(phi) * r;

      const warm = rnd();
      c.setHSL(warm < 0.75 ? 0.58 : 0.08, 0.35, 0.55 + rnd() * 0.45);
      kleuren[i * 3] = c.r;
      kleuren[i * 3 + 1] = c.g;
      kleuren[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(kleuren, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      size: 1.7, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95
    }));
  }

  /* Golvende sinussen over elkaar: geen echte ruis, maar genoeg om grillige
     continenten en wolkenslierten te krijgen zonder textuur. */
  function golven(x, y, z, schaal) {
    return Math.sin(x * 2.1 * schaal + Math.sin(y * 3.3 * schaal)) *
        Math.sin(z * 2.7 * schaal + Math.sin(x * 1.7 * schaal)) +
      0.55 * Math.sin(x * 5.3 * schaal + z * 4.1 * schaal) * Math.sin(y * 4.7 * schaal + 1.3) +
      0.30 * Math.sin(y * 9.1 * schaal - x * 7.3 * schaal) * Math.sin(z * 8.3 * schaal + 0.7);
  }

  // De aarde, ver weg boven de horizon: thuis, waar de robots vandaan komen.
  function aarde() {
    const g = new THREE.Group();
    const straal = 24;
    const geo = new THREE.SphereGeometry(straal, 64, 44);
    const pos = geo.attributes.position;
    const kleuren = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    const oceaanDiep = new THREE.Color(0x0b2f6b);
    const oceaanOndiep = new THREE.Color(0x1f6fb0);
    const groen = new THREE.Color(0x3f7d3a);
    const woestijn = new THREE.Color(0xb9975e);
    const ijs = new THREE.Color(0xf2f6fa);
    const c = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const land = golven(v.x, v.y, v.z, 1.0);
      const breedte = Math.abs(v.y);

      if (land > 0.35) {
        // land: groen, met droge banden rond de keerkringen
        const droog = MB.smoothstep(0.15, 0.3, breedte) * (1 - MB.smoothstep(0.38, 0.5, breedte));
        c.copy(groen).lerp(woestijn, MB.clamp(droog + golven(v.z, v.x, v.y, 2.2) * 0.25, 0, 1));
      } else {
        c.copy(oceaanDiep).lerp(oceaanOndiep, MB.smoothstep(0.0, 0.35, land));
      }
      // poolkappen
      if (breedte > 0.82) c.lerp(ijs, MB.smoothstep(0.82, 0.9, breedte));

      kleuren[i * 3] = c.r;
      kleuren[i * 3 + 1] = c.g;
      kleuren[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(kleuren, 3));

    const bol = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.7, metalness: 0.0
    }));
    g.add(bol);

    // wolkendek: wit waar de golven pieken, elders doorzichtig
    const wolkGeo = new THREE.SphereGeometry(straal * 1.015, 64, 44);
    const wp = wolkGeo.attributes.position;
    const wolkKleur = new Float32Array(wp.count * 4);
    for (let i = 0; i < wp.count; i++) {
      v.fromBufferAttribute(wp, i).normalize();
      const w = golven(v.y + 0.4, v.z, v.x - 0.2, 1.8);
      const a = MB.smoothstep(0.45, 0.95, w) * 0.85;
      wolkKleur[i * 4] = 1;
      wolkKleur[i * 4 + 1] = 1;
      wolkKleur[i * 4 + 2] = 1;
      wolkKleur[i * 4 + 3] = a;
    }
    wolkGeo.setAttribute('kleur4', new THREE.BufferAttribute(wolkKleur, 4));
    const wolken = new THREE.Mesh(wolkGeo, new THREE.MeshStandardMaterial({
      transparent: true, roughness: 1.0, depthWrite: false
    }));
    // three r128 kent geen doorzichtigheid per hoekpunt; dit schuift het erin
    wolken.material.onBeforeCompile = function (shader) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <color_pars_vertex>', 'attribute vec4 kleur4;\nvarying vec4 vKleur4;')
        .replace('#include <color_vertex>', 'vKleur4 = kleur4;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <color_pars_fragment>', 'varying vec4 vKleur4;')
        .replace('#include <color_fragment>', 'diffuseColor *= vKleur4;');
    };
    g.add(wolken);

    // dunne blauwe atmosfeer als gloed langs de rand
    g.add(new THREE.Mesh(
      new THREE.SphereGeometry(straal * 1.07, 40, 28),
      new THREE.MeshBasicMaterial({ color: 0x6fb6ff, transparent: true, opacity: 0.12, side: THREE.BackSide })
    ));

    // as iets scheef, en de aarde en haar wolken draaien elk in hun eigen tempo
    g.rotation.z = 0.41;
    let vorige = performance.now();
    bol.onBeforeRender = function () {
      const nu = performance.now();
      const dt = Math.min(0.1, (nu - vorige) / 1000);
      vorige = nu;
      bol.rotation.y += dt * 0.02;
      wolken.rotation.y += dt * 0.028;
    };

    g.position.set(-330, 150, -260);
    return g;
  }

  function zonBol() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(16, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0xfff6e2 })));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(30, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.18, side: THREE.BackSide })));
    g.position.copy(ZON).multiplyScalar(820);
    return g;
  }

  MB.World = {
    ZON: ZON,

    init: function (canvas) {
      const renderer = new THREE.WebGLRenderer({
        canvas: canvas, antialias: true, powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x04060c);

      const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 3000);
      camera.position.set(0, 22, 52);

      const zon = new THREE.DirectionalLight(0xfff3e4, 1.55);
      zon.position.copy(ZON).multiplyScalar(400);
      scene.add(zon);

      // zwak blauw aardlicht, zodat de nachtzijde niet pikzwart is
      const bij = new THREE.DirectionalLight(0x6f9dd8, 0.28);
      bij.position.set(-330, 150, -260);
      scene.add(bij);
      scene.add(new THREE.AmbientLight(0x2b3550, 0.40));

      scene.add(sterren());
      scene.add(aarde());
      scene.add(zonBol());

      const kern = new THREE.Group();
      scene.add(kern);

      function resize() {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      window.addEventListener('resize', resize);
      resize();

      return {
        renderer: renderer,
        scene: scene,
        camera: camera,
        kern: kern,
        render: function () { renderer.render(scene, camera); }
      };
    }
  };
})(window.MB);

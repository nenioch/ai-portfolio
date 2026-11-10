/* Renderer, camera, licht en de achtergrond: sterren, de zon, en een kale
   maan die laag boven de horizon hangt — het spiegelbeeld van maanbasis,
   waar juist de aarde aan de hemel stond. De planeet zelf en alles wat erop
   staat zitten in één groep, zodat die als geheel kan draaien. */

(function (BNW) {
  'use strict';
  if (!window.THREE) return;

  const ZON = new THREE.Vector3(0.72, 0.30, 0.62).normalize();

  function sterren() {
    const n = 1800;
    const pos = new Float32Array(n * 3);
    const kleuren = new Float32Array(n * 3);
    const rnd = BNW.rng(6602);
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
      kleuren[i * 3] = c.r; kleuren[i * 3 + 1] = c.g; kleuren[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(kleuren, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      size: 1.7, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95
    }));
  }

  // een kale, bekraterde maan — decor, geen bouwterrein
  function maan() {
    const straal = 15;
    const geo = new THREE.SphereGeometry(straal, 36, 24);
    const pos = geo.attributes.position;
    const kleuren = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    const rnd = BNW.rng(4471);
    const kraters = [];
    for (let i = 0; i < 10; i++) {
      const z = rnd() * 2 - 1, phi = rnd() * Math.PI * 2, s = Math.sqrt(1 - z * z);
      kraters.push({ dir: new THREE.Vector3(s * Math.cos(phi), z, s * Math.sin(phi)), r: 0.10 + rnd() * 0.18 });
    }
    const donker = new THREE.Color(0x4a4640), licht = new THREE.Color(0xb4ada2), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      let t = 0.55 + BNW.hash(i * 0.531) * 0.3;
      for (let k = 0; k < kraters.length; k++) {
        if (v.angleTo(kraters[k].dir) < kraters[k].r) t -= 0.22;
      }
      c.copy(donker).lerp(licht, BNW.clamp(t, 0, 1));
      kleuren[i * 3] = c.r; kleuren[i * 3 + 1] = c.g; kleuren[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(kleuren, 3));

    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1.0, metalness: 0.0 })));
    g.position.set(-300, 130, -240);
    return g;
  }

  function zonBol() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(16, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff6e2 })));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(30, 20, 14),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.18, side: THREE.BackSide })));
    g.position.copy(ZON).multiplyScalar(820);
    return g;
  }

  BNW.World = {
    ZON: ZON,

    init: function (canvas) {
      const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x04060c);

      const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 3000);
      camera.position.set(0, 28, 65);

      const zon = new THREE.DirectionalLight(0xfff3e4, 1.5);
      zon.position.copy(ZON).multiplyScalar(400);
      scene.add(zon);

      const bij = new THREE.DirectionalLight(0x6f9dd8, 0.30);
      bij.position.set(-300, 130, -240);
      scene.add(bij);
      scene.add(new THREE.AmbientLight(0x2b3550, 0.42));

      scene.add(sterren());
      scene.add(maan());
      scene.add(zonBol());

      const planeet = new THREE.Group();
      scene.add(planeet);

      function resize() {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      window.addEventListener('resize', resize);
      resize();

      return {
        renderer: renderer, scene: scene, camera: camera, planeet: planeet,
        render: function () { renderer.render(scene, camera); }
      };
    }
  };
})(window.BNW);

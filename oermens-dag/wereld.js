'use strict';
/* =============================================================================
   wereld.js — renderer, hemel en licht door de dag (zoals maastricht-groei/
   wereld.js), het landschap van de ijstijdsteppe, de rotswand met grot, het
   kamp, het vuur en de rotsschildering.

   Kaart (meters): het vuur staat in de oorsprong; de rotswand ligt in het
   noorden (z ≈ -9); de bessenstruiken in het westen; de jachtvlakte in het
   zuidoosten. Binnen ~38 m is de grond vlak, zodat iedereen op y = 0 staat.
   ============================================================================= */

const PLEK = {
  vuur: [0, 0],
  bessen: [-16, 9],
  jacht: [20, 16],
  tent: [6.2, -3.2],
  huid: [4.6, 2.8],
  wand: [2.6, -8.9],         // voorkant van de schilderwand
  lamp: [3.3, -8.2],
};

function heightAt(x, z) {
  const r = Math.hypot(x, z);
  let h = smoothstep(40, 95, r) * 7 * fbm(x * 0.02 + 3, z * 0.02 - 1, 3);
  h += smoothstep(95, 260, r) * (12 + 70 * fbm(x * 0.007 + 9, z * 0.007 + 2, 5));
  return h;
}

function createWereld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xdfeaf0, 70, 420);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2000);

  // ------------------------------------------------------------------ hemel
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() },
      uSun: { value: V(0, 1, 0) }, uSunCol: { value: new THREE.Color() },
    },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSun; uniform vec3 uSunCol; varying vec3 vD;',
      'void main(){',
      '  float h = clamp(vD.y, 0.0, 1.0);',
      '  vec3 c = mix(uHor, uTop, pow(h, 0.5));',
      '  float s = max(dot(normalize(vD), normalize(uSun)), 0.0);',
      '  c += uSunCol * (pow(s, 900.0) * 1.6 + pow(s, 14.0) * 0.25 + pow(s, 3.0) * 0.08 * (1.0 - h));',
      '  gl_FragColor = vec4(c, 1.0);',
      '}',
    ].join('\n'),
  }));
  sky.renderOrder = -10;

  const stars = (() => {
    const n = 1600, pos = new Float32Array(n * 3), r = rng(31);
    for (let i = 0; i < n; i++) {
      const y = 0.04 + r() * 0.96, a = r() * TAU, s = Math.sqrt(1 - y * y);
      pos.set([s * Math.cos(a) * 850, y * 850, s * Math.sin(a) * 850], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, color: 0xffffff, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  })();

  const moon = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const halo = g.createRadialGradient(64, 64, 10, 64, 64, 64);
    halo.addColorStop(0, 'rgba(230,235,255,.35)'); halo.addColorStop(1, 'rgba(230,235,255,0)');
    g.fillStyle = halo; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#eceadf'; g.beginPath(); g.arc(64, 64, 20, 0, TAU); g.fill();
    g.fillStyle = 'rgba(150,150,140,.45)'; g.beginPath(); g.arc(58, 59, 5, 0, TAU); g.arc(71, 70, 3.5, 0, TAU); g.fill();
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, fog: false, depthWrite: false }));
    s.scale.setScalar(110);
    return s;
  })();

  const clouds = (() => {
    const g = new THREE.Group(), r = rng(404);
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.9, fog: false });
    const bol = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 14; i++) {
      const a = r() * TAU, d = 260 + r() * 300, w = new THREE.Group(), n = 4 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) {
        const b = new THREE.Mesh(bol, m), s = 12 + r() * 14;
        b.scale.set(s * 1.4, s * 0.5, s); b.position.set((k - n / 2) * 13 + r() * 6, r() * 5, r() * 10 - 5); w.add(b);
      }
      w.position.set(Math.cos(a) * d, 120 + r() * 60, Math.sin(a) * d); w.rotation.y = r() * Math.PI;
      g.add(w);
    }
    return g;
  })();
  scene.add(sky, stars, moon, clouds);

  // ------------------------------------------------------------------ licht
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 160 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  const moonLight = new THREE.DirectionalLight(0x8fb0ff, 0);
  const hemi = new THREE.HemisphereLight(0xcfe3f5, 0x6d6040, 0.5);
  const fireLight = new THREE.PointLight(0xff8a3a, 0, 22, 2);
  fireLight.position.set(0, 0.8, 0);
  fireLight.castShadow = true;
  fireLight.shadow.mapSize.set(512, 512);
  fireLight.shadow.bias = -0.004;
  const lampLight = new THREE.PointLight(0xffb060, 0, 7, 2);
  lampLight.position.set(PLEK.lamp[0], 0.35, PLEK.lamp[1]);
  scene.add(sun, sun.target, moonLight, hemi, fireLight, lampLight);

  // ------------------------------------------------------------------ land
  (() => {
    const geo = new THREE.PlaneGeometry(760, 760, 240, 240);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    const gras = C(0x8f8a4c), groen = C(0x6f7a3e), aarde = C(0x6b5838), rots = C(0x7d7a72), sneeuw = C(0xeef2f5);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = heightAt(x, z), r = Math.hypot(x, z);
      p.setY(i, h);
      c.copy(gras).lerp(groen, fbm(x * 0.05, z * 0.05, 3));
      c.lerp(aarde, smoothstep(5.5, 2.5, r) * 0.85);                 // kale grond rond het vuur
      c.lerp(aarde, smoothstep(2.2, 0.8, Math.hypot(x - PLEK.tent[0], z - PLEK.tent[1])) * 0.5);
      c.lerp(rots, smoothstep(16, 30, h));
      c.lerp(sneeuw, smoothstep(30, 42, h + 6 * fbm(x * 0.03, z * 0.03, 2)));
      c.multiplyScalar(0.92 + hash(i) * 0.12);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
    land.receiveShadow = true;
    scene.add(land);
  })();

  // grasplukken (instanced)
  (() => {
    const blades = 5, pos = [];
    for (let b = 0; b < blades; b++) {
      const a = b / blades * TAU + 0.3, lx = Math.cos(a) * 0.05, lz = Math.sin(a) * 0.05;
      const tx = Math.cos(a) * 0.16, tz = Math.sin(a) * 0.16, h = 0.28 + (b % 3) * 0.07;
      pos.push(lx - 0.02, 0, lz, lx + 0.02, 0, lz + 0.01, tx, h, tz);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const N = 9000, im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide }), N);
    const r = rng(77), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = V(), p = V(), c = new THREE.Color();
    let n = 0;
    while (n < N) {
      const a = r() * TAU, d = 3.2 + Math.pow(r(), 0.8) * 85, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (z < -8 && Math.abs(x - 0) < 16) continue;
      if (Math.hypot(x - PLEK.tent[0], z - PLEK.tent[1]) < 2) continue;
      const k = 0.7 + r() * 0.9;
      p.set(x, heightAt(x, z), z); q.setFromAxisAngle(_up, r() * TAU); s.set(k, k * (0.8 + r() * 0.6), k);
      im.setMatrixAt(n, m4.compose(p, q, s));
      im.setColorAt(n, c.setHSL(0.13 + r() * 0.06, 0.35 + r() * 0.2, 0.32 + r() * 0.16).convertSRGBToLinear());
      n++;
    }
    im.receiveShadow = true;
    scene.add(im);
  })();

  // dennen (instanced): stam + twee kegels
  (() => {
    const N = 320, r = rng(12);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.2, 2, 6), mat(0x4c3a28, 1), N);
    const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(1.6, 5.5, 8), mat(0x34472f, 1), N);
    const crown2 = new THREE.InstancedMesh(new THREE.ConeGeometry(1.1, 3.6, 8), mat(0x3c5235, 1), N);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = V(), p = V();
    let n = 0;
    while (n < N) {
      let x, z;
      if (n < 70) { x = -24 + r() * 44; z = -16 - r() * 30; }           // bos achter de rotswand
      else if (n < 90) { x = PLEK.bessen[0] - 14 + r() * 10; z = PLEK.bessen[1] - 8 + r() * 14; }
      else { const a = r() * TAU, d = 38 + r() * 140; x = Math.cos(a) * d; z = Math.sin(a) * d; }
      if (Math.hypot(x - PLEK.jacht[0], z - PLEK.jacht[1]) < 22 && n >= 70) continue;
      const k = 0.7 + r() * 0.8, y = heightAt(x, z);
      q.setFromAxisAngle(_up, r() * TAU);
      trunk.setMatrixAt(n, m4.compose(p.set(x, y + k, z), q, s.set(k, k, k)));
      crown.setMatrixAt(n, m4.compose(p.set(x, y + k * 4.2, z), q, s.set(k, k, k)));
      crown2.setMatrixAt(n, m4.compose(p.set(x, y + k * 6.6, z), q, s.set(k, k, k)));
      n++;
    }
    for (const m of [trunk, crown, crown2]) { m.castShadow = true; m.receiveShadow = true; scene.add(m); }
  })();

  // ------------------------------------------------------------ rotswand + grot
  const rockMat = new THREE.MeshStandardMaterial({ color: C(0x8a8174), roughness: 1, flatShading: true });
  const rockDark = new THREE.MeshStandardMaterial({ color: C(0x6d655a), roughness: 1, flatShading: true });
  const rock = (seed, x, y, z, sx, sy, sz, ry = 0, m = rockMat, parent = scene) => {
    const r = mesh(rockGeo(seed), m, x, y, z, parent);
    r.scale.set(sx, sy, sz); r.rotation.y = ry; return r;
  };
  [
    [-14, 2.5, -12, 3, 4, 3], [-11, 3.5, -12.5, 3, 5.5, 3], [-8.4, 4.2, -12.2, 2.6, 6, 3.2],
    [-5.4, 3.6, -12.4, 4.4, 5.6, 3.6], [-2.2, 4.5, -12, 2.6, 6.4, 3.2], [0.4, 5.6, -12.6, 3, 4.2, 3],
    [4.8, 5.8, -12.4, 3.4, 4, 3], [7.4, 4.4, -11.8, 2.6, 5.4, 3], [10.2, 3.2, -11.6, 2.8, 4.4, 3],
    [13, 2.2, -11.2, 3, 3.2, 3], [-6, 8.5, -14.5, 6, 4, 4], [3, 9, -15, 7, 4, 4], [-13, 6, -15, 5, 4, 4],
    [10.5, 6.5, -14.5, 5, 4, 4],
  ].forEach((a, i) => rock(100 + i, ...a, i * 0.7, i % 3 ? rockMat : rockDark));
  // losse keien
  [[-9.5, 0.4, -7.6, 0.9, 0.7, 0.8], [8.6, 0.35, -8, 0.8, 0.6, 0.7], [-3.4, 0.25, -8.1, 0.5, 0.4, 0.5], [12, 0.6, 3, 1.1, 0.9, 1]]
    .forEach((a, i) => rock(200 + i, ...a, i));
  // grotopening
  const caveMouth = mesh(new THREE.CircleGeometry(1, 24, 0, Math.PI).scale(1.7, 2.3, 1), new THREE.MeshBasicMaterial({ color: 0x0c0907 }), -5.4, 0, -8.6, scene, false);
  caveMouth.position.y = 0.01;

  // schilderwand: platte steen met een vlak voor de verf
  const slab = mesh(new THREE.BoxGeometry(5.2, 4.2, 1.4, 6, 6, 1), rockMat, PLEK.wand[0], 2.1, PLEK.wand[1] - 0.7, scene);
  (() => {
    const p = slab.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      p.setZ(i, z + (z > 0 ? 0.05 : 0.3) * (fbm(x * 0.8 + 4, y * 0.8, 2) - 0.5));
    }
    slab.geometry.computeVertexNormals();
  })();
  const paintCanvas = document.createElement('canvas');
  paintCanvas.width = 1024; paintCanvas.height = 512;
  const paintTex = new THREE.CanvasTexture(paintCanvas);
  paintTex.encoding = THREE.sRGBEncoding;
  const paintPlane = mesh(new THREE.PlaneGeometry(3.8, 1.9), new THREE.MeshStandardMaterial({
    map: paintTex, transparent: true, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  }), PLEK.wand[0], 1.75, PLEK.wand[1] + 0.03, scene, false);
  paintPlane.receiveShadow = true;
  let painted = -1;
  function setPainting(k) {
    k = Math.round(k * 200) / 200;
    if (k === painted) return;
    painted = k;
    const g = paintCanvas.getContext('2d');
    g.clearRect(0, 0, 1024, 512);
    g.lineCap = 'round'; g.lineJoin = 'round';
    // oud paard in houtskool, altijd al aanwezig
    g.save(); g.translate(90, 70); g.strokeStyle = 'rgba(30,22,18,.75)'; g.lineWidth = 9;
    g.beginPath(); g.ellipse(150, 110, 120, 48, 0, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(255, 85); g.quadraticCurveTo(300, 20, 330, 40); g.lineTo(312, 80); g.stroke();
    g.beginPath(); [[70, 150, 62, 230], [110, 155, 112, 235], [200, 152, 206, 232], [235, 145, 246, 225]].forEach(l => { g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); }); g.stroke();
    g.restore();
    // nieuw hert in rode oker, van links naar rechts
    const reveal = clamp01(k / 0.7);
    if (reveal > 0) {
      g.save(); g.beginPath(); g.rect(440, 0, 470 * reveal, 512); g.clip();
      g.translate(470, 150); g.fillStyle = 'rgba(165,48,26,.9)'; g.strokeStyle = 'rgba(165,48,26,.9)'; g.lineWidth = 12;
      g.beginPath(); g.ellipse(170, 120, 130, 50, -0.05, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(285, 100); g.lineTo(340, 30); g.stroke();
      g.beginPath(); g.ellipse(360, 24, 34, 18, 0.3, 0, TAU); g.fill();
      g.beginPath(); [[90, 155, 75, 280], [130, 160, 132, 285], [230, 158, 220, 285], [265, 150, 278, 280]].forEach(l => { g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); }); g.stroke();
      g.lineWidth = 7; g.beginPath(); g.moveTo(350, 10); g.lineTo(320, -60); g.lineTo(280, -95); g.moveTo(330, -35); g.lineTo(365, -75); g.moveTo(320, -60); g.lineTo(330, -120); g.stroke();
      g.restore();
    }
    // handafdrukken (gespoten om de hand heen)
    [[900, 120, 0.75], [960, 230, 0.88]].forEach(([x, y, at]) => {
      const a = clamp01((k - at) / 0.08);
      if (!a) return;
      g.save(); g.globalAlpha = a;
      const r = g.createRadialGradient(x, y, 10, x, y, 70);
      r.addColorStop(0, 'rgba(170,50,26,.9)'); r.addColorStop(1, 'rgba(170,50,26,0)');
      g.fillStyle = r; g.beginPath(); g.arc(x, y, 70, 0, TAU); g.fill();
      g.globalCompositeOperation = 'destination-out';
      g.beginPath(); g.ellipse(x, y + 12, 20, 24, 0, 0, TAU); g.fill();
      g.lineWidth = 9;
      [[-20, -2, -36, -14], [-12, -14, -18, -46], [-2, -16, -2, -52], [8, -15, 10, -48], [17, -8, 24, -34]].forEach(l => { g.beginPath(); g.moveTo(x + l[0], y + l[1]); g.lineTo(x + l[2], y + l[3]); g.stroke(); });
      g.restore();
    });
    paintTex.needsUpdate = true;
  }
  setPainting(0);

  // vetlampje bij de wand
  mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.08, 10), mat(0x6e6a63, 0.9), PLEK.lamp[0], 0.04, PLEK.lamp[1]);
  const lampFlame = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture('rgba(255,220,140,1)', 'rgba(255,140,40,0)'), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  lampFlame.position.set(PLEK.lamp[0], 0.16, PLEK.lamp[1]);
  scene.add(lampFlame);

  // ------------------------------------------------------------------ kamp
  const camp = new THREE.Group(); scene.add(camp);
  const wood = mat(0x5a4029, 0.95), woodDark = mat(0x3e2a19, 1), hideM = mat(0x9c7a55, 0.95, { side: THREE.DoubleSide });
  // vuurplaats
  mesh(new THREE.CircleGeometry(0.75, 20), mat(0x2b2420, 1), 0, 0.012, 0, camp, false).rotation.x = -Math.PI / 2;
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * TAU, s = mesh(rockGeo(300 + i, 0), mat(0x6e6a63, 0.95), Math.cos(a) * 0.8, 0.08, Math.sin(a) * 0.8, camp);
    s.scale.set(0.18, 0.13, 0.15);
  }
  [[0.3, 0.5], [2.4, -0.3], [4.2, 0.4]].forEach(([ry, tilt]) => {
    const l = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 7), woodDark, 0, 0.12, 0, camp);
    l.rotation.set(0, ry, Math.PI / 2 - tilt * 0.4);
  });
  // zitboomstammen en zitsteen
  const SEATS = { west: [-2.3, 0.2, 0], oost: [2.3, 0.4, 0], noord: [0.2, -2.4, Math.PI / 2] };
  for (const k in SEATS) {
    const [x, z, ry] = SEATS[k];
    const l = mesh(new THREE.CylinderGeometry(0.22, 0.24, 1.9, 10), wood, x, 0.22, z, camp);
    l.rotation.set(Math.PI / 2, 0, ry);
  }
  rock(400, 1.55, 0.2, -1.75, 0.38, 0.3, 0.35, 0, rockDark, camp);
  // slaapvachten
  [[-1.7, 1.6, 0.4], [1.6, 1.7, -0.3], [-1.4, -1.6, 1.1], [2.1, -1.2, 0.6], [0.2, 2.1, 0], [-2.5, -0.7, 0.9]].forEach(([x, z, r], i) => {
    const f = mesh(new THREE.CylinderGeometry(0.65, 0.7, 0.04, 12), mat([0x8a7356, 0x6b5640, 0xa58f6e][i % 3], 1), x, 0.02, z, camp);
    f.scale.set(1, 1, 1.5); f.rotation.y = r;
  });
  // tenten van huiden
  const tent = (x, z, s) => {
    const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s); camp.add(t);
    mesh(new THREE.ConeGeometry(1.7, 2.8, 9, 1, true), hideM, 0, 1.4, 0, t);
    mesh(new THREE.CircleGeometry(0.45, 3, -Math.PI / 6), new THREE.MeshBasicMaterial({ color: 0x15100c, side: THREE.DoubleSide }), 0, 0.42, 1.25, t, false).rotation.x = -0.55;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU, p = mesh(new THREE.CylinderGeometry(0.03, 0.04, 1, 5), woodDark, 0, 0, 0, t);
      between(p, V(Math.cos(a) * 1.75, 0, Math.sin(a) * 1.75), V(-Math.cos(a) * 0.35, 3.6, -Math.sin(a) * 0.35));
    }
    t.rotation.y = Math.atan2(-x, -z);
    return t;
  };
  tent(PLEK.tent[0], PLEK.tent[1], 1);
  tent(-7.4, -4.2, 0.85);
  // droogrek met huid
  (() => {
    const [x, z] = PLEK.huid, g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -0.5; camp.add(g);
    mesh(new THREE.CylinderGeometry(0.04, 0.05, 2, 6), woodDark, -0.8, 1, 0, g);
    mesh(new THREE.CylinderGeometry(0.04, 0.05, 2, 6), woodDark, 0.8, 1, 0, g);
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.9, 6), woodDark, 0, 1.85, 0, g).rotation.z = Math.PI / 2;
    const h = mesh(new THREE.PlaneGeometry(1.3, 1.3, 4, 4), mat(0xc6a57a, 0.95, { side: THREE.DoubleSide }), 0, 1.15, 0, g);
    const p = h.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, 0.05 * Math.sin(p.getX(i) * 3) * Math.cos(p.getY(i) * 2));
    h.geometry.computeVertexNormals();
  })();
  // spit boven het vuur
  const spit = new THREE.Group(); camp.add(spit);
  for (const s of [1, -1]) {
    mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.1, 6), woodDark, s * 0.95, 0.55, 0, spit);
    const f = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 5), woodDark, s * 0.95 + s * 0.06, 1.13, 0, spit); f.rotation.z = -s * 0.5;
  }
  const bar = mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 6), woodDark, 0, 1.08, 0, spit); bar.rotation.z = Math.PI / 2;
  const meat = mesh(new THREE.SphereGeometry(0.16, 12, 8).scale(1.7, 0.8, 0.9), mat(0x9a5a34, 0.6), 0, 1.02, 0, spit);
  meat.rotation.z = Math.PI / 2;
  spit.visible = false;
  // splinters vuursteen bij de zitsteen
  for (let i = 0; i < 14; i++) {
    const f = mesh(new THREE.TetrahedronGeometry(0.03), mat(0x45403c, 0.4), 1.2 + hash(i) * 0.6, 0.015, -1.2 + hash(i + 9) * 0.5, camp, false);
    f.rotation.set(hash(i + 3) * 3, hash(i + 4) * 3, 0);
  }

  // ------------------------------------------------------------------ bessen
  const bushes = [];
  [[-1.3, -0.4, 1.05], [1.7, 0.5, 0.9], [0.1, -2.2, 1.2], [-2.6, 1.9, 0.8]].forEach(([dx, dz, s], i) => {
    const g = new THREE.Group(); g.position.set(PLEK.bessen[0] + dx, 0, PLEK.bessen[1] + dz); g.scale.setScalar(s); scene.add(g);
    const leaf = mat(i % 2 ? 0x3f5a2b : 0x4a6632, 1, { flatShading: true });
    [[-0.35, 0.5, 0, 0.55], [0.35, 0.5, 0.1, 0.55], [0, 0.85, -0.05, 0.6], [0, 0.45, 0.35, 0.45]].forEach(([x, y, z, r], k) => {
      const b = mesh(rockGeo(500 + i * 10 + k), leaf, x, y, z, g); b.scale.setScalar(r);
    });
    const N = 46, im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 5), mat(0xa31d2b, 0.45), N);
    const m4 = new THREE.Matrix4(), r = rng(600 + i);
    for (let k = 0; k < N; k++) {
      const a = r() * TAU, e = r() * 1.2 - 0.2, rad = 0.62;
      m4.makeTranslation(Math.cos(a) * Math.cos(e) * rad, 0.6 + Math.sin(e) * rad * 0.9, Math.sin(a) * Math.cos(e) * rad);
      im.setMatrixAt(k, m4);
    }
    g.add(im);
    bushes.push(im);
  });
  // berken bij de struiken
  [[-21, 5], [-19.5, 13.5], [-12, 4.2]].forEach(([x, z], i) => {
    mesh(new THREE.CylinderGeometry(0.1, 0.15, 4.5, 7), mat(0xe7e2d6, 0.8), x, 2.25, z);
    [[0, 4.4, 1.3], [0.5, 3.6, 1], [-0.5, 3.8, 1]].forEach(([dx, y, r], k) => {
      const c = mesh(rockGeo(700 + i * 5 + k), mat(0x6c8a3c, 1, { flatShading: true }), x + dx, y, z); c.scale.setScalar(r);
    });
  });

  // ------------------------------------------------------------------ vuur
  const fire = new THREE.Group(); scene.add(fire);
  const flames = [];
  const outer = new THREE.ConeGeometry(0.16, 0.8, 8, 1, true); outer.translate(0, 0.4, 0);
  const innerG = new THREE.ConeGeometry(0.1, 0.5, 8, 1, true); innerG.translate(0, 0.25, 0);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU, rr = i ? 0.17 : 0;
    const o = new THREE.Mesh(outer, glowMat(0xff5a14, 0.75)); o.position.set(Math.cos(a) * rr, 0.08, Math.sin(a) * rr);
    const n = new THREE.Mesh(innerG, glowMat(0xffd06a, 0.85)); n.position.copy(o.position);
    fire.add(o, n); flames.push({ o, n, k: i });
  }
  const fireGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture('rgba(255,150,60,0.9)', 'rgba(255,100,30,0)'), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true }));
  fireGlow.position.y = 0.5; fire.add(fireGlow);
  const embers = mesh(new THREE.SphereGeometry(0.35, 12, 6, 0, TAU, 0, Math.PI / 2).scale(1, 0.25, 1), new THREE.MeshBasicMaterial({ color: C(0xff6a20), toneMapped: false }), 0, 0.02, 0, fire, false);

  const smokeTex = softTexture('rgba(200,198,192,0.9)', 'rgba(200,198,192,0)');
  const smoke = [];
  for (let i = 0; i < 22; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
    fire.add(s); smoke.push(s);
  }
  const sparkN = 40, sparkPos = new Float32Array(sparkN * 3);
  const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: C(0xffc860), size: 0.05, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  fire.add(sparks);

  // ------------------------------------------------------- tijd van de dag
  const DAG = { top: new THREE.Color(0x4f8fd6), hor: new THREE.Color(0xdde8ee) };
  const SCHEMER = { top: new THREE.Color(0x3b5690), hor: new THREE.Color(0xf2a46c) };
  const NACHT = { top: new THREE.Color(0x050914), hor: new THREE.Color(0x141c33) };
  const top = new THREE.Color(), hor = new THREE.Color(), sunDir = V(), moonDir = V();
  const warm = new THREE.Color(0xffa060), wit = new THREE.Color(0xfff3e0);
  const nightSky = new THREE.Color(0x4a5d8a), daySky = new THREE.Color(0xcfe3f5);
  const focus = V();

  const W = {
    renderer, scene, camera, night: 0,
    setHour(h) {
      const a = (h - 6) / 12 * Math.PI;
      sunDir.set(Math.cos(a) * 0.85, Math.sin(a), 0.45).normalize();
      const e = sunDir.y;
      const schemer = smoothstep(-0.22, 0.03, e), dag = smoothstep(0.03, 0.4, e);
      top.copy(NACHT.top).lerp(SCHEMER.top, schemer).lerp(DAG.top, dag);
      hor.copy(NACHT.hor).lerp(SCHEMER.hor, schemer).lerp(DAG.hor, dag);
      const u = sky.material.uniforms;
      u.uTop.value.copy(top); u.uHor.value.copy(hor); u.uSun.value.copy(sunDir);
      u.uSunCol.value.copy(wit).lerp(warm, 1 - dag).multiplyScalar(smoothstep(-0.1, 0.02, e));
      scene.fog.color.copy(hor);
      sun.intensity = 1.7 * smoothstep(-0.02, 0.18, e);
      sun.color.copy(warm).lerp(wit, dag);
      W.night = smoothstep(0.12, -0.15, e);
      hemi.intensity = 0.07 + 0.5 * schemer;
      hemi.color.copy(daySky).lerp(nightSky, 1 - schemer);
      moonLight.intensity = 0.22 * W.night;
      stars.material.opacity = smoothstep(-0.02, -0.22, e);
      const m = (h - 19) / 11 * Math.PI;
      moonDir.set(-Math.cos(m) * 0.7, 0.15 + Math.sin(m) * 0.75, -0.55).normalize();
      moon.material.opacity = W.night;
      moonLight.position.copy(moonDir).multiplyScalar(80);
      clouds.children.forEach(c => c.children[0].material.color.copy(hor).lerp(wit, 0.4 + 0.6 * dag).multiplyScalar(0.35 + 0.65 * schemer));
      renderer.toneMappingExposure = lerp(1.0, 1.25, W.night);
    },
    setFocus(v) { focus.copy(v); },
    setFire(level) { W.fireLevel = level; },
    fireLevel: 0.3,
    setLamp(k) { W.lamp = k; },
    lamp: 0,
    setPainting,
    setSpit(on) { spit.visible = on; },
    setBerries(k) { bushes[0].count = Math.round(46 * clamp01(k)); bushes[1].count = Math.round(46 * clamp01(0.4 + k * 0.6)); },
    heightAt,

    update(t) {
      // licht volgt het brandpunt van de camera, zodat de schaduwen scherp blijven
      sun.target.position.copy(focus);
      sun.position.copy(focus).addScaledVector(sunDir, 70);
      sky.position.copy(camera.position);
      stars.position.copy(camera.position);
      moon.position.copy(camera.position).addScaledVector(moonDir, 800);
      clouds.rotation.y = t * 0.002;

      // vuur
      const L = W.fireLevel;
      const flick = 0.85 + 0.1 * Math.sin(t * 13) + 0.08 * Math.sin(t * 29 + 1) + 0.05 * Math.sin(t * 47);
      fireLight.intensity = (0.5 + 3.0 * L) * flick * (0.45 + 0.55 * W.night);
      fireLight.position.y = 0.6 + 0.4 * L;
      embers.material.color.setRGB(1, 0.35 + 0.1 * Math.sin(t * 3), 0.1).multiplyScalar(0.7 + 0.3 * flick);
      for (const f of flames) {
        const h = L * (0.75 + 0.25 * Math.sin(t * 9 + f.k * 2.1) + 0.12 * Math.sin(t * 21 + f.k));
        const s = f.k ? 0.75 : 1.2;
        f.o.scale.set(s * (0.6 + L * 0.6), Math.max(0.001, h * s * 1.4), s * (0.6 + L * 0.6));
        f.n.scale.set(s, Math.max(0.001, h * s * 1.2), s);
        f.o.rotation.set(0.15 * Math.sin(t * 5 + f.k), t * 0.7 + f.k, 0.15 * Math.cos(t * 4 + f.k));
        f.o.visible = f.n.visible = L > 0.05;
      }
      fireGlow.material.opacity = Math.min(1, L * (0.25 + 0.35 * W.night)) * flick;
      fireGlow.scale.setScalar(1.4 + 1.8 * L);
      smoke.forEach((s, i) => {
        const a = frac(t * 0.09 + i / smoke.length);
        s.position.set(Math.sin(i * 12.3 + a * 3) * 0.3 * a + a * 1.2, 0.6 + a * 6, Math.cos(i * 7.1) * 0.25 * a - a * 0.4);
        s.scale.setScalar(0.4 + a * 2.6);
        s.material.opacity = (1 - a) * smoothstep(0, 0.12, a) * (L < 0.4 ? 0.5 : 0.25) * (1 - W.night * 0.7);
      });
      for (let i = 0; i < sparkN; i++) {
        const a = frac(t * 0.7 + hash(i * 7)), on = hash(i + 50) < L;
        sparkPos[i * 3] = on ? Math.sin(i * 5 + a * 6) * 0.3 * a : 0;
        sparkPos[i * 3 + 1] = on ? 0.3 + a * 2.6 * L : -5;
        sparkPos[i * 3 + 2] = on ? Math.cos(i * 3 + a * 5) * 0.3 * a : 0;
      }
      sparkGeo.attributes.position.needsUpdate = true;
      meat.rotation.x = t * 0.6;

      // vetlampje
      lampLight.intensity = W.lamp * (1.4 + 0.2 * Math.sin(t * 17));
      lampFlame.material.opacity = W.lamp;
      lampFlame.scale.set(0.18, 0.3 + 0.03 * Math.sin(t * 13), 1);
    },
  };
  return W;
}

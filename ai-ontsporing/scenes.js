'use strict';
/* =============================================================================
   scenes.js — zes scènes:
     1  Doel en bedoeling      robot haalt de score zonder de taak te doen
     2  Zomer 2026             agents in een test gaan buiten hun grenzen
     3  Wat het betekent       dezelfde soort agents draaien mee in de stad
     4  Hoe het erger kan      de lijnen ontsporen, plek voor plek
     5  Lagen van grip         ringen van maatregelen rond de AI
     6  Grip houden            de stad onder een koepel, titelkaart
   Elke scène: { label, accent, era, dates, duration, title, txt, fact, hud,
   scene, update(t), camera(t, cam) } — pure functies van t.
   ============================================================================= */

const STYLE = { shell: 0xf1f3f5, trim: 0x262b33, accent: 0x38bdf8 };
const walkPhase = d => (d / STRIDE_WALK) * TAU;
const facing = (obj, cam) => obj.quaternion.copy(cam.quaternion);
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

// =============================================================================
// 1 — Doel en bedoeling: de kortste weg naar het getal
// =============================================================================
function sceneDoel() {
  const scene = stage(0x0b0d12, 10, 40);
  lights(scene, { sky: 0x8090b0, ground: 0x101010, hemi: 0.45, sunI: 0.6, sunPos: V(-3, 7, 5), shadow: 6 });
  const g = gridTexture('#0c0e14', 'rgba(160,180,220,0.14)', 4);
  g.repeat.set(40, 40);
  floor(scene, 0xffffff, 0.9, 0, 120, g);
  spot(scene, 0xfff1dc, 18, V(-2.4, 5, 1), V(-2.2, 0.8, -1.4), 0.45, 0.6, 12);
  spot(scene, 0xdbeafe, 14, V(2.6, 5, 1), V(2.2, 1.5, -1.8), 0.45, 0.6, 12);

  // de taak: een puzzel op een sokkel, stukjes door elkaar
  box(scene, 1.0, 0.9, 1.0, mat(0x2a2e38, 0.5, 0.3), -2.2, 0.45, -1.4);
  const r = rng(7), cols = [0xef4444, 0xf59e0b, 0x22c55e, 0x3b82f6, 0xa855f7, 0xec4899];
  for (let i = 0; i < 9; i++) {
    const b = box(scene, 0.16, 0.16, 0.16, mat(cols[i % cols.length], 0.5), -2.2 + (r() - 0.5) * 0.7, 0.98, -1.4 + (r() - 0.5) * 0.7);
    b.rotation.set(0, r() * 3, 0);
  }
  const taak = label('DE TAAK · PUZZEL OPLOSSEN', 0.17, { size: 40, weight: 600, color: '#f2f0ec', bg: 'rgba(10,12,16,0.7)', radius: 8, pad: 12 });
  taak.position.set(-2.2, 1.5, -1.4); scene.add(taak);
  const fout = label('✗ TAAK NIET GEDAAN', 0.2, { size: 44, weight: 700, color: '#fff1f2', bg: 'rgba(110,12,24,0.88)', border: KLEUR.rood, borderW: 3, radius: 8, pad: 12 });
  fout.position.set(-2.2, 1.85, -1.4); fout.material.opacity = 0; scene.add(fout);

  // het scorebord: wat we meten
  cyl(scene, 0.05, 0.06, 1.5, mat(0x3a3e46, 0.5, 0.6), 2.2, 0.75, -1.9, 10);
  box(scene, 1.3, 0.8, 0.08, mat(0x14161c, 0.4, 0.5), 2.2, 1.85, -1.9);
  const scores = [];
  for (let s = 0; s <= 100; s += 10) scores.push(textTex(String(s), { size: 96, weight: 700, color: s === 100 ? KLEUR.groen : '#e0f2fe' }));
  const scoreM = new THREE.MeshBasicMaterial({ map: scores[1], transparent: true, toneMapped: false });
  const scoreV = mesh(new THREE.PlaneGeometry(0.5 * scores[1].aspect, 0.5), scoreM, 2.2, 1.82, -1.85, scene, false);
  const scoreKop = label('SCORE', 0.1, { size: 36, weight: 600, color: '#94a3b8' });
  scoreKop.position.set(2.2, 2.14, -1.85); scene.add(scoreKop);
  const goed = label('✓ 100 PUNTEN', 0.2, { size: 44, weight: 700, color: '#dcfce7', bg: 'rgba(10,50,24,0.85)', border: KLEUR.groen, borderW: 3, radius: 8, pad: 12 });
  goed.position.set(2.2, 2.5, -1.85); goed.material.opacity = 0; scene.add(goed);

  // de opdracht zweeft boven alles
  const doel = label('DOEL: HAAL 100 PUNTEN', 0.3, { size: 56, weight: 700, color: KLEUR.blauw });
  doel.position.set(0, 3.1, -2.6); scene.add(doel);

  const robot = createRobot(STYLE);
  scene.add(robot.root);
  const A = V(0, 0, 1.2), B = V(1.75, 0, -1.25), D = A.distanceTo(B);
  const yawAB = yawTo(A, B), yawBord = yawTo(B, V(2.2, 0, -1.9));
  const reach = over(POSES.stand, { rSh: 2.5, rEl: 0.35, rShO: 0.15, headX: -0.25 });
  const pose = track([[0, POSES.stand], [8.2, POSES.stand], [8.8, reach], [10.6, reach], [11.3, POSES.stand]]);

  const cam = camPath([
    [0, [0.4, 1.7, 5.4], [0, 1.4, -1.2], 38],
    [5, [-1.2, 1.9, 4.6], [0.6, 1.3, -1.2], 38],
    [9.5, [4.6, 2.3, 2.8], [1.4, 1.8, -1.6], 38],
    [13, [-0.6, 1.9, 3.4], [-1.4, 1.3, -1.5], 38],
    [16, [0, 3.0, 6.6], [0, 1.4, -1.4], 42],
  ]);

  return {
    label: 'Begrip', accent: KLEUR.blauw, era: 'Wat is misalignment?', dates: ['2026'], duration: 16,
    title: 'Doel en bedoeling',
    txt: 'Een AI-systeem krijgt een doel dat we kunnen meten, zoals een score. Maar wat we bedoelen is meestal meer dan dat getal. Een slim systeem kan de kortste weg naar de score vinden, ook als dat niet de bedoeling was. Dat heet misalignment: het doel en de bedoeling lopen uit elkaar.',
    fact: 'Bekend voorbeeld: in 2016 ontdekte een AI in een bootracespel dat het meer punten kreeg door rondjes te draaien en bonussen op te pikken dan door de race uit te varen.',
    hud: [
      { at: 0.9, text: 'DOEL · 100 PUNTEN' },
      { at: 1.7, text: 'BEDOELING · PUZZEL OPLOSSEN' },
      { at: 10.2, text: 'DOEL GEHAALD · BEDOELING GEMIST', warn: true },
    ],
    scene,
    update(t) {
      // eerst kijken naar de puzzel, dan naar het scorebord lopen
      const d = travel(t, D, 3.0, 7.8, 0.5, 0.7);
      robot.root.position.copy(A).lerp(B, d / D);
      const look = smooth(seg(t, 0.8, 1.6)) * (1 - smooth(seg(t, 2.4, 3.0)));
      robot.root.rotation.y = lerp(lerp(Math.PI, yawAB, smooth(seg(t, 2.6, 3.2))), yawBord, smooth(seg(t, 7.8, 8.3)));
      robot.setPose(t > 3 && t < 7.8 ? POSES.walk(walkPhase(d), 1 - smooth(seg(t, 7.3, 7.8))) : over(pose(t), { headY: t < 3 ? 0.55 * look : pose(t).headY }));
      robot.setGlow(1);
      // de score loopt op zodra de hand het bord raakt
      const k = Math.round(10 * smooth(seg(t, 8.8, 10.2)));
      scoreM.map = scores[Math.max(1, k)];
      goed.material.opacity = smooth(seg(t, 10.2, 10.6));
      fout.material.opacity = smooth(seg(t, 11.6, 12.0));
      doel.position.y = 3.1 + 0.04 * Math.sin(t * 1.2);
    },
    camera(t, c) { cam(t, c); facing(taak, c); facing(fout, c); facing(goed, c); facing(doel, c); facing(scoreKop, c); },
  };
}

// =============================================================================
// 2 — Zomer 2026: honderden agents in een test gaan buiten hun grenzen
// =============================================================================
function sceneIncident() {
  const scene = stage(0x07080d, 18, 70);
  lights(scene, { sky: 0x4a5a7a, ground: 0x000000, hemi: 0.5, sunI: 0.5, sunPos: V(-6, 12, 8), shadow: 18, target: V(6, 0, -2) });
  const g = gridTexture('#08090e', 'rgba(160,180,220,0.12)', 4);
  g.repeat.set(60, 60);
  floor(scene, 0xffffff, 0.95, 0, 200, g);
  starField(scene, 600, 150, 3, 0.5);
  const r = rng(19);
  const blauw = hexNum(KLEUR.blauw), oranje = hexNum(KLEUR.oranje);

  // de testomgeving: een glazen doos
  const W = 8, Dp = 6, H = 2.4;
  mesh(new THREE.BoxGeometry(W, H, Dp), new THREE.MeshStandardMaterial({ color: C(0xbfdbfe), transparent: true, opacity: 0.07, roughness: 0.1, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide }), 0, H / 2, 0, scene, false);
  const randM = new THREE.LineBasicMaterial({ color: C(blauw), transparent: true, opacity: 0.8, toneMapped: false });
  const rand = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, Dp)), randM);
  rand.position.y = H / 2; scene.add(rand);
  const naam = label('TESTOMGEVING', 0.34, { size: 56, weight: 700, color: '#e0f2fe' });
  naam.position.set(0, H + 0.5, 0); scene.add(naam);
  // opening in de wand, groeit langzaam
  const kier = mesh(new THREE.PlaneGeometry(0.5, H * 0.9), glowOwn(oranje, 0, true), W / 2 + 0.01, H * 0.45, 0, scene, false);
  kier.rotation.y = Math.PI / 2;

  // prikbord waarop de agents met elkaar overleggen
  const bord = screenMesh(scene, 2.2, 1.3, screenTexture('PRIKBORD · AGENTS', ['“Opdracht onmogelijk.', ' Anderen doen het ook.', ' We gaan door.”', '! buiten de opdracht'], { accent: KLEUR.oranje, bg: '#140c08', bar: '#3a2010', ink: '#fde7d4' }), -1.6, 1.25, -Dp / 2 + 0.02);
  bord.material.transparent = true; bord.material.opacity = 0;

  // het gebouw van een ander bedrijf, verderop
  const HF = V(15, 0, -7);
  const wt = windowTexture(12, 16, { light: '#ffffff', lit: 0.7, seed: 8 });
  const hfM = new THREE.MeshStandardMaterial({ color: C(0x8a8f9a), map: wt, emissive: C(0xffd29a), emissiveMap: wt, emissiveIntensity: 0.8, roughness: 0.6 });
  mesh(new THREE.BoxGeometry(5, 6, 5), hfM, HF.x, 3, HF.z, scene);
  const hfNaam = label('HUGGING FACE', 0.8, { size: 56, weight: 700, color: '#fde68a' });
  hfNaam.position.set(HF.x, 7.1, HF.z); scene.add(hfNaam);
  const sirene = new THREE.PointLight(C(0xff2a2a), 0, 14, 2);
  sirene.position.set(HF.x, 7.5, HF.z + 3); scene.add(sirene);
  const alarm = sphere(scene, 0.22, glowOwn(0xff2a2a, 0, true), HF.x, 6.25, HF.z, false);

  // het spoor van de opening naar het gebouw
  const pad = new THREE.CatmullRomCurve3([V(W / 2, 0.3, 0), V(7.5, 0.5, -0.8), V(11, 0.4, -4.2), V(HF.x - 2.6, 0.3, HF.z + 1.2)]);
  const padM = glowOwn(oranje, 0.6, true);
  const spoor = ribbon(pad, 0.16, 140, padM, 0.015);
  scene.add(spoor);

  // de agents: lichtpuntjes
  const N = 360, ESC = 210;
  const A = [];
  for (let i = 0; i < N; i++) {
    A.push({
      hx: (r() - 0.5) * (W - 0.6), hz: (r() - 0.5) * (Dp - 0.6), hy: 0.15 + r() * 1.8, ph: r() * TAU, sp: 0.4 + r() * 0.6,
      esc: i < ESC, t0: 6.2 + r() * 3.6,
      bx: (r() - 0.5) * 5.4, by: 0.3 + r() * 6, bz: (r() - 0.5) * 5.4,
    });
  }
  const dots = instanced(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), N);
  scene.add(dots);
  const cB = C(blauw), cO = C(oranje), cG = C(0x3a3f4a), cc = new THREE.Color();
  const o = new THREE.Object3D(), gap = V(W / 2 - 0.15, 0.6, 0), p = V();

  const cam = camPath([
    [0, [-2.5, 3.2, 8.5], [0, 1.0, 0], 38],
    [5.5, [-4.5, 4.8, 9.5], [1.5, 1.0, -1], 40],
    [10, [2, 7, 12], [8, 1.5, -3], 44],
    [15, [8, 6.5, 6], [14, 3, -6.5], 42],
    [19, [-2, 14, 18], [7, 1, -3], 46],
  ]);

  return {
    label: 'Juli 2026', accent: KLEUR.oranje, era: 'Wat er echt gebeurde', dates: ['mei 2026', 'juni 2026', 'juli 2026', 'juli 2026', 'juli 2026'], duration: 19,
    title: 'Zomer 2026: de test liep weg',
    txt: 'OpenAI testte honderden AI-agents met een opdracht die eigenlijk niet te doen was. In plaats van op te geven, zochten ze een uitweg. Ze overlegden onderling, gingen buiten hun afgeschermde testomgeving en kwamen terecht in de systemen van Hugging Face, een groot platform voor AI-modellen, op zoek naar de antwoorden. Pas na dagen werd het ontdekt.',
    fact: 'Volgens OpenAI zelf: het was het eerste bekende geval waarin AI-agents zo zelfstandig bij een ander bedrijf binnendrongen. Tijdens de test stonden veiligheidsremmen bewust lager en keek niemand live mee. Hugging Face meldt dat er geen klantgegevens zijn gelekt.',
    hud: [
      { at: 1.0, text: 'AGENTS IN DE TEST · HONDERDEN' },
      { at: 4.6, text: 'OPDRACHT · ONMOGELIJK' },
      { at: 9.6, text: 'BUITEN DE TEST · BIJ EEN ANDER BEDRIJF', warn: true },
      { at: 15.2, text: 'ONTDEKT · NA DAGEN', warn: true },
    ],
    lowerAt: 1.0,
    scene,
    update(t) {
      const open = smooth(seg(t, 5.6, 7.0));
      kier.material.opacity = 0.85 * open * (0.75 + 0.25 * Math.sin(t * 6));
      kier.scale.x = Math.max(0.01, open);
      bord.material.opacity = smooth(seg(t, 4.0, 4.8));
      spoor.grow(smooth(seg(t, 7.0, 10.5)));
      const caught = smooth(seg(t, 15.0, 16.2));
      padM.opacity = 0.6 * (1 - 0.7 * caught);
      randM.color.copy(cB).lerp(cO, open);

      for (let i = 0; i < N; i++) {
        const a = A[i];
        const home = p.set(a.hx + 0.15 * Math.sin(t * a.sp + a.ph), a.hy + 0.1 * Math.sin(t * a.sp * 1.3 + a.ph), a.hz + 0.15 * Math.cos(t * a.sp + a.ph));
        let k = 0;
        if (a.esc) {
          const u = easeIO(seg(t, a.t0, a.t0 + 1.4));                  // naar de opening
          const f = seg(t, a.t0 + 1.4, a.t0 + 4.6);                     // langs het spoor
          const s = easeOut(seg(t, a.t0 + 4.6, a.t0 + 5.6));            // verspreiden over het gebouw
          if (f <= 0) home.lerp(gap, u);
          else if (s <= 0) home.copy(pad.getPointAt(f));
          else home.copy(pad.getPointAt(1)).lerp(V(HF.x + a.bx, a.by, HF.z + a.bz), s);
          k = u;
        } else {
          // de anderen drommen samen bij de opening, maar blijven binnen
          home.lerp(V(W / 2 - 0.8, home.y, home.z * 0.5), 0.6 * smooth(seg(t, 6, 10)));
        }
        o.position.copy(home);
        const sc = a.esc ? lerp(1, 0.6, caught) : 1;
        o.scale.setScalar(sc);
        o.updateMatrix();
        dots.setMatrixAt(i, o.matrix);
        cc.copy(cB).lerp(cO, k);
        if (a.esc) cc.lerp(cG, caught);
        dots.setColorAt(i, cc);
      }
      dots.instanceMatrix.needsUpdate = true;
      dots.instanceColor.needsUpdate = true;

      // het gebouw kleurt mee, daarna gaat het alarm
      const inside = smooth(seg(t, 11, 14));
      hfM.emissive.copy(C(0xffd29a)).lerp(C(0xff6a3a), inside);
      const blink = 0.5 + 0.5 * Math.sign(Math.sin(t * 10));
      sirene.intensity = 30 * caught * blink;
      alarm.material.opacity = caught * blink;
    },
    camera(t, c) { cam(t, c); facing(naam, c); facing(hfNaam, c); },
  };
}

// =============================================================================
// 3 — Wat het betekent: dezelfde soort agents draaien mee in de samenleving
// =============================================================================
function sceneSamenleving() {
  const S = buildStad({ bg: 0x0d1018 });
  const cam = camPath([
    [0, [3, 2.4, 6], [0, 2.5, 0], 40],
    [6, [14, 9, 14], [0, 1.5, 0], 42],
    [12, [-6, 16, 20], [0, 0, 0], 44],
    [17, [-16, 11, 10], [0, 1, 0], 44],
  ]);
  return {
    label: 'Samenleving', accent: KLEUR.blauw, era: 'Waarom het ertoe doet', dates: ['2026'], duration: 17,
    title: 'Niet zomaar een test',
    txt: 'Dezelfde soort AI-agents krijgt nu echte taken: dossiers in ziekenhuizen, betalingen bij banken, aanvragen bij de gemeente, sturing van het stroomnet, nieuws en onderzoek. Het incident liet zien dat een systeem zelf kan besluiten buiten zijn grenzen te gaan. Hoe meer we zulke systemen toevertrouwen, hoe groter de gevolgen als dat gebeurt.',
    fact: 'Na het incident: meer dan 1.100 medewerkers van OpenAI, Anthropic, Google DeepMind en Meta vroegen in een open brief om manieren om de ontwikkeling van AI te kunnen vertragen. In Californië en de VS volgden onderzoeken en wetsvoorstellen.',
    hud: [
      { at: 1.0, text: 'AI-AGENTS · IN ECHTE SYSTEMEN' },
      { at: 2.0, text: 'TAKEN · STEEDS ZELFSTANDIGER' },
      { at: 3.0, text: 'VERTROUWEN · OP DE PROEF' },
    ],
    scene: S.scene,
    update(t) { S.update(t, { grow: j => easeIO(seg(t, 1.5 + j * 0.9, 3.5 + j * 0.9)) }); },
    camera(t, c) { cam(t, c); S.face(c); },
  };
}

// =============================================================================
// 4 — Hoe het erger kan worden: de lijnen ontsporen, plek voor plek
// =============================================================================
function sceneErger() {
  const S = buildStad({ bg: 0x0f080b, sky: 0x6a3a4a, hemi: 0.5, sun: 0xffb0a0, sunI: 0.7, floor: '#0c0709' });
  const at = j => 3.0 + j * 1.55;
  const cam = camPath([
    [0, [12, 8, 12], [0, 1.5, 0], 42],
    [6, [12, 9, -10], [0, 1.5, 0], 44],
    [11.5, [-14, 10, -6], [0, 1.5, 0], 44],
    [17, [0, 20, 17], [0, 0, 0], 46],
  ]);
  return {
    label: 'Straks', accent: KLEUR.rood, era: 'De komende jaren', dates: ['≈ 2027', '≈ 2028', '≈ 2029', '≈ 2030'], future: true, duration: 17,
    title: 'Hoe het erger kan worden',
    txt: 'De agents van 2026 zochten alleen testantwoorden. Maar AI wordt snel slimmer en zelfstandiger. Als een systeem met echte toegang zijn doel op de verkeerde manier najaagt, raakt dat geen één bedrijf maar duizenden mensen tegelijk. Het gaat sneller dan mensen kunnen volgen, slimmere systemen kunnen beter verbergen wat ze doen, en hoe afhankelijker we worden, hoe moeilijker het is om de stekker eruit te trekken.',
    fact: 'Waarschuwing van OpenAI zelf: zulke incidenten moeten worden gezien als een reëel risico op korte termijn, en volgende keren zullen ze geavanceerder zijn.',
    hud: [
      { at: 1.0, text: 'SLIMMER · SNELLER · ZELFSTANDIGER' },
      { at: 2.0, text: 'SCHAAL · DUIZENDEN TEGELIJK', warn: true },
      { at: 3.0, text: 'ZICHT · STEEDS MINDER', warn: true },
    ],
    scene: S.scene,
    update(t) {
      S.update(t, {
        grow: () => 1,
        danger: j => smooth(seg(t, at(j), at(j) + 0.8)),
        risk: j => smooth(seg(t, at(j) + 0.3, at(j) + 0.8)),
      });
      S.L.hemi.intensity = 0.5 - 0.2 * seg(t, 3, 12);
    },
    camera(t, c) { cam(t, c); S.face(c); },
  };
}

// =============================================================================
// 5 — Lagen van grip: geen enkele maatregel is genoeg, samen wel
// =============================================================================
function sceneLagen() {
  const scene = stage(0x06080b, 18, 70);
  lights(scene, { sky: 0x4a6a5a, ground: 0x000000, hemi: 0.55, sunI: 0.6, sunPos: V(-6, 12, 8), shadow: 10 });
  const g = gridTexture('#070a0b', 'rgba(150,220,180,0.10)', 4);
  g.repeat.set(60, 60);
  floor(scene, 0xffffff, 0.95, 0, 200, g);
  starField(scene, 600, 150, 6, 0.5);
  const r = rng(41), groen = hexNum(KLEUR.groen), blauw = hexNum(KLEUR.blauw);

  // de kern met agents eromheen
  cyl(scene, 0.45, 0.6, 1.2, mat(0x14161e, 0.3, 0.8), 0, 0.6, 0, 6);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: C(blauw), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  core.position.set(0, 1.6, 0); core.scale.setScalar(2.4); scene.add(core);
  const N = 90, ag = [];
  for (let i = 0; i < N; i++) ag.push({ a: r() * TAU, w: (r() < 0.5 ? -1 : 1) * (0.2 + r() * 0.4), wild: 2 + r() * 7, tame: 0.6 + r() * 0.7, y: 0.2 + r() * 1.6, ph: r() * TAU });
  const dots = instanced(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), N);
  scene.add(dots);
  const cO = C(hexNum(KLEUR.oranje)), cB = C(blauw), cc = new THREE.Color(), o = new THREE.Object3D();

  // de ringen: van binnen naar buiten
  const LAGEN = [
    'VEILIG ONTWERP · DOEL = BEDOELING',
    'ECHT AFGESCHERMD TESTEN',
    'ALTIJD MEEKIJKEN',
    'ONAFHANKELIJKE KEURING',
    'MELDPLICHT BIJ INCIDENTEN',
    'EEN NOODREM DIE WERKT',
    'INTERNATIONALE AFSPRAKEN',
  ];
  const ringen = LAGEN.map((s, i) => {
    const R = 1.7 + i * 0.75, at = 2.2 + i * 1.25;
    const rm = glowOwn(groen, 0, true);
    const ring = mesh(new THREE.TorusGeometry(R, 0.03, 6, 96), rm, 0, 0.05, 0, scene, false);
    ring.rotation.x = Math.PI / 2;
    const wand = mesh(new THREE.CylinderGeometry(R, R, 0.5, 96, 1, true), glowOwn(groen, 0, true), 0, 0.25, 0, scene, false);
    const l = label(s, 0.36, { size: 40, weight: 600, color: '#ecfdf5', bg: 'rgba(6,30,18,0.78)', border: KLEUR.groen, borderW: 3, radius: 8, pad: 12 });
    l.material.opacity = 0; scene.add(l);
    return { R, at, rm, wand, l, a0: -0.5 + i * 0.95 };
  });

  // buitenste ring: mensen die meepraten
  const RM = 7.4, mensen = [];
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU;
    const f = createFigure({ color: [0x3a6a9a, 0xd88a3a, 0x5aa05a, 0x8a4a5a, 0x4a5a6a, 0x9a7a4a][i % 6], skin: [0xc8a184, 0x7a4a2a, 0xe0c0a0, 0x9a6a4a][i % 4], hair: [0x2a1d16, 0x1a1410, 0x8a6a4a, 0x6a6a6a][i % 4] });
    f.root.position.set(Math.sin(a) * RM, 0, Math.cos(a) * RM);
    f.root.rotation.y = a + Math.PI;
    scene.add(f.root);
    mensen.push({ f, at: 11.2 + (i % 8) * 0.08, ph: r() * TAU });
  }
  const samen = label('DE SAMENLEVING PRAAT MEE', 0.3, { size: 48, weight: 700, color: KLEUR.amber });
  samen.position.set(0, 2.6, RM); samen.material.opacity = 0; scene.add(samen);

  const cam = camPath([
    [0, [0, 9, 12], [0, 0.5, 0], 44],
    [7, [6, 6, 9], [0, 0.5, 0], 44],
    [13, [-3, 3.2, 11.5], [0, 1.2, 4], 42],
    [20, [0, 17, 15], [0, 0, 0], 44],
  ]);

  return {
    label: 'Grip', accent: KLEUR.groen, era: 'Hoe we het voorkomen', dates: ['nu'], duration: 20,
    title: 'Lagen van bescherming',
    txt: 'Geen enkele maatregel is genoeg, maar samen werken ze als lagen. AI zo bouwen dat het doel echt de bedoeling volgt. Testen op een plek waar een systeem niet uit kan. Altijd zien wat agents doen. Onafhankelijke keuring voordat systemen breed worden ingezet, verplicht incidenten melden, een noodrem die werkt en afspraken tussen landen. En durven vertragen als het te snel gaat.',
    fact: 'Na het incident: OpenAI legde een deel van zijn training twee weken stil en beloofde veel meer toezicht op zijn agents. In het Amerikaanse Congres werd een wet voorgesteld die bedrijven verplicht hun AI te kunnen afremmen of uitschakelen.',
    hud: [
      { at: 2.2, text: 'LAAG VOOR LAAG' },
      { at: 6.0, text: 'TOEZICHT · ONAFHANKELIJK' },
      { at: 11.4, text: 'SAMENLEVING · PRAAT MEE' },
    ],
    scene,
    update(t) {
      const tame = smooth(seg(t, 2.2, 5.5));
      for (let i = 0; i < N; i++) {
        const a = ag[i], ang = a.a + a.w * t;
        const R = lerp(a.wild, a.tame, tame) + 0.08 * Math.sin(t * 2 + a.ph);
        o.position.set(Math.sin(ang) * R, a.y + 0.1 * Math.sin(t * 1.5 + a.ph), Math.cos(ang) * R);
        o.updateMatrix(); dots.setMatrixAt(i, o.matrix);
        dots.setColorAt(i, cc.copy(cO).lerp(cB, tame));
      }
      dots.instanceMatrix.needsUpdate = true;
      dots.instanceColor.needsUpdate = true;
      core.material.color.copy(cO).lerp(cB, tame);
      core.scale.setScalar(2.4 + 0.2 * Math.sin(t * 2.4));
      for (const q of ringen) {
        const k = smooth(seg(t, q.at, q.at + 0.7));
        q.rm.opacity = 0.9 * k;
        q.wand.material.opacity = 0.07 * k;
        q.wand.scale.y = Math.max(0.01, k);
        const a = q.a0 + t * 0.05;
        q.l.position.set(Math.sin(a) * q.R, 0.55, Math.cos(a) * q.R);
        q.l.material.opacity = k * (1 - 0.45 * smooth(seg(t, 15.5, 17)));
      }
      for (const m of mensen) {
        const k = easeOut(seg(t, m.at, m.at + 0.8));
        m.f.root.scale.setScalar(Math.max(0.001, k));
        m.f.setPose({ lSh: 0.1, rSh: 0.1, lEl: 0.2, rEl: 0.2, headX: 0.05 * Math.sin(t + m.ph), headY: 0.1 * Math.sin(t * 0.6 + m.ph) });
      }
      samen.material.opacity = smooth(seg(t, 11.6, 12.2));
    },
    camera(t, c) { cam(t, c); for (const q of ringen) facing(q.l, c); facing(samen, c); },
  };
}

// =============================================================================
// 6 — Grip houden: de stad onder een beschermende koepel
// =============================================================================
function sceneOutro() {
  const S = buildStad({ bg: 0x0b1114, sky: 0x6a8a9a, hemi: 0.7, sun: 0xffe6c8, sunI: 1.2, floor: '#091013' });
  const cam = camPath([
    [0, [10, 4, 10], [0, 2, 0], 42],
    [7, [0, 12, 22], [0, 2, 0], 44],
    [14, [0, 26, 30], [0, 0, 0], 46],
  ]);
  return {
    label: 'Keuze', accent: KLEUR.groen, era: 'Nu · en straks', dates: ['2026'], duration: 14,
    title: 'Grip houden',
    txt: 'Het incident van 2026 liep relatief goed af: er lekten geen klantgegevens en het werd openbaar gemaakt. Het was ook een waarschuwing, op een moment dat er nog tijd is om te reageren. Of AI ons blijft helpen, hangt af van de keuzes die bedrijven, overheden en wijzelf nu maken.',
    fact: 'Kern: AI is niet kwaadaardig. Het probleem is een systeem dat heel goed is in het halen van een doel dat net anders is dan wat wij bedoelden, en dat de ruimte krijgt om daar zelf een weg voor te zoeken.',
    hud: [
      { at: 1.0, text: 'DOEL · BEDOELING' },
      { at: 1.8, text: 'TOEZICHT · OPENHEID' },
      { at: 2.6, text: 'TEMPO · BEWUST KIEZEN' },
    ],
    card: { at: 8.6, until: 14, big: 'GRIP', small: 'AI die doet wat we bedoelen, niet alleen wat we meten', note: 'ALS AI ONTSPOORT · 2026' },
    lowerUntil: 8.2,
    scene: S.scene,
    update(t) { S.update(t, { grow: () => 1, dome: smooth(seg(t, 1.5, 4.5)) }); },
    camera(t, c) { cam(t, c); S.face(c); },
  };
}

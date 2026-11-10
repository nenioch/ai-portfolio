/* De aankomst. Bij het openen van het spel hangt de camera aan het vrachtschip
   terwijl dat uit de zwarte hemel op het dockingstation zakt: eerst een vrije
   val met de planetoïde onder je, dan de remraketten, dan een stofwolk en
   klemmen die dichtklappen. Daarna komt de kaart in beeld die vertelt dat het
   station nog in het vrachtruim zit.

   De intro stuurt in die tijd twee dingen aan die het spel verder met rust
   laat: de positie van het schip boven het dok, en de camera. Het spel zelf
   staat stil (S.intro), dus niets rekent mee zolang het aanmeren loopt. */

(function (MB) {
  'use strict';
  if (!window.THREE) return;

  const HOOGTE = 90;        // eenheden boven het dek waar het schip vandaan komt
  const DAAL = 10.0;        // seconden tot contact
  const NAZIT = 2.2;        // seconden stof en stilte voor de kaart verschijnt
  const DOK_Y = 0.48;       // waar het schip aangemeerd staat

  // Wat er onderin beeld staat, op hoogte p van de daling (0 = hoog, 1 = dek).
  const BIJSCHRIFTEN = [
    [0.00, 'Aanvlucht — vrachtschip Nova 3 nadert de planetoïde'],
    [0.22, 'Koers vergrendeld · remraketten aan'],
    [0.52, 'Dockingstation in zicht · klemmen open'],
    [0.80, 'Laatste meters — rustig laten zakken'],
    [0.97, 'Contact. Klemmen vast.']
  ];

  // ----------------------------------------------------------------- stof

  /* Het gruis dat de motor van het dek blaast: korrels die naar buiten
     schieten, terugvallen en uitdoven. Ze hangen in de groep van het dok, dus
     ze staan netjes op de grond en draaien met de planetoïde mee. */
  function maakStof(ouder) {
    const n = 170;
    const pos = new Float32Array(n * 3);
    const snel = new Float32Array(n * 3);
    const rnd = MB.rng(20260908);

    for (let i = 0; i < n; i++) {
      // net buiten het dek: daar rolt de wolk onder het dok vandaan
      const a = rnd() * Math.PI * 2;
      const r = 1.9 + rnd() * 1.1;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0.05 + rnd() * 0.25;
      pos[i * 3 + 2] = Math.sin(a) * r;

      const v = 2.4 + rnd() * 7.0;
      snel[i * 3] = Math.cos(a) * v;
      snel[i * 3 + 1] = 0.7 + rnd() * 2.4;
      snel[i * 3 + 2] = Math.sin(a) * v;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    // koel grijs, zoals het gesteente van de planetoïde
    const mat = new THREE.PointsMaterial({
      color: 0xa9b2bc, size: 0.17, transparent: true, opacity: 0.9, depthWrite: false
    });

    const punten = new THREE.Points(geo, mat);
    punten.raycast = function () {};        // stof vangt geen klikken
    ouder.add(punten);

    let t = 0;
    return {
      klaar: false,
      weg: function () {
        if (punten.parent) punten.parent.remove(punten);
        geo.dispose();
        mat.dispose();
        this.klaar = true;
      },
      update: function (dt) {
        t += dt;
        const rem = Math.max(0, 1 - 1.5 * dt);   // stof in vacuüm valt gewoon terug
        for (let i = 0; i < n; i++) {
          const j = i * 3;
          snel[j] *= rem;
          snel[j + 2] *= rem;
          snel[j + 1] -= 1.1 * dt;               // lage zwaartekracht
          pos[j] += snel[j] * dt;
          pos[j + 1] += snel[j + 1] * dt;
          pos[j + 2] += snel[j + 2] * dt;
          if (pos[j + 1] < 0.03) {               // op de grond blijft het liggen
            pos[j + 1] = 0.03;
            snel[j + 1] = 0;
          }
        }
        geo.attributes.position.needsUpdate = true;
        mat.opacity = 0.9 * Math.max(0, 1 - t / 2.8);
        if (t > 2.8) this.weg();
      }
    };
  }

  // ---------------------------------------------------------------- intro

  MB.maakIntro = function (wereld, controls, spel) {
    const el = {
      laag: MB.$('#intro'),
      cap: MB.$('#intro-cap'),
      kaart: MB.$('#intro-card'),
      ga: MB.$('#intro-go'),
      uitleg: MB.$('#intro-help'),
      skip: MB.$('#intro-skip')
    };

    const b = spel.dok();
    const schip = b && b.refs.schip;
    const vlam = b && b.refs.vlam;

    // motorschijnsel: verlicht het dek tijdens het laatste stuk van de daling
    const gloed = new THREE.PointLight(0xffb066, 0, 40, 2);
    gloed.position.y = -0.7;

    const startTheta = Math.atan2(MB.World.ZON.x, MB.World.ZON.z);   // met de zon in de rug
    const eindTheta = Math.atan2(MB.Rock.BASE_DIR.x, MB.Rock.BASE_DIR.z);

    let fase = 'uit';        // uit → dalen → stof → kaart → klaar
    let t = 0;
    let stof = null;
    let capIndex = -1;

    const I = { actief: false };

    function zegBijschrift(i) {
      if (i === capIndex) return;
      capIndex = i;
      el.cap.textContent = BIJSCHRIFTEN[i][1];
      el.cap.classList.remove('zien');
      void el.cap.offsetWidth;             // opnieuw laten intikken
      el.cap.classList.add('zien');
    }

    function zetSchip(hoogte, p) {
      schip.position.y = DOK_Y + hoogte;
      // het schip komt scheef binnen en zet zich pas vlak boven het dek recht
      const rest = (1 - p) * (1 - p);
      schip.position.x = Math.sin(p * 3.4 + 0.7) * 1.1 * rest;
      schip.position.z = 2.4 * rest;
      schip.rotation.z = -0.16 * rest;
      schip.rotation.x = 0.10 * rest;
    }

    function zetVlam(kracht, tijd) {
      vlam.visible = kracht > 0.02;
      if (!vlam.visible) {
        gloed.intensity = 0;
        return;
      }
      const flikker = 1 + Math.sin(tijd * 41) * 0.09;
      // niet langer laten worden dan bij een vertrek, anders steekt de kegel
      // dwars door de romp heen
      vlam.scale.set(
        (0.7 + 0.5 * kracht) * flikker,
        (0.45 + 1.15 * kracht) * (1 + Math.sin(tijd * 27) * 0.12),
        (0.7 + 0.5 * kracht) * flikker
      );
      gloed.intensity = 3.4 * kracht * flikker;
    }

    // het schip staat stil in het dok; motor uit, klemmen mogen dicht
    function zetAangemeerd() {
      zetSchip(0, 1);
      schip.rotation.set(0, 0, 0);
      schip.position.set(0, DOK_Y, 0);
      zetVlam(0, 0);
      vlam.scale.set(1, 1, 1);
      if (gloed.parent) gloed.parent.remove(gloed);
      b.landt = false;
    }

    // ------------------------------------------------------------- verloop

    I.start = function () {
      if (I.actief) return;
      if (!schip) {                        // geen dok: dan maar meteen spelen
        document.body.classList.remove('landing');
        el.laag.hidden = true;
        spel.landingKlaar();
        return;
      }

      I.actief = true;
      fase = 'dalen';
      t = 0;

      document.body.classList.add('landing');
      el.laag.hidden = false;
      el.kaart.hidden = true;
      el.skip.hidden = false;

      // klemmen staan wijd open voor het schip binnenkomt
      b.landt = true;
      b.klemOpen = 1;

      schip.add(gloed);
      zetSchip(HOOGTE, 0);
      zegBijschrift(0);

      controls.vergrendeld = true;
      controls.zetAnker(schip);
      controls.theta = controls.doelTheta = startTheta;
      controls.phi = controls.doelPhi = 0.70;
      controls.afstand = controls.doelAfstand = 56;
    };

    /* Contact: motor uit, klemmen dicht, stof op, en de camera zakt een stukje
       terug zodat het hele dok in beeld komt. */
    function land() {
      fase = 'stof';
      t = 0;
      zetAangemeerd();
      zegBijschrift(BIJSCHRIFTEN.length - 1);
      stof = maakStof(b.groep);
      controls.doelAfstand = 24;
      controls.doelPhi = 1.12;
    }

    function toonKaart() {
      fase = 'kaart';
      el.cap.classList.remove('zien');
      el.kaart.hidden = false;
      el.skip.hidden = true;
    }

    /* Alles overslaan: het schip zit vast, het ruim mag open, het spel begint. */
    I.klaar = function () {
      if (!I.actief) return;
      I.actief = false;
      fase = 'klaar';

      if (schip) zetAangemeerd();
      if (stof && !stof.klaar) stof.weg();

      el.laag.hidden = true;
      document.body.classList.remove('landing');

      controls.vergrendeld = false;
      controls.zetAnker(null);
      controls.doelAfstand = 52;
      controls.doelPhi = 1.0;

      spel.landingKlaar();
    };

    // de daling mag je overslaan; de kaart erna lees je zelf weg
    I.springNaarEinde = function () {
      if (!I.actief || fase === 'kaart') return;
      if (stof && !stof.klaar) stof.weg();
      stof = null;
      zetAangemeerd();
      controls.zetAnker(schip);
      controls.doelAfstand = 24;
      controls.doelPhi = 1.12;
      controls.doelTheta = eindTheta;
      toonKaart();
    };

    // --------------------------------------------------------------- lus

    I.update = function (dt) {
      if (!I.actief) return;
      t += dt;

      if (fase === 'dalen') {
        const p = MB.clamp(t / DAAL, 0, 1);
        const hoogte = HOOGTE * Math.pow(1 - p, 2.6);
        zetSchip(hoogte, p);

        // vrije val, dan remmen, en op het moment van contact de motor uit
        const kracht = MB.smoothstep(0.10, 0.42, p) * (1 - MB.smoothstep(0.95, 1.0, p));
        zetVlam(kracht, t);

        for (let i = BIJSCHRIFTEN.length - 2; i >= 0; i--) {
          if (p >= BIJSCHRIFTEN[i][0]) { zegBijschrift(i); break; }
        }

        // de camera komt langzaam dichterbij en zakt van boven naar ooghoogte
        const k = MB.smoothstep(0.05, 0.92, p);
        controls.doelAfstand = MB.lerp(56, 15, k);
        controls.doelPhi = MB.lerp(0.70, 1.24, k);
        controls.doelTheta = MB.lerp(startTheta, eindTheta, k);

        if (p >= 1) land();
        return;
      }

      if (stof && !stof.klaar) stof.update(dt);

      if (fase === 'stof' && t > NAZIT) toonKaart();
    };

    // ------------------------------------------------------------ knoppen

    el.skip.onclick = I.springNaarEinde;
    el.ga.onclick = I.klaar;
    el.uitleg.onclick = function () {
      I.klaar();
      MB.$('#help').hidden = false;
    };

    window.addEventListener('keydown', function (e) {
      if (!I.actief || MB.inVeld(e)) return;
      if (e.key === 'Escape') {
        if (fase === 'kaart') I.klaar();
        else I.springNaarEinde();
      } else if (e.key === 'Enter' && fase === 'kaart') {
        I.klaar();
      }
    });

    return I;
  };
})(window.MB);

/* Camera die om een draaipunt cirkelt. Standaard is dat het middelpunt van de
   planeet, maar met het muiswieltje (indrukken en slepen) leg je het
   draaipunt op het ding onder de cursor — een gebouw, een schip of een plek
   op de planeet. Slepen draait, scrollen of knijpen zoomt, en een korte
   linkerklik zonder slepen geeft een klikmelding door.

   Dit bestand is vrijwel een letterlijke kopie van controls.js uit
   maanbasis — dezelfde zoom- en draaibesturing, alleen aangesloten op de
   planeet in plaats van de maan. */

(function (BNW) {
  'use strict';
  if (!window.THREE) return;

  const MIN_AFSTAND = 30;       // om de planeet: niet door het oppervlak heen
  const MIN_DICHTBIJ = 4;       // om een gebouw: veel dichterbij mag wel
  const MAX_AFSTAND = 150;
  const PHI_RAND = 0.12;
  const VRIJE_HOOGTE = 2.5;     // hoe ver de camera boven de grond blijft
  const RAND_BAND = 30;         // pixels vanaf de schermrand die meeschuiven
  const RAND_SNELHEID = 0.85;   // radialen per seconde, aan de rand zelf
  const LANG_TIJD = 450;        // ms stil drukken = draaipunt kiezen (touch)
  const LANG_SPELING = 14;      // px die je vinger ondertussen mag verschuiven

  BNW.maakControls = function (canvas, camera) {
    const c = {
      theta: 0.5, phi: 0.9, afstand: 70,
      doelTheta: 0.5, doelPhi: 0.9, doelAfstand: 70,
      anker: new THREE.Vector3(),   // waar de camera omheen draait
      ankerObject: null,            // volgt dit object, of null voor de planeet
      randScroll: true,             // cursor tegen de schermrand schuift het beeld
      opKlik: null, opZweef: null, opDraaipunt: null
    };

    const hulpV = new THREE.Vector3();

    function minAfstand() {
      return c.ankerObject ? MIN_DICHTBIJ : MIN_AFSTAND;
    }

    function leesAnker() {
      if (c.ankerObject) c.ankerObject.getWorldPosition(c.anker);
      else c.anker.set(0, 0, 0);
    }

    /* Een nieuw draaipunt kiezen mag het beeld niet laten verspringen: we laten
       de camera staan waar hij staat en rekenen hoek en afstand opnieuw uit. */
    c.zetAnker = function (obj) {
      c.ankerObject = obj || null;
      leesAnker();

      hulpV.copy(camera.position).sub(c.anker);
      const len = Math.max(1e-4, hulpV.length());
      c.afstand = c.doelAfstand = BNW.clamp(len, minAfstand(), MAX_AFSTAND);
      c.theta = c.doelTheta = Math.atan2(hulpV.x, hulpV.z);
      c.phi = c.doelPhi = BNW.clamp(
        Math.acos(BNW.clamp(hulpV.y / len, -1, 1)), PHI_RAND, Math.PI - PHI_RAND);
    };

    // -------------------------------------------------------- hulpjes

    function ndc(e) {
      const r = canvas.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1
      );
    }

    c.kijkNaar = function (dir) {
      c.doelTheta = Math.atan2(dir.x, dir.z);
      c.doelPhi = Math.acos(BNW.clamp(dir.y, -1, 1));
      c.theta = c.doelTheta;
      c.phi = c.doelPhi;
    };

    c.verschuifTheta = function (d) {
      c.theta += d;
      c.doelTheta += d;
    };

    // --------------------------------------------------------- muis

    const punten = new Map();
    let sleepend = false, verplaatst = 0, laatstePinch = 0;

    canvas.addEventListener('mousedown', function (e) { if (e.button === 1) e.preventDefault(); });
    canvas.addEventListener('auxclick', function (e) { if (e.button === 1) e.preventDefault(); });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    /* Zonder muiswiel — op een telefoon dus — kies je het draaipunt door je
       vinger even stil te houden op een gebouw, een schip of de planeet. */
    let langKlok = 0, langX = 0, langY = 0, langGedaan = false;

    function startLang(e) {
      const punt = ndc(e);
      langX = e.clientX;
      langY = e.clientY;
      langGedaan = false;
      langKlok = setTimeout(function () {
        langKlok = 0;
        langGedaan = true;
        if (c.opDraaipunt) c.opDraaipunt(punt);
      }, LANG_TIJD);
    }

    function stopLang() {
      if (langKlok) { clearTimeout(langKlok); langKlok = 0; }
    }

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button === 1) {
        e.preventDefault();
        if (c.opDraaipunt) c.opDraaipunt(ndc(e));
      } else if (e.pointerType !== 'mouse' && punten.size === 0) {
        startLang(e);
      }
      canvas.setPointerCapture(e.pointerId);
      punten.set(e.pointerId, { x: e.clientX, y: e.clientY, knop: e.button });
      if (punten.size === 1) {
        sleepend = true;
        verplaatst = 0;
        canvas.classList.add('dragging');
      } else if (punten.size === 2) {
        laatstePinch = pinchAfstand();
        stopLang();
      }
    });

    function pinchAfstand() {
      const it = punten.values();
      const a = it.next().value, b = it.next().value;
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    canvas.addEventListener('pointermove', function (e) {
      const p = punten.get(e.pointerId);

      if (!p) {
        if (c.opZweef) c.opZweef(ndc(e));
        return;
      }

      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;

      if (langKlok && Math.hypot(e.clientX - langX, e.clientY - langY) > LANG_SPELING) stopLang();

      if (punten.size === 2) {
        const d = pinchAfstand();
        if (laatstePinch > 0) c.doelAfstand = BNW.clamp(c.doelAfstand * (laatstePinch / d), minAfstand(), MAX_AFSTAND);
        laatstePinch = d;
        verplaatst += 50;
        return;
      }

      verplaatst += Math.abs(dx) + Math.abs(dy);
      c.doelTheta -= dx * 0.005;
      c.doelPhi = BNW.clamp(c.doelPhi - dy * 0.005, PHI_RAND, Math.PI - PHI_RAND);
    });

    function los(e) {
      const p = punten.get(e.pointerId);
      punten.delete(e.pointerId);
      if (punten.size < 2) laatstePinch = 0;
      if (punten.size === 0) {
        stopLang();
        canvas.classList.remove('dragging');
        if (sleepend && verplaatst < 6 && p && p.knop === 0 && !langGedaan && c.opKlik) c.opKlik(ndc(e));
        langGedaan = false;
        sleepend = false;
      }
    }
    canvas.addEventListener('pointerup', los);
    canvas.addEventListener('pointercancel', los);

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      c.doelAfstand = BNW.clamp(c.doelAfstand * Math.exp(e.deltaY * 0.0012), minAfstand(), MAX_AFSTAND);
    }, { passive: false });

    // ---------------------------------------------------- schermrand

    let muisX = 0, muisY = 0, muisVrij = false;

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') { muisVrij = false; return; }
      muisX = e.clientX;
      muisY = e.clientY;
      muisVrij = e.target === canvas;
    });

    document.addEventListener('mouseleave', function () { muisVrij = false; });
    window.addEventListener('blur', function () { muisVrij = false; });

    function randDeel(p, lengte) {
      if (p < RAND_BAND) return -(1 - Math.max(0, p) / RAND_BAND);
      if (p > lengte - RAND_BAND) return 1 - Math.max(0, lengte - p) / RAND_BAND;
      return 0;
    }

    function tempo(f) {
      return f === 0 ? 0 : (f < 0 ? -1 : 1) * (0.4 + 0.6 * Math.abs(f));
    }

    function randDuw(dt) {
      if (!c.randScroll || !muisVrij || punten.size > 0) return;

      const fx = randDeel(muisX, window.innerWidth);
      const fy = randDeel(muisY, window.innerHeight);
      if (!fx && !fy) return;

      const v = RAND_SNELHEID * dt;
      if (fx) c.doelTheta += tempo(fx) * v;
      if (fy) c.doelPhi = BNW.clamp(c.doelPhi + tempo(fy) * v, PHI_RAND, Math.PI - PHI_RAND);
    }

    // ------------------------------------------------------ toetsen

    const toetsen = new Set();
    window.addEventListener('keydown', function (e) {
      if (BNW.inVeld(e)) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) >= 0) e.preventDefault();
      toetsen.add(e.key);
    });
    window.addEventListener('keyup', (e) => toetsen.delete(e.key));
    window.addEventListener('blur', () => toetsen.clear());

    // -------------------------------------------------------- update

    c.update = function (dt) {
      const draai = 1.1 * dt;
      if (toetsen.has('ArrowLeft')) c.doelTheta += draai;
      if (toetsen.has('ArrowRight')) c.doelTheta -= draai;
      if (toetsen.has('ArrowUp')) c.doelPhi = BNW.clamp(c.doelPhi - draai, PHI_RAND, Math.PI - PHI_RAND);
      if (toetsen.has('ArrowDown')) c.doelPhi = BNW.clamp(c.doelPhi + draai, PHI_RAND, Math.PI - PHI_RAND);
      if (toetsen.has('+') || toetsen.has('=')) c.doelAfstand = BNW.clamp(c.doelAfstand * (1 - dt), minAfstand(), MAX_AFSTAND);
      if (toetsen.has('-') || toetsen.has('_')) c.doelAfstand = BNW.clamp(c.doelAfstand * (1 + dt), minAfstand(), MAX_AFSTAND);

      randDuw(dt);

      const k = Math.min(1, dt * 9);
      c.theta += (c.doelTheta - c.theta) * k;
      c.phi += (c.doelPhi - c.phi) * k;
      c.afstand += (c.doelAfstand - c.afstand) * k;

      leesAnker();

      const s = Math.sin(c.phi);
      camera.position.set(
        c.anker.x + c.afstand * s * Math.sin(c.theta),
        c.anker.y + c.afstand * Math.cos(c.phi),
        c.anker.z + c.afstand * s * Math.cos(c.theta)
      );

      /* Draaien om een punt op het oppervlak zou de camera onder de grond
         voeren; daarom schuiven we hem langs zijn eigen richting weer omhoog. */
      if (BNW.Planeet) {
        const laag = BNW.Planeet.hoogteBij(hulpV.copy(camera.position).normalize()) + VRIJE_HOOGTE;
        if (camera.position.length() < laag) camera.position.copy(hulpV).multiplyScalar(laag);
      }

      camera.lookAt(c.anker);
    };

    return c;
  };
})(window.BNW);

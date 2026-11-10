/* Camera die om een draaipunt cirkelt, zoals in Marmer-Chinampa. Standaard is
   dat het heilige plein; klik of druk met het muiswiel op een gebouw, akker of
   plek op het water en de camera draait voortaan daaromheen.
   Slepen draait, scrollen of knijpen zoomt, rechts slepen schuift, en de cursor
   tegen de schermrand laat het beeld meedraaien. */

(function (MC) {
  'use strict';
  if (!window.THREE) return;

  const MIN_AFSTAND = 2.5;
  const MAX_AFSTAND = 600;
  const PHI_MIN = 0.12;
  const PHI_MAX = 1.47;
  const MIN_HOOGTE = 0.7;        // de camera duikt nooit onder water
  const RAND_BAND = 30;          // pixels vanaf de schermrand die meedraaien
  const RAND_SNELHEID = 0.85;    // radialen per seconde, aan de rand zelf
  const LANG_TIJD = 450;         // ms stil drukken = draaipunt kiezen (touch)
  const LANG_SPELING = 14;
  const RUST = 6;                // seconden stil voordat de stad vanzelf draait
  MC.THUIS = new THREE.Vector3(1.5, 2.2, 2);

  MC.maakControls = function (canvas, camera) {
    const c = {
      theta: -0.78, phi: 1.0, afstand: 70,
      doelTheta: -0.78, doelPhi: 1.0, doelAfstand: 70,
      anker: MC.THUIS.clone(),
      doelAnker: MC.THUIS.clone(),
      randScroll: true,
      autoDraai: !MC.bewegingBeperkt,
      stil: 0,
      opKlik: null, opZweef: null, opDraaipunt: null
    };

    const hulpV = new THREE.Vector3();

    /* Een nieuw draaipunt kiezen mag het beeld niet laten verspringen: we laten
       de camera staan waar hij staat en rekenen hoek en afstand opnieuw uit. */
    c.zetAnker = function (punt) {
      c.anker.copy(punt);
      c.doelAnker.copy(punt);
      hulpV.copy(camera.position).sub(c.anker);
      const len = Math.max(1e-4, hulpV.length());
      c.afstand = c.doelAfstand = MC.clamp(len, MIN_AFSTAND, MAX_AFSTAND);
      c.theta = c.doelTheta = Math.atan2(hulpV.x, hulpV.z);
      c.phi = c.doelPhi = MC.clamp(Math.acos(MC.clamp(hulpV.y / len, -1, 1)), PHI_MIN, PHI_MAX);
    };

    // Terug naar het midden van de stad, met een zachte overgang.
    c.naarHuis = function () {
      c.doelAnker.copy(MC.THUIS);
      c.doelAfstand = Math.max(c.doelAfstand, 40);
    };

    function ndc(e) {
      const r = canvas.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    }

    function wakker() { c.stil = 0; }

    // Horizontaal schuiven, in schermrichtingen.
    function schuif(dx, dy) {
      const k = c.afstand * 0.0016;
      const rechts = new THREE.Vector3(Math.cos(c.theta), 0, -Math.sin(c.theta));
      const voor = new THREE.Vector3(-Math.sin(c.theta), 0, -Math.cos(c.theta));
      c.doelAnker.addScaledVector(rechts, -dx * k).addScaledVector(voor, dy * k);
      c.doelAnker.x = MC.clamp(c.doelAnker.x, -420, 420);
      c.doelAnker.z = MC.clamp(c.doelAnker.z, -420, 420);
    }

    // --------------------------------------------------------------- muis

    const punten = new Map();
    let sleepend = false, verplaatst = 0, laatstePinch = 0, laatsteMidden = null;

    canvas.addEventListener('mousedown', function (e) { if (e.button === 1) e.preventDefault(); });
    canvas.addEventListener('auxclick', function (e) { if (e.button === 1) e.preventDefault(); });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    let langKlok = 0, langX = 0, langY = 0, langGedaan = false;
    function startLang(e) {
      const punt = ndc(e);
      langX = e.clientX; langY = e.clientY; langGedaan = false;
      langKlok = setTimeout(function () {
        langKlok = 0;
        langGedaan = true;
        if (c.opDraaipunt) c.opDraaipunt(punt);
      }, LANG_TIJD);
    }
    function stopLang() { if (langKlok) { clearTimeout(langKlok); langKlok = 0; } }

    function pinchInfo() {
      const it = punten.values();
      const a = it.next().value, b = it.next().value;
      return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    canvas.addEventListener('pointerdown', function (e) {
      wakker();
      if (e.button === 1) {
        e.preventDefault();
        if (c.opDraaipunt) c.opDraaipunt(ndc(e));
      } else if (e.pointerType !== 'mouse' && punten.size === 0) {
        startLang(e);
      }
      canvas.setPointerCapture(e.pointerId);
      punten.set(e.pointerId, { x: e.clientX, y: e.clientY, knop: e.button, schuif: e.button === 2 || e.shiftKey });
      if (punten.size === 1) {
        sleepend = true;
        verplaatst = 0;
        canvas.classList.add('dragging');
      } else if (punten.size === 2) {
        const p = pinchInfo();
        laatstePinch = p.d;
        laatsteMidden = p;
        stopLang();
      }
    });

    canvas.addEventListener('pointermove', function (e) {
      const p = punten.get(e.pointerId);
      if (!p) {
        if (c.opZweef) c.opZweef(ndc(e));
        return;
      }
      wakker();
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (langKlok && Math.hypot(e.clientX - langX, e.clientY - langY) > LANG_SPELING) stopLang();

      if (punten.size === 2) {
        const q = pinchInfo();
        if (laatstePinch > 0) c.doelAfstand = MC.clamp(c.doelAfstand * (laatstePinch / q.d), MIN_AFSTAND, MAX_AFSTAND);
        if (laatsteMidden) schuif(q.x - laatsteMidden.x, q.y - laatsteMidden.y);
        laatstePinch = q.d;
        laatsteMidden = q;
        verplaatst += 50;
        return;
      }

      verplaatst += Math.abs(dx) + Math.abs(dy);
      if (p.schuif) { schuif(dx, dy); return; }
      c.doelTheta -= dx * 0.005;
      c.doelPhi = MC.clamp(c.doelPhi - dy * 0.005, PHI_MIN, PHI_MAX);
    });

    function los(e) {
      const p = punten.get(e.pointerId);
      punten.delete(e.pointerId);
      if (punten.size < 2) { laatstePinch = 0; laatsteMidden = null; }
      if (punten.size === 0) {
        stopLang();
        canvas.classList.remove('dragging');
        if (e.type === 'pointerup' && sleepend && verplaatst < 6 && p && p.knop === 0 && !langGedaan && c.opKlik) c.opKlik(ndc(e));
        langGedaan = false;
        sleepend = false;
      }
    }
    canvas.addEventListener('pointerup', los);
    canvas.addEventListener('pointercancel', los);

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      wakker();
      c.doelAfstand = MC.clamp(c.doelAfstand * Math.exp(e.deltaY * 0.0012), MIN_AFSTAND, MAX_AFSTAND);
    }, { passive: false });

    // --------------------------------------------------------- schermrand

    let muisX = 0, muisY = 0, muisVrij = false;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') { muisVrij = false; return; }
      muisX = e.clientX; muisY = e.clientY;
      muisVrij = e.target === canvas;
    });
    document.addEventListener('mouseleave', function () { muisVrij = false; });
    window.addEventListener('blur', function () { muisVrij = false; });

    function randDeel(p, lengte) {
      if (p < RAND_BAND) return -(1 - Math.max(0, p) / RAND_BAND);
      if (p > lengte - RAND_BAND) return 1 - Math.max(0, lengte - p) / RAND_BAND;
      return 0;
    }
    function tempo(f) { return f === 0 ? 0 : (f < 0 ? -1 : 1) * (0.4 + 0.6 * Math.abs(f)); }

    function randDuw(dt) {
      if (!c.randScroll || !muisVrij || punten.size > 0) return;
      const fx = randDeel(muisX, window.innerWidth);
      const fy = randDeel(muisY, window.innerHeight);
      if (!fx && !fy) return;
      wakker();
      const v = RAND_SNELHEID * dt;
      if (fx) c.doelTheta += tempo(fx) * v;
      if (fy) c.doelPhi = MC.clamp(c.doelPhi + tempo(fy) * v, PHI_MIN, PHI_MAX);
    }

    // ------------------------------------------------------------ toetsen

    const toetsen = new Set();
    window.addEventListener('keydown', function (e) {
      if (MC.inVeld(e)) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) >= 0) e.preventDefault();
      toetsen.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      wakker();
    });
    window.addEventListener('keyup', (e) => toetsen.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
    window.addEventListener('blur', () => toetsen.clear());

    // ------------------------------------------------------------- update

    c.update = function (dt) {
      const draai = 1.1 * dt;
      if (toetsen.has('ArrowLeft')) c.doelTheta += draai;
      if (toetsen.has('ArrowRight')) c.doelTheta -= draai;
      if (toetsen.has('ArrowUp')) c.doelPhi = MC.clamp(c.doelPhi - draai, PHI_MIN, PHI_MAX);
      if (toetsen.has('ArrowDown')) c.doelPhi = MC.clamp(c.doelPhi + draai, PHI_MIN, PHI_MAX);
      if (toetsen.has('+') || toetsen.has('=')) c.doelAfstand = MC.clamp(c.doelAfstand * (1 - dt), MIN_AFSTAND, MAX_AFSTAND);
      if (toetsen.has('-') || toetsen.has('_')) c.doelAfstand = MC.clamp(c.doelAfstand * (1 + dt), MIN_AFSTAND, MAX_AFSTAND);
      const px = 500 * dt;
      if (toetsen.has('a')) schuif(px, 0);
      if (toetsen.has('d')) schuif(-px, 0);
      if (toetsen.has('w')) schuif(0, px);
      if (toetsen.has('s')) schuif(0, -px);
      randDuw(dt);

      c.stil += dt;
      if (c.autoDraai && c.stil > RUST) c.doelTheta += dt * 0.05 * MC.smoothstep(RUST, RUST + 3, c.stil);

      const k = Math.min(1, dt * 9);
      c.theta += (c.doelTheta - c.theta) * k;
      c.phi += (c.doelPhi - c.phi) * k;
      c.afstand += (c.doelAfstand - c.afstand) * k;
      c.anker.lerp(c.doelAnker, Math.min(1, dt * 5));

      const s = Math.sin(c.phi);
      camera.position.set(
        c.anker.x + c.afstand * s * Math.sin(c.theta),
        c.anker.y + c.afstand * Math.cos(c.phi),
        c.anker.z + c.afstand * s * Math.cos(c.theta)
      );
      if (camera.position.y < MIN_HOOGTE) camera.position.y = MIN_HOOGTE;
      camera.lookAt(c.anker);
    };

    return c;
  };
})(window.MC);

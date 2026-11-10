/* Alles aan elkaar knopen en de tekenlus starten. */

(function (BNW) {
  'use strict';
  if (!window.THREE) return;

  const canvas = BNW.$('#scene');
  const wereld = BNW.World.init(canvas);

  // De planeet bouwen kost even; het laadscherm blijft tot het beeld er staat.
  wereld.planeet.add(BNW.Planeet.bouwMesh());
  wereld.planeet.add(BNW.Planeet.bouwDampkring());

  const controls = BNW.maakControls(canvas, wereld.camera);
  const spel = BNW.maakSpel(wereld, controls);

  // handig om in de console mee te prutsen
  BNW.wereld = wereld;
  BNW.controls = controls;
  BNW.spel = spel;

  let vorige = performance.now();
  function frame(nu) {
    const dt = Math.min(0.05, (nu - vorige) / 1000);
    vorige = nu;

    controls.update(dt);
    spel.update(dt);
    wereld.render();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(function (t) {
    vorige = t;
    frame(t);
    const laden = BNW.$('#loader');
    laden.classList.add('weg');
    setTimeout(() => { laden.hidden = true; }, 700);
    BNW.$('#help').hidden = false;   // eerste keer meteen de uitleg tonen
  });
})(window.BNW);

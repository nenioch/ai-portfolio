/* Alles aan elkaar knopen en de tekenlus starten. */

(function (MB) {
  'use strict';
  if (!window.THREE) return;

  const canvas = MB.$('#scene');
  const wereld = MB.World.init(canvas);

  // De planetoïde bouwen kost even; het laadscherm blijft tot het beeld er staat.
  wereld.kern.add(MB.Rock.bouwMesh());

  const controls = MB.maakControls(canvas, wereld.camera);
  const spel = MB.maakSpel(wereld, controls);
  const intro = MB.maakIntro(wereld, controls, spel);

  // handig om in de console mee te prutsen
  MB.wereld = wereld;
  MB.controls = controls;
  MB.spel = spel;
  MB.intro = intro;

  let vorige = performance.now();
  function frame(nu) {
    const dt = Math.min(0.05, (nu - vorige) / 1000);
    vorige = nu;

    intro.update(dt);        // stuurt tijdens het aanmeren het schip en de camera
    controls.update(dt);
    spel.update(dt);
    wereld.render();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(function (t) {
    vorige = t;
    intro.start();           // eerst het schip hoog zetten, dan pas tekenen
    frame(t);
    const laden = MB.$('#loader');
    laden.classList.add('weg');
    setTimeout(() => { laden.hidden = true; }, 700);
  });
})(window.MB);

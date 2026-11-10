/* Alles aan elkaar knopen: wereld, stad, leven en camera; muis-aanwijzen met
   namen; de knoppen in de bovenbalk; en de tekenlus. */

(function (MC) {
  'use strict';
  if (!window.THREE) return;

  const UITLEG = {
    'Templo Mayor': 'Huey Teocalli, de grote tempel: vier lagen hoog, met twee trappen naar de heiligdommen van Huitzilopochtli (rood, oorlog en zon) en Tlaloc (blauw, regen).',
    'Heilig plein': 'Het ommuurde hart van de stad, waar de belangrijkste tempels, scholen en altaren staan.',
    'Slangenmuur': 'Coatepantli: de muur rond het heilige plein, met kantelen en stenen slangenkoppen aan de buitenkant.',
    'Tempel van Ehecatl': 'Ronde tempel voor de windgod Ehecatl-Quetzalcoatl. Rond, zodat de wind er ongehinderd omheen kan waaien.',
    'Balspelveld': 'Tlachtli: het I-vormige veld voor het balspel met een rubberen bal. Wie hem door de stenen ring kreeg, won meteen.',
    'Tzompantli': 'Het schedelrek: houten palen en latten vol schedels van geofferden, voor iedereen zichtbaar op het plein.',
    'Zonnesteen': 'De Piedra del Sol: Tonatiuh in het midden, de vier vorige zonnen, twintig dagtekens en twee vuurslangen langs de rand.',
    'Huis van de Adelaars': 'Verblijf van de adelaarskrijgers, met een zuilengang en adelaarskoppen langs de trap.',
    'Tempel van Tezcatlipoca': 'Tempel van de Rokende Spiegel, god van de nacht en het noodlot. Zijn heiligdom is zwart.',
    'Calmecac': 'De school waar zonen van edelen tot priester, rechter of bestuurder werden opgeleid.',
    'Paleis van Moctezuma': 'Twee verdiepingen rond binnenplaatsen met tuinen en een vijver. Hier woonde de huey tlatoani met zijn hofhouding.',
    'Paleis van Axayácatl': 'Het paleis van Moctezuma\'s vader. In 1519 werden de Spanjaarden hier ondergebracht.',
    'Vogelhuis van Moctezuma': 'Totocalli: vijvers voor watervogels, volières vol papegaaien en quetzals, en een galerij om ze te bekijken.',
    'Plein en markt': 'Het plein ten zuiden van de slangenmuur, met kramen en een fontein die gevoed wordt door het aquaduct.',
    'Markt van Tlatelolco': 'De grootste markt van het dal: elke dag tienduizenden mensen. Elke waar had een eigen straat, van cacao tot obsidiaan.',
    'Tempel van Tlatelolco': 'Tweelingpiramide van de zusterstad Tlatelolco, net zo gebouwd als de Templo Mayor.',
    'Dijkweg': 'Calzada: een brede stenen dam over het meer. Drie ervan verbinden het eiland met de oever.',
    'Houten brug': 'Waar een kanaal de dijkweg kruist, ligt een houten brug die je in tijden van oorlog kunt weghalen.',
    'Aquaduct van Chapultepec': 'Een dubbele stenen goot die zoet bronwater van de heuvel van Chapultepec naar de stad brengt.',
    'Fort Xoloc': 'Twee torens met een poort op de dijkweg naar Iztapalapa: hier ontmoetten Moctezuma en Cortés elkaar.',
    'Aanlegplaats': 'Steigers aan de oostkant waar kano\'s met vracht van over het meer aanleggen.',
    'Stadswijk': 'Een calpulli: een wijk van families met hun eigen tempel, school en akkers.',
    'Woonhuis': 'Gekalkte muren, een rode plint en een plat dak waarop je kon zitten of gewassen drogen.',
    'Patiohuis': 'Huis van een koopman of edelman, met vier vleugels rond een binnenplaats en een meanderfries.',
    'Wijktempel': 'Elke calpulli had een eigen kleine piramide voor haar beschermgod.',
    'Temazcal': 'Een zweetbad van leem, voor reiniging en genezing.',
    'Maïsakker': 'Chinampa met rijen maïs. Het water in de kanalen houdt de grond vochtig.',
    'Groenteakker': 'Chinampa met bonen, pompoen en chilipepers in parallelle rijen.',
    'Bloemenakker': 'Chinampa met cempasúchil en andere bloemen voor de tempels.',
    'Woonerf': 'Kavel met rieten hutten en lemen huizen, dicht op elkaar.',
    'Chinampa': 'Een drijvende akker, opgebouwd uit modder en riet binnen een houten beschoeiing.',
    'Rieten hut': 'Lemen onderbouw onder een hoog, afgerond dak van riet.',
    'Adobehuis': 'Huis van leem met een plat dak en uitstekende balken.',
    'Ahuejote': 'Slanke wilg langs de rand van een chinampa; de wortels houden de akker op zijn plek.',
    'Ahuehuete': 'Moerascipres, de heilige boom van Chapultepec. Sommige werden meer dan duizend jaar oud.',
    'Marktkraam': 'Kraam met maïs, cacao, katoen, veren, pompoen, chilipepers en aardewerk.',
    'Meer': 'Het Texcocomeer. Kano\'s varen tussen de akkers, de stad en de dorpen aan de oever.',
    'Oever en bergen': 'Het dal van Mexico, met Chapultepec in het westen en de vulkanen Popocatépetl en Iztaccíhuatl in het zuidoosten.'
  };

  const canvas = MC.$('#scene');
  const laden = MC.$('#loader');

  function bouw() {
    MC.maakMaterialen();
    const wereld = MC.World.init(canvas);
    const stad = new THREE.Group();
    wereld.scene.add(stad);

    MC.maakSeries();
    MC.bouwCentrum(stad, wereld);
    MC.bouwPaleizen(stad, wereld);
    MC.bouwWijken(stad);
    const leven = MC.maakLeven();
    MC.bouwSeries(stad);

    const controls = MC.maakControls(canvas, wereld.camera);
    MC.wereld = wereld;
    MC.controls = controls;

    // --------------------------------------------------------- aanwijzen
    const straal = new THREE.Raycaster();
    const grond = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.4);
    const info = MC.$('#info');
    const infoNaam = MC.$('#info-naam');
    const infoTekst = MC.$('#info-tekst');
    let vast = null;

    function raak(punt) {
      straal.setFromCamera(punt, wereld.camera);
      const hits = straal.intersectObjects(MC.pickbaar, false);
      for (const h of hits) {
        const o = h.object;
        const naam = o.userData.namen && h.instanceId != null ? o.userData.namen[h.instanceId] : o.userData.naam;
        if (naam) return { naam, punt: h.point };
      }
      const p = new THREE.Vector3();
      return straal.ray.intersectPlane(grond, p) ? { naam: null, punt: p } : null;
    }

    function toon(naam) {
      if (!naam) {
        info.hidden = true;
        return;
      }
      info.hidden = false;
      infoNaam.textContent = naam;
      infoTekst.textContent = UITLEG[naam] || '';
    }

    let zweefKlaar = 0, zweefPunt = null;
    controls.opZweef = function (p) { zweefPunt = p; };
    function zweef(nu) {
      if (!zweefPunt || nu < zweefKlaar || vast) return;
      zweefKlaar = nu + 90;
      const h = raak(zweefPunt);
      zweefPunt = null;
      toon(h && h.naam);
    }

    function draaipunt(p) {
      const h = raak(p);
      if (!h) return;
      controls.zetAnker(h.punt);
      vast = h.naam;
      toon(h.naam);
      MC.$('#info-los').hidden = !h.naam;
    }
    controls.opKlik = draaipunt;
    controls.opDraaipunt = draaipunt;

    function loslaten() {
      vast = null;
      toon(null);
      controls.naarHuis();
    }
    MC.$('#info-los').addEventListener('click', loslaten);
    window.addEventListener('keydown', function (e) {
      if (MC.inVeld(e)) return;
      if (e.key === 'Escape') loslaten();
      if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('kaal');
    });

    // ---------------------------------------------------------- bovenbalk
    const schuif = MC.$('#tijd');
    const tijdLabel = MC.$('#tijd-lbl');
    let uur = 16, cyclus = false;
    function zetUur(u) {
      uur = (u + 24) % 24;
      schuif.value = uur;
      const h = Math.floor(uur), m = Math.floor((uur - h) * 60);
      tijdLabel.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
      wereld.zetTijd(uur);
    }
    schuif.addEventListener('input', function () { zetUur(parseFloat(schuif.value)); });
    zetUur(uur);

    // #cam=theta,phi,afstand,x,y,z[,uur] zet een vast standpunt (handig voor screenshots)
    const cam = /cam=([-\d.,]+)/.exec(location.hash);
    if (cam) {
      const v = cam[1].split(',').map(Number);
      controls.theta = controls.doelTheta = v[0];
      controls.phi = controls.doelPhi = v[1];
      controls.afstand = controls.doelAfstand = v[2];
      if (v.length >= 6) { controls.anker.set(v[3], v[4], v[5]); controls.doelAnker.copy(controls.anker); }
      if (v.length >= 7) zetUur(v[6]);
      controls.autoDraai = false;
    }

    function knop(id, aan, fn) {
      const b = MC.$(id);
      b.classList.toggle('on', aan);
      b.setAttribute('aria-pressed', String(aan));
      b.addEventListener('click', function () {
        aan = !aan;
        b.classList.toggle('on', aan);
        b.setAttribute('aria-pressed', String(aan));
        fn(aan);
      });
    }
    knop('#btn-cyclus', false, function (v) { cyclus = v; });
    knop('#btn-draai', controls.autoDraai, function (v) { controls.autoDraai = v; });
    knop('#btn-rand', true, function (v) { controls.randScroll = v; });

    const hulp = MC.$('#help');
    MC.$('#btn-help').addEventListener('click', function () { hulp.hidden = false; });
    MC.$('#help-close').addEventListener('click', function () { hulp.hidden = true; });
    hulp.addEventListener('click', function (e) { if (e.target === hulp) hulp.hidden = true; });

    // --------------------------------------------------------------- lus
    let vorige = performance.now();
    function frame(nu) {
      const dt = Math.min(0.05, (nu - vorige) / 1000);
      vorige = nu;
      const t = nu / 1000;
      if (cyclus) zetUur(uur + dt * 0.2);        // een dag in twee minuten
      MC.wind.uTijd.value = t;
      controls.update(dt);
      leven.update(MC.bewegingBeperkt ? dt * 0.5 : dt, t);
      wereld.update(dt);
      zweef(nu);
      wereld.render();
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(function (t) {
      vorige = t;
      frame(t);
      laden.classList.add('weg');
      setTimeout(function () { laden.hidden = true; }, 700);
    });
  }

  // eerst het laadscherm laten tekenen, dan pas de stad opbouwen
  requestAnimationFrame(function () { setTimeout(bouw, 30); });
})(window.MC);

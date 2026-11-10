/* Het spel: de bouwplekken op het dok-platform, de huishouding van stroom,
   zuurstof, water, brandstof en regoliet, en alles wat de speler kan
   aanklikken. Er is geen geld: modules kosten grondstoffen. Er gaan ook geen
   mensen mee — de kolonie bestaat uit robots, en die leven op stroom. */

(function (MB) {
  'use strict';
  if (!window.THREE) return;

  const Rock = MB.Rock;
  const Bouw = MB.Buildings;
  const DEFS = Bouw.DEFS;

  const DRAAI = 0.045;          // radialen per seconde: een omwenteling duurt ~140 s
  const LADEN = 0.25;           // stroom die een robot per seconde uit het net trekt
  const ROBOTPRIJS = 30;        // regoliet voor één nieuwe robot uit de werkplaats
  const ROBOTTIJD = 35;         // seconden die de werkplaats over een robot doet
  const UITVALTIJD = 25;        // zo lang houdt een robot het uit met lege accu's
  const VRACHTPRIJS = 60;       // brandstof die een vertrekkend schip meeneemt
  // Meer robots om te laden = meer regoliet dat het schip terugbrengt.
  const winst = (robots) => 40 + 12 * robots;

  // Waarmee je betaalt, in de volgorde waarin de kosten getoond worden.
  const GRONDSTOFFEN = ['regoliet', 'water', 'zuurstof', 'brandstof'];
  const SLOOPDEEL = 0.5;        // wat er van het regoliet terugkomt bij slopen

  const DOK_Y = 0.48;           // hoogte waarop een schip aangemeerd staat
  const NADER_HOOGTE = 90;      // vanaf hier komt een nieuw schip binnenvliegen
  const NADER_TIJD = 6;         // seconden die het aanmeren duurt

  // Negentien plekken: één in het midden, een binnenring en een buitenring.
  const SLOTS = [{ u: 0, v: 0 }];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    SLOTS.push({ u: Math.cos(a) * 5.9, v: Math.sin(a) * 5.9 });
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    SLOTS.push({ u: Math.cos(a) * 10.3, v: Math.sin(a) * 10.3 });
  }

  /* Je begint kaal: alleen het dockingstation waar het eerste schip op
     aanmeert. Alles wat het station verder nodig heeft zit als bouwmateriaal
     in het vrachtruim. */
  const START = [[1, 'dockingstation']];

  // Zonnepaneel, graver, zuurstof- en waterfabriek kosten samen 220; de rest
  // is genoeg voor een robotwerkplaats of een tweede paneel.
  const STARTVRACHT = 380;      // regoliet (bouwblokken) dat uit het ruim komt
  const STARTROBOTS = 2;        // robots die meevliegen en na het aanmeren uitrijden

  MB.maakSpel = function (wereld, controls) {
    const kern = wereld.kern;
    const bouwwerken = [];
    const markers = [];

    const S = {
      naam: 'Station Alfa',
      regoliet: 0,          // komt pas uit het vrachtruim na het aanmeren
      stroom: 200,
      brandstof: 0,
      zuurstof: 30,
      water: 30,
      robots: 0,            // de robots staan nog vastgesjord in het schip
      intro: true,          // het aanmeren loopt; het spel staat zolang stil
      gelost: false,
      zon: 1,
      tekort: 1,          // 0..1, hoeveel van de vraag er gedekt wordt
      draait: true,
      volgen: true,
      bouwKlok: 0,          // voortgang van de robot die in de werkplaats staat
      uitvalKlok: 0,        // hoe lang de accu's al leeg zijn
      tijd: 0
    };

    let bouwModus = null;
    let gekozen = null;
    let zweefSlot = null;
    let hudKlok = 0;

    // ------------------------------------------------------------ plekken

    const markerMat = new THREE.MeshBasicMaterial({
      color: 0x62d8ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide
    });
    const markerVlakMat = new THREE.MeshBasicMaterial({
      color: 0x62d8ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide
    });

    SLOTS.forEach(function (slot, i) {
      const dir = Rock.richtingUitOffset(slot.u, slot.v);
      const g = new THREE.Group();
      g.position.copy(dir).multiplyScalar(Rock.hoogteBij(dir) + 0.02);
      g.quaternion.copy(Rock.orientatie(dir));

      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.07, 6, 28), markerMat);
      ring.rotation.x = -Math.PI / 2;
      const vlak = new THREE.Mesh(new THREE.CircleGeometry(2.25, 28), markerVlakMat);
      vlak.rotation.x = -Math.PI / 2;
      g.add(ring, vlak);
      g.visible = false;

      kern.add(g);
      slot.index = i;
      slot.groep = g;
      slot.raakvlak = vlak;
      vlak.userData.slot = slot;
      markers.push(g);
    });

    const keuzering = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.07, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xff8b45 })
    );
    keuzering.rotation.x = -Math.PI / 2;
    keuzering.position.y = 0.08;

    // ---------------------------------------------------------- draaipunt

    /* Een leeg object dat als draaipunt dienstdoet wanneer je het wieltje op het
       kale gesteente indrukt; het hangt in de kerngroep en draait dus mee. */
    const losDraaipunt = new THREE.Object3D();
    kern.add(losDraaipunt);

    const draaimerk = new THREE.Group();
    (function () {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff8b45, transparent: true, opacity: 0.7, depthTest: false
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 6, 24), mat);
      ring.rotation.x = -Math.PI / 2;
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 6), mat);
      pin.position.y = 0.7;
      draaimerk.add(ring, pin);
      // altijd zichtbaar, en het mag geen klikken opvangen
      draaimerk.traverse(function (o) {
        o.renderOrder = 5;
        o.raycast = function () {};
      });
    })();

    function zetDraaipunt(obj) {
      controls.zetAnker(obj);
      if (draaimerk.parent) draaimerk.parent.remove(draaimerk);
      if (obj) {
        draaimerk.scale.setScalar(obj.userData.robot ? 0.45 : 1);
        obj.add(draaimerk);
      }
    }

    // ------------------------------------------------------------- robots

    const volk = MB.Robots.maak(kern);

    // de robots rijden van module naar module; dit is hun lijstje klusplekken
    function verversLoopdoelen() {
      volk.doelen = SLOTS.filter((s) => s.bezet).map((s) => ({ u: s.u, v: s.v }));
    }

    // ---------------------------------------------------------- bouwwerken

    function zetNeer(type, slot) {
      const dir = Rock.richtingUitOffset(slot.u, slot.v);
      const g = Bouw.maak(type);
      g.position.copy(dir).multiplyScalar(Rock.hoogteBij(dir));
      g.quaternion.copy(Rock.orientatie(dir));
      kern.add(g);

      const b = {
        type: type,
        def: DEFS[type],
        slot: slot,
        groep: g,
        refs: g.userData.refs || {},
        vertrekt: false,
        vertrekT: 0,
        nadert: false,
        naderT: 0,
        lading: 0,          // regoliet dat het schip bij terugkomst lost
        wacht: 0,
        klemOpen: 0
      };
      g.userData.bouwwerk = b;
      slot.bezet = b;
      bouwwerken.push(b);
      verversLoopdoelen();
      return b;
    }

    function sloop(b) {
      if (controls.ankerObject && isDeelVan(controls.ankerObject, b.groep)) zetDraaipunt(null);
      kern.remove(b.groep);
      b.slot.bezet = null;
      bouwwerken.splice(bouwwerken.indexOf(b), 1);
      verversLoopdoelen();
      S.regoliet += sloopOpbrengst(b.def);
      if (gekozen === b) kies(null);
      melding(b.def.naam + ' gesloopt — ' + sloopOpbrengst(b.def) + ' regoliet terug');
    }

    // ---------------------------------------------------------- kosten

    function kostLijst(d) {
      return GRONDSTOFFEN.filter((g) => d.kosten[g] > 0).map((g) => [g, d.kosten[g]]);
    }

    function kostTekst(d) {
      return kostLijst(d).map((k) => k[1] + ' ' + k[0]).join(' · ');
    }

    // de eerste grondstof waar je te weinig van hebt, of null
    function tekortAan(d) {
      const k = kostLijst(d).find((k) => S[k[0]] < k[1]);
      return k ? k[0] : null;
    }

    function betaal(d) {
      kostLijst(d).forEach((k) => { S[k[0]] -= k[1]; });
    }

    function sloopOpbrengst(d) {
      return Math.round((d.kosten.regoliet || 0) * SLOOPDEEL);
    }

    START.forEach((s) => zetNeer(s[1], SLOTS[s[0]]));

    // ------------------------------------------------------------ aanmeren

    /* Het dockingstation waar het eerste schip op neerkomt. De intro laat het
       schip erop zakken; zodra het vastzit, gaat het ruim open. */
    function dok() {
      for (let i = 0; i < bouwwerken.length; i++) {
        if (bouwwerken[i].type === 'dockingstation') return bouwwerken[i];
      }
      return null;
    }

    function zetKisten() {
      const b = dok();
      if (!S.gelost || !b || b.kisten) return;
      b.kisten = Bouw.vracht();
      b.groep.add(b.kisten);
    }

    /* Het aanmeren is voorbij: het ruim gaat open, de robots rijden naar
       buiten en het spel begint te lopen. */
    function landingKlaar() {
      if (!S.intro) return;
      S.intro = false;
      if (!S.gelost) {
        S.gelost = true;
        S.regoliet += STARTVRACHT;
        S.robots = STARTROBOTS;
        zetKisten();
        melding('Vrachtruim open — ' + STARTVRACHT + ' regoliet aan bouwblokken', 'goed');
      }
      S.tot = totalen();
      verversHud();
    }

    // ------------------------------------------------------------ rekenen

    function totalen() {
      const t = {
        opwek: 0, vraag: LADEN * S.robots, brandstof: 0, zuurstof: 0, water: 0, regoliet: 0,
        raffWater: 0, raffZuurstof: 0,
        plaatsen: 0, accu: 90,
        brandstofCap: 0, zuurstofCap: 30, waterCap: 30
      };
      for (let i = 0; i < bouwwerken.length; i++) {
        const d = bouwwerken[i].def;
        if (d.opwekking) t.opwek += d.opwekking * S.zon;
        if (d.stroom > 0) t.opwek += d.stroom;
        if (d.stroom < 0) t.vraag += -d.stroom;
        if (d.accu) t.accu += d.accu;
        if (d.robotplaatsen) t.plaatsen += d.robotplaatsen;
        if (d.verbruik) {
          t.raffWater += d.verbruik.water || 0;
          t.raffZuurstof += d.verbruik.zuurstof || 0;
        }
        if (d.brandstof) t.brandstof += d.brandstof;
        if (d.brandstofOpslag) t.brandstofCap += d.brandstofOpslag;
        if (d.zuurstof) t.zuurstof += d.zuurstof;
        if (d.zuurstofOpslag) t.zuurstofCap += d.zuurstofOpslag;
        if (d.water) t.water += d.water;
        if (d.waterOpslag) t.waterCap += d.waterOpslag;
        if (d.regoliet) t.regoliet += d.regoliet;
      }
      return t;
    }

    function simuleer(dt) {
      const basisRichting = Rock.BASE_DIR.clone().applyQuaternion(kern.quaternion);
      S.zon = MB.clamp(basisRichting.dot(MB.World.ZON), 0, 1);

      const t = totalen();
      S.tot = t;

      // Stroom: wat er beschikbaar is bepaalt hoe hard de verbruikers draaien.
      const beschikbaar = t.opwek * dt + S.stroom;
      const gevraagd = t.vraag * dt;
      S.tekort = gevraagd > 1e-6 ? MB.clamp(beschikbaar / gevraagd, 0, 1) : 1;
      S.stroom = MB.clamp(S.stroom + (t.opwek - t.vraag * S.tekort) * dt, 0, t.accu);

      /* De brandstoftanks maken raketbrandstof van water en zuurstof. Ze
         stoppen als de tanks vol zijn of een van de twee op is, zodat ze niet
         voor niets je bouwvoorraad opmaken. */
      S.raffinage = S.brandstof >= t.brandstofCap - 0.01 ||
        S.water <= 0.01 || S.zuurstof <= 0.01 ? 0 : S.tekort;

      S.zuurstof = MB.clamp(
        S.zuurstof + (t.zuurstof * S.tekort - t.raffZuurstof * S.raffinage) * dt, 0, t.zuurstofCap);
      S.water = MB.clamp(
        S.water + (t.water * S.tekort - t.raffWater * S.raffinage) * dt, 0, t.waterCap);
      S.brandstof = MB.clamp(S.brandstof + t.brandstof * S.raffinage * dt, 0, t.brandstofCap);
      // regoliet ligt in hopen op het platform; daar zit geen plafond op
      S.regoliet += t.regoliet * S.tekort * dt;

      // Nieuwe robots: een werkplaats met vrije plek, regoliet en volle stroom.
      if (S.robots < t.plaatsen && S.regoliet >= ROBOTPRIJS && S.tekort > 0.95) {
        S.bouwKlok += dt;
        if (S.bouwKlok >= ROBOTTIJD) {
          S.bouwKlok = 0;
          S.regoliet -= ROBOTPRIJS;
          S.robots++;
          melding('De werkplaats heeft een robot afgeleverd — nu ' + S.robots, 'goed');
        }
      }

      // Lege accu's: een robot die niet kan laden valt na een tijdje stil.
      if (S.stroom <= 0.01 && S.tekort < 0.6 && S.robots > 1) {
        S.uitvalKlok += dt;
        if (S.uitvalKlok > UITVALTIJD) {
          S.uitvalKlok = 0;
          S.robots--;
          melding('Accu’s leeg: een robot is stilgevallen', 'slecht');
        }
      } else {
        S.uitvalKlok = 0;
      }
    }

    // ------------------------------------------------------ animatie

    const UP = new THREE.Vector3(0, 1, 0);
    const hulpQ = new THREE.Quaternion();
    const hulpV = new THREE.Vector3();
    const doelQ = new THREE.Quaternion();

    function vulling(waarde, cap) {
      return Math.max(0.001, cap > 0 ? MB.clamp(waarde / cap, 0, 1) : 0);
    }

    function animeer(dt) {
      Bouw.MAT.lamp.emissiveIntensity = 1.0 + Math.sin(S.tijd * 3.2) * 0.45;

      const t = S.tot || totalen();

      for (let i = 0; i < bouwwerken.length; i++) {
        const b = bouwwerken[i];

        if (b.type === 'solar' && b.refs.arm) {
          // panelen volgen de zon en blijven staan zodra die onder gaat
          b.groep.getWorldQuaternion(hulpQ);
          hulpV.copy(MB.World.ZON).applyQuaternion(hulpQ.invert());
          if (hulpV.y > 0.10) {
            doelQ.setFromUnitVectors(UP, hulpV);
            b.refs.arm.quaternion.slerp(doelQ, Math.min(1, dt * 1.5));
          }
        }

        if (b.type === 'fueltank' && b.refs.meter) {
          b.refs.meter.scale.y = vulling(S.brandstof, t.brandstofCap);
        }

        if (b.type === 'habitat' && b.refs.arm) {
          // de montagearm zwaait alleen heen en weer als er een robot in de maak is
          const bezig = S.robots < t.plaatsen && S.regoliet >= ROBOTPRIJS ? S.tekort : 0;
          b.fase = (b.fase || 0) + dt * 2.2 * bezig;
          b.refs.arm.rotation.y = Math.sin(b.fase) * 0.9;
        }

        if (b.type === 'oxygenplant') {
          if (b.refs.meter) b.refs.meter.scale.y = vulling(S.zuurstof, t.zuurstofCap);
          // de rotor draait alleen mee als er stroom is
          if (b.refs.rotor) b.refs.rotor.rotation.y += dt * 5.5 * S.tekort;
        }

        if (b.type === 'waterplant') {
          if (b.refs.meter) b.refs.meter.scale.y = vulling(S.water, t.waterCap);
          if (b.refs.boor) b.refs.boor.rotation.y += dt * 7.0 * S.tekort;
        }

        if (b.type === 'regolithmine' && b.refs.wiel) {
          b.refs.wiel.rotation.z -= dt * 1.6 * S.tekort;
        }

        if (b.type === 'dockingstation') animeerSchip(b, dt);
      }
    }

    function animeerSchip(b, dt) {
      const s = b.refs.schip, v = b.refs.vlam;
      if (!s) return;

      // klemmen gaan open zodra er geen schip vastzit (ook als de intro het
      // eerste schip nog laat zakken)
      const doelOpen = aangemeerd(b) && !b.landt ? 0 : 1;
      b.klemOpen += (doelOpen - b.klemOpen) * Math.min(1, dt * 3);
      for (let i = 0; i < b.refs.klemmen.length; i++) {
        const klem = b.refs.klemmen[i];
        const r = 1.55 + b.klemOpen * 0.45;
        klem.position.x = Math.cos(klem.userData.hoek) * r;
        klem.position.z = Math.sin(klem.userData.hoek) * r;
      }

      if (b.vertrekt) {
        b.vertrekT += dt;
        const t = b.vertrekT;
        s.position.y = DOK_Y + 2.6 * t * t;
        s.rotation.z = -0.012 * t * t;
        v.visible = true;
        v.scale.set(1 + Math.sin(t * 47) * 0.12, 1 + Math.sin(t * 31) * 0.3, 1 + Math.sin(t * 53) * 0.12);

        if (s.position.y > 110) {
          b.vertrekt = false;
          b.wacht = 12;
          s.visible = false;
          v.visible = false;
          // wie het schip volgde blijft anders in het niets hangen
          if (controls.ankerObject === s) zetDraaipunt(b.groep);
        }
      } else if (b.wacht > 0) {
        b.wacht -= dt;
        if (b.wacht <= 0) {
          b.wacht = 0;
          startNadering(b);
        }
      } else if (b.nadert) {
        b.naderT += dt;
        const t = MB.clamp(b.naderT / NADER_TIJD, 0, 1);
        const remmen = 1 - (1 - t) * (1 - t);          // snel binnenkomen, zacht aanmeren
        s.position.y = MB.lerp(NADER_HOOGTE, DOK_Y, remmen);
        v.visible = true;
        v.scale.set(1, 0.4 + (1 - t) * 1.2, 1);
        if (t >= 1) {
          b.nadert = false;
          b.naderT = 0;
          s.position.y = DOK_Y;
          s.rotation.z = 0;
          v.visible = false;
          v.scale.set(1, 1, 1);
          if (b.lading > 0) {
            S.regoliet += b.lading;
            melding('Het schip is terug — ' + b.lading + ' regoliet gelost', 'goed');
            b.lading = 0;
          } else {
            melding('Een vrachtschip is aangemeerd', 'goed');
          }
        }
      }
    }

    function startNadering(b) {
      const s = b.refs.schip;
      if (!s) return;
      b.nadert = true;
      b.naderT = 0;
      s.visible = true;
      s.rotation.z = 0;
      s.position.y = NADER_HOOGTE;
      if (b.refs.vlam) b.refs.vlam.visible = true;
      melding('Er nadert een vrachtschip het dok');
    }

    function aangemeerd(b) {
      return !b.vertrekt && !b.nadert && b.wacht <= 0;
    }

    function stuurWeg(b) {
      if (!aangemeerd(b)) return;
      if (S.brandstof < VRACHTPRIJS) { melding('Te weinig brandstof voor een vracht', 'slecht'); return; }
      if (S.robots < 2) { melding('Je hebt minstens twee robots nodig om te laden', 'slecht'); return; }
      S.brandstof -= VRACHTPRIJS;
      b.vertrekt = true;
      b.vertrekT = 0;
      // de robots die nu laden bepalen hoeveel er straks mee terugkomt
      b.lading = winst(S.robots);
      melding('Klemmen los — het schip gaat regoliet halen');
      toonPaneel();
    }

    // ---------------------------------------------------------------- HUD

    const el = {
      regoliet: MB.$('#v-regolith'), rRegoliet: MB.$('#r-regolith'), crew: MB.$('#v-crew'),
      stroom: MB.$('#v-power'),
      zuurstof: MB.$('#v-oxygen'), water: MB.$('#v-water'), brandstof: MB.$('#v-fuel'),
      bStroom: MB.$('#bar-power'),
      bZuurstof: MB.$('#bar-oxygen'), bWater: MB.$('#bar-water'), bBrandstof: MB.$('#bar-fuel'),
      rStroom: MB.$('#r-power'),
      rZuurstof: MB.$('#r-oxygen'), rWater: MB.$('#r-water'), rBrandstof: MB.$('#r-fuel'),
      paneel: MB.$('#panel'), pNaam: MB.$('#p-name'), pDesc: MB.$('#p-desc'),
      pStats: MB.$('#p-stats'), pActies: MB.$('#p-actions'),
      knoppen: MB.$('#build-buttons'), hint: MB.$('#build-hint'),
      toast: MB.$('#toast'), canvas: MB.$('#scene')
    };

    function tarief(node, waarde) {
      node.textContent = MB.tekens(waarde) + '/s';
      node.className = 'rate' + (waarde < -0.01 ? ' min' : waarde > 0.01 ? ' plus' : '');
    }

    function meter(waardeEl, barEl, rateEl, waarde, cap, stroomTarief) {
      waardeEl.textContent = Math.round(waarde) + '/' + Math.round(cap);
      barEl.style.width = (waarde / Math.max(1, cap)) * 100 + '%';
      tarief(rateEl, stroomTarief);
    }

    function verversHud() {
      const t = S.tot || totalen();
      el.regoliet.textContent = Math.floor(S.regoliet);
      el.rRegoliet.textContent = 'regoliet ' + MB.tekens(t.regoliet * S.tekort) + '/s';
      el.crew.textContent = S.robots + '/' + t.plaatsen;

      meter(el.stroom, el.bStroom, el.rStroom, S.stroom, t.accu, t.opwek - t.vraag * S.tekort);
      el.rStroom.textContent += S.zon > 0.05 ? ' ☀' : ' ☾';

      const raff = S.raffinage || 0;
      meter(el.zuurstof, el.bZuurstof, el.rZuurstof, S.zuurstof, t.zuurstofCap,
        t.zuurstof * S.tekort - t.raffZuurstof * raff);
      meter(el.water, el.bWater, el.rWater, S.water, t.waterCap,
        t.water * S.tekort - t.raffWater * raff);
      meter(el.brandstof, el.bBrandstof, el.rBrandstof, S.brandstof, t.brandstofCap,
        t.brandstof * raff);

      for (const knop of el.knoppen.children) {
        knop.disabled = !!tekortAan(DEFS[knop.dataset.type]);
      }
      if (gekozen) toonPaneel();
    }

    let toastKlok = 0;
    function melding(tekst, soort) {
      el.toast.textContent = tekst;
      el.toast.className = 'zien' + (soort ? ' ' + soort : '');
      toastKlok = 3.2;
    }

    // ------------------------------------------------------------- paneel

    function regel(naam, waarde, waarschuwing) {
      return '<li' + (waarschuwing ? ' class="waarschuwing"' : '') + '><span>' + naam +
        '</span><span>' + waarde + '</span></li>';
    }

    function schipStatus(b) {
      if (b.vertrekt) return 'onderweg';
      if (b.nadert) return 'meert aan';
      if (b.wacht > 0) return 'nieuw schip over ' + Math.ceil(b.wacht) + 's';
      return 'aangemeerd';
    }

    function toonPaneel() {
      if (!gekozen) { el.paneel.hidden = true; return; }
      const b = gekozen, d = b.def;
      el.paneel.hidden = false;
      el.pNaam.textContent = d.naam;
      el.pDesc.textContent = d.omschrijving;

      const geenStroom = S.tekort < 0.99;
      let r = '';
      if (d.stroom) r += regel('Stroom', MB.tekens(d.stroom) + '/s');
      if (d.opwekking) r += regel('Opwekking', MB.tekens(d.opwekking * S.zon) + '/s') +
        regel('Zon', S.zon > 0.05 ? Math.round(S.zon * 100) + '%' : 'schaduw', S.zon <= 0.05) +
        regel('Accu', '+' + d.accu);
      if (d.robotplaatsen) {
        const t = S.tot || totalen();
        r += regel('Plaatsen', d.robotplaatsen + ' robots');
        r += regel('Robots', S.robots + '/' + t.plaatsen);
        if (S.robots >= t.plaatsen) r += regel('Volgende robot', 'geen plek vrij');
        else if (S.regoliet < ROBOTPRIJS) r += regel('Volgende robot', 'wacht op ' + ROBOTPRIJS + ' regoliet', true);
        else r += regel('Volgende robot', Math.round((S.bouwKlok / ROBOTTIJD) * 100) + '%', geenStroom);
      }
      if (d.zuurstof) r += regel('Productie', MB.tekens(d.zuurstof * S.tekort) + '/s', geenStroom) +
        regel('Opslag', d.zuurstofOpslag);
      if (d.water) r += regel('Winning', MB.tekens(d.water * S.tekort) + '/s', geenStroom) +
        regel('Opslag', d.waterOpslag);
      if (d.brandstof) {
        const raff = S.raffinage || 0;
        r += regel('Productie', MB.tekens(d.brandstof * raff) + '/s', raff < 0.99) +
          regel('Verbruik', d.verbruik.water + ' water · ' + d.verbruik.zuurstof + ' zuurstof /s') +
          regel('Opslag', d.brandstofOpslag);
        if (raff === 0 && S.brandstof < (S.tot || totalen()).brandstofCap - 0.01) {
          r += regel('Stil', S.water <= 0.01 ? 'water op' : S.zuurstof <= 0.01 ? 'zuurstof op' : 'geen stroom', true);
        }
      }
      if (d.regoliet) r += regel('Graven', MB.tekens(d.regoliet * S.tekort) + '/s', geenStroom);
      if (b.type === 'dockingstation') {
        r += regel('Brandstof', Math.round(S.brandstof) + '/' + VRACHTPRIJS, S.brandstof < VRACHTPRIJS);
        r += regel(b.lading > 0 ? 'Lading' : 'Opbrengst',
          (b.lading > 0 ? b.lading : winst(S.robots)) + ' regoliet');
        r += regel('Status', schipStatus(b));
      }
      if (geenStroom) r += regel('Stroomtekort', Math.round(S.tekort * 100) + '% vermogen', true);
      el.pStats.innerHTML = r;

      el.pActies.innerHTML = '';
      if (b.type === 'dockingstation') {
        const knop = document.createElement('button');
        knop.className = 'actie primair';
        knop.textContent = 'Regoliet halen (' + VRACHTPRIJS + ' brandstof)';
        knop.disabled = !aangemeerd(b) || S.brandstof < VRACHTPRIJS || S.robots < 2;
        knop.onclick = () => stuurWeg(b);
        el.pActies.appendChild(knop);
      }
      // Het schip is te klein en te snel om op een telefoon aan te wijzen.
      if (b.refs.schip && b.refs.schip.visible) {
        const opSchip = controls.ankerObject === b.refs.schip;
        const sk = document.createElement('button');
        sk.className = 'actie';
        sk.textContent = opSchip ? 'Schip loslaten' : 'Camera op het schip';
        sk.onclick = function () {
          zetDraaipunt(opSchip ? null : b.refs.schip);
          toonPaneel();
        };
        el.pActies.appendChild(sk);
      }

      const hier = controls.ankerObject === b.groep;
      const dr = document.createElement('button');
      dr.className = 'actie';
      dr.textContent = hier ? 'Draai weer om de planetoïde' : 'Camera hieromheen draaien';
      dr.onclick = function () {
        zetDraaipunt(hier ? null : b.groep);
        toonPaneel();
      };
      el.pActies.appendChild(dr);

      const sl = document.createElement('button');
      sl.className = 'actie gevaar';
      sl.textContent = 'Slopen (+' + sloopOpbrengst(d) + ' regoliet)';
      sl.onclick = () => sloop(b);
      el.pActies.appendChild(sl);
    }

    function kies(b) {
      gekozen = b;
      if (b) {
        b.groep.add(keuzering);
        toonPaneel();
      } else {
        if (keuzering.parent) keuzering.parent.remove(keuzering);
        el.paneel.hidden = true;
      }
    }

    // ------------------------------------------------------------- bouwen

    Bouw.volgorde.forEach(function (type) {
      const d = DEFS[type];
      const knop = document.createElement('button');
      knop.className = 'bouwknop';
      knop.dataset.type = type;
      knop.title = d.omschrijving;
      knop.innerHTML = '<span class="glyph">' + d.glyph + '</span><span>' + d.naam +
        '<br><span class="prijs">' + kostTekst(d) + '</span></span>';
      knop.onclick = () => zetBouwModus(bouwModus === type ? null : type);
      el.knoppen.appendChild(knop);
    });

    function zetBouwModus(type) {
      const mist = type && tekortAan(DEFS[type]);
      if (mist) {
        melding('Te weinig ' + mist + ' voor een ' + DEFS[type].naam.toLowerCase(), 'slecht');
        return;
      }
      bouwModus = type;
      zweefSlot = null;
      for (const knop of el.knoppen.children) knop.classList.toggle('actief', knop.dataset.type === type);
      el.canvas.classList.toggle('bouwen', !!type);
      el.hint.textContent = type
        ? 'klik een blauwe ring op het platform om de ' + DEFS[type].naam.toLowerCase() + ' te plaatsen (Esc annuleert)'
        : 'klik een module en daarna een vrije plek op het platform';
      SLOTS.forEach((s) => { s.groep.visible = !!type && !s.bezet; });
      if (type) kies(null);
    }

    window.addEventListener('keydown', function (e) {
      if (MB.inVeld(e)) return;                 // Esc sluit dan alleen het naamveld
      if (S.intro) return;                      // tijdens het aanmeren stuurt de intro
      if (e.key === 'Escape') {
        zetBouwModus(null);
        kies(null);
        if (controls.ankerObject) zetDraaipunt(null);
      }
    });

    // --------------------------------------------------------- aanwijzen

    const straal = new THREE.Raycaster();
    const pA = new THREE.Vector3(), pB = new THREE.Vector3();

    /* Staat dit ding op de zichtbare helft van de planetoïde? De normaal op een
       bol is de positie zelf, dus dat is één inproduct — goedkoper dan de hele
       bol doorrekenen om te zien of hij ervoor zit. */
    function inZicht(obj) {
      obj.getWorldPosition(pA);
      pB.copy(wereld.camera.position).sub(pA);
      return pA.normalize().dot(pB.normalize()) > -0.02;
    }

    function raakBouwwerk(punt) {
      straal.setFromCamera(punt, wereld.camera);
      const groepen = bouwwerken.filter((b) => inZicht(b.groep)).map((b) => b.groep);
      const hits = straal.intersectObjects(groepen, true);
      for (let i = 0; i < hits.length; i++) {
        let o = hits[i].object;
        while (o) {
          if (o.userData && o.userData.bouwwerk) return o.userData.bouwwerk;
          o = o.parent;
        }
      }
      return null;
    }

    function isDeelVan(obj, ouder) {
      for (let o = obj; o; o = o.parent) if (o === ouder) return true;
      return false;
    }

    /* Waar draaien we omheen als het wieltje hier wordt ingedrukt? Een module,
       het schip eraan, een robot, of anders het punt op het gesteente
       onder de cursor. */
    function raakDraaipunt(punt) {
      straal.setFromCamera(punt, wereld.camera);
      const doelen = bouwwerken.filter((b) => inZicht(b.groep)).map((b) => b.groep);
      const rots = kern.getObjectByName('kern');
      if (rots) doelen.push(rots);
      volk.leden.forEach((k) => { if (inZicht(k.groep)) doelen.push(k.groep); });

      const hits = straal.intersectObjects(doelen, true);
      if (!hits.length) return null;

      for (let o = hits[0].object; o; o = o.parent) {
        if (o.userData && o.userData.robot) return o;
        const b = o.userData && o.userData.bouwwerk;
        if (b) {
          const s = b.refs.schip;
          return s && s.visible && isDeelVan(hits[0].object, s) ? s : b.groep;
        }
      }

      const lokaal = kern.worldToLocal(hits[0].point.clone());
      losDraaipunt.position.copy(lokaal);
      losDraaipunt.quaternion.copy(Rock.orientatie(lokaal.clone().normalize()));
      return losDraaipunt;
    }

    function raakSlot(punt) {
      straal.setFromCamera(punt, wereld.camera);
      const vlakken = SLOTS.filter((s) => !s.bezet && inZicht(s.groep)).map((s) => s.raakvlak);
      const hits = straal.intersectObjects(vlakken, false);
      return hits.length ? hits[0].object.userData.slot : null;
    }

    controls.opKlik = function (punt) {
      if (bouwModus) {
        const slot = raakSlot(punt);
        if (!slot) return;
        const d = DEFS[bouwModus];
        const mist = tekortAan(d);
        if (mist) { melding('Te weinig ' + mist, 'slecht'); return; }
        betaal(d);
        const b = zetNeer(bouwModus, slot);
        melding(d.naam + ' gebouwd', 'goed');
        zetBouwModus(null);
        kies(b);
        return;
      }
      kies(raakBouwwerk(punt));
    };

    controls.opDraaipunt = function (punt) {
      const doel = raakDraaipunt(punt);
      zetDraaipunt(doel);
      if (doel) {
        const b = doel.userData.bouwwerk;
        melding('Draaipunt: ' + (b ? b.def.naam :
          doel.userData.robot ? 'een robot' :
          doel === losDraaipunt ? 'plek op de planetoïde' : 'het schip'));
      } else {
        melding('Draaipunt terug naar het midden van de planetoïde');
      }
    };

    controls.opZweef = function (punt) {
      if (bouwModus) {
        const slot = raakSlot(punt);
        if (slot !== zweefSlot) {
          if (zweefSlot) zweefSlot.groep.scale.setScalar(1);
          zweefSlot = slot;
          if (slot) slot.groep.scale.setScalar(1.12);
        }
        return;
      }
      el.canvas.classList.toggle('aanwijzen', !!raakBouwwerk(punt));
    };

    // ------------------------------------------------------- schakelaars

    const knopVolgen = MB.$('#btn-follow');
    const knopDraai = MB.$('#btn-rotate');
    knopVolgen.onclick = function () {
      S.volgen = !S.volgen;
      knopVolgen.classList.toggle('on', S.volgen);
    };
    knopDraai.onclick = function () {
      S.draait = !S.draait;
      knopDraai.classList.toggle('on', S.draait);
    };

    const knopRand = MB.$('#btn-edge');
    knopRand.onclick = function () {
      controls.randScroll = !controls.randScroll;
      knopRand.classList.toggle('on', controls.randScroll);
    };

    // -------------------------------------------------------------- naam

    const STANDAARDNAAM = 'Station Alfa';
    const elNaam = MB.$('#v-name');

    function zetNaam(naam) {
      S.naam = String(naam == null ? '' : naam).trim().slice(0, 28) || STANDAARDNAAM;
      if (elNaam.value !== S.naam) elNaam.value = S.naam;
      document.title = S.naam + ' — Ruimtestation';
    }

    elNaam.onchange = () => zetNaam(elNaam.value);
    elNaam.onblur = () => zetNaam(elNaam.value);
    elNaam.onkeydown = function (e) {
      if (e.key === 'Enter' || e.key === 'Escape') elNaam.blur();
    };
    zetNaam(elNaam.value);

    // ------------------------------------------------------- opslaan/laden

    const SAVE_VERSIE = 6;

    function maakSave() {
      return {
        spel: 'ruimtestation',
        versie: SAVE_VERSIE,
        bewaard: new Date().toISOString(),
        naam: S.naam,
        tijd: S.tijd,
        gelost: S.gelost,
        draaiing: kern.rotation.y,
        regoliet: S.regoliet,
        stroom: S.stroom,
        zuurstof: S.zuurstof,
        water: S.water,
        brandstof: S.brandstof,
        robots: S.robots,
        bouwKlok: S.bouwKlok,
        uitvalKlok: S.uitvalKlok,
        draait: S.draait,
        volgen: S.volgen,
        randScroll: controls.randScroll,
        bouwwerken: bouwwerken.map(function (b) {
          return {
            type: b.type,
            plek: b.slot.index,
            vertrekt: b.vertrekt,
            vertrekT: b.vertrekT,
            nadert: b.nadert,
            naderT: b.naderT,
            lading: b.lading,
            wacht: b.wacht
          };
        })
      };
    }

    // Robotposities en cameraplek slaan we niet op; die zoeken hun weg wel weer.
    // Kweekkassen uit saves van vóór v6 vallen eruit: robots eten niet.
    function laadSave(d) {
      // een bewaard spel begint niet opnieuw met aanmeren; het ruim van de
      // save telt, dus hier nog geen startvracht uitdelen
      if (MB.intro && MB.intro.actief) {
        S.gelost = true;
        MB.intro.klaar();
      }
      zetBouwModus(null);
      kies(null);
      if (controls.ankerObject) zetDraaipunt(null);

      // alles weghalen, buiten de spelregels om
      for (let i = bouwwerken.length - 1; i >= 0; i--) kern.remove(bouwwerken[i].groep);
      bouwwerken.length = 0;
      SLOTS.forEach(function (s) { s.bezet = null; });

      const lijst = Array.isArray(d.bouwwerken) ? d.bouwwerken : [];
      lijst.forEach(function (o) {
        const slot = SLOTS[o.plek];
        if (!DEFS[o.type] || !slot || slot.bezet) return;     // rommel overslaan
        const b = zetNeer(o.type, slot);
        b.vertrekt = !!o.vertrekt;
        b.vertrekT = Math.max(0, cijfer(o.vertrekT, 0));
        b.nadert = !!o.nadert;
        b.naderT = Math.max(0, cijfer(o.naderT, 0));
        b.lading = Math.max(0, Math.round(cijfer(o.lading, 0)));
        b.wacht = Math.max(0, cijfer(o.wacht, 0));
        if (b.refs.schip) b.refs.schip.visible = b.wacht <= 0;
        if (b.refs.vlam) b.refs.vlam.visible = b.vertrekt || b.nadert;
      });

      S.tijd = Math.max(0, cijfer(d.tijd, 0));
      // saves van vóór v5 hadden krediet; dat telt als evenveel regoliet
      S.regoliet = Math.max(0, cijfer(d.regoliet, cijfer(d.krediet, 80)));
      S.stroom = Math.max(0, cijfer(d.stroom, 200));
      S.zuurstof = Math.max(0, cijfer(d.zuurstof, 30));
      S.water = Math.max(0, cijfer(d.water, 30));
      S.brandstof = Math.max(0, cijfer(d.brandstof, 0));
      // saves van vóór v6 hadden bemanning; elk bemanningslid wordt een robot
      S.robots = Math.max(1, Math.round(cijfer(d.robots, cijfer(d.bemanning, 3))));
      S.gelost = d.gelost !== false;            // saves van vóór v4 zijn gelost
      zetKisten();
      S.bouwKlok = Math.max(0, cijfer(d.bouwKlok, 0));
      S.uitvalKlok = Math.max(0, cijfer(d.uitvalKlok, 0));

      kern.rotation.y = cijfer(d.draaiing, 0);
      S.draait = d.draait !== false;
      S.volgen = d.volgen !== false;
      controls.randScroll = d.randScroll !== false;
      knopDraai.classList.toggle('on', S.draait);
      knopVolgen.classList.toggle('on', S.volgen);
      knopRand.classList.toggle('on', controls.randScroll);

      zetNaam(d.naam);
      controls.kijkNaar(Rock.BASE_DIR.clone().applyQuaternion(kern.quaternion));
      S.tot = totalen();                        // meters meteen kloppend tonen
      verversHud();
      melding('“' + S.naam + '” geladen', 'goed');
    }

    function cijfer(v, terug) {
      return typeof v === 'number' && isFinite(v) ? v : terug;
    }

    function bestandsnaam() {
      const kaal = S.naam.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      return (kaal || 'ruimtestation') + '.ruimtestation.json';
    }

    MB.$('#btn-save').onclick = function () {
      const blob = new Blob([JSON.stringify(maakSave(), null, 1)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = bestandsnaam();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      melding('Opgeslagen als ' + a.download, 'goed');
    };

    function leesBestand(file) {
      const lezer = new FileReader();
      lezer.onload = function () {
        let d = null;
        try { d = JSON.parse(lezer.result); } catch (e) { d = null; }
        if (!d || d.spel !== 'ruimtestation') {
          melding('Dat lijkt geen bewaard ruimtestation', 'slecht');
          return;
        }
        laadSave(d);
      };
      lezer.onerror = () => melding('Het bestand kon niet gelezen worden', 'slecht');
      lezer.readAsText(file);
    }

    const kiezer = MB.$('#file-load');
    MB.$('#btn-load').onclick = () => kiezer.click();
    kiezer.onchange = function () {
      const f = kiezer.files && kiezer.files[0];
      if (f) leesBestand(f);
      kiezer.value = '';                      // hetzelfde bestand mag opnieuw
    };

    // een bewaard spel op het venster slepen werkt ook
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) {
      e.preventDefault();
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) leesBestand(f);
    });

    const hulp = MB.$('#help');
    MB.$('#btn-help').onclick = () => { hulp.hidden = false; };
    MB.$('#help-close').onclick = () => { hulp.hidden = true; };
    MB.$('#p-close').onclick = () => kies(null);

    // ------------------------------------------------------------- lus

    controls.kijkNaar(Rock.BASE_DIR);
    controls.doelAfstand = 52;
    controls.afstand = 105;

    verversHud();

    return {
      staat: S,                 // debug-ingangen, handig vanuit de console
      bouwwerken: bouwwerken,
      stuurWeg: stuurWeg,
      maakSave: maakSave,
      laadSave: laadSave,
      dok: dok,                 // de intro laat hier het eerste schip op zakken
      landingKlaar: landingKlaar,

      update: function (dt) {
        S.tijd += dt;

        /* Tijdens het aanmeren staat de huishouding stil: de planetoïde draait
           niet, er wordt niets verbruikt en de robots staan nog in het ruim. Alleen
           de lampjes en klemmen bewegen mee — de intro stuurt het schip zelf. */
        if (S.intro) {
          animeer(dt);
          return;
        }

        if (S.draait) {
          const d = DRAAI * dt;
          kern.rotation.y += d;
          if (S.volgen) controls.verschuifTheta(d);
        }

        simuleer(dt);
        animeer(dt);

        volk.zetAantal(S.robots);
        // een stilgevallen robot kan geen draaipunt meer zijn
        if (controls.ankerObject && controls.ankerObject.userData.robot &&
          !controls.ankerObject.parent) zetDraaipunt(null);
        volk.update(dt);

        hudKlok += dt;
        if (hudKlok > 0.12) { hudKlok = 0; verversHud(); }

        if (toastKlok > 0) {
          toastKlok -= dt;
          if (toastKlok <= 0) el.toast.className = '';
        }
      }
    };
  };
})(window.MB);

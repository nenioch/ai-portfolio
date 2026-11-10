/* Het spel: bouwplekken over de hele planeet, de aanvoerketen van grondstof
   naar eindproduct, de huishouding van stroom en voedsel, en alles wat de
   speler kan aanklikken.

   Anders dan maanbasis (één basis, één lanceerplatform) speelt dit zich af
   over een hele wereld: overal op het land mag je bouwen, ijzer- en
   oliebronnen zitten op vaste, herkenbare plekken, en een exporthaven aan de
   kust zet de hele keten om in krediet. Voedsel, stroom en de grondstoffen
   zijn wél steeds ÉÉN gedeelde voorraad voor de hele kolonie — zie het als
   één logistiek netwerk dat de hele planeet bestrijkt, niet een aparte
   boekhouding per nederzetting. */

(function (BNW) {
  'use strict';
  if (!window.THREE) return;

  const Planeet = BNW.Planeet;
  const Bouw = BNW.Buildings;
  const DEFS = Bouw.DEFS;
  const PRIJZEN = Bouw.PRIJZEN;
  const SLOTS = Planeet.SLOTS;

  const DRAAI = 0.035;         // radialen per seconde: een etmaal duurt ~180 s
  const ETEN = 0.16;           // voedsel per kolonist per seconde
  const CARGO_MAX = 80;        // eenheden lading per scheepsrit
  const Y_AS = new THREE.Vector3(0, 1, 0);
  const winst = (kolonisten) => 1 + kolonisten * 0.01;   // hogere bevolking = iets betere prijzen

  const START = ['habitat', 'solar', 'farm'];
  const START_KREDIET = 650;
  const START_ANKER = new THREE.Vector3(0.32, 0.55, 0.77).normalize();

  BNW.maakSpel = function (wereld, controls) {
    const planeet = wereld.planeet;
    const bouwwerken = [];

    const S = {
      naam: 'Nieuw Eden',
      krediet: START_KREDIET,
      stroom: 90,
      voedsel: 25,
      kolonisten: 3,
      ijzererts: 0, ruweOlie: 0, staal: 0, kunststof: 0, elektronica: 0,
      groeiKlok: 0, hongerKlok: 0,
      draait: true, volgen: true,
      tijd: 0, tot: null
    };

    let bouwModus = null;
    let gekozen = null;
    let zweefSlot = null;
    let hudKlok = 0;

    // ------------------------------------------------------------ plekken

    const markerMat = new THREE.MeshBasicMaterial({ color: 0x62d8ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const markerVlakMat = new THREE.MeshBasicMaterial({ color: 0x62d8ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    const kustMat = new THREE.MeshBasicMaterial({ color: 0x6fe0c0, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const kustVlakMat = new THREE.MeshBasicMaterial({ color: 0x6fe0c0, transparent: true, opacity: 0.12, side: THREE.DoubleSide });

    SLOTS.forEach(function (slot) {
      const g = new THREE.Group();
      g.position.copy(Planeet.puntOpOppervlak(slot.dir)).addScaledVector(slot.dir, 0.02);
      g.quaternion.copy(Planeet.orientatie(slot.dir));

      const isKust = slot.kust;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.05, 6, 24), isKust ? kustMat : markerMat);
      ring.rotation.x = -Math.PI / 2;
      const vlak = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), isKust ? kustVlakMat : markerVlakMat);
      vlak.rotation.x = -Math.PI / 2;
      g.add(ring, vlak);
      g.visible = false;

      planeet.add(g);
      slot.groep = g;
      slot.raakvlak = vlak;
      vlak.userData.slot = slot;
    });

    const keuzering = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.05, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xff8b45 })
    );
    keuzering.rotation.x = -Math.PI / 2;
    keuzering.position.y = 0.08;

    // ---------------------------------------------------------- draaipunt

    const losDraaipunt = new THREE.Object3D();
    planeet.add(losDraaipunt);

    const draaimerk = new THREE.Group();
    (function () {
      const mat = new THREE.MeshBasicMaterial({ color: 0xff8b45, transparent: true, opacity: 0.7, depthTest: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 6, 24), mat);
      ring.rotation.x = -Math.PI / 2;
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), mat);
      pin.position.y = 0.5;
      draaimerk.add(ring, pin);
      draaimerk.traverse(function (o) { o.renderOrder = 5; o.raycast = function () {}; });
    })();

    function zetDraaipunt(obj) {
      controls.zetAnker(obj);
      if (draaimerk.parent) draaimerk.parent.remove(draaimerk);
      if (obj) {
        draaimerk.scale.setScalar(obj.userData.kolonist ? 0.4 : 0.85);
        obj.add(draaimerk);
      }
    }

    // -------------------------------------------------------- bouwwerken

    function vindDichtsteVrijeSlot(anker, soort, uitgesloten) {
      let beste = null, besteHoek = Infinity;
      SLOTS.forEach(function (s) {
        if (s.bezet || uitgesloten.indexOf(s) >= 0) return;
        if (soort && s.soort !== soort) return;
        const h = anker.angleTo(s.dir);
        if (h < besteHoek) { besteHoek = h; beste = s; }
      });
      return beste;
    }

    function zetNeer(type, slot) {
      const g = Bouw.maak(type);
      g.position.copy(Planeet.puntOpOppervlak(slot.dir));
      g.quaternion.copy(Planeet.orientatie(slot.dir));
      planeet.add(g);

      const b = {
        type: type, def: DEFS[type], slot: slot, groep: g,
        refs: g.userData.refs || {}, dirLokaal: slot.dir.clone(),
        groei: 0.1,
        vertrekt: false, vertrektT: 0, ladingWaarde: 0, beloond: false, herbouw: 0
      };
      g.userData.bouwwerk = b;
      slot.bezet = b;
      bouwwerken.push(b);

      if (type === 'habitat') {
        b.volk = BNW.Kolonisten.maakVolk(planeet, slot.dir, bouwwerken.length);
      }

      verversLoopdoelen();
      return b;
    }

    function sloop(b) {
      if (b.type === 'habitat' && telHabitatCapaciteit() - b.def.woonruimte < S.kolonisten) {
        melding('Daar wonen nog kolonisten — bouw eerst meer woonruimte.', 'slecht');
        return;
      }
      if (controls.ankerObject && isDeelVan(controls.ankerObject, b.groep)) zetDraaipunt(null);
      if (b.volk) b.volk.verwijder();
      planeet.remove(b.groep);
      b.slot.bezet = null;
      bouwwerken.splice(bouwwerken.indexOf(b), 1);
      verversLoopdoelen();
      S.krediet += Math.round(b.def.kosten * 0.5);
      if (gekozen === b) kies(null);
      melding(b.def.naam + ' gesloopt — ' + Math.round(b.def.kosten * 0.5) + ' krediet terug');
    }

    function telHabitatCapaciteit() {
      let n = 0;
      bouwwerken.forEach((b) => { if (b.type === 'habitat') n += b.def.woonruimte; });
      return n;
    }

    (function bouwStart() {
      // START bevat alleen gewoon-land-gebouwen; vandaar steevast 'land'
      const uitgesloten = [];
      START.forEach(function (type) {
        const slot = vindDichtsteVrijeSlot(START_ANKER, 'land', uitgesloten);
        if (!slot) return;
        uitgesloten.push(slot);
        zetNeer(type, slot);
      });
    })();

    // ---------------------------------------------------- looproutes

    function verversLoopdoelen() {
      const HOEK = 0.30;   // straal in radialen waarbinnen een woonwijk "haar buurt" ziet
      bouwwerken.forEach(function (b) {
        if (!b.volk) return;
        const dichtbij = bouwwerken.filter((a) => b.dirLokaal.angleTo(a.dirLokaal) < HOEK).map((a) => a.dirLokaal);
        b.volk.zetDoelenVanWereldrichtingen(dichtbij);
      });
    }

    function verversBevolking() {
      const habitats = bouwwerken.filter((b) => b.type === 'habitat');
      if (!habitats.length) return;
      const totaal = Math.min(S.kolonisten, habitats.length * BNW.Kolonisten.PER_WIJK, 24);
      const aantallen = habitats.map(() => 0);
      let over = totaal, ronde = 0;
      while (over > 0 && ronde < BNW.Kolonisten.PER_WIJK) {
        for (let i = 0; i < habitats.length && over > 0; i++) {
          if (aantallen[i] === ronde) { aantallen[i]++; over--; }
        }
        ronde++;
      }
      habitats.forEach((b, i) => b.volk.zetAantal(aantallen[i]));
    }

    // ------------------------------------------------------------ rekenen

    function totalen() {
      const t = {
        opwek: 0, vraag: 0, accu: 90,
        voedsel: 0, voedselCap: 40, woonruimte: 0,
        ijzerWinning: 0, ijzerCap: 0, olieWinning: 0, olieCap: 0,
        ijzerVraag: 0, staalProductiePot: 0, staalCap: 0,
        olieVraag: 0, kunststofProductiePot: 0, kunststofCap: 0,
        staalVraag: 0, kunststofVraag: 0, elektronicaProductiePot: 0, elektronicaCap: 0
      };
      for (let i = 0; i < bouwwerken.length; i++) {
        const b = bouwwerken[i], d = b.def;
        if (d.opwekking) t.opwek += d.opwekking * b.zon;
        if (d.stroom > 0) t.opwek += d.stroom;
        if (d.stroom < 0) t.vraag += -d.stroom;
        if (d.accu) t.accu += d.accu;
        if (d.woonruimte) t.woonruimte += d.woonruimte;
        if (d.voedsel) t.voedsel += d.voedsel;
        if (d.voedselOpslag) t.voedselCap += d.voedselOpslag;
        if (d.ijzerWinning) t.ijzerWinning += d.ijzerWinning;
        if (d.ijzerOpslag) t.ijzerCap += d.ijzerOpslag;
        if (d.olieWinning) t.olieWinning += d.olieWinning;
        if (d.olieOpslag) t.olieCap += d.olieOpslag;
        if (d.ijzerVerbruik) { t.ijzerVraag += d.ijzerVerbruik; t.staalProductiePot += d.staalProductie; }
        if (d.staalOpslag) t.staalCap += d.staalOpslag;
        if (d.olieVerbruik) { t.olieVraag += d.olieVerbruik; t.kunststofProductiePot += d.kunststofProductie; }
        if (d.kunststofOpslag) t.kunststofCap += d.kunststofOpslag;
        if (d.staalVerbruik) {
          t.staalVraag += d.staalVerbruik; t.kunststofVraag += d.kunststofVerbruik;
          t.elektronicaProductiePot += d.elektronicaProductie;
        }
        if (d.elektronicaOpslag) t.elektronicaCap += d.elektronicaOpslag;
      }
      return t;
    }

    function simuleer(dt) {
      // per gebouw zijn eigen zonligging — de planeet draait, dus dat verschuift
      const hulpV = new THREE.Vector3();
      bouwwerken.forEach(function (b) {
        hulpV.copy(b.dirLokaal).applyAxisAngle(Y_AS, planeet.rotation.y);
        b.zon = BNW.clamp(hulpV.dot(BNW.World.ZON), 0, 1);
      });

      const t = totalen();
      S.tot = t;

      const beschikbaar = t.opwek * dt + S.stroom;
      const gevraagd = t.vraag * dt;
      S.tekort = gevraagd > 1e-6 ? BNW.clamp(beschikbaar / gevraagd, 0, 1) : 1;
      S.stroom = BNW.clamp(S.stroom + (t.opwek - t.vraag * S.tekort) * dt, 0, t.accu);

      S.voedsel = BNW.clamp(S.voedsel + (t.voedsel * S.tekort - ETEN * S.kolonisten) * dt, 0, t.voedselCap);

      // winning
      S.ijzererts = BNW.clamp(S.ijzererts + t.ijzerWinning * S.tekort * dt, 0, t.ijzerCap);
      S.ruweOlie = BNW.clamp(S.ruweOlie + t.olieWinning * S.tekort * dt, 0, t.olieCap);

      // staalfabrieken: begrensd door wat er aan erts ligt. De factor wordt
      // ook bewaard (S.staalFactor) zodat het paneel exact laat zien wat er
      // nú per fabriek gebeurt, in plaats van dit ergens anders te schatten.
      const ijzerFactor = t.ijzerVraag > 0 ? BNW.clamp(S.ijzererts / (t.ijzerVraag * dt), 0, 1) : 0;
      S.staalFactor = S.tekort * ijzerFactor;
      S.ijzererts = BNW.clamp(S.ijzererts - t.ijzerVraag * S.staalFactor * dt, 0, t.ijzerCap);
      S.staal = BNW.clamp(S.staal + t.staalProductiePot * S.staalFactor * dt, 0, t.staalCap);

      // raffinaderijen: analoog met olie -> kunststof
      const olieFactor = t.olieVraag > 0 ? BNW.clamp(S.ruweOlie / (t.olieVraag * dt), 0, 1) : 0;
      S.kunststofFactor = S.tekort * olieFactor;
      S.ruweOlie = BNW.clamp(S.ruweOlie - t.olieVraag * S.kunststofFactor * dt, 0, t.olieCap);
      S.kunststof = BNW.clamp(S.kunststof + t.kunststofProductiePot * S.kunststofFactor * dt, 0, t.kunststofCap);

      // elektronicafabrieken: hebben zowel staal als kunststof nodig
      const staalBeschikbaar = t.staalVraag > 0 ? BNW.clamp(S.staal / (t.staalVraag * dt), 0, 1) : 0;
      const kunststofBeschikbaar = t.kunststofVraag > 0 ? BNW.clamp(S.kunststof / (t.kunststofVraag * dt), 0, 1) : 0;
      S.elektronicaFactor = S.tekort * Math.min(staalBeschikbaar, kunststofBeschikbaar);
      S.staal = BNW.clamp(S.staal - t.staalVraag * S.elektronicaFactor * dt, 0, t.staalCap);
      S.kunststof = BNW.clamp(S.kunststof - t.kunststofVraag * S.elektronicaFactor * dt, 0, t.kunststofCap);
      S.elektronica = BNW.clamp(S.elektronica + t.elektronicaProductiePot * S.elektronicaFactor * dt, 0, t.elektronicaCap);

      // bevolking
      if (S.voedsel > t.voedselCap * 0.55 && S.kolonisten < t.woonruimte) {
        S.groeiKlok += dt;
        if (S.groeiKlok > 40) {
          S.groeiKlok = 0;
          S.kolonisten++;
          verversBevolking();
          melding('Er is een kolonist bijgekomen — nu ' + S.kolonisten, 'goed');
        }
      } else {
        S.groeiKlok = Math.max(0, S.groeiKlok - dt * 0.5);
      }
      if (S.voedsel <= 0 && S.kolonisten > 1) {
        S.hongerKlok += dt;
        if (S.hongerKlok > 25) {
          S.hongerKlok = 0;
          S.kolonisten--;
          verversBevolking();
          melding('Voedsel op: een kolonist is vertrokken', 'slecht');
        }
      } else {
        S.hongerKlok = 0;
      }
    }

    // ------------------------------------------------------ animatie

    const UP = new THREE.Vector3(0, 1, 0);
    const hulpQ = new THREE.Quaternion();
    const hulpV2 = new THREE.Vector3();
    const doelQ = new THREE.Quaternion();

    function animeer(dt) {
      Bouw.MAT.lamp.emissiveIntensity = 1.0 + Math.sin(S.tijd * 3.2) * 0.45;

      for (let i = 0; i < bouwwerken.length; i++) {
        const b = bouwwerken[i];

        if (b.type === 'solar' && b.refs.arm) {
          b.groep.getWorldQuaternion(hulpQ);
          hulpV2.copy(BNW.World.ZON).applyQuaternion(hulpQ.invert());
          if (hulpV2.y > 0.08) {
            doelQ.setFromUnitVectors(UP, hulpV2);
            b.refs.arm.quaternion.slerp(doelQ, Math.min(1, dt * 1.5));
          }
        }

        if (b.type === 'farm' && b.refs.rijen) {
          b.groei += (S.tekort * dt) / 16;
          if (b.groei >= 1) b.groei = 0.06;
          const h = 0.12 + b.groei * 0.95;
          for (let k = 0; k < b.refs.rijen.length; k++) b.refs.rijen[k].scale.y = h;
        }

        if (b.type === 'ironmine' && b.refs.wiel) {
          b.refs.wiel.rotation.z += dt * 2.4 * S.tekort;
        }

        if (b.type === 'oilwell' && b.refs.wip) {
          const s = Math.sin(S.tijd * 1.6) * 0.16 * S.tekort;
          b.refs.wip.rotation.z = s;
          if (b.refs.stang) b.refs.stang.position.y = 0.95 - s * 0.3;
        }

        if (b.type === 'harbor') animeerSchip(b, dt);
      }
    }

    function animeerSchip(b, dt) {
      const schip = b.refs.schip;
      if (!schip) return;
      const UIT = 4.5, TERUG = 4.5;
      if (b.vertrekt) {
        b.vertrektT += dt;
        const t = b.vertrektT;
        if (t < UIT) {
          schip.position.z = 2.6 + (t / UIT) * 8;
          if (!b.beloond && t > UIT * 0.5) {
            b.beloond = true;
            S.krediet += b.ladingWaarde;
            melding('Lading verkocht — ' + Math.round(b.ladingWaarde) + ' krediet', 'goed');
          }
        } else if (t < UIT + TERUG) {
          const tt = (t - UIT) / TERUG;
          schip.position.z = 2.6 + 8 - tt * 8;
        } else {
          b.vertrekt = false;
          b.herbouw = 3;
          schip.position.z = 2.6;
        }
      } else if (b.herbouw > 0) {
        b.herbouw -= dt;
        if (b.herbouw <= 0) { b.herbouw = 0; melding('Een schip ligt klaar om te laden bij ' + b.def.naam.toLowerCase()); }
      }
    }

    function pakLading() {
      const volgorde = ['elektronica', 'staal', 'kunststof', 'ijzererts', 'ruweOlie'];
      let ruimte = CARGO_MAX, waarde = 0;
      const meegenomen = {};
      volgorde.forEach(function (goed) {
        const voorraad = S[goed] || 0;
        const n = Math.min(ruimte, voorraad);
        if (n > 0) { meegenomen[goed] = n; waarde += n * PRIJZEN[goed] * winst(S.kolonisten); ruimte -= n; }
      });
      return { meegenomen: meegenomen, waarde: waarde };
    }

    function verzendLading(b) {
      if (b.vertrekt || b.herbouw > 0) return;
      const bundel = pakLading();
      if (bundel.waarde <= 0) { melding('Er is niets te verschepen', 'slecht'); return; }
      for (const goed in bundel.meegenomen) S[goed] -= bundel.meegenomen[goed];
      b.vertrekt = true;
      b.vertrektT = 0;
      b.ladingWaarde = bundel.waarde;
      b.beloond = false;
      melding('Schip vertrekt — lading ter waarde van ' + Math.round(bundel.waarde) + ' krediet');
      toonPaneel();
    }

    // ---------------------------------------------------------------- HUD

    const el = {
      krediet: BNW.$('#v-credits'), crew: BNW.$('#v-crew'),
      stroom: BNW.$('#v-power'), voedsel: BNW.$('#v-food'),
      bStroom: BNW.$('#bar-power'), bVoedsel: BNW.$('#bar-food'),
      rStroom: BNW.$('#r-power'), rVoedsel: BNW.$('#r-food'),
      grLijst: BNW.$('#gr-lijst'),
      paneel: BNW.$('#panel'), pNaam: BNW.$('#p-name'), pDesc: BNW.$('#p-desc'),
      pStats: BNW.$('#p-stats'), pActies: BNW.$('#p-actions'),
      knoppen: BNW.$('#build-buttons'), hint: BNW.$('#build-hint'),
      toast: BNW.$('#toast'), canvas: BNW.$('#scene')
    };

    function tarief(node, waarde) {
      node.textContent = BNW.tekens(waarde) + '/s';
      node.className = 'rate' + (waarde < -0.01 ? ' min' : waarde > 0.01 ? ' plus' : '');
    }

    const GR_INFO = {
      ijzererts: { naam: 'IJzererts', ico: '⛏' }, ruweOlie: { naam: 'Ruwe olie', ico: '⛽' },
      staal: { naam: 'Staal', ico: '▦' }, kunststof: { naam: 'Kunststof', ico: '⬢' },
      elektronica: { naam: 'Elektronica', ico: '◆' }
    };

    function verversHud() {
      const t = S.tot || totalen();
      el.krediet.textContent = Math.round(S.krediet);
      el.crew.textContent = S.kolonisten + '/' + t.woonruimte;

      el.stroom.textContent = Math.round(S.stroom) + '/' + Math.round(t.accu);
      el.bStroom.style.width = (S.stroom / t.accu) * 100 + '%';
      tarief(el.rStroom, t.opwek - t.vraag * S.tekort);

      el.voedsel.textContent = Math.round(S.voedsel) + '/' + Math.round(t.voedselCap);
      el.bVoedsel.style.width = (S.voedsel / Math.max(1, t.voedselCap)) * 100 + '%';
      tarief(el.rVoedsel, t.voedsel * S.tekort - ETEN * S.kolonisten);

      const caps = { ijzererts: t.ijzerCap, ruweOlie: t.olieCap, staal: t.staalCap, kunststof: t.kunststofCap, elektronica: t.elektronicaCap };
      let rijen = '';
      for (const goed in GR_INFO) {
        if (caps[goed] <= 0) continue;
        const info = GR_INFO[goed];
        rijen += '<li><span class="ico">' + info.ico + '</span><span class="naam">' + info.naam + '</span>' +
          '<span class="waarde">' + Math.round(S[goed]) + '/' + Math.round(caps[goed]) + '</span></li>';
      }
      el.grLijst.innerHTML = rijen || '<li class="dim">nog geen grondstoffen gewonnen</li>';

      for (const knop of el.knoppen.children) {
        const d = DEFS[knop.dataset.type];
        knop.disabled = S.krediet < d.kosten || !bestaatVrijeSlot(d);
      }
      if (gekozen) toonPaneel();
    }

    function bestaatVrijeSlot(d) {
      for (let i = 0; i < SLOTS.length; i++) {
        const s = SLOTS[i];
        if (s.bezet) continue;
        if (d.alleenOp) { if (s.soort === d.alleenOp) return true; continue; }
        if (s.soort !== 'land') continue;
        if (d.alleenKust && !s.kust) continue;
        return true;
      }
      return false;
    }

    let toastKlok = 0;
    function melding(tekst, soort) {
      el.toast.textContent = tekst;
      el.toast.className = 'zien' + (soort ? ' ' + soort : '');
      toastKlok = 3.2;
    }

    // ------------------------------------------------------------- paneel

    function regel(naam, waarde, waarschuwing) {
      return '<li' + (waarschuwing ? ' class="waarschuwing"' : '') + '><span>' + naam + '</span><span>' + waarde + '</span></li>';
    }

    function toonPaneel() {
      if (!gekozen) { el.paneel.hidden = true; return; }
      const b = gekozen, d = b.def;
      el.paneel.hidden = false;
      el.pNaam.textContent = d.naam;
      el.pDesc.textContent = d.omschrijving;

      const geenStroom = S.tekort < 0.99;
      let r = '';
      if (d.stroom) r += regel('Stroom', BNW.tekens(d.stroom) + '/s');
      if (d.opwekking) r += regel('Opwekking', BNW.tekens(d.opwekking * b.zon) + '/s') +
        regel('Zon hier', b.zon > 0.05 ? Math.round(b.zon * 100) + '%' : 'nacht', b.zon <= 0.05) +
        regel('Accu', '+' + d.accu);
      if (d.woonruimte) r += regel('Woonruimte', d.woonruimte + ' kolonisten');
      if (d.voedsel) r += regel('Oogst', BNW.tekens(d.voedsel * S.tekort) + '/s', geenStroom) + regel('Groei', Math.round(b.groei * 100) + '%');
      if (d.ijzerWinning) r += regel('Winning', BNW.tekens(d.ijzerWinning * S.tekort) + '/s ijzererts', geenStroom);
      if (d.olieWinning) r += regel('Winning', BNW.tekens(d.olieWinning * S.tekort) + '/s ruwe olie', geenStroom);
      if (d.ijzerVerbruik) {
        const f = S.staalFactor || 0;
        r += regel('Verbruikt', BNW.tekens(-d.ijzerVerbruik * f) + '/s ijzererts', S.ijzererts < 1) +
          regel('Produceert', BNW.tekens(d.staalProductie * f) + '/s staal', f < 0.99);
      }
      if (d.olieVerbruik) {
        const f = S.kunststofFactor || 0;
        r += regel('Verbruikt', BNW.tekens(-d.olieVerbruik * f) + '/s ruwe olie', S.ruweOlie < 1) +
          regel('Produceert', BNW.tekens(d.kunststofProductie * f) + '/s kunststof', f < 0.99);
      }
      if (d.staalVerbruik) {
        const f = S.elektronicaFactor || 0;
        r += regel('Verbruikt', BNW.tekens(-d.staalVerbruik * f) + '/s staal, ' + BNW.tekens(-d.kunststofVerbruik * f) + '/s kunststof',
          S.staal < 1 || S.kunststof < 1) +
          regel('Produceert', BNW.tekens(d.elektronicaProductie * f) + '/s elektronica', f < 0.99);
      }
      if (b.type === 'harbor') {
        const bundel = pakLading();
        r += regel('Lading gereed', Math.round(bundel.waarde) + ' krediet', bundel.waarde <= 0);
        r += regel('Status', b.vertrekt ? 'onderweg' : b.herbouw > 0 ? 'nieuw schip over ' + Math.ceil(b.herbouw) + 's' : 'gereed');
      }
      if (geenStroom) r += regel('Stroomtekort', Math.round(S.tekort * 100) + '% vermogen', true);
      el.pStats.innerHTML = r;

      el.pActies.innerHTML = '';
      if (b.type === 'harbor') {
        const bundel = pakLading();
        const knop = document.createElement('button');
        knop.className = 'actie primair';
        knop.textContent = 'Verstuur lading (' + Math.round(bundel.waarde) + ' krediet)';
        knop.disabled = b.vertrekt || b.herbouw > 0 || bundel.waarde <= 0;
        knop.onclick = () => verzendLading(b);
        el.pActies.appendChild(knop);
      }

      const hier = controls.ankerObject === b.groep;
      const dr = document.createElement('button');
      dr.className = 'actie';
      dr.textContent = hier ? 'Draai weer om de planeet' : 'Camera hieromheen draaien';
      dr.onclick = function () { zetDraaipunt(hier ? null : b.groep); toonPaneel(); };
      el.pActies.appendChild(dr);

      const sl = document.createElement('button');
      sl.className = 'actie gevaar';
      sl.textContent = 'Slopen (+' + Math.round(d.kosten * 0.5) + ' krediet)';
      sl.onclick = () => sloop(b);
      el.pActies.appendChild(sl);
    }

    function kies(b) {
      gekozen = b;
      if (b) { b.groep.add(keuzering); toonPaneel(); }
      else { if (keuzering.parent) keuzering.parent.remove(keuzering); el.paneel.hidden = true; }
    }

    // ------------------------------------------------------------- bouwen

    Bouw.volgorde.forEach(function (type) {
      const d = DEFS[type];
      const knop = document.createElement('button');
      knop.className = 'bouwknop';
      knop.dataset.type = type;
      knop.innerHTML = '<span class="glyph">' + d.glyph + '</span><span>' + d.naam +
        '<br><span class="prijs">' + d.kosten + ' krediet</span></span>';
      knop.onclick = () => zetBouwModus(bouwModus === type ? null : type);
      el.knoppen.appendChild(knop);
    });

    function slotVoldoetAan(s, d) {
      if (d.alleenOp) return s.soort === d.alleenOp && !s.bezet;
      if (s.soort !== 'land' || s.bezet) return false;
      if (d.alleenKust) return s.kust;
      return true;
    }

    function zetBouwModus(type) {
      if (type) {
        const d = DEFS[type];
        if (S.krediet < d.kosten) { melding('Te weinig krediet voor een ' + d.naam.toLowerCase(), 'slecht'); return; }
        if (!bestaatVrijeSlot(d)) { melding('Nergens meer plek voor: ' + geefEis(d), 'slecht'); return; }
      }
      bouwModus = type;
      zweefSlot = null;
      for (const knop of el.knoppen.children) knop.classList.toggle('actief', knop.dataset.type === type);
      el.canvas.classList.toggle('bouwen', !!type);
      el.hint.textContent = type
        ? 'klik een ring op de planeet om de ' + DEFS[type].naam.toLowerCase() + ' te plaatsen (Esc annuleert) — ' + geefEis(DEFS[type])
        : 'kies een gebouw en daarna een vrije plek op de planeet';
      SLOTS.forEach((s) => { s.groep.visible = !!type && slotVoldoetAan(s, DEFS[type]) && inZicht(s.groep); });
      if (type) kies(null);
    }

    function geefEis(d) {
      if (d.alleenOp === 'ijzer') return 'alleen op een ijzerader (bruine vlek)';
      if (d.alleenOp === 'olie') return 'alleen op een olieveld (zwarte vlek)';
      if (d.alleenKust) return 'alleen aan de kust';
      return 'op elk stuk vrij land';
    }

    window.addEventListener('keydown', function (e) {
      if (BNW.inVeld(e)) return;
      if (e.key === 'Escape') {
        zetBouwModus(null);
        kies(null);
        if (controls.ankerObject) zetDraaipunt(null);
      }
    });

    // --------------------------------------------------------- aanwijzen

    const straal = new THREE.Raycaster();
    const pA = new THREE.Vector3(), pB = new THREE.Vector3();

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
        while (o) { if (o.userData && o.userData.bouwwerk) return o.userData.bouwwerk; o = o.parent; }
      }
      return null;
    }

    function isDeelVan(obj, ouder) {
      for (let o = obj; o; o = o.parent) if (o === ouder) return true;
      return false;
    }

    function alleKolonisten() {
      let lijst = [];
      bouwwerken.forEach((b) => { if (b.volk) lijst = lijst.concat(b.volk.leden); });
      return lijst;
    }

    function raakDraaipunt(punt) {
      straal.setFromCamera(punt, wereld.camera);
      const doelen = bouwwerken.filter((b) => inZicht(b.groep)).map((b) => b.groep);
      const opp = planeet.getObjectByName('planeet-oppervlak');
      if (opp) doelen.push(opp);
      alleKolonisten().forEach((k) => { if (inZicht(k.groep)) doelen.push(k.groep); });

      const hits = straal.intersectObjects(doelen, true);
      if (!hits.length) return null;

      for (let o = hits[0].object; o; o = o.parent) {
        if (o.userData && o.userData.kolonist) return o;
        const b = o.userData && o.userData.bouwwerk;
        if (b) {
          const schip = b.refs.schip;
          return schip && isDeelVan(hits[0].object, schip) ? schip : b.groep;
        }
      }

      const lokaal = planeet.worldToLocal(hits[0].point.clone());
      losDraaipunt.position.copy(lokaal);
      losDraaipunt.quaternion.copy(Planeet.orientatie(lokaal.clone().normalize()));
      return losDraaipunt;
    }

    function raakSlot(punt) {
      if (!bouwModus) return null;
      straal.setFromCamera(punt, wereld.camera);
      const d = DEFS[bouwModus];
      const vlakken = SLOTS.filter((s) => slotVoldoetAan(s, d) && inZicht(s.groep)).map((s) => s.raakvlak);
      const hits = straal.intersectObjects(vlakken, false);
      return hits.length ? hits[0].object.userData.slot : null;
    }

    controls.opKlik = function (punt) {
      if (bouwModus) {
        const slot = raakSlot(punt);
        if (!slot) return;
        const d = DEFS[bouwModus];
        if (S.krediet < d.kosten) { melding('Te weinig krediet', 'slecht'); return; }
        S.krediet -= d.kosten;
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
          doel.userData.kolonist ? 'een kolonist' :
          doel === losDraaipunt ? 'plek op de planeet' : 'een schip'));
      } else {
        melding('Draaipunt terug naar het midden van de planeet');
      }
    };

    controls.opZweef = function (punt) {
      if (bouwModus) {
        const slot = raakSlot(punt);
        if (slot !== zweefSlot) {
          if (zweefSlot) zweefSlot.groep.scale.setScalar(1);
          zweefSlot = slot;
          if (slot) slot.groep.scale.setScalar(1.15);
        }
        return;
      }
      el.canvas.classList.toggle('aanwijzen', !!raakBouwwerk(punt));
    };

    // ------------------------------------------------------- schakelaars

    const knopVolgen = BNW.$('#btn-follow');
    const knopDraai = BNW.$('#btn-rotate');
    knopVolgen.onclick = function () { S.volgen = !S.volgen; knopVolgen.classList.toggle('on', S.volgen); };
    knopDraai.onclick = function () { S.draait = !S.draait; knopDraai.classList.toggle('on', S.draait); };

    const knopRand = BNW.$('#btn-edge');
    knopRand.onclick = function () { controls.randScroll = !controls.randScroll; knopRand.classList.toggle('on', controls.randScroll); };

    // -------------------------------------------------------------- naam

    const STANDAARDNAAM = 'Nieuw Eden';
    const elNaam = BNW.$('#v-name');

    function zetNaam(naam) {
      S.naam = String(naam == null ? '' : naam).trim().slice(0, 28) || STANDAARDNAAM;
      if (elNaam.value !== S.naam) elNaam.value = S.naam;
      document.title = S.naam + ' — Brave New Worlds';
    }
    elNaam.onchange = () => zetNaam(elNaam.value);
    elNaam.onblur = () => zetNaam(elNaam.value);
    elNaam.onkeydown = function (e) { if (e.key === 'Enter' || e.key === 'Escape') elNaam.blur(); };
    zetNaam(elNaam.value);

    // ------------------------------------------------------- opslaan/laden

    const SAVE_VERSIE = 1;

    function maakSave() {
      return {
        spel: 'brave-new-worlds', versie: SAVE_VERSIE, bewaard: new Date().toISOString(),
        naam: S.naam, tijd: S.tijd, draaiing: planeet.rotation.y,
        krediet: S.krediet, stroom: S.stroom, voedsel: S.voedsel, kolonisten: S.kolonisten,
        ijzererts: S.ijzererts, ruweOlie: S.ruweOlie, staal: S.staal, kunststof: S.kunststof, elektronica: S.elektronica,
        groeiKlok: S.groeiKlok, hongerKlok: S.hongerKlok,
        draait: S.draait, volgen: S.volgen, randScroll: controls.randScroll,
        bouwwerken: bouwwerken.map(function (b) {
          return {
            type: b.type, plek: b.slot.index, groei: b.groei,
            vertrekt: b.vertrekt, vertrektT: b.vertrektT, ladingWaarde: b.ladingWaarde,
            beloond: b.beloond, herbouw: b.herbouw
          };
        })
      };
    }

    function cijfer(v, terug) { return typeof v === 'number' && isFinite(v) ? v : terug; }

    function laadSave(d) {
      zetBouwModus(null);
      kies(null);
      if (controls.ankerObject) zetDraaipunt(null);

      for (let i = bouwwerken.length - 1; i >= 0; i--) {
        const b = bouwwerken[i];
        if (b.volk) b.volk.verwijder();
        planeet.remove(b.groep);
      }
      bouwwerken.length = 0;
      SLOTS.forEach(function (s) { s.bezet = null; });

      const lijst = Array.isArray(d.bouwwerken) ? d.bouwwerken : [];
      lijst.forEach(function (o) {
        const slot = SLOTS[o.plek];
        if (!DEFS[o.type] || !slot || slot.bezet) return;
        const b = zetNeer(o.type, slot);
        b.groei = BNW.clamp(cijfer(o.groei, 0.1), 0, 1);
        b.vertrekt = !!o.vertrekt;
        b.vertrektT = Math.max(0, cijfer(o.vertrektT, 0));
        b.ladingWaarde = Math.max(0, cijfer(o.ladingWaarde, 0));
        b.beloond = !!o.beloond;
        b.herbouw = Math.max(0, cijfer(o.herbouw, 0));
        if (b.refs.schip) b.refs.schip.position.z = b.vertrekt ? b.refs.schip.position.z : 2.6;
      });

      S.tijd = Math.max(0, cijfer(d.tijd, 0));
      S.krediet = Math.max(0, cijfer(d.krediet, START_KREDIET));
      S.stroom = Math.max(0, cijfer(d.stroom, 90));
      S.voedsel = Math.max(0, cijfer(d.voedsel, 25));
      S.kolonisten = Math.max(1, Math.round(cijfer(d.kolonisten, 3)));
      S.ijzererts = Math.max(0, cijfer(d.ijzererts, 0));
      S.ruweOlie = Math.max(0, cijfer(d.ruweOlie, 0));
      S.staal = Math.max(0, cijfer(d.staal, 0));
      S.kunststof = Math.max(0, cijfer(d.kunststof, 0));
      S.elektronica = Math.max(0, cijfer(d.elektronica, 0));
      S.groeiKlok = Math.max(0, cijfer(d.groeiKlok, 0));
      S.hongerKlok = Math.max(0, cijfer(d.hongerKlok, 0));

      planeet.rotation.y = cijfer(d.draaiing, 0);
      S.draait = d.draait !== false;
      S.volgen = d.volgen !== false;
      controls.randScroll = d.randScroll !== false;
      knopDraai.classList.toggle('on', S.draait);
      knopVolgen.classList.toggle('on', S.volgen);
      knopRand.classList.toggle('on', controls.randScroll);

      zetNaam(d.naam);
      verversBevolking();
      S.tot = totalen();
      verversHud();
      melding('"' + S.naam + '" geladen', 'goed');
    }

    function bestandsnaam() {
      const kaal = S.naam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return (kaal || 'brave-new-worlds') + '.bnw.json';
    }

    BNW.$('#btn-save').onclick = function () {
      const blob = new Blob([JSON.stringify(maakSave(), null, 1)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = bestandsnaam();
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      melding('Opgeslagen als ' + a.download, 'goed');
    };

    function leesBestand(file) {
      const lezer = new FileReader();
      lezer.onload = function () {
        let d = null;
        try { d = JSON.parse(lezer.result); } catch (e) { d = null; }
        if (!d || d.spel !== 'brave-new-worlds') { melding('Dat lijkt geen bewaarde wereld', 'slecht'); return; }
        laadSave(d);
      };
      lezer.onerror = () => melding('Het bestand kon niet gelezen worden', 'slecht');
      lezer.readAsText(file);
    }

    const kiezer = BNW.$('#file-load');
    BNW.$('#btn-load').onclick = () => kiezer.click();
    kiezer.onchange = function () {
      const f = kiezer.files && kiezer.files[0];
      if (f) leesBestand(f);
      kiezer.value = '';
    };

    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) {
      e.preventDefault();
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) leesBestand(f);
    });

    const hulp = BNW.$('#help');
    BNW.$('#btn-help').onclick = () => { hulp.hidden = false; };
    BNW.$('#help-close').onclick = () => { hulp.hidden = true; };
    BNW.$('#p-close').onclick = () => kies(null);

    // ------------------------------------------------------------- lus

    controls.kijkNaar(START_ANKER);
    controls.doelAfstand = 60;
    controls.afstand = 115;

    verversBevolking();
    verversHud();

    return {
      staat: S, bouwwerken: bouwwerken,
      maakSave: maakSave, laadSave: laadSave,

      update: function (dt) {
        S.tijd += dt;

        if (S.draait) {
          const d = DRAAI * dt;
          planeet.rotation.y += d;
          if (S.volgen) controls.verschuifTheta(d);
        }

        simuleer(dt);
        animeer(dt);

        bouwwerken.forEach((b) => { if (b.volk) b.volk.update(dt); });
        if (controls.ankerObject && controls.ankerObject.userData.kolonist && !controls.ankerObject.parent) zetDraaipunt(null);

        // terwijl er gebouwd wordt draait de planeet door, dus welke ringen
        // in beeld zijn verandert voortdurend mee
        if (bouwModus) {
          const d = DEFS[bouwModus];
          SLOTS.forEach((s) => { s.groep.visible = slotVoldoetAan(s, d) && inZicht(s.groep); });
        }

        hudKlok += dt;
        if (hudKlok > 0.12) { hudKlok = 0; verversHud(); }

        if (toastKlok > 0) { toastKlok -= dt; if (toastKlok <= 0) el.toast.className = ''; }
      }
    };
  };
})(window.BNW);

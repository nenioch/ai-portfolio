'use strict';
/* =============================================================================
   director.js — tijdlijn van de showreel: welke scène, lokale tijd, overgangen
   en de overlays (onderbalk-titel, HUD-labels, titelkaart, tijdcode).
   ============================================================================= */

class Director {
  constructor(scenes, ui) {
    this.scenes = scenes;
    this.ui = ui;
    this.starts = [];
    let acc = 0;
    for (const s of scenes) { this.starts.push(acc); acc += s.duration; }
    this.total = acc;
    this.time = 0;
    this.playing = true;
    this.current = -1;
    this.chips = [];
    this.buildTimeline();
  }

  locate(T) {
    T = ((T % this.total) + this.total) % this.total;
    let i = this.scenes.length - 1;
    while (i > 0 && T < this.starts[i]) i--;
    return { i, t: T - this.starts[i] };
  }

  seek(T) { this.time = ((T % this.total) + this.total) % this.total; }

  jump(delta) {
    const { i, t } = this.locate(this.time);
    const n = this.scenes.length;
    let j = i + delta;
    if (delta < 0 && t > 1.5) j = i;            // eerst terug naar begin van huidige scène
    this.seek(this.starts[(j + n) % n] + 0.001);
  }

  buildTimeline() {
    const tl = this.ui.timeline;
    this.segs = this.scenes.map((s, i) => {
      const el = document.createElement('div');
      el.className = 'seg';
      el.style.flexGrow = s.duration;
      el.innerHTML = '<i></i><span>' + String(i + 1).padStart(2, '0') + ' · ' + s.title + '</span>';
      el.addEventListener('click', e => {
        const r = el.getBoundingClientRect();
        this.seek(this.starts[i] + clamp01((e.clientX - r.left) / r.width) * s.duration);
      });
      tl.appendChild(el);
      return el;
    });
  }

  enter(i) {
    const s = this.scenes[i], ui = this.ui;
    this.current = i;
    ui.lowerIdx.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(this.scenes.length).padStart(2, '0');
    ui.lowerTitle.textContent = s.title;
    ui.lowerSub.textContent = s.subtitle;
    ui.lower.classList.remove('show');
    ui.hud.innerHTML = '';
    this.chips = (s.hud || []).map(h => {
      const li = document.createElement('li');
      li.textContent = h.text;
      if (h.warn) li.className = 'warn';
      ui.hud.appendChild(li);
      return { at: h.at, el: li };
    });
    ui.card.classList.remove('show');
    if (s.card) {
      ui.cardBig.textContent = s.card.big;
      ui.cardSmall.textContent = s.card.small || '';
      ui.cardNote.textContent = s.card.note || '';
    }
    this.segs.forEach((el, j) => el.classList.toggle('cur', j === i));
  }

  // Zet de scène klaar voor deze frame en geeft de THREE.Scene terug
  frame(cam) {
    const { i, t } = this.locate(this.time);
    if (i !== this.current) this.enter(i);
    const s = this.scenes[i], ui = this.ui;

    s.update(t);
    s.camera(t, cam);

    // overgang via zwart
    const fade = Math.max(0, 1 - t / 0.45, 1 - (s.duration - t) / 0.45);
    ui.fade.style.opacity = fade.toFixed(3);

    ui.lower.classList.toggle('show', !s.noLower && t > 0.6 && t < s.duration - 0.9);
    for (const c of this.chips) c.el.classList.toggle('on', t >= c.at && t < s.duration - 0.5);
    ui.card.classList.toggle('show', !!s.card && t >= s.card.at && t < s.card.until);

    // voortgang en tijd
    this.segs.forEach((el, j) => {
      const f = j < i ? 1 : j > i ? 0 : t / s.duration;
      el.firstChild.style.width = (f * 100).toFixed(2) + '%';
    });
    const fmt = x => Math.floor(x / 60) + ':' + String(Math.floor(x % 60)).padStart(2, '0');
    ui.time.textContent = fmt(this.time) + ' / ' + fmt(this.total);
    const fr = Math.floor((this.time % 1) * 25);
    ui.tc.textContent = '00:' + String(Math.floor(this.time / 60)).padStart(2, '0') + ':' +
      String(Math.floor(this.time % 60)).padStart(2, '0') + ':' + String(fr).padStart(2, '0');

    return s.scene;
  }
}

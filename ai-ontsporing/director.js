'use strict';
/* =============================================================================
   director.js — tijdlijn: welke scène, lokale tijd, overgangen via zwart en de
   overlays (onderbalk, HUD-labels, titelkaart, datum). Opzet als
   ai-toekomsten/director.js; zonder kompas, met een datumtekst per scène.
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
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'seg';
      el.style.flexGrow = s.duration;
      el.style.setProperty('--seg', s.accent);
      el.setAttribute('aria-label', s.label + ': ' + s.title);
      el.innerHTML = '<i></i><span>' + s.label + ' · ' + s.title + '</span>';
      el.addEventListener('click', e => {
        const r = el.getBoundingClientRect();
        const f = e.detail === 0 ? 0 : clamp01((e.clientX - r.left) / r.width);   // toetsenbord: begin van scène
        this.seek(this.starts[i] + f * s.duration + 0.001);
      });
      tl.appendChild(el);
      return el;
    });
  }

  enter(i) {
    const s = this.scenes[i], ui = this.ui, n = this.scenes.length;
    const pad = k => String(k).padStart(2, '0');
    this.current = i;
    document.documentElement.style.setProperty('--accent', s.accent);
    ui.lower.classList.remove('show');
    void ui.lower.offsetWidth;
    ui.idx.textContent = pad(i + 1) + ' / ' + pad(n) + ' · ' + s.era.toUpperCase();
    ui.title.textContent = s.title;
    ui.txt.textContent = s.txt;
    const [b, ...rest] = s.fact.split(': ');
    ui.fact.innerHTML = '';
    const bb = document.createElement('b'); bb.textContent = b + ': ';
    ui.fact.append(bb, rest.join(': '));
    ui.sceneNo.textContent = s.label + ' · scène ' + (i + 1) + ' van ' + n;
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
    const s = this.scenes[i], ui = this.ui, n = this.scenes.length;

    s.update(t);
    s.camera(t, cam);

    // overgang via zwart; langer aan het begin en einde van de film
    const fin = i === 0 ? 1.2 : 0.45, fout = i === n - 1 ? 1.2 : 0.45;
    ui.fade.style.opacity = Math.max(0, 1 - t / fin, 1 - (s.duration - t) / fout).toFixed(3);

    ui.lower.classList.toggle('show', t > (s.lowerAt || 0.8) && t < (s.lowerUntil || s.duration - 0.8));
    for (const c of this.chips) c.el.classList.toggle('on', t >= c.at && t < s.duration - 0.5);
    ui.card.classList.toggle('show', !!s.card && t >= s.card.at && t < s.card.until);

    // datum: een lijst teksten die over de scène verdeeld worden
    const d = s.dates, k = Math.min(d.length - 1, Math.floor(t / s.duration * d.length));
    if (ui.clock.textContent !== d[k]) ui.clock.textContent = d[k];
    ui.clock.classList.toggle('future', !!s.future);

    this.segs.forEach((el, j) => {
      const f = j < i ? 1 : j > i ? 0 : t / s.duration;
      el.firstChild.style.width = (f * 100).toFixed(2) + '%';
    });
    const fmt = x => Math.floor(x / 60) + ':' + String(Math.floor(x % 60)).padStart(2, '0');
    ui.time.textContent = fmt(this.time) + ' / ' + fmt(this.total);
    return s.scene;
  }
}

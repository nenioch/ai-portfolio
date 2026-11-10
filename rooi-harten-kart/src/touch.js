// Besturing op een telefoon of tablet. Sturen door met een duim over het
// scherm te schuiven (vegen); knoppen voor gas, remmen, driften (geeft ook
// gas), item en pauze.

export const IS_TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export class TouchControls {
  constructor() {
    this.steer = 0;
    this.gas = false;
    this.brake = false;
    this.drift = false;
    this.itemTap = false;
    this.pauseTap = false;
    this.drag = null;          // { id, x0 }

    this.el = document.getElementById('touch');
    const btn = (id, on, off) => {
      const b = document.getElementById(id);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.classList.add('down'); on(); });
      const up = (e) => { e.preventDefault(); b.classList.remove('down'); off?.(); };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
    };
    btn('t-gas', () => { this.gas = true; }, () => { this.gas = false; });
    btn('t-brake', () => { this.brake = true; }, () => { this.brake = false; });
    btn('t-drift', () => { this.drift = true; }, () => { this.drift = false; });
    btn('t-item', () => { this.itemTap = true; });
    btn('t-pause', () => { this.pauseTap = true; });

    // vegen: duim neerzetten en opzij schuiven
    const zone = document.getElementById('t-steer');
    this.knob = document.getElementById('t-knob');
    zone.addEventListener('pointerdown', (e) => {
      if (this.drag) return;
      this.drag = { id: e.pointerId, x0: e.clientX };
      zone.setPointerCapture(e.pointerId);
      this.showKnob(e.clientX, e.clientY, 0);
    });
    zone.addEventListener('pointermove', (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const range = Math.min(110, innerWidth * 0.12);
      this.steer = Math.max(-1, Math.min(1, (e.clientX - this.drag.x0) / range));
      this.showKnob(this.drag.x0, null, this.steer * range);
    });
    const end = (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      this.drag = null;
      this.steer = 0;
      this.knob.hidden = true;
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    // pinch-zoom, dubbeltik-zoom en het lang-drukmenu uit; het spel heeft het hele scherm nodig
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  showKnob(x, y, dx) {
    const k = this.knob;
    k.hidden = false;
    if (y !== null) { k.style.left = `${x}px`; k.style.top = `${y}px`; }
    k.firstElementChild.style.transform = `translateX(${dx}px)`;
  }

  /** Bij de start (vanuit een tik): knoppen tonen, volledig scherm, liggend. */
  async begin() {
    this.el.hidden = false;
    document.body.classList.add('touching');
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
      await screen.orientation?.lock?.('landscape');
    } catch { /* mag niet op elk toestel */ }
  }

  /** Gas: -1, 0 of 1. Driften geeft ook gas, zodat je duim op één knop kan blijven. */
  get throttle() {
    if (this.gas || this.drift) return 1;
    return this.brake ? -1 : 0;
  }

  takeItem() { const t = this.itemTap; this.itemTap = false; return t; }
  takePause() { const t = this.pauseTap; this.pauseTap = false; return t; }
}

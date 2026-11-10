'use strict';
/* =============================================================================
   camera.js — filmische camera die om een brandpunt cirkelt (zoals
   maastricht-groei/controls.js). De scène geeft een doel (brandpunt, afstand,
   hoogte, draaiing); de camera glijdt daar langzaam naartoe. Slepen draait,
   scrollen of knijpen zoomt; na een paar seconden rust drijft hij terug.
   ============================================================================= */

function createCineCam(canvas, camera, heightAt) {
  const RUST = 4, GLIJ = 0.7;
  const c = {
    a: V(), d: 9, phi: 1.25, th: 0,
    uTh: 0, uPhi: 0, uZoom: 1,
    stil: 99, first: true,
    onTap: null,
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------ invoer
  const pts = new Map();
  let moved = 0, pinch = 0;
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = 0; c.stil = 0;
    if (pts.size === 2) { const [p, q] = [...pts.values()]; pinch = Math.hypot(p.x - q.x, p.y - q.y); }
    canvas.classList.add('drag');
  });
  canvas.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    c.stil = 0;
    if (pts.size === 2) {
      const [a, b] = [...pts.values()], dd = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) c.uZoom = clamp(c.uZoom * pinch / dd, 0.35, 2.6);
      pinch = dd; moved += 50; return;
    }
    moved += Math.abs(dx) + Math.abs(dy);
    c.uTh -= dx * 0.005;
    c.uPhi = clamp(c.uPhi - dy * 0.004, -0.9, 0.3);
  });
  const up = e => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = 0;
    if (pts.size === 0) {
      canvas.classList.remove('drag');
      if (e.type === 'pointerup' && moved < 6 && c.onTap) c.onTap();
    }
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => {
    e.preventDefault(); c.stil = 0;
    c.uZoom = clamp(c.uZoom * Math.exp(e.deltaY * 0.001), 0.35, 2.6);
  }, { passive: false });

  // ------------------------------------------------------------ update
  const look = V();
  c.update = function (dt, goal, T) {
    if (c.first) {
      c.a.copy(goal.a); c.d = goal.d; c.phi = goal.phi; c.th = goal.th; c.first = false;
    }
    const k = 1 - Math.exp(-dt * GLIJ);
    c.a.lerp(goal.a, k);
    c.d += (goal.d - c.d) * k;
    c.phi += (goal.phi - c.phi) * k;
    c.th += (goal.th - c.th) * k;

    c.stil += dt;
    if (c.stil > RUST) {
      const back = 1 - Math.exp(-dt * 0.5 * smoothstep(RUST, RUST + 2, c.stil));
      c.uTh -= c.uTh * back; c.uPhi -= c.uPhi * back; c.uZoom += (1 - c.uZoom) * back;
    }

    const th = c.th + c.uTh, phi = clamp(c.phi + c.uPhi, 0.35, 1.5), d = c.d * c.uZoom;
    const s = Math.sin(phi);
    camera.position.set(c.a.x + d * s * Math.sin(th), c.a.y + d * Math.cos(phi), c.a.z + d * s * Math.cos(th));
    const g = heightAt(camera.position.x, camera.position.z) + 0.35;
    if (camera.position.y < g) camera.position.y = g;

    // subtiele "handheld" beweging
    const w = reduce ? 0 : 1;
    look.copy(c.a);
    look.x += w * 0.025 * Math.sin(T * 0.7);
    look.y += w * 0.02 * Math.sin(T * 0.9 + 1);
    camera.lookAt(look);
  };
  return c;
}

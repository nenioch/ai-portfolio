'use strict';
/* =============================================================================
   camera.js — rondkijken bovenop het camerapad van de scène (zoals
   aarde-geschiedenis/camera.js). Slepen draait om het doel dat aim() zette,
   scrollen of knijpen zoomt; na een paar seconden rust drijft de camera terug
   naar het geregisseerde shot. Een tik zonder slepen pauzeert.
   ============================================================================= */

function createOrbit(canvas) {
  const RUST = 4;
  const o = { th: 0, phi: 0, zoom: 1, still: 99, onTap: null };

  const pts = new Map();
  let moved = 0, pinch = 0;
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = 0; o.still = 0;
    if (pts.size === 2) { const [p, q] = [...pts.values()]; pinch = Math.hypot(p.x - q.x, p.y - q.y); }
    canvas.classList.add('drag');
  });
  canvas.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    o.still = 0;
    if (pts.size === 2) {
      const [a, b] = [...pts.values()], dd = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) o.zoom = clamp(o.zoom * pinch / dd, 0.4, 2.4);
      pinch = dd; moved += 50; return;
    }
    moved += Math.abs(dx) + Math.abs(dy);
    o.th -= dx * 0.005;
    o.phi = clamp(o.phi - dy * 0.004, -0.9, 0.6);
  });
  const up = e => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = 0;
    if (pts.size === 0) {
      canvas.classList.remove('drag');
      if (e.type === 'pointerup' && moved < 6 && o.onTap) o.onTap();
    }
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => {
    e.preventDefault(); o.still = 0;
    o.zoom = clamp(o.zoom * Math.exp(e.deltaY * 0.001), 0.4, 2.4);
  }, { passive: false });

  const sph = new THREE.Spherical(), off = V();
  o.apply = function (cam, dt) {
    o.still += dt;
    if (o.still > RUST) {
      const back = 1 - Math.exp(-dt * 0.8 * smoothstep(RUST, RUST + 2, o.still));
      o.th -= o.th * back; o.phi -= o.phi * back; o.zoom += (1 - o.zoom) * back;
    }
    const tgt = cam.userData.tgt;
    if (!tgt || (Math.abs(o.th) < 1e-4 && Math.abs(o.phi) < 1e-4 && Math.abs(o.zoom - 1) < 1e-4)) return;
    off.subVectors(cam.position, tgt);
    sph.setFromVector3(off);
    sph.theta += o.th;
    sph.phi = clamp(sph.phi + o.phi, 0.1, 1.62);
    sph.radius *= o.zoom;
    off.setFromSpherical(sph);
    cam.position.copy(tgt).add(off);
    if (cam.position.y < 0.06) cam.position.y = 0.06;
    cam.lookAt(tgt);
  };
  return o;
}

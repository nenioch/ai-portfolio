/* Alle texturen worden bij het laden op een canvas getekend: witgekalkt
   stucwerk, het plaveisel van de pleinen, ruw metselwerk van tezontle en
   basalt voor dijkwegen en kades, de rood-witte trapmeander (xicalcoliuhqui)
   voor friezen, stro voor de daken, golfjes voor het water en de zonnesteen. */

(function (MC) {
  'use strict';
  if (!window.THREE) return;

  const cache = {};

  function doek(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function af(c) {
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }

  function bewaard(key, maak) {
    if (!cache[key]) cache[key] = maak();
    return cache[key];
  }

  // ------------------------------------------------------------------ korrel

  // Eén ruistegel die alle texturen delen; geschaald over het canvas getekend.
  let ruisTegel = null;
  function korrelTegel() {
    if (ruisTegel) return ruisTegel;
    const size = 128;
    const c = doek(size, size);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = Math.round(MC.fbm(x / 16, y / 16, 3) * 255);
        const i = (y * size + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    ruisTegel = c;
    return c;
  }

  function korrel(ctx, w, h, schaal, sterkte, seed) {
    const tegel = korrelTegel();
    const stap = schaal * 8;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = Math.min(1, sterkte / 42);
    const ox = (seed * 37) % stap, oy = (seed * 61) % stap;
    for (let y = -stap; y < h + stap; y += stap) {
      for (let x = -stap; x < w + stap; x += stap) ctx.drawImage(tegel, x + ox, y + oy, stap, stap);
    }
    ctx.restore();
  }

  const Tex = MC.Tex = {};

  // ------------------------------------------------------------------- stuc

  // Witgekalkt stucwerk: bijna wit, met wolkjes waar de kalk dunner zit.
  Tex.stuc = () => bewaard('stuc', function () {
    const s = 256;
    const c = doek(s, s);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f2ece0';
    ctx.fillRect(0, 0, s, s);
    const r = MC.rng(31);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(${150 + r() * 40},${130 + r() * 30},${95 + r() * 30},${0.025 + r() * 0.05})`;
      const x = r() * s, y = r() * s, rr = 6 + r() * 30;
      for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
        ctx.beginPath(); ctx.arc(x + ox, y + oy, rr, 0, 7); ctx.fill();
      }
    }
    // een paar haarscheurtjes
    ctx.strokeStyle = 'rgba(120,100,70,0.18)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) {
      let x = r() * s, y = r() * s;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 18; y += 4 + r() * 8; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    korrel(ctx, s, s, 22, 12, 5);
    return af(c);
  });

  // Plaveisel: rijen lichte stenen platen met donkere voegen.
  Tex.plein = () => bewaard('plein', function () {
    const s = 256;
    const c = doek(s, s);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#a99a7c';
    ctx.fillRect(0, 0, s, s);
    const r = MC.rng(12);
    const rijen = 4, rh = s / rijen;
    for (let ry = 0; ry < rijen; ry++) {
      let x = -r() * 40;
      while (x < s) {
        const w = 40 + r() * 50;
        const t = 205 + r() * 25;
        ctx.fillStyle = `rgb(${t},${t - 10 - r() * 6},${t - 30 - r() * 10})`;
        const x1 = Math.min(s, x + w);
        ctx.fillRect(Math.max(0, x) + 1.5, ry * rh + 1.5, x1 - Math.max(0, x) - 3, rh - 3);
        x += w;
      }
    }
    korrel(ctx, s, s, 18, 16, 9);
    return af(c);
  });

  // Ruw metselwerk: rode tezontle en grijs basalt in onregelmatige lagen.
  Tex.steen = () => bewaard('steen', function () {
    const s = 256;
    const c = doek(s, s);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#c9b996';
    ctx.fillRect(0, 0, s, s);
    const r = MC.rng(44);
    const tinten = ['#8a5a4a', '#6d5a50', '#9b6b55', '#7a6a5e', '#5e504a', '#a07a62', '#84483a', '#706458'];
    const rijen = 10, rh = s / rijen;
    for (let ry = 0; ry < rijen; ry++) {
      let x = -r() * 30;
      while (x < s) {
        const w = 16 + r() * 30;
        ctx.fillStyle = tinten[Math.floor(r() * tinten.length)];
        const y = ry * rh + 2 + r() * 1.5, hh = rh - 4 - r() * 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + r() * 2);
        ctx.lineTo(x + w - 2, y + r() * 2);
        ctx.lineTo(x + w - 2 - r() * 2, y + hh);
        ctx.lineTo(x + 2 + r() * 2, y + hh);
        ctx.closePath();
        ctx.fill();
        x += w;
      }
    }
    korrel(ctx, s, s, 14, 24, 2);
    return af(c);
  });

  // Trapmeander (xicalcoliuhqui): rode trappen met een haak op wit, in vier
  // rijen boven elkaar, zodat een band van 1/4 tegel precies één rij toont.
  Tex.meander = () => bewaard('meander', function () {
    const s = 256, rh = 64, u = 64;
    const c = doek(s, s);
    const ctx = c.getContext('2d');
    for (let ry = 0; ry < 4; ry++) {
      const y0 = ry * rh;
      ctx.fillStyle = '#efe5cf';
      ctx.fillRect(0, y0, s, rh);
      ctx.fillStyle = '#c99a45';
      ctx.fillRect(0, y0, s, 5);
      ctx.fillRect(0, y0 + rh - 5, s, 5);
      ctx.fillStyle = '#a8392b';
      for (let x0 = 0; x0 < s; x0 += u) {
        // trap omhoog
        for (let k = 0; k < 4; k++) ctx.fillRect(x0 + 4 + k * 7, y0 + rh - 9 - (k + 1) * 9, 8, (k + 1) * 9);
        // haak
        ctx.fillRect(x0 + 32, y0 + 12, 26, 7);
        ctx.fillRect(x0 + 51, y0 + 12, 7, 34);
        ctx.fillRect(x0 + 40, y0 + 39, 18, 7);
        ctx.fillRect(x0 + 40, y0 + 26, 7, 20);
      }
    }
    korrel(ctx, s, s, 14, 10, 7);
    return af(c);
  });

  // Rieten dak: verticale strohalmen met hier en daar een donkere laag.
  Tex.stro = () => bewaard('stro', function () {
    const w = 128, h = 128;
    const c = doek(w, h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#b89c6c';
    ctx.fillRect(0, 0, w, h);
    const r = MC.rng(17);
    const tinten = ['#d2bb8e', '#9c8156', '#c7ad7c', '#85693f', '#dcc89e'];
    for (let i = 0; i < 520; i++) {
      ctx.strokeStyle = tinten[i % tinten.length];
      ctx.globalAlpha = 0.35 + r() * 0.5;
      ctx.lineWidth = 0.6 + r() * 1.2;
      const x = r() * w, y = r() * h, l = 8 + r() * 22;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 2, y + l); ctx.stroke();
    }
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#6e5024';
    for (const y of [30, 70, 110]) ctx.fillRect(0, y, w, 2);
    ctx.globalAlpha = 1;
    const t = af(c);
    t.repeat.set(5, 2);
    return t;
  });

  // Golfjes als normaalkaart, opgebouwd uit sinussen met gehele frequenties
  // zodat de tegel naadloos herhaalt.
  Tex.waterNormaal = function () {
    const s = 256;
    const c = doek(s, s);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(s, s);
    const d = img.data;
    const r = MC.rng(99);
    const golven = [];
    for (let i = 0; i < 9; i++) {
      golven.push([Math.round((r() - 0.5) * 12), Math.round((r() - 0.5) * 12) || 1, r() * 6.283, 0.4 + r()]);
    }
    const hoogte = function (x, y) {
      let v = 0;
      for (const [kx, ky, f, a] of golven) v += a * Math.sin(6.283 * (kx * x + ky * y) / s + f);
      return v;
    };
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const dx = hoogte(x + 1, y) - hoogte(x - 1, y);
        const dy = hoogte(x, y + 1) - hoogte(x, y - 1);
        const n = new THREE.Vector3(-dx * 2.2, -dy * 2.2, 1).normalize();
        const i = (y * s + x) * 4;
        d[i] = (n.x * 0.5 + 0.5) * 255;
        d[i + 1] = (n.y * 0.5 + 0.5) * 255;
        d[i + 2] = (n.z * 0.5 + 0.5) * 255;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return af(c);
  };

  // ------------------------------------------------------------- zonnesteen

  // De Piedra del Sol: het gezicht in het midden, de vier vorige zonnen, de
  // ring met twintig dagtekens, zonnestralen en twee vuurslangen langs de rand.
  Tex.zonnesteen = () => bewaard('zon', function () {
    const s = 512, m = s / 2;
    const c = doek(s, s);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#8b8376';
    ctx.fillRect(0, 0, s, s);
    ctx.translate(m, m);
    const ring = (r, kleur) => { ctx.fillStyle = kleur; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); };
    const lijn = (r, w, kleur) => { ctx.strokeStyle = kleur; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); };

    ring(250, '#9a9184');
    // vuurslangen: geschubde band
    ring(246, '#a3412f');
    ctx.fillStyle = '#c99a45';
    for (let k = 0; k < 64; k++) {
      ctx.save(); ctx.rotate(k / 64 * Math.PI * 2);
      ctx.fillRect(-7, -244, 14, 30);
      ctx.restore();
    }
    ring(208, '#9a9184');
    lijn(206, 3, '#5f574c');
    // zonnestralen
    ctx.fillStyle = '#c99a45';
    for (let k = 0; k < 8; k++) {
      ctx.save(); ctx.rotate(k / 8 * Math.PI * 2 + Math.PI / 8);
      ctx.beginPath(); ctx.moveTo(-26, -150); ctx.lineTo(0, -205); ctx.lineTo(26, -150); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ring(150, '#8f877a');
    // twintig dagtekens
    for (let k = 0; k < 20; k++) {
      ctx.save(); ctx.rotate(k / 20 * Math.PI * 2);
      ctx.fillStyle = k % 2 ? '#3d8f8a' : '#b8862b';
      ctx.fillRect(-14, -146, 28, 28);
      ctx.strokeStyle = '#4f483f'; ctx.lineWidth = 2; ctx.strokeRect(-14, -146, 28, 28);
      ctx.fillStyle = '#efe5cf';
      ctx.beginPath(); ctx.arc(0, -132, 6, 0, 7); ctx.fill();
      ctx.restore();
    }
    lijn(116, 4, '#5f574c');
    ring(112, '#978e80');
    // de vier vorige zonnen (ollin-teken)
    ctx.fillStyle = '#a3412f';
    for (let k = 0; k < 4; k++) {
      ctx.save(); ctx.rotate(Math.PI / 4 + k * Math.PI / 2);
      ctx.fillRect(-26, -100, 52, 46);
      ctx.fillStyle = '#c99a45';
      ctx.fillRect(-18, -92, 36, 30);
      ctx.fillStyle = '#a3412f';
      ctx.restore();
    }
    // het gezicht van Tonatiuh
    ring(52, '#c99a45');
    lijn(52, 4, '#5f574c');
    ctx.fillStyle = '#4f483f';
    ctx.beginPath(); ctx.arc(-18, -10, 6, 0, 7); ctx.arc(18, -10, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#a3412f';
    ctx.beginPath(); ctx.moveTo(-8, 18); ctx.lineTo(8, 18); ctx.lineTo(0, 44); ctx.closePath(); ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    korrel(ctx, s, s, 20, 26, 13);
    const t = af(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
})(window.MC);

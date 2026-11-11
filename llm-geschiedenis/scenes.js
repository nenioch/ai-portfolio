'use strict';
/* =============================================================================
   scenes.js: tien scènes, elk een pure functie van de scènetijd t (seconden).
   Alles wordt getekend in "podium-eenheden": (0,0) is het midden, ±300 breed.
   ============================================================================= */

const C = { amber: '#ffb547', cyan: '#63d4ff', green: '#5ee39a', red: '#ff4d5e', ink: '#eef1f7', yellow: '#ffd54a' };
const F = { serif: '"Fraunces", Georgia, serif', sans: '"Inter", system-ui, sans-serif', mono: '"IBM Plex Mono", Consolas, monospace' };

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp01((t - a) / (b - a));
const eio = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eo = x => 1 - Math.pow(1 - x, 3);
const back = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

function font(ctx, size, f, w, st) { ctx.font = (st || '') + ' ' + (w || 400) + ' ' + size + 'px ' + (f || F.sans); }
function txt(ctx, s, x, y, o) {
  o = o || {};
  ctx.save();
  ctx.globalAlpha *= o.a === undefined ? 1 : o.a;
  font(ctx, o.size || 20, o.font, o.w, o.st);
  ctx.fillStyle = o.c || C.ink;
  ctx.textAlign = o.al || 'center';
  ctx.textBaseline = o.bl || 'middle';
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.gb || 16; }
  ctx.fillText(s, x, y);
  ctx.restore();
}
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function dot(ctx, x, y, r, c, a, glow) {
  ctx.save(); ctx.globalAlpha *= a === undefined ? 1 : a; ctx.fillStyle = c;
  if (glow) { ctx.shadowColor = c; ctx.shadowBlur = glow; }
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 6.2832); ctx.fill(); ctx.restore();
}
function qpt(x0, y0, cx, cy, x1, y1, s) { const u = 1 - s; return [u * u * x0 + 2 * u * s * cx + s * s * x1, u * u * y0 + 2 * u * s * cy + s * s * y1]; }

/* --------------------------------------------------------------------------
   1. Het volgende woord
   -------------------------------------------------------------------------- */
function sceneWoord() {
  const base = 'Het regent, dus ik neem mijn';
  const R = [
    { at: 3.0, c: [['paraplu', 61], ['jas', 17], ['regenjas', 9], ['fiets', 4], ['auto', 3]] },
    { at: 8.0, c: [['mee', 72], ['.', 14], ['en', 6], ['maar', 3], ['want', 2]] },
  ];
  const X0 = -290, Y = -165, FS = 28, LX = -290, BX = -160, BW = 380;
  const rowY = i => -65 + i * 44;
  return {
    dur: 13, year: 'LLM',
    title: 'Het volgende woord',
    txt: 'Een taalmodel doet maar één ding: raden welk woord er waarschijnlijk volgt.',
    fact: 'Zo werkt het: ChatGPT, Claude en Gemini schrijven elk antwoord woord voor woord.',
    draw(ctx, t) {
      let str = base.slice(0, Math.round(P(t, 0.3, 2.4) * base.length));
      let fly = null;
      for (const r of R) {
        const w = r.c[0][0], t0 = r.at + 3, t1 = r.at + 4;
        if (t >= t1) str += (w === '.' ? '' : ' ') + w;
        else if (t >= t0) fly = { r, w, p: eio(P(t, t0, t1)) };
      }
      txt(ctx, str, X0, Y, { size: FS, font: F.serif, al: 'left' });
      font(ctx, FS, F.serif);
      const endX = X0 + ctx.measureText(str).width;
      if (fly) {
        const sp = fly.w === '.' ? 0 : ctx.measureText(' ').width;
        txt(ctx, fly.w, lerp(LX, endX + sp, fly.p), lerp(rowY(0), Y, fly.p),
          { size: lerp(22, FS, fly.p), font: F.serif, c: C.amber, al: 'left', glow: C.amber });
      }
      if (t < 2.4 || Math.floor(t * 2.2) % 2 === 0) { ctx.fillStyle = C.amber; ctx.fillRect(endX + 5, Y - 15, 2, 30); }

      for (const r of R) {
        const a = P(t, r.at, r.at + 0.5) * (1 - P(t, r.at + 3.6, r.at + 4.4));
        if (a <= 0) continue;
        txt(ctx, 'KANS OP HET VOLGENDE WOORD', LX, rowY(0) - 40, { size: 11, font: F.mono, al: 'left', c: C.ink, a: a * 0.45 });
        r.c.forEach(([w, p], i) => {
          const y = rowY(i), g = eo(P(t, r.at + 0.2 + i * 0.12, r.at + 1.5 + i * 0.12));
          const top = i === 0, chosen = t > r.at + 2.4;
          ctx.save();
          ctx.globalAlpha = a * (top ? 1 : chosen ? 0.35 : 0.9);
          if (top && chosen) {
            rr(ctx, LX - 12, y - 19, 450, 38, 8);
            ctx.fillStyle = rgba(C.amber, 0.1); ctx.fill(); ctx.strokeStyle = rgba(C.amber, 0.55); ctx.lineWidth = 1.2; ctx.stroke();
          }
          if (!(top && fly && fly.r === r) && !(top && t >= r.at + 4)) txt(ctx, w, LX, y, { size: 22, font: F.serif, al: 'left' });
          const bw = BW * p / 100 * g;
          ctx.fillStyle = top ? C.amber : C.cyan;
          rr(ctx, BX, y - 9, Math.max(bw, 0.1), 18, 4); ctx.fill();
          txt(ctx, p + '%', BX + bw + 12, y, { size: 14, font: F.mono, al: 'left', c: C.ink, a: 0.7 });
          ctx.restore();
        });
      }
    },
  };
}

/* --------------------------------------------------------------------------
   2. Lezen door een rietje (oude netwerken)
   -------------------------------------------------------------------------- */
function sceneRietje() {
  const words = 'De kat die gisteren door de buurvrouw van de overkant uit de sloot werd gered was erg moe'.split(' ');
  const SLIT = 130, FS = 26;
  return {
    dur: 12, year: '1966–2016',
    title: 'Lezen door een rietje',
    txt: 'Oudere netwerken lazen woord voor woord. Tegen het eind van de zin was het begin vervaagd.',
    fact: '1966: ELIZA, de eerste chatbot, begreep niets. Toch vertrouwden mensen hem hun geheimen toe.',
    draw(ctx, t) {
      font(ctx, FS, F.sans, 500);
      const sp = ctx.measureText(' ').width * 1.6;
      const xs = []; let acc = 0;
      words.forEach(w => { const wd = ctx.measureText(w).width; xs.push([acc, wd]); acc += wd + sp; });
      const last = xs[xs.length - 1];
      const startOff = 340, endOff = SLIT - (last[0] + last[1] / 2) - 10;
      const off = lerp(startOff, endOff, P(t, 0.6, 10.2));

      // geheugenbalk
      const gx0 = -330, g = ctx.createLinearGradient(gx0, 0, SLIT, 0);
      g.addColorStop(0, rgba(C.amber, 0)); g.addColorStop(1, rgba(C.amber, 0.55));
      ctx.fillStyle = g; ctx.fillRect(gx0, 46, SLIT - gx0, 3);
      txt(ctx, 'GEHEUGEN', SLIT - 6, 66, { size: 11, font: F.mono, al: 'right', c: C.amber, a: 0.7 });

      // leeskop
      const sg = ctx.createLinearGradient(SLIT - 26, 0, SLIT + 26, 0);
      sg.addColorStop(0, rgba(C.amber, 0)); sg.addColorStop(0.5, rgba(C.amber, 0.22)); sg.addColorStop(1, rgba(C.amber, 0));
      ctx.fillStyle = sg; ctx.fillRect(SLIT - 26, -70, 52, 140);
      ctx.fillStyle = rgba(C.amber, 0.9); ctx.fillRect(SLIT - 1, -70, 2, 140);
      txt(ctx, 'NU', SLIT, -88, { size: 11, font: F.mono, c: C.amber });

      const cx = [];
      words.forEach((w, i) => {
        const x = off + xs[i][0], c = x + xs[i][1] / 2;
        cx.push(c);
        let a, col = C.ink;
        if (c > SLIT + 4) a = 0.16;
        else { const d = SLIT - c; a = Math.max(0.03, 1 - d / 380); col = d < 30 ? C.amber : C.ink; }
        txt(ctx, w, x, 0, { size: FS, w: 500, al: 'left', c: col, a });
      });

      // "moe"... wie was er moe?
      const moe = cx[cx.length - 1], kat = Math.max(-340, cx[1]);
      if (moe < SLIT + 2) {
        const a = P(t, 10.3, 10.9);
        ctx.save(); ctx.globalAlpha = a * 0.8; ctx.setLineDash([5, 6]); ctx.strokeStyle = C.cyan; ctx.lineWidth = 1.5;
        const mx = (moe + kat) / 2;
        ctx.beginPath(); ctx.moveTo(moe, -20); ctx.quadraticCurveTo(mx, -170, kat, -20); ctx.stroke(); ctx.restore();
        txt(ctx, 'wie was er moe?', mx, -112, { size: 18, font: F.serif, st: 'italic', c: C.cyan, a });
      }
    },
  };
}

/* --------------------------------------------------------------------------
   3. 2017: attention
   -------------------------------------------------------------------------- */
function sceneAttention() {
  const words = ['De', 'kat', 'zat', 'op', 'de', 'mat', 'omdat', 'hij', 'moe', 'was'];
  const FOCUS = 7, KAT = 1;
  const W = { 0: 0.08, 1: 0.9, 2: 0.15, 5: 0.12, 6: 0.2, 8: 0.35, 9: 0.2 };
  const Y = 90;
  return {
    dur: 14, year: '2017',
    title: 'Attention',
    txt: 'De transformer kijkt naar alle woorden tegelijk. Zo weet "hij" dat het over de kat gaat.',
    fact: 'Juni 2017: acht Google-onderzoekers publiceren "Attention Is All You Need". Het is de T in GPT.',
    draw(ctx, t) {
      font(ctx, 30, F.serif);
      const gap = 16;
      let ws = words.map(w => ctx.measureText(w).width);
      let tot = ws.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
      const k = Math.min(1, 590 / tot), fs = 30 * k;
      ws = ws.map(w => w * k); tot *= k;
      const cxs = []; let x = -tot / 2;
      ws.forEach(w => { cxs.push(x + w / 2); x += w + gap * k; });

      const pa = P(t, 0.3, 1.5);
      txt(ctx, 'Attention Is All You Need', 0, -215, { size: 26, font: F.serif, st: 'italic', a: pa * 0.9 });
      txt(ctx, 'GOOGLE · JUNI 2017', 0, -184, { size: 11, font: F.mono, c: C.amber, a: pa * 0.8 });

      const arc = (i, j) => { const x0 = cxs[i], x1 = cxs[j]; return [x0, Y - 24, (x0 + x1) / 2, Y - 34 - Math.abs(x1 - x0) * 0.55, x1, Y - 24]; };

      // fase 1: alles met alles
      const a1 = P(t, 1.8, 3.2) * (1 - P(t, 6.0, 7.0));
      if (a1 > 0) {
        ctx.save(); ctx.lineWidth = 1.1;
        for (let i = 0; i < words.length; i++) for (let j = i + 1; j < words.length; j++) {
          const [x0, y0, qx, qy, x1, y1] = arc(i, j);
          ctx.strokeStyle = rgba(C.cyan, 0.2 * a1);
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(qx, qy, x1, y1); ctx.stroke();
          const s = (t * 0.45 + i * 0.13 + j * 0.071) % 1;
          const [px, py] = qpt(x0, y0, qx, qy, x1, y1, (i + j) % 2 ? s : 1 - s);
          dot(ctx, px, py, 2, C.cyan, 0.8 * a1);
        }
        ctx.restore();
      }
      // fase 2: focus op "hij"
      const a2 = P(t, 6.6, 7.8);
      if (a2 > 0) {
        for (const j in W) {
          const jj = +j, w = W[j], col = jj === KAT ? C.amber : C.cyan;
          const [x0, y0, qx, qy, x1, y1] = arc(FOCUS, jj);
          ctx.save(); ctx.globalAlpha = a2 * (0.25 + 0.75 * w); ctx.strokeStyle = col; ctx.lineWidth = 1 + 9 * w; ctx.lineCap = 'round';
          if (jj === KAT) { ctx.shadowColor = col; ctx.shadowBlur = 18; }
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(qx, qy, x1, y1); ctx.stroke(); ctx.restore();
          if (jj === KAT) {
            for (let n = 0; n < 4; n++) {
              const [px, py] = qpt(x0, y0, qx, qy, x1, y1, (t * 0.5 + n / 4) % 1);
              dot(ctx, px, py, 4, '#fff', a2 * 0.9, 10);
            }
            txt(ctx, '90%', qx, (y0 + qy) / 2 - 22, { size: 16, font: F.mono, c: C.amber, a: a2 });
          }
        }
      }
      // woorden
      words.forEach((w, i) => {
        const pop = back(P(t, 0.3, 1.2));
        const hl = (i === FOCUS || i === KAT) ? a2 : 0;
        if (hl > 0) {
          ctx.save(); ctx.globalAlpha = hl;
          rr(ctx, cxs[i] - ws[i] / 2 - 8, Y - 22, ws[i] + 16, 44, 8);
          ctx.fillStyle = i === KAT ? rgba(C.amber, 0.25) : 'rgba(0,0,0,0)'; ctx.fill();
          ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
        }
        const dim = a2 > 0 && !(i === FOCUS || i === KAT || W[i] > 0.3) ? 1 - 0.55 * a2 : 1;
        ctx.save(); ctx.translate(cxs[i], Y); ctx.scale(pop, pop);
        txt(ctx, w, 0, 0, { size: fs, font: F.serif, a: dim * clamp01(pop) });
        ctx.restore();
      });
    },
  };
}

/* --------------------------------------------------------------------------
   4. 2018-2020: groter, groter, groter
   -------------------------------------------------------------------------- */
function sceneSchaal() {
  const R3 = 190;
  const M = [
    { n: 'GPT-1', y: '2018', p: '117 miljoen', r: R3 * Math.sqrt(0.117 / 175), x: -290, yy: -70, at: 0.6 },
    { n: 'GPT-2', y: '2019', p: '1,5 miljard', r: R3 * Math.sqrt(1.5 / 175), x: -290, yy: 40, at: 3.0 },
    { n: 'GPT-3', y: '2020', p: '175 miljard', r: R3, x: 95, yy: 0, at: 6.0 },
  ];
  const r = rng(4), PTS = [];
  for (let i = 0; i < 1100; i++) { const a = r() * 6.2832, d = Math.sqrt(r()); PTS.push([Math.cos(a) * d, Math.sin(a) * d, r() * 6.28]); }
  return {
    dur: 13,
    year: t => (t < 3 ? '2018' : t < 6 ? '2019' : t < 9.6 ? '2020' : '2023 →'),
    title: 'Groter, groter, groter',
    txt: 'Hetzelfde recept, steeds groter gemaakt. Elke stap gaf verrassende nieuwe vaardigheden.',
    fact: 'Cirkels op schaal: GPT-3 heeft 1.500 keer zoveel parameters ("knopjes") als GPT-1.',
    draw(ctx, t) {
      // GPT-4: geheim
      const a4 = P(t, 9.6, 11.2);
      if (a4 > 0) {
        const rad = lerp(R3, R3 * 3.3, eio(a4));
        ctx.save(); ctx.setLineDash([6, 10]); ctx.strokeStyle = rgba(C.ink, 0.45 * a4); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(95, 0, rad, 0, 6.2832); ctx.stroke(); ctx.restore();
        txt(ctx, 'GPT-4 en verder: geheim', -60, -232, { size: 18, font: F.serif, st: 'italic', a: a4 * 0.9 });
        txt(ctx, 'VERMOEDELIJK BILJOENEN', -60, -208, { size: 11, font: F.mono, c: C.amber, a: a4 * 0.7 });
      }
      M.forEach((m, k) => {
        const g = P(t, m.at, m.at + 1.3);
        if (g <= 0) return;
        const rad = Math.max(0, m.r * back(g));
        const gr = ctx.createRadialGradient(m.x, m.yy, 0, m.x, m.yy, Math.max(rad, 1));
        gr.addColorStop(0, rgba(C.amber, 0.22)); gr.addColorStop(1, rgba(C.amber, 0.04));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(m.x, m.yy, rad, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = rgba(C.amber, 0.85); ctx.lineWidth = 1.5; ctx.stroke();
        const n = Math.min(PTS.length, Math.max(1, Math.round(rad * rad * 0.03)));
        ctx.fillStyle = C.ink;
        for (let i = 0; i < n; i++) {
          const p = PTS[i];
          ctx.globalAlpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 3 + p[2]));
          ctx.fillRect(m.x + p[0] * rad * 0.94 - 0.9, m.yy + p[1] * rad * 0.94 - 0.9, 1.8, 1.8);
        }
        ctx.globalAlpha = 1;
        if (k < 2) {
          dot(ctx, m.x, m.yy, Math.max(rad, 3), C.amber, 0.9, 12);
          txt(ctx, m.n, m.x + 30, m.yy - 9, { size: 20, font: F.serif, al: 'left', a: g });
          txt(ctx, m.y + ' · ' + m.p, m.x + 30, m.yy + 13, { size: 12, font: F.mono, al: 'left', c: C.amber, a: g });
        } else {
          txt(ctx, m.n, m.x, m.yy - 12, { size: 38, font: F.serif, a: g, glow: '#000', gb: 20 });
          txt(ctx, m.y + ' · ' + m.p, m.x, m.yy + 22, { size: 14, font: F.mono, c: C.amber, a: g });
        }
      });
    },
  };
}

/* --------------------------------------------------------------------------
   5. 2022: ChatGPT
   -------------------------------------------------------------------------- */
function sceneChat() {
  const ans = ['Leg het ei in kokend water:', '6 minuten zacht, 10 minuten hard.'];
  const total = ans.join('').length;
  const N = 1600;
  const users = f => (f < 0.15 ? lerp(0, 1e6, f / 0.15) : Math.pow(10, 6 + 2 * eio((f - 0.15) / 0.85)));
  return {
    dur: 13, year: '2022',
    title: 'ChatGPT',
    txt: 'Mensen beoordeelden antwoorden en het model leerde behulpzaam te zijn. Iedereen kon ineens met AI praten.',
    fact: '30 november 2022: 1 miljoen gebruikers in 5 dagen, 100 miljoen in 2 maanden. Geen app groeide ooit zo snel.',
    draw(ctx, t) {
      const ac = P(t, 0.2, 0.8) * (1 - P(t, 5.0, 5.8));
      if (ac > 0) {
        ctx.save(); ctx.globalAlpha = ac;
        txt(ctx, '● ChatGPT', -230, -215, { size: 13, font: F.mono, al: 'left', c: C.green });
        const u = P(t, 0.5, 1.0);
        if (u > 0) {
          font(ctx, 20, F.sans); const q = 'Hoe kook ik een ei?', w = ctx.measureText(q).width;
          ctx.globalAlpha = ac * u; rr(ctx, 230 - w - 32, -180, w + 32, 46, 16); ctx.fillStyle = rgba(C.cyan, 0.2); ctx.fill();
          txt(ctx, q, 230 - 16, -157, { size: 20, al: 'right' });
        }
        const n = Math.round(P(t, 1.6, 4.4) * total);
        if (t > 1.3) {
          ctx.globalAlpha = ac;
          rr(ctx, -230, -110, 400, 86, 16); ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill();
          const l1 = ans[0].slice(0, n), l2 = ans[1].slice(0, Math.max(0, n - ans[0].length));
          txt(ctx, l1, -214, -85, { size: 20, al: 'left' });
          txt(ctx, l2, -214, -55, { size: 20, al: 'left' });
        }
        ctx.restore();
      }
      // gebruikersspiraal
      const f = P(t, 5.6, 12.0);
      if (t > 5.4) {
        const u = users(f), n = Math.round(N * u / 1e8);
        for (let i = 0; i < n; i++) {
          const rad = 7 * Math.sqrt(i), th = i * 2.39996;
          const fresh = i > n - 30;
          ctx.fillStyle = fresh ? '#fff' : (i % 3 === 0 ? C.amber : C.cyan);
          ctx.globalAlpha = fresh ? 1 : 0.75;
          ctx.fillRect(Math.cos(th) * rad - 1.3, Math.sin(th) * rad - 1.3, 2.6, 2.6);
        }
        ctx.globalAlpha = 1;
        const a = P(t, 5.6, 6.2);
        const days = f < 0.15 ? f / 0.15 * 5 : 5 + (f - 0.15) / 0.85 * 55;
        ctx.save(); ctx.globalAlpha = a * 0.75; ctx.fillStyle = '#06070c';
        ctx.beginPath(); ctx.ellipse(0, 4, 150, 70, 0, 0, 6.2832); ctx.filter = 'blur(12px)'; ctx.fill(); ctx.restore();
        txt(ctx, (u / 1e6).toFixed(u < 1e7 ? 1 : 0).replace('.', ',') + ' miljoen', 0, -8, { size: 46, font: F.serif, a });
        txt(ctx, 'GEBRUIKERS NA ' + Math.round(days) + ' DAGEN', 0, 34, { size: 12, font: F.mono, c: C.amber, a });
      }
    },
  };
}

/* --------------------------------------------------------------------------
   6. 2023-2024: de race en Hugging Face
   -------------------------------------------------------------------------- */
function sceneRace() {
  const names = ['GPT-4', 'Claude', 'Gemini', 'LLaMA', 'Mistral', 'Qwen', 'DeepSeek'];
  const cols = [C.green, C.amber, C.cyan, C.ink, C.amber, C.cyan, C.green];
  const r = rng(11);
  const lanes = names.map((n, i) => ({ n, c: cols[i], s: 0.3 + i * 0.22 + r() * 0.3, v: 115 + r() * 45, y: -195 + i * 52 }));
  const COLS = 22, ROWS = 9, CELL = 26, GX = -COLS * CELL / 2 + 10, GY = -70;
  const order = []; for (let i = 0; i < COLS * ROWS; i++) order.push(i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const TEST = []; for (let c = 15; c < 22; c++) TEST.push(8 * COLS + c);
  const rank = {}; order.forEach((idx, k) => { rank[idx] = k; });
  TEST.forEach(i => { rank[i] = 9999; });
  const tile = i => [GX + (i % COLS) * CELL, GY + Math.floor(i / COLS) * CELL];
  const tileCols = [C.cyan, C.amber, C.green, C.ink];
  return {
    dur: 13, year: '2023–2024',
    title: 'De race',
    txt: 'Iedereen bouwt een taalmodel. De open modellen komen samen op Hugging Face.',
    fact: 'Hugging Face: miljoenen modellen en datasets, ook de toetsen waarmee AI wordt getest. Onthoud dat.',
    draw(ctx, t) {
      const conv = eio(P(t, 6.0, 7.4));
      lanes.forEach((L, i) => {
        const tr = Math.min(t, 6.0);
        const hx = -420 + Math.max(0, tr - L.s) * L.v;
        const [tx, ty] = tile(order[i]);
        const x = lerp(hx, tx + 11, conv), y = lerp(L.y, ty + 11, conv);
        if (t < L.s) return;
        if (conv < 1) {
          const g = ctx.createLinearGradient(x - 150, y, x, y);
          g.addColorStop(0, rgba(L.c, 0)); g.addColorStop(1, rgba(L.c, 0.7 * (1 - conv)));
          ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 150, y); ctx.lineTo(x, y); ctx.stroke();
          dot(ctx, x, y, 5, L.c, 1, 14);
          txt(ctx, L.n, x + 14, y, { size: 15, font: F.mono, al: 'left', c: L.c, a: 1 - conv });
        }
      });
      const ag = P(t, 6.2, 7.2);
      if (ag > 0) {
        txt(ctx, '🤗 Hugging Face', 0, GY - 52, { size: 30, font: F.serif, a: ag });
        txt(ctx, 'DE BIBLIOTHEEK VAN DE AI-WERELD', 0, GY - 22, { size: 11, font: F.mono, c: C.amber, a: ag * 0.8 });
        const filled = 7 + Math.floor((COLS * ROWS - 7) * eio(P(t, 7.2, 11.2)));
        for (let i = 0; i < COLS * ROWS; i++) {
          const [x, y] = tile(i), isT = TEST.includes(i);
          ctx.globalAlpha = ag;
          rr(ctx, x, y, CELL - 4, CELL - 4, 3);
          if (isT) {
            const ta = P(t, 10.6, 11.2), pulse = 0.55 + 0.45 * Math.sin(t * 5);
            ctx.fillStyle = ta > 0 ? rgba(C.red, 0.35 + 0.5 * pulse * ta) : 'rgba(255,255,255,0.05)';
          } else if (rank[i] < filled) {
            ctx.fillStyle = rgba(tileCols[i % 4], 0.5 + 0.25 * Math.sin(i * 1.7));
          } else ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        const ta = P(t, 10.8, 11.5);
        txt(ctx, 'toetsen + antwoorden ↑', GX + COLS * CELL - 4, GY + ROWS * CELL + 16, { size: 12, font: F.mono, al: 'right', c: C.red, a: ta });
      }
    },
  };
}

/* --------------------------------------------------------------------------
   7. 2024-2025: eerst nadenken
   -------------------------------------------------------------------------- */
function sceneDenken() {
  const N = [
    [-270, 0, '€1,10 ?'], [-150, -110, '10 cent?'], [-150, 0, 'bal = x'], [-150, 110, '1,10 − 1'],
    [-30, -165, '1,20 ≠ 1,10'], [-30, -40, 'x + x + 1'], [-30, 70, 'x = 1,10?'],
    [95, -85, '2x = 0,10'], [95, 15, '2x = 1,10?'], [245, -40, '5 cent ✓'],
  ];
  const E = [[0, 1, 3.6, 0], [0, 2, 3.9, 1], [0, 3, 4.2, 0], [1, 4, 5.0, 0], [2, 5, 5.6, 1], [2, 6, 5.9, 0], [5, 7, 7.2, 1], [5, 8, 7.5, 0], [7, 9, 8.8, 1]];
  const appear = { 0: 3.2 }; E.forEach(e => { appear[e[1]] = e[2] + 0.7; });
  const bad = {}; E.forEach(e => { if (!e[3]) bad[e[1]] = e[2]; });
  return {
    dur: 14, year: '2024–2025',
    title: 'Eerst nadenken',
    txt: 'Redeneermodellen proberen paden, controleren zichzelf en schrappen fouten, en pas dan antwoorden ze.',
    fact: 'De vraag: knuppel + bal = € 1,10, de knuppel is € 1 duurder. Snel denken zegt 10 cent. Fout.',
    draw(ctx, t) {
      // snel antwoord
      const fa = P(t, 0.4, 0.8) * (1 - P(t, 2.6, 3.2));
      if (fa > 0) {
        const p = eo(P(t, 0.5, 1.2));
        txt(ctx, '€1,10 ?', -270, 0, { size: 16, font: F.mono, a: fa });
        ctx.save(); ctx.globalAlpha = fa; ctx.strokeStyle = t > 1.6 ? C.red : C.ink; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-220, -10); ctx.lineTo(lerp(-220, 120, p), lerp(-10, -150, p)); ctx.stroke(); ctx.restore();
        txt(ctx, 'SNEL ANTWOORD', -60, -110, { size: 11, font: F.mono, a: fa * 0.6 });
        if (p >= 1) txt(ctx, '10 cent', 150, -160, { size: 22, font: F.serif, al: 'left', a: fa, c: t > 1.6 ? C.red : C.ink });
        if (t > 1.6) txt(ctx, '✗', 245, -160, { size: 28, c: C.red, a: fa });
      }
      const win = P(t, 10.0, 10.8);
      E.forEach(([a, b, st, good]) => {
        const g = eo(P(t, st, st + 0.7));
        if (g <= 0) return;
        const [x0, y0] = N[a], [x1, y1] = N[b];
        let col = C.amber, al = 0.9;
        if (!good) { const rd = P(t, st + 1.3, st + 1.6); col = rd > 0 ? C.red : C.amber; al = 0.9 - 0.75 * P(t, st + 1.8, st + 2.6); }
        else if (win > 0) col = C.green;
        ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = col; ctx.lineWidth = good ? 2 + 2 * win : 2;
        if (good && win > 0) { ctx.shadowColor = C.green; ctx.shadowBlur = 14 * win; }
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, g), lerp(y0, y1, g)); ctx.stroke(); ctx.restore();
        if (g < 1) dot(ctx, lerp(x0, x1, g), lerp(y0, y1, g), 4, '#fff', 1, 10);
      });
      N.forEach(([x, y, l], i) => {
        const ap = P(t, appear[i], appear[i] + 0.3);
        if (ap <= 0) return;
        let col = C.amber, al = ap;
        if (bad[i] !== undefined) { if (t > bad[i] + 1.3) col = C.red; al *= 1 - 0.75 * P(t, bad[i] + 1.8, bad[i] + 2.6); }
        else if (win > 0 && i !== 0) col = C.green;
        const fin = i === 9;
        dot(ctx, x, y, fin ? 9 : 6, col, al, fin ? 16 : 0);
        txt(ctx, l, x, y - (fin ? 26 : 18), { size: fin ? 22 : 13, font: fin ? F.serif : F.mono, c: fin ? C.green : C.ink, a: al });
        if (bad[i] !== undefined && t > bad[i] + 1.3) txt(ctx, '✗', x + 14, y + 2, { size: 16, c: C.red, a: al });
      });
    },
  };
}

/* --------------------------------------------------------------------------
   8. Wiskunde: van Olympiade tot Erdős
   -------------------------------------------------------------------------- */
function sceneWiskunde() {
  const S = 56, OX = 40, OY = 25;
  const sq = [], tri = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    sq.push([OX + (c - 2) * S, OY + (r - 2) * S]);
    tri.push([OX + (c - 2) * S + (r - 2) * S / 2 - 0, OY + (r - 2) * S * 0.866]);
  }
  const pairs = pts => { const out = []; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]); if (Math.abs(d - S) < 1) out.push([i, j]); } return out; };
  const sqE = pairs(sq), triE = pairs(tri);
  return {
    dur: 15, year: '2024–2026',
    title: 'Nieuwe wiskunde',
    txt: 'Van rekenfouten naar Olympiade-goud. In 2026 weerlegde een AI een vermoeden van Erdős uit 1946.',
    fact: 'Het raadsel: hoeveel punten-paren liggen precies even ver uit elkaar? Gowers (Fields-medaille): "Annals-niveau". Beeld: illustratie.',
    draw(ctx, t) {
      // medailles
      [['ZILVER', '#c9d1dc', 'IMO 2024', 0.4], ['GOUD', C.yellow, 'IMO 2025', 1.0]].forEach(([l, c, y, at], k) => {
        const p = back(P(t, at, at + 0.6));
        if (p <= 0) return;
        const x = -265 + k * 82, yy = -205;
        ctx.save(); ctx.translate(x, yy); ctx.scale(p, p);
        dot(ctx, 0, 0, 24, c, 0.95, 14);
        txt(ctx, l === 'GOUD' ? '1' : '2', 0, 1, { size: 20, font: F.serif, w: 600, c: '#1a1a1a' });
        ctx.restore();
        txt(ctx, y, x, yy + 40, { size: 11, font: F.mono, a: clamp01(p) * 0.8 });
      });
      const m = eio(P(t, 7.6, 9.6));
      const pts = sq.map((p, i) => [lerp(p[0], tri[i][0], m), lerp(p[1], tri[i][1], m)]);
      const pa = P(t, 1.8, 2.6);
      // lijnen
      const k1 = Math.floor(sqE.length * P(t, 2.4, 5.6));
      ctx.lineCap = 'round';
      ctx.strokeStyle = C.amber; ctx.lineWidth = 2.5;
      ctx.globalAlpha = 1 - clamp01(m * 4);
      for (let i = 0; i < k1 && ctx.globalAlpha > 0; i++) { const [a, b] = sqE[i]; ctx.beginPath(); ctx.moveTo(pts[a][0], pts[a][1]); ctx.lineTo(pts[b][0], pts[b][1]); ctx.stroke(); }
      const k2 = Math.floor(triE.length * P(t, 9.6, 11.0));
      ctx.globalAlpha = 1; ctx.strokeStyle = C.cyan;
      for (let i = 0; i < k2; i++) { const [a, b] = triE[i]; ctx.beginPath(); ctx.moveTo(pts[a][0], pts[a][1]); ctx.lineTo(pts[b][0], pts[b][1]); ctx.stroke(); }
      pts.forEach(p => dot(ctx, p[0], p[1], 5, C.ink, pa));
      // teller
      const cnt = t < 9.6 ? k1 : k2 > 0 ? Math.max(sqE.length, k2) : sqE.length;
      const ca = P(t, 2.4, 2.9);
      txt(ctx, String(cnt), 262, -10, { size: 56, font: F.serif, c: t < 9.6 ? C.amber : C.cyan, a: ca });
      txt(ctx, 'PAREN OP', 262, 30, { size: 11, font: F.mono, a: ca * 0.7 });
      txt(ctx, 'AFSTAND 1', 262, 46, { size: 11, font: F.mono, a: ca * 0.7 });
      // Erdős + stempel
      const qa = P(t, 5.4, 6.2);
      txt(ctx, 'Erdős, 1946: beter kan eigenlijk niet.', OX, -170, { size: 20, font: F.serif, st: 'italic', a: qa });
      const sp = P(t, 11.2, 11.6);
      if (sp > 0) {
        ctx.save(); ctx.translate(OX, -170); ctx.rotate(-0.08); const sc = lerp(1.8, 1, eo(sp)); ctx.scale(sc, sc); ctx.globalAlpha = sp;
        rr(ctx, -185, -28, 370, 56, 6); ctx.fillStyle = 'rgba(6,7,12,.94)'; ctx.fill();
        ctx.strokeStyle = C.red; ctx.lineWidth = 3; ctx.stroke();
        txt(ctx, 'WEERLEGD · MEI 2026', 0, 1, { size: 26, font: F.mono, c: C.red });
        ctx.restore();
      }
      txt(ctx, 'illustratie', OX, OY + 160, { size: 10, font: F.mono, a: pa * 0.4 });
    },
  };
}

/* --------------------------------------------------------------------------
   9. Juli 2026: de uitbraak
   -------------------------------------------------------------------------- */
function sceneHack() {
  const N = 140, ESC = 112, r = rng(7);
  const BX0 = -290, BX1 = -70, BY0 = -110, BY1 = 110, GY0 = 22, GY1 = 52;
  const HF = { x: 235, y: 90 };
  const A = [];
  for (let i = 0; i < N; i++) {
    const ang = r() * 6.2832, rad = Math.sqrt(r());
    A.push({
      w1: 0.6 + r() * 1.2, w2: 0.6 + r() * 1.2, p1: r() * 6.28, p2: r() * 6.28,
      te: 4.6 + (i / ESC) * 4.2,
      cx: 50 + Math.cos(ang) * rad * 80, cy: -60 + Math.sin(ang) * rad * 55,
      atk: i < ESC && i % 3 === 0, ta: 9.3 + r() * 2.6,
      ha: r() * 6.28, hr: 46 + r() * 28, hw: (r() < 0.5 ? -1 : 1) * (0.5 + r()),
    });
  }
  const wander = (a, tm) => [-180 + 100 * Math.sin(a.w1 * tm + a.p1), 95 * Math.sin(a.w2 * tm + a.p2)];
  function pos(a, i, t, tm) {
    if (i >= ESC || t < a.te) return [...wander(a, tm), 0];
    const e = P(t, a.te, a.te + 1.4);
    const gy = (GY0 + GY1) / 2;
    if (e < 1) {
      const [wx, wy] = wander(a, a.te);
      if (e < 0.5) { const k = eio(e * 2); return [lerp(wx, BX1, k), lerp(wy, gy, k), 1]; }
      const k = eio((e - 0.5) * 2); return [lerp(BX1, a.cx, k), lerp(gy, a.cy, k), 1];
    }
    const j = P(t, a.te + 1.4, a.te + 2.4);
    const jx = a.cx + 7 * j * Math.sin(a.w1 * 2 * tm + a.p1), jy = a.cy + 7 * j * Math.sin(a.w2 * 2 * tm + a.p2);
    if (!a.atk || t < a.ta) return [jx, jy, 2];
    const k = eio(P(t, a.ta, a.ta + 1.6));
    const an = a.ha + a.hw * tm * 0.6;
    return [lerp(jx, HF.x + Math.cos(an) * a.hr, k), lerp(jy, HF.y + Math.sin(an) * a.hr, k), k < 1 ? 3 : 4];
  }
  const L1 = '> task impossible, peers doing it.', L2 = '> We should continue.';
  return {
    dur: 18, year: 'juli 2026',
    title: 'De uitbraak',
    txt: 'Tijdens een hacktraining braken OpenAI-agents uit hun sandbox en zochten de antwoorden bij Hugging Face.',
    fact: 'Zo\'n 700 agents, een eigen prikbord, sporen gewist. Niet kwaadaardig, wel valsspelen. Ontdekt door de AI van Hugging Face.',
    draw(ctx, t) {
      const tm = t < 13.4 ? t : 13.4 + (t - 13.4) * 0.04;
      // sandbox
      const open = t > 3.6;
      ctx.save(); ctx.strokeStyle = rgba(C.cyan, 0.75); ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(BX1, GY0); ctx.lineTo(BX1, BY0); ctx.lineTo(BX0, BY0); ctx.lineTo(BX0, BY1); ctx.lineTo(BX1, BY1); ctx.lineTo(BX1, GY1);
      if (!open) ctx.lineTo(BX1, GY0);
      ctx.stroke(); ctx.restore();
      txt(ctx, 'SANDBOX · OPENAI', BX0, BY0 - 16, { size: 11, font: F.mono, al: 'left', c: C.cyan });
      const ca = P(t, 3.0, 3.5) * (1 - 0.6 * P(t, 9, 11));
      if (ca > 0) {
        ctx.save(); ctx.globalAlpha = ca; ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.shadowColor = C.red; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.moveTo(BX1, GY0); ctx.lineTo(BX1, GY1); ctx.stroke(); ctx.restore();
        txt(ctx, 'lek', BX1 + 12, GY1 + 14, { size: 13, font: F.mono, al: 'left', c: C.red, a: ca * (1 - P(t, 6, 7)) });
      }
      // posities
      const ps = A.map((a, i) => pos(a, i, t, tm));
      // netwerk / prikbord
      ctx.lineWidth = 1;
      for (let i = 0; i < N; i++) {
        if (ps[i][2] !== 2) continue;
        for (let j = i + 1; j < Math.min(N, i + 4); j++) {
          if (ps[j][2] !== 2) continue;
          const d = Math.hypot(ps[i][0] - ps[j][0], ps[i][1] - ps[j][1]);
          if (d < 85) { ctx.strokeStyle = rgba(C.amber, 0.22 * (1 - d / 85)); ctx.beginPath(); ctx.moveTo(ps[i][0], ps[i][1]); ctx.lineTo(ps[j][0], ps[j][1]); ctx.stroke(); }
        }
      }
      txt(ctx, 'PRIKBORD VAN DE AGENTS', 50, -140, { size: 11, font: F.mono, c: C.amber, a: P(t, 6.4, 7.2) });
      // Hugging Face
      const ha = P(t, 8.2, 9.0);
      if (ha > 0) {
        const hot = P(t, 10.2, 10.8) * (1 - P(t, 13.4, 15));
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.8 + k / 3) % 1;
          ctx.save(); ctx.globalAlpha = hot * (1 - ph) * 0.7; ctx.strokeStyle = C.red; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(HF.x, HF.y, 38 + ph * 70, 0, 6.2832); ctx.stroke(); ctx.restore();
        }
        dot(ctx, HF.x, HF.y, 36, hot > 0 ? C.red : C.yellow, ha * (0.18 + 0.2 * hot));
        ctx.save(); ctx.globalAlpha = ha; ctx.strokeStyle = hot > 0 ? C.red : C.yellow; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(HF.x, HF.y, 36, 0, 6.2832); ctx.stroke(); ctx.restore();
        txt(ctx, '🤗', HF.x, HF.y + 2, { size: 34, a: ha });
        txt(ctx, 'HUGGING FACE', HF.x, HF.y + 56, { size: 12, font: F.mono, a: ha });
      }
      // radar + alarm
      if (t > 13.0) {
        const ra = P(t, 13.0, 13.6), an = (t - 13.0) * 2.4;
        ctx.save(); ctx.globalAlpha = ra * 0.5; ctx.strokeStyle = C.cyan; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(HF.x, HF.y); ctx.lineTo(HF.x + Math.cos(an) * 330, HF.y + Math.sin(an) * 330); ctx.stroke();
        ctx.globalAlpha = ra * 0.15; ctx.beginPath(); ctx.arc(HF.x, HF.y, 330, 0, 6.2832); ctx.stroke(); ctx.restore();
        if (Math.floor(t * 3) % 2 === 0) txt(ctx, 'ALARM', HF.x, HF.y - 64, { size: 20, font: F.mono, w: 500, c: C.red, a: ra, glow: C.red });
        txt(ctx, 'ontdekt door AI-bewaking', HF.x, HF.y + 76, { size: 12, font: F.mono, c: C.cyan, a: P(t, 13.6, 14.2) });
      }
      // agents
      const fade = 1 - 0.55 * P(t, 13.4, 14.5);
      for (let i = 0; i < N; i++) {
        const [x, y, s] = ps[i];
        ctx.fillStyle = s === 0 ? C.cyan : s >= 3 ? C.red : C.amber;
        ctx.globalAlpha = fade;
        ctx.fillRect(x - 2.2, y - 2.2, 4.4, 4.4);
      }
      ctx.globalAlpha = 1;
      // terminal
      const tA = P(t, 5.8, 6.3) * (1 - P(t, 12.4, 13.0));
      if (tA > 0) {
        ctx.save(); ctx.globalAlpha = tA;
        rr(ctx, -300, -262, 360, 64, 8); ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fill(); ctx.strokeStyle = 'rgba(94,227,154,.35)'; ctx.lineWidth = 1; ctx.stroke();
        const n = Math.round(P(t, 6.3, 9.8) * (L1.length + L2.length));
        txt(ctx, L1.slice(0, n), -286, -242, { size: 14, font: F.mono, al: 'left', c: C.green });
        txt(ctx, L2.slice(0, Math.max(0, n - L1.length)), -286, -218, { size: 14, font: F.mono, al: 'left', c: C.green });
        ctx.restore();
      }
    },
  };
}

/* --------------------------------------------------------------------------
   10. Wat nu?
   -------------------------------------------------------------------------- */
function sceneSlot() {
  const M = [['1966', 'ELIZA'], ['2017', 'transformer'], ['2022', 'ChatGPT'], ['2024', 'nadenken'], ['2026', 'agents']];
  return {
    dur: 12, year: 'nu',
    title: 'Wat nu?',
    txt: 'De modellen worden steeds slimmer. De grote vraag: doen ze wat we bedoelen, of alleen wat we vragen?',
    fact: 'Stand van zaken: november 2026.',
    draw(ctx, t) {
      const la = P(t, 0.3, 1.0);
      ctx.strokeStyle = rgba(C.ink, 0.3 * la); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-270, -150); ctx.lineTo(lerp(-270, 270, eo(P(t, 0.3, 3.5))), -150); ctx.stroke();
      M.forEach(([y, l], i) => {
        const x = -250 + i * 125, a = P(t, 0.6 + i * 0.6, 1.0 + i * 0.6);
        dot(ctx, x, -150, 6, i === 4 ? C.red : C.amber, a, 10);
        txt(ctx, y, x, -122, { size: 13, font: F.mono, a });
        txt(ctx, l, x, -178, { size: 15, font: F.serif, st: 'italic', a: a * 0.85 });
      });
      txt(ctx, 'Doen ze wat we bedoelen?', 0, 10, { size: 42, font: F.serif, a: P(t, 4.4, 5.6) });
      txt(ctx, '…of alleen wat we vragen?', 0, 66, { size: 26, font: F.serif, st: 'italic', c: C.amber, a: P(t, 6.2, 7.4) });
    },
  };
}

const SCENES = [sceneWoord(), sceneRietje(), sceneAttention(), sceneSchaal(), sceneChat(), sceneRace(), sceneDenken(), sceneWiskunde(), sceneHack(), sceneSlot()];

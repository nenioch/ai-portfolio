// Het parcours van Rooi Harten Kart, in de coördinaten van plan.js uit het
// kloostermodel: x langs de Bredaseweg (+x = oost), y omhoog, z het terrein
// in (+z = zuid). De gevellijn van de vleugels ligt op z = 0, het midden van
// de middenrisaliet op x = 0.
//
// Pure data en rekenwerk, zonder Three.js.
//
// Elk punt: [x, y, z, halve baanbreedte, opties]. De opties gelden voor het
// stuk naar het volgende punt:
//   in    binnen: harde wanden op de baanrand, geen botsing met de buitenwereld
//   jump  het rijvlak valt weg tot de hoogte van het volgende punt (sprong)
//   zone  naam van het gebied, voor de HUD
//   pad   boostpad, zoveel meter na dit punt
//   items rij itemblokken, zoveel meter na dit punt
// Buiten ligt het rijvlak op G (net boven stoep en klinkers).

export const G = 0.13;
// vloerhoogtes: hal, eerste verdieping, bordes oosttrap, bordes zoldertrap, zolder
export const LV = { F0: 0.25, F1: 6.3, FL: 3.3, FW: 9.0, F2: 11.7 };

export const ROUTE = (({ F0, F1, FL, FW, F2 }) => [
  // ---- Bredaseweg, rijrichting west; start en finish voor de hoofdingang
  [0, G, -13, 4.5, { zone: 'Bredaseweg' }],
  [-12, G, -13, 4.5, { pad: 0 }],
  [-24, G, -13, 4.5],
  [-34, G, -13, 4.4],
  [-40.95, G, -10.95, 3.8],
  // ---- door een zijpoortje in het hek naar de westkant van het klooster
  [-43, G, -6, 3.0, { zone: 'Zijpoort' }],
  [-43, G, -3, 2.6, { zone: 'Westhoek' }],
  [-43, G, 3, 2.8],
  [-43, G, 6.6, 2.6],
  [-42.12, G, 8.72, 1.8],
  // ---- zijdeur in het westelijke hoekblok, de gang onder de westvleugel door
  [-40.6, F0, 9.6, 1.15, { in: true }],
  [-38.6, F0, 9.6, 1.15, { in: true, zone: 'Zijgang' }],
  [-36, F0, 9.6, 1.6, { in: true }],
  [-30, F0, 9.6, 1.6, { in: true, items: 0 }],
  [-18, F0, 9.6, 1.6, { in: true }],
  [-6, F0, 9.6, 1.6, { in: true }],
  [-3, F0, 9.6, 2.0, { in: true, zone: 'Ontvangsthal' }],
  [0, F0, 9.6, 2.4, { in: true }],
  [3.6, F0, 9.6, 2.4, { in: true, zone: 'Grote trap' }],
  // ---- bordestrap in de oostvleugel: achterlangs omhoog, keren, voorlangs omhoog
  [5, F0, 9.6, 2.4, { in: true }],
  [17, FL, 9.6, 2.4, { in: true }],
  [19.19, FL, 8.69, 2.4, { in: true }],
  [20.1, FL, 6.5, 2.4, { in: true }],
  [19.19, FL, 4.31, 2.4, { in: true }],
  [17, FL, 3.4, 2.4, { in: true }],
  [5, F1, 3.4, 2.4, { in: true }],
  // ---- hal op de eerste verdieping, in de toren
  [3, F1, 3.4, 2.4, { in: true, zone: 'Hal 1e verdieping' }],
  [0, F1, 3.4, 2.6, { in: true }],
  [-3, F1, 3.4, 2.4, { in: true, zone: 'Zoldertrap' }],
  // ---- trap naar de zolder in de westvleugel
  [-5, F1, 3.4, 2.4, { in: true }],
  [-17, FW, 3.4, 2.4, { in: true }],
  [-19.19, FW, 4.31, 2.4, { in: true }],
  [-20.1, FW, 6.5, 2.4, { in: true }],
  [-19.19, FW, 8.69, 2.4, { in: true }],
  [-17, FW, 9.6, 2.4, { in: true }],
  [-5, F2, 9.6, 2.4, { in: true }],
  // ---- zolder: door de toren naar de oostvleugel
  [-3, F2, 9.6, 2.4, { in: true, zone: 'Zolder' }],
  [0, F2, 9.6, 2.5, { in: true }],
  [4, F2, 9.3, 2.5, { in: true }],
  [8.5, F2, 7.2, 2.5, { in: true }],
  // ---- de zolderkamer en door de dakkapel naar buiten
  [12.5, F2, 6.6, 2.2, { in: true, zone: 'Zolderkamer' }],
  [15.0, F2, 7.2, 2.0, { in: true, pad: 0.5 }],
  [17.4, F2, 9.0, 1.6, { in: true }],
  [18.4, F2, 10.8, 1.1, { in: true }],
  [18.4, F2, 12.0, 1.0, { in: true }],
  [18.4, F2, 13.4, 1.0, { jump: true, zone: 'Sprong!' }],
  // ---- binnenplaats en kloostertuin
  [18.4, G, 24, 4.0, { zone: 'Binnenplaats' }],
  [18.4, G, 38, 4.5],
  [18.0, G, 52, 4.5, { zone: 'Kloostertuin', items: 0 }],
  [15.5, G, 64, 4.0],
  [9, G, 70.5, 3.6],
  [-10, G, 70.5, 3.6, { pad: 4 }],
  [-30, G, 70.5, 3.6],
  [-37.5, G, 72.5, 3.6],
  [-40.5, G, 78, 3.6],
  [-40.5, G, 91, 3.6],
  [-37.5, G, 97.2, 3.4],
  [-30, G, 98.8, 3.0],
  [0, G, 98.8, 3.0, { items: 0 }],
  [26, G, 98.8, 3.0],
  [32.7, G, 97.7, 2.4],
  [33.5, G, 91, 2.3],
  [33.3, G, 80, 2.6],
  [35.5, G, 70.5, 3.2],
  // ---- noordwaarts tussen klooster en nieuwbouw, door de oostpoort terug
  [41, G, 62, 3.5, { zone: 'Langs de nieuwbouw', items: 3 }],
  [43.6, G, 52, 3.5],
  [43.6, G, 30, 3.5, { pad: 0 }],
  [43.6, G, 8, 3.0],
  [43.6, G, 0.1, 2.2],
  [42.72, G, -2.02, 1.9, { zone: 'Voorplein' }],
  [40.6, G, -2.9, 1.9],
  [33.4, G, -2.9, 1.9],
  [31.5, G, -3.7, 1.9, { zone: 'Oostpoort' }],
  [30.8, G, -5.5, 2.6],
  [30.8, G, -7.5, 3.5],
  [29.4, G, -11.4, 4.2, { zone: 'Bredaseweg' }],
  [25, G, -13, 4.5],
  [12, G, -13, 4.5],
])(LV);

/** Index van het eerste punt met deze zone (om pads en items te plaatsen). */
export function routeIndex(zone) {
  return ROUTE.findIndex((p) => p[4]?.zone === zone);
}

// Centripetale Catmull-Rom (alpha = 0.5) door de punten, gesloten, in het
// xz-vlak. Geen lussen of uitschieters bij ongelijke puntafstanden.
function crPoint(P0, P1, P2, P3, u) {
  const d = (a, b) => Math.max(1e-4, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
  const t0 = 0, t1 = t0 + d(P0, P1), t2 = t1 + d(P1, P2), t3 = t2 + d(P2, P3);
  const t = t1 + (t2 - t1) * u;
  const lerp = (A, B, ta, tb) => {
    const wa = (tb - t) / (tb - ta), wb = (t - ta) / (tb - ta);
    return [A[0] * wa + B[0] * wb, A[1] * wa + B[1] * wb];
  };
  const A1 = lerp(P0, P1, t0, t1), A2 = lerp(P1, P2, t1, t2), A3 = lerp(P2, P3, t2, t3);
  const B1 = lerp(A1, A2, t0, t2), B2 = lerp(A2, A3, t1, t3);
  return lerp(B1, B2, t1, t2);
}

/**
 * Bemonstert de baan op vaste afstand (step meter). Geeft per monster
 * positie, vloerhoogte, halve breedte, richting, binnen/buiten, sprong en zone.
 */
export function sampleRoute(step = 0.5) {
  const W = ROUTE, n = W.length;
  const xz = (i) => [W[(i + n) % n][0], W[(i + n) % n][2]];

  // fijn langs elk segment, met booglengte per segment
  const SUB = 48;
  const dense = [];
  for (let i = 0; i < n; i++) {
    const P0 = xz(i - 1), P1 = xz(i), P2 = xz(i + 1), P3 = xz(i + 2);
    const pts = [];
    for (let k = 0; k < SUB; k++) pts.push(crPoint(P0, P1, P2, P3, k / SUB));
    pts.push(P2);
    let L = 0;
    const acc = [0];
    for (let k = 1; k < pts.length; k++) { L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); acc.push(L); }
    for (let k = 0; k < SUB; k++) dense.push({ x: pts[k][0], z: pts[k][1], seg: i, f: acc[k] / L, segLen: L });
  }
  // cumulatieve afstand
  let total = 0;
  dense[0].s = 0;
  for (let k = 1; k <= dense.length; k++) {
    const a = dense[k - 1], b = dense[k % dense.length];
    total += Math.hypot(b.x - a.x, b.z - a.z);
    if (k < dense.length) b.s = total;
  }

  const N = Math.round(total / step);
  const S = {
    N, total, step,
    x: new Float32Array(N), z: new Float32Array(N), y: new Float32Array(N), floor: new Float32Array(N),
    hw: new Float32Array(N), tx: new Float32Array(N), tz: new Float32Array(N),
    indoor: new Uint8Array(N), jump: new Uint8Array(N), seg: new Uint16Array(N), zone: new Array(N),
  };
  // zone per segment, doorgeschoven
  const zones = [];
  let zone = W[0][4]?.zone ?? '';
  for (let i = 0; i < n; i++) { if (W[i][4]?.zone) zone = W[i][4].zone; zones.push(zone); }

  let k = 0;
  for (let j = 0; j < N; j++) {
    const s = (j * total) / N;
    while (k + 1 < dense.length && dense[k + 1].s <= s) k++;
    const a = dense[k], b = dense[(k + 1) % dense.length];
    const sb = k + 1 < dense.length ? b.s : total;
    const u = sb > a.s ? (s - a.s) / (sb - a.s) : 0;
    S.x[j] = a.x + (b.x - a.x) * u;
    S.z[j] = a.z + (b.z - a.z) * u;
    const i = a.seg, i2 = (i + 1) % n;
    const f = a.seg === b.seg ? a.f + (b.f - a.f) * u : a.f + (1 - a.f) * u;
    const o = W[i][4] ?? {};
    const y = W[i][1] + (W[i2][1] - W[i][1]) * f;
    S.y[j] = o.jump ? W[i][1] + (W[i2][1] - W[i][1]) * f : y;
    S.floor[j] = o.jump ? W[i2][1] : y;
    S.hw[j] = W[i][3] + (W[i2][3] - W[i][3]) * f;
    S.indoor[j] = o.in ? 1 : 0;
    S.jump[j] = o.jump ? 1 : 0;
    S.seg[j] = i;
    S.zone[j] = zones[i];
  }
  for (let j = 0; j < N; j++) {
    const a = (j - 1 + N) % N, b = (j + 1) % N;
    const dx = S.x[b] - S.x[a], dz = S.z[b] - S.z[a];
    const L = Math.hypot(dx, dz) || 1;
    S.tx[j] = dx / L;
    S.tz[j] = dz / L;
  }
  return S;
}

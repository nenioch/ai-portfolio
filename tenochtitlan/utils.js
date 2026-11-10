/* Kleine hulpjes die de rest van het diorama deelt. */

window.MC = window.MC || {};

(function (MC) {
  'use strict';

  MC.clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  MC.lerp = (a, b, t) => a + (b - a) * t;

  MC.smoothstep = function (e0, e1, x) {
    const t = MC.clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // Gezaaide random, zodat de stad er bij elke herlaad hetzelfde uitziet.
  MC.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Deterministische ruis per roosterpunt: dezelfde (i, j, k) geeft altijd hetzelfde getal in 0..1.
  MC.hash = function (i, j, k) {
    let h = (i * 374761393 + j * 668265263 + (k || 0) * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  // Vloeiende waardenruis en een paar octaven daarvan, voor de bergen.
  MC.ruis = function (x, z) {
    const i = Math.floor(x), j = Math.floor(z);
    const fx = x - i, fz = z - j;
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const a = MC.hash(i, j), b = MC.hash(i + 1, j), c = MC.hash(i, j + 1), d = MC.hash(i + 1, j + 1);
    return MC.lerp(MC.lerp(a, b, u), MC.lerp(c, d, u), v);
  };

  MC.fbm = function (x, z, oct) {
    let s = 0, amp = 0.5, f = 1;
    for (let o = 0; o < (oct || 4); o++) {
      s += amp * MC.ruis(x * f, z * f);
      f *= 2.03;
      amp *= 0.5;
    }
    return s;
  };

  MC.$ = (sel) => document.querySelector(sel);

  // Typt de gebruiker in een invoerveld? Dan geen sneltoetsen afvuren.
  MC.inVeld = function (e) {
    const t = e.target;
    return !!t && (t.tagName === 'INPUT' && t.type !== 'range' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  };

  MC.bewegingBeperkt = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ------------------------------------------------------------ stadsplan
  /* Het eiland is een raster van blokken van 11 × 11 met brede kanalen
     ertussen. De assen x = 0 en z = 0 zijn de grote lanen die als dijkwegen
     het meer over lopen. Noord is -z, oost is +x. */
  const P = MC.PLAN = {
    SB: 11,          // maat van een blok
    PITCH: 12.6,     // blok + hoofdkanaal
    START: 2,        // eerste blok begint naast de laan
    RINGEN: 5,       // blokken per kwadrant, per richting
    KY: 0.31,        // bovenkant van een kavel
    DY: 0.5,         // bovenkant van lanen en dijkwegen
    PY: 0.6,         // vloer van het heilige plein
    PLY: 0.5,        // vloer van paleizen en marktpleinen
    R: 12.6,         // hartlijn van de slangenmuur
    MEER: 336,       // straal van het meer: daar begint de oever
    EIND: 343        // waar de dijkwegen de oever raken
  };
  P.KANALEN = [];
  for (let i = 0; i < P.RINGEN; i++) P.KANALEN.push(P.START + P.PITCH * i + P.SB + (P.PITCH - P.SB) / 2);
  P.RAND = P.START + P.PITCH * (P.RINGEN - 1) + P.SB;     // buitenrand van de stad

  // Rechthoek van blok (i, j) in kwadrant (sx, sz).
  MC.blokRect = function (sx, sz, i, j) {
    const a0 = P.START + P.PITCH * i, b0 = P.START + P.PITCH * j;
    const x0 = sx > 0 ? a0 : -(a0 + P.SB), z0 = sz > 0 ? b0 : -(b0 + P.SB);
    return { x0, x1: x0 + P.SB, z0, z1: z0 + P.SB, cx: x0 + P.SB / 2, cz: z0 + P.SB / 2 };
  };

  // De vier richtingen: naar buiten wijzende normaal.
  MC.ZIJDEN = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  // Positie op een zijde: r langs de normaal, t langs de raaklijn.
  MC.opZijde = (n, r, t) => [n[0] * r - n[1] * t, n[1] * r + n[0] * t];
  // Draaiing (om y) waarmee +z van een prefab langs richting (x, z) wijst.
  MC.draaiNaar = (x, z) => Math.atan2(x, z);
  // Lokaal punt (x, z) in een stelsel op (cx, cz), gedraaid met ry, naar wereldcoördinaten.
  MC.lokaal = function (cx, cz, ry, x, z) {
    const c = Math.cos(ry), s = Math.sin(ry);
    return [cx + x * c + z * s, cz - x * s + z * c];
  };
})(window.MC);

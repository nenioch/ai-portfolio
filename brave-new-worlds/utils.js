/* Kleine hulpjes die de rest van het spel deelt. Vrijwel gelijk aan die van
   maanbasis — geen reden om dit opnieuw te verzinnen. */

window.BNW = window.BNW || {};

(function (BNW) {
  'use strict';

  BNW.clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  BNW.lerp = (a, b, t) => a + (b - a) * t;

  BNW.smoothstep = function (e0, e1, x) {
    const t = BNW.clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // Deterministische ruis: dezelfde n geeft altijd hetzelfde getal in 0..1.
  BNW.hash = function (n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  // Gezaaide random, zodat de planeet er bij elke herlaad hetzelfde uitziet.
  BNW.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  BNW.$ = (sel) => document.querySelector(sel);

  // Typt de speler in een invoerveld? Dan geen sneltoetsen afvuren.
  BNW.inVeld = function (e) {
    const t = e.target;
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  };

  // Getal netjes tonen: 12.4 -> "12", 0.35 -> "0.4"
  BNW.getal = function (n) {
    if (Math.abs(n) >= 10) return String(Math.round(n));
    return (Math.round(n * 10) / 10).toString();
  };

  BNW.tekens = function (n) {
    const s = BNW.getal(Math.abs(n));
    return (n < -0.001 ? '−' : n > 0.001 ? '+' : '±') + s;
  };
})(window.BNW);

// Het binnenwerk langs de baan. Het kloostermodel heeft geen interieur (het
// hoofdgebouw is massief), dus hier staat een eigen, vereenvoudigde indeling
// binnen de muren van het model:
//
//   begane grond  zijdeur in het westelijke hoekblok, een gang onder de
//                 westvleugel door, ontvangsthal in de middenrisaliet,
//                 bordestrap in de oostvleugel
//   1e verdieping hal in de middenrisaliet, zoldertrap in de westvleugel
//   zolder        door de toren naar de oostvleugel, de zolderkamer met de
//                 grote dakkapel aan de tuinzijde
//
// Maten uit plan.js (vleugels, toren, gootlijst). De binnenwanden staan iets
// binnen de gevels; wat het model binnen die wanden heeft, wordt weggesneden
// (zie INSIDE_CUTS en cut.js).
import * as THREE from 'three';
import * as P from '../../rooi-harten-tilburg-3d/src/plan.js';
import { Batch, boxGeo, beamGeo, outline } from '../../rooi-harten-tilburg-3d/src/kit.js';
import { LV } from './route.js';

const { F0, F1, FL, FW, F2 } = LV;
const CEIL = 15.2;
const EAV = P.K.eaves;                         // 11.45: boven de goot springt de wand in
const XO = 23;                                 // binnenkant kopse wanden vleugels
const XT = 3;                                  // binnenkant toren
const ZF = 0.4, ZB = 12.6;                     // voor- en achterwand vleugels
const ZFu = 1.1, ZBu = 11.9;                   // idem op zolder, binnen het mansardedak
const ZT = -1.0;                               // voorwand toren
const DORMER_X = 3.4 + 20 * (4 + 0.5) / 6;     // grote dakkapel i = 4 van de oostvleugel (18,4)
// zijgang: van een zijdeur in de westgevel van het westelijke hoekblok onder
// de westvleugel door naar de ontvangsthal
const GX0 = -39.0, GZ0 = 7.8, GZ1 = 11.4, GH = 4.2;
const PAV_X = P.PAVILIONS[0].x0;               // westgevel hoekblok (-39,4)
const SIDE_Z = P.PAVILIONS[0].z0 + (P.PAVILIONS[0].z1 - P.PAVILIONS[0].z0) * 2.5 / 4;   // venster-as i = 2 (9,6)
const SIDE_W = 2.25, SIDE_H = 3.6;

/**
 * Ruimtes binnen de muren: daar mag van het model niets zichtbaar blijven.
 * De dozen steken 10 cm in de binnenwanden en overlappen elkaar, anders
 * blijven vlakken precies op de grens staan (zoals de bovenkant van de
 * muurmassa en de goot, allebei op gootlijsthoogte).
 */
export const INSIDE_CUTS = [
  [-XT, F0, ZT, XT, CEIL, ZB],
  [XT, F0, ZF, XO, EAV, ZB],
  [XT, EAV, ZFu, XO, CEIL, ZBu],
  [-XO, F1 - 0.2, ZF, -XT, EAV, ZB],
  [-XO, EAV, ZFu, -XT, CEIL, ZBu],
  [GX0, F0, GZ0, -XT, GH, GZ1],
].map(([x0, y0, z0, x1, y1, z1]) => ({ min: [x0 - 0.1, y0 - 0.1, z0 - 0.1], max: [x1 + 0.1, y1 + 0.1, z1 + 0.1] }));
/** Doorgangen door de schil: de zijdeur (het onderste venster wordt een deur) en de dakkapel. */
export const OPENING_CUTS = [
  { min: [PAV_X - 0.3, 0.2, SIDE_Z - SIDE_W / 2], max: [GX0 + 0.05, SIDE_H, SIDE_Z + SIDE_W / 2] },
  { min: [DORMER_X - 0.98, F2 - 0.15, ZBu - 0.1], max: [DORMER_X + 0.98, 13.75, 13.75] },
];

export function buildInterior(M) {
  const group = new THREE.Group();
  const b = new Batch();
  const box = (mat, x0, y0, z0, x1, y1, z1, wuv = true) => b.add(mat, boxGeo(x0, y0, z0, x1, y1, z1, wuv));
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  const wall = M.plaster;
  const loper = new THREE.MeshStandardMaterial({ color: '#8c1d24', roughness: 0.9 });
  const loperEdge = new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.5, metalness: 0.4 });
  const pane = new THREE.MeshBasicMaterial({ color: '#e6f2fb', toneMapped: false });
  const sheet = new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.95 });
  const blanket = new THREE.MeshStandardMaterial({ color: '#7d2a2a', roughness: 0.95 });

  // Wand met rechthoekige sparingen. axis 'x': de wand staat dwars op x
  // (dikte c0..c1 in x, lengte u in z); axis 'z': dwars op z (lengte u in x).
  function holed(mat, axis, c0, c1, u0, u1, v0, v1, holes) {
    const us = [u0, u1];
    for (const h of holes) us.push(Math.min(u1, Math.max(u0, h[0])), Math.min(u1, Math.max(u0, h[1])));
    const cuts = [...new Set(us)].sort((p, q) => p - q);
    for (let i = 0; i < cuts.length - 1; i++) {
      const ua = cuts[i], ub = cuts[i + 1];
      if (ub - ua < 1e-3) continue;
      const mid = (ua + ub) / 2;
      const gaps = holes.filter((h) => h[0] < mid && h[1] > mid).map((h) => [h[2], h[3]]).sort((p, q) => p[0] - q[0]);
      let v = v0;
      const emit = (va, vb) => {
        if (vb - va < 1e-3) return;
        if (axis === 'x') box(mat, c0, va, ua, c1, vb, ub);
        else box(mat, ua, va, c0, ub, vb, c1);
      };
      for (const [ga, gb] of gaps) { emit(v, Math.max(v, ga)); v = Math.max(v, gb); }
      emit(v, v1);
    }
  }

  // ---- buitenwanden (aan de binnenkant van de gevels) ------------------------
  box(wall, -XT - 0.2, F0, ZT - 0.2, XT + 0.2, CEIL, ZT);
  box(wall, XT, F0, ZT - 0.2, XT + 0.2, CEIL, ZF);
  box(wall, -XT - 0.2, F0, ZT - 0.2, -XT, CEIL, ZF);
  box(wall, -XT - 0.2, F0, ZB, XT + 0.2, CEIL, ZB + 0.2);
  for (const s of [-1, 1]) {
    const xa = s > 0 ? XT : -XO - 0.2, xb = s > 0 ? XO + 0.2 : -XT;
    const y0 = s > 0 ? F0 : F1 - 0.2;
    box(wall, xa, y0, ZF - 0.2, xb, EAV, ZF);                                // voorgevel
    box(wall, xa, EAV, ZFu - 0.2, xb, CEIL, ZFu);                            // knieschot voor
    box(wall, xa, EAV, ZF - 0.2, xb, EAV + 0.2, ZFu);                        // richel
    box(wall, xa, y0, ZB, xb, EAV, ZB + 0.2);                                // achtergevel
    if (s > 0) holed(wall, 'z', ZBu, ZBu + 0.2, xa, xb, EAV, CEIL, [[DORMER_X - 0.98, DORMER_X + 0.98, F2, 13.75]]);
    else box(wall, xa, EAV, ZBu, xb, CEIL, ZBu + 0.2);
    box(wall, xa, EAV, ZBu, xb, EAV + 0.2, ZB + 0.2);
    const xe = s > 0 ? XO : -XO - 0.2;
    box(wall, xe, y0, ZF - 0.2, xe + 0.2, CEIL, ZB + 0.2);                  // kopse wand
    box(wall, xa, CEIL, ZFu - 0.15, xb, CEIL + 0.1, ZBu + 0.15);             // plafond
  }
  box(wall, -XT - 0.2, CEIL, ZT - 0.2, XT + 0.2, CEIL + 0.2, ZB + 0.2);

  // ---- vloeren --------------------------------------------------------------
  box(M.floorTiles, -XT, 0.05, ZT, XT, F0, ZB);
  box(M.granite, XT, 0.05, ZF, XO, F0, ZB);
  box(M.oak, -XO, F1 - 0.2, ZF, -XT, F1, ZB);
  box(M.oak, -XT, F1 - 0.2, ZT, XT, F1, ZB);                                 // eerste verdieping toren
  box(M.oak, -XT, 11.3, ZT, XT, F2, ZB);                                     // zolder toren
  box(M.oak, XT, 11.3, ZF, XO, F2, ZB);                                      // zolder oostvleugel

  // ---- scheidingswanden toren / vleugels -------------------------------------
  holed(wall, 'x', XT - 0.1, XT + 0.1, ZF, ZB, F0, CEIL, [
    [6.8, 12.4, F0, 4.6], [0.6, 6.0, F1, 10.0], [5.6, ZBu - 0.05, F2, 14.6],
  ]);
  holed(wall, 'x', -XT - 0.1, -XT + 0.1, ZF, ZB, F0, CEIL, [
    [GZ0, GZ1, F0, GH], [0.6, 6.0, F1, 10.0], [7.0, ZBu - 0.05, F2, 14.6],
  ]);

  // ---- zijgang ----------------------------------------------------------------
  box(M.floorTiles, GX0, 0.05, GZ0, -XT - 0.1, F0, GZ1);
  box(wall, GX0 - 0.2, GH, GZ0 - 0.2, -XT - 0.1, GH + 0.2, GZ1 + 0.2);
  box(wall, GX0 - 0.2, F0, GZ0 - 0.2, -XT - 0.1, GH, GZ0);
  box(wall, GX0 - 0.2, F0, GZ1, -XT - 0.1, GH, GZ1 + 0.2);
  holed(wall, 'x', GX0 - 0.2, GX0, GZ0 - 0.2, GZ1 + 0.2, F0, GH + 0.2, [[SIDE_Z - SIDE_W / 2, SIDE_Z + SIDE_W / 2, F0, SIDE_H]]);
  // dagkanten, latei en dorpel van de zijdeur
  for (const z of [SIDE_Z - SIDE_W / 2 - 0.18, SIDE_Z + SIDE_W / 2]) box(M.brickDark, PAV_X - 0.2, 0.05, z, GX0, SIDE_H, z + 0.18);
  box(M.stone, PAV_X - 0.2, SIDE_H, SIDE_Z - SIDE_W / 2 - 0.18, GX0, SIDE_H + 0.2, SIDE_Z + SIDE_W / 2 + 0.18);
  box(M.granite, PAV_X - 0.2, 0.05, SIDE_Z - SIDE_W / 2, GX0, F0, SIDE_Z + SIDE_W / 2);
  // lambrisering, loper, gesloten deuren en lampen langs de gang
  for (const [z0, z1] of [[GZ0, GZ0 + 0.05], [GZ1 - 0.05, GZ1]]) box(M.oak, GX0, F0, z0, -XT - 0.1, F0 + 1.0, z1);
  box(loper, GX0 + 0.2, F0, SIDE_Z - 0.75, -XT - 0.2, F0 + 0.01, SIDE_Z + 0.75);
  for (let x = -35; x < -5; x += 7) {
    for (const [z0, z1] of [[GZ0 + 0.05, GZ0 + 0.1], [GZ1 - 0.1, GZ1 - 0.05]]) {
      box(M.oakDoor, x - 0.5, F0, z0, x + 0.5, F0 + 2.3, z1);
      box(M.gold, x + 0.3, F0 + 1.0, Math.min(z0, z1) - 0.03, x + 0.38, F0 + 1.08, Math.max(z0, z1) + 0.03, false);
    }
    b.add(M.bulb, boxGeo(x + 3.0, GH - 0.08, SIDE_Z - 0.3, x + 3.6, GH, SIDE_Z + 0.3, false));
  }

  // ---- trappen ----------------------------------------------------------------
  // Treden staan onder de schuine lijn van het rijvlak; de loper ligt erop.
  function stair(xa, xb, z0, z1, ya, yb, base, zc) {
    const n = Math.max(2, Math.ceil(Math.abs(yb - ya) / 0.17));
    for (let k = 0; k < n; k++) {
      const x0 = xa + (xb - xa) * k / n, x1 = xa + (xb - xa) * (k + 1) / n;
      const top = Math.min(ya + (yb - ya) * k / n, ya + (yb - ya) * (k + 1) / n);
      if (top - base > 0.01) box(M.marble, Math.min(x0, x1), base, z0, Math.max(x0, x1), top, z1);
    }
    b.add(loper, beamGeo(V(xa, ya - 0.02, zc), V(xb, yb - 0.02, zc), 3.0, 0.06));
    for (const s of [-1, 1]) b.add(loperEdge, beamGeo(V(xa, ya - 0.01, zc + s * 1.55), V(xb, yb - 0.01, zc + s * 1.55), 0.1, 0.06));
  }
  // oostvleugel: van de hal naar de eerste verdieping
  stair(5, 17, 6.7, ZB, F0, FL, F0, 9.6);
  box(M.marble, 17, F0, ZF, XO, FL, ZB);
  stair(17, 5, ZF, 6.1, FL, F1, F0, 3.4);
  box(M.marble, XT + 0.1, F0, ZF, 5, F1, 6.1);
  // westvleugel: van de eerste verdieping naar de zolder
  stair(-5, -17, ZF, 6.1, F1, FW, F1, 3.4);
  box(M.marble, -XO, F1, ZF, -17, FW, ZB);
  stair(-17, -5, 6.7, ZB, FW, F2, F1, 9.6);
  box(M.marble, -5, F1, 6.7, -XT - 0.1, F2, ZB);
  // rond rustkleed op de bordessen
  for (const [x, y] of [[20, FL], [-20, FW]]) {
    b.add(loper, new THREE.CylinderGeometry(2.6, 2.6, 0.03, 40).translate(x, y + 0.005, 6.5));
  }

  // tussenwanden tussen de traparmen, met leuning en trappaal
  for (const s of [-1, 1]) {
    const xa = s > 0 ? XT + 0.1 : -17, xb = s > 0 ? 17 : -XT - 0.1;
    const y0 = s > 0 ? F0 : F1, top = s > 0 ? 7.6 : 12.8;
    box(wall, xa, y0, 6.1, xb, top, 6.7);
    box(M.oak, xa, top, 6.02, xb + (s > 0 ? 0.2 : 0), top + 0.12, 6.78);
    const xp = s > 0 ? 17.05 : -17.05;
    box(M.oak, xp - 0.25, y0, 6.0, xp + 0.25, top + 0.6, 6.8);
    b.add(M.gold, new THREE.SphereGeometry(0.2, 14, 10).translate(xp, top + 0.8, 6.4));
  }

  // ---- zolderkamer -----------------------------------------------------------
  holed(wall, 'x', 12.4, 12.6, ZFu, ZBu, F2, CEIL, [[4.3, 9.0, F2, 14.2]]);
  // bed
  box(M.oak, 20.3, F2, 1.3, 22.95, F2 + 0.45, 3.7);
  box(sheet, 20.4, F2 + 0.45, 1.4, 22.85, F2 + 0.68, 3.6);
  box(blanket, 20.4, F2 + 0.6, 1.4, 22.0, F2 + 0.74, 3.62);
  box(sheet, 22.2, F2 + 0.68, 1.7, 22.8, F2 + 0.86, 3.3);
  box(M.oak, 22.85, F2, 1.3, 22.98, F2 + 1.3, 3.7);
  // kast, tafeltje, kruisbeeld
  box(M.oak, 13.0, F2, 10.55, 14.7, F2 + 2.3, ZBu);
  box(M.dark, 13.84, F2 + 0.2, 10.5, 13.86, F2 + 2.1, 10.55);
  box(M.oak, 21.6, F2, 9.4, 22.9, F2 + 0.75, 11.2);
  box(M.oak, 22.92, 13.0, 7.45, 22.98, 14.4, 7.55);
  box(M.oak, 22.92, 13.75, 7.1, 22.98, 13.85, 7.9);
  b.add(M.gold, new THREE.CapsuleGeometry(0.05, 0.5, 4, 8).translate(22.9, 13.75, 7.5));
  b.add(loper, new THREE.CylinderGeometry(2.2, 2.2, 0.03, 32).scale(1.3, 1, 1).translate(17, F2 + 0.005, 6.5));

  // ---- zolder: gebinten en wat spullen ----------------------------------------
  for (let x = -21.5; x <= 21.5; x += 2.5) {
    box(M.oak, x - 0.12, CEIL - 0.32, ZFu, x + 0.12, CEIL, ZBu);
  }
  for (const [x0, z0, x1, z1, h] of [[0.5, 1.2, 2.0, 2.6, 0.8], [5.5, 1.2, 6.6, 2.3, 1.1], [6.8, 1.2, 7.6, 2.0, 0.6], [9.5, 1.2, 11.5, 2.2, 0.9]]) {
    box(M.oak, x0, F2, z0, x1, F2 + h, z1);
  }

  // ---- ramen van binnen: lichte vlakken achter de vensters van het model ------
  function paneAt(x, y, z, w, h, facing, kind = 'seg') {
    const g = new THREE.ShapeGeometry(new THREE.Shape(outline(kind, w, h)));
    if (facing < 0) g.rotateY(Math.PI);
    g.translate(x, y, z + facing * 0.012);
    b.add(pane, g);
    const fz = z + facing * 0.03;
    const vtop = kind === 'rect' ? h : h - (kind === 'round' ? w / 2 : 0.17 * w);
    box(M.frame, x - 0.04, y, Math.min(z, fz), x + 0.04, y + vtop, Math.max(z, fz), false);
    box(M.frame, x - w / 2, y + vtop * 0.7 - 0.04, Math.min(z, fz), x + w / 2, y + vtop * 0.7 + 0.04, Math.max(z, fz), false);
    box(M.stone, x - w / 2 - 0.1, y - 0.12, Math.min(z, z + facing * 0.25), x + w / 2 + 0.1, y, Math.max(z, z + facing * 0.25), false);
  }
  for (let i = 0; i < 6; i++) {
    const xe = 3.4 + 20 * (i + 0.5) / 6;
    for (const x of [xe, -xe]) {
      if (x > 0) { paneAt(x, P.K.sill1, ZF, 1.6, P.K.win1, 1); paneAt(x, P.K.sill1, ZB, 1.6, P.K.win1, -1); }
      paneAt(x, P.K.sill2, ZF, 1.6, P.K.win2, 1);
      paneAt(x, P.K.sill2, ZB, 1.6, P.K.win2, -1);
    }
    if (i % 2 === 0) {
      for (const x of [xe, -xe]) {
        paneAt(x, F2 + 0.05, ZFu, 1.6, 1.8, 1, 'rect');
        if (Math.abs(x - DORMER_X) > 0.1) paneAt(x, F2 + 0.05, ZBu, 1.6, 1.8, -1, 'rect');
      }
    }
  }
  for (const x of [-1, 1]) paneAt(x, P.K.sill2, ZT, 1.6, P.K.win2, 1, 'round');

  // dagkanten van de dakkapel
  for (const s of [-1, 1]) box(M.woodYellow, DORMER_X + s * 0.98 - (s > 0 ? 0 : 0.08), F2, ZBu, DORMER_X + s * 0.98 + (s > 0 ? 0.08 : 0), 13.75, 12.9);
  box(M.woodYellow, DORMER_X - 1.06, F2 - 0.1, ZBu, DORMER_X + 1.06, F2, 12.9);

  // ---- lambrisering in de hal ---------------------------------------------------
  const dado = (x0, z0, x1, z1) => box(M.oak, x0, F0, z0, x1, F0 + 1.1, z1);
  dado(-XT, ZT, XT, ZT + 0.05);
  dado(-XT, ZT, -XT + 0.05, GZ0);
  dado(-XT, GZ1, -XT + 0.05, ZB);
  dado(XT - 0.05, ZT, XT, 6.8);
  dado(-XT, ZB - 0.05, XT, ZB);

  // ---- Heilig-Hartbeeld in de hal, binnen voor de (gesloten) voordeur -------------
  {
    const x = 0, z = 0.2;
    box(M.stone, x - 0.55, F0, z - 0.55, x + 0.55, F0 + 1.2, z + 0.55);
    b.add(M.whiteStone, new THREE.CapsuleGeometry(0.28, 1.1, 4, 12).translate(x, F0 + 2.05, z));
    b.add(M.whiteStone, new THREE.SphereGeometry(0.18, 12, 10).translate(x, F0 + 2.95, z));
    b.add(M.taillight, new THREE.SphereGeometry(0.09, 10, 8).translate(x, F0 + 2.3, z + 0.26));
    b.add(M.gold, new THREE.TorusGeometry(0.25, 0.02, 6, 24).translate(x, F0 + 3.0, z - 0.04));
  }

  // ---- schilderijen -----------------------------------------------------------------
  const paintings = [
    // [x, y, z, breedte, hoogte, kijkrichting ('+x', '-x', '+z', '-z'), soort]
    [0, 7.3, ZB, 2.8, 3.2, '-z', 'heart'],
    [XO, 4.6, 6.5, 3.4, 2.4, '-x', 'land'],
    [9, 4.0, ZB, 1.6, 2.1, '-z', 'portrait'],
    [13.5, 5.4, ZB, 1.6, 2.1, '-z', 'portrait2'],
    [-XO, 10.4, 6.5, 3.4, 2.4, '+x', 'land2'],
    [-11, 11.6, ZB, 1.6, 2.1, '-z', 'portrait'],
    [-2.95, 2.4, 4.5, 1.6, 2.0, '+x', 'portrait2'],
  ];
  for (const [x, y, z, w, h, dir, kind] of paintings) {
    const mat = new THREE.MeshStandardMaterial({ map: paintingTex(kind), roughness: 0.7 });
    const g = new THREE.PlaneGeometry(w, h);
    const fr = 0.12;
    if (dir === '-z') { g.rotateY(Math.PI); g.translate(x, y + h / 2, z - 0.06); box(M.gold, x - w / 2 - fr, y - fr, z - 0.05, x + w / 2 + fr, y + h + fr, z, false); }
    if (dir === '+z') { g.translate(x, y + h / 2, z + 0.06); box(M.gold, x - w / 2 - fr, y - fr, z, x + w / 2 + fr, y + h + fr, z + 0.05, false); }
    if (dir === '-x') { g.rotateY(-Math.PI / 2); g.translate(x - 0.06, y + h / 2, z); box(M.gold, x - 0.05, y - fr, z - w / 2 - fr, x, y + h + fr, z + w / 2 + fr, false); }
    if (dir === '+x') { g.rotateY(Math.PI / 2); g.translate(x + 0.06, y + h / 2, z); box(M.gold, x, y - fr, z - w / 2 - fr, x + 0.05, y + h + fr, z + w / 2 + fr, false); }
    const mesh = new THREE.Mesh(g, mat);
    group.add(mesh);
  }

  // ---- kroonluchters en lampen ---------------------------------------------------
  const lights = [];
  function chandelier(x, y, z, r) {
    b.add(M.iron, boxGeo(x - 0.02, y, z - 0.02, x + 0.02, y + 1.0, z + 0.02, false));
    b.add(M.gold, new THREE.TorusGeometry(r, 0.04, 6, 32).rotateX(Math.PI / 2).translate(x, y, z));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      b.add(M.bulb, new THREE.SphereGeometry(0.09, 8, 6).translate(x + Math.cos(a) * r, y + 0.12, z + Math.sin(a) * r));
    }
  }
  function light(x, y, z, intensity = 30, dist = 22) {
    const l = new THREE.PointLight(0xffe2b8, intensity, dist, 1.6);
    l.position.set(x, y, z);
    group.add(l);
    lights.push(l);
  }
  chandelier(0, 5.0, 4.5, 0.8); light(0, 4.6, 4.5);
  light(-30, 3.7, SIDE_Z, 16, 14);
  light(-14, 3.7, SIDE_Z, 16, 14);
  chandelier(0, 10.2, 7.5, 1.0); light(0, 9.8, 6.5);
  chandelier(12, 10.0, 6.4, 0.8); light(12, 9.6, 6.4, 40);
  chandelier(-12, 14.0, 6.4, 0.8); light(-12, 13.6, 6.4, 40);
  light(3, 14.6, 7, 22, 16);
  b.add(M.bulb, new THREE.SphereGeometry(0.16, 10, 8).translate(17.5, 14.75, 6.5));
  light(17.5, 14.4, 6.5, 22, 16);

  for (const m of b.flush(group)) { m.castShadow = true; m.receiveShadow = true; }
  return { group, lights };
}

// Kleine schilderijen, op een canvas getekend.
function paintingTex(kind) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const W = 256;
  if (kind === 'heart') {
    const bg = g.createRadialGradient(W / 2, W / 2, 10, W / 2, W / 2, W * 0.7);
    bg.addColorStop(0, '#6a3a1e'); bg.addColorStop(1, '#1d120c');
    g.fillStyle = bg; g.fillRect(0, 0, W, W);
    g.strokeStyle = 'rgba(232,190,90,.55)'; g.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * 40, W / 2 + Math.sin(a) * 40); g.lineTo(W / 2 + Math.cos(a) * 120, W / 2 + Math.sin(a) * 120); g.stroke();
    }
    g.fillStyle = '#b3171f';
    g.beginPath();
    g.moveTo(W / 2, W * 0.72);
    g.bezierCurveTo(W * 0.18, W * 0.5, W * 0.3, W * 0.22, W / 2, W * 0.38);
    g.bezierCurveTo(W * 0.7, W * 0.22, W * 0.82, W * 0.5, W / 2, W * 0.72);
    g.fill();
    g.fillStyle = '#f0c75a';
    g.fillRect(W / 2 - 4, W * 0.18, 8, 34); g.fillRect(W / 2 - 14, W * 0.22, 28, 7);
  } else if (kind.startsWith('land')) {
    const sky = g.createLinearGradient(0, 0, 0, W);
    sky.addColorStop(0, kind === 'land' ? '#8fb3d2' : '#e2a466'); sky.addColorStop(0.6, '#e8dcc0');
    g.fillStyle = sky; g.fillRect(0, 0, W, W);
    g.fillStyle = '#5b7a35'; g.fillRect(0, W * 0.62, W, W);
    g.fillStyle = '#7a3a2b'; g.fillRect(W * 0.2, W * 0.42, W * 0.6, W * 0.22);
    g.fillStyle = '#3e444c';
    g.beginPath(); g.moveTo(W * 0.17, W * 0.43); g.lineTo(W * 0.5, W * 0.3); g.lineTo(W * 0.83, W * 0.43); g.fill();
    g.fillRect(W * 0.47, W * 0.12, W * 0.06, W * 0.2);
    g.beginPath(); g.moveTo(W * 0.45, W * 0.14); g.lineTo(W * 0.5, W * 0.02); g.lineTo(W * 0.55, W * 0.14); g.fill();
    g.fillStyle = '#e4cf8a';
    for (let i = 0; i < 6; i++) g.fillRect(W * (0.25 + i * 0.09), W * 0.5, 9, 14);
  } else {
    const bg = g.createLinearGradient(0, 0, W, W);
    bg.addColorStop(0, kind === 'portrait' ? '#3a2a20' : '#22303a'); bg.addColorStop(1, '#0f0c0a');
    g.fillStyle = bg; g.fillRect(0, 0, W, W);
    g.fillStyle = '#141414';
    g.beginPath(); g.ellipse(W / 2, W * 0.95, W * 0.38, W * 0.45, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#f2f0ea'; g.fillRect(W / 2 - 14, W * 0.52, 28, 12);
    g.fillStyle = '#d9a983';
    g.beginPath(); g.ellipse(W / 2, W * 0.38, W * 0.13, W * 0.17, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = kind === 'portrait' ? '#9a9a9a' : '#4a3020';
    g.beginPath(); g.ellipse(W / 2, W * 0.27, W * 0.14, W * 0.07, 0, Math.PI, 0); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

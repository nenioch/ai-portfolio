// Gaten in het kloostermodel. Het hoofdgebouw is in het model massief (een
// doos per bouwdeel, ramen als opleg), dus waar de baan naar binnen gaat
// snijden we de schil weg: elk fragment dat binnen een van de dozen valt
// wordt niet getekend. De meshes krijgen daarvoor een eigen kopie van hun
// materiaal; de kapel en het binnenwerk, die dezelfde materialen delen,
// blijven heel.
import * as THREE from 'three';

/** box: { min: [x, y, z], max: [x, y, z] } in wereldcoördinaten. */
export function cutOut(group, boxes) {
  const n = boxes.length;
  const mins = boxes.map((b) => new THREE.Vector3(...b.min));
  const maxs = boxes.map((b) => new THREE.Vector3(...b.max));
  const key = 'cut' + boxes.map((b) => b.min.join(',') + b.max.join(',')).join('|');

  const patch = (mat) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.cutMin = { value: mins };
      sh.uniforms.cutMax = { value: maxs };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCutPos;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvCutPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vCutPos;\nuniform vec3 cutMin[${n}];\nuniform vec3 cutMax[${n}];`)
        .replace('#include <clipping_planes_fragment>', `
          for (int i = 0; i < ${n}; i++) {
            if (all(greaterThan(vCutPos, cutMin[i])) && all(lessThan(vCutPos, cutMax[i]))) discard;
          }
          #include <clipping_planes_fragment>`);
    };
    mat.customProgramCacheKey = () => key;
    return mat;
  };

  const clones = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    if (!clones.has(o.material)) clones.set(o.material, patch(o.material.clone()));
    o.material = clones.get(o.material);
    // ook de schaduw volgt het gat, anders valt er geen licht door de deur
    if (!o.material.transparent && !o.material.alphaTest) {
      o.customDepthMaterial = patch(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
    }
  });
}

/**
 * Haalt de uitsparingen uit de botsingsboxen (alleen in het grondvlak): een
 * box die een uitsparing raakt wordt vervangen door de stukken eromheen.
 */
export function subtractColliders(colliders, boxes) {
  let list = colliders;
  for (const b of boxes) {
    const [x0, y0, z0] = b.min, [x1, y1, z1] = b.max;
    const out = [];
    for (const c of list) {
      const hit = c.x0 < x1 && c.x1 > x0 && c.z0 < z1 && c.z1 > z0 && c.y0 < y1 && c.y1 > y0;
      if (!hit) { out.push(c); continue; }
      const piece = (a, b2, c2, d) => { if (b2 - a > 0.02 && d - c2 > 0.02) out.push({ ...c, x0: a, x1: b2, z0: c2, z1: d }); };
      piece(c.x0, x0, c.z0, c.z1);                                  // links
      piece(x1, c.x1, c.z0, c.z1);                                  // rechts
      piece(Math.max(c.x0, x0), Math.min(c.x1, x1), c.z0, z0);      // ervoor
      piece(Math.max(c.x0, x0), Math.min(c.x1, x1), z1, c.z1);      // erachter
    }
    list = out;
  }
  return list;
}

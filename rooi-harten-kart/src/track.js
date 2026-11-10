// De baan in de scène: asfaltstrook met rood-witte kerbs waar hij buiten
// ligt, de startboog, boostpads en itemblokken. Plus het opzoeken van de
// plek van een kart op de middenlijn.
import * as THREE from 'three';
import { sampleRoute, ROUTE } from './route.js';

export class Track {
  constructor(M) {
    this.S = sampleRoute(0.5);
    this.group = new THREE.Group();
    this.buildRibbon(M);
    this.buildStart();

    // boostpads en rijen itemblokken staan als opties bij de punten van de route
    const at = (i, ahead = 0) => (this.firstOf(i) + Math.round(ahead / this.S.step)) % this.S.N;
    this.pads = [];
    this.itemRows = [];
    ROUTE.forEach((p, i) => {
      const o = p[4] ?? {};
      if (o.pad !== undefined) this.pads.push(this.addPad(at(i, o.pad)));
      if (o.items !== undefined) this.itemRows.push(at(i, o.items));
    });
  }

  /** Eerste monster van segment i. */
  firstOf(i) {
    const S = this.S;
    for (let j = 0; j < S.N; j++) if (S.seg[j] === i) return j;
    return 0;
  }

  /** Dichtstbijzijnde monster rond het vorige, binnen ook op hoogte. */
  nearest(prev, x, y, z, back = 40, ahead = 90) {
    const S = this.S, N = S.N;
    let best = prev, bd = Infinity;
    for (let k = -back; k <= ahead; k++) {
      const j = (prev + k + N) % N;
      const dx = x - S.x[j], dz = z - S.z[j];
      let d = dx * dx + dz * dz;
      if (S.indoor[j]) { const dy = y - S.floor[j]; d += dy * dy * 4; }
      if (d < bd) { bd = d; best = j; }
    }
    return best;
  }

  /** Volledig zoeken, voor het plaatsen. */
  nearestAll(x, y, z) {
    return this.nearest(0, x, y, z, 0, this.S.N - 1);
  }

  point(j, lateral = 0, out = new THREE.Vector3()) {
    const S = this.S;
    j = ((j % S.N) + S.N) % S.N;
    return out.set(S.x[j] - S.tz[j] * lateral, S.floor[j], S.z[j] + S.tx[j] * lateral);
  }

  buildRibbon(M) {
    const S = this.S, N = S.N;
    const asphalt = new THREE.MeshStandardMaterial({
      map: M.asphalt.map, color: '#8e9096', roughness: 0.92,
    });
    const red = new THREE.MeshStandardMaterial({ color: '#c42a22', roughness: 0.6 });
    const white = new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: 0.6 });
    const road = [], roadUV = [], kerbs = [[], []];
    const out = (j) => !S.indoor[j];
    const edge = (j, l, y) => [S.x[j] - S.tz[j] * l, y, S.z[j] + S.tx[j] * l];
    const quad = (arr, a, b, c, d) => arr.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let j = 0; j < N; j++) {
      const k = (j + 1) % N;
      if (!out(j) || !out(k)) continue;
      const ya = S.floor[j], yb = S.floor[k];
      const ha = S.hw[j], hb = S.hw[k];
      // links = -lateraal; de normaal moet omhoog wijzen
      const aL = edge(j, ha, ya), aR = edge(j, -ha, ya), bL = edge(k, hb, yb), bR = edge(k, -hb, yb);
      quad(road, aR, aL, bL, bR);
      const va = j * S.step, vb = (j + 1) * S.step;
      roadUV.push(0, va, 2 * ha, va, 2 * hb, vb, 0, va, 2 * hb, vb, 0, vb);
      const col = Math.floor(j * S.step / 1.5) % 2;
      for (const s of [-1, 1]) {
        const i0a = edge(j, s * (ha - 0.1), ya + 0.012), i1a = edge(j, s * (ha + 0.45), ya + 0.012);
        const i0b = edge(k, s * (hb - 0.1), yb + 0.012), i1b = edge(k, s * (hb + 0.45), yb + 0.012);
        if (s > 0) quad(kerbs[col], i0a, i1a, i1b, i0b); else quad(kerbs[col], i1a, i0a, i0b, i1b);
      }
    }
    const mk = (pos, uv, mat) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat);
      m.receiveShadow = true;
      this.group.add(m);
    };
    mk(road, roadUV, asphalt);
    mk(kerbs[0], null, red);
    mk(kerbs[1], null, white);
  }

  buildStart() {
    const S = this.S, j = 0;
    const hw = S.hw[j];
    const yaw = Math.atan2(S.tx[j], S.tz[j]);
    // geblokte startlijn
    const c = document.createElement('canvas');
    c.width = 256; c.height = 32;
    const g = c.getContext('2d');
    for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) {
      g.fillStyle = (x + y) % 2 ? '#111' : '#f4f4f4';
      g.fillRect(x * 16, y * 16, 16, 16);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(2 * hw, 1.2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
    line.rotation.y = yaw;
    line.position.set(S.x[j], S.floor[j] + 0.015, S.z[j]);
    this.group.add(line);

    // startboog over de Bredaseweg
    const arch = new THREE.Group();
    arch.position.set(S.x[j], 0, S.z[j]);
    arch.rotation.y = yaw;
    const post = new THREE.MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.5, metalness: 0.5 });
    const span = hw + 1.0;
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 6.2, 10), post);
      p.position.set(s * span, 3.1, 0);
      p.castShadow = true;
      arch.add(p);
    }
    const bc = document.createElement('canvas');
    bc.width = 1024; bc.height = 128;
    const bg = bc.getContext('2d');
    bg.fillStyle = '#b3171f'; bg.fillRect(0, 0, 1024, 128);
    bg.fillStyle = '#f6efe2'; bg.fillRect(0, 8, 1024, 4); bg.fillRect(0, 116, 1024, 4);
    bg.font = 'bold 76px "Segoe UI", system-ui, sans-serif';
    bg.textAlign = 'center'; bg.textBaseline = 'middle';
    bg.fillStyle = '#ffffff';
    bg.fillText('♥  ROOI HARTEN KART  ♥', 512, 68);
    const btex = new THREE.CanvasTexture(bc);
    btex.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.BoxGeometry(2 * span, 1.1, 0.12), [
      post, post, post, post,
      new THREE.MeshStandardMaterial({ map: btex, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ map: btex, roughness: 0.6 }),
    ]);
    banner.position.set(0, 5.5, 0);
    banner.castShadow = true;
    arch.add(banner);
    this.group.add(arch);
  }

  addPad(j) {
    const S = this.S;
    if (!Track.padTex) {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 192;
      const g = c.getContext('2d');
      g.fillStyle = '#ff8a00'; g.fillRect(0, 0, 128, 192);
      g.fillStyle = '#ffe14a';
      for (let i = 0; i < 3; i++) {
        const y = 150 - i * 52;
        g.beginPath(); g.moveTo(14, y); g.lineTo(64, y - 40); g.lineTo(114, y); g.lineTo(114, y + 22); g.lineTo(64, y - 18); g.lineTo(14, y + 22); g.fill();
      }
      Track.padTex = new THREE.CanvasTexture(c);
      Track.padTex.colorSpace = THREE.SRGBColorSpace;
    }
    const mat = new THREE.MeshBasicMaterial({ map: Track.padTex, toneMapped: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.6).rotateX(-Math.PI / 2), mat);
    m.rotation.y = Math.atan2(S.tx[j], S.tz[j]) + Math.PI;
    m.position.set(S.x[j], S.floor[j] + 0.03, S.z[j]);
    this.group.add(m);
    return { j, mesh: m };
  }

  /** Naam van het gebied bij monster j. */
  zone(j) { return this.S.zone[j]; }

  /** Waypoints, voor de minimap en tests. */
  get route() { return ROUTE; }
}

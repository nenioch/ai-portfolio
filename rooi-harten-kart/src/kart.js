// De karts: een eenvoudig model en arcade-fysica (gas, remmen, sturen,
// driften met mini-turbo, springen, gras, botsen).
import * as THREE from 'three';

export const KART = {
  vmax: 21,            // m/s, ~75 km/u
  accel: 15,
  brake: 28,
  reverse: 6,
  turn: 2.7,           // rad/s bij lage snelheid
  grip: 10,
  driftGrip: 2.6,
  gravity: 16,         // iets minder dan echt: langer zweven na het zolderraam
  radius: 0.75,
  half: 0.62,          // halve breedte tegen de wanden
  boostMul: 1.45,
};

/** Ruimtelijk raster over de botsingsboxen van het kloostermodel. */
export class ColliderGrid {
  constructor(list, cell = 8) {
    this.cell = cell;
    this.map = new Map();
    for (const c of list) {
      for (let i = Math.floor(c.x0 / cell); i <= Math.floor(c.x1 / cell); i++) {
        for (let k = Math.floor(c.z0 / cell); k <= Math.floor(c.z1 / cell); k++) {
          const key = i * 4096 + k;
          if (!this.map.has(key)) this.map.set(key, []);
          this.map.get(key).push(c);
        }
      }
    }
  }
  near(x, z) {
    return this.map.get(Math.floor(x / this.cell) * 4096 + Math.floor(z / this.cell)) ?? [];
  }
}

export class Kart {
  constructor({ name, color, suit, skin = '#e0b48f', hat }) {
    this.name = name;
    this.color = color;
    this.mesh = buildKartMesh(color, suit, skin, hat ?? color);
    this.pos = new THREE.Vector3();
    this.h = 0;
    this.vx = 0; this.vz = 0; this.vy = 0;
    this.grounded = true;
    this.idx = 0;            // monster op de baan
    this.lat = 0;            // zijwaartse afstand tot de middenlijn
    this.dist = 0;           // afgelegde baanmonsters sinds de start
    this.boost = 0;
    this.drift = 0;          // -1 / 0 / 1
    this.charge = 0;
    this.spin = 0;
    this.item = null;
    this.offroad = false;
    this.indoor = false;
    this.finished = false;
    this.finishTime = 0;
    this.lapTimes = [];
    this.speedMul = 1;       // inhaalhulp voor de computer
    this.stuck = 0;
    this.respawns = 0;
    this.wallHits = 0;
    this.airTime = 0;
    this.pitch = 0;
    this.bump = 0;
  }

  get speed() { return Math.hypot(this.vx, this.vz); }
  get fwd() { return [Math.sin(this.h), Math.cos(this.h)]; }

  place(track, j, lateral = 0, back = 0) {
    const S = track.S;
    const jj = ((j - Math.round(back / S.step)) % S.N + S.N) % S.N;
    const rx = -S.tz[jj], rz = S.tx[jj];
    this.pos.set(S.x[jj] + rx * lateral, S.floor[jj], S.z[jj] + rz * lateral);
    this.h = Math.atan2(S.tx[jj], S.tz[jj]);
    this.vx = this.vz = this.vy = 0;
    this.idx = jj;
    this.grounded = true;
    this.boost = 0; this.drift = 0; this.charge = 0; this.spin = 0;
    this.syncMesh(track, 0);
  }

  respawn(track) {
    // terug naar het midden van de baan, iets terug, nooit midden in de sprong
    let j = this.idx;
    const S = track.S;
    for (let k = 0; k < 80 && S.jump[j]; k++) j = (j - 1 + S.N) % S.N;
    (this.respawnLog ??= []).push(`${S.seg[this.idx]}@${this.pos.x.toFixed(1)},${this.pos.y.toFixed(1)},${this.pos.z.toFixed(1)}`);
    this.place(track, j, 0, 0);
    this.respawns++;
    this.stuck = 0;
  }

  /** input: { throttle -1..1, steer -1..1 (positief = rechts), drift bool } */
  update(dt, input, track, grid) {
    const S = track.S;
    const [fx, fz] = this.fwd;
    const rx = -fz, rz = fx;
    let vF = this.vx * fx + this.vz * fz;
    let vL = this.vx * rx + this.vz * rz;

    let throttle = input.throttle, steer = input.steer;
    if (this.spin > 0) { this.spin -= dt; throttle = 0; steer = 0; vF *= Math.exp(-2.5 * dt); }
    if (this.finished && !input.auto) throttle = 0;

    const boosting = this.boost > 0;
    if (boosting) this.boost -= dt;
    let vmax = KART.vmax * this.speedMul;
    if (boosting) vmax *= KART.boostMul;
    else if (this.offroad) vmax *= 0.5;

    if (this.grounded) {
      // gas en rem
      if (boosting) vF += KART.accel * 1.6 * dt;
      if (throttle > 0) {
        if (vF < vmax) vF += throttle * KART.accel * (1 - 0.55 * Math.max(0, vF) / vmax) * dt;
      } else if (throttle < 0) {
        if (vF > 0.5) vF -= KART.brake * -throttle * dt;
        else vF = Math.max(vF - 9 * -throttle * dt, -KART.reverse);
      } else {
        vF -= Math.sign(vF) * Math.min(Math.abs(vF), 4 * dt);
      }
      if (vF > vmax) vF -= (vF - vmax) * (this.offroad ? 3 : 1.5) * dt;

      // helling: trap op kost snelheid
      const j = this.idx;
      const grad = (S.floor[(j + 2) % S.N] - S.floor[(j - 2 + S.N) % S.N]) / (4 * S.step);
      if (!S.jump[j] && Math.abs(grad) < 1) vF -= 9.8 * grad * (fx * S.tx[j] + fz * S.tz[j]) * 0.55 * dt;

      // driften
      if (input.drift && !this.drift && Math.abs(steer) > 0.3 && vF > 8) {
        this.drift = Math.sign(steer);
        this.charge = 0;
        this.vy = 2.6;
        this.grounded = false;
      }
      if (this.drift && (!input.drift || vF < 5)) {
        if (this.charge > 1.3) this.boost = Math.max(this.boost, 1.0);
        else if (this.charge > 0.6) this.boost = Math.max(this.boost, 0.5);
        this.drift = 0;
        this.charge = 0;
      }

      // sturen
      const sf = Math.min(1, Math.abs(vF) / 4) * (1 - 0.3 * Math.min(1, Math.abs(vF) / KART.vmax));
      let rate;
      if (this.drift) {
        const s = this.drift * (0.55 + 0.45 * steer * this.drift);
        rate = s * KART.turn * 1.2 * sf;
        this.charge += dt * (0.6 + 0.6 * Math.abs(steer));
        vL -= this.drift * 3.5 * dt;
      } else {
        rate = steer * KART.turn * sf;
      }
      this.h -= rate * Math.sign(vF || 1) * dt;
      vL *= Math.exp(-(this.drift ? KART.driftGrip : KART.grip) * dt);
    } else {
      // in de lucht: een beetje bijsturen
      this.h -= steer * 0.9 * dt;
    }

    const [gx, gz] = this.fwd;
    this.vx = gx * vF + (-gz) * vL;
    this.vz = gz * vF + gx * vL;

    // bewegen
    this.pos.x += this.vx * dt;
    this.pos.z += this.vz * dt;
    this.vy -= KART.gravity * dt;
    this.pos.y += this.vy * dt;

    // waar op de baan
    this.idx = track.nearest(this.idx, this.pos.x, this.pos.y, this.pos.z);
    const j = this.idx;
    const tx = S.tx[j], tz = S.tz[j];
    const nx = -tz, nz = tx;
    this.lat = (this.pos.x - S.x[j]) * nx + (this.pos.z - S.z[j]) * nz;
    this.indoor = !!S.indoor[j];
    const hw = S.hw[j];

    if (this.indoor) {
      // harde wanden op de baanrand
      const lim = Math.max(0.05, hw - KART.half);
      if (Math.abs(this.lat) > lim) {
        const over = this.lat - Math.sign(this.lat) * lim;
        this.pos.x -= nx * over;
        this.pos.z -= nz * over;
        this.lat -= over;
        const vn = this.vx * nx + this.vz * nz;
        if (vn * Math.sign(over) > 0) {
          this.vx -= nx * vn * 1.3;
          this.vz -= nz * vn * 1.3;
          if (Math.abs(vn) > 3) { this.wallHits++; this.bump = 0.25; }
        }
        this.vx *= 1 - 0.8 * dt;
        this.vz *= 1 - 0.8 * dt;
      }
      this.offroad = false;
    } else {
      this.offroad = Math.abs(this.lat) > hw + 0.3;
      if (grid) this.collide(grid);
      // ver van de baan: zachtjes terugduwen
      const far = Math.abs(this.lat) - (hw + 16);
      if (far > 0) { this.pos.x -= nx * Math.sign(this.lat) * far * 0.2; this.pos.z -= nz * Math.sign(this.lat) * far * 0.2; }
    }

    // vloer
    const floor = this.offroad && !this.indoor ? 0.02 : S.floor[j];
    this.floorY = floor;
    const wasAir = !this.grounded;
    if (this.pos.y <= floor + 0.001 || (this.grounded && this.vy <= 0 && this.pos.y - floor < 0.4)) {
      if (wasAir && this.vy < -9) { this.bump = 0.35; this.vy = -this.vy * 0.18; this.pos.y = floor + 0.001; this.grounded = this.vy < 0.5; }
      else { this.pos.y = floor; this.vy = 0; this.grounded = true; }
      if (wasAir) this.airTime = 0;
    } else {
      this.grounded = false;
      this.airTime += dt;
    }

    // vastgereden?
    if (this.speed < 1 && throttle !== 0 && this.spin <= 0) this.stuck += dt; else this.stuck = Math.max(0, this.stuck - dt * 2);
    if (this.pos.y < -5) this.respawn(track);

    this.syncMesh(track, dt);
  }

  collide(grid) {
    const R = KART.radius;
    for (const c of grid.near(this.pos.x, this.pos.z)) {
      if (this.pos.y + 1.0 < c.y0 || this.pos.y > c.y1) continue;
      const x = this.pos.x, z = this.pos.z;
      if (x < c.x0 - R || x > c.x1 + R || z < c.z0 - R || z > c.z1 + R) continue;
      const pl = x - (c.x0 - R), pr = c.x1 + R - x, pb = z - (c.z0 - R), pf = c.z1 + R - z;
      const m = Math.min(pl, pr, pb, pf);
      let nx = 0, nz = 0;
      if (m === pl) { this.pos.x -= pl; nx = -1; }
      else if (m === pr) { this.pos.x += pr; nx = 1; }
      else if (m === pb) { this.pos.z -= pb; nz = -1; }
      else { this.pos.z += pf; nz = 1; }
      const vn = this.vx * nx + this.vz * nz;
      if (vn < 0) {
        this.vx -= nx * vn * 1.4;
        this.vz -= nz * vn * 1.4;
        this.vx *= 0.8; this.vz *= 0.8;
        if (vn < -4) { this.wallHits++; this.bump = 0.3; }
      }
    }
  }

  useItem(world) {
    if (!this.item) return;
    if (this.item === 'paddenstoel') this.boost = Math.max(this.boost, 1.3);
    else if (this.item === 'banaan') world.dropBanana(this);
    this.item = null;
  }

  syncMesh(track, dt) {
    const S = track.S, j = this.idx;
    const m = this.mesh;
    m.position.copy(this.pos);
    let pitch = 0;
    if (this.grounded) {
      const grad = (S.floor[(j + 2) % S.N] - S.floor[(j - 2 + S.N) % S.N]) / (4 * S.step);
      const along = Math.sin(this.h) * S.tx[j] + Math.cos(this.h) * S.tz[j];
      if (!S.jump[j] && !this.offroad) pitch = -Math.atan(grad * along);
    } else {
      pitch = Math.min(0.35, Math.max(-0.35, -this.vy * 0.03));
    }
    this.pitch += (pitch - this.pitch) * Math.min(1, dt * 12 || 1);
    this.bump = Math.max(0, this.bump - dt);
    m.rotation.set(this.pitch + Math.sin(this.bump * 40) * this.bump * 0.15, this.h + (this.spin > 0 ? this.spin * 14 : 0), this.drift * 0.09, 'YXZ');

    const u = m.userData;
    const sp = this.speed;
    u.spinWheels += sp * dt / 0.3;
    for (const w of u.wheels) w.rotation.x = u.spinWheels;
    for (const w of u.front) w.rotation.y = this.steerVis ?? 0;
    u.flame.visible = this.boost > 0;
    if (u.flame.visible) u.flame.scale.setScalar(0.8 + Math.random() * 0.5);
    const lvl = this.charge > 1.3 ? 2 : this.charge > 0.6 ? 1 : 0;
    for (const s of u.sparks) {
      s.visible = this.drift !== 0 && this.grounded && lvl > 0;
      s.material = lvl === 2 ? SPARK_ORANGE : SPARK_BLUE;
      s.scale.setScalar(0.6 + Math.random() * 0.6);
    }
  }
}

const SPARK_BLUE = new THREE.MeshBasicMaterial({ color: '#7fd4ff' });
const SPARK_ORANGE = new THREE.MeshBasicMaterial({ color: '#ffad3b' });

function buildKartMesh(color, suit, skin, hat) {
  const g = new THREE.Group();
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.15, ...o });
  const paint = std(color, { roughness: 0.3, metalness: 0.3 });
  const black = std('#1b1b1e', { roughness: 0.8 });
  const chrome = std('#cfd3d8', { roughness: 0.2, metalness: 1 });
  const suitM = std(suit, { roughness: 0.8 });
  const skinM = std(skin, { roughness: 0.7 });
  const hatM = std(hat, { roughness: 0.6 });
  const heartM = std('#c4141e', { roughness: 0.35, emissive: '#5a0006', emissiveIntensity: 0.6 });
  const add = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };

  add(new THREE.BoxGeometry(1.0, 0.22, 1.9), paint, 0, 0.3, 0);
  add(new THREE.BoxGeometry(0.7, 0.2, 0.7), paint, 0, 0.36, 1.05);
  add(new THREE.BoxGeometry(1.25, 0.12, 0.28), black, 0, 0.26, 1.42);
  add(new THREE.BoxGeometry(1.3, 0.14, 0.35), black, 0, 0.36, -1.0);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.22, 0.26, 1.1), paint, s * 0.6, 0.34, -0.05);
  add(new THREE.BoxGeometry(0.62, 0.5, 0.18), black, 0, 0.6, -0.55);
  add(new THREE.BoxGeometry(0.62, 0.1, 0.6), black, 0, 0.44, -0.3);
  // hart op de neus: de Rooi Harten
  const hs = new THREE.Shape();
  hs.moveTo(0, -0.16);
  hs.bezierCurveTo(-0.22, 0.0, -0.14, 0.17, 0, 0.07);
  hs.bezierCurveTo(0.14, 0.17, 0.22, 0.0, 0, -0.16);
  const heart = add(new THREE.ExtrudeGeometry(hs, { depth: 0.04, bevelEnabled: false }), heartM, 0, 0.47, 1.12);
  heart.rotation.x = -Math.PI / 2 + 0.25;
  // stuur
  const sw = add(new THREE.TorusGeometry(0.15, 0.03, 6, 16), black, 0, 0.78, 0.32);
  sw.rotation.x = -0.9;
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 6), black, 0, 0.62, 0.42).rotation.x = 0.7;
  // uitlaten
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 8), chrome, s * 0.3, 0.42, -1.2).rotation.x = Math.PI / 2;
  // wielen
  const wheels = [], front = [];
  for (const [x, z, r, w] of [[-0.66, 0.72, 0.25, 0.24], [0.66, 0.72, 0.25, 0.24], [-0.7, -0.72, 0.3, 0.32], [0.7, -0.72, 0.3, 0.32]]) {
    const hub = new THREE.Group();
    hub.position.set(x, r, z);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 16).rotateZ(Math.PI / 2), black);
    tire.castShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 10).rotateZ(Math.PI / 2), chrome);
    const spin = new THREE.Group();
    spin.add(tire, rim);
    hub.add(spin);
    g.add(hub);
    wheels.push(spin);
    if (z > 0) front.push(hub);
  }
  // rijder
  add(new THREE.CapsuleGeometry(0.22, 0.32, 4, 10), suitM, 0, 0.82, -0.25);
  add(new THREE.SphereGeometry(0.2, 16, 12), skinM, 0, 1.28, -0.2);
  add(new THREE.SphereGeometry(0.215, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hatM, 0, 1.32, -0.2);
  add(new THREE.BoxGeometry(0.34, 0.04, 0.2), hatM, 0, 1.32, 0.0);
  for (const s of [-1, 1]) {
    const arm = add(new THREE.CapsuleGeometry(0.07, 0.36, 4, 8), suitM, s * 0.2, 0.86, 0.02);
    arm.rotation.x = -1.1;
    arm.rotation.z = -s * 0.25;
  }
  // turbovlam en driftvonken
  const flame = new THREE.Group();
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffb347' }));
    f.position.set(s * 0.3, 0.42, -1.55);
    flame.add(f);
  }
  flame.visible = false;
  g.add(flame);
  const sparks = [];
  for (const s of [-1, 1]) {
    const sp = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), SPARK_BLUE);
    sp.position.set(s * 0.72, 0.1, -0.95);
    sp.visible = false;
    g.add(sp);
    sparks.push(sp);
  }
  g.userData = { wheels, front, flame, sparks, spinWheels: 0 };
  return g;
}

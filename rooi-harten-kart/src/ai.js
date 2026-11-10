// Computertegenstanders: volgen de middenlijn met een eigen rijlijn, remmen
// voor krappe bochten (de bordessen van de trappen!) en gebruiken items.

export class AIDriver {
  constructor(kart, { skill = 0.95, lane = 0, seed = 1 } = {}) {
    this.kart = kart;
    this.skill = skill;
    this.lane = lane;
    this.t = seed * 3.7;
    this.itemDelay = 0;
  }

  think(dt, track, leader) {
    const k = this.kart, S = track.S, N = S.N;
    this.t += dt;
    const v = k.speed;

    // rijlijn: iets naast het midden, langzaam wisselend; binnen smaller
    const j0 = k.idx;
    const look = Math.min(16, Math.max(4.5, 3 + v * 0.42));
    const jt = (j0 + Math.round(look / S.step)) % N;
    const room = Math.max(0, S.hw[jt] - 1.0);
    const off = Math.max(-room, Math.min(room, (this.lane + 0.35 * Math.sin(this.t * 0.4)) * room * 0.6));
    const tx = S.x[jt] - S.tz[jt] * off, tz = S.z[jt] + S.tx[jt] * off;

    const [fx, fz] = k.fwd;
    const dx = tx - k.pos.x, dz = tz - k.pos.z;
    const right = dx * -fz + dz * fx;
    const ahead = dx * fx + dz * fz;
    const ang = Math.atan2(right, ahead);
    let steer = Math.max(-1, Math.min(1, ang * 2.4));

    // hoe krap wordt het? kijk een stuk vooruit naar de draaiing van de baan
    const span = Math.round((5 + v * 0.9) / S.step);
    let turn = 0;
    const a0 = Math.atan2(S.tx[j0], S.tz[j0]);
    for (let s = 4; s <= span; s += 4) {
      const j = (j0 + s) % N;
      let d = Math.atan2(S.tx[j], S.tz[j]) - a0;
      d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
      turn = Math.max(turn, d);
    }
    const want = Math.max(6.5, 22 * (1 - Math.min(0.72, turn * 0.5))) * this.skill;
    let throttle = v > want + 1.5 ? -0.7 : v > want ? 0 : 1;
    if (ahead < 0 && Math.abs(ang) > 2) { throttle = -1; steer = -Math.sign(right); }   // verkeerd om: achteruit keren

    // inhaalhulp
    if (leader) {
      const gap = (leader.dist - k.dist) * S.step;
      k.speedMul = gap > 40 ? 1.1 : gap > 15 ? 1.04 : gap < -40 ? 0.9 : gap < -15 ? 0.96 : 1;
    }

    // items
    let item = false;
    if (k.item) {
      this.itemDelay += dt;
      if (k.item === 'paddenstoel' && turn < 0.25 && this.itemDelay > 0.6) item = true;
      if (k.item === 'banaan' && this.itemDelay > 2.5) item = true;
    } else this.itemDelay = 0;

    // vast tegen iets: even achteruit, daarna terugzetten
    if (k.stuck > 1.0) { throttle = -1; steer = -steer; }
    if (k.stuck > 2.5) k.respawn(track);

    return { throttle, steer, drift: false, item, auto: true };
  }
}

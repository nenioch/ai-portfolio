'use strict';
/* =============================================================================
   main.js — "stable fluids" op de GPU (Navier-Stokes): snelheid, druk en inkt
   leven in half-float texturen. Per frame: wervelingen versterken, druk oplossen
   zodat de vloeistof onsamendrukbaar blijft, en inkt meevoeren met de stroming.
   ============================================================================= */

(function () {
  const $ = id => document.getElementById(id);
  const q = new URLSearchParams(location.search);
  function fail(msg) { const e = $('error'); e.hidden = false; if (msg) e.textContent = msg; }
  window.addEventListener('error', e => fail('Fout: ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')'));

  const canvas = $('scene');
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
  if (!gl) { fail(); return; }
  const extF = gl.getExtension('EXT_color_buffer_float'), extH = gl.getExtension('EXT_color_buffer_half_float');
  if (!extF && !extH) { fail(); return; }
  gl.getExtension('OES_texture_float_linear');

  const SIM_RES = parseInt(q.get('sim') || '256', 10) || 256;
  const DYE_RES = parseInt(q.get('q') || '1024', 10) || 1024;

  // ------------------------------------------------------------ shaders
  const VERT = `#version 300 es
    precision highp float;
    in vec2 aPosition;
    out vec2 vUv, vL, vR, vT, vB;
    uniform vec2 texelSize;
    void main(){
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0); vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y); vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }`;
  const HEAD = `#version 300 es
    precision highp float; precision highp sampler2D;
    in vec2 vUv, vL, vR, vT, vB;
    out vec4 outColor;`;

  const FRAG = {
    clear: HEAD + `uniform sampler2D uTexture; uniform float uValue;
      void main(){ outColor = uValue * texture(uTexture, vUv); }`,
    splat: HEAD + `uniform sampler2D uTarget; uniform float aspect; uniform vec3 color; uniform vec2 point; uniform float radius;
      void main(){
        vec2 p = vUv - point; p.x *= aspect;
        vec3 s = exp(-dot(p, p) / radius) * color;
        outColor = vec4(texture(uTarget, vUv).xyz + s, 1.0);
      }`,
    advect: HEAD + `uniform sampler2D uVelocity, uSource; uniform vec2 texelSize; uniform float dt, dissipation;
      void main(){
        vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
        outColor = texture(uSource, coord) / (1.0 + dissipation * dt);
      }`,
    divergence: HEAD + `uniform sampler2D uVelocity;
      void main(){
        float L = texture(uVelocity, vL).x, R = texture(uVelocity, vR).x, T = texture(uVelocity, vT).y, B = texture(uVelocity, vB).y;
        vec2 C = texture(uVelocity, vUv).xy;
        if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x; if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
        outColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
      }`,
    curl: HEAD + `uniform sampler2D uVelocity;
      void main(){
        float L = texture(uVelocity, vL).y, R = texture(uVelocity, vR).y, T = texture(uVelocity, vT).x, B = texture(uVelocity, vB).x;
        outColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
      }`,
    vorticity: HEAD + `uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
      void main(){
        float L = texture(uCurl, vL).x, R = texture(uCurl, vR).x, T = texture(uCurl, vT).x, B = texture(uCurl, vB).x, C = texture(uCurl, vUv).x;
        vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        f /= length(f) + 0.0001; f *= curl * C; f.y *= -1.0;
        vec2 v = texture(uVelocity, vUv).xy + f * dt;
        outColor = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
      }`,
    pressure: HEAD + `uniform sampler2D uPressure, uDivergence;
      void main(){
        float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x, T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
        outColor = vec4((L + R + B + T - texture(uDivergence, vUv).x) * 0.25, 0.0, 0.0, 1.0);
      }`,
    gradient: HEAD + `uniform sampler2D uPressure, uVelocity;
      void main(){
        float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x, T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
        vec2 v = texture(uVelocity, vUv).xy - vec2(R - L, T - B);
        outColor = vec4(v, 0.0, 1.0);
      }`,
    display: HEAD + `uniform sampler2D uDye, uVelocity; uniform int uTheme; uniform float uTime, aspect; uniform vec3 uPointer;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float lum(vec3 c){ return (c.r + c.g + c.b) * 0.3333; }
      void main(){
        vec3 c = texture(uDye, vUv).rgb;
        float lL = lum(texture(uDye, vL).rgb), lR = lum(texture(uDye, vR).rgb), lT = lum(texture(uDye, vT).rgb), lB = lum(texture(uDye, vB).rgb);
        vec3 n = normalize(vec3(lL - lR, lB - lT, uTheme == 2 ? 0.05 : 0.035));
        float diff = dot(n, normalize(vec3(-0.45, 0.55, 0.7)));
        vec3 col;
        if (uTheme == 0) {                                   // inkt in donker water
          vec3 bg = mix(vec3(0.012, 0.02, 0.045), vec3(0.04, 0.075, 0.13), vUv.y * 0.9);
          vec3 ink = 1.0 - exp(-c * 1.5);
          float spec = pow(max(diff, 0.0), 14.0) * 0.35;
          col = bg * (1.0 - clamp(lum(ink) * 1.2, 0.0, 1.0)) + ink * (0.78 + 0.55 * diff) + spec * ink;
        } else if (uTheme == 1) {                            // inkt op papier: subtractief
          vec2 pp = vUv * vec2(aspect, 1.0) * 480.0;
          float fiber = hash(floor(pp)) * 0.035 + hash(floor(pp * 0.21)) * 0.03;
          vec3 paper = vec3(0.965, 0.945, 0.9) - fiber;
          col = paper * exp(-c * 2.3) * (0.93 + 0.09 * diff);
        } else {                                             // olieslik: dunne-film-interferentie
          float t = lum(c) * 0.85 + (n.x * 0.55 + n.y * 0.3) * 0.6 + length(c - lum(c)) * 0.3;
          vec3 irid = 0.52 + 0.48 * cos(6.28318 * (t * 0.9 + vec3(0.0, 0.33, 0.67)));
          float film = smoothstep(0.015, 0.35, lum(c));
          vec3 bg = mix(vec3(0.006, 0.006, 0.012), vec3(0.03, 0.03, 0.05), vUv.y);
          col = mix(bg, irid * (0.55 + 0.6 * diff), film) + vec3(pow(max(diff, 0.0), 18.0) * 0.5) * film;
        }
        // zachte gloed rond de cursor, zodat je ziet waar jouw hand in de vloeistof zit
        vec2 dp = (vUv - uPointer.xy) * vec2(aspect, 1.0);
        float d = length(dp);
        float ring = exp(-pow((d - 0.035) / 0.006, 2.0)) * 0.35 + exp(-d * d / 0.004) * 0.08;
        col += (uTheme == 1 ? vec3(-0.35) : vec3(0.9, 0.95, 1.0)) * ring * uPointer.z;
        outColor = vec4(col, 1.0);
      }`,
  };

  // ------------------------------------------------------------ WebGL-hulpjes
  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, VERT);
  function program(frag) {
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(p, 0, 'aPosition'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u, use() { gl.useProgram(p); return u; } };
  }
  const P = {}; for (const k in FRAG) P[k] = program(FRAG[k]);

  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);

  function blit(target) {
    if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); }
    else { gl.viewport(0, 0, canvas.width, canvas.height); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  function makeFBO(w, h, ifmt, fmt, type, filter) {
    gl.activeTexture(gl.TEXTURE0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, null);
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Framebuffer niet compleet');
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo, w, h, tx: 1 / w, ty: 1 / h, attach(unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); return unit; } };
  }
  function makeDouble(w, h, ifmt, fmt, type, filter) {
    let a = makeFBO(w, h, ifmt, fmt, type, filter), b = makeFBO(w, h, ifmt, fmt, type, filter);
    return { w, h, tx: 1 / w, ty: 1 / h, get read() { return a; }, get write() { return b; }, swap() { const t = a; a = b; b = t; } };
  }
  function resolution(res) {
    let ar = gl.drawingBufferWidth / gl.drawingBufferHeight; if (ar < 1) ar = 1 / ar;
    const mn = Math.round(res), mx = Math.round(res * ar);
    return gl.drawingBufferWidth > gl.drawingBufferHeight ? { w: mx, h: mn } : { w: mn, h: mx };
  }

  let velocity, dye, pressure, divergence, curlFBO;
  function initBuffers() {
    const s = resolution(SIM_RES), d = resolution(DYE_RES);
    const LIN = gl.LINEAR, HF = gl.HALF_FLOAT;
    dye = makeDouble(d.w, d.h, gl.RGBA16F, gl.RGBA, HF, LIN);
    velocity = makeDouble(s.w, s.h, gl.RG16F, gl.RG, HF, LIN);
    divergence = makeFBO(s.w, s.h, gl.R16F, gl.RED, HF, gl.NEAREST);
    curlFBO = makeFBO(s.w, s.h, gl.R16F, gl.RED, HF, gl.NEAREST);
    pressure = makeDouble(s.w, s.h, gl.R16F, gl.RED, HF, gl.NEAREST);
    $('res').textContent = 'inkt ' + d.w + '×' + d.h;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(window.innerWidth * dpr), h = Math.floor(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; return true; }
    return false;
  }
  resize(); initBuffers();
  window.addEventListener('resize', () => { if (resize()) initBuffers(); });

  // ------------------------------------------------------------ simulatiestap
  const CFG = { curl: 30, densityDiss: 0.7, velocityDiss: 0.2, pressure: 0.8, iters: 20, force: 6000, radius: 0.25 };

  function step(dt) {
    gl.disable(gl.BLEND);
    let u = P.curl.use(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uVelocity, velocity.read.attach(0)); blit(curlFBO);
    u = P.vorticity.use(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty);
    gl.uniform1i(u.uVelocity, velocity.read.attach(0)); gl.uniform1i(u.uCurl, curlFBO.attach(1)); gl.uniform1f(u.curl, CFG.curl); gl.uniform1f(u.dt, dt);
    blit(velocity.write); velocity.swap();
    u = P.divergence.use(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uVelocity, velocity.read.attach(0)); blit(divergence);
    u = P.clear.use(); gl.uniform1i(u.uTexture, pressure.read.attach(0)); gl.uniform1f(u.uValue, CFG.pressure); blit(pressure.write); pressure.swap();
    u = P.pressure.use(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uDivergence, divergence.attach(0));
    for (let i = 0; i < CFG.iters; i++) { gl.uniform1i(u.uPressure, pressure.read.attach(1)); blit(pressure.write); pressure.swap(); }
    u = P.gradient.use(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty);
    gl.uniform1i(u.uPressure, pressure.read.attach(0)); gl.uniform1i(u.uVelocity, velocity.read.attach(1)); blit(velocity.write); velocity.swap();
    u = P.advect.use(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty);
    gl.uniform1i(u.uVelocity, velocity.read.attach(0)); gl.uniform1i(u.uSource, velocity.read.attach(0)); gl.uniform1f(u.dt, dt); gl.uniform1f(u.dissipation, CFG.velocityDiss);
    blit(velocity.write); velocity.swap();
    gl.uniform2f(u.texelSize, velocity.tx, velocity.ty);
    gl.uniform1i(u.uVelocity, velocity.read.attach(0)); gl.uniform1i(u.uSource, dye.read.attach(1)); gl.uniform1f(u.dissipation, CFG.densityDiss);
    blit(dye.write); dye.swap();
  }

  // ------------------------------------------------------------ splats
  const aspectNow = () => canvas.width / canvas.height;
  // De automatische "dirigent" maakt plaats zodra de gebruiker roert: ambient = 1 als niemand
  // iets doet, zakt naar ~0.1 tijdens interactie en komt na een paar seconden rust weer terug.
  let ambient = 1, userAct = 0, userSplat = false;
  function splat(x, y, dx, dy, color, rs) {
    if (!userSplat) {
      if (ambient < 0.02) return;
      dx *= ambient; dy *= ambient; color = [color[0] * ambient, color[1] * ambient, color[2] * ambient];
    }
    let r = CFG.radius / 100 * (rs || 1); const ar = aspectNow(); if (ar > 1) r *= ar;
    const u = P.splat.use();
    gl.uniform1i(u.uTarget, velocity.read.attach(0)); gl.uniform1f(u.aspect, ar); gl.uniform2f(u.point, x, y); gl.uniform3f(u.color, dx, dy, 0); gl.uniform1f(u.radius, r);
    blit(velocity.write); velocity.swap();
    gl.uniform1i(u.uTarget, dye.read.attach(0)); gl.uniform3f(u.color, color[0], color[1], color[2]);
    blit(dye.write); dye.swap();
  }
  function hsv(h, s, v) {
    const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q2 = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    switch (((i % 6) + 6) % 6) { case 0: return [v, t, p]; case 1: return [q2, v, p]; case 2: return [p, v, t]; case 3: return [p, q2, v]; case 4: return [t, p, v]; default: return [v, p, q2]; }
  }
  // kleur voor het gekozen thema: water = licht, papier = absorptie (complement), olie = bijna wit (kleur komt uit de interferentie)
  function inkColor(h, amount, s) {
    const c = hsv(((h % 1) + 1) % 1, s == null ? 0.85 : s, 1);
    if (theme === 1) return [(1 - c[0]) * amount * 1.3, (1 - c[1]) * amount * 1.3, (1 - c[2]) * amount * 1.3];
    if (theme === 2) { const l = amount * 1.1; return [l * (0.7 + 0.3 * c[0]), l * (0.7 + 0.3 * c[1]), l * (0.7 + 0.3 * c[2])]; }
    return [c[0] * amount, c[1] * amount, c[2] * amount];
  }
  const F = () => CFG.force;
  function burst(x, y, n, hue, amount, force, rs) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      splat(x + Math.cos(a) * 0.012, y + Math.sin(a) * 0.012, Math.cos(a) * force, Math.sin(a) * force, inkColor(hue + i * 0.03, amount), rs || 0.7);
    }
  }

  // ------------------------------------------------------------ scènes (de "dirigent")
  let theme = 0, sceneT = 0, nextEvent = 0;
  const SCENES = [
    {
      id: 'wolken', label: 'Inktwolken', theme: 0, dur: 24, cfg: { curl: 16, densityDiss: 1.25, velocityDiss: 0.35 },
      title: 'Inktwolken', sub: 'Elke kleur is een andere druppel in dezelfde stroming. Beweeg de muis: de showreel wacht en jij roert.',
      tick(t, dt) {
        for (let k = 0; k < 2; k++) {
          const w = 0.26 + k * 0.08, x = 0.5 + 0.34 * Math.sin(w * t + k * 2.1), y = 0.5 + 0.28 * Math.sin(0.83 * w * t + k * 1.3 + 1);
          const vx = 0.34 * w * Math.cos(w * t + k * 2.1), vy = 0.28 * 0.83 * w * Math.cos(0.83 * w * t + k * 1.3 + 1);
          splat(x, y, vx * F() * 0.3, vy * F() * 0.3, inkColor(t * 0.02 + k * 0.4, 0.028), 0.8);
        }
        if (t > nextEvent) { nextEvent = t + 6 + Math.random() * 3; burst(0.2 + Math.random() * 0.6, 0.25 + Math.random() * 0.5, 10, Math.random(), 0.35, 450); }
      },
      start() { burst(0.5, 0.5, 12, Math.random(), 0.7, 600, 0.9); },
    },
    {
      id: 'ringen', label: 'Rookringen', theme: 0, dur: 22, cfg: { curl: 10, densityDiss: 0.6, velocityDiss: 0.25 },
      title: 'Rookringen', sub: 'Een stoot vloeistof rolt zichzelf op tot een wervelpaar, net als een rookring. Sleep snel met de muis en maak er zelf een.',
      tick(t, dt) {
        if (t > nextEvent) {
          nextEvent = t + 2.4 + Math.random() * 1.2;
          const side = Math.random();
          let x, y, dx, dy;
          if (side < 0.5) { x = 0.12 + Math.random() * 0.76; y = 0.06; dx = (Math.random() - 0.5) * 600; dy = 4000; }
          else if (side < 0.75) { x = 0.04; y = 0.2 + Math.random() * 0.6; dx = 4000; dy = (Math.random() - 0.5) * 900; }
          else { x = 0.96; y = 0.2 + Math.random() * 0.6; dx = -4000; dy = (Math.random() - 0.5) * 900; }
          const h = Math.random() * 0.25 + (Math.random() < 0.5 ? 0.0 : 0.55);
          splat(x, y, dx, dy, inkColor(h, 1.1, 0.8), 0.28);
          splat(x + dx * 0.00002, y + dy * 0.00002, dx * 0.6, dy * 0.6, inkColor(h + 0.05, 0.6, 0.8), 0.5);
        }
      },
      start() { sceneT = 0; nextEvent = 0; },
    },
    {
      id: 'marmer', label: 'Marmer', theme: 1, dur: 24, cfg: { curl: 3, densityDiss: 0.05, velocityDiss: 1.4 },
      title: 'Marmeren papier', sub: 'Inkt op een vloeistof, gekamd met een denkbeeldige hark. Sleep met de muis en kam zelf een patroon.',
      tick(t, dt) {
        if (t > nextEvent) {
          nextEvent = t + 1.3;
          const h = [0.62, 0.0, 0.1, 0.5, 0.78][Math.floor(Math.random() * 5)];
          splat(0.08 + Math.random() * 0.84, 0.1 + Math.random() * 0.8, 0, 0, inkColor(h, 0.5 + Math.random() * 0.45, 0.8), 1.5);
        }
        // de hark: een rij punten die in één richting door het doek trekt
        const ph = (t / 11) % 2, dir = ph < 1 ? 1 : -1, pos = ph < 1 ? ph : 2 - ph;
        const x = 0.04 + pos * 0.92, wob = Math.sin(t * 0.7) * 0.03;
        for (let i = 0; i < 9; i++) {
          const y = 0.06 + i * 0.111 + wob;
          splat(x, y, dir * 300 * (0.6 + 0.4 * Math.sin(i * 1.7 + t * 0.5)), Math.sin(i * 2.3 + t) * 90, [0, 0, 0], 0.5);
        }
      },
      start() { for (let i = 0; i < 14; i++) splat(Math.random(), Math.random(), 0, 0, inkColor([0.62, 0.0, 0.1, 0.5, 0.78][i % 5], 0.8, 0.8), 1.5); },
    },
    {
      id: 'olie', label: 'Olieslik', theme: 2, dur: 22, cfg: { curl: 8, densityDiss: 0.75, velocityDiss: 0.7 },
      title: 'Olieslik', sub: 'Een dunne film olie breekt het licht in regenboogkleuren: de dikte bepaalt de kleur. Roer en zie de kleuren verschuiven.',
      tick(t, dt) {
        const k = 0, w = 0.2, x = 0.5 + 0.36 * Math.sin(w * t), y = 0.5 + 0.3 * Math.cos(0.7 * w * t);
        splat(x, y, 0.36 * w * Math.cos(w * t) * F() * 0.3, -0.3 * 0.7 * w * Math.sin(0.7 * w * t) * F() * 0.3, inkColor(t * 0.015 + k, 0.035, 0.2), 1.0);
        if (t > nextEvent) { nextEvent = t + 7 + Math.random() * 3; burst(0.15 + Math.random() * 0.7, 0.2 + Math.random() * 0.6, 8, Math.random(), 0.55, 380, 1.3); }
      },
      start() { burst(0.5, 0.5, 14, 0.3, 0.9, 700, 1.3); },
    },
  ];

  let sceneIdx = 0, auto = q.get('auto') !== '0', titleTimer = 0;
  const ui = { title: $('title'), h: $('title-h'), p: $('title-p'), idx: $('title-idx') };
  const sceneEl = $('scenes');
  SCENES.forEach((s, i) => {
    const b = document.createElement('button'); b.textContent = s.label;
    b.addEventListener('click', () => { setAuto(false); setScene(i); });
    sceneEl.appendChild(b);
  });

  function clearAll() {
    let u = P.clear.use();
    gl.uniform1i(u.uTexture, dye.read.attach(0)); gl.uniform1f(u.uValue, 0); blit(dye.write); dye.swap();
    gl.uniform1i(u.uTexture, velocity.read.attach(0)); blit(velocity.write); velocity.swap();
  }
  function setScene(i) {
    const s = SCENES[i];
    sceneIdx = i; sceneT = 0; nextEvent = 0;
    if (s.theme !== theme) { document.body.className = 'theme-' + ['water', 'paper', 'oil'][s.theme]; }
    theme = s.theme;
    Object.assign(CFG, s.cfg);
    clearAll();
    userSplat = true; if (s.start) s.start(); userSplat = false;   // beginbeeld altijd volledig
    document.querySelectorAll('#scenes button').forEach((b, k) => b.classList.toggle('on', k === i));
    ui.title.classList.add('swap'); clearTimeout(titleTimer);
    titleTimer = setTimeout(() => {
      ui.idx.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(SCENES.length).padStart(2, '0');
      ui.h.textContent = s.title; ui.p.textContent = s.sub; ui.title.classList.remove('swap');
    }, 350);
  }
  function setAuto(v) { auto = v; $('auto').classList.toggle('on', v); }
  $('auto').addEventListener('click', () => { setAuto(!auto); if (auto) setScene((sceneIdx + 1) % SCENES.length); });
  $('clear').addEventListener('click', () => clearAll());
  let saveNext = false;
  $('save').addEventListener('click', () => { saveNext = true; });

  // ------------------------------------------------------------ muis en touch
  const pointers = new Map();
  let hueUser = Math.random();
  const cursor = { x: 0.5, y: 0.5, a: 0 };   // a = zichtbaarheid van de cursorgloed
  function pos(e) { return { x: e.clientX / window.innerWidth, y: 1 - e.clientY / window.innerHeight }; }
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e); pointers.set(e.pointerId, { x: p.x, y: p.y, down: true });
    cursor.x = p.x; cursor.y = p.y; userAct = 1;
    hueUser += 0.11;
    userSplat = true; burst(p.x, p.y, 10, hueUser, 1.0, 900, 0.6); userSplat = false;
    wake();
  });
  canvas.addEventListener('pointermove', e => {
    const p = pos(e); let s = pointers.get(e.pointerId);
    if (!s) { s = { x: p.x, y: p.y, down: false }; pointers.set(e.pointerId, s); }
    let dx = (p.x - s.x), dy = (p.y - s.y);
    const ar = aspectNow(); if (ar < 1) dx *= ar; if (ar > 1) dy /= ar;
    s.x = p.x; s.y = p.y; cursor.x = p.x; cursor.y = p.y;
    if (dx === 0 && dy === 0) return;
    userAct = 1;
    hueUser += 0.0025;
    const k = s.down ? 1.1 : 0.8;
    userSplat = true;
    splat(p.x, p.y, dx * CFG.force * k, dy * CFG.force * k, inkColor(hueUser, s.down ? 0.55 : 0.32, 0.95), s.down ? 1.3 : 1.0);
    userSplat = false;
    wake();
  });
  const up = e => { pointers.delete(e.pointerId); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') pointers.delete(e.pointerId); });
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); clearAll(); }
    else if (e.key === 's' || e.key === 'S') saveNext = true;
    else if (e.key === 'a' || e.key === 'A') setAuto(!auto);
    else if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('clean');
    else if (e.key === 'ArrowRight') { setAuto(false); setScene((sceneIdx + 1) % SCENES.length); }
    else if (e.key === 'ArrowLeft') { setAuto(false); setScene((sceneIdx + SCENES.length - 1) % SCENES.length); }
    wake();
  });
  let idleTimer = 0;
  function wake() { document.body.classList.remove('idle'); clearTimeout(idleTimer); idleTimer = setTimeout(() => document.body.classList.add('idle'), 4000); }
  wake();

  // ------------------------------------------------------------ lus
  let last = performance.now(), frames = 0, fpsT = 0;
  const startIdx = Math.max(0, Math.min(SCENES.length - 1, parseInt(q.get('v') || '0', 10) || 0));
  setScene(startIdx);
  const warm = parseFloat(q.get('warm') || '0');          // ?warm=8 laat de scène eerst 8 s lopen (screenshots)
  for (let t = 0; t < warm; t += 1 / 60) { sceneT += 1 / 60; SCENES[sceneIdx].tick(sceneT, 1 / 60); step(1 / 60); }

  const SPEED = 0.7;   // de hele vloeistof iets trager: rustiger beeld
  function frame(now) {
    const real = Math.min(0.05, (now - last) / 1000); last = now;
    const dt = Math.min(real, 1 / 50);
    // interactie: na ~2,5 s rust komt de showreel in ~3 s weer op gang
    userAct = Math.max(0, userAct - real / 2.5);
    const target = userAct > 0 ? 0.1 : 1;
    ambient += (target - ambient) * Math.min(1, real * (target < ambient ? 4 : 0.35));
    cursor.a += ((pointers.size && userAct > 0 ? 1 : 0) - cursor.a) * Math.min(1, real * 5);
    sceneT += dt;
    if (auto && sceneT > SCENES[sceneIdx].dur && ambient > 0.9) setScene((sceneIdx + 1) % SCENES.length);
    SCENES[sceneIdx].tick(sceneT, dt);
    step(dt * SPEED);

    const u = P.display.use();
    gl.uniform2f(u.texelSize, dye.tx, dye.ty);
    gl.uniform1i(u.uDye, dye.read.attach(0)); gl.uniform1i(u.uTheme, theme); gl.uniform1f(u.uTime, sceneT); gl.uniform1f(u.aspect, aspectNow());
    gl.uniform3f(u.uPointer, cursor.x, cursor.y, cursor.a);
    blit(null);

    if (saveNext) {
      saveNext = false;
      canvas.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'inktkunst-' + SCENES[sceneIdx].id + '.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
    }

    frames++; fpsT += real;
    if (fpsT > 0.5) { $('fps').textContent = Math.round(frames / fpsT); frames = 0; fpsT = 0; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(t => { last = t; frame(t); });
})();

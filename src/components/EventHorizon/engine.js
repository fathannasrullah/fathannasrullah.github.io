import {
  E0,
  MOONS,
  OUTER_A,
  ROLL_MAX,
  TE,
  clamp,
  createShakeDetector,
  createWiggleDetector,
  inclinationDeg,
  keplerPeriod,
  orbitOpening,
  orbitPoint,
  pointerToView,
  screenAxes,
  shipGravity,
  smoothstep,
  tiltToView,
  viewFlat
} from './physics';
import { FRAGMENT, FULLSCREEN_TRIANGLE, UNIFORMS, VERTEX } from './shader';
import { paintName, paintSky } from './sky';

// ── rendering budget ──
const MAX_DPR = 1.5;
const PIXEL_BUDGET = 2.6e6; // device pixels the lens shader may shade per frame
// Adaptive resolution: after this many slow frames in a row the lens renders smaller.
const SLOW_FRAME = 1 / 40;
const SLOW_FRAMES_TO_DOWNSCALE = 90;
const MIN_QUALITY = 0.6;
const TAB_RETURN_GAP = 0.5; // s; longer than any real frame

const MOBILE_MAX_WIDTH = 720;
const DIM_WITH_PANEL = 0.42;
const VIEW_EASE = 3.5; // 1/s
const SHAKE_COOLDOWN_MS = 450;
const TOAST_MS = 2600;

// Set views for touch screens whose tilt never arrives (sandboxed frames, some desktops).
const CAMERA_PRESETS = [
  { name: 'edge-on', e: E0, roll: 0 },
  { name: 'from above', e: 0.95, roll: 0 },
  { name: 'from the left', e: 0.35, roll: -1 },
  { name: 'from the right', e: 0.35, roll: 1 },
  { name: 'from below', e: -0.6, roll: 0 }
];

const KEYMAP = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };

/**
 * The imperative half of the landing: the lens, the ship, the moons and every input that
 * steers them. React owns the markup and the panel; this owns the frames.
 *
 * @param els DOM nodes rendered by EventHorizon.jsx
 * @param hooks.onOpen (id, { horizon }) — the ship touched a moon or fell in
 * @returns {{ setPanel(open: boolean): void, destroy(): void }}
 */
export function createEngine(els, { onOpen }) {
  const { stage, world, glCanvas, fxCanvas, fallbackHole, hero, nameLines, moonEls, hud, hint, toast, viewChip, shakeChip, panel } =
    els;
  const fx = fxCanvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = matchMedia('(pointer: coarse)');

  const disposers = [];
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    disposers.push(() => target.removeEventListener(type, fn, opts));
  };
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };

  // ── state ──
  let W = 0;
  let H = 0;
  let dpr = 1;
  let quality = 1;
  let R = 60;
  let orbitScaleX = 1;
  let roomY = 300;
  let mobile = false;
  let RM = reducedMotion.matches;
  let panelOpen = false;
  let destroyed = false;
  let raf = 0;
  let last = 0;
  let T = 12;
  let dim = 1;
  let dimTarget = 1;
  let pause = 0;
  let orbitSpeed = 1;
  let drag = null;
  let steer = null;
  let slowFrames = 0;
  const keys = new Set();
  const hole = { x: 0, y: 0, vx: 0, vy: 0, hx: 0, hy: 0 };
  const view = { e: E0, roll: 0, te: E0, troll: 0 };
  const parallax = { x: 0, y: 0 };
  const wave = { t: 99, a0: 0 };
  let flare = 0;
  let jitter = 0;
  let lastShake = 0;
  const ship = { x: 0, y: 0, vx: 0, vy: 0, a: -Math.PI / 2, engaged: false, state: 'idle', f: 0, fa: 0, fr: 0, trail: [], tt: 0, thrust: 0 };
  const moons = MOONS.map((m, i) => ({
    ...m,
    el: moonEls[i],
    T: keplerPeriod(m.a),
    angle: (m.rot * Math.PI) / 180,
    wo: 0,
    wv: 0,
    width: 0,
    x: 0,
    y: 0,
    op: 1,
    flip: false
  }));

  // ── webgl ──
  let gl = null;
  let program = null;
  let buffer = null;
  let texture = null;
  let U = {};
  const sky = document.createElement('canvas');
  const skyCtx = sky.getContext('2d');

  function initGL() {
    try {
      gl = glCanvas.getContext('webgl', {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
      });
      if (!gl) return false;
      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      program = gl.createProgram();
      const vs = compile(gl.VERTEX_SHADER, VERTEX);
      const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_TRIANGLE, gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      U = {};
      for (const name of UNIFORMS) U[name] = gl.getUniformLocation(program, name);
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(U.uSrc, 0);
      return true;
    } catch (err) {
      // Without WebGL the sky is shown flat, the name falls back to DOM text, a CSS disc stands in.
      console.warn('Event horizon: lensing off.', err);
      gl = null;
      return false;
    }
  }

  function releaseGL() {
    if (!gl) return;
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl = null;
  }

  // ── layout ──
  function homeFor() {
    if (panelOpen) return mobile ? { x: W * 0.5, y: H * 0.1 } : { x: (W - panel.offsetWidth - 32) / 2, y: H * 0.5 };
    return mobile ? { x: W * 0.5, y: H * 0.66 } : { x: W * 0.69, y: H * 0.57 };
  }

  function sizeCanvases() {
    const base = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    dpr = Math.min(base, Math.sqrt(PIXEL_BUDGET / (W * H))) * quality;
    glCanvas.width = sky.width = Math.round(W * dpr);
    glCanvas.height = sky.height = Math.round(H * dpr);
    // the ship layer is cheap 2D and should stay sharp
    const fxDpr = Math.min(window.devicePixelRatio || 1, 2);
    fxCanvas.width = Math.round(W * fxDpr);
    fxCanvas.height = Math.round(H * fxDpr);
    fx.setTransform(fxDpr, 0, 0, fxDpr, 0, 0);
    if (gl) gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  }

  function repaintSky() {
    if (!gl) {
      // no lens: the flat sky is the visible layer
      glCanvas.width = Math.round(W * dpr);
      glCanvas.height = Math.round(H * dpr);
      // a canvas that already handed out a (broken) webgl context won't give a 2d one
      const flat = glCanvas.getContext('2d');
      if (flat) paintSky(flat, { width: W, height: H, dpr, mobile });
      return;
    }
    paintSky(skyCtx, { width: W, height: H, dpr, mobile });
    paintName(skyCtx, stage, nameLines);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sky);
  }

  function layout() {
    W = stage.clientWidth;
    H = stage.clientHeight;
    if (!W || !H) return;
    mobile = W < MOBILE_MAX_WIDTH;
    if (gl) sizeCanvases();
    else dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    R = mobile ? Math.min(W * 0.12, H * 0.062) : Math.min(W * 0.07, H * 0.085);
    const home = homeFor();
    hole.hx = home.x;
    hole.hy = home.y;
    if (!hole.x) {
      hole.x = home.x;
      hole.y = home.y;
    }
    const roomX = Math.min(home.x, W - home.x) - (mobile ? 30 : 60);
    roomY = Math.min(home.y - 70, H - home.y - 50);
    orbitScaleX = Math.min(1, roomX / (OUTER_A * R));
    for (const m of moons) m.width = m.el.offsetWidth;
    repaintSky();
    if (!ship.engaged && ship.state !== 'fall') spawn();
    hint.innerHTML = mobile
      ? '<kbd>tilt</kbd> the phone to look around · <kbd>drag</kbd> the hole · tap a moon'
      : '<kbd>move the mouse</kbd> to look around · <kbd>drag</kbd> the hole · <kbd>WASD</kbd> fly · <kbd>G</kbd> shake';
    kick();
  }

  function spawn() {
    ship.x = clamp(hole.hx - (mobile ? 2.6 : 4.4) * R, 30, W - 30);
    ship.y = clamp(hole.hy + (mobile ? 2.9 : 2.3) * R, 90, H - 60);
    ship.vx = 0;
    ship.vy = 0;
    ship.a = -Math.PI / 2;
    ship.engaged = false;
    ship.state = 'idle';
    ship.trail.length = 0;
  }

  // ── pointer: drag the hole, or steer the ship ──
  const local = (e) => {
    const r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const nearHole = (p) => Math.hypot(p.x - hole.x, p.y - hole.y) < R * 1.6;

  listen(glCanvas, 'pointerdown', (e) => {
    const p = local(e);
    glCanvas.setPointerCapture(e.pointerId);
    if (nearHole(p)) {
      drag = { id: e.pointerId, ox: hole.x - p.x, oy: hole.y - p.y, tx: hole.x, ty: hole.y };
      glCanvas.dataset.cursor = 'grabbing';
    } else {
      steer = { id: e.pointerId, x: p.x, y: p.y };
    }
    kick();
  });
  listen(glCanvas, 'pointermove', (e) => {
    const p = local(e);
    if (drag && e.pointerId === drag.id) {
      drag.tx = clamp(p.x + drag.ox, R, W - R);
      drag.ty = clamp(p.y + drag.oy, R, H - R);
    } else if (steer && e.pointerId === steer.id) {
      steer.x = p.x;
      steer.y = p.y;
    } else if (e.pointerType === 'mouse') {
      glCanvas.dataset.cursor = nearHole(p) ? 'grab' : '';
    }
    kick();
  });
  const release = (e) => {
    if (drag && e.pointerId === drag.id) {
      drag = null;
      glCanvas.dataset.cursor = '';
    }
    if (steer && e.pointerId === steer.id) steer = null;
    kick();
  };
  listen(glCanvas, 'pointerup', release);
  listen(glCanvas, 'pointercancel', release);

  // ── keys ──
  listen(window, 'keydown', (e) => {
    if (panelOpen || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'KeyG' && !e.repeat) {
      shake(0.85);
      return;
    }
    const k = KEYMAP[e.code];
    if (!k) return;
    e.preventDefault();
    keys.add(k);
    kick();
  });
  listen(window, 'keyup', (e) => {
    const k = KEYMAP[e.code];
    if (k) keys.delete(k);
  });
  listen(window, 'blur', () => keys.clear());

  // ── moons pause their orbits while pointed at or focused ──
  for (const m of moons) {
    const hold = () => {
      pause++;
      kick();
    };
    const letGo = () => {
      pause = Math.max(0, pause - 1);
      kick();
    };
    listen(m.el, 'pointerenter', hold);
    listen(m.el, 'pointerleave', letGo);
    listen(m.el, 'focus', hold);
    listen(m.el, 'blur', letGo);
  }

  // ── camera: tilt on phones, the pointer on desktops ──
  let orientSeen = false;
  let motionSeen = false;
  let beta0 = null;
  listen(window, 'deviceorientation', (e) => {
    if (e.beta == null || e.gamma == null) return;
    if (!orientSeen) {
      orientSeen = true;
      syncChips();
    }
    if (panelOpen) return;
    const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    const { beta, gamma } = screenAxes(e.beta, e.gamma, angle);
    // calibrated to how the phone was held, re-centring slowly so lying down doesn't stick
    if (beta0 === null) beta0 = beta;
    beta0 += (beta - beta0) * 0.004;
    const v = tiltToView(beta, gamma, beta0);
    view.te = v.e;
    view.troll = v.roll;
    kick();
  });
  listen(window, 'pointermove', (e) => {
    if (e.pointerType !== 'mouse' || panelOpen || drag || pause > 0) return;
    const v = pointerToView(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
    view.te = v.e;
    view.troll = v.roll;
    kick();
  });
  listen(document.documentElement, 'pointerleave', () => {
    view.te = E0;
    view.troll = 0;
    kick();
  });

  // ── shake: a gravitational wave ──
  const feedShake = createShakeDetector();
  let prevG = null;
  listen(window, 'devicemotion', (e) => {
    const lin = e.acceleration && e.acceleration.x != null ? e.acceleration : null;
    const g = e.accelerationIncludingGravity;
    let sample = null;
    if (lin) {
      sample = { mag: Math.hypot(lin.x, lin.y, lin.z || 0), x: lin.x, y: lin.y };
    } else if (g && g.x != null) {
      // no linear acceleration on this device: use the change in the gravity vector
      if (prevG) {
        const dx = g.x - prevG.x;
        const dy = g.y - prevG.y;
        sample = { mag: Math.hypot(dx, dy, (g.z || 0) - prevG.z), x: dx, y: dy };
      }
      prevG = { x: g.x, y: g.y, z: g.z || 0 };
    }
    if (!sample) return;
    if (!motionSeen) {
      motionSeen = true;
      syncChips();
    }
    const hit = feedShake({ t: performance.now(), ...sample });
    if (hit) shake(hit.intensity, hit.x, hit.y);
  });
  const feedWiggle = createWiggleDetector();
  listen(window, 'pointermove', (e) => {
    if (panelOpen) return;
    const hit = feedWiggle(e.timeStamp, e.clientX);
    if (hit) shake(hit.intensity, hit.dir, 0);
  });

  function shake(intensity, dx = 0, dy = 0) {
    if (panelOpen) return;
    const now = performance.now();
    if (now - lastShake < SHAKE_COOLDOWN_MS) return;
    lastShake = now;
    const I = clamp(intensity, 0.35, 1) * (RM ? 0.5 : 1);
    wave.a0 = Math.min(1.2, I + waveAmplitude() * 0.4);
    wave.t = 0;
    flare = Math.min(1, flare + I);
    if (!dx && !dy) {
      const a = Math.random() * Math.PI * 2;
      dx = Math.cos(a);
      dy = Math.sin(a);
    }
    const l = Math.hypot(dx, dy);
    // the hole lurches with the hand, then its spring pulls it home
    hole.vx += (dx / l) * R * 9 * I;
    hole.vy += (dy / l) * R * 9 * I;
    for (const m of moons) {
      m.wv += (0.5 + Math.random() * 0.5) * 1.9 * I * (Math.random() < 0.5 ? -1 : 1);
      m.th += (Math.random() - 0.5) * 0.35 * I;
    }
    if (ship.engaged && ship.state === 'idle') {
      ship.vx += (dx / l) * R * 4 * I;
      ship.vy += (dy / l) * R * 4 * I;
    }
    if (!RM) jitter = I;
    // GW150914, the first wave LIGO caught, peaked at a strain of 1.0e-21 and chirped 35 → 250 Hz
    showToast(
      `gravitational wave · <b>h ≈ ${(0.4 + I * 0.8).toFixed(1)} × 10⁻²¹</b><span data-wide> · chirp 35 → 250 Hz</span>`
    );
    try {
      if (navigator.vibrate) navigator.vibrate([14, 50, 22]);
    } catch (err) {
      // haptics are a nicety; some browsers refuse them outright
    }
    kick();
  }

  const waveAmplitude = () => (wave.t > 6 ? 0 : wave.a0 * Math.exp(-wave.t * 0.55));

  let toastTimer = 0;
  function showToast(html) {
    toast.innerHTML = html;
    toast.dataset.on = '';
    clearTimeout(toastTimer);
    timers.delete(toastTimer);
    toastTimer = later(() => delete toast.dataset.on, TOAST_MS);
  }

  // ── fallback chips: iOS asks for sensors from a tap; where none arrive, buttons stand in ──
  const needsAsk = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';
  let asked = false;
  let presetIdx = 0;
  const show = (el, on) => (on ? (el.dataset.show = '') : delete el.dataset.show);

  function syncChips() {
    const touch = coarsePointer.matches;
    const ask = needsAsk && !asked;
    show(viewChip, touch && !orientSeen);
    viewChip.textContent = ask ? 'enable tilt' : 'view ↻';
    show(shakeChip, touch && !motionSeen && !ask);
  }

  function askSensors() {
    asked = true;
    const asks = [DeviceMotionEvent.requestPermission()];
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
      asks.push(DeviceOrientationEvent.requestPermission());
    }
    Promise.all(asks)
      .catch(() => [])
      .then(() => later(syncChips, 1200));
    syncChips();
  }

  listen(viewChip, 'click', () => {
    if (needsAsk && !asked) {
      askSensors();
      return;
    }
    presetIdx = (presetIdx + 1) % CAMERA_PRESETS.length;
    const p = CAMERA_PRESETS[presetIdx];
    view.te = p.e;
    view.troll = p.roll;
    showToast(`view · <b>${p.name}</b> · i = ${inclinationDeg(viewFlat(p.e))}°`);
    kick();
  });
  listen(shakeChip, 'click', () => shake(0.9));
  later(syncChips, 1500);

  // ── simulation ──
  function stepCamera(dt) {
    const k = 1 - Math.exp(-dt * VIEW_EASE);
    view.e += (view.te - view.e) * k;
    view.roll += (view.troll - view.roll) * k;
    // the camera moves, so the far layer slides against the hole
    const px = view.roll * (mobile ? 10 : 16);
    const py = -(view.e - E0) * (mobile ? 10 : 16);
    if (Math.abs(px - parallax.x) + Math.abs(py - parallax.y) > 0.02) {
      parallax.x = px;
      parallax.y = py;
      hero.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0)`;
    }
  }

  function stepShake(dt) {
    wave.t += dt;
    flare *= Math.exp(-dt * 1.3);
    if (flare < 0.002) flare = 0;
    if (jitter > 0.01) {
      jitter *= Math.exp(-dt * 9);
      const j = 9 * jitter;
      world.style.transform = `translate3d(${((Math.random() - 0.5) * j).toFixed(1)}px, ${((Math.random() - 0.5) * j).toFixed(1)}px, 0)`;
    } else if (jitter) {
      jitter = 0;
      world.style.transform = '';
    }
  }

  function stepHole(dt) {
    if (drag) {
      const k = 1 - Math.exp(-dt * 22);
      const nx = hole.x + (drag.tx - hole.x) * k;
      const ny = hole.y + (drag.ty - hole.y) * k;
      hole.vx = (nx - hole.x) / dt;
      hole.vy = (ny - hole.y) / dt;
      hole.x = nx;
      hole.y = ny;
      return;
    }
    // under-damped spring home: it overshoots a touch, like something with mass.
    // The hole is the near layer, so it slides against the stars as the camera moves.
    const tx = panelOpen ? hole.hx : hole.hx - view.roll * R * 0.35;
    const ty = panelOpen ? hole.hy : hole.hy + (view.e - E0) * R * 0.35;
    const k = 55;
    const c = 2 * Math.sqrt(k) * 0.52;
    hole.vx += ((tx - hole.x) * k - hole.vx * c) * dt;
    hole.vy += ((ty - hole.y) * k - hole.vy * c) * dt;
    hole.x += hole.vx * dt;
    hole.y += hole.vy * dt;
  }

  function stepShip(dt) {
    if (ship.state === 'gone') return;
    if (ship.state === 'fall') {
      ship.f += dt / 0.95;
      if (ship.f >= 1) {
        ship.state = 'gone';
        onOpen('contact', { horizon: true });
      }
      return;
    }
    let ax = 0;
    let ay = 0;
    if (!panelOpen) {
      if (keys.has('l')) ax -= 1;
      if (keys.has('r')) ax += 1;
      if (keys.has('u')) ay -= 1;
      if (keys.has('d')) ay += 1;
      if (steer) {
        const dx = steer.x - ship.x;
        const dy = steer.y - ship.y;
        const dl = Math.hypot(dx, dy);
        if (dl > 6) {
          const m = Math.min(1, dl / 90);
          ax += (dx / dl) * m;
          ay += (dy / dl) * m;
        }
      }
    }
    const al = Math.hypot(ax, ay);
    if (al > 1) {
      ax /= al;
      ay /= al;
    }
    ship.thrust += ((al > 0.05 ? 1 : 0) - ship.thrust) * (1 - Math.exp(-dt * 14));
    if (al > 0.05) ship.engaged = true;

    const thrust = Math.max(280, R * 6.2);
    const dx = hole.x - ship.x;
    const dy = hole.y - ship.y;
    const r = Math.hypot(dx, dy);
    // gravity only engages on the first thrust, so nobody loads the page into a fall
    const { gx, gy } = ship.engaged && !panelOpen ? shipGravity(dx, dy, R) : { gx: 0, gy: 0 };
    ship.vx += (ax * thrust + gx) * dt;
    ship.vy += (ay * thrust + gy) * dt;
    const damping = Math.exp(-0.55 * dt);
    ship.vx *= damping;
    ship.vy *= damping;
    const v = Math.hypot(ship.vx, ship.vy);
    const vmax = Math.max(380, R * 7.5);
    if (v > vmax) {
      ship.vx *= vmax / v;
      ship.vy *= vmax / v;
    }
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    if (ship.x < 12 || ship.x > W - 12) {
      ship.vx *= -0.5;
      ship.x = clamp(ship.x, 12, W - 12);
    }
    if (ship.y < 12 || ship.y > H - 12) {
      ship.vy *= -0.5;
      ship.y = clamp(ship.y, 12, H - 12);
    }
    if (v > 18) {
      const d = Math.atan2(Math.sin(Math.atan2(ship.vy, ship.vx) - ship.a), Math.cos(Math.atan2(ship.vy, ship.vx) - ship.a));
      ship.a += d * (1 - Math.exp(-dt * 9));
    }
    ship.tt += dt;
    if (ship.tt > 0.03 && ship.engaged) {
      ship.tt = 0;
      ship.trail.push({ x: ship.x, y: ship.y });
      if (ship.trail.length > 28) ship.trail.shift();
    }

    if (ship.engaged && r < R * 1.02) {
      ship.state = 'fall';
      ship.f = 0;
      ship.fa = Math.atan2(ship.y - hole.y, ship.x - hole.x);
      ship.fr = r;
      return;
    }
    if (ship.engaged && !panelOpen) {
      const reach = mobile ? 18 : 22;
      for (const m of moons) {
        if (m.op > 0.5 && Math.hypot(m.x - ship.x, m.y - ship.y) < reach) {
          ship.vx = 0;
          ship.vy = 0;
          ship.engaged = false;
          ship.trail.length = 0;
          onOpen(m.id, { horizon: false });
          break;
        }
      }
    }
  }

  function stepMoons(dt) {
    const target = pause > 0 || RM || panelOpen ? 0 : 1;
    orbitSpeed += (target - orbitSpeed) * (1 - Math.exp(-dt * 6));
    const flat = viewFlat(view.e);
    const below = view.e < 0;
    const roll = view.roll * ROLL_MAX;
    const half = mobile ? 7 : 8;
    for (const m of moons) {
      m.th += (dt * orbitSpeed * Math.PI * 2) / m.T;
      // knocked off their orbits by a shake, then rung back like a struck bell
      m.wv += (-60 * m.wo - 4 * m.wv) * dt;
      m.wo += m.wv * dt;
      const opening = orbitOpening(m.ratio, flat, mobile);
      const scale = Math.min(orbitScaleX, roomY / (OUTER_A * R * (0.25 + opening)));
      const p = orbitPoint({ major: m.a * R * scale * (1 + m.wo), opening, angle: m.angle + roll, phase: m.th, below });
      m.x = hole.x + p.x;
      m.y = hole.y + p.y;
      const s = p.depth;
      const size = 0.8 + 0.24 * (s * 0.5 + 0.5);
      let op = s < 0 ? 0.6 + 0.4 * (1 + s) : 1;
      if (s < 0) op *= smoothstep(1.0, 1.55, Math.hypot(p.x, p.y) / R); // hidden behind the shadow
      m.op = op;
      const flip = m.x + m.width - half > W - 12;
      if (flip !== m.flip) {
        m.flip = flip;
        if (flip) m.el.dataset.flip = '';
        else delete m.el.dataset.flip;
      }
      const ox = flip ? m.width - half : half;
      const st = m.el.style;
      st.transform = `translate3d(${(m.x - ox).toFixed(1)}px, ${(m.y - half).toFixed(1)}px, 0) scale(${size.toFixed(3)})`;
      st.opacity = op.toFixed(3);
      st.zIndex = s < 0 ? 1 : 3;
      st.pointerEvents = op < 0.25 ? 'none' : '';
    }
  }

  // ── drawing ──
  function render() {
    if (!gl) {
      fallbackHole.style.width = fallbackHole.style.height = `${R * 2}px`;
      fallbackHole.style.transform = `translate(${hole.x - R}px, ${hole.y - R}px)`;
      glCanvas.style.opacity = dim;
      return;
    }
    gl.uniform2f(U.uRes, glCanvas.width, glCanvas.height);
    gl.uniform2f(U.uHole, hole.x * dpr, hole.y * dpr);
    gl.uniform1f(U.uR, R * dpr);
    gl.uniform1f(U.uTime, T);
    gl.uniform1f(U.uDim, dim);
    gl.uniform1f(U.uWaveT, wave.t);
    gl.uniform1f(U.uWaveA, waveAmplitude());
    gl.uniform1f(U.uFlare, flare);
    gl.uniform1f(U.uFlat, viewFlat(view.e));
    gl.uniform1f(U.uSgn, view.e < 0 ? -1 : 1);
    gl.uniform1f(U.uRoll, view.roll * ROLL_MAX);
    gl.uniform2f(U.uPar, parallax.x * dpr, parallax.y * dpr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Only the patch the ship and its trail last covered gets cleared.
  let dirty = null;
  function drawShip() {
    if (dirty) fx.clearRect(dirty.x, dirty.y, dirty.w, dirty.h);
    dirty = null;
    if (ship.state === 'gone') return;
    let minX = ship.x;
    let maxX = ship.x;
    let minY = ship.y;
    let maxY = ship.y;
    const n = ship.trail.length;
    for (let i = 0; i < n; i++) {
      const t = ship.trail[i];
      fx.globalAlpha = (i / n) * 0.55;
      fx.fillStyle = i % 3 ? '#22e0dd' : '#ff5cf0';
      fx.beginPath();
      fx.arc(t.x, t.y, 0.6 + (i / n) * 1.3, 0, Math.PI * 2);
      fx.fill();
      minX = Math.min(minX, t.x);
      maxX = Math.max(maxX, t.x);
      minY = Math.min(minY, t.y);
      maxY = Math.max(maxY, t.y);
    }
    fx.globalAlpha = 1;

    let x = ship.x;
    let y = ship.y;
    let a = ship.a;
    let sx = 1;
    let sy = 1;
    let alpha = 1;
    if (ship.state === 'fall') {
      // spaghettification: stretched along the radius, squeezed across it, spiralling in
      const f = ship.f;
      const ang = ship.fa + f * 2.2;
      const rr = ship.fr * Math.pow(1 - f, 1.4);
      x = hole.x + Math.cos(ang) * rr;
      y = hole.y + Math.sin(ang) * rr;
      a = ang + Math.PI;
      sx = 1 + f * 5;
      sy = Math.max(0.05, 1 - f * 0.92);
      alpha = 1 - smoothstep(0.55, 1, f);
    } else if (!ship.engaged) {
      y += Math.sin(T * 2.2) * 2;
      fx.strokeStyle = 'rgba(34, 224, 221, 0.4)';
      fx.setLineDash([1.5, 4]);
      fx.lineWidth = 1.4;
      fx.beginPath();
      fx.arc(x, y, 18 + Math.sin(T * 2.2) * 1.5, 0, Math.PI * 2);
      fx.stroke();
      fx.setLineDash([]);
    }
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    const s = mobile ? 0.85 : 1;
    fx.save();
    fx.globalAlpha = alpha;
    fx.translate(x, y);
    fx.rotate(a);
    fx.scale(s * sx, s * sy);
    if (ship.thrust > 0.02) {
      const len = 8 + ship.thrust * (10 + Math.random() * 6);
      const flame = fx.createLinearGradient(-5, 0, -5 - len, 0);
      flame.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      flame.addColorStop(0.3, 'rgba(255, 92, 240, 0.85)');
      flame.addColorStop(1, 'rgba(34, 224, 221, 0)');
      fx.fillStyle = flame;
      fx.beginPath();
      fx.moveTo(-5, -3.2);
      fx.lineTo(-5 - len, 0);
      fx.lineTo(-5, 3.2);
      fx.closePath();
      fx.fill();
    }
    const body = fx.createLinearGradient(-9, -6, 13, 6);
    body.addColorStop(0, '#5a63c9');
    body.addColorStop(0.55, '#dfe6ff');
    body.addColorStop(1, '#ffffff');
    fx.fillStyle = body;
    fx.beginPath();
    fx.moveTo(13, 0);
    fx.lineTo(-8, -7.5);
    fx.lineTo(-4.5, 0);
    fx.lineTo(-8, 7.5);
    fx.closePath();
    fx.fill();
    fx.fillStyle = 'rgba(10, 10, 20, 0.45)';
    fx.beginPath();
    fx.moveTo(13, 0);
    fx.lineTo(-4.5, 0);
    fx.lineTo(-8, 7.5);
    fx.closePath();
    fx.fill();
    fx.fillStyle = '#22e0dd';
    fx.beginPath();
    fx.ellipse(3.5, 0, 2.6, 1.5, 0, 0, Math.PI * 2);
    fx.fill();
    fx.restore();

    // ship (with flame and stretch) reaches ~70px from its centre at most
    const pad = 72;
    dirty = { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }

  let hudClock = 0;
  let hudText = '';
  function drawHud(dt) {
    if (mobile) return; // hidden on phones
    hudClock += dt;
    if (hudClock < 0.1) return;
    hudClock = 0;
    const r = Math.hypot(ship.x - hole.x, ship.y - hole.y) / R;
    const v = Math.hypot(ship.vx, ship.vy);
    let shipLine = 'ship  idle — gravity engages on first thrust';
    if (ship.state === 'fall') shipLine = `ship  <b>r → 1.00 r_s</b>   tidal stretch ×${(1 + ship.f * 5).toFixed(1)}`;
    else if (ship.engaged) {
      shipLine = `ship  r <b>${r.toFixed(2).padStart(5)} r_s</b>   v <b>${String(Math.round(v)).padStart(3)} px/s</b>`;
    }
    const roll = Math.round(view.roll * ROLL_MAX * (180 / Math.PI));
    const next =
      `r_s <b>${Math.round(R)} px</b>   θ_E <b>${TE.toFixed(2)} r_s</b>   ` +
      `view i <b>${String(inclinationDeg(viewFlat(view.e))).padStart(2)}°</b>${view.e < 0 ? ' below' : ''}  roll <b>${String(roll).padStart(3)}°</b>\n` +
      `${shipLine}\n` +
      `moons  T ∝ a^1.5 → ${moons.map((m) => `<b>${Math.round(m.T)} s</b>`).join(' · ')}`;
    if (next !== hudText) {
      hudText = next;
      hud.innerHTML = next;
    }
  }

  // ── loop ──
  function settled() {
    return (
      !drag &&
      Math.abs(hole.vx) + Math.abs(hole.vy) < 0.5 &&
      Math.abs(hole.hx - hole.x) + Math.abs(hole.hy - hole.y) < 0.5 &&
      Math.abs(dim - dimTarget) < 0.004
    );
  }
  const animating = () =>
    wave.t < 6 || flare > 0 || jitter > 0 || Math.abs(view.te - view.e) + Math.abs(view.troll - view.roll) > 0.002;

  function watchFrameRate(dt) {
    // ignore the long gap after a tab switch (a genuinely slow device still counts),
    // and the moments a panel owns the GPU
    if (dt > TAB_RETURN_GAP || panelOpen || !gl) return;
    slowFrames = dt > SLOW_FRAME ? slowFrames + 1 : Math.max(0, slowFrames - 2);
    if (slowFrames < SLOW_FRAMES_TO_DOWNSCALE || quality <= MIN_QUALITY) return;
    slowFrames = 0;
    quality = Math.max(MIN_QUALITY, quality * 0.8);
    sizeCanvases();
    repaintSky();
  }

  function frame(now) {
    raf = 0;
    if (destroyed) return;
    const rawDt = (now - last) / 1000;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));
    last = now;
    watchFrameRate(rawDt);
    if (!RM) T += dt * (1 + 3 * flare); // a flared disk spins up for a moment
    stepCamera(dt);
    stepShake(dt);
    stepHole(dt);
    dim += (dimTarget - dim) * (1 - Math.exp(-dt * 7));
    stepShip(dt);
    stepMoons(dt);
    render();
    drawShip();
    drawHud(dt);
    if (document.hidden) return;
    // With a panel open the scene freezes once the hole has slid aside: the panel gets the GPU.
    if (panelOpen && settled() && ship.state !== 'fall') return;
    // Reduced motion: no ambient animation, so the loop only runs while something moves.
    const shipStill = !keys.size && !steer && Math.hypot(ship.vx, ship.vy) < 1 && ship.state !== 'fall';
    if (RM && settled() && !animating() && shipStill) return;
    raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (raf || destroyed || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  listen(document, 'visibilitychange', () => {
    if (!document.hidden) kick();
  });
  const onMotionPref = (e) => {
    RM = e.matches;
    kick();
  };
  reducedMotion.addEventListener('change', onMotionPref);
  disposers.push(() => reducedMotion.removeEventListener('change', onMotionPref));

  listen(glCanvas, 'webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    gl = null;
  });
  listen(glCanvas, 'webglcontextrestored', () => {
    if (initGL()) layout();
  });

  // ── boot ──
  if (!initGL()) stage.dataset.gl = 'off';
  let pendingLayout = 0;
  const resizer = new ResizeObserver(() => {
    if (!pendingLayout) {
      pendingLayout = requestAnimationFrame(() => {
        pendingLayout = 0;
        layout();
      });
    }
  });
  resizer.observe(stage);
  disposers.push(() => {
    resizer.disconnect();
    cancelAnimationFrame(pendingLayout);
  });
  layout();
  // the lensed copy of the name needs the real faces, so paint again once they arrive
  if (document.fonts) {
    document.fonts.ready.then(() => {
      if (destroyed) return;
      repaintSky();
      kick();
    });
  }

  return {
    setPanel(open) {
      if (open === panelOpen) return;
      panelOpen = open;
      if (open) {
        keys.clear();
        steer = null;
        drag = null;
        dimTarget = DIM_WITH_PANEL;
      } else {
        dimTarget = 1;
        if (ship.state === 'gone') spawn();
      }
      const home = homeFor();
      hole.hx = home.x;
      hole.hy = home.y;
      kick();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      raf = 0;
      for (const id of timers) clearTimeout(id);
      for (const dispose of disposers) dispose();
      releaseGL();
      world.style.transform = '';
      hero.style.transform = '';
    }
  };
}

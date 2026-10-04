// Pure maths behind the scene: no DOM, no WebGL, so it can be unit-tested with node:test.
// Lengths are in units of the shadow radius R unless a name says px.

export const TE = 1.6; // Einstein radius
export const RIN = 1.5; // accretion disk, inner edge
export const ROUT = 3.4; // accretion disk, outer edge

// The camera. Elevation runs -1 (from below) … 0 (edge-on) … 1 (from above).
export const E0 = 0.15; // resting view: just above the disk plane
export const ROLL_MAX = 0.5; // radians, ~29°

// `a` is the semi-major axis; `ratio` the minor/major ratio seen at the resting view;
// `rot` the orbit's own tilt on screen; `th` its starting phase.
export const MOONS = [
  { id: 'projects', label: 'Projects', n: '01', a: 2.55, ratio: 0.34, rot: -14, color: '#22e0dd', th: 0.7 },
  { id: 'career', label: 'Career', n: '02', a: 3.35, ratio: 0.3, rot: 9, color: '#ff5cf0', th: 2.55 },
  { id: 'method', label: 'How I work', n: '03', a: 4.2, ratio: 0.27, rot: -4, color: '#ffb36b', th: 4.3 },
  { id: 'contact', label: 'Contact', n: '04', a: 5.1, ratio: 0.32, rot: 18, color: '#e3e8ff', th: 5.75 }
];
export const OUTER_A = Math.max(...MOONS.map((m) => m.a));

// Kepler's third law, T ∝ a^1.5, so the inner moon really does lap the outer ones.
const KEPLER_SECONDS = 6.5;
export const keplerPeriod = (a) => KEPLER_SECONDS * Math.pow(a, 1.5);

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// How flat the disk looks: sin(elevation), from a thin line edge-on to almost a circle.
export const viewFlat = (e) => 0.08 + 0.82 * Math.min(1, Math.abs(e));

// Inclination as astronomers quote it: 0° face-on, 90° edge-on.
export const inclinationDeg = (flat) => Math.round((Math.acos(clamp(flat, -1, 1)) * 180) / Math.PI);

// Seen face-on an orbit opens towards a circle; phones are narrow, so theirs open further.
export function orbitOpening(ratio, flat, mobile) {
  return Math.min(0.95, (ratio + (flat - 0.2) * 0.9) * (mobile ? 1.7 : 1));
}

/**
 * Screen offset of a moon from the hole, in px.
 * `depth` > 0 means the near half of the orbit; from below, that half is drawn on top.
 */
export function orbitPoint({ major, opening, angle, phase, below }) {
  const c = Math.cos(phase);
  const s = Math.sin(phase);
  const lx = major * c;
  const ly = major * opening * s * (below ? -1 : 1);
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  return { x: lx * ca - ly * sa, y: lx * sa + ly * ca, depth: s };
}

// Softened inverse square, scaled to the hole so a phone and a laptop play the same.
// The 0.5R² softening keeps it finite at the centre.
const GRAVITY_PER_R = 15;
export function shipGravity(dx, dy, R) {
  const r2 = dx * dx + dy * dy;
  const r = Math.sqrt(r2) || 1;
  const g = (GRAVITY_PER_R * R * R * R) / (r2 + 0.5 * R * R);
  return { gx: (dx / r) * g, gy: (dy / r) * g };
}

// Map a phone's tilt (degrees, already in screen axes) onto the camera. `beta0` is how the
// phone was being held; tipping the top edge away from you looks down onto the disk.
const TILT_RANGE = 32;
export function tiltToView(beta, gamma, beta0) {
  return {
    e: clamp(E0 + (beta0 - beta) / TILT_RANGE, -0.8, 1),
    roll: clamp(gamma / TILT_RANGE, -1, 1)
  };
}

// deviceorientation reports in the device's own axes; turn them into the screen's.
export function screenAxes(beta, gamma, angle) {
  if (angle === 90) return { beta: -gamma, gamma: beta };
  if (angle === -90 || angle === 270) return { beta: gamma, gamma: -beta };
  return { beta, gamma };
}

// Desktop: the pointer is the camera. nx, ny in -0.5 … 0.5 from the window's centre.
export function pointerToView(nx, ny) {
  return { e: clamp(E0 - ny * 1.7, -0.6, 0.95), roll: clamp(nx * 2, -1, 1) };
}

/**
 * Shake from devicemotion: `hits` samples above `threshold` m/s² inside `windowMs`.
 * Returns a feed function; it answers { intensity, x, y } once per shake, else null.
 */
export function createShakeDetector({ threshold = 13, windowMs = 500, hits = 3 } = {}) {
  const peaks = [];
  return function feed({ t, mag, x = 0, y = 0 }) {
    if (mag > threshold) peaks.push({ t, mag, x, y });
    while (peaks.length && t - peaks[0].t > windowMs) peaks.shift();
    if (peaks.length < hits) return null;
    const top = peaks.reduce((a, b) => (b.mag > a.mag ? b : a));
    peaks.length = 0;
    // device x is screen right, device y is screen up
    return { intensity: top.mag / 30, x: top.x, y: -top.y };
  };
}

/**
 * Desktop stand-in for a shake: the pointer swung left-right fast, `flips` reversals
 * inside `windowMs`. Returns a feed function answering { intensity, dir } or null.
 */
export function createWiggleDetector({ speed = 1100, windowMs = 700, flips = 4 } = {}) {
  let lastX = null;
  let lastT = 0;
  let dir = 0;
  const reversals = [];
  return function feed(t, x) {
    let hit = null;
    if (lastX !== null) {
      const v = ((x - lastX) / Math.max(1, t - lastT)) * 1000;
      if (Math.abs(v) > speed) {
        const s = Math.sign(v);
        if (dir && s !== dir) reversals.push({ t, v: Math.abs(v) });
        dir = s;
      }
      while (reversals.length && t - reversals[0].t > windowMs) reversals.shift();
      if (reversals.length >= flips) {
        const avg = reversals.reduce((a, r) => a + r.v, 0) / reversals.length;
        hit = { intensity: 0.45 + avg / 5000, dir };
        reversals.length = 0;
      }
    }
    lastX = x;
    lastT = t;
    return hit;
  };
}

// The point-mass thin lens: a ray seen at d (from the hole) left the source at d·(1 − θE²/r²).
export function lensSource(dx, dy) {
  const r2 = Math.max(dx * dx + dy * dy, 1e-8);
  const k = 1 - (TE * TE) / r2;
  return { x: dx * k, y: dy * k };
}

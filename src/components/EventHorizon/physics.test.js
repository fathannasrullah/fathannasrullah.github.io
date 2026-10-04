import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  E0,
  MOONS,
  OUTER_A,
  TE,
  createShakeDetector,
  createWiggleDetector,
  inclinationDeg,
  keplerPeriod,
  lensSource,
  orbitOpening,
  orbitPoint,
  pointerToView,
  screenAxes,
  shipGravity,
  smoothstep,
  tiltToView,
  viewFlat
} from './physics.js';

test('moon periods follow Kepler: T² ∝ a³', () => {
  const [inner, outer] = [MOONS[0], MOONS[MOONS.length - 1]];
  const ratio = keplerPeriod(outer.a) / keplerPeriod(inner.a);
  assert.ok(Math.abs(ratio - Math.pow(outer.a / inner.a, 1.5)) < 1e-9);
  assert.deepEqual(MOONS.map((m) => Math.round(keplerPeriod(m.a))), [26, 40, 56, 75]);
});

test('outermost orbit is the contact moon', () => {
  assert.equal(OUTER_A, 5.1);
});

test('view flatness spans edge-on to nearly face-on, symmetric above and below', () => {
  assert.equal(viewFlat(0), 0.08);
  assert.ok(Math.abs(viewFlat(1) - 0.9) < 1e-12);
  assert.equal(viewFlat(2), viewFlat(1));
  assert.equal(viewFlat(-0.5), viewFlat(0.5));
  assert.equal(inclinationDeg(viewFlat(E0)), 78);
  assert.equal(inclinationDeg(viewFlat(1)), 26);
  assert.equal(inclinationDeg(1), 0);
});

test('orbits open up face-on and never exceed a circle', () => {
  assert.ok(orbitOpening(0.3, viewFlat(1), false) > orbitOpening(0.3, viewFlat(E0), false));
  assert.equal(orbitOpening(0.34, 0.9, true), 0.95);
});

test('orbitPoint: near half is below the hole, and mirrors when seen from below', () => {
  const near = orbitPoint({ major: 100, opening: 0.3, angle: 0, phase: Math.PI / 2, below: false });
  assert.ok(Math.abs(near.x) < 1e-9);
  assert.ok(Math.abs(near.y - 30) < 1e-9);
  assert.equal(near.depth, 1);
  const fromBelow = orbitPoint({ major: 100, opening: 0.3, angle: 0, phase: Math.PI / 2, below: true });
  assert.ok(Math.abs(fromBelow.y + 30) < 1e-9);
  const tilted = orbitPoint({ major: 100, opening: 0.3, angle: Math.PI / 2, phase: 0, below: false });
  assert.ok(Math.abs(tilted.x) < 1e-9 && Math.abs(tilted.y - 100) < 1e-9);
});

test('ship gravity points at the hole, falls off with distance and stays finite at r = 0', () => {
  const R = 80;
  const near = shipGravity(2 * R, 0, R);
  const far = shipGravity(4 * R, 0, R);
  assert.ok(near.gx > far.gx && far.gx > 0);
  assert.equal(near.gy, 0);
  const centre = shipGravity(0, 0, R);
  assert.ok(Number.isFinite(centre.gx) && Number.isFinite(centre.gy));
});

test('tilt maps onto the camera, calibrated to how the phone is held', () => {
  assert.deepEqual(tiltToView(50, 0, 50), { e: E0, roll: 0 });
  assert.ok(tiltToView(20, 0, 50).e > E0); // top edge tipped away: looking down
  assert.ok(tiltToView(80, 0, 50).e < 0); // tipped towards you: from below
  assert.equal(tiltToView(50, 90, 50).roll, 1);
  assert.equal(tiltToView(-200, 0, 50).e, 1);
});

test('landscape swaps the tilt axes', () => {
  assert.deepEqual(screenAxes(10, 20, 0), { beta: 10, gamma: 20 });
  assert.deepEqual(screenAxes(10, 20, 90), { beta: -20, gamma: 10 });
  assert.deepEqual(screenAxes(10, 20, 270), { beta: 20, gamma: -10 });
});

test('pointer at the top looks from above, at the sides from left and right', () => {
  assert.ok(pointerToView(0, -0.5).e > 0.9);
  assert.ok(pointerToView(0, 0.5).e < 0);
  assert.equal(pointerToView(-0.5, 0).roll, -1);
  assert.equal(pointerToView(0, 0).e, E0);
});

test('shake detector fires once for a burst and ignores gentle motion', () => {
  const feed = createShakeDetector();
  assert.equal(feed({ t: 0, mag: 5 }), null);
  assert.equal(feed({ t: 10, mag: 20, x: 3, y: 1 }), null);
  assert.equal(feed({ t: 20, mag: 25, x: -5, y: 2 }), null);
  const hit = feed({ t: 30, mag: 22, x: 4, y: 1 });
  assert.ok(hit);
  assert.ok(Math.abs(hit.intensity - 25 / 30) < 1e-9);
  assert.deepEqual([hit.x, hit.y], [-5, -2]);
  assert.equal(feed({ t: 40, mag: 22 }), null); // reset after firing
});

test('shake peaks older than the window expire', () => {
  const feed = createShakeDetector();
  feed({ t: 0, mag: 20 });
  feed({ t: 10, mag: 20 });
  assert.equal(feed({ t: 900, mag: 20 }), null);
});

test('wiggle detector needs fast reversals', () => {
  const fast = createWiggleDetector();
  let hit = null;
  for (let i = 0; i <= 6 && !hit; i++) hit = fast(i * 16, i % 2 ? 300 : 700);
  assert.ok(hit);
  assert.ok(hit.intensity > 0.45);

  const slow = createWiggleDetector();
  let none = null;
  for (let i = 0; i <= 6; i++) none = none || slow(i * 1000, i % 2 ? 300 : 700);
  assert.equal(none, null);
});

test('thin lens: the Einstein ring images the point straight behind the hole', () => {
  const s = lensSource(TE, 0);
  assert.ok(Math.abs(s.x) < 1e-12 && Math.abs(s.y) < 1e-12);
  const outside = lensSource(10, 0);
  assert.ok(outside.x > 0 && outside.x < 10);
  assert.ok(lensSource(1, 0).x < 0); // inside the ring the image comes from the far side
});

test('smoothstep clamps and eases', () => {
  assert.equal(smoothstep(0, 1, -1), 0);
  assert.equal(smoothstep(0, 1, 2), 1);
  assert.equal(smoothstep(0, 1, 0.5), 0.5);
});

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import * as THREE from 'three';

import logo from '../../assets/images/fathan-logo.png';
import data from '../../utils/dummy';

import './styles.scss';

// Each letter carries its own depth, so tilting the headline moves them at different
// rates. The two words sit on separate planes: FATHAN is carved into the surface,
// NASRULLAH floats above it.
const FATHAN = [
  { ch: 'F', delay: 0.1, z: 0 },
  { ch: 'a', delay: 0.16, z: 26 },
  { ch: 't', delay: 0.22, z: 48 },
  { ch: 'h', delay: 0.28, z: 48 },
  { ch: 'a', delay: 0.34, z: 26 },
  { ch: 'n', delay: 0.4, z: 0 }
];

const NASRULLAH = [
  { ch: 'N', delay: 0.46, z: 66 },
  { ch: 'a', delay: 0.51, z: 84 },
  { ch: 's', delay: 0.56, z: 98 },
  { ch: 'r', delay: 0.61, z: 110 },
  { ch: 'u', delay: 0.66, z: 110 },
  { ch: 'l', delay: 0.71, z: 98 },
  { ch: 'l', delay: 0.76, z: 84 },
  { ch: 'a', delay: 0.81, z: 66 },
  { ch: 'h', delay: 0.86, z: 44 }
];

const NODE_DEFS = [
  { id: 'work', label: 'Projects', glyph: '◆', left: '22%', top: '30%' },
  { id: 'career', label: 'Career', glyph: '▲', left: '70%', top: '24%' },
  { id: 'about', label: 'How I work', glyph: '●', left: '34%', top: '76%' },
  { id: 'contact', label: 'Contact', glyph: '✉', left: '80%', top: '70%' }
];

const TITLES = { work: 'Projects', career: 'Career', about: 'How I work', contact: 'Contact' };

const EMAIL = 'fathannasrullah0@gmail.com';

// Physics is written against a 60fps step and then scaled by real elapsed time, so a
// 120Hz display no longer flies the ship at double speed.
const REF_FPS = 60;
const ACCEL = 0.65;
const DAMPING = 0.88;
const TURN = 0.22;

// Gravity radii come from the well circle. They used to come from the whole button,
// whose width includes the text label — "How I work" is wide enough that on a phone
// the pull radius covered half the field and the ship was captured on load.
const PULL_R = 2.6;
const CAPTURE_R = 0.55;

// Ship attitude. Bank comes from how fast the heading is changing, pitch from thrust —
// both already exist in the loop, so this costs one extra transform string per frame.
const MAX_BANK = 34;
const MAX_PITCH = 18;

function ShipSvg() {
  // useId() emits colons, which are unsafe inside an SVG url(#...) reference
  const hull = `gw-hull-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg className="gw-ship-svg" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={hull} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#d8dbe4" />
          <stop offset="100%" stopColor="#767d90" />
        </linearGradient>
      </defs>
      <path d="M12 16 L2.5 27 L12 23.5 Z" fill="#ff5cf0" />
      <path d="M20 16 L29.5 27 L20 23.5 Z" fill="#ff5cf0" />
      <path d="M16 1 C20 7 22 14.5 22 21.5 L16 25.5 L10 21.5 C10 14.5 12 7 16 1 Z" fill={`url(#${hull})`} />
      <ellipse cx="16" cy="11.5" rx="3.1" ry="4.8" fill="#08080f" />
      <ellipse cx="16" cy="10.8" rx="1.9" ry="3.1" fill="#22e0dd" />
      <rect x="12.8" y="22.4" width="6.4" height="2.8" rx="1.4" fill="#22e0dd" />
    </svg>
  );
}

export default function GravityLanding() {
  const [panel, setPanel] = useState(null);
  const [visited, setVisited] = useState([]);
  const [hint, setHint] = useState('arrows / wasd or drag — fly into a hole to open it');

  const titleId = `gw-dialog-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const heroRef = useRef(null);
  const h1Ref = useRef(null);
  const subRef = useRef(null);
  const gradWordRef = useRef(null);

  const fieldRef = useRef(null);
  const orbRef = useRef(null);
  const shipRef = useRef(null);
  const shadowRef = useRef(null);
  const solidWordRef = useRef(null);
  const glRef = useRef(null);
  const nodeRefs = useRef({});
  const wellRefs = useRef({});

  const panelElRef = useRef(null);
  const lastFocused = useRef(null);

  const orb = useRef({ x: 60, y: 60, vx: 0, vy: 0 });
  const heading = useRef(0);
  const bank = useRef(0);
  const keys = useRef({});
  const drag = useRef(null);
  const falling = useRef(false);
  const cooldown = useRef(0);
  const panelRef = useRef(null);
  // Nothing pulls until the player actually takes control. Tuning radii alone was not
  // enough: the wells are placed by percentage, so on a short field they crowd the
  // spawn point and the ship was captured before anyone touched it.
  const engaged = useRef(false);

  // Field geometry, measured on mount and on resize instead of every animation frame.
  // The old loop called getBoundingClientRect five times per frame — 300 forced layouts
  // a second — which was the main source of jank.
  const layout = useRef({ w: 0, h: 0, wells: [] });

  useEffect(() => {
    panelRef.current = panel;
  }, [panel]);

  const measure = useCallback(() => {
    const field = fieldRef.current;
    if (!field) return;
    const box = field.getBoundingClientRect();
    const wells = NODE_DEFS.map((n) => {
      const el = wellRefs.current[n.id];
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        id: n.id,
        cx: b.left - box.left + b.width / 2,
        cy: b.top - box.top + b.height / 2,
        r: b.width / 2
      };
    }).filter(Boolean);
    layout.current = { w: box.width, h: box.height, wells };
  }, []);

  const openPanel = useCallback((id) => {
    cooldown.current = Date.now() + 1200;
    setVisited((v) => (v.includes(id) ? v : v.concat(id)));
    setPanel(id);
  }, []);

  // The four wells are positioned by percentage, so the roomiest corner of the field
  // differs by viewport. Pick whichever candidate sits furthest from all of them.
  const spawnPoint = useCallback(() => {
    const { w, h, wells } = layout.current;
    const candidates = [
      [w * 0.5, h * 0.86],
      [w * 0.5, h * 0.5],
      [w * 0.08, h * 0.5],
      [w * 0.95, h * 0.94],
      [w * 0.06, h * 0.06]
    ];
    let best = candidates[0];
    let bestD = -1;
    candidates.forEach(([x, y]) => {
      let nearest = Infinity;
      wells.forEach((wl) => {
        nearest = Math.min(nearest, Math.hypot(wl.cx - x, wl.cy - y) - wl.r);
      });
      if (nearest > bestD) {
        bestD = nearest;
        best = [x, y];
      }
    });
    return best;
  }, []);

  const closePanel = useCallback(() => {
    cooldown.current = Date.now() + 1200;
    falling.current = false;
    const { w, h } = layout.current;
    if (w && h) {
      const [sx, sy] = spawnPoint();
      orb.current.x = sx;
      orb.current.y = sy;
      orb.current.vx = 0;
      orb.current.vy = 0;
    }
    const orbEl = orbRef.current;
    if (orbEl) {
      orbEl.style.transition = 'opacity .5s ease';
      orbEl.style.opacity = '1';
      orbEl.style.setProperty('--thrust', '0');
    }
    setPanel(null);
  }, [spawnPoint]);

  const fallIn = useCallback(
    (id, cx, cy) => {
      const orbEl = orbRef.current;
      falling.current = true;
      drag.current = null;
      orb.current.x = cx;
      orb.current.y = cy;
      orb.current.vx = 0;
      orb.current.vy = 0;
      orbEl.style.transition = 'transform .42s cubic-bezier(.5,0,.75,0), opacity .42s ease';
      orbEl.style.transform = `translate(${cx}px,${cy}px) rotate(540deg) scale(.05)`;
      orbEl.style.opacity = '0';
      setTimeout(() => openPanel(id), 360);
    },
    [openPanel]
  );

  /* ───────────────────────── hero: 3D headline ───────────────────────── */

  useEffect(() => {
    const word = gradWordRef.current;

    // background-clip:text does not paint through descendants that carry their own
    // transform, so each letter owns a copy of the gradient. Re-align every copy against
    // the whole word so the cyan→magenta sweep still reads as one continuous run.
    // offsetLeft is layout-based, so the entrance animation's transforms don't skew it.
    // Offsets are accumulated from the letters' own widths rather than read from
    // offsetLeft: transform-style:preserve-3d re-parents offsetParent, and the entrance
    // animation skews getBoundingClientRect. Widths are immune to both.
    const stitch = () => {
      if (!word) return;
      const drops = Array.prototype.slice.call(word.children);
      const widths = drops.map((d) => d.offsetWidth);
      const total = widths.reduce((a, b) => a + b, 0);
      if (!total) return;
      let acc = 0;
      drops.forEach((drop, i) => {
        const letter = drop.firstChild;
        if (letter) {
          letter.style.backgroundSize = `${total}px 100%`;
          letter.style.backgroundPosition = `${-acc}px 0`;
        }
        acc += widths[i];
      });
    };

    stitch();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(stitch);
    const settle = setTimeout(stitch, 1600);
    addEventListener('resize', stitch);

    const hero = heroRef.current;
    const h1 = h1Ref.current;
    const sub = subRef.current;
    const solid = solidWordRef.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // A real solid shows a different side as it turns. Recomputing the extrusion from
    // the current angle is what separates this from a sticker with a fixed drop shadow.
    // text-shadow inherits, so one string on the word drives all six letters.
    const GREYS = ['#c9c8c3', '#a9a8a3', '#8b8a85', '#6f6e69', '#565550', '#414039'];
    const extrude = (tiltY, tiltX) => {
      const dx = -Math.sin((tiltY * Math.PI) / 180) * 0.02;
      const dy = 0.019 * Math.cos((tiltX * Math.PI) / 180);
      const layers = GREYS.map((g, i) => `${(dx * (i + 1)).toFixed(4)}em ${(dy * (i + 1)).toFixed(4)}em 0 ${g}`);
      layers.push(`${(dx * 7).toFixed(4)}em ${(dy * 7).toFixed(4)}em .05em rgba(0,0,0,.68)`);
      layers.push(`${(dx * 9).toFixed(4)}em ${(dy * 9).toFixed(4)}em .2em rgba(0,0,0,.5)`);
      if (solid) solid.style.textShadow = layers.join(',');
      if (word) {
        const f =
          `drop-shadow(${(dx * 4).toFixed(3)}em ${(dy * 4).toFixed(3)}em .03em rgba(0,0,0,.66)) ` +
          `drop-shadow(${(dx * 9).toFixed(3)}em ${(dy * 9).toFixed(3)}em .18em rgba(0,0,0,.55))`;
        // per letter: a filter on the word would flatten the 3D space they live in
        Array.prototype.forEach.call(word.children, (drop) => {
          if (drop.firstChild) drop.firstChild.style.filter = f;
        });
      }
    };
    extrude(-11, 6);

    if (reduced) {
      return () => {
        clearTimeout(settle);
        removeEventListener('resize', stitch);
      };
    }

    // The rotation itself is a CSS animation on the compositor. Only the shadow needs
    // JS, and a 7s drift does not need it 60 times a second — 8/s is imperceptible and
    // keeps the main thread free. It also stops entirely when the hero scrolls away.
    let drifting = true;
    let visible = true;
    let timer = 0;
    const t0 = performance.now();
    const tick = () => {
      if (drifting && visible && !document.hidden) {
        const phase = Math.sin((((performance.now() - t0) / 7000) % 1) * Math.PI * 2);
        extrude(-1 + phase * 10, 4 + phase * 2);
      }
      timer = setTimeout(tick, 120);
    };
    tick();

    let io;
    if ('IntersectionObserver' in window && hero) {
      io = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
      });
      io.observe(hero);
    }

    const onMove = (e) => {
      drifting = false;
      hero.classList.add('gw-hero--tilting');
      const b = hero.getBoundingClientRect();
      const x = (e.clientX - b.left) / b.width - 0.5;
      const y = (e.clientY - b.top) / b.height - 0.5;
      const ty = x * 34;
      const tx = -y * 20;
      if (h1) {
        h1.style.transition = 'none';
        h1.style.transform = `rotateY(${ty.toFixed(1)}deg) rotateX(${tx.toFixed(1)}deg)`;
      }
      // The subtitle stays flat and legible; it sits on a shallower plane, so it
      // shifts far less than the headline. Depth through motion, not ornament.
      if (sub) sub.style.transform = `translate3d(${(x * -10).toFixed(1)}px, ${(y * -5).toFixed(1)}px, 0)`;
      extrude(ty, tx);
    };
    const onLeave = () => {
      if (h1) {
        h1.style.transition = '';
        h1.style.transform = '';
      }
      if (sub) sub.style.transform = '';
      hero.classList.remove('gw-hero--tilting');
      drifting = true;
    };

    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', onLeave);

    return () => {
      clearTimeout(settle);
      clearTimeout(timer);
      removeEventListener('resize', stitch);
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
      if (io) io.disconnect();
    };
  }, []);

  /* ───────────────────────── game loop ───────────────────────── */

  useEffect(() => {
    const touch = matchMedia('(hover: none)').matches;
    setHint(touch ? 'drag the ship into a hole — or just tap one' : 'arrows / wasd or drag — fly into a hole to open it');

    const field = fieldRef.current;
    const orbEl = orbRef.current;
    const shipEl = shipRef.current;
    const shadowEl = shadowRef.current;

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(field);

    const [sx, sy] = spawnPoint();
    orb.current.x = sx;
    orb.current.y = sy;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        // must go through closePanel, otherwise the ship stays warped out of view
        if (panelRef.current) closePanel();
        return;
      }
      keys.current[e.key.toLowerCase()] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        engaged.current = true;
      }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const onKeyUp = (e) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    addEventListener('keydown', onKeyDown, { passive: false });
    addEventListener('keyup', onKeyUp);

    // Let the layout settle before gravity can grab anything.
    cooldown.current = Date.now() + 600;

    let raf;
    let prev = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - prev) / 1000, 1 / 20);
      prev = now;
      const step = dt * REF_FPS;
      const { w, h, wells } = layout.current;
      if (!w || !h) return;

      const k = keys.current;
      let thrusting = false;
      if (k.arrowleft || k.a) {
        orb.current.vx -= ACCEL * step;
        thrusting = true;
      }
      if (k.arrowright || k.d) {
        orb.current.vx += ACCEL * step;
        thrusting = true;
      }
      if (k.arrowup || k.w) {
        orb.current.vy -= ACCEL * step;
        thrusting = true;
      }
      if (k.arrowdown || k.s) {
        orb.current.vy += ACCEL * step;
        thrusting = true;
      }
      if (drag.current) {
        const gx = drag.current.x - orb.current.x;
        const gy = drag.current.y - orb.current.y;
        orb.current.vx += gx * 0.14 * step;
        orb.current.vy += gy * 0.14 * step;
        if (Math.hypot(gx, gy) > 6) thrusting = true;
      }

      const decay = Math.pow(DAMPING, step);
      orb.current.vx *= decay;
      orb.current.vy *= decay;
      orb.current.x = Math.max(16, Math.min(w - 16, orb.current.x + orb.current.vx * step));
      orb.current.y = Math.max(16, Math.min(h - 16, orb.current.y + orb.current.vy * step));

      const speed = Math.hypot(orb.current.vx, orb.current.vy);
      let turned = 0;
      if (speed > 0.4) {
        // ship art points up, so heading 0 means -y: offset atan2 by a quarter turn
        const target = Math.atan2(orb.current.vy, orb.current.vx) + Math.PI / 2;
        let diff = target - heading.current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        turned = diff * (1 - Math.pow(1 - TURN, step));
        heading.current += turned;
      }

      if (!falling.current) {
        const thrust = Math.min(1, speed / 5) * (thrusting ? 1 : 0.2);

        // Roll into the turn, the way an aircraft does. The bank eases back toward level
        // so the ship settles instead of snapping upright.
        const wantBank = Math.max(-MAX_BANK, Math.min(MAX_BANK, (turned / Math.max(dt, 0.001)) * 7));
        bank.current += (wantBank - bank.current) * Math.min(1, 0.12 * step);
        const pitch = thrust * MAX_PITCH;

        orbEl.style.transform = `translate(${orb.current.x}px,${orb.current.y}px)`;
        shipEl.style.transform =
          `rotate(${heading.current}rad) rotateY(${bank.current.toFixed(1)}deg) rotateX(${pitch.toFixed(1)}deg)`;
        orbEl.style.setProperty('--thrust', thrust.toFixed(3));

        if (shadowEl) {
          // slides out from under the ship as it leans, and narrows as it banks over
          const lean = bank.current / MAX_BANK;
          shadowEl.style.transform =
            `translateX(${(-lean * 5).toFixed(1)}px) scaleX(${(1 - Math.abs(lean) * 0.45).toFixed(2)})`;
        }
      }

      if (engaged.current && !panelRef.current && !falling.current && Date.now() > cooldown.current) {
        wells.forEach((wl) => {
          const dx = wl.cx - orb.current.x;
          const dy = wl.cy - orb.current.y;
          const d = Math.hypot(dx, dy) || 1;
          const reach = wl.r * PULL_R;
          const el = nodeRefs.current[wl.id];
          if (d < reach) {
            const pull = (1 - d / reach) * 0.5 * step;
            orb.current.vx += (dx / d) * pull;
            orb.current.vy += (dy / d) * pull;
            if (el) el.style.transform = `translate(-50%,-50%) scale(${1 + (1 - d / reach) * 0.12})`;
          } else if (el) {
            el.style.transform = 'translate(-50%,-50%)';
          }
          if (d < wl.r * CAPTURE_R) fallIn(wl.id, wl.cx, wl.cy);
        });
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [measure, closePanel, fallIn, spawnPoint]);

  /* ───────────────────────── background ───────────────────────── */

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const canvas = glRef.current;
    if (!canvas) return undefined;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
    camera.position.set(0, 4.2, 11);
    camera.lookAt(0, -0.4, 0);

    const COLS = 100;
    const ROWS = 58;
    const SP = 0.28;
    const pos = new Float32Array(COLS * ROWS * 3);
    const col = new Float32Array(COLS * ROWS * 3);
    const base = [];
    const cyan = new THREE.Color('#22e0dd');
    const mag = new THREE.Color('#ff5cf0');
    const tmp = new THREE.Color();
    let i = 0;
    for (let x = 0; x < COLS; x++) {
      for (let z = 0; z < ROWS; z++) {
        const px = (x - COLS / 2) * SP;
        const pz = (z - ROWS / 2) * SP;
        base.push(px, pz);
        pos[i * 3] = px;
        pos[i * 3 + 2] = pz;
        tmp.copy(cyan).lerp(mag, (x / COLS) * 0.85 + Math.random() * 0.15);
        const fade = 1 - Math.min(1, Math.hypot(px, pz) / 12);
        col[i * 3] = tmp.r * fade;
        col[i * 3 + 1] = tmp.g * fade;
        col[i * 3 + 2] = tmp.b * fade;
        i++;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const mouse = { x: 0, z: 0, on: 0 };
    const onMove = (e) => {
      mouse.x = ((e.clientX / innerWidth) * 2 - 1) * 8;
      mouse.z = ((e.clientY / innerHeight) * 2 - 1) * 5 + 1;
      mouse.on = 1;
    };
    addEventListener('pointermove', onMove, { passive: true });
    const resize = () => {
      renderer.setSize(innerWidth, innerHeight, false);
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    addEventListener('resize', resize);

    const arr = geo.attributes.position.array;
    const t0 = performance.now();
    let raf;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      const t = (now - t0) / 1000;
      for (let k = 0; k < base.length / 2; k++) {
        const px = base[k * 2];
        const pz = base[k * 2 + 1];
        let y = Math.sin(px * 0.42 + t * 0.72) * 0.34 + Math.cos(pz * 0.5 - t * 0.52) * 0.28;
        const d = Math.hypot(px - mouse.x, pz - mouse.z);
        if (d < 3.4) y += Math.cos(d * 1.5 - t * 3.2) * (1 - d / 3.4) * 0.95 * mouse.on;
        arr[k * 3 + 1] = y;
      }
      geo.attributes.position.needsUpdate = true;
      points.rotation.y = Math.sin(t * 0.06) * 0.12;
      if (mat.opacity < 0.95) mat.opacity = Math.min(0.95, t / 1.4);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onMove);
      removeEventListener('resize', resize);
      renderer.dispose();
      geo.dispose();
    };
  }, []);

  /* ───────────────────────── dialog focus handling ───────────────────────── */

  useEffect(() => {
    if (!panel) return undefined;
    const el = panelElRef.current;
    if (!el) return undefined;
    el.focus();

    const onTab = (e) => {
      if (e.key !== 'Tab') return;
      const focusables = el.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    el.addEventListener('keydown', onTab);

    const restore = lastFocused.current;
    return () => {
      el.removeEventListener('keydown', onTab);
      if (restore && document.contains(restore)) restore.focus();
    };
  }, [panel]);

  const localPoint = (e) => {
    const b = fieldRef.current.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };

  const score = `${visited.length}/4 found`;
  const displayedHint = visited.length === 4 ? "that's everything — now go email me" : hint;

  return (
    <div className="gw">
      <canvas ref={glRef} className="gw-canvas" />
      <div className="gw-glow" />

      <main className="gw-main">
        <header className="gw-header">
          <div className="gw-header-brand">
            <img src={logo} alt="Fathan" className="gw-header-logo" />
            <span className="gw-header-label">software engineer · id</span>
          </div>
          <a href={`mailto:${EMAIL}`} className="gw-hi">
            say hi
          </a>
        </header>

        <section className="gw-hero" ref={heroRef}>
          <div className="gw-hero-eyebrow">hey, i&apos;m</div>
          <h1 className="gw-h1" ref={h1Ref}>
            <span className="gw-h1-word gw-h1-word--solid" ref={solidWordRef}>
              {FATHAN.map((l, idx) => (
                <span key={idx} className="gw-letter-drop" style={{ animationDelay: `${l.delay}s` }}>
                  <span className="gw-letter" style={{ '--z': `${l.z}px` }}>
                    {l.ch}
                  </span>
                </span>
              ))}
            </span>
            <span className="gw-h1-word gw-h1-word--gradient" ref={gradWordRef}>
              {NASRULLAH.map((l, idx) => (
                <span key={idx} className="gw-letter-drop" style={{ animationDelay: `${l.delay}s` }}>
                  <span className="gw-letter" style={{ '--z': `${l.z}px` }}>
                    {l.ch}
                  </span>
                </span>
              ))}
            </span>
          </h1>
          <p className="gw-sub" ref={subRef}>
            {data.about.profession}
          </p>
        </section>

        <section className="gw-game">
          <div className="gw-game-bar">
            <span>{displayedHint}</span>
            <span className="gw-game-bar-right">
              <span className="gw-legend">
                <span className="gw-legend-ship">
                  <ShipSvg />
                </span>
                that&apos;s you
              </span>
              <span className="gw-score">{score}</span>
            </span>
          </div>

          <div
            ref={fieldRef}
            className="gw-field"
            onPointerDown={(e) => {
              if (e.target.closest('.gw-node')) return;
              engaged.current = true;
              drag.current = localPoint(e);
              if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (drag.current) drag.current = localPoint(e);
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
          >
            <div className="gw-field-grid" />

            {NODE_DEFS.map((n) => (
              <button
                key={n.id}
                type="button"
                ref={(el) => {
                  nodeRefs.current[n.id] = el;
                }}
                className="gw-node"
                style={{ left: n.left, top: n.top }}
                onClick={(e) => {
                  lastFocused.current = e.currentTarget;
                  openPanel(n.id);
                }}
              >
                <span
                  className="gw-node-well"
                  ref={(el) => {
                    wellRefs.current[n.id] = el;
                  }}
                >
                  <span className="gw-node-ring-dashed" />
                  <span className="gw-disk gw-disk-b" />
                  <span className="gw-disk gw-disk-c" />
                  <span className="gw-node-ring-pulse" />
                  {n.glyph}
                </span>
                <span className="gw-node-label">
                  {visited.includes(n.id) && <span className="gw-node-check">✓</span>}
                  {n.label}
                </span>
              </button>
            ))}

            <div ref={orbRef} className="gw-orb">
              <span ref={shadowRef} className="gw-ship-shadow" />
              <div ref={shipRef} className="gw-ship">
                <span className="gw-ship-flame" />
                <ShipSvg />
              </div>
            </div>
          </div>
        </section>
      </main>

      {panel && (
        <div className="gw-overlay" role="presentation" onClick={closePanel}>
          <div
            className="gw-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            ref={panelElRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gw-panel-head">
              <h2 className="gw-panel-title" id={titleId}>
                {TITLES[panel]}
              </h2>
              <button type="button" className="gw-panel-close" aria-label="Close" onClick={closePanel}>
                ✕
              </button>
            </div>

            {panel === 'work' && (
              <div>
                {data.projects.map((p) => (
                  <a key={p.title} href={p.demo} target="_blank" rel="noreferrer" className="gw-work-row">
                    <span className="gw-work-thumb">{p.img && <img src={p.img} alt="" loading="lazy" />}</span>
                    <span className="gw-work-body">
                      <span className="gw-work-title">{p.title}</span>
                      <span className="gw-work-stack">{p.stack}</span>
                    </span>
                    <span className="gw-work-arrow">↗</span>
                  </a>
                ))}
              </div>
            )}

            {panel === 'career' && (
              <div className="gw-career">
                <div className="gw-career-item">
                  <span className="gw-career-tag gw-career-tag--now">now</span>
                  <div>
                    <div className="gw-career-title">Building software, end to end</div>
                    <p className="gw-career-desc">
                      React, Next.js and design systems on the front, with enough backend to ship a whole feature myself.
                    </p>
                  </div>
                </div>
                <div className="gw-career-item">
                  <span className="gw-career-tag">3 mo</span>
                  <div>
                    <div className="gw-career-title">Junior Web Developer · mavis.co.id</div>
                    <p className="gw-career-desc">Worked on production web features with a real team and real deadlines.</p>
                  </div>
                </div>
                <div className="gw-career-item">
                  <span className="gw-career-tag">cert</span>
                  <div>
                    <div className="gw-career-title">Frontend Developer · Dicoding</div>
                    <p className="gw-career-desc">Beginner Frontend Developer certification.</p>
                  </div>
                </div>
              </div>
            )}

            {panel === 'about' && (
              <div className="gw-about">
                <p className="gw-about-lead">
                  I care about the problem people actually run into, not the feature list they ask for. Usually that means
                  fewer screens, not more.
                </p>
                <div className="gw-about-cards">
                  <div className="gw-about-card">
                    <div className="gw-about-card-tag">01 · understand</div>
                    <div className="gw-about-card-body">Find where people get stuck, in their words.</div>
                  </div>
                  <div className="gw-about-card">
                    <div className="gw-about-card-tag">02 · cut</div>
                    <div className="gw-about-card-body">Drop everything that doesn&apos;t move that problem.</div>
                  </div>
                  <div className="gw-about-card">
                    <div className="gw-about-card-tag">03 · ship</div>
                    <div className="gw-about-card-body">Small release, real users, then fix what breaks.</div>
                  </div>
                </div>
                <div className="gw-about-stack">
                  React · Next.js · TypeScript · Redux · MUI · Sass · Styled Components · Vite · React Hook Form
                </div>
              </div>
            )}

            {panel === 'contact' && (
              <div>
                <p className="gw-contact-lead">Got a problem worth solving? Tell me about it.</p>
                <a href={`mailto:${EMAIL}`} className="gw-contact-email">
                  {EMAIL}
                </a>
                <div className="gw-contact-links">
                  <a href={`mailto:${EMAIL}`} className="gw-contact-btn">
                    Gmail
                  </a>
                  <a href="https://www.instagram.com/nfathan/" className="gw-contact-btn">
                    Instagram
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import * as THREE from 'three';

import logo from '../../assets/images/fathan-logo.png';
import data from '../../utils/dummy';

import './styles.scss';

const FATHAN = ['F', 'a', 't', 'h', 'a', 'n'];
const FATHAN_DELAYS = [0.1, 0.16, 0.22, 0.28, 0.34, 0.4];
const NASRULLAH = ['N', 'a', 's', 'r', 'u', 'l', 'l', 'a', 'h'];
const NASRULLAH_DELAYS = [0.46, 0.51, 0.56, 0.61, 0.66, 0.71, 0.76, 0.81, 0.86];

const NODE_DEFS = [
  { id: 'work', label: 'Projects', glyph: '◆', left: '22%', top: '30%' },
  { id: 'career', label: 'Career', glyph: '▲', left: '70%', top: '24%' },
  { id: 'about', label: 'How I work', glyph: '●', left: '34%', top: '76%' },
  { id: 'contact', label: 'Contact', glyph: '✉', left: '80%', top: '70%' }
];

const TITLES = { work: 'Projects', career: 'Career', about: 'How I work', contact: 'Contact' };

const EMAIL = 'fathannasrullah0@gmail.com';

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
  const [hint, setHint] = useState('Loading…');

  const fieldRef = useRef(null);
  const orbRef = useRef(null);
  const shipRef = useRef(null);
  const glRef = useRef(null);
  const nodeRefs = useRef({});

  const orb = useRef({ x: 60, y: 60, vx: 0, vy: 0 });
  const heading = useRef(0);
  const keys = useRef({});
  const drag = useRef(null);
  const falling = useRef(false);
  const cooldown = useRef(0);
  const panelRef = useRef(null);

  useEffect(() => {
    panelRef.current = panel;
  }, [panel]);

  const localPoint = (e) => {
    const b = fieldRef.current.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };

  const openPanel = (id) => {
    cooldown.current = Date.now() + 1200;
    setVisited((v) => (v.includes(id) ? v : v.concat(id)));
    setPanel(id);
  };

  const closePanel = () => {
    cooldown.current = Date.now() + 1200;
    falling.current = false;
    const field = fieldRef.current;
    const box = field && field.getBoundingClientRect();
    if (box) {
      orb.current.x = box.width * 0.5;
      orb.current.y = box.height * 0.92;
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
  };

  const fallIn = (id, cx, cy) => {
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
  };

  useEffect(() => {
    const touch = matchMedia('(hover: none)').matches;
    setHint(touch ? 'drag the ship into a hole — or just tap one' : 'arrows / wasd or drag — fly into a hole to open it');

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        // must go through closePanel, otherwise the ship stays warped out of view
        if (panelRef.current) closePanel();
        return;
      }
      keys.current[e.key.toLowerCase()] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const onKeyUp = (e) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    addEventListener('keydown', onKeyDown, { passive: false });
    addEventListener('keyup', onKeyUp);

    const field = fieldRef.current;
    const orbEl = orbRef.current;
    const shipEl = shipRef.current;
    const r0 = field.getBoundingClientRect();
    orb.current.x = r0.width * 0.5;
    orb.current.y = r0.height * 0.5;

    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const box = field.getBoundingClientRect();
      const k = keys.current;
      const a = 0.65;
      let thrusting = false;
      if (k.arrowleft || k.a) {
        orb.current.vx -= a;
        thrusting = true;
      }
      if (k.arrowright || k.d) {
        orb.current.vx += a;
        thrusting = true;
      }
      if (k.arrowup || k.w) {
        orb.current.vy -= a;
        thrusting = true;
      }
      if (k.arrowdown || k.s) {
        orb.current.vy += a;
        thrusting = true;
      }
      if (drag.current) {
        const gx = drag.current.x - orb.current.x;
        const gy = drag.current.y - orb.current.y;
        orb.current.vx += gx * 0.14;
        orb.current.vy += gy * 0.14;
        if (Math.hypot(gx, gy) > 6) thrusting = true;
      }
      orb.current.vx *= 0.88;
      orb.current.vy *= 0.88;
      orb.current.x = Math.max(16, Math.min(box.width - 16, orb.current.x + orb.current.vx));
      orb.current.y = Math.max(16, Math.min(box.height - 16, orb.current.y + orb.current.vy));

      const speed = Math.hypot(orb.current.vx, orb.current.vy);
      if (speed > 0.4) {
        // ship art points up, so heading 0 means -y: offset atan2 by a quarter turn
        const target = Math.atan2(orb.current.vy, orb.current.vx) + Math.PI / 2;
        let diff = target - heading.current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        heading.current += diff * 0.22;
      }

      if (!falling.current) {
        orbEl.style.transform = `translate(${orb.current.x}px,${orb.current.y}px)`;
        shipEl.style.transform = `rotate(${heading.current}rad)`;
        const thrust = Math.min(1, speed / 5) * (thrusting ? 1 : 0.2);
        orbEl.style.setProperty('--thrust', thrust.toFixed(3));
      }

      if (!panelRef.current && !falling.current && Date.now() > cooldown.current) {
        NODE_DEFS.forEach((n) => {
          const el = nodeRefs.current[n.id];
          if (!el) return;
          const b = el.getBoundingClientRect();
          const r = b.width * 0.42;
          const cx = b.left - box.left + b.width / 2;
          const cy = b.top - box.top + b.height / 2 - b.height * 0.16;
          const dx = cx - orb.current.x;
          const dy = cy - orb.current.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < r * 3) {
            const pull = (1 - d / (r * 3)) * 0.5;
            orb.current.vx += (dx / d) * pull;
            orb.current.vy += (dy / d) * pull;
            el.style.transform = `translate(-50%,-50%) scale(${1 + (1 - d / (r * 3)) * 0.12})`;
          } else {
            el.style.transform = 'translate(-50%,-50%)';
          }
          if (d < r * 0.7) fallIn(n.id, cx, cy);
        });
      }
    };
    loop();

    return () => {
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = glRef.current;
    if (!canvas) return;

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

        <section className="gw-hero">
          <div className="gw-hero-eyebrow">hey, i&apos;m</div>
          <h1 className="gw-h1">
            <span className="gw-h1-word">
              {FATHAN.map((letter, idx) => (
                <span key={idx} className="gw-letter-drop" style={{ animationDelay: `${FATHAN_DELAYS[idx]}s` }}>
                  <span className="gw-letter">{letter}</span>
                </span>
              ))}
            </span>
            <span className="gw-h1-word gw-h1-word--gradient">
              {NASRULLAH.map((letter, idx) => (
                <span key={idx} className="gw-letter-drop" style={{ animationDelay: `${NASRULLAH_DELAYS[idx]}s` }}>
                  {letter}
                </span>
              ))}
            </span>
          </h1>
          <p className="gw-sub">{data.about.profession}</p>
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
                onClick={() => openPanel(n.id)}
              >
                <span className="gw-node-well">
                  <span className="gw-node-ring-dashed" />
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
              <div ref={shipRef} className="gw-ship">
                <span className="gw-ship-flame" />
                <ShipSvg />
              </div>
            </div>
          </div>
        </section>
      </main>

      {panel && (
        <div className="gw-overlay" onClick={closePanel}>
          <div className="gw-panel" onClick={(e) => e.stopPropagation()}>
            <div className="gw-panel-head">
              <h2 className="gw-panel-title">{TITLES[panel]}</h2>
              <button type="button" className="gw-panel-close" onClick={closePanel}>
                ✕
              </button>
            </div>

            {panel === 'work' && (
              <div>
                {data.projects.map((p) => (
                  <a key={p.title} href={p.demo} target="_blank" rel="noreferrer" className="gw-work-row">
                    <span className="gw-work-thumb">
                      {p.img && <img src={p.img} alt="" loading="lazy" />}
                    </span>
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

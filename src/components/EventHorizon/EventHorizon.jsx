import { useCallback, useEffect, useRef, useState } from 'react';

import data from '../../utils/dummy';
import { createEngine } from './engine';
import { Career, Contact, Method, Projects } from './Panels';
import { MOONS, keplerPeriod } from './physics';

import './styles.scss';

const VIEWS = { projects: Projects, career: Career, method: Method, contact: Contact };
const BY_ID = Object.fromEntries(MOONS.map((m) => [m.id, m]));
// how long the panel's slide-out runs before its content is dropped (matches styles.scss)
const PANEL_EXIT_MS = 520;

const FOCUSABLE = 'a[href], button:not([disabled])';

export default function EventHorizon() {
  // `panel` is what the dock shows; `open` drives its slide, one frame later, so it animates
  const [panel, setPanel] = useState(null);
  const [open, setOpen] = useState(false);

  const stageRef = useRef(null);
  const worldRef = useRef(null);
  const glRef = useRef(null);
  const fxRef = useRef(null);
  const fallbackRef = useRef(null);
  const heroRef = useRef(null);
  const nameRef = useRef(null);
  const moonRefs = useRef([]);
  const hudRef = useRef(null);
  const hintRef = useRef(null);
  const toastRef = useRef(null);
  const viewChipRef = useRef(null);
  const shakeChipRef = useRef(null);
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const engineRef = useRef(null);
  const lastFocus = useRef(null);

  const openPanel = useCallback((id, opts = {}) => {
    setPanel((prev) => {
      if (!prev) lastFocus.current = document.activeElement;
      return { id, horizon: Boolean(opts.horizon) };
    });
  }, []);
  const closePanel = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const engine = createEngine(
      {
        stage: stageRef.current,
        world: worldRef.current,
        glCanvas: glRef.current,
        fxCanvas: fxRef.current,
        fallbackHole: fallbackRef.current,
        hero: heroRef.current,
        nameLines: [...nameRef.current.querySelectorAll('[data-line]')],
        moonEls: moonRefs.current,
        hud: hudRef.current,
        hint: hintRef.current,
        toast: toastRef.current,
        viewChip: viewChipRef.current,
        shakeChip: shakeChipRef.current,
        panel: panelRef.current
      },
      { onOpen: openPanel }
    );
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [openPanel]);

  // slide in a frame after the content mounts…
  const shown = useRef(false);
  useEffect(() => {
    if (!panel) return undefined;
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, [panel]);

  // …and drop the content once it has slid back out
  useEffect(() => {
    if (open) {
      shown.current = true;
      return undefined;
    }
    if (!panel || !shown.current) return undefined;
    const t = setTimeout(() => {
      shown.current = false;
      setPanel(null);
    }, PANEL_EXIT_MS);
    return () => clearTimeout(t);
  }, [open, panel]);

  // the scene, focus and keyboard follow the dock
  useEffect(() => {
    const engine = engineRef.current;
    if (engine) engine.setPanel(open);
    worldRef.current.inert = open;
    if (!open) {
      const back = lastFocus.current;
      lastFocus.current = null;
      if (back && back.focus && document.contains(back)) back.focus({ preventScroll: true });
      return undefined;
    }
    closeRef.current.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const lastItem = items[items.length - 1];
      if (!panelRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const moon = panel ? BY_ID[panel.id] : null;
  const View = panel ? VIEWS[panel.id] : null;
  const current = data.career.find((job) => job.now) || data.career[0];

  return (
    <div className="eh" ref={stageRef}>
      <div className={open ? 'eh-world is-dim' : 'eh-world'} ref={worldRef}>
        <canvas className="eh-gl" ref={glRef} aria-hidden="true" />
        <div className="eh-fallback-hole" ref={fallbackRef} aria-hidden="true" />
        <canvas className="eh-fx" ref={fxRef} aria-hidden="true" />

        <header className="eh-topbar eh-fade">
          <div className="eh-brand">
            <i aria-hidden="true" />
            <span>{`${data.about.firstname} ${data.about.lastname}`.toLowerCase()}</span>
          </div>
          <nav className="eh-index" aria-label="Sections">
            {MOONS.map((m) => (
              <button key={m.id} type="button" onClick={() => openPanel(m.id)} aria-haspopup="dialog">
                <span>{m.n}</span>
                {m.label}
              </button>
            ))}
          </nav>
        </header>

        <section className="eh-hero eh-fade" ref={heroRef}>
          <p className="eh-eyebrow">
            <b>{current.role}</b> {current.company} <span>· Software engineer</span>
          </p>
          {/* transparent glyphs: the engine paints them into the lensed sky at these exact spots */}
          <h1 className="eh-name" ref={nameRef}>
            <span className="eh-name-line" data-line>
              {data.about.firstname}
              <i data-baseline />
            </span>
            <span className="eh-name-line eh-name-line--italic" data-line data-gradient>
              {data.about.lastname}
              <i data-baseline />
            </span>
          </h1>
          <p className="eh-tagline">{data.about.profession}</p>
        </section>

        {MOONS.map((m, i) => (
          <button
            key={m.id}
            type="button"
            className="eh-moon eh-fade"
            style={{ '--c': m.color }}
            ref={(el) => {
              moonRefs.current[i] = el;
            }}
            onClick={() => openPanel(m.id)}
            aria-haspopup="dialog"
          >
            <span className="eh-moon-orb" />
            <span className="eh-moon-label">
              <small>{m.n}</small>
              {m.label}
            </span>
          </button>
        ))}

        <div className="eh-hud eh-fade" ref={hudRef} aria-hidden="true" />
        <p className="eh-hint eh-fade">
          <span ref={hintRef} />
          <button type="button" className="eh-chip" ref={viewChipRef}>
            view ↻
          </button>
          <button type="button" className="eh-chip" ref={shakeChipRef}>
            shake
          </button>
        </p>
        <div className="eh-toast" ref={toastRef} role="status" aria-live="polite" />
        <p className="eh-sr-only">
          A black hole bends the starfield and the name behind it. Four moons orbit it: Projects, Career, How I work and
          Contact. Each one is a button.
        </p>
      </div>

      <div className="eh-scrim" hidden={!panel} data-open={open} onClick={closePanel} />
      <aside
        className="eh-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="eh-panel-title"
        hidden={!panel}
        data-open={open}
        style={moon ? { '--accent': moon.color } : undefined}
      >
        <div className="eh-panel-head">
          <div>
            <div className="eh-panel-kicker">
              <i aria-hidden="true">●</i>{' '}
              {panel && panel.horizon
                ? 'r < r_s · signal lost'
                : moon && `orbit ${moon.n} · a = ${moon.a.toFixed(2)} r_s · T = ${Math.round(keplerPeriod(moon.a))} s`}
            </div>
            <h2 className="eh-panel-title" id="eh-panel-title">
              {moon && moon.label}
            </h2>
          </div>
          <button type="button" className="eh-close" ref={closeRef} onClick={closePanel} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="eh-panel-body" key={panel ? panel.id : 'none'}>
          {panel && panel.horizon && (
            <p className="eh-horizon">
              <b>Signal lost at r = 1.00 r_s.</b> Your ship crossed the event horizon. Nothing gets back out of one —
              except email.
            </p>
          )}
          {View && <View />}
        </div>
      </aside>
    </div>
  );
}

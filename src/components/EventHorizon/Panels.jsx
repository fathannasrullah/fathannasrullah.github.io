import { useRef, useState } from 'react';

import data from '../../utils/dummy';

const EMAIL = 'fathannasrullah0@gmail.com';
const INSTAGRAM = 'https://www.instagram.com/nfathan/';

// Drawn stand-ins for projects that have no screenshot to show. They are deliberately
// abstract — a gear, a gauge, a cone — so none of them can pass for a picture of a client's
// actual system, and none borrows a client's logo. A real screenshot goes in `img` instead.
const TONES = {
  cyan: ['#22e0dd', '#3b82f6'],
  violet: ['#ff5cf0', '#7c5cff']
};
const GRID = 'M0 16H96M0 32H96M0 48H96M24 0V64M48 0V64M72 0V64';

// A plain function rather than a component, so it needs no prop-types. Gradient ids come
// from kind+tone; two rows that share both would share identical definitions anyway.
function thumbArt(kind, tone = 'cyan') {
  const [a, b] = TONES[tone] || TONES.cyan;
  const uid = `${kind}-${tone}`;
  const bg = `eh-tb-${uid}`;
  const fg = `eh-tf-${uid}`;
  const glow = `eh-tg-${uid}`;
  const cone = `eh-tc-${uid}`;

  return (
    <svg viewBox="0 0 96 64" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#15151f" />
          <stop offset="100%" stopColor="#0a0a10" />
        </linearGradient>
        <linearGradient id={fg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </linearGradient>
        <radialGradient id={glow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={a} stopOpacity="0.28" />
          <stop offset="100%" stopColor={a} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={cone} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3450" />
          <stop offset="100%" stopColor="#1a1724" />
        </linearGradient>
      </defs>
      <rect width="96" height="64" fill={`url(#${bg})`} />

      {kind === 'cmms' && (
        <g>
          <path d={GRID} stroke="#fff" strokeOpacity="0.04" />
          <circle cx="48" cy="32" r="30" fill={`url(#${glow})`} />
          {/* teeth: a thick dashed ring, twelve of them */}
          <circle cx="48" cy="32" r="17" fill="none" stroke={`url(#${fg})`} strokeWidth="7" strokeDasharray="4.45 4.45" />
          <circle cx="48" cy="32" r="14.5" fill={`url(#${fg})`} />
          <circle cx="48" cy="32" r="6.5" fill="#0d0d14" />
          <circle cx="48" cy="32" r="2" fill={a} />
        </g>
      )}

      {kind === 'qms' && (
        <g>
          <path d={GRID} stroke="#fff" strokeOpacity="0.04" />
          <circle cx="48" cy="32" r="30" fill={`url(#${glow})`} />
          <circle cx="48" cy="32" r="18" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="5" />
          {/* 75% of the circumference (113) — a gauge that is mostly, not fully, there */}
          <circle
            cx="48"
            cy="32"
            r="18"
            fill="none"
            stroke={`url(#${fg})`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="84.8 113.1"
            transform="rotate(-90 48 32)"
          />
          <path d="M40.5 32.5L45.5 37.5L56 26" fill="none" stroke={a} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {kind === 'volcano' && (
        <g>
          {/* the dashed radius ring the app itself draws around a crater */}
          <circle cx="48" cy="34" r="25" fill="none" stroke="#ff6b6b" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="3 3" />
          <ellipse cx="48" cy="38" rx="30" ry="19" fill="#ff7a4d" fillOpacity="0.17" />
          {/* ash plume: soft overlapping discs drifting off downwind */}
          <circle cx="52" cy="15" r="6" fill="#cfd3e6" fillOpacity="0.22" />
          <circle cx="59" cy="10" r="7.5" fill="#cfd3e6" fillOpacity="0.16" />
          <circle cx="68" cy="8" r="8.5" fill="#cfd3e6" fillOpacity="0.11" />
          <circle cx="47" cy="20" r="4.5" fill="#cfd3e6" fillOpacity="0.3" />
          <path d="M14 56L40 27Q48 23 56 27L82 56Z" fill={`url(#${cone})`} />
          <path d="M14 56L40 27" stroke="#ff9a6b" strokeOpacity="0.35" strokeWidth="0.8" fill="none" />
          <path d="M40 27Q48 23 56 27L53 30Q48 28 43 30Z" fill="#ff7a4d" />
          <path d="M44 28.6Q48 27.4 52 28.6" stroke="#ffd2a6" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M48 30L46 40L48 38L50 46L51 35Z" fill="#ff7a4d" fillOpacity="0.7" />
          <path d="M0 56H96V64H0Z" fill="#0b0b11" />
        </g>
      )}
    </svg>
  );
}

// Same reason as thumbArt: a render helper, not a component.
function projectRow(p) {
  const key = `${p.title}-${p.client || ''}`;
  const body = (
    <>
      <span className="eh-thumb">
        {p.img ? <img src={p.img} alt="" width="90" height="60" loading="lazy" decoding="async" /> : thumbArt(p.thumb, p.tone)}
      </span>
      <span className="eh-row-body">
        <span className="eh-row-title">
          {p.title}
          {p.client && <em>{p.client}</em>}
        </span>
        {p.desc && <span className="eh-row-desc">{p.desc}</span>}
        <span className="eh-row-stack">{p.stack}</span>
      </span>
    </>
  );
  // Client products have no public URL — a plain row beats a dead link.
  return (
    <li key={key}>
      {p.demo ? (
        <a className="eh-row" href={p.demo} target="_blank" rel="noreferrer">
          {body}
          <span className="eh-row-tag" aria-hidden="true">
            ↗
          </span>
        </a>
      ) : (
        <div className="eh-row">
          {body}
          <span className="eh-row-tag">internal</span>
        </div>
      )}
    </li>
  );
}

export function Projects() {
  const { commercial, personal } = data.projects;
  return (
    <>
      <section className="eh-group">
        <h3 className="eh-group-head">
          <b>Commercial</b>
          <span>{commercial.length} · internal systems, no public link</span>
        </h3>
        <ul className="eh-rows">{commercial.map(projectRow)}</ul>
      </section>
      <section className="eh-group">
        <h3 className="eh-group-head">
          <b>Personal</b>
          <span>{personal.length} · live</span>
        </h3>
        <ul className="eh-rows">{personal.map(projectRow)}</ul>
      </section>
    </>
  );
}

export function Career() {
  return (
    <ol className="eh-trajectory">
      {data.career.map((job) => (
        <li key={`${job.role}-${job.period}`} className={job.now ? 'is-now' : undefined}>
          <div className="eh-career-period">
            {job.period}
            {job.now && <i>now</i>}
          </div>
          <h3 className="eh-career-role">{job.role}</h3>
          <div className="eh-career-company">
            {job.company}
            <span>{job.place}</span>
          </div>
          {job.detail && <p className="eh-career-detail">{job.detail}</p>}
        </li>
      ))}
    </ol>
  );
}

const STEPS = [
  { n: '01', tag: 'understand', text: 'Find where people get stuck, in their words.' },
  { n: '02', tag: 'cut', text: 'Drop everything that doesn’t move that problem.' },
  { n: '03', tag: 'ship', text: 'Small release, real users, then fix what breaks.' }
];

export function Method() {
  return (
    <>
      <p className="eh-lead">
        I care about the problem people actually run into, not the feature list they ask for. Usually that means fewer
        screens, not more.
      </p>
      <div className="eh-steps">
        {STEPS.map((s) => (
          <div key={s.n} className="eh-step">
            <b>{s.n}</b>
            <small>{s.tag}</small>
            <p>{s.text}</p>
          </div>
        ))}
      </div>
      <div className="eh-marquee">
        {/* duplicated so the -50% loop has somewhere to scroll into */}
        <div className="eh-marquee-track" aria-hidden="true">
          {[0, 1].map((pass) =>
            data.skills.map((s) => (
              <span key={`${pass}-${s.group}`} className="eh-marquee-cell">
                <span className="eh-marquee-group">{s.group}</span>
                <span className="eh-marquee-items">{s.items.join(' · ')}</span>
              </span>
            ))
          )}
        </div>
        {/* the real, readable copy for assistive tech and search */}
        <p className="eh-sr-only">{data.skills.map((s) => `${s.group}: ${s.items.join(', ')}`).join('. ')}</p>
      </div>
    </>
  );
}

export function Contact() {
  const [copy, setCopy] = useState('Copy');
  const mailRef = useRef(null);

  const copyEmail = () => {
    const selectIt = () => {
      const range = document.createRange();
      range.selectNodeContents(mailRef.current);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      setCopy('Selected');
    };
    if (!navigator.clipboard) {
      selectIt();
      return;
    }
    navigator.clipboard.writeText(EMAIL).then(() => {
      setCopy('Copied');
      setTimeout(() => setCopy('Copy'), 1600);
    }, selectIt);
  };

  return (
    <>
      <p className="eh-contact-lead">Got a problem worth solving? Tell me about it.</p>
      <div className="eh-mail">
        <code ref={mailRef}>{EMAIL}</code>
        <button type="button" className="eh-btn" onClick={copyEmail}>
          {copy}
        </button>
      </div>
      <div className="eh-btns">
        <a className="eh-btn eh-btn--primary" href={`mailto:${EMAIL}`}>
          Gmail ↗
        </a>
        <a className="eh-btn" href={INSTAGRAM} target="_blank" rel="noreferrer">
          Instagram ↗
        </a>
      </div>
    </>
  );
}

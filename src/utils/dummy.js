import warnada from '../assets/images/warnada.jpg'

const data = {
  about: {
    firstname: 'Fathan',
    lastname: 'Nasrullah',
    profession: 'Software engineer. I dig into the problem first, then build the smallest thing that actually fixes it.'
  },

  // Newest first. `now` marks the current role.
  career: [
    {
      role: 'Tech Lead',
      company: 'Machine Vision Indonesia',
      detail: 'Leading the CMMS product built for Paragon Corp.',
      period: 'Jun 2025 — now',
      place: 'Indonesia',
      now: true
    },
    {
      role: 'Frontend Engineer',
      company: 'Machine Vision Indonesia',
      detail: 'QMS for Bio Farma, and the CMMS for Sanggar Sarana Baja.',
      period: 'Oct 2023 — Jun 2025',
      place: 'Indonesia'
    },
    {
      role: 'Frontend Developer',
      company: 'Kala Kreatif Indonesia',
      detail: '',
      period: 'Jan 2022 — Oct 2023 · 1 yr 10 mo',
      place: 'Sleman, Yogyakarta'
    },
    {
      role: 'Junior Web Developer',
      company: 'Mavis (Matahati Creative)',
      detail: '',
      period: 'Feb 2020 — Apr 2020 · 3 mo',
      place: 'Blitar'
    }
  ],

  skills: [
    { group: 'Frontend', items: ['TypeScript', 'React.js'] },
    { group: 'Backend', items: ['NestJS', 'PostgreSQL', 'Redis'] },
    { group: 'DevOps & Cloud', items: ['Docker', 'GitHub Actions'] }
  ],

  // Thumbnails: `img` is a real screenshot; `thumb` names a drawn stand-in (see
  // ThumbArt in GravityLanding.jsx). Client work has no public URL, so those rows render
  // as plain rows marked internal rather than as dead links — and their art is abstract
  // on purpose, so it cannot be mistaken for a screenshot of a client's system.
  projects: {
    commercial: [
      { title: 'CMMS', client: 'Paragon Corp', stack: 'Tech Lead · 2025 — now', demo: '', img: '', thumb: 'cmms', tone: 'cyan' },
      { title: 'CMMS', client: 'Sanggar Sarana Baja', stack: 'Frontend Engineer · 2023 — 2025', demo: '', img: '', thumb: 'cmms', tone: 'violet' },
      { title: 'QMS', client: 'Bio Farma', stack: 'Frontend Engineer · 2023 — 2025', demo: '', img: '', thumb: 'qms', tone: 'cyan' }
    ],
    personal: [
      {
        title: 'Gunung Fire',
        desc: 'Real-time volcano monitoring',
        stack: 'React · TypeScript · Leaflet',
        demo: 'https://gunungfire.github.io/',
        img: '',
        thumb: 'volcano'
      },
      {
        title: 'Warnada',
        desc: 'Music player with synced lyrics',
        stack: 'React · TypeScript · PWA',
        demo: 'https://warnada.github.io/',
        img: warnada,
        thumb: ''
      }
    ]
  }
}

export default data

import bookshelf from '../assets/images/bookshelf.png'
import piaCianni from '../assets/images/pia-cianni.png'
import quotes from '../assets/images/random-quote-machine.png'
import kuyMasak from '../assets/images/kuy-masak.png'
import calculator from '../assets/images/kalkulator.png'
import tictactoe from '../assets/images/tic-tac-toe.png'

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

  // Client work has no public URL, so those cards render as plain rows marked internal
  // rather than as dead links.
  projects: {
    commercial: [
      { title: 'CMMS', client: 'Paragon Corp', stack: 'Tech Lead · 2025 — now', demo: '', img: '' },
      { title: 'CMMS', client: 'Sanggar Sarana Baja', stack: 'Frontend Engineer · 2023 — 2025', demo: '', img: '' },
      { title: 'QMS', client: 'Bio Farma', stack: 'Frontend Engineer · 2023 — 2025', demo: '', img: '' }
    ],
    personal: [
      { title: 'Gunung Fire', stack: 'Real-time volcano monitoring', demo: 'https://gunungfire.github.io/', img: '' },
      { title: 'Pets', stack: 'React · MUI · Redux · React Hook Form', demo: 'https://fathannasrullah.github.io/pet', img: '' },
      { title: 'Social', stack: 'Next.js · React · MUI · Vite', demo: 'https://fathannasrullah.github.io/social', img: '' },
      { title: 'Toko Online', stack: 'Next.js · React · MUI · Redux', demo: 'https://tokoonlineku.vercel.app', img: '' },
      { title: 'Rak Buku', stack: 'React · Sass · JavaScript', demo: 'https://nfathan.github.io/rakbuku/', img: bookshelf },
      { title: 'Pia Cianni', stack: 'jQuery · Bootstrap · JavaScript', demo: 'https://nfathan.github.io/piacianni/', img: piaCianni },
      { title: 'Random Quote', stack: 'React · CSS · JavaScript', demo: 'https://nfathan.github.io/random-quote-machine/', img: quotes },
      { title: 'Calculator', stack: 'HTML · CSS · JavaScript', demo: 'https://nfathan.github.io/calculator-app/', img: calculator },
      { title: 'Tictactoe Game', stack: 'React · CSS · JavaScript', demo: 'https://nfathan.github.io/tictactoe-game/', img: tictactoe },
      { title: 'Kuy Masak', stack: 'Bootstrap · CSS · JavaScript', demo: 'https://nfathan.github.io/kuy-masak-app/', img: kuyMasak }
    ]
  }
}

export default data

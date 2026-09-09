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
  projects: [
    { title: 'Pets', stack: 'React · MUI · Redux · React Hook Form', demo: 'https://fathannasrullah.github.io/pet', img: '' },
    { title: 'Social', stack: 'Next.js · React · MUI · Vite', demo: 'https://fathannasrullah.github.io/social', img: '' },
    { title: 'Toko Online', stack: 'Next.js · React · MUI · Redux', demo: 'https://tokoonlineku.vercel.app', img: '' },
    { title: 'Users', stack: 'Vite · React · MUI · Redux · Sass', demo: 'https://fathannasrullah.github.io/social', img: '' },
    { title: 'Rak Buku', stack: 'React · Sass · JavaScript', demo: 'https://nfathan.github.io/rakbuku/', img: bookshelf },
    { title: 'Pia Cianni', stack: 'jQuery · Bootstrap · JavaScript', demo: 'https://nfathan.github.io/piacianni/', img: piaCianni },
    { title: 'Random Quote', stack: 'React · CSS · JavaScript', demo: 'https://nfathan.github.io/random-quote-machine/', img: quotes },
    { title: 'Calculator', stack: 'HTML · CSS · JavaScript', demo: 'https://nfathan.github.io/calculator-app/', img: calculator },
    { title: 'Tictactoe Game', stack: 'React · CSS · JavaScript', demo: 'https://nfathan.github.io/tictactoe-game/', img: tictactoe },
    { title: 'Kuy Masak', stack: 'Bootstrap · CSS · JavaScript', demo: 'https://nfathan.github.io/kuy-masak-app/', img: kuyMasak }
  ]
}

export default data

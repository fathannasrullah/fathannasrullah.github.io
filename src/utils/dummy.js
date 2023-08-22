import { BiLogoCss3, BiLogoHtml5, BiLogoJavascript, BiLogoReact, BiLogoSass } from 'react-icons/bi'

import bookshelf from '../assets/images/bookshelf.png'
import quotes  from "../assets/images/random-quote-machine.png"
import piaCianni from "../assets/images/pia-cianni.png"
import kuyMasak from "../assets/images/kuy-masak.png"
import calculator from "../assets/images/kalkulator.png"
import tictactoe from "../assets/images/tic-tac-toe.png"

const data = {
  about: {
    firstname: "Fathan",
    lastname: "Nasrullah",
    profession: "Frontend Developer",
    overview: "Have worked for 3 months as Junior Web Developer at mavis.co.id. Beginner Frontend Developer Certification from Dicoding.com. Then decided to focus on Frontend Developer. Always available to talk about new opportunities."
  },
  projects: [
    {
      imageUrl: '',
      title: 'Toko Online',
      link: 'https://tokoonlineku.vercel.app',
      /*techLogo: [
        <BiLogoHtml5 />,
        <BiLogoCss3 />,
        <BiLogoJavascript />,
        <BiLogoReact />,
        <BiLogoSass />
      ]*/
    },
    {
      imageUrl: bookshelf,
      title: "Rak Buku",
      link: "https://nfathan.github.io/rakbuku/"
    },
    {
      imageUrl: quotes,
      title: "Random Quote",
      link: "https://nfathan.github.io/random-quote-machine/"
    },
    {
      imageUrl: '',
      title: 'Users',
      link: 'https://fathannasrullah.github.io/project/users'
    },
    {
      imageUrl: calculator,
      title: "Calculator",
      link: "https://nfathan.github.io/calculator-app/"
    },
    {
      imageUrl: piaCianni,
      title: "Pia Cianni",
      link: "https://nfathan.github.io/piacianni/"
    },
    {
      imageUrl: tictactoe,
      title: "Tictactoe Game",
      link: "https://nfathan.github.io/tictactoe-game/"
    },
    {
      imageUrl: kuyMasak,
      title: "Kuy Masak",
      link: "https://nfathan.github.io/kuy-masak-app/"
    }
  ]
}

export default data
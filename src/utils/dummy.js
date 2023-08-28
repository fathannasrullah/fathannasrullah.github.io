import { BiLogoBootstrap, BiLogoCss3, BiLogoHtml5, BiLogoJavascript, BiLogoJquery, BiLogoReact, BiLogoRedux, BiLogoSass } from 'react-icons/bi'
import { TbBrandNextjs, TbBrandVite } from 'react-icons/tb'
import { SiMui, SiStyledcomponents } from 'react-icons/si'

import bookshelf from '../assets/images/bookshelf.png'
import quotes  from "../assets/images/random-quote-machine.png"
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
      imageUrl: 'https://imgtr.ee/images/2023/08/24/2fda26a94f79a9a38a487153e41e6f46.jpeg',
      title: 'Toko Online',
      link: {
        demo: 'https://tokoonlineku.vercel.app',
        code: 'https://github.com/fathannasrullah/toko-online'
      },
      techLogo: [
        BiLogoHtml5,
        BiLogoCss3,
        BiLogoJavascript,
        BiLogoReact,
        TbBrandNextjs,
        SiMui,
        BiLogoRedux,
        SiStyledcomponents
      ]
    },
    {
      imageUrl: 'https://imgtr.ee/images/2023/08/24/de9e15b1676f85d09496016a4846965f.jpeg',
      title: 'Users',
      link: {
        demo: 'https://fathannasrullah.github.io/social',
        code: 'https://github.com/fathannasrullah/social'
      },
      techLogo: [
        BiLogoHtml5,
        BiLogoCss3,
        BiLogoJavascript,
        TbBrandVite,
        BiLogoReact,
        SiMui,
        BiLogoRedux,
        BiLogoSass
      ]
    },
    {
      imageUrl: bookshelf,
      title: "Rak Buku",
      link: {
        demo: "https://nfathan.github.io/rakbuku/",
        code: 'https://gitlab.com/fatan/rakbuku'
      },
      techLogo: [
        BiLogoHtml5,
        BiLogoCss3,
        BiLogoJavascript,
        BiLogoReact,
        BiLogoSass
      ]
    },
    {
      imageUrl: 'https://imgtr.ee/images/2023/08/24/64a0f4cf39cc4e5303ffcf1e2c83ddeb.jpeg',
      title: "Pia Cianni",
      link: {
        demo: "https://nfathan.github.io/piacianni/",
        code: 'https://github.com/nfathan/piacianni/tree/master'
      },
      techLogo: [
        BiLogoHtml5,
        BiLogoCss3,
        BiLogoJavascript,
        BiLogoJquery,
        BiLogoBootstrap
      ]
    },
    {
      imageUrl: quotes,
      title: "Random Quote",
      link: {
        demo: "https://nfathan.github.io/random-quote-machine/",
        code: 'https://github.com/nfathan/random-quote-machine/tree/main'
      },
      techLogo: [
        BiLogoHtml5,
        BiLogoCss3,
        BiLogoJavascript,
        BiLogoReact
      ]
    },
    {
      imageUrl: calculator,
      title: "Calculator",
      link: {
        demo: "https://nfathan.github.io/calculator-app/",
        code: 'https://github.com/nfathan/calculator-app'
      },
      techLogo: [
        BiLogoHtml5,
        BiLogoCss3,
        BiLogoJavascript
      ]
    },
    {
      imageUrl: tictactoe,
      title: "Tictactoe Game",
      link: {
        demo: "https://nfathan.github.io/tictactoe-game/",
        code: ''
      },
      techLogo: [
        BiLogoHtml5,
        BiLogoCss3,
        BiLogoJavascript,
        BiLogoReact
      ]
    },
    {
      imageUrl: kuyMasak,
      title: "Kuy Masak",
      link: {
        demo: "https://nfathan.github.io/kuy-masak-app/",
        code: ''
      },
      techLogo: [
        BiLogoHtml5,
        BiLogoCss3,
        BiLogoJavascript,
        BiLogoBootstrap
      ]
    }
  ]
}

export default data
import { CgChevronUp } from "react-icons/cg"

import LinkAbout from "./LinkAbout"
import ProjectItem from "./ProjectItem"

import bookshelf  from "../assets/images/bookshelf.png"
import quotes  from "../assets/images/random-quote-machine.png"
import piaCianni from "../assets/images/pia-cianni.png"
import kuyMasak from "../assets/images/kuy-masak.png"
import calculator from "../assets/images/kalkulator.png"
import tictactoe from "../assets/images/tic-tac-toe.png"

import data from "../utils/dummy"

function Projects() {
  const { projects } = data
  
  return (
    <div className="container">
      <section className="LinkAbout top" >
        <LinkAbout CgChevronUp={CgChevronUp} />
      </section>
      <section className="Projects">
        <ul className="project-list">
          {
            projects.map((projectItem, index) => {
              return (
                <ProjectItem
                  key={index}
                  title={projectItem.title}
                  image={projectItem.imageUrl}
                  link={projectItem.link}
                  //techLogo={projectItem.techLogo}
                />
              )
            })
          }
        </ul>
      </section>
      <section className="LinkAbout bottom" >
        <LinkAbout CgChevronUp={CgChevronUp}/>
      </section>
    </div>
  )
}

export default Projects
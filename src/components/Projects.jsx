import { CgChevronUp } from "react-icons/cg"

import { motion } from "framer-motion"

import LinkAbout from "./LinkAbout"
import ProjectItem from "./ProjectItem"

import data from "../utils/dummy"

function Projects() {
  const { projects } = data

  return (
    <motion.div
      className="container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 3 }}
    >
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
                  techLogo={projectItem.techLogo}
                />
              )
            })
          }
        </ul>
      </section>
      {/*<section className="LinkAbout bottom" >
        <LinkAbout CgChevronUp={CgChevronUp}/>
        </section>*/}
      </motion.div>
  )
}

export default Projects
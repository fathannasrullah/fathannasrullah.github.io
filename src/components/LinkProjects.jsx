import { Link } from "react-router-dom"

import { motion } from "framer-motion";

import { CgChevronDown } from "react-icons/cg"

function LinkProjects({ title = 'Projects', path = '/projects' }) {
  const bounceTransition = {
    delay: 0.5,
    duration: 0.8,
    repeat: Infinity,
    repeatType: 'reverse'
  }

  return (
    <motion.section
      className="LinkProjects"
      transition={bounceTransition}
      animate={{
        y: ["30%","-10%"]
      }}
    >
      <Link to={path}>
        <p>{title}</p>
        <CgChevronDown />
      </Link>
    </motion.section>
  )
}

export default LinkProjects
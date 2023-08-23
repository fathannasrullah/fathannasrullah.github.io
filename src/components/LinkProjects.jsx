import { Link } from "react-router-dom"

import { motion } from "framer-motion";

function LinkProjects(props) {
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
      <Link to="/projects">
        <p>Projects </p>
        <props.CgChevronDown />
      </Link>
    </motion.section>
  )
}

export default LinkProjects
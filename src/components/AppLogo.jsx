import { Link } from "react-router-dom"

import { motion } from "framer-motion"

function AppLogo(props) {
  return (
    <motion.section 
      className="App-logo"
      drag
      dragConstraints={{ top: -30, right: 30, bottom: 200, left: -170 }}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 10 }}
      dragElastic={0.5}
      whileTap={{
        scale: 2,
        height: 5,
        
      }}
    >
      <div className="App-logo-child">
        <Link to="/"> <img src={props.logo} alt="app-logo"/></Link>
      </div>
    </motion.section>
  )
}

export default AppLogo
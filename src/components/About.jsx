import { useState } from "react"

import data from '../utils/dummy'

import {
  TiMail, 
  TiSocialLinkedin, 
  TiSocialInstagram, 
  TiSocialTwitter,
  TiSocialGithub
} from "react-icons/ti";

import fathanLogo from "../assets/images/fathan-logo.png"

import { motion } from "framer-motion";

import AppLogo from "./AppLogo";
import Contact from "./Contact";
import LinkProjects from "./LinkProjects";

function About() {
  const { about } = data
  const [showDetails, setShowDetails] = useState(false)

  return (
    <motion.div
      className="container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 3 }}
    >
      <AppLogo logo={fathanLogo} />
      <section className="About"> 
        <div className="About-overview">
          <h1 data-text="fathan">{about.firstname}</h1>
          <h1 data-text="nasrullah">{about.lastname}</h1>     
          <div className="show-detail-wrapper">
            <h2>{about.profession} </h2>
            {/*<div>
                <button onClick={() => setShowDetails(!showDetails)}> 
                  {
                    !showDetails ? `show more` : `show less`
                  }
                </button>
            </div>*/}
          </div>     
        </div>
        {showDetails && 
          <div className="About-details">
            <section className="About-overview-more">
              <h1>Hi, I'm Junior Front End Developer</h1>
              <p>{about.overview}</p>
              <button onClick={() => {setShowDetails(!showDetails)}}>show less</button>
            </section>
          </div>
        }
      </section>
      <Contact 
        email={TiMail}
        linkedin={TiSocialLinkedin}
        instagram={TiSocialInstagram}
        twitter={TiSocialTwitter}
        github={TiSocialGithub}
      />
      <LinkProjects />
    </motion.div>
  )
}

export default About
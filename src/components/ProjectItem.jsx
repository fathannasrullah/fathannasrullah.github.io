import { Fragment } from 'react'
import { BiLogoCss3, BiLogoHtml5 } from 'react-icons/bi'

function ProjectItem(props) {
  //console.log(props.techLogo)
  return (
    <li className="project-item">
      <h1 className="project-title">{props.title}</h1>
      <div className="img-box">
        <img src={props.image} alt="" />
      </div>
      <div className="project-link-container">
        <a href={props.link}>Live Demo</a>
        <a href=''>Code</a>
      </div>
      <hr />
      <div className="project-tech-container">
        <p>Tech :</p>
        {/*<div className='project-tech-logo'>
          {props.techLogo.maps((logo, index) => (
            <Fragment key={index}>
              {logo}
            </Fragment>
          ))}
        </div>*/}
      </div>
    </li>
  )
}

export default ProjectItem
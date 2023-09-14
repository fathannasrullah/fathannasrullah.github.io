import { Fragment } from 'react'

function ProjectItem(props) {

  return (
    <li className="project-item">
      <h1 className="project-title">{props.title}</h1>
      <div className="img-box">
        <img src={props.image} alt="" />
      </div>
      <div className="project-link-container">
        <a href={props.link.demo}>Live Demo</a>
        <a href={props.link.code}>Code</a>
      </div>
      <hr />
      <div className="project-tech-container">
        <p>Tech :</p>
        <div className='project-tech-logo'>
          {props.techLogo.map((Logo, index) => (
            <Fragment key={index}>
              <Logo />
            </Fragment>
          ))}
        </div>
      </div>
    </li>
  )
}

export default ProjectItem
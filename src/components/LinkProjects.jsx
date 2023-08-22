import { Link } from "react-router-dom"

function LinkProjects(props) {
  return (
    <section className="LinkProjects">
      <Link to="/projects">
        <p>Projects </p>
        <props.CgChevronDown />
      </Link>
    </section>
  )
}

export default LinkProjects
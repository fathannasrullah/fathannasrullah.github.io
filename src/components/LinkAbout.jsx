import { Link } from "react-router-dom"

function LinkAbout(props) {
  return (
      <Link to="/">
        <props.CgChevronUp />
        <p>About</p>
      </Link>
  )
}

export default LinkAbout
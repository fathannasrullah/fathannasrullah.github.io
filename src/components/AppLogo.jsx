import { Link } from "react-router-dom"

function AppLogo(props) {
  return (
    <section className="App-logo">
      <div className="App-logo-child">
        <Link to="/"> <img src={props.logo} alt="app-logo"/></Link>
      </div>
    </section>
  )
}

export default AppLogo
function Contact(props) {
  return (
    <section className="Contact">
      <a href="mailto:fathannasrullah0@gmail.com"><props.email /></a>
      <a href="https://github.com/fathannasrullah"><props.github /></a>
      <a href="https://www.linkedin.com/in/fathan-nasrullah"><props.linkedin /></a>
      <a href="https://www.instagram.com/nfathan/"><props.instagram /></a>
    </section>
  )
}

export default Contact
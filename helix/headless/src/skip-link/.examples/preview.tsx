import './preview.css'
import { useEffect } from 'react'

export function Example() {
  useEffect(() => {
    const skip = document.querySelector('helix-headless-skip-link')
    customElements
      .whenDefined('helix-headless-skip-link')
      .then(() => skip?.updateComplete)
      .then(() => skip?.focus({ preventScroll: true }))
  }, [])

  return (
    <>
      <helix-headless-skip-link></helix-headless-skip-link>

      <header>
        <span>Logo</span>
        <nav aria-label="Sections">
          <a
            aria-current="page"
            href="#one"
          >
            Overview
          </a>
          <a href="#two">Projects</a>
        </nav>
      </header>

      <main id="main">
        <p>Welcome back. You have 3 new messages.</p>
      </main>
    </>
  )
}

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
          <a href="#one">Item One</a>
          <a href="#two">Item Two</a>
        </nav>
      </header>

      <main id="main">
        <p>The content a keyboard reader came for.</p>
      </main>
    </>
  )
}

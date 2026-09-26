import { useEffect } from 'react'
import './preview.css'

export function Example() {
  useEffect(() => {
    const skip = document.querySelector('helix-skip-link')
    customElements
      .whenDefined('helix-skip-link')
      .then(() => skip?.updateComplete)
      .then(() => skip?.focus({ preventScroll: true }))
  }, [])

  return (
    <>
      <helix-skip-link></helix-skip-link>

      <helix-app-header>
        <span slot="start">Logo</span>
        <helix-navigation label="Sections">
          <a
            aria-current="page"
            href="#one"
          >
            Overview
          </a>
          <a href="#two">Projects</a>
        </helix-navigation>
      </helix-app-header>

      <main id="main">
        <helix-text as="p">Welcome back. You have 3 new messages.</helix-text>
      </main>
    </>
  )
}

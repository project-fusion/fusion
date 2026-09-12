import { useEffect } from 'react'

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
            Item One
          </a>
          <a href="#two">Item Two</a>
        </helix-navigation>
      </helix-app-header>

      <main id="main">
        <helix-text as="p">The content a keyboard reader came for.</helix-text>
      </main>
    </>
  )
}

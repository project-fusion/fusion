import { useEffect, useRef } from 'react'

export function Example() {
  const overlay = useRef<HTMLElementTagNameMap['helix-shortcut-overlay']>(null)

  /* Shown once at first, a frame after each Kbd has written its shortcut, so
     the badges are in the picture. Holding the key shows them again. */
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.current?.show()))
  }, [])

  return (
    <>
      <helix-toolbar label="Text formatting">
        <helix-button id="overlay-bold">Bold</helix-button>
        <helix-button id="overlay-italic">Italic</helix-button>
        <helix-button id="overlay-link">Link</helix-button>
      </helix-toolbar>

      {/* Each Kbd gives its control the shortcut, which the overlay reads. */}
      <helix-kbd
        activate="click"
        for="overlay-bold"
        hidden
        keys="mod+b"
        within="document"
      />
      <helix-kbd
        activate="click"
        for="overlay-italic"
        hidden
        keys="mod+i"
        within="document"
      />
      <helix-kbd
        activate="click"
        for="overlay-link"
        hidden
        keys="mod+k"
        within="document"
      />

      <helix-shortcut-overlay ref={overlay} />
    </>
  )
}

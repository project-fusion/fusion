import { useEffect, useRef } from 'react'
import './preview.css'

export function Example() {
  const overlay = useRef<HTMLElementTagNameMap['helix-headless-shortcut-overlay']>(null)

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.current?.show()))
  }, [])

  return (
    <>
      <div className="formatting">
        <helix-headless-button id="base-overlay-bold">Bold</helix-headless-button>
        <helix-headless-button id="base-overlay-italic">Italic</helix-headless-button>
        <helix-headless-button id="base-overlay-link">Link</helix-headless-button>
      </div>
      {(['bold', 'italic', 'link'] as const).map((name, index) => (
        <helix-headless-kbd
          activate="click"
          for={`base-overlay-${name}`}
          hidden
          key={name}
          keys={['mod+b', 'mod+i', 'mod+k'][index]}
          within="document"
        />
      ))}
      <helix-headless-shortcut-overlay ref={overlay} />
    </>
  )
}

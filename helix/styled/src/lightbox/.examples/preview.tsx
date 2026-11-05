import type { HelixLightbox } from '@fusion.dev/helix'
import { useRef, useState } from 'react'
import './preview.css'

export function Example() {
  /* The lightbox starts open, so the preview shows it. */
  const [open, setOpen] = useState(true)
  const viewer = useRef<HelixLightbox>(null)

  return (
    <>
      <helix-button onClick={() => setOpen(true)}>Open gallery</helix-button>

      <helix-lightbox
        label="Beach photos"
        loop
        onClose={() => setOpen(false)}
        open={open}
        ref={viewer}
      >
        <helix-button-group
          label="Lightbox actions"
          layout="spaced"
          slot="header"
        >
          <helix-icon-button
            label="Previous picture"
            onClick={() => viewer.current?.previous()}
          >
            <helix-icon name="caret-left"></helix-icon>
          </helix-icon-button>
          <helix-icon-button
            label="Next picture"
            onClick={() => viewer.current?.next()}
          >
            <helix-icon name="caret-right"></helix-icon>
          </helix-icon-button>
          <helix-icon-button
            label="Close"
            onClick={() => viewer.current?.close()}
          >
            <helix-icon name="x"></helix-icon>
          </helix-icon-button>
        </helix-button-group>

        <helix-lightbox-item
          label="Seawater over pale sand"
          value="seawater"
        >
          <helix-image
            alt="Seawater over pale sand"
            src="/media/scale/seawater-800.jpg"
          ></helix-image>
          <helix-text slot="description">Shallow water at the beach in the morning.</helix-text>
        </helix-lightbox-item>

        <helix-lightbox-item
          label="The sun low over open water"
          value="ocean-sun"
        >
          <helix-image
            alt="The sun low over open water"
            src="/media/scale/ocean-sun.jpg"
          ></helix-image>
          <helix-text slot="description">Sunset over the ocean the same day.</helix-text>
        </helix-lightbox-item>
      </helix-lightbox>
    </>
  )
}

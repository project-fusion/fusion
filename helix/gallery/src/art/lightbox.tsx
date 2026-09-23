import type { CSSProperties, ReactNode } from 'react'

/**
 * The room with the lights off: a picture over a page nobody is reading.
 *
 * The scrim reaches all four edges, which is the whole of what tells this from
 * `Dialog`. A dialog is a panel floating on a page that is still there, dimmed
 * and legible behind it; a lightbox *is* the page for as long as it is open, so
 * a drawing that left a margin of card showing would be drawing the other
 * component.
 *
 * The chrome is two arrows and a way out, drawn over the picture rather than
 * beside it, because that is where a lightbox puts them and why it hides them
 * when the reader goes still.
 */
export const lightboxArt: ReactNode = (
  <>
    <rect className="artScrim" height="200" width="320" x="0" y="0" />
    <g className="artMotion artOpen" style={{ transformOrigin: 'center' } as CSSProperties}>
      <rect className="artSurface" height="120" rx="4" width="144" x="88" y="40" />
      <circle className="artInk" cx="120" cy="72" fillOpacity="0.28" r="10" />
      <path className="artInk" d="M88 160v-26l34-28 30 24 26-20 54 50z" fillOpacity="0.28" />
      <path className="artInk" d="M160 160l32-28 40 28z" fillOpacity="0.55" />
    </g>
    {/* The way out, and the two ways along. */}
    <path className="artInk" d="M268 36l16 16m0-16l-16 16" fillOpacity="0.55" />
    <path className="artInk" d="M56 92l-12 8 12 8" fillOpacity="0.55" />
    <path className="artInk" d="M264 92l12 8-12 8" fillOpacity="0.55" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="40" x="140" y="176" />
  </>
)

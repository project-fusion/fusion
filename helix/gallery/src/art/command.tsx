import type { CSSProperties, ReactNode } from 'react'

/**
 * A dialog that is a search, drawn as the two things that make it one: a
 * field across the top with a caret in it, and rows underneath that have
 * already been narrowed.
 *
 * Only two rows survive where Dialog's card has a body and two buttons. A
 * palette at rest holds everything and a palette being used holds almost
 * nothing, and the second is the state worth drawing: it is what the reader
 * is looking at by the time the component has done its job.
 */
export const commandArt: ReactNode = (
  <>
    <g className="artMotion artOpen">
      <g filter="url(#helixArtShadow)">
        <rect className="artOverlay" height="112" rx="4" width="192" x="64" y="44" />
      </g>
      <rect className="artEdge" height="0.5" width="192" x="64" y="75.5" />
      <path
        className="artStroke"
        d="M78 56.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm5 8l3 3"
        strokeOpacity="0.4"
        strokeWidth="1.5"
      />
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="44" x="92" y="56" />
      <rect
        className="artSolid artMotion artFill"
        height="12"
        rx="1"
        style={{ '--art-grow': 2 } as CSSProperties}
        width="2"
        x="142"
        y="54"
      />
      <g className="artMotion artRow" style={{ '--art-i': 0 } as CSSProperties}>
        <rect className="artRaised" height="24" rx="4" width="168" x="76" y="86" />
        <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="44" x="88" y="94" />
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="32" x="140" y="94" />
      </g>
      <g className="artMotion artRow" style={{ '--art-i': 1 } as CSSProperties}>
        <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="44" x="88" y="122" />
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="48" x="140" y="122" />
      </g>
    </g>
  </>
)

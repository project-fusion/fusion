import type { CSSProperties, ReactNode } from 'react'

/**
 * A window over a set most of which is not there.
 *
 * The rows inside the frame are drawn and the ones outside it are a pair of
 * spacers, which is exactly what the component renders: the picture is the
 * mechanism rather than an illustration of it. The two ghosts above and below
 * are at a fraction of the ink, so a reader can see there is more without the
 * card claiming those rows exist.
 *
 * `artTravel` on the drawn rows, because a scroll is what moves the window
 * and the window is the subject. The clip sits on a group outside the one
 * that travels, for the reason `image` records and `scroll-area` repeats.
 */
export const virtualListArt: ReactNode = (
  <>
    <defs>
      <clipPath id="helixArtWindowFrame">
        <rect height="72" rx="6" width="224" x="48" y="64" />
      </clipPath>
    </defs>
    {/* The spacers, which stand in for the rows that were never made. */}
    <rect className="artInk" fillOpacity="0.1" height="20" rx="4" width="224" x="48" y="40" />
    <rect className="artInk" fillOpacity="0.1" height="20" rx="4" width="224" x="48" y="140" />
    <rect className="artSunken" height="72" rx="6" width="224" x="48" y="64" />
    <g clipPath="url(#helixArtWindowFrame)">
      <g
        className="artMotion artTravel"
        style={{ '--art-to': '0px', '--art-to-block': '-16px' } as CSSProperties}
      >
        <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="150" x="60" y="72" />
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="188" x="60" y="88" />
        <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="132" x="60" y="104" />
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="176" x="60" y="120" />
        <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="160" x="60" y="136" />
      </g>
    </g>
    {/* The frame edge, drawn over the rows so the window reads as a cut. */}
    <rect className="artEdge" fill="none" height="72" rx="6" width="224" x="48" y="64" />
  </>
)

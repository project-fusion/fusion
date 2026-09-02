import type { ReactNode } from 'react'

/**
 * `</>`, which is what a fragment of code looks like when it is small enough
 * to be a mark. A single caret beside a rule reads as a list item pointing
 * the wrong way: a caret and a line, not a picture of anything.
 */
export const codeArt: ReactNode = (
  <>
    <path
      className="artStroke"
      d="M138 92l-12 8 12 8"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
    />
    {/* Only the slash moves, and it is written rather than pressed. Lifting
        the whole glyph takes the two chevrons that hold it with it, which
        reads as the card breathing rather than as the one mark that makes
        this a fragment of code, and a scale is a mark being pressed where
        this mark is a stroke. Drawn upper left to lower right, which is both
        the order the `d` states and the order a hand writes it in. */}
    <path
      className="artStroke artMotion artDraw"
      d="M154 86l12 28"
      fill="none"
      pathLength="1"
      strokeLinecap="round"
      strokeWidth="2.5"
    />
    <path
      className="artStroke"
      d="M182 92l12 8-12 8"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
    />
  </>
)

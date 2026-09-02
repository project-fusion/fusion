import type { ReactNode } from 'react'

/**
 * One choice, and the one it is an answer to.
 *
 * Laid out to exactly Checkbox's measurements, on purpose: same 20 pixel
 * control on the same left edge, same label at the same offset. The only
 * difference in the frame is round against square, which is the only
 * difference that matters and the one thing a reader has to catch.
 */
export const radioArt: ReactNode = (
  <>
    <circle className="artSolid artMotion artOn" cx="104" cy="100" r="10" />
    <circle className="artOnSolid artMotion artMark" cx="104" cy="100" r="4" />
    <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="96" x="130" y="96" />
  </>
)

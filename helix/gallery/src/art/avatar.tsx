import type { ReactNode } from 'react'

/**
 * One avatar, and what is in it when there is no image.
 *
 * One rather than a ladder of three radii: a size ladder is a fact about the
 * API rather than a picture, the card only has to say *avatar*, and at 64 the
 * silhouette is actually legible.
 */
export const avatarArt: ReactNode = (
  <>
    <circle className="artSunken" cx="160" cy="100" r="32" />
    <circle className="artInk" cx="160" cy="92" fillOpacity="0.28" r="9" />
    <path className="artInk" d="M144 118a16 16 0 0 1 32 0z" fillOpacity="0.28" />
  </>
)

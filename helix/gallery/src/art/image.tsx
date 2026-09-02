import type { CSSProperties, ReactNode } from 'react'

/**
 * A picture in a bounded box, with a horizon, a sun and two ridges.
 *
 * The box is the subject rather than what is in it. What this component adds
 * over an `<img>` is that it reserves its ground and says whether the picture
 * arrived, so the drawing is a frame that is unmistakably a frame, holding a
 * scene generic enough that nobody reads it as a photograph of something.
 *
 * `artOpen` on the scene alone, not the frame. The frame is the part that was
 * there all along, and the picture is the part that arrives into it, which is
 * the whole of what the element does. Scaling the frame with it would say the
 * box turned up too, and the box turning up is the thing this component
 * exists to prevent.
 */
export const imageArt: ReactNode = (
  <>
    <defs>
      {/* The frame is a window and the picture is behind it, so the picture is
          clipped to it. Not decoration: the ridges are flush with the frame on
          three sides at rest, so the hover scale pushed them straight out and
          the card grew a gray wedge hanging off its own edge. */}
      <clipPath id="helixArtImageFrame">
        <rect height="112" rx="8" width="224" x="48" y="44" />
      </clipPath>
    </defs>
    <rect className="artSunken" height="112" rx="8" width="224" x="48" y="44" />
    {/* The clip is on a group of its own, outside the one that moves. A
        `clip-path` on the moving group would resolve in that group's own
        space, which is the space the scale just changed, so it would grow
        with the thing it is supposed to be holding in. */}
    <g clipPath="url(#helixArtImageFrame)">
      <g className="artMotion artOpen" style={{ transformOrigin: 'center' } as CSSProperties}>
        <circle className="artInk" cx="96" cy="80" fillOpacity="0.28" r="12" />
        <path className="artInk" d="M48 156v-24l40-32 34 28 30-24 48 52z" fillOpacity="0.28" />
        <path className="artInk" d="M136 156l40-36 96 36z" fillOpacity="0.55" />
      </g>
    </g>
    <rect className="artEdge" height="111" rx="8" width="223" x="48.5" y="44.5" />
  </>
)

import type { CSSProperties, ReactNode } from 'react'

/**
 * A field with a dashed edge and two names under it, which is the one shape
 * that reads as "a place to put files" at this size: a solid box is just a
 * field, and a picture of a cloud says upload to nobody who has not already
 * been told. The dashes are drawn as a run of short bars rather than stroked,
 * for the reason the rules are: a stroke half-renders at the card's
 * three-quarter scale.
 */
export const fileInputArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="56" x="48" y="44" />
    <rect className="artSunken" height="56" rx="4" width="224" x="48" y="64" />
    {[0, 1, 2, 3, 4, 5, 6, 7].map((step) => (
      <rect
        className="artRule"
        height="1"
        key={`top-${step}`}
        width="16"
        x={52 + step * 28}
        y="64"
      />
    ))}
    {[0, 1, 2, 3, 4, 5, 6, 7].map((step) => (
      <rect
        className="artRule"
        height="1"
        key={`bottom-${step}`}
        width="16"
        x={52 + step * 28}
        y="119"
      />
    ))}
    {/* The trigger, centered in the box the way the label is, and static.
        `artFill` here animates a label growing wider, which is not a thing a
        file input does to anything: that archetype is for a value filling a
        track. */}
    <rect className="artSolid" height="8" rx="4" width="64" x="128" y="88" />
    {/* Two chosen files under it, each with the mark that takes it back out.
        The second one slides in, because accepting a file is the whole of
        what this component does and the list is where that shows. It comes
        from the right rather than fading in place: a row that appears where
        it already was is indistinguishable from a row that was always there.
        Forty units, which puts its far edge at 312 and so inside the frame
        with no clip needed. */}
    <rect className="artSunken" height="16" rx="4" width="224" x="48" y="128" />
    <rect className="artInk" fillOpacity="0.4" height="6" rx="3" width="96" x="56" y="133" />
    <rect className="artInk" fillOpacity="0.28" height="2" rx="1" width="8" x="256" y="135" />
    <g className="artMotion artEdgeIn" style={{ '--art-from': '40px' } as CSSProperties}>
      <rect className="artSunken" height="16" rx="4" width="224" x="48" y="152" />
      <rect className="artInk" fillOpacity="0.4" height="6" rx="3" width="72" x="56" y="157" />
      <rect className="artInk" fillOpacity="0.28" height="2" rx="1" width="8" x="256" y="159" />
    </g>
  </>
)

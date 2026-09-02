import type { CSSProperties, ReactNode } from 'react'

/**
 * The field an `Input` draws, with a button welded to each end.
 *
 * The two ends are the whole silhouette. Without them this is `Input`
 * exactly, same sunken box at the same width, and a card that has to be read
 * rather than recognized has already failed at thumbnail size. The rules
 * between them and the number are what say the buttons are part of the field
 * and not two buttons after it, which is the one thing this component's
 * stylesheet is most careful about.
 *
 * The value is centered rather than left-aligned, which is the other thing
 * that tells it from `Input` at a glance and is true of the component.
 *
 * It counts on hover, by stretching: a value getting longer is what counting
 * looks like, and it is the archetype `Input` uses for the same thing. Not
 * `--art-to: 0px` with a three pixel block offset, which parses, animates and
 * moves nothing a reader can see.
 */
export const numberInputArt: ReactNode = (
  <>
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="48" x="48" y="52" />
    <rect className="artSunken" height="40" rx="4" width="224" x="48" y="72" />
    <rect className="artEdge" height="39" rx="4" width="223" x="48.5" y="72.5" />
    {/* The rules, one unit and filled rather than stroked, so they never
        half-render at the card's three-quarter scale. */}
    <rect className="artRule" height="40" width="1" x="88" y="72" />
    <rect className="artRule" height="40" width="1" x="232" y="72" />
    {/* Minus and plus, at the icon step, drawn as filled bars for the same
        reason the rules are. */}
    <rect className="artInk" fillOpacity="0.55" height="2" rx="1" width="12" x="62" y="91" />
    <rect className="artInk" fillOpacity="0.55" height="2" rx="1" width="12" x="246" y="91" />
    <rect className="artInk" fillOpacity="0.55" height="12" rx="1" width="2" x="251" y="86" />
    {/* Centered in what is left of the field, which is 89 to 232. */}
    <rect
      className="artSolid artMotion artFill"
      height="8"
      rx="4"
      style={{ '--art-grow': 1.6 } as CSSProperties}
      width="24"
      x="140"
      y="88"
    />
  </>
)

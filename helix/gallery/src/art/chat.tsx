import type { CSSProperties, ReactNode } from 'react'

/**
 * Two turns against opposite edges and a field under them, which is the whole
 * of what a conversation looks like before anything is said in it.
 *
 * The reader's own turn is the one against the trailing edge, because that is
 * the single piece of paint this component uses to say whose turn it is, and a
 * card that showed only one side would be showing a list.
 */
export const chatArt: ReactNode = (
  <>
    {[
      { end: false, width: 128, y: 44 },
      { end: true, width: 96, y: 76 },
      { end: false, width: 112, y: 108 },
    ].map((turn) => (
      <g className="artMotion artRow" key={turn.y} style={{ '--art-i': 0 } as CSSProperties}>
        <rect
          className="artInk"
          fillOpacity={turn.end ? 0.4 : 0.24}
          height="20"
          rx="6"
          width={turn.width}
          x={turn.end ? 272 - turn.width : 48}
          y={turn.y}
        />
      </g>
    ))}
    {/* The composer, which is a separate element for the same reason it looks
        like one here: it is separately replaceable. */}
    <rect
      className="artStroke"
      fill="none"
      height="26"
      rx="8"
      strokeOpacity="0.28"
      strokeWidth="1.5"
      width="184"
      x="48"
      y="146"
    />
    <rect className="artSolid" height="26" rx="8" width="40" x="240" y="146" />
  </>
)

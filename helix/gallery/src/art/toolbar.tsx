import type { CSSProperties, ReactNode } from 'react'

/**
 * Mixed controls sharing one tab stop, and no plane under them.
 *
 * The stagger is that one tab stop: focus enters the group once and then
 * moves control to control, so the controls arrive in order rather than
 * together. The rule between them does not, because a separator is not a stop.
 */
export const toolbarArt: ReactNode = (
  <>
    {[
      { i: 0, w: 40, x: 56 },
      { i: 1, w: 40, x: 104 },
      { i: 2, w: 64, x: 176 },
      { i: 3, w: 40, x: 248 },
    ].map((control) => (
      <g
        className="artMotion artRow"
        key={control.x}
        style={{ '--art-i': control.i } as CSSProperties}
      >
        <rect className="artSunken" height="40" rx="4" width={control.w} x={control.x} y="80" />
        {/* The one case in the set where the fill really is not enough: a 40
            unit sunken square on the page is a ghost at card size, and four
            ghosts beside a rule is Flex with a divider. */}
        <rect
          className="artEdge"
          height="39"
          rx="4"
          width={control.w - 1}
          x={control.x + 0.5}
          y="80.5"
        />
      </g>
    ))}
    <rect className="artRule" height="24" width="1" x="160" y="88" />
  </>
)

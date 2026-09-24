import type { CSSProperties, ReactNode } from 'react'

/**
 * Cards where somebody put them, and the arrows between.
 *
 * **Position is the subject.** What tells this from `Map` and from a chart is
 * that nothing here was computed: the placement is the document, so the drawing
 * is three cards at three deliberate offsets rather than a grid or a curve. One
 * is dashed and behind the other two, which is what a group is.
 *
 * The arrows leave and arrive square to the side they attach on, because that
 * is what the format stores and what makes a connector read as attached rather
 * than aimed.
 */
export const canvasArt: ReactNode = (
  <>
    {/* The group, behind what it holds. */}
    <rect
      className="artEdge"
      height="92"
      rx="8"
      strokeDasharray="6 5"
      width="188"
      x="40.5"
      y="40.5"
    />
    <g className="artMotion artOpen" style={{ transformOrigin: 'center' } as CSSProperties}>
      <path
        className="artInk"
        d="M136 72c18 0 18 0 28 0"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="2"
      />
      <path
        className="artInk"
        d="M196 104c0 26-52 14-52 34"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="2"
      />
      <rect className="artSurface" height="44" rx="6" width="80" x="56" y="52" />
      <rect className="artEdge" height="43" rx="6" width="79" x="56.5" y="52.5" />
      <rect className="artInk" fillOpacity="0.28" height="5" rx="2.5" width="52" x="66" y="66" />
      <rect className="artInk" fillOpacity="0.12" height="5" rx="2.5" width="36" x="66" y="78" />

      <rect className="artSurface" height="44" rx="6" width="80" x="164" y="52" />
      <rect className="artEdge" height="43" rx="6" width="79" x="164.5" y="52.5" />
      <rect className="artInk" fillOpacity="0.28" height="5" rx="2.5" width="44" x="174" y="66" />

      <rect className="artSolid" height="44" rx="6" width="80" x="104" y="138" />
      <rect
        className="artOnSolid"
        fillOpacity="0.9"
        height="5"
        rx="2.5"
        width="48"
        x="114"
        y="152"
      />
      <rect
        className="artOnSolid"
        fillOpacity="0.55"
        height="5"
        rx="2.5"
        width="30"
        x="114"
        y="164"
      />
    </g>
  </>
)

import type { CSSProperties, ReactNode } from 'react'

/**
 * Cards where somebody put them, and the arrows between.
 *
 * **Position is the subject.** What tells this from a chart or a tree is that
 * nothing here was computed: the placement is the document, so this is three
 * cards at three deliberate offsets rather than a grid or a curve. The dashed
 * box behind two of them is a group, which is the one relationship a board
 * carries that its cards do not state.
 *
 * **The connectors are strokes and not fills**, which is the whole of what was
 * wrong with the first attempt: `artInk` sets a fill, so a curve drawn with it
 * filled between its own ends and read as a white wedge across the card.
 * `artStroke` is the class for a line, and it says so.
 *
 * The heads are small on purpose. A connector says which way it goes, and an
 * arrow big enough to read as a shape of its own says it twice.
 */
export const canvasArt: ReactNode = (
  <>
    <defs>
      <marker
        id="helixArtCanvasArrow"
        markerHeight="6"
        markerUnits="userSpaceOnUse"
        markerWidth="6"
        orient="auto"
        refX="5"
        refY="3"
      >
        <path className="artInk" d="M0 0 L6 3 L0 6 z" fillOpacity="0.55" />
      </marker>
    </defs>

    {/* The group, behind what it holds. */}
    <rect
      className="artEdge"
      height="84"
      rx="8"
      strokeDasharray="5 4"
      width="196"
      x="44.5"
      y="36.5"
    />

    <g className="artMotion artOpen" style={{ transformOrigin: 'center' } as CSSProperties}>
      <path
        className="artStroke"
        d="M140 70h20"
        markerEnd="url(#helixArtCanvasArrow)"
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
      <path
        className="artStroke"
        d="M204 96c0 26-44 16-44 34"
        markerEnd="url(#helixArtCanvasArrow)"
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />

      <rect className="artSurface" height="40" rx="6" width="80" x="60" y="50" />
      <rect className="artEdge" height="39" rx="6" width="79" x="60.5" y="50.5" />
      <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="52" x="70" y="62" />
      <rect className="artInk" fillOpacity="0.12" height="4" rx="2" width="34" x="70" y="72" />

      <rect className="artSurface" height="40" rx="6" width="80" x="164" y="50" />
      <rect className="artEdge" height="39" rx="6" width="79" x="164.5" y="50.5" />
      <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="44" x="174" y="62" />
      <rect className="artInk" fillOpacity="0.12" height="4" rx="2" width="28" x="174" y="72" />

      <rect className="artSurface" height="40" rx="6" width="80" x="120" y="136" />
      <rect className="artEdge" height="39" rx="6" width="79" x="120.5" y="136.5" />
      <rect className="artInk" fillOpacity="0.55" height="4" rx="2" width="48" x="130" y="148" />
      <rect className="artInk" fillOpacity="0.12" height="4" rx="2" width="30" x="130" y="158" />
    </g>
  </>
)

import type { CSSProperties, ReactNode } from 'react'

/**
 * Linked notes beside the list of them, with one note selected in both.
 *
 * **The list is half the drawing because it is half the family.** The picture
 * is somebody else's renderer, the way Map's tiles are; what Helix ships is the
 * frame, the search and the list that reads the selected note's links out in
 * order. So the selected note is the one solid mark in the drawing and the one
 * plate in the list, and its neighbors are the next weight down in both.
 *
 * **Only the selected note's links move.** `artDraw` writes each one outward
 * from the selected note, which is what selecting a note does to the picture:
 * its neighborhood is what the reader asked for. The links between other notes
 * hold at the lightest ink.
 */
export const graphArt: ReactNode = (
  <>
    <rect className="artSurface" height="128" rx="8" width="224" x="48" y="36" />
    <rect className="artRule" height="128" width="1" x="190" y="36" />

    {/* Links between the other notes. */}
    <g className="artStroke" strokeOpacity="0.12" strokeWidth="1.5">
      <path d="M152 66L176 92" />
      <path d="M78 70L64 104L82 134" />
      <path d="M150 128L118 150" />
      <path d="M78 70L122 48" />
    </g>

    {/* The selected note's links, written outward from it. */}
    {['M114 98L78 70', 'M114 98L152 66', 'M114 98L150 128', 'M114 98L82 134'].map((d, i) => (
      <path
        className="artStroke artMotion artDraw"
        d={d}
        key={d}
        pathLength="1"
        strokeLinecap="round"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        style={{ '--art-i': i } as CSSProperties}
      />
    ))}

    <g className="artInk" fillOpacity="0.28">
      <circle cx="176" cy="92" r="4" />
      <circle cx="64" cy="104" r="4" />
      <circle cx="118" cy="150" r="4" />
      <circle cx="122" cy="48" r="4" />
    </g>
    <g className="artInk" fillOpacity="0.55">
      <circle cx="78" cy="70" r="5" />
      <circle cx="152" cy="66" r="5" />
      <circle cx="150" cy="128" r="5" />
      <circle cx="82" cy="134" r="5" />
    </g>
    <circle className="artSolid" cx="114" cy="98" r="7" />

    {/* The search and the list. */}
    <rect className="artEdge" height="15" rx="4" width="63" x="198.5" y="46.5" />
    <rect className="artInk" fillOpacity="0.12" height="4" rx="2" width="28" x="204" y="52" />

    <rect className="artInk" fillOpacity="0.12" height="16" rx="4" width="64" x="198" y="70" />
    <rect className="artInk" fillOpacity="0.55" height="4" rx="2" width="36" x="204" y="76" />
    <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="42" x="204" y="94" />
    <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="30" x="204" y="110" />
    <rect className="artInk" fillOpacity="0.28" height="4" rx="2" width="38" x="204" y="126" />
    <rect className="artInk" fillOpacity="0.12" height="4" rx="2" width="44" x="204" y="142" />
  </>
)

import type { ReactNode } from 'react'

/**
 * The frame, the controls, and a map that is plainly somebody else's.
 *
 * **What is drawn is the border and the controls**, because that is the whole
 * of what this family is: Helix ships no tiles, no projection and no network.
 * The map behind them is a few roads and a river at the lightest ink there is,
 * so the card does not promise a renderer this library does not have.
 *
 * **The roads are strokes and not fills.** `artInk` sets a fill, so the river
 * drawn with it filled between its own ends and read as a white smear across
 * the frame; `artStroke` is the class for a line.
 *
 * The control cluster is the pad and the zoom column, at the corner every map
 * puts them, and it is the thing in focus: the buttons are the family's
 * argument, being what a screen reader can find where an arrow key is a bargain
 * with the reader's reading mode.
 */
export const mapArt: ReactNode = (
  <>
    <rect className="artSurface" height="128" rx="8" width="224" x="48" y="36" />

    {/* Somebody else's map, at the lightest ink there is. */}
    <g className="artStroke" strokeOpacity="0.12" strokeWidth="5">
      <path d="M48 104h224" />
      <path d="M116 36v128" />
      <path d="M204 36v128" />
    </g>
    <path
      className="artStroke"
      d="M48 138c36-6 54 12 84 5s48-24 76-17"
      strokeOpacity="0.28"
      strokeWidth="7"
    />

    {/* The controls, which are the family. */}
    <g className="artMotion artOpen">
      <g>
        <rect className="artOverlay" height="16" rx="3" width="16" x="212" y="46" />
        <rect className="artEdge" height="15" rx="3" width="15" x="212.5" y="46.5" />
        <path
          className="artStroke"
          d="M220 57v-6m-3 3 3-3 3 3"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
      </g>
      <g>
        <rect className="artOverlay" height="16" rx="3" width="16" x="194" y="64" />
        <rect className="artEdge" height="15" rx="3" width="15" x="194.5" y="64.5" />
        <path
          className="artStroke"
          d="M205 72h-6m3-3-3 3 3 3"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
      </g>
      <g>
        <rect className="artOverlay" height="16" rx="3" width="16" x="230" y="64" />
        <rect className="artEdge" height="15" rx="3" width="15" x="230.5" y="64.5" />
        <path
          className="artStroke"
          d="M235 72h6m-3-3 3 3-3 3"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
      </g>
      <g>
        <rect className="artOverlay" height="16" rx="3" width="16" x="212" y="82" />
        <rect className="artEdge" height="15" rx="3" width="15" x="212.5" y="82.5" />
        <path
          className="artStroke"
          d="M220 87v6m-3-3 3 3 3-3"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
      </g>

      <g>
        <rect className="artOverlay" height="16" rx="3" width="16" x="248" y="46" />
        <rect className="artEdge" height="15" rx="3" width="15" x="248.5" y="46.5" />
        <path className="artStroke" d="M252 54h8m-4-4v8" strokeOpacity="0.55" strokeWidth="1.5" />
      </g>
      <g>
        <rect className="artOverlay" height="16" rx="3" width="16" x="248" y="64" />
        <rect className="artEdge" height="15" rx="3" width="15" x="248.5" y="64.5" />
        <path className="artStroke" d="M252 72h8" strokeOpacity="0.55" strokeWidth="1.5" />
      </g>
    </g>

    <rect className="artEdge" height="127" rx="8" width="223" x="48.5" y="36.5" />
  </>
)

import type { ReactNode } from 'react'

/**
 * Source on one side, what it renders on the other.
 *
 * The divider is the whole idea, so it is the only thing drawn at full height.
 * The right side holds one rendered control rather than a copy of the left,
 * because a preview is a rendered thing and not more text.
 */
export const sandboxArt: ReactNode = (
  <>
    <rect className="artSunken" height="120" rx="4" width="224" x="48" y="40" />
    <rect className="artEdge" height="119" rx="4" width="223" x="48.5" y="40.5" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="80" x="64" y="60" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="64" x="80" y="80" />
    <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="72" x="64" y="100" />
    <rect className="artRule" height="120" width="1" x="160" y="40" />
    <rect className="artPage" height="120" width="111" x="161" y="40" />
    {/* Centered in the preview pane, not flush to its right edge. The pane
        runs 161 to 272, so a control 80 wide sits at 176. Hard against the
        frame it reads as clipped rather than as rendered. */}
    <g className="artMotion artLift">
      <g className="artLiftShadow" filter="url(#helixArtShadow)">
        <rect className="artSolid" height="40" rx="4" width="80" x="176" y="80" />
      </g>
      <rect className="artSolid" height="40" rx="4" width="80" x="176" y="80" />
      <rect className="artOnSolid" height="8" rx="4" width="36" x="198" y="96" />
    </g>
  </>
)

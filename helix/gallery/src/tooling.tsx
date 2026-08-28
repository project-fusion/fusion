import type { CSSProperties, ReactNode } from 'react'

/**
 * Gallery art for the families that come from `@fusion.dev/helix-sandbox`.
 *
 * Their own file because the package is their own: the sandbox is deliberately
 * not the component library, and a reader who notices that `editor` and
 * `sandbox` sit apart here has noticed something true. Nobody reskins a dev
 * tool, so these two are also the only families with no headless tier to be
 * abstract about.
 *
 * The system is documented at the top of `core.tsx`.
 */
export const toolingArt: Record<string, ReactNode> = {
  /**
   * Source with a gutter and indentation.
   *
   * The gutter rule separates this from `textarea`, and the indents going in and
   * back out again separate it from `tree`, whose depth only ever increases down
   * the visible rows. Lines arrive in order, which is how source is read.
   */
  editor: (
    <>
      <rect className="artSunken" height="120" rx="4" width="224" x="48" y="40" />
      <rect className="artEdge" height="119" rx="4" width="223" x="48.5" y="40.5" />
      <rect className="artRule" height="120" width="1" x="80" y="40" />
      {[
        { indent: 0, w: 112, y: 56 },
        { indent: 20, w: 84, y: 78 },
        { indent: 20, w: 96, y: 100 },
        { indent: 0, w: 64, y: 122 },
      ].map((line, index) => (
        <g className="artMotion artRow" key={line.y} style={{ '--art-i': index } as CSSProperties}>
          <rect
            className="artInk"
            fillOpacity="0.12"
            height="6"
            rx="3"
            width="8"
            x="60"
            y={line.y + 1}
          />
          <rect
            className="artInk"
            fillOpacity={index === 2 ? 0.55 : 0.28}
            height="8"
            rx="4"
            width={line.w}
            x={96 + line.indent}
            y={line.y}
          />
        </g>
      ))}
    </>
  ),

  /**
   * Source on one side, what it renders on the other.
   *
   * The divider is the whole idea, so it is the only thing drawn at full height.
   * The right side holds one rendered control rather than a copy of the left,
   * because a preview is a rendered thing and not more text.
   */
  sandbox: (
    <>
      <rect className="artSunken" height="120" rx="4" width="224" x="48" y="40" />
      <rect className="artEdge" height="119" rx="4" width="223" x="48.5" y="40.5" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="80" x="64" y="60" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="64" x="80" y="80" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="72" x="64" y="100" />
      <rect className="artRule" height="120" width="1" x="160" y="40" />
      <rect className="artPage" height="120" width="111" x="161" y="40" />
      {/* Centered in the preview pane, not flush to its right edge. The pane
          runs 161 to 272, so a control 80 wide sits at 176: it was at 192,
          which put it hard against the frame and read as clipped rather than
          as rendered. */}
      <g className="artMotion artLift">
        <g className="artLiftShadow" filter="url(#helixArtShadow)">
          <rect className="artSolid" height="40" rx="4" width="80" x="176" y="80" />
        </g>
        <rect className="artSolid" height="40" rx="4" width="80" x="176" y="80" />
        <rect className="artOnSolid" height="8" rx="4" width="36" x="198" y="96" />
      </g>
    </>
  ),
}

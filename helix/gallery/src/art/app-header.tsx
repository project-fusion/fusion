import type { CSSProperties, ReactNode } from 'react'

/**
 * Fifty-six pixels tall, which is `--helix-size-header`, spanning the page.
 *
 * The bar and nothing else. A page under it is the biggest thing in the frame
 * while contributing none of what the card has to say, which is "a bar of
 * this height, holding a mark, some nav and an action".
 *
 * **The bar is static and its contents are not.** A masthead that drifts on
 * its own page is a picture of a bug, so nothing may lift the bar itself. A
 * mark, two links and an action arriving in the order they are laid out in
 * says nothing about the bar going anywhere.
 */
export const appHeaderArt: ReactNode = (
  <>
    {/* A rule under it rather than an outline around it, which is what a
        masthead actually has: a header is defined by where it *ends*, and the
        mark, the nav and the action say where it begins. The bar's `surface`
        fill sits one and a half percent off the page and cannot hold a
        silhouette on its own, which is what tempts the four sides.

        `artRule` rather than `artEdge` because it is a rule. Rules in this
        gallery are filled rects at one unit, so they never half-render at a
        fractional scale the way a stroke does.

        Neither the bar nor the rule carries a motion class. Only what the bar
        holds does. */}
    <rect className="artSurface" height="56" width="232" x="44" y="72" />
    <rect className="artRule" height="1" width="232" x="44" y="128" />
    <g className="artMotion artRow" style={{ '--art-i': 0 } as CSSProperties}>
      <rect className="artSolid" height="20" rx="4" width="20" x="60" y="90" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 1 } as CSSProperties}>
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="32" x="96" y="96" />
      <rect className="artInk" fillOpacity="0.28" height="8" rx="4" width="28" x="140" y="96" />
    </g>
    <g className="artMotion artRow" style={{ '--art-i': 2 } as CSSProperties}>
      <rect className="artRaised" height="20" rx="4" width="44" x="212" y="90" />
    </g>
  </>
)

import type { ReactNode } from 'react'

/**
 * The window: a title, a line of it, and the two ways out.
 *
 * No page and no scrim. Drawing what an overlay overlays buys a relationship
 * at the cost of the subject here: the page takes two thirds of the frame,
 * dimmed almost to flat, with the dialog small in the middle of it. Drawer
 * keeps its page because Drawer is *attached* to an edge and has no
 * silhouette without one. A dialog is centered and floating, and floating is
 * a shadow, which needs nothing behind it to read.
 */
export const dialogArt: ReactNode = (
  <>
    <g className="artMotion artOpen">
      <g filter="url(#helixArtShadow)">
        <rect className="artOverlay" height="104" rx="4" width="192" x="64" y="48" />
      </g>
      <rect className="artInk" fillOpacity="0.55" height="8" rx="4" width="80" x="80" y="68" />
      <rect className="artInk" fillOpacity="0.28" height="6" rx="3" width="128" x="80" y="88" />
      <rect className="artEdge" height="19" rx="4" width="43" x="144.5" y="116.5" />
      <rect className="artSolid" height="20" rx="4" width="40" x="200" y="116" />
    </g>
  </>
)

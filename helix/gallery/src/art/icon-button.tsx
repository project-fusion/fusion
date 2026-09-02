import type { ReactNode } from 'react'

/**
 * Square at the control height, and the glyph is all of it.
 *
 * Three dots, and never three stacked bars: that is *the* menu icon, so the
 * card would read as a hamburger button and the subject would become what the
 * button opens rather than what the button is. Three dots is the one mark in
 * common use that means "this control's content is an icon, and the icon is
 * not the point", and nothing else in the gallery uses it.
 */
export const iconButtonArt: ReactNode = (
  <>
    <g className="artMotion artLift">
      <g className="artLiftShadow" filter="url(#helixArtShadow)">
        <rect className="artSolid" height="40" rx="4" width="40" x="140" y="80" />
      </g>
      <rect className="artSolid" height="40" rx="4" width="40" x="140" y="80" />
      {[150, 160, 170].map((cx) => (
        <circle className="artOnSolid" cx={cx} cy="100" key={cx} r="2" />
      ))}
    </g>
  </>
)

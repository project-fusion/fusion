import type { CSSProperties, ReactNode } from 'react'

/**
 * Three and a half marks of five, which is the case the component is for.
 *
 * A whole mark and a half mark are one drawing. The marks are a mask and the
 * score is a bar behind them, so a half is where the bar stops rather than a
 * second glyph filled halfway, which is exactly what `rating-root.css` does
 * and the only reason the component takes any mark a consumer gives it.
 * Drawing the half as its own shape here would illustrate a component that
 * does not exist.
 *
 * `artFill` follows from that: the bar *is* the score, so the bar is what
 * moves. `--art-grow` is 116 over 82, the row's width over the bar's, which
 * arrives at a full five rather than partway through the last mark.
 *
 * Sizes are the component's own. A mark is 20, which is `size-icon-md`, and
 * the gap is 4, which is `space-2xs`, so the row is 116 and the bar under
 * three and a half marks is 82: three at the full pitch, then half a mark.
 */
export const ratingArt: ReactNode = (
  <>
    <defs>
      <path
        d="M10 .5L12.53 6.52L19.04 7.07L14.09 11.33L15.58 17.69L10 14.3L4.42 17.69L5.91 11.33L.96 7.07L7.47 6.52Z"
        id="helixArtRatingStar"
      />
      <mask id="helixArtRatingMarks">
        <g fill="#fff">
          <use href="#helixArtRatingStar" x="102" y="90" />
          <use href="#helixArtRatingStar" x="126" y="90" />
          <use href="#helixArtRatingStar" x="150" y="90" />
          <use href="#helixArtRatingStar" x="174" y="90" />
          <use href="#helixArtRatingStar" x="198" y="90" />
        </g>
      </mask>
    </defs>
    <g mask="url(#helixArtRatingMarks)">
      <rect className="artInk" fillOpacity="0.28" height="20" width="116" x="102" y="90" />
      <rect
        className="artSolid artMotion artFill"
        height="20"
        style={{ '--art-grow': 1.41 } as CSSProperties}
        width="82"
        x="102"
        y="90"
      />
    </g>
  </>
)

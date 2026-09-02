import type { CSSProperties, ReactNode } from 'react'

/**
 * Equal boxes, one filled, a caret at each end, and the ellipsis between them.
 *
 * The ellipsis is what makes this pagination and not Tabs or Toggle: it is the
 * only mark in the gallery that says *there is more here than is drawn*, which
 * is the whole subject of the component. Without it four boxes with one filled
 * is a segmented control.
 *
 * Boxes rather than numbers, because the vocabulary here has no glyphs and a
 * page number drawn as a bar would say nothing a bar has not already said
 * elsewhere. Equal widths carry it instead: a pagination's slots are square
 * and identical, where a tab row's are as wide as their labels.
 *
 * The fill travels one slot on hover, which is the component's only motion.
 */
export const paginationArt: ReactNode = (
  <>
    {/* Filled paths, not strokes: the vocabulary at the top of `core.tsx` is
        filled rects and filled chevrons throughout, and `artInk` sets a fill
        and no stroke, so a stroked caret would have rendered as nothing at
        all. Same construction as the accordion's disclosure marks. */}
    <path className="artInk" d="M62 95l-5 5 5 5-1.5 1.5-6.5-6.5 6.5-6.5z" fillOpacity="0.28" />
    {[72, 108, 144, 216].map((x) => (
      <rect
        className="artInk"
        fillOpacity="0.28"
        height="32"
        key={x}
        rx="4"
        width="32"
        x={x}
        y="84"
      />
    ))}
    {/* On 100 rather than the row's own 104, because the lattice puts a dot at
        (200, 104) and a third ellipsis dot two units from it reads as four. */}
    {[190, 196, 202].map((cx) => (
      <circle className="artInk" cx={cx} cy="100" fillOpacity="0.28" key={cx} r="1.5" />
    ))}
    <rect
      className="artSolid artMotion artTravel"
      height="32"
      rx="4"
      style={{ '--art-to': '36px' } as CSSProperties}
      width="32"
      x="108"
      y="84"
    />
    <path className="artInk" d="M258 95l5 5-5 5 1.5 1.5 6.5-6.5-6.5-6.5z" fillOpacity="0.28" />
  </>
)

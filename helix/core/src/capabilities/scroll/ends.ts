import type { Ends, Point, Scrolled } from '../types.generated.js'

/** How long a part that scrolls is along each axis: what it holds, and the frame it shows that in. */
export interface ScrollLengths {
  readonly content: { readonly height: number; readonly width: number }
  readonly frame: { readonly height: number; readonly width: number }
}

/**
 * Whether a scroll at `offset` stands at each end of an axis whose content
 * and frame are `content` and `frame` long. **Within a pixel counts as at
 * the end**, since a scroll can stop a fraction short of it. A start is
 * read from the offset's size, so a right-to-left scroller, whose offsets
 * run below zero on the web, reads the same.
 */
const endsOf = (offset: number, content: number, frame: number): Ends => {
  const along = Math.abs(offset)
  return { end: along + frame >= content - 1, start: along <= 1 }
}

/** Where a part that scrolls stands at `offset`, given its lengths. */
export const scrolledAt = (offset: Point, lengths: ScrollLengths, settled: boolean): Scrolled => ({
  offset: { x: offset.x, y: offset.y },
  settled,
  x: endsOf(offset.x, lengths.content.width, lengths.frame.width),
  y: endsOf(offset.y, lengths.content.height, lengths.frame.height),
})

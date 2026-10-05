/**
 * The arithmetic behind the scrollbars a scroll area draws under `scrollbars`.
 *
 * Every length here is along one axis and counted from that axis' start, which
 * is the right-hand edge on a right-to-left page for the horizontal one. The
 * component turns a pointer and a `scrollLeft` into those counts, so nothing
 * below has to know which way the line runs.
 */

/** Which scrollbars are drawn, and when. Absent keeps the browser's own. */
export type Scrollbars = 'always' | 'auto' | 'hover' | 'scroll'

/** The two axes a scrollbar runs along. */
export type Axis = 'horizontal' | 'vertical'

/** The box a scrollbar reads, as the numbers it reads off it. */
export interface Box {
  clientHeight: number
  clientWidth: number
  scrollHeight: number
  scrollLeft: number
  scrollTop: number
  scrollWidth: number
}

/** One axis of the viewport, read off the box. */
export interface Extent {
  /** How much of the content the viewport shows, `clientHeight` or `clientWidth`. */
  client: number
  /** How far from its start the axis is scrolled, never negative. */
  offset: number
  /** The whole length of the content, `scrollHeight` or `scrollWidth`. */
  scroll: number
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high)

/**
 * The share of the track the thumb covers, from 0 to 1: how much of the content
 * is in view. A box with no content, or one that shows all of it, is 1.
 */
export const thumbFraction = ({ client, scroll }: Extent): number =>
  scroll <= 0 ? 1 : clamp(client / scroll, 0, 1)

/**
 * How far along the axis is scrolled, from 0 at the start to 1 at the end. An
 * axis with nothing to scroll is 0.
 */
export const scrollFraction = ({ client, offset, scroll }: Extent): number => {
  const room = scroll - client
  return room <= 0 ? 0 : clamp(offset / room, 0, 1)
}

/**
 * How far the content moves for each pixel the thumb is dragged.
 *
 * The thumb travels the track less its own length, and the content travels
 * its length less the view, so the ratio of the two is the gearing. Zero where
 * the thumb fills the track and cannot move.
 */
export const scrollPerPixel = (extent: Extent, track: number, thumb: number): number => {
  const run = track - thumb
  return run <= 0 ? 0 : Math.max(0, extent.scroll - extent.client) / run
}

/**
 * The offset that puts the middle of the thumb under a press on the track.
 *
 * `along` is where the press landed, counted from the track's start. The thumb
 * stops at either end of the track, so a press near an end scrolls to that end.
 */
export const offsetAt = (extent: Extent, along: number, track: number, thumb: number): number => {
  const run = track - thumb
  if (run <= 0) {
    return 0
  }
  return clamp((along - thumb / 2) / run, 0, 1) * Math.max(0, extent.scroll - extent.client)
}

/**
 * Whether an axis has a scrollbar at all: it can scroll, and under every value
 * but `always` it has something to scroll.
 *
 * An axis whose `overflow` is `hidden` or `clip` cannot be scrolled by a reader,
 * so it gets no scrollbar whatever `scrollbars` says. That is how a consumer
 * keeps a horizontal bar off a list that only scrolls down.
 */
export const hasScrollbar = (mode: Scrollbars, scrollable: boolean, overflows: boolean): boolean =>
  scrollable && (mode === 'always' || overflows)

/**
 * Whether a scrollbar that exists is showing at this moment.
 *
 * `auto` and `always` show it the whole time. `scroll` shows it while the
 * content is moving and for the hide delay after, and while the pointer holds
 * it. `hover` adds the time the pointer is over the scroll area.
 */
export const showsScrollbar = (
  mode: Scrollbars,
  moment: { active: boolean; held: boolean; hovered: boolean },
): boolean => {
  if (mode === 'auto' || mode === 'always') {
    return true
  }
  return moment.active || moment.held || (mode === 'hover' && moment.hovered)
}

/**
 * One axis of a box, counted from its start whichever way the line runs: a
 * right-to-left box counts `scrollLeft` down from zero, so its offset is the
 * distance from zero.
 */
export const extentOf = (box: Box, axis: Axis): Extent =>
  axis === 'vertical'
    ? { client: box.clientHeight, offset: box.scrollTop, scroll: box.scrollHeight }
    : { client: box.clientWidth, offset: Math.abs(box.scrollLeft), scroll: box.scrollWidth }

/**
 * Where a pointer is along a track, counted from the track's start: its top,
 * or its left edge, or its right edge on a right-to-left page.
 */
export const alongTrack = (
  pointer: number,
  track: { bottom: number; left: number; right: number; top: number },
  axis: Axis,
  rtl: boolean,
): number => {
  if (axis === 'vertical') {
    return pointer - track.top
  }
  return rtl ? track.right - pointer : pointer - track.left
}

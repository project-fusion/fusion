/**
 * The declarations a view draws as something other than a style: a line
 * along an edge, a clip, a scroll, counters, a list marker, and a grid. Each
 * consumes the properties it reads.
 */

import { length } from './apply.js'
import type { Template } from './grid/form.js'
import { trackList } from './grid/tracks.js'
import type { Counting, Line, Resolution } from './resolved.js'
import { oneColumn } from './tree.js'

/**
 * **A one-color gradient sized to an edge is a line along it.** That is how a
 * stylesheet draws a rule a tab can sit on, and a native view has no
 * background image to size, so it becomes a line of its own. **Any other
 * gradient is the view's background image**, which React Native draws, and
 * the background properties are kept for it. Without a gradient they are
 * consumed.
 */
export const line = (resolved: Map<string, Resolution>, rem: number): Line | undefined => {
  const image = resolved.get('background-image')
  const size = resolved.get('background-size')
  const position = resolved.get('background-position')
  const gradient =
    typeof image === 'string' && /^(repeating-linear|linear|radial)-gradient\(/.test(image)
  const colors = typeof image === 'string' ? /^linear-gradient\((.+), (.+)\)$/.exec(image) : null
  const drawn =
    colors !== null && colors[1] === colors[2] && Array.isArray(size) && size.length === 2
  if (drawn || !gradient) {
    for (const property of [
      'background-image',
      'background-position',
      'background-repeat',
      'background-size',
    ]) {
      resolved.delete(property)
    }
  }
  if (!drawn || colors === null || !Array.isArray(size)) {
    return undefined
  }
  const [across, along] = size as Resolution[]
  /* **A line placed by a length runs down from the top or across from the
     left**, as an outline's rule stands in the middle of its rail: the size
     that is `100%` says which, and the position's other value is how far in. */
  if (
    Array.isArray(position) &&
    position.length === 2 &&
    (along === '100%') !== (across === '100%')
  ) {
    const upright = along === '100%'
    const thickness = length(upright ? across : along, rem, rem)
    const inset = length(position[upright ? 0 : 1], rem, rem)
    return typeof thickness === 'number' && typeof inset === 'number' && colors[1] !== undefined
      ? { color: colors[1], edge: upright ? 'left' : 'top', inset, thickness }
      : undefined
  }
  const edge =
    position === 'top' || position === 'left' || position === 'right' ? position : 'bottom'
  const thickness = length(edge === 'bottom' || edge === 'top' ? along : across, rem, rem)
  return typeof thickness === 'number' && colors[1] !== undefined
    ? { color: colors[1], edge, thickness }
    : undefined
}

/** Whether a box's overflow is hidden or clipped on either axis. */
export const clipped = (resolved: ReadonlyMap<string, Resolution>): boolean =>
  ['overflow', 'overflow-x', 'overflow-y'].some((property) => {
    const value = resolved.get(property)
    return value === 'hidden' || value === 'clip'
  })

/**
 * **A box that scrolls is a scroll view**, along the axis its `overflow`
 * names, or both. The overflow properties are consumed either way.
 */
export const overflow = (resolved: Map<string, Resolution>): 'both' | 'x' | 'y' | undefined => {
  const both = resolved.get('overflow')
  const across = resolved.get('overflow-x') ?? both
  const down = resolved.get('overflow-y') ?? both
  for (const property of ['overflow', 'overflow-x', 'overflow-y']) {
    resolved.delete(property)
  }
  const scrolls = (value: Resolution) => value === 'auto' || value === 'scroll'
  if (scrolls(across) && scrolls(down)) {
    return 'both'
  }
  return scrolls(across) ? 'x' : scrolls(down) ? 'y' : undefined
}

/** A scroller's snapping, from its `scroll-snap-type`, which is consumed either way. */
export const snapType = (
  resolved: Map<string, Resolution>,
): 'mandatory' | 'proximity' | undefined => {
  const type = resolved.get('scroll-snap-type')
  resolved.delete('scroll-snap-type')
  const written = Array.isArray(type) ? type.join(' ') : type
  if (typeof written !== 'string' || written === 'none') {
    return undefined
  }
  return written.includes('mandatory') ? 'mandatory' : 'proximity'
}

/** Where a box comes to rest in a scroller that snaps, from its `scroll-snap-align`. */
export const snapAlign = (
  resolved: Map<string, Resolution>,
): 'center' | 'end' | 'start' | undefined => {
  const align = resolved.get('scroll-snap-align')
  resolved.delete('scroll-snap-align')
  return align === 'center' || align === 'end' || align === 'start' ? align : undefined
}

/**
 * What a scroller keeps clear of a snap, as it was written, along the axis it
 * scrolls: `scroll-padding-inline` across and `scroll-padding-block` down. Both
 * are consumed either way.
 */
export const snapPadding = (
  resolved: Map<string, Resolution>,
  axis: 'both' | 'x' | 'y' | undefined,
): Resolution | undefined => {
  const across = resolved.get('scroll-padding-inline')
  const down = resolved.get('scroll-padding-block')
  resolved.delete('scroll-padding-inline')
  resolved.delete('scroll-padding-block')
  return axis === 'y' ? down : across
}

/**
 * What an element does to the counters, from `counter-reset`,
 * `counter-increment`, and `counter-set`, each a name and an amount. The
 * properties are consumed either way; a counter with no amount resets and
 * sets to 0 and increments by 1, as CSS has it.
 */
export const counted = (resolved: Map<string, Resolution>): Counting => {
  const read = (property: string, otherwise: number) => {
    const value = resolved.get(property)
    resolved.delete(property)
    const words = Array.isArray(value) ? value : value === undefined ? [] : [value]
    const out: Record<string, number> = {}
    for (let at = 0; at < words.length; at += 1) {
      const name = words[at]
      if (typeof name !== 'string' || name === 'none') {
        continue
      }
      const next = words[at + 1]
      const amount = typeof next === 'number' ? next : Number.parseFloat(String(next))
      if (Number.isFinite(amount)) {
        out[name] = amount
        at += 1
      } else {
        out[name] = otherwise
      }
    }
    /* A counter whose amount did not resolve, as `var(--list-first)` with
       nothing set, is no counter at all: the declaration is invalid, and CSS
       leaves it out. */
    if (words.length >= 2 && words.some((word) => word === undefined)) {
      return {}
    }
    return out
  }
  return {
    increment: read('counter-increment', 1),
    reset: read('counter-reset', 0),
    set: read('counter-set', 0),
  }
}

/**
 * The marker `display: list-item` draws: the `list-item` counter written in
 * the list style, or a bullet, and nothing under `list-style: none`.
 */
export const markerOf = (
  resolved: Map<string, Resolution>,
  counters: Readonly<Record<string, number>> | undefined,
): string | undefined => {
  const display = resolved.get('display')
  const type = resolved.get('list-style-type') ?? resolved.get('list-style')
  for (const property of ['list-style', 'list-style-position', 'list-style-type']) {
    resolved.delete(property)
  }
  if (display !== 'list-item') {
    return undefined
  }
  resolved.set('display', 'flex')
  if (typeof type !== 'string' || type === 'none') {
    return undefined
  }
  if (type === 'disc') {
    return '\u2022'
  }
  const at = counters?.['list-item']
  return at === undefined ? undefined : `${numeral(at, type)}.`
}

/** A number as a list style writes it. */
export const numeral = (value: number, style: string): string => {
  switch (style) {
    case 'decimal-leading-zero':
      return value < 10 && value > -10
        ? `${value < 0 ? '-' : ''}0${Math.abs(value)}`
        : String(value)
    case 'lower-alpha':
    case 'upper-alpha': {
      let rest = value
      let out = ''
      while (rest > 0) {
        rest -= 1
        out = String.fromCharCode(97 + (rest % 26)) + out
        rest = Math.floor(rest / 26)
      }
      return style === 'upper-alpha' ? out.toUpperCase() : out || String(value)
    }
    case 'lower-roman':
    case 'upper-roman': {
      const marks: readonly (readonly [number, string])[] = [
        [1000, 'm'],
        [900, 'cm'],
        [500, 'd'],
        [400, 'cd'],
        [100, 'c'],
        [90, 'xc'],
        [50, 'l'],
        [40, 'xl'],
        [10, 'x'],
        [9, 'ix'],
        [5, 'v'],
        [4, 'iv'],
        [1, 'i'],
      ]
      let rest = value
      let out = ''
      for (const [amount, mark] of marks) {
        while (rest >= amount) {
          out += mark
          rest -= amount
        }
      }
      return style === 'upper-roman' ? out.toUpperCase() : out || String(value)
    }
    default:
      return String(value)
  }
}

/** Whether a length in a track list is more than nothing, and no share of the grid. */
const sets = (length: string): boolean =>
  !/%/.test(length) && !/^-?0*\.?0*(px|rem|em)?$/i.test(length.trim())

/**
 * Whether a row track list gives a row a length at either end, as
 * `repeat(5, minmax(30rem, auto))` does, which the native grid draws.
 */
const sizesRows = (rows: Resolution | undefined): boolean => {
  const list = typeof rows === 'string' ? trackList(rows) : undefined
  const tracks = [...(list?.before ?? []), ...(list?.repeat?.tracks ?? []), ...(list?.after ?? [])]
  return tracks.some((track) =>
    [track.min, track.max].some((end) => end.kind === 'length' && sets(end.length)),
  )
}

/**
 * **A grid of one track per axis is a flex line.** Tabs over their panels is
 * two rows, and tabs beside them is two columns: a column and a row of views.
 * A grid of one column track is a column of views, unless its only content
 * is one region and its rows have lengths, which the native grid draws.
 *
 * **A grid of more columns whose only content is one region is laid out by
 * the native grid**, where `lays` says so: its view is a column, and its
 * track lists and alignment are what this returns.
 */
export const grid = (resolved: Map<string, Resolution>, lays: boolean): Template | undefined => {
  const template = resolved.get('grid-template-columns')
  const rows = resolved.get('grid-template-rows')
  /* **One column track is a column**, as a card stacks its regions in
     `minmax(0, 1fr)`. */
  const columns = oneColumn(template) && !(lays && sizesRows(rows)) ? undefined : template
  /* Placement is the tree's order in a flex line. */
  for (const property of [
    'grid-column',
    'grid-row',
    'grid-template-columns',
    'grid-template-rows',
  ]) {
    resolved.delete(property)
  }
  if (resolved.get('display') !== 'grid') {
    return undefined
  }
  resolved.set('display', 'flex')
  resolved.set('flex-direction', columns === undefined ? 'column' : 'row')
  const placed = resolved.get('place-items')
  if (placed !== undefined) {
    resolved.delete('place-items')
    const [align, justify = align] = Array.isArray(placed) ? placed : [placed]
    resolved.set('align-items', align)
    resolved.set('justify-items', justify)
  }
  if (lays && typeof columns === 'string') {
    const along = resolved.get('align-items')
    const across = resolved.get('justify-items')
    resolved.delete('align-items')
    resolved.delete('justify-items')
    resolved.set('flex-direction', 'column')
    return {
      ...(typeof along === 'string' ? { alignItems: along } : {}),
      columns,
      ...(typeof across === 'string' ? { justifyItems: across } : {}),
      ...(typeof rows === 'string' && rows !== 'none' ? { rows } : {}),
    }
  }
  /* `justify-items` aligns a column's items across it. */
  const across = resolved.get('justify-items')
  resolved.delete('justify-items')
  if (columns === undefined && across !== undefined && across !== 'normal') {
    resolved.set('align-items-across', across)
  }
  /* `align-items` aligns a grid's items along the block axis, which a
     column's main axis is. */
  const along = resolved.get('align-items')
  if (columns === undefined && along !== undefined) {
    resolved.delete('align-items')
    if (!resolved.has('justify-content')) {
      resolved.set(
        'justify-content',
        along === 'start' ? 'flex-start' : along === 'end' ? 'flex-end' : along,
      )
    }
  }
  const crossed = resolved.get('align-items-across')
  resolved.delete('align-items-across')
  if (crossed !== undefined) {
    resolved.set('align-items', crossed)
  }
  return undefined
}

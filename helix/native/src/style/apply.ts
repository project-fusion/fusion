/** One CSS declaration written into a React Native style. */
import { rounded, termsOf } from './calc.js'
import { fontLonghands } from './font.js'
import { DRAWN } from './properties.js'
import type { Layout, Resolution } from './resolved.js'

const RENAMED: Readonly<Record<string, string>> = {
  'align-items': 'alignItems',
  'align-self': 'alignSelf',
  'background-color': 'backgroundColor',
  'block-size': 'height',
  'border-block-end-color': 'borderBottomColor',
  'border-block-end-width': 'borderBottomWidth',
  'border-block-start-color': 'borderTopColor',
  'border-block-start-width': 'borderTopWidth',
  'border-color': 'borderColor',
  'border-end-end-radius': 'borderBottomEndRadius',
  'border-end-start-radius': 'borderBottomStartRadius',
  'border-inline-end-color': 'borderEndColor',
  'border-inline-end-width': 'borderEndWidth',
  'border-inline-start-color': 'borderStartColor',
  'border-inline-start-width': 'borderStartWidth',
  'border-radius': 'borderRadius',
  'border-start-end-radius': 'borderTopEndRadius',
  'border-start-start-radius': 'borderTopStartRadius',
  /* The physical offsets, which React Native takes as they are. */
  bottom: 'bottom',
  color: 'color',
  'column-gap': 'columnGap',
  'flex-basis': 'flexBasis',
  'flex-direction': 'flexDirection',
  'flex-grow': 'flexGrow',
  'flex-shrink': 'flexShrink',
  'flex-wrap': 'flexWrap',
  'font-size': 'fontSize',
  gap: 'gap',
  'inline-size': 'width',
  'inset-block-end': 'bottom',
  'inset-block-start': 'top',
  'inset-inline-end': 'end',
  'inset-inline-start': 'start',
  'justify-content': 'justifyContent',
  left: 'left',
  margin: 'margin',
  'margin-block-end': 'marginBottom',
  'margin-block-start': 'marginTop',
  'margin-inline-end': 'marginEnd',
  'margin-inline-start': 'marginStart',
  'max-block-size': 'maxHeight',
  'max-inline-size': 'maxWidth',
  'min-block-size': 'minHeight',
  'min-inline-size': 'minWidth',
  opacity: 'opacity',
  'outline-offset': 'outlineOffset',
  padding: 'padding',
  'padding-block': 'paddingVertical',
  'padding-block-end': 'paddingBottom',
  'padding-block-start': 'paddingTop',
  'padding-inline': 'paddingHorizontal',
  'padding-inline-end': 'paddingEnd',
  'padding-inline-start': 'paddingStart',
  position: 'position',
  right: 'right',
  'row-gap': 'rowGap',
  'text-transform': 'textTransform',
  top: 'top',
  'z-index': 'zIndex',
}

/** The corners' own radii, which `border-radius` sets as it is written. */
const CORNERS = [
  'borderBottomEndRadius',
  'borderBottomStartRadius',
  'borderTopEndRadius',
  'borderTopStartRadius',
] as const

const LENGTHS = new Set([
  'block-size',
  'bottom',
  'left',
  'right',
  'top',
  'border-block-end-width',
  'border-block-start-width',
  'border-end-end-radius',
  'border-end-start-radius',
  'border-radius',
  'border-start-end-radius',
  'border-inline-end-width',
  'border-inline-start-width',
  'border-start-start-radius',
  'column-gap',
  'flex-basis',
  'font-size',
  'gap',
  'inline-size',
  'inset-block-end',
  'inset-block-start',
  'inset-inline-end',
  'inset-inline-start',
  'margin',
  'margin-block-end',
  'margin-block-start',
  'margin-inline-end',
  'margin-inline-start',
  'max-block-size',
  'max-inline-size',
  'min-block-size',
  'min-inline-size',
  'outline-offset',
  'padding',
  'padding-block',
  'padding-block-end',
  'padding-block-start',
  'padding-inline',
  'padding-inline-end',
  'padding-inline-start',
  'row-gap',
])

/**
 * What a part's lengths resolve against. A font size, a line height, and a
 * letter spacing take `rem` and `fontSize`, and every other length takes
 * `spaceRem` and `spaceEm`.
 */
export interface Scale {
  /** The part's font size, which an em in its text is. */
  readonly fontSize: number
  /** The font size the part inherits, which an em in its font size is. */
  readonly inherits: number
  readonly rem: number
  /**
   * Whether the box's parent shrinks to its content.
   */
  readonly shrinks: boolean
  /** The part's font size at the space's rem, which an em in any other length is. */
  readonly spaceEm: number
  readonly spaceRem: number
  /**
   * How the box's parent lays it out.
   */
  readonly within: Layout
}

/** The native names of the two ends of a margin or a padding along one axis. */
const AXIS_ENDS: Readonly<Record<string, readonly [string, string]>> = {
  'margin-block': ['marginTop', 'marginBottom'],
  'margin-inline': ['marginStart', 'marginEnd'],
  'padding-block': ['paddingTop', 'paddingBottom'],
  'padding-inline': ['paddingStart', 'paddingEnd'],
}

/** The properties a view reads as a number, and draws as if unset when given words. */
const NUMBERS: ReadonlySet<string> = new Set(['flex-grow', 'flex-shrink', 'opacity'])

/** `value` as a number, a percentage as its share of one, or `undefined` where it is neither. */
const numberOf = (value: Resolution): number | undefined => {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined
  }
  const amount = value.endsWith('%') ? Number(value.slice(0, -1)) / 100 : Number(value)
  return Number.isNaN(amount) ? undefined : amount
}

/** Writes one CSS declaration into a React Native style, or says why it cannot. */
export const apply = (
  out: Record<string, number | string>,
  property: string,
  value: Resolution,
  scale: Scale,
): string | undefined => {
  if (value === undefined) {
    return 'unresolved'
  }
  if (property === 'display') {
    out.display = value === 'none' ? 'none' : value === 'contents' ? 'contents' : 'flex'
    /* **An inline box is as wide as its content, and a view stretches.** A
       React Native view in a column fills the cross axis unless it says
       otherwise, so `inline-flex` keeps the content's width this way. A later
       `display: flex`, as `width="full"` sets, puts the stretch back. Inside
       a flex or grid container a browser makes an inline box a block, so
       there it stretches as any item does. */
    if ((value === 'inline-flex' || value === 'inline-block') && !scale.within.flex) {
      out.alignSelf = 'flex-start'
    } else if (out.alignSelf === 'flex-start') {
      delete out.alignSelf
    }
    return undefined
  }
  /* **A box as long as its container is one that fills it.** A percentage of
     a box sized by its content is circular: a browser sizes the container
     first and a view resolves the percentage against all the room there is.
     So a full length across the container's line stretches, and one along
     it grows, or is the content's own where the container shrinks to its
     content. */
  if ((property === 'inline-size' || property === 'block-size') && value === '100%') {
    const across = (property === 'inline-size') !== scale.within.row
    if (across && (scale.within.flex || property === 'inline-size')) {
      out.alignSelf = 'stretch'
    } else if (scale.within.flex && !scale.shrinks) {
      out.flexGrow = 1
    } else if (!scale.within.flex) {
      out.height = '100%'
    }
    return undefined
  }
  /* The same keeping of the content's width, said of the box itself. */
  if (property === 'inline-size' && value === 'fit-content') {
    out.alignSelf = 'flex-start'
    return undefined
  }
  /* Hidden from a screen reader as well, by the part's view. */
  if (property === 'visibility') {
    if (value === 'hidden') {
      out.opacity = 0
      out.pointerEvents = 'none'
    }
    return undefined
  }
  /* The `font` shorthand is its longhands, each written as it would be. */
  if (property === 'font') {
    const longhands = fontLonghands(value)
    if (longhands === undefined) {
      return 'not a size and a family'
    }
    for (const [longhand, one] of longhands) {
      const why =
        longhand === 'line-height' && one === 'normal'
          ? undefined
          : apply(out, longhand, one, scale)
      if (why !== undefined) {
        return `${longhand}: ${why}`
      }
    }
    return undefined
  }
  /* **`border-radius` sets every corner**, as the shorthand resets its
     longhands in CSS, where React Native lets a corner's own radius win
     over it whatever their order: an icon button whose corners a group
     sets is round under `shape="circle"`. */
  if (property === 'border-radius') {
    for (const corner of CORNERS) {
      delete out[corner]
    }
  }
  /* A transform, a shadow, an edge, a text's lines, a shape's paint, and a
     layout shorthand each have a mapping of their own. */
  const drawn = DRAWN[property]
  if (drawn !== undefined) {
    return drawn(out, value, (each) => length(each, scale.spaceRem, scale.spaceEm))
  }
  /* One to four lengths, clockwise from the top, as CSS reads them. */
  if ((property === 'padding' || property === 'margin') && Array.isArray(value)) {
    const sides = value.map((side) => length(side, scale.spaceRem, scale.spaceEm))
    if (sides.some((side) => side === undefined) || sides.length > 4) {
      return 'not one to four lengths'
    }
    const [top, right = top, bottom = top, left = right] = sides as (number | string)[]
    const prefix = property
    out[`${prefix}Top`] = top as number | string
    out[`${prefix}End`] = right as number | string
    out[`${prefix}Bottom`] = bottom as number | string
    out[`${prefix}Start`] = left as number | string
    return undefined
  }
  /* A margin or a padding along one axis, whose two lengths are its two ends. */
  const ends = AXIS_ENDS[property]
  if (ends !== undefined && (property === 'margin-inline' || Array.isArray(value))) {
    const [start, end = start] = Array.isArray(value) ? value : [value]
    const before = length(start, scale.spaceRem, scale.spaceEm)
    const after = length(end, scale.spaceRem, scale.spaceEm)
    if (before === undefined || after === undefined) {
      return 'not a length'
    }
    out[ends[0]] = before
    out[ends[1]] = after
    return undefined
  }
  if (property === 'font-family') {
    if (typeof value !== 'string') {
      return 'not a family'
    }
    out.fontFamily =
      value
        .split(',')[0]
        ?.trim()
        .replace(/^["']|["']$/g, '') ?? value
    return undefined
  }
  if (property === 'font-weight') {
    out.fontWeight = String(value)
    return undefined
  }
  if (property === 'line-height') {
    /* A length is the line's height, as `calc(0.99em + 0.5rem)` is, and a
       number its multiple of the size. */
    if (typeof value === 'string' && termsOf(value)?.measured === true) {
      const height = length(value, scale.rem, scale.fontSize)
      if (typeof height !== 'number') {
        return 'not a length'
      }
      out.lineHeight = height
      return undefined
    }
    const multiple = typeof value === 'number' ? value : Number(value)
    if (Number.isNaN(multiple)) {
      return 'not a multiple'
    }
    out.lineHeight = Math.round(multiple * scale.fontSize * 100) / 100
    return undefined
  }
  if (property === 'letter-spacing') {
    const spacing = length(value, scale.rem, scale.fontSize)
    if (typeof spacing !== 'number') {
      return value === 'normal' ? undefined : 'not a length'
    }
    out.letterSpacing = spacing
    return undefined
  }
  if (property === 'text-decoration') {
    out.textDecorationLine = value === 'none' ? 'none' : String(value)
    return undefined
  }
  /* A sticky box holds to an edge as its container scrolls, which a view
     cannot; the renderer holds a scroll button to its edge itself. */
  if (
    property === 'position' &&
    value !== 'absolute' &&
    value !== 'relative' &&
    value !== 'static'
  ) {
    return 'no native equivalent yet'
  }
  if (property === 'z-index') {
    const order = Number(value)
    if (Number.isNaN(order)) {
      return 'not a number'
    }
    out.zIndex = order
    return undefined
  }
  /* A box's own `start` and `end` are a flex line's `flex-start` and
     `flex-end`. */
  if (
    (property === 'align-items' || property === 'align-self' || property === 'justify-content') &&
    (value === 'start' || value === 'end')
  ) {
    out[RENAMED[property] ?? property] = value === 'start' ? 'flex-start' : 'flex-end'
    return undefined
  }
  const renamed = RENAMED[property]
  if (renamed === undefined) {
    return 'no native equivalent yet'
  }
  /* **A view takes these as numbers only.** A device ignores `opacity: '0.5'`
     and draws the part whole, though jest renders it happily, and a hook or a
     private property arrives as words whichever way a page writes it. */
  if (NUMBERS.has(property)) {
    const amount = numberOf(value)
    if (amount === undefined) {
      return 'not a number'
    }
    out[renamed] = amount
    return undefined
  }
  if (LENGTHS.has(property)) {
    /* **A font size takes the whole text size, and every other length the
       space's.** */
    const measured =
      property === 'font-size'
        ? length(value, scale.rem, scale.inherits)
        : length(value, scale.spaceRem, scale.spaceEm)
    if (measured === undefined) {
      return 'not a length'
    }
    /* **Past the largest standard size, a height in rems is the least a box
       is**, so the text it holds, which keeps growing, still fits, as iOS's
       own controls grow taller for their text. Up to that size it is a
       height, and a height in points, as a mark's measured one, stays one. */
    const relative = termsOf(value)
    if (
      (property === 'block-size' || property === 'min-block-size') &&
      typeof measured === 'number' &&
      scale.rem > scale.spaceRem &&
      ((relative !== undefined && (relative.rem !== 0 || relative.em !== 0)) ||
        (property === 'min-block-size' && typeof out.minHeight === 'number'))
    ) {
      out.minHeight = Math.max(measured, typeof out.minHeight === 'number' ? out.minHeight : 0)
      return undefined
    }
    /* **Past the largest standard size, a least width in ems follows the
       text**, so the words it is there to hold still fit, as a reading three
       digits wide does, and an entry of a timeline across keeps its words
       whole. */
    if (
      property === 'min-inline-size' &&
      scale.rem > scale.spaceRem &&
      relative !== undefined &&
      relative.em !== 0 &&
      relative.rem === 0
    ) {
      out[renamed] = length(value, scale.rem, scale.fontSize) ?? measured
      return undefined
    }
    out[renamed] = measured
    return undefined
  }
  if (Array.isArray(value)) {
    return 'a list where one value belongs'
  }
  out[renamed] = value as number | string
  return undefined
}

/**
 * A CSS length as React Native takes it: a number of points, a percentage, or
 * `auto`. Each rem in it is `rem` points and each em `em` points, which the
 * property it lands in decides, and a `calc()` adds its terms up.
 */
export const length = (value: Resolution, rem: number, em: number): number | string | undefined => {
  if (value === 'auto' || (typeof value === 'string' && value.endsWith('%'))) {
    return value
  }
  const terms = termsOf(value)
  return terms === undefined ? undefined : rounded(terms.em * em + terms.rem * rem + terms.px, 2)
}

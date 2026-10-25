/**
 * The edges a box draws: its borders and its outline, each a width, a style,
 * and a color, and the shadows it casts.
 */

import { type Mapping, numeric, type Out, type Space, wordsOf } from './mapping.js'
import type { Resolution } from './resolved.js'

/** The line styles CSS draws an edge in, as React Native's three. */
const LINES: Readonly<Record<string, string>> = {
  auto: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
  double: 'solid',
  groove: 'solid',
  inset: 'solid',
  outset: 'solid',
  ridge: 'solid',
  solid: 'solid',
}

/** The widths CSS names. */
const WIDTHS: Readonly<Record<string, number>> = { medium: 3, thick: 5, thin: 1 }

/** An edge's width, style, and color, each where it is written. Nothing where a width is no length. */
const edgeOf = (
  value: Resolution,
  space: Space,
): { color?: string; line?: string; width?: number } | undefined => {
  const out: { color?: string; line?: string; width?: number } = {}
  for (const word of wordsOf(value)) {
    const named = String(word)
    const width = WIDTHS[named] ?? (numeric(word) ? space(word) : undefined)
    if (named in LINES || named === 'none' || named === 'hidden') {
      out.line = named
    } else if (typeof width === 'number') {
      out.width = width
    } else if (numeric(word)) {
      return undefined
    } else {
      out.color = named
    }
  }
  return out
}

/** Writes one side of an edge: no width without a style, and a medium one where it names none. */
const drawSide = (
  out: Out,
  [widthName, styleName, colorName]: readonly [string, string, string],
  { color, line, width = 3 }: { color?: string; line?: string; width?: number },
): void => {
  const style = line === undefined ? undefined : LINES[line]
  out[widthName] = style === undefined ? 0 : width
  if (style !== undefined) {
    out[styleName] = style
  }
  if (color !== undefined) {
    out[colorName] = color
  }
}

/**
 * An edge shorthand: a width, a style, and a color in any order, each
 * optional. **An edge with no style is drawn at no width**, as CSS draws
 * none, and so is `none`, `hidden`, and `0`.
 */
const edge =
  (...sides: readonly (readonly [width: string, style: string, color: string])[]): Mapping =>
  (out, value, space) => {
    const read = edgeOf(value, space)
    if (read === undefined) {
      return 'not a width'
    }
    for (const side of sides) {
      drawSide(out, side, read)
    }
    return undefined
  }

const TOP = ['borderTopWidth', 'borderStyle', 'borderTopColor'] as const
const RIGHT = ['borderRightWidth', 'borderStyle', 'borderRightColor'] as const
const BOTTOM = ['borderBottomWidth', 'borderStyle', 'borderBottomColor'] as const
const LEFT = ['borderLeftWidth', 'borderStyle', 'borderLeftColor'] as const
const START = ['borderStartWidth', 'borderStyle', 'borderStartColor'] as const
const END = ['borderEndWidth', 'borderStyle', 'borderEndColor'] as const

/**
 * One to four lengths, clockwise from the top, as `names` in that order. One
 * length is `whole` where the side has a name for all four, as `borderWidth`.
 */
export const fourSides =
  (names: readonly [string, string, string, string], whole?: string): Mapping =>
  (out, value, space) => {
    const sides = wordsOf(value).map(space)
    if (sides.length === 0 || sides.length > 4 || sides.some((side) => side === undefined)) {
      return 'not one to four lengths'
    }
    if (sides.length === 1 && whole !== undefined) {
      out[whole] = sides[0] as number | string
      return undefined
    }
    const [top, right = top, bottom = top, left = right] = sides as (number | string)[]
    ;[top, right, bottom, left].forEach((side, at) => {
      out[names[at] as string] = side as number | string
    })
    return undefined
  }

/** A shadow list's lengths in points, as React Native's shadow parser reads them. */
const shadowOf = (entry: Resolution, space: Space): string | undefined => {
  const words: string[] = []
  for (const word of wordsOf(entry)) {
    if (numeric(word)) {
      const measured = space(word)
      if (typeof measured !== 'number') {
        return undefined
      }
      words.push(`${measured}px`)
    } else {
      words.push(String(word))
    }
  }
  return words.join(' ')
}

/** Each edge and shadow mapping, by CSS property. */
export const EDGES: Readonly<Record<string, Mapping>> = {
  border: edge(['borderWidth', 'borderStyle', 'borderColor']),
  'border-block': edge(TOP, BOTTOM),
  'border-block-end': edge(BOTTOM),
  'border-block-start': edge(TOP),
  'border-bottom': edge(BOTTOM),
  'border-inline': edge(START, END),
  'border-inline-end': edge(END),
  'border-inline-start': edge(START),
  'border-left': edge(LEFT),
  'border-right': edge(RIGHT),
  'border-style': (out, value) => {
    const [line] = wordsOf(value)
    if (line === 'none' || line === 'hidden') {
      out.borderWidth = 0
    } else if (typeof line === 'string' && line in LINES) {
      out.borderStyle = LINES[line] ?? 'solid'
    }
    return wordsOf(value).length > 1
      ? 'a style for each side has no native equivalent yet'
      : undefined
  },
  'border-top': edge(TOP),
  'border-width': fourSides(
    ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'],
    'borderWidth',
  ),
  'box-shadow': (out, value, space) => {
    if (value === 'none') {
      return undefined
    }
    const entries = Array.isArray(value) && value.some(Array.isArray) ? value : [value]
    const shadows = entries.map((entry) => shadowOf(entry, space))
    if (shadows.some((shadow) => shadow === undefined)) {
      return 'not a shadow'
    }
    out.boxShadow = shadows.join(', ')
    return undefined
  },
  outline: edge(['outlineWidth', 'outlineStyle', 'outlineColor']),
}

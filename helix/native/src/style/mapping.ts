/**
 * What the property mappings share: the shape of a mapping, and the readers
 * of a declaration's words, factors, and lengths.
 */

import type { Resolution } from './resolved.js'

/** The style a mapping writes into. */
export type Out = Record<string, number | string>

/** Resolves a length in a box's space: points, a percentage, or `auto`. */
export type Space = (value: Resolution) => number | string | undefined

/** Writes one declaration into `out`, or says why it cannot. */
export type Mapping = (out: Out, value: Resolution, space: Space) => string | undefined

/** A value's words: `1 1 auto` as three, a lone value as one. */
export const wordsOf = (value: Resolution): (number | string)[] =>
  (Array.isArray(value) ? value : [value]).flatMap((word): (number | string)[] =>
    typeof word === 'number'
      ? [word]
      : typeof word === 'string'
        ? word.split(/\s+(?![^(]*\))/).filter((part) => part !== '')
        : [],
  )

/** `150%` or `1.5` as a factor. */
export const factor = (word: number | string | undefined): number | undefined => {
  if (typeof word === 'number') {
    return word
  }
  const match = typeof word === 'string' ? /^(-?\d*\.?\d+)(%?)$/.exec(word) : null
  return match === null ? undefined : Number(match[1]) / (match[2] === '%' ? 100 : 1)
}

/** Whether a word is a length or a number, which a color or a keyword is not. */
export const numeric = (word: number | string): boolean =>
  typeof word === 'number' || /^(-?\d|-?\.\d|calc\()/.test(word)

/**
 * Words with each length in points, as `px`, for a property React Native
 * parses from CSS text, such as `transformOrigin` and `backgroundSize`.
 * Keywords and percentages stay as they are written.
 */
export const written = (value: Resolution, space: Space): string =>
  wordsOf(value)
    .map((word) => {
      const measured = numeric(word) ? space(word) : word
      return typeof measured === 'number' ? `${measured}px` : String(measured)
    })
    .join(' ')

/** A box's own `start` and `end` as a flex line's. */
export const flexed = (word: number | string | undefined): string | undefined =>
  word === 'start' || word === 'self-start'
    ? 'flex-start'
    : word === 'end' || word === 'self-end'
      ? 'flex-end'
      : word === 'normal' || word === 'auto' || word === undefined
        ? undefined
        : String(word)

/** Writes a length into each of `names`, or says why it cannot. */
export const lengths =
  (...names: readonly string[]): Mapping =>
  (out, value, space) => {
    const [first, second = first] = wordsOf(value)
    const values = names.length === 2 ? [first, second] : [first]
    const measured = values.map(space)
    if (measured.some((each) => each === undefined) || wordsOf(value).length > names.length) {
      return 'not a length'
    }
    names.forEach((name, at) => {
      out[name] = measured[at] as number | string
    })
    return undefined
  }

/** A keyword or a color a paint takes as it is written. */
export const kept =
  (name: string): Mapping =>
  (out, value) => {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return 'not one value'
    }
    out[name] = value
    return undefined
  }

/**
 * The `font` shorthand, split into the longhands a phone draws: its style,
 * its weight, its size, its line height, and its family.
 *
 * **A keyword leaves every longhand unset**, as `inherit`, `initial` and
 * `unset` do on a phone, so the words take what the words around them have.
 * A longhand the shorthand does not name is `normal`, as CSS resets it.
 */
import type { Resolution } from './resolved.js'

/** Each longhand and its value, in the order a browser applies them. */
export type Longhands = readonly (readonly [property: string, value: string])[]

const KEYWORDS = new Set(['inherit', 'initial', 'revert', 'unset'])
const STYLES = new Set(['italic', 'oblique'])
const WEIGHTS = new Set(['bold', 'bolder', 'lighter'])

/** Whether a word is a size: a length, a percentage, or `calc()`, as `1rem` or `14px`. */
const sized = (word: string): boolean => /^(calc\(|-?\d*\.?\d)/.test(word)

/** Whether a sized word carries a unit, which a bare weight before it does not. */
const unitOf = (word: string): boolean =>
  sized(word) && /^calc\(|[a-z%]/.test(word.split('/')[0] ?? '')

/** Where the size stands: the first word with a unit, or else the first number. */
const sizeAt = (words: readonly string[]): number => {
  const unit = words.findIndex(unitOf)
  return unit >= 0 ? unit : words.findIndex(sized)
}

/** The style and the weight the words before the size name. */
const before = (words: readonly string[]): { style: string; weight: string } => {
  const style = words.find((word) => STYLES.has(word)) ?? 'normal'
  const weight = words.find((word) => WEIGHTS.has(word) || /^\d{3}$/.test(word)) ?? 'normal'
  return { style, weight }
}

/** The line height and the family the words from the size on name. */
const after = (
  words: readonly string[],
): { readonly family: string; readonly height: string; readonly size: string } => {
  const [size = '', inline] = (words[0] ?? '').split('/')
  const rest = words.slice(1)
  if (inline !== undefined || !rest[0]?.startsWith('/')) {
    return { family: rest.join(' '), height: inline || 'normal', size }
  }
  const alone = rest[0] === '/'
  const height = (alone ? rest[1] : rest[0].slice(1)) || 'normal'
  return { family: rest.slice(alone ? 2 : 1).join(' '), height, size }
}

/**
 * The longhands `value` sets, or `undefined` where it is no shorthand a
 * phone reads, one with no size or no family.
 */
export const fontLonghands = (value: Resolution): Longhands | undefined => {
  const text = (Array.isArray(value) ? value.join(' ') : String(value)).trim()
  if (KEYWORDS.has(text)) {
    return []
  }
  const words = text.split(/\s+/)
  const at = sizeAt(words)
  const { family, height, size } = after(words.slice(Math.max(at, 0)))
  if (at < 0 || size === '' || family === '') {
    return undefined
  }
  const { style, weight } = before(words.slice(0, at))
  return [
    ['font-style', style],
    ['font-weight', weight],
    ['font-size', size],
    ['line-height', height],
    ['font-family', family],
  ]
}

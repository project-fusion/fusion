import type { kinds as Kinds } from './kinds.generated'

/** One mode's token values, by name after `--helix-`, as the token modules write them. */
export type Tokens = Readonly<Record<string, number | string>>

/** What each token holds, as `kinds.generated.ts` says. */
export type TokenKinds = Readonly<Record<string, (typeof Kinds)[keyof typeof Kinds]>>

/** The platforms a font family is named for. */
export type FontPlatform = 'android' | 'ios'

/** The CSS generic families, and the web's names for the system's own fonts, by what they stand for. */
const GENERIC: Readonly<Record<string, 'mono' | 'sans' | 'serif'>> = {
  '-apple-system': 'sans',
  monospace: 'mono',
  'sans-serif': 'sans',
  serif: 'serif',
  'system-ui': 'sans',
  'ui-monospace': 'mono',
  'ui-sans-serif': 'sans',
  'ui-serif': 'serif',
}

/** What each platform calls its own fonts, as React Native's `fontFamily` takes them. */
const SYSTEM: Readonly<Record<FontPlatform, Readonly<Record<'mono' | 'sans' | 'serif', string>>>> =
  {
    android: { mono: 'monospace', sans: 'sans-serif', serif: 'serif' },
    ios: { mono: 'Menlo', sans: 'System', serif: 'Georgia' },
  }

/**
 * The font a family list draws in on `platform`: its first family, with the
 * generic families and the web's names for the system's fonts named as the
 * platform names them. A family an app loads keeps its own name.
 */
export const familyOn = (list: string, platform: FontPlatform): string => {
  const first =
    list
      .split(',')[0]
      ?.trim()
      .replace(/^["']|["']$/g, '') ?? ''
  const generic = GENERIC[first]
  return generic === undefined ? first : SYSTEM[platform][generic]
}

/** The points a `rem` is at the default text size, as a browser's root font size is 16 pixels. */
export const ROOT = 16

/**
 * The largest of iOS's standard text sizes, as a multiple of the default:
 * React Native's `extraExtraExtraLarge`. **Text grows past it, and nothing
 * else does.** A font size, a line height, and a letter spacing take the
 * reader's whole text size, to 3.571 at the largest of iOS's accessibility
 * sizes. Every other length written in rems stops growing here, as the
 * padding, icons, and heights of iOS's own controls do. Android's standard
 * sizes, 0.85 to 1.3, are all below it, and the larger sizes of Android 14
 * and later, 1.5 to 2, are above it.
 */
export const SPACE_SCALE_LIMIT = 1.353

/** The reader's text size as a length that is no text takes it: the same, up to `SPACE_SCALE_LIMIT`. */
export const spaceScale = (fontScale: number): number => Math.min(fontScale, SPACE_SCALE_LIMIT)

/**
 * Whether a token sets type, by its category, which its name gives: a text
 * size, a line height, or a letter spacing. Those take the reader's whole
 * text size, and every other length stops at `SPACE_SCALE_LIMIT`.
 */
export const setsType = (name: string): boolean => /^(leading|text|tracking)-/.test(name)

/** One term of a length as the token modules write it, such as `0.5rem` or `-0.01em`. */
const TERM = /^(-?\d*\.?\d+)(em|px|rem)$/

/**
 * A length's ems, and the rest of it in points with each rem as `rem` of them:
 * one term, or the terms of a `calc()` that adds and subtracts them. Nothing
 * where it is no length.
 */
const measure = (
  value: string,
  rem: number,
): { readonly em: number; readonly points: number } | undefined => {
  const inner = /^calc\((.*)\)$/.exec(value.trim())?.[1] ?? value
  let em = 0
  let points = 0
  for (const term of inner.replace(/\s-\s+/g, ' + -').split(/\s\+\s+/)) {
    const match = TERM.exec(term.trim())
    if (match === null) {
      return undefined
    }
    const amount = Number(match[1])
    if (match[2] === 'em') {
      em += amount
    } else {
      points += match[2] === 'rem' ? amount * rem : amount
    }
  }
  return { em, points: Math.round(points * 100) / 100 }
}

/**
 * A length with each rem as `rem` points: a number of points, or, where it
 * holds ems, its ems and the rest as points, for the font size where it lands
 * to resolve. A value that is no length passes as it is.
 *
 * **A rem grows with the reader's text size and a point does not**, as a
 * browser's font size setting scales `rem` on the web and leaves `px`.
 */
export const atRoot = (value: number | string, rem: number): number | string => {
  const measured = typeof value === 'number' ? undefined : measure(value, rem)
  if (measured === undefined) {
    return value
  }
  const { em, points } = measured
  if (em === 0) {
    return points
  }
  return points === 0 ? `${em}em` : `calc(${em}em + ${points}px)`
}

/**
 * One mode's tokens at the reader's text size, as an app's own styles take
 * them: each length with its rems as points. **A token that sets type takes a
 * rem of `ROOT * fontScale` points, and every other length takes one of
 * `ROOT * spaceScale(fontScale)`**, which stops growing at
 * `SPACE_SCALE_LIMIT`. A token an app added has no kind, and is read the same
 * way where its value is a length. Everything else is as written.
 */
export const scaledTokens = (tokens: Tokens, kinds: TokenKinds, fontScale: number): Tokens => {
  const out: Record<string, number | string> = {}
  for (const [name, value] of Object.entries(tokens)) {
    const kind = kinds[name]
    const rem = ROOT * (setsType(name) ? fontScale : spaceScale(fontScale))
    out[name] = kind === 'length' || kind === undefined ? atRoot(value, rem) : value
  }
  return out
}

/**
 * One mode's tokens as the renderer reads them, which reads a stylesheet's
 * values: a length in points as `px`, a time in milliseconds as `ms`, and a
 * font family as the platform names it. Everything else is as written.
 *
 * **It takes the tokens as they are written, rems and all.** The renderer
 * resolves a rem where the length lands: at the whole text size in a font
 * size, a line height, or a letter spacing, and at the size that stops at
 * `SPACE_SCALE_LIMIT` in every other length. So a token reads by the property
 * it sets, as `text-md` in a padding stops with the padding. A token with no
 * kind is a token an app added, and passes as it is.
 */
export const drawnTokens = (tokens: Tokens, kinds: TokenKinds, platform: FontPlatform): Tokens => {
  const out: Record<string, number | string> = {}
  for (const [name, value] of Object.entries(tokens)) {
    const kind = kinds[name]
    if (typeof value === 'number' && kind === 'length') {
      out[name] = `${value}px`
    } else if (typeof value === 'number' && kind === 'time') {
      out[name] = `${value}ms`
    } else if (typeof value === 'string' && kind === 'family') {
      out[name] = familyOn(value, platform)
    } else {
      out[name] = value
    }
  }
  return out
}

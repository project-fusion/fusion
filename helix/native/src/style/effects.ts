/**
 * The declarations a view draws as a view of its own around or behind what
 * it holds: a backdrop blur, and a clip that reveals part of the box. Each
 * consumes the property it reads where it can draw it, and leaves any other
 * value to be named as having no native meaning.
 */
import { length } from './apply.js'
import type { Resolution } from './resolved.js'

/** A clip by inset from each edge of the box: points, or a percentage of the box's own size. */
export interface Clip {
  readonly bottom: number | string
  readonly left: number | string
  /** The radius of the clip's corners, as `inset(... round 8px)` writes it. */
  readonly radius?: number
  readonly right: number | string
  readonly top: number | string
}

/** A length a clip or a blur takes, in points or as a percentage, or nothing where it is neither. */
const measure = (written: string, rem: number): number | string | undefined => {
  if (written.endsWith('%')) {
    return written
  }
  const bare = Number(written)
  if (Number.isFinite(bare) && written.trim() !== '') {
    return bare
  }
  const measured = length(written, rem, rem)
  return typeof measured === 'number' ? measured : undefined
}

/**
 * The radius of a part's backdrop blur, in points, from `backdrop-filter:
 * blur(16px)`, which a phone draws through expo-blur behind what the part
 * holds. **The blur of a list of filters is drawn alone**, as the theme's
 * `blur(16px) saturate(1.5)` is blurred and not saturated, since a phone's
 * blur takes no other filter. `none` blurs nothing. Both are consumed, and a
 * list with no blur is left to be named.
 */
export const blurOf = (resolved: Map<string, Resolution>, rem: number): number | undefined => {
  const written = resolved.get('backdrop-filter')
  if (written === 'none') {
    resolved.delete('backdrop-filter')
    return undefined
  }
  const words = Array.isArray(written) ? written.join(' ') : written
  const found = typeof words === 'string' ? /(?:^|\s)blur\(\s*([^)]*)\)/.exec(words.trim()) : null
  const radius = found?.[1] === undefined ? undefined : measure(found[1].trim(), rem)
  if (typeof radius !== 'number') {
    return undefined
  }
  resolved.delete('backdrop-filter')
  return radius > 0 ? radius : undefined
}

/**
 * A part's clip, from `clip-path: inset(top right bottom left round radius)`,
 * which CSS writes with one to four insets, clockwise from the top. `none`
 * clips nothing. Both are consumed, and any other shape is left to be named.
 */
export const clipOf = (resolved: Map<string, Resolution>, rem: number): Clip | undefined => {
  const written = resolved.get('clip-path')
  if (written === 'none') {
    resolved.delete('clip-path')
    return undefined
  }
  const found = typeof written === 'string' ? /^inset\((.*)\)$/.exec(written.trim()) : null
  if (found?.[1] === undefined) {
    return undefined
  }
  const [insets = '', round] = found[1].split(/\s+round\s+/)
  const sides = insets
    .trim()
    .split(/\s+/)
    .map((one) => measure(one, rem))
  const radius = round === undefined ? undefined : measure(round.trim(), rem)
  if (
    sides.length === 0 ||
    sides.length > 4 ||
    sides.some((side) => side === undefined) ||
    (round !== undefined && typeof radius !== 'number')
  ) {
    return undefined
  }
  const [top, right = top, bottom = top, left = right] = sides as (number | string)[]
  resolved.delete('clip-path')
  return {
    bottom: bottom ?? 0,
    left: left ?? 0,
    right: right ?? 0,
    top: top ?? 0,
    ...(typeof radius === 'number' ? { radius } : {}),
  }
}

/**
 * Where a clip's edges stand on a box `width` by `height` points, each a
 * share of the box's own size where it is a percentage, as `inset()` reads
 * one: the top and bottom of its height, the left and right of its width.
 */
export const clipEdges = (
  clip: Clip,
  width: number,
  height: number,
): {
  readonly bottom: number
  readonly left: number
  readonly right: number
  readonly top: number
} => {
  const of = (side: number | string, whole: number): number =>
    typeof side === 'number' ? side : (Number.parseFloat(side) / 100) * whole
  return {
    bottom: of(clip.bottom, height),
    left: of(clip.left, width),
    right: of(clip.right, width),
    top: of(clip.top, height),
  }
}

/** Whether a clip reads the box's own size, which a phone measures before it draws the clip. */
export const sized = (clip: Clip): boolean =>
  [clip.top, clip.right, clip.bottom, clip.left].some((side) => typeof side === 'string')

/**
 * The spread past which a shadow with no offset and no blur is a spotlight's
 * scrim, in points: more than any phone's window is long.
 */
export const SPOTLIGHT_SPREAD = 1000

/** A spotlight: the scrim a spread shadow paints around a lit box. */
export interface Spotlight {
  readonly color: string
  readonly spread: number
}

/**
 * The spotlight a `box-shadow` paints, where it is one shadow with no offset
 * and no blur, spread past {@link SPOTLIGHT_SPREAD}, as Tour's
 * `0 0 0 200vmax` dims the whole window around its target.
 */
export const spotlightOf = (shadow: unknown): Spotlight | undefined => {
  /* One shadow: a comma outside a color's parentheses starts another. */
  if (typeof shadow !== 'string' || shadow.replace(/\([^)]*\)/g, '').includes(',')) {
    return undefined
  }
  const found = /^0(?:px)? 0(?:px)? 0(?:px)? (\d+(?:\.\d+)?)px (.+)$/.exec(shadow.trim())
  const spread = Number(found?.[1])
  return found?.[2] !== undefined && spread >= SPOTLIGHT_SPREAD
    ? { color: found[2], spread }
    : undefined
}

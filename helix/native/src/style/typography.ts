/**
 * How a box's text is drawn beyond its font and size: its style, its
 * variants, its alignment, and how it breaks and limits its lines.
 *
 * **Some style keys are a text's props.** `numberOfLines`, `ellipsizeMode`,
 * `textBreakStrategy`, and `lineBreakStrategyIOS` are props of React
 * Native's `Text`, and the renderer's text takes them out of its style, so
 * they inherit as `white-space` and `text-wrap` do.
 */

import { type Mapping, type Out, wordsOf } from './mapping.js'

/** The variants of a text each `font-variant-*` property sets, which React Native takes as one list. */
const VARIANTS: Readonly<Record<string, readonly string[]>> = {
  caps: ['small-caps'],
  ligatures: [
    'common-ligatures',
    'contextual',
    'discretionary-ligatures',
    'historical-ligatures',
    'no-common-ligatures',
    'no-contextual',
    'no-discretionary-ligatures',
    'no-historical-ligatures',
  ],
  numeric: ['lining-nums', 'oldstyle-nums', 'proportional-nums', 'tabular-nums'],
}

/** Writes `added` into the text's variants in place of what `groups` set before. */
const vary = (out: Out, groups: readonly string[], added: readonly string[]): void => {
  const owned = groups.flatMap((group) => VARIANTS[group] ?? [])
  const kept = String(out.fontVariant ?? '')
    .split(' ')
    .filter((word) => word !== '' && !owned.includes(word) && !added.includes(word))
  const all = [...kept, ...added]
  if (all.length === 0) {
    delete out.fontVariant
  } else {
    out.fontVariant = all.join(' ')
  }
}

/** A `font-variant-*` property, or `font-variant` across `groups`. */
const variant =
  (...groups: readonly string[]): Mapping =>
  (out, value) => {
    const words = wordsOf(value).map(String)
    const ligaturesOff = words.includes('none') && groups.includes('ligatures')
    const known = groups.flatMap((group) => VARIANTS[group] ?? [])
    const added = ligaturesOff
      ? ['no-common-ligatures', 'no-contextual']
      : words.filter((word) => known.includes(word))
    vary(out, groups, added)
    const unknown = words.filter(
      (word) => !known.includes(word) && word !== 'normal' && word !== 'none',
    )
    return unknown.length === 0 ? undefined : `${unknown.join(' ')} has no native equivalent yet`
  }

/** The OpenType features `font-feature-settings` names, as the variant React Native draws, on and off. */
const FEATURES: Readonly<Record<string, readonly [on: string, off?: string]>> = {
  calt: ['contextual', 'no-contextual'],
  dlig: ['discretionary-ligatures', 'no-discretionary-ligatures'],
  hlig: ['historical-ligatures', 'no-historical-ligatures'],
  liga: ['common-ligatures', 'no-common-ligatures'],
  lnum: ['lining-nums'],
  onum: ['oldstyle-nums'],
  pnum: ['proportional-nums'],
  smcp: ['small-caps'],
  tnum: ['tabular-nums'],
}

/** `"tnum" 1, "liga" 0` as the variants React Native draws. */
const features: Mapping = (out, value) => {
  const written = (Array.isArray(value) ? value.flat(2) : [value]).map(String).join(' ')
  if (written === 'normal') {
    return undefined
  }
  const unknown: string[] = []
  for (const [, tag = '', setting] of written.matchAll(/["']([\w]{4})["']\s*(on|off|\d+)?/g)) {
    const on = setting === undefined || setting === 'on' || Number(setting) > 0
    const drawn = FEATURES[tag]?.[on ? 0 : 1]
    if (drawn === undefined) {
      unknown.push(tag)
    } else {
      vary(out, [], [drawn])
    }
  }
  return unknown.length === 0 ? undefined : `${unknown.join(', ')} have no native equivalent yet`
}

/**
 * Lines of text: `numberOfLines`, where 0 is no limit, with an ellipsis where
 * `ellipsis` asks for one. A limit clips otherwise, as the renderer's text
 * draws it.
 */
const lines = (out: Out, count: number, ellipsis: boolean): void => {
  out.numberOfLines = count
  if (ellipsis) {
    out.ellipsizeMode = 'tail'
  }
}

/** How a text breaks its lines, as `text-wrap-style` names it. */
const breaks: Mapping = (out, value) => {
  if (value === 'balance' || value === 'pretty') {
    out.textBreakStrategy = value === 'balance' ? 'balanced' : 'highQuality'
    out.lineBreakStrategyIOS = 'standard'
  } else if (value === 'auto' || value === 'stable') {
    out.textBreakStrategy = 'simple'
    out.lineBreakStrategyIOS = 'none'
  }
  return undefined
}

/** Whether a text wraps, as `text-wrap-mode` names it. */
const wraps: Mapping = (out, value) => {
  if (value === 'nowrap') {
    lines(out, 1, false)
  } else if (value === 'wrap') {
    out.numberOfLines = 0
  }
  return undefined
}

/** Each text mapping, by CSS property. */
export const TYPOGRAPHY: Readonly<Record<string, Mapping>> = {
  '-webkit-line-clamp': (out, value) => {
    const count = Number(value)
    lines(out, Number.isFinite(count) ? count : 0, Number.isFinite(count))
    return undefined
  },
  'font-feature-settings': features,
  'font-style': (out, value) => {
    out.fontStyle = value === 'italic' || String(value).startsWith('oblique') ? 'italic' : 'normal'
    return undefined
  },
  'font-variant': variant('caps', 'ligatures', 'numeric'),
  'font-variant-caps': variant('caps'),
  'font-variant-ligatures': variant('ligatures'),
  'font-variant-numeric': variant('numeric'),
  'line-clamp': (out, value) => {
    const count = Number(value)
    lines(out, Number.isFinite(count) ? count : 0, Number.isFinite(count))
    return undefined
  },
  'text-align': (out, value) => {
    /* React Native draws `left` on the right, and `right` on the left, in a
       right-to-left layout, so a start and an end are those two. */
    out.textAlign = value === 'start' ? 'left' : value === 'end' ? 'right' : String(value)
    return value === 'match-parent' ? 'no native equivalent yet' : undefined
  },
  'text-overflow': (out, value) => {
    out.ellipsizeMode = value === 'ellipsis' ? 'tail' : 'clip'
    return undefined
  },
  'text-wrap': (out, value, space) => {
    for (const word of wordsOf(value)) {
      ;(word === 'nowrap' || word === 'wrap' ? wraps : breaks)(out, word, space)
    }
    return undefined
  },
  'text-wrap-mode': wraps,
  'text-wrap-style': breaks,
  'white-space': (out, value) => {
    if (value === 'nowrap') {
      lines(out, 1, false)
      return undefined
    }
    if (value === 'pre') {
      return 'no native equivalent yet'
    }
    out.numberOfLines = 0
    return undefined
  },
}

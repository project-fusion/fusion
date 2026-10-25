/** Lengths as terms of each unit, and the arithmetic `calc()` does with them. */
import type * as Form from '../ir.generated.js'
import type { Viewport } from './context.js'
import type { Resolution } from './resolved.js'

/**
 * A length as an amount of each unit: `calc(0.99em + 0.5rem)` is 0.99 ems
 * and half a rem. `measured` is whether any of it had a unit, which a bare
 * number does not. Nothing where it is no length, such as a percentage.
 */
export interface Terms {
  readonly em: number
  readonly measured: boolean
  readonly px: number
  readonly rem: number
}

/** One term of a length: an amount, and its unit where it has one. */
const TERM = /^(-?\d*\.?\d+)(px|rem|em)?$/

/** A length in characters or in lines, which `style` writes in ems or as the line height. */
export const LINED = /^(-?\d*\.?\d+)(ch|lh)$/

/** A length's terms: a number, one term such as `0.5rem`, or a `calc()` that adds and subtracts them. */
export const termsOf = (value: Resolution): Terms | undefined => {
  if (typeof value === 'number') {
    return { em: 0, measured: false, px: value, rem: 0 }
  }
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  /* **A time is its milliseconds**, as the theme's duration tokens are, so
     `calc(var(--helix-duration-slow) * 3)` times an icon's spin. */
  const time = /^(-?\d*\.?\d+)(m?s)$/.exec(trimmed)
  if (time !== null) {
    const amount = Number(time[1]) * (time[2] === 's' ? 1000 : 1)
    return { em: 0, measured: false, px: amount, rem: 0 }
  }
  const inner = /^calc\((.*)\)$/.exec(trimmed)?.[1]
  const written =
    inner === undefined ? [trimmed] : inner.replace(/\s-\s+/g, ' + -').split(/\s\+\s+/)
  const sum = { em: 0, measured: inner !== undefined, px: 0, rem: 0 }
  for (const term of written) {
    const match = TERM.exec(term.trim())
    if (match === null) {
      return undefined
    }
    const amount = Number(match[1])
    const unit = (match[2] ?? 'px') as 'em' | 'px' | 'rem'
    sum[unit] += amount
    sum.measured ||= match[2] !== undefined
  }
  return sum
}

/**
 * `dividend` over `divisor` where each is an amount of one unit, the same
 * one, and the divisor is not zero. Nothing otherwise: a sum of units has no
 * ratio until it is laid out.
 */
const ratioOf = (dividend: Terms, divisor: Terms): number | undefined => {
  const units = (['em', 'px', 'rem'] as const).filter(
    (unit) => dividend[unit] !== 0 || divisor[unit] !== 0,
  )
  const [unit] = units
  if (units.length !== 1 || unit === undefined || divisor[unit] === 0) {
    return undefined
  }
  return dividend[unit] / divisor[unit]
}

/** `amount` rounded to `places` decimal places. */
export const rounded = (amount: number, places: number): number =>
  Math.round(amount * 10 ** places) / 10 ** places

/** Terms written as a length: `12px`, `0.5rem`, or a `calc()` of the units it holds. */
const written = ({ em, px, rem }: Terms): string => {
  const parts = [
    ...(em === 0 ? [] : [`${rounded(em, 4)}em`]),
    ...(rem === 0 ? [] : [`${rounded(rem, 4)}rem`]),
    ...(px === 0 && (em !== 0 || rem !== 0) ? [] : [`${rounded(px, 2)}px`]),
  ]
  return parts.length === 1 ? (parts[0] ?? '0px') : `calc(${parts.join(' + ')})`
}

/** A percentage as a number of per cent, `-18%` as -18, or `undefined`. */
const percentOf = (value: Resolution): number | undefined => {
  const match = typeof value === 'string' ? /^(-?\d*\.?\d+)%$/.exec(value.trim()) : null
  return match === null ? undefined : Number(match[1])
}

/**
 * Arithmetic with a percentage in it, which only what the percentage is of
 * can finish: **a share scaled or divided by a number is a share**, as a
 * keyframe's `calc(-18% * var(--way))` is `-18%`, and **a share and points
 * added are left as `calc(50% + -4px)`**, which a shape's geometry resolves
 * against its vector's box. `undefined` where no operand is a percentage, or
 * the rest are not numbers and points.
 */
export const percentCalc = (
  op: Form.Op,
  operands: readonly Resolution[],
  points: (length: Resolution) => number | string | undefined,
): Resolution => {
  if (!operands.some((one) => percentOf(one) !== undefined)) {
    return undefined
  }
  if (op === '*' || op === '/') {
    /* A share times numbers, in either order, or a share over numbers. */
    const at = op === '*' ? operands.findIndex((one) => percentOf(one) !== undefined) : 0
    const share = percentOf(operands[at])
    const by = operands
      .filter((_, index) => index !== at)
      .map((one) => (typeof one === 'number' ? one : Number(one)))
    if (
      share === undefined ||
      by.some((one) => !Number.isFinite(one) || (op === '/' && one === 0))
    ) {
      return undefined
    }
    const scaled = by.reduce((total, one) => (op === '*' ? total * one : total / one), share)
    return `${rounded(scaled, 4)}%`
  }
  let percent = 0
  let sum = 0
  for (const [at, one] of operands.entries()) {
    const sign = at > 0 && op === '-' ? -1 : 1
    const share = percentOf(one)
    const measured = share === undefined ? points(one) : undefined
    if (share !== undefined) {
      percent += sign * share
    } else if (typeof measured === 'number') {
      sum += sign * measured
    } else {
      return undefined
    }
  }
  return sum === 0
    ? `${rounded(percent, 4)}%`
    : `calc(${rounded(percent, 4)}% + ${rounded(sum, 2)}px)`
}

/**
 * Arithmetic between lengths, as `calc()` does it. An operand that did not
 * resolve, a product of two lengths, or a quotient by a length or by zero
 * leaves it unresolved, and a percentage is what `percentCalc` makes of it.
 *
 * **A sum keeps each unit apart**, as `calc(0.99em + 0.5rem)`, because a rem
 * and an em resolve by the property the length lands in: a rem in a line
 * height follows the whole text size, and one in a padding stops at the
 * largest standard size. `length()` adds them up where the length lands.
 */
export const calc = (op: Form.Op, operands: readonly Resolution[]): Resolution => {
  const terms = operands.map(termsOf)
  if (!terms.every((each): each is Terms => each !== undefined)) {
    return undefined
  }
  const [first, ...rest] = terms
  if (first === undefined) {
    return undefined
  }
  let total: Terms = first
  for (const each of rest) {
    if (op === '/') {
      /* **A length over a length of the same unit is a ratio**, as CSS's
         typed arithmetic has it: `text-sm / text-md` is a number, which a
         code fragment's size multiplies by an em. */
      const ratio = each.measured ? ratioOf(total, each) : undefined
      if (ratio !== undefined) {
        total = { em: 0, measured: false, px: ratio, rem: 0 }
        continue
      }
      if (each.measured || each.px === 0) {
        return undefined
      }
      total = {
        em: total.em / each.px,
        measured: total.measured,
        px: total.px / each.px,
        rem: total.rem / each.px,
      }
    } else if (op === '*') {
      if (total.measured && each.measured) {
        return undefined
      }
      const [sized, by] = total.measured ? [total, each.px] : [each, total.px]
      total = {
        em: sized.em * by,
        measured: sized.measured,
        px: sized.px * by,
        rem: sized.rem * by,
      }
    } else {
      const sign = op === '-' ? -1 : 1
      total = {
        em: total.em + sign * each.em,
        measured: total.measured || each.measured,
        px: total.px + sign * each.px,
        rem: total.rem + sign * each.rem,
      }
    }
  }
  /* A length in, a length out: `calc(1rem * 1.5)` is a length, where a bare
     number would be a line height's multiple. */
  return total.measured ? written(total) : rounded(total.px, 2)
}

/** A length in the viewport's units: an amount, its height's kind, and its unit. */
const VIEWPORT = /^(-?\d*\.?\d+)(d|l|s)?(vw|vh|vi|vb|vmin|vmax)$/

/**
 * A viewport length, such as `100dvh`, in points of the window a layer is
 * placed in, or `undefined` where `resolved` is none or no window is given.
 * **The dynamic height is the window less the software keyboard** where the
 * layer host keeps layers above it, and the small and large heights are the
 * whole window, since an app has no browser bars that come and go. The
 * inline and block units are the width and the height, as text runs across.
 */
export const viewported = (
  resolved: Resolution,
  viewport: Viewport | undefined,
): number | undefined => {
  const match = typeof resolved === 'string' ? VIEWPORT.exec(resolved.trim()) : null
  if (match === null || viewport === undefined) {
    return undefined
  }
  const height = match[2] === 'd' ? viewport.height : viewport.tall
  const across: Readonly<Record<string, number>> = {
    vb: height,
    vh: height,
    vi: viewport.width,
    vmax: Math.max(viewport.width, height),
    vmin: Math.min(viewport.width, height),
    vw: viewport.width,
  }
  return rounded((Number(match[1]) * (across[match[3] ?? 'vw'] ?? 0)) / 100, 2)
}

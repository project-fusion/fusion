/**
 * A rating's arithmetic: the scale its `min`, `max`, and `step` make, the
 * score a value is drawn at, the steps a reader picks among, the step a
 * point along the row stands over, and where a key takes the choice. The
 * web's Rating reads its own options back from the page, and a phone's
 * scale machine works the same rules out here.
 */

import { nearest } from '../nearest/nearest.js'

/** A rating's scale: how many marks, its floor, and the steps along it. */
export interface RatingScale {
  /** The lowest score the row offers, `min` held between 0 and `max`. */
  readonly floor: number
  /** How many marks the row draws, `max` rounded. */
  readonly marks: number
  /** How many marks there are, the highest score. */
  readonly max: number
  /** Every score the row can show, from `step` up to `max`, in order. */
  readonly positions: readonly number[]
  /** The scores a reader picks among: the positions not below the floor. */
  readonly steps: readonly number[]
}

/** A number a prop holds, written or as text, where it holds one. */
const numberIn = (value: unknown): number | undefined => {
  const read = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof read === 'number' && Number.isFinite(read) ? read : undefined
}

/**
 * The scale a rating's `min`, `max`, and `step` make, as the web element
 * reads them: 5 marks and a step of 1 where a prop is no number, and a
 * floor of `min` held between 0 and `max`. Each position is a multiple of
 * the step, to two decimals, so a half step lands on 0.5, 1, 1.5.
 */
export const ratingScale = (min: unknown, max: unknown, step: unknown): RatingScale => {
  const top = numberIn(max) ?? 5
  const by = numberIn(step) ?? 1
  const each = by > 0 ? by : 1
  const low = numberIn(min) ?? 0
  const floor = Math.min(Math.max(low, 0), Math.max(top, 0))
  const count = Math.max(1, Math.round(top / each))
  const positions = Array.from({ length: count }, (_, index) =>
    Number(((index + 1) * each).toFixed(2)),
  )
  return {
    floor,
    marks: Math.max(0, Math.round(top)),
    max: top,
    positions,
    steps: positions.filter((score) => score >= floor),
  }
}

/** Whether a value is a score a reader gave: words that read as a number. */
export const ratingAnswered = (value: string): boolean =>
  value !== '' && Number.isFinite(Number.parseFloat(value))

/**
 * The score a value is drawn at: the number it reads as, held between the
 * floor and `max`, or the floor where it reads as none, as an unrated row
 * draws `min` filled.
 */
export const ratingScore = (value: string, scale: RatingScale): number => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, scale.floor), scale.max) : scale.floor
}

/**
 * The step the choice stands on, which the keys move from: the step nearest
 * the score where a reader gave one, as a score of 3.4 on whole marks stands
 * on 3, and the first step where none is given.
 */
export const ratingStop = (value: string, scale: RatingScale): number | undefined => {
  const first = scale.steps[0]
  return ratingAnswered(value) ? (nearest(scale.steps, ratingScore(value, scale)) ?? first) : first
}

/**
 * The step under a point `fraction` along the row, 0 at its start and 1 at
 * its end: each position takes an even share of the row, and a point over
 * a position below the floor takes the first step, the nearest a reader can
 * press. `undefined` where the row offers no step.
 */
export const ratingAt = (fraction: number, scale: RatingScale): number | undefined => {
  const { positions, steps } = scale
  const at = Math.min(
    positions.length,
    Math.max(1, Math.ceil(Math.min(1, Math.max(0, fraction)) * positions.length)),
  )
  const score = positions[at - 1]
  return score !== undefined && score >= scale.floor ? score : steps[0]
}

/**
 * Where a key takes the choice from the step `from`, as the web's radio
 * group moves it: Right and Down to the next step, Left and Up to the one
 * before, Left and Right swapped on a right-to-left page, and Home and End
 * to the first and the last. The row does not wrap, so a key past an end
 * stays on it. `undefined` for a key that moves nothing.
 */
export const ratingKeyed = (
  key: string,
  from: number | undefined,
  scale: RatingScale,
  rtl: boolean,
): number | undefined => {
  const { steps } = scale
  if (steps.length === 0) {
    return undefined
  }
  const at = from === undefined ? -1 : steps.indexOf(from)
  const forward = key === 'ArrowDown' || key === (rtl ? 'ArrowLeft' : 'ArrowRight')
  const back = key === 'ArrowUp' || key === (rtl ? 'ArrowRight' : 'ArrowLeft')
  if (forward) {
    return steps[at < 0 ? 0 : Math.min(at + 1, steps.length - 1)]
  }
  if (back) {
    return steps[at < 0 ? steps.length - 1 : Math.max(at - 1, 0)]
  }
  if (key === 'Home') {
    return steps[0]
  }
  if (key === 'End') {
    return steps[steps.length - 1]
  }
  return undefined
}

/** How many marks a score fills whole, and how much of the next, 0 to 1. */
export const ratingFill = (score: number): { readonly full: number; readonly part: number } => {
  const full = Math.floor(score)
  return { full, part: score - full }
}

import type { Mounted } from './web-left.js'

/*
 * Moving an element's `<input type="range">`, as the web half of a
 * conformance scenario performs it: a drag that lets go at a point of the
 * track, a screen reader's step, and the keys a range takes. **A script's
 * event moves no range**, so each sets the range's value where the browser
 * would and sends what the browser sends.
 */

/** Whether `at` is a range a reader moves. */
const isRange = (at: unknown): at is HTMLInputElement =>
  at instanceof HTMLInputElement && at.type === 'range'

/** The element's range, inside its shadow root. */
const rangeOf = (mounted: Mounted): HTMLInputElement | undefined => {
  const found = mounted.root.shadowRoot?.querySelector('[part~="control"]')
  return isRange(found) ? found : undefined
}

/** A range's bounds and step, as it reads its attributes. */
const boundsOf = (range: HTMLInputElement) => {
  const number = (text: string, otherwise: number): number => {
    const read = Number.parseFloat(text)
    return Number.isFinite(read) ? read : otherwise
  }
  return {
    max: number(range.max, 100),
    min: number(range.min, 0),
    step: number(range.step, 1),
  }
}

/**
 * Writes `value` into the range, which holds it to its bounds and its step,
 * and sends `input`, and `change` where `commits` and the value moved from
 * `from`, as a browser does as a reader's move stands.
 */
const move = (range: HTMLInputElement, value: number, commits: 'always' | 'moved'): void => {
  const from = range.value
  range.value = String(value)
  if (range.value === from) {
    return
  }
  range.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  /* The element puts back a move it refused, so the value moved only where it still differs. */
  if (commits === 'always' || range.value !== from) {
    range.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

/**
 * Drags the range to `to`, a fraction of its track from its start, and lets
 * go: the value there, `input`, and `change` where the value moved, as a
 * browser commits a drag as it lets go. **A disabled range takes no drag.**
 */
export const slide = (mounted: Mounted, to: number): void => {
  const range = rangeOf(mounted)
  if (range === undefined || range.disabled) {
    return
  }
  const { max, min } = boundsOf(range)
  move(range, min + Math.min(1, Math.max(0, to)) * (max - min), 'moved')
}

/**
 * A screen reader's step up or down, as a browser takes an assistive
 * technology's increment and decrement on a range: one step, `input`, and
 * `change`.
 */
export const adjust = (mounted: Mounted, by: -1 | 1): void => {
  const range = rangeOf(mounted)
  if (range === undefined || range.disabled) {
    return
  }
  const { step } = boundsOf(range)
  move(range, Number(range.value) + by * (step > 0 ? step : 1), 'always')
}

/**
 * What a key does to a range that has focus where nothing took it first, as
 * Chromium moves one: an arrow by a step, up and right up, Page Up and Page
 * Down by a tenth of the track or a step where that is more, and Home and
 * End to the ends, then `input` and `change`.
 */
export const rangeKey = (at: Element, key: string): void => {
  if (!isRange(at) || at.disabled) {
    return
  }
  const { max, min, step } = boundsOf(at)
  const by = step > 0 ? step : 1
  const big = Math.max((max - min) / 10, by)
  const value = Number(at.value)
  const to: Readonly<Record<string, number>> = {
    ArrowDown: value - by,
    ArrowLeft: value - by,
    ArrowRight: value + by,
    ArrowUp: value + by,
    End: max,
    Home: min,
    PageDown: value - big,
    PageUp: value + big,
  }
  const next = to[key]
  if (next !== undefined) {
    move(at, next, 'always')
  }
}

import type { Mounted } from './web-left.js'

/*
 * Moving an element's `<input type="range">`, as the web half of a
 * conformance scenario performs it: a drag that lets go at a point of the
 * track, a screen reader's step, and the keys a range takes. **A script's
 * event moves no range**, so each sets the range's value where the browser
 * would and sends what the browser sends. An element that draws a row of
 * `marks` in place of a range, as a rating, takes a finger's press on the
 * row instead.
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

/** A frame of the page, so what a component schedules for the next one has run. */
const frame = (): Promise<void> =>
  new Promise((done) => requestAnimationFrame(() => setTimeout(done, 0)))

/**
 * A finger's press on the element's row of `marks` at `to`, a fraction of
 * the row from its start, as a reader taps a rating's star: the pointer
 * down, a frame, the pointer up there, and the click the target under it
 * gets, which a disabled control in the way gets none of.
 */
const pressMarks = async (marks: Element, to: number): Promise<void> => {
  const box = marks.getBoundingClientRect()
  const along = Math.min(1, Math.max(0, to)) * box.width
  const x = getComputedStyle(marks).direction === 'rtl' ? box.right - along : box.left + along
  const y = box.top + box.height / 2
  const base = { bubbles: true, cancelable: true, clientX: x, clientY: y, composed: true }
  const pointer = { ...base, button: 0, isPrimary: true, pointerId: 2, pointerType: 'touch' }
  const root = marks.getRootNode() as Document | ShadowRoot
  const under = root.elementsFromPoint(x, y).find((one) => marks.contains(one)) ?? marks
  under.dispatchEvent(new PointerEvent('pointerdown', { ...pointer, buttons: 1 }))
  await frame()
  under.dispatchEvent(new PointerEvent('pointerup', pointer))
  if (!(under instanceof HTMLButtonElement && under.disabled)) {
    under.dispatchEvent(new PointerEvent('click', { ...pointer, detail: 1 }))
  }
}

/**
 * Drags the range to `to`, a fraction of its track from its start, and lets
 * go: the value there, `input`, and `change` where the value moved, as a
 * browser commits a drag as it lets go. **A disabled range takes no drag.**
 * A row of `marks` is pressed at `to`.
 */
export const slide = async (mounted: Mounted, to: number): Promise<void> => {
  const range = rangeOf(mounted)
  if (range === undefined) {
    const marks = mounted.root.shadowRoot?.querySelector('[part~="marks"]')
    if (marks !== null && marks !== undefined) {
      await pressMarks(marks, to)
    }
    return
  }
  if (range.disabled) {
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

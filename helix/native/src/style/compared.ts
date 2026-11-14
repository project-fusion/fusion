/**
 * The CSS functions that compare or round lengths, which a native view
 * resolves where every argument is a length in points, and leaves as words
 * otherwise. `round()` takes a value and a step, and a tie goes up, as CSS has
 * it.
 */
export const COMPARED: Readonly<Record<string, (...lengths: number[]) => number>> = {
  max: Math.max,
  min: Math.min,
  round: (value = 0, step = 1) => Math.round(value / step) * step,
}

/**
 * `round()`'s strategies, a first argument before the value and the step:
 * `round(down, 13px, 2px)` is 12 and `round(up, 19.5px, 2px)` is 20.
 */
export const ROUNDED: Readonly<Record<string, (value?: number, step?: number) => number>> = {
  down: (value = 0, step = 1) => Math.floor(value / step) * step,
  nearest: (value = 0, step = 1) => Math.round(value / step) * step,
  'to-zero': (value = 0, step = 1) => Math.trunc(value / step) * step,
  up: (value = 0, step = 1) => Math.ceil(value / step) * step,
}

/**
 * What the runtime's styles hand the native grid and the cells in it: a
 * grid's gaps, a cell's placement, and a basis worked out against a measured
 * width.
 */
import type { Op } from '../../ir.generated'
import type { GridForm, Placing, Resolution } from '../resolved'

/** A grid's track lists and how its cells align, before its gaps are resolved. */
export type Template = Omit<GridForm, 'columnGap' | 'rowGap'>

/**
 * A grid's template with its gaps, in points, taken off the part's own
 * style: the native grid draws them between its cells.
 */
export const gapped = (template: Template, out: Record<string, number | string>): GridForm => {
  const gap = typeof out.gap === 'number' ? out.gap : 0
  const columnGap = typeof out.columnGap === 'number' ? out.columnGap : gap
  const rowGap = typeof out.rowGap === 'number' ? out.rowGap : gap
  delete out.gap
  delete out.columnGap
  delete out.rowGap
  return { ...template, columnGap, rowGap }
}

/** A placement's value as `grid-column` writes it, or nothing. */
const written = (value: Resolution): string | undefined => {
  if (typeof value === 'number') {
    return String(value)
  }
  return Array.isArray(value) ? value.join(' ') : typeof value === 'string' ? value : undefined
}

/** Where a cell goes in a grid, as its `grid-column` and `grid-row` write it, where either does. */
export const placing = (resolved: ReadonlyMap<string, Resolution>): Placing | undefined => {
  const column = written(resolved.get('grid-column'))
  const row = written(resolved.get('grid-row'))
  if (column === undefined && row === undefined) {
    return undefined
  }
  return { ...(column === undefined ? {} : { column }), ...(row === undefined ? {} : { row }) }
}

/** Whether a value is a percentage. */
const percent = (one: Resolution): boolean => typeof one === 'string' && one.trim().endsWith('%')

/** `first` and `second` under `op`. */
const OPS: Readonly<Record<Op, (first: number, second: number) => number>> = {
  '-': (first, second) => first - second,
  '*': (first, second) => first * second,
  '/': (first, second) => first / second,
  '+': (first, second) => first + second,
}

/**
 * Arithmetic in which a percentage is of `across` points, worked out to
 * points, or nothing where no operand is a percentage or one is no length.
 * `measure` gives any other operand in points.
 *
 * **A length against a measured width is a threshold**, as a switch's
 * `--flex-switch-at` is, so the runtime measures its rems at the reader's
 * whole text size, as a width condition's.
 */
export const measuredCalc = (
  op: Op,
  operands: readonly Resolution[],
  across: number,
  measure: (value: Resolution) => number | string | undefined,
): number | undefined => {
  if (!operands.some(percent)) {
    return undefined
  }
  const points = operands.map((one) => {
    const share = percent(one) ? Number(String(one).trim().slice(0, -1)) : undefined
    const measured = share === undefined ? measure(one) : (share * across) / 100
    return typeof measured === 'number' && !Number.isNaN(measured) ? measured : undefined
  })
  if (points.some((one) => one === undefined)) {
    return undefined
  }
  const [first = 0, ...rest] = points as number[]
  const total = rest.reduce((sum, one) => OPS[op](sum, one), first)
  return Number.isFinite(total) ? Math.round(total * 100) / 100 : undefined
}

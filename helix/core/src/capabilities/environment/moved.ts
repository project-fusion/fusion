import type { Conditions, Insets } from '../types.generated.js'

/** The safe area of a window with nothing to keep clear of. */
export const NO_INSETS: Readonly<Insets> = { bottom: 0, left: 0, right: 0, top: 0 }

/**
 * Whether two values of one condition are the same: equal, or objects with
 * the same fields at the same values, as two reads of the window's size are.
 */
const same = (now: unknown, was: unknown): boolean => {
  if (now === was) {
    return true
  }
  if (typeof now !== 'object' || now === null || typeof was !== 'object' || was === null) {
    return false
  }
  const fields = Object.keys(now)
  return (
    fields.length === Object.keys(was).length &&
    fields.every(
      (field) =>
        (now as Record<string, unknown>)[field] === (was as Record<string, unknown>)[field],
    )
  )
}

/**
 * Whether any condition `now` names differs in `was`. **A size or a safe
 * area is compared by its fields**, so a read that makes a new object with
 * the same numbers has not moved.
 */
export const conditionsMoved = (now: Partial<Conditions>, was: Conditions): boolean =>
  (Object.keys(now) as (keyof Conditions)[]).some((key) => !same(now[key], was[key]))

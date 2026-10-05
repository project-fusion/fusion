/** What linear mode reads of a step. */
export interface ReachableStep {
  /** Whether the stage is finished. */
  complete: boolean
  /** Whether a reader may pass the stage without finishing it. */
  optional: boolean
}

/**
 * Whether a reader on step `from` may go to step `to`, in a linear sequence.
 *
 * Back is always allowed, as Ark UI's linear steps allow it. Forward is allowed
 * only where every stage from the one the reader is on up to the target is
 * complete or optional, so no stage is passed unfinished.
 */
export const canReach = (steps: readonly ReachableStep[], from: number, to: number): boolean => {
  if (to <= from) {
    return true
  }
  for (let at = Math.max(from, 0); at < to; at += 1) {
    const step = steps[at]
    if (step && !step.complete && !step.optional) {
      return false
    }
  }
  return true
}

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
 *
 * `passing` is a sequence whose stages are complete once a reader moves past
 * them, so the stage the reader is on counts as finished and the next one is
 * in reach.
 */
export const canReach = (
  steps: readonly ReachableStep[],
  from: number,
  to: number,
  passing = false,
): boolean => {
  if (to <= from) {
    return true
  }
  for (let at = Math.max(passing ? from + 1 : from, 0); at < to; at += 1) {
    const step = steps[at]
    if (step && !step.complete && !step.optional) {
      return false
    }
  }
  return true
}

/**
 * How far through a sequence is, from 0 to 100: the share of its stages that
 * are complete, rounded to a whole number. An empty sequence is at 0.
 */
export const progressOf = (steps: readonly Pick<ReachableStep, 'complete'>[]): number =>
  steps.length === 0
    ? 0
    : Math.round((steps.filter((step) => step.complete).length / steps.length) * 100)

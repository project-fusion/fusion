/**
 * The step a score stands at: the step itself, or for a score between steps,
 * such as an average of 3.4 on whole marks, the nearest one. Halfway between
 * two goes to the lower, so a score is never read as more than it is.
 * `undefined` for a row with no steps.
 */
export const nearestStep = (steps: readonly number[], score: number): number | undefined => {
  let nearest: number | undefined
  for (const step of steps) {
    if (nearest === undefined || Math.abs(step - score) < Math.abs(nearest - score)) {
      nearest = step
    }
  }
  return nearest
}

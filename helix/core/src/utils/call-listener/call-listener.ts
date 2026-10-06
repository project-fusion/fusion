/**
 * What the three diagnostics slots share: a listener on `globalThis` under a
 * registered symbol, called where there is one, whose failure is printed once.
 *
 * `reportRuntime`, `reportUsage` and `reportRender` each wrote this out, with
 * a flag and a sentence of its own, and every element carries all three. Kept
 * as one function, the sentence is one template and the flags one set.
 */

/** The kinds of listener whose failure has been printed, so each prints once. */
const told = new Set<string>()

/**
 * Calls the function in `slot` with `args`, and answers what it returned.
 *
 * **A listener that throws never breaks the caller.** The error is printed
 * once per `kind`, saying what happened instead (`after`), and the answer is
 * `undefined`, as it is where nothing listens.
 */
export const callListener = (
  slot: symbol,
  kind: string,
  after: string,
  ...args: unknown[]
): unknown => {
  const listener = (globalThis as Record<symbol, unknown>)[slot]
  if (typeof listener !== 'function') {
    return undefined
  }
  try {
    return listener(...args)
  } catch (error) {
    if (!told.has(kind)) {
      told.add(kind)
      console.error(
        `helix: a ${kind} listener threw, and ${after}. Later failures are not printed.`,
        error,
      )
    }
    return undefined
  }
}

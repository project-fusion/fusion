import type { OpenLink } from './contract.generated.js'

/** An open-link capability that keeps each destination it is asked to follow, for a spec. */
export interface FakeOpenLink extends OpenLink {
  /** Every destination followed, in order. */
  readonly opened: readonly string[]
}

/** A fake that keeps each destination it is asked to follow, and goes nowhere. */
export const fakeOpenLink = (): FakeOpenLink => {
  const opened: string[] = []
  return {
    open: (destination) => {
      opened.push(destination)
    },
    opened,
  }
}

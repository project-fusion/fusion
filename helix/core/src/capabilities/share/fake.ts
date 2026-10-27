import type { Shareable, Shared } from '../types.generated.js'
import type { Share } from './contract.generated.js'

/** A share capability that keeps each item it is handed, for a spec to read. */
export interface FakeShare extends Share {
  /** What the next shares give, as a reader who shares, closes the sheet, or has none would. */
  answer: Shared
  /** Every item handed to the sheet, in order. */
  readonly shared: readonly Shareable[]
}

/** A fake that keeps each item it is handed, and gives its `answer`, `shared` unless told otherwise. */
export const fakeShare = (): FakeShare => {
  const shared: Shareable[] = []
  const fake: FakeShare = {
    answer: 'shared',
    share: (item) => {
      shared.push(item)
      return Promise.resolve(fake.answer)
    },
    shared,
  }
  return fake
}

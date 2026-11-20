import type { Clipboard } from './contract.generated.js'

/** A clipboard capability that keeps each text it is asked to write, for a spec to read. */
export interface FakeClipboard extends Clipboard {
  /** Every text written, in order. */
  readonly written: readonly string[]
  /** Whether the next writes are refused, as a platform without permission refuses them. */
  refuses: boolean
}

/** A fake that keeps each text it writes, and gives `false` while it `refuses`. */
export const fakeClipboard = (): FakeClipboard => {
  const written: string[] = []
  const fake: FakeClipboard = {
    refuses: false,
    write: (text) => {
      if (fake.refuses) {
        return Promise.resolve(false)
      }
      written.push(text)
      return Promise.resolve(true)
    },
    written,
  }
  return fake
}

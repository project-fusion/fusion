import type { Urgency } from '../types.generated.js'
import type { Announce } from './contract.generated.js'

/** One message, as it was said. */
export interface Said {
  readonly message: string
  readonly urgency: Urgency
}

/** An announce capability that keeps what it is asked to say, for a spec to read. */
export interface FakeAnnounce extends Announce {
  /** Every message said, in order. */
  readonly said: readonly Said[]
}

/** A fake that keeps each message it is asked to say. */
export const fakeAnnounce = (): FakeAnnounce => {
  const said: Said[] = []
  return {
    said,
    say: (message, urgency) => {
      said.push({ message, urgency })
    },
  }
}

import type { Picked } from '../types.generated.js'
import type { Camera } from './contract.generated.js'

/** One request a fake camera heard: a photo taken, or photos chosen from the library. */
export type CameraAsk =
  | { readonly kind: 'capture' }
  | { readonly kind: 'choose'; readonly multiple: boolean }

/** A camera capability that keeps each request, and answers with what a spec sets. */
export interface FakeCamera extends Camera {
  /** Every request, in order. */
  readonly asked: readonly CameraAsk[]
  /** What the next requests give. Nothing is taken until a spec sets it. */
  next: Picked
}

/** A fake that keeps each request and gives `next` for it. */
export const fakeCamera = (): FakeCamera => {
  const asked: CameraAsk[] = []
  const fake: FakeCamera = {
    asked,
    capture: () => {
      asked.push({ kind: 'capture' })
      return Promise.resolve(fake.next)
    },
    choose: (multiple) => {
      asked.push({ kind: 'choose', multiple })
      return Promise.resolve(fake.next)
    },
    next: { files: [], outcome: 'dismissed' },
  }
  return fake
}

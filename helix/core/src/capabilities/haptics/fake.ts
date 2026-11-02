import type { Haptic } from '../types.generated.js'
import type { Haptics } from './contract.generated.js'

/** A haptics capability that keeps each touch it is asked to play, for a spec to read. */
export interface FakeHaptics extends Haptics {
  /** Every touch played, in order. */
  readonly played: readonly Haptic[]
}

/** A fake that keeps each touch it is asked to play. */
export const fakeHaptics = (): FakeHaptics => {
  const played: Haptic[] = []
  return {
    play: (kind) => {
      played.push(kind)
    },
    played,
  }
}

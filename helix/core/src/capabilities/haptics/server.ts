import type { Haptics } from './contract.generated.js'

/** Plays nothing: a server has no device to play a touch on. */
export const serverHaptics: Haptics = {
  play: () => undefined,
}

import type { Announce } from './contract.generated.js'

/** Says nothing: a server has no reader to hear it. */
export const serverAnnounce: Announce = {
  say: () => undefined,
}

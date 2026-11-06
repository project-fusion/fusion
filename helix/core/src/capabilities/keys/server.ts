import type { Keys } from './contract.generated.js'

/** Hears nothing: a server has no keyboard to press. */
export const serverKeys: Keys<unknown> = {
  listen: () => () => undefined,
  listenAnywhere: () => () => undefined,
}

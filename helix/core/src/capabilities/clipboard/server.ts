import type { Clipboard } from './contract.generated.js'

/** Writes nothing: a server has no clipboard, so every write gives `false`. */
export const serverClipboard: Clipboard = {
  write: () => Promise.resolve(false),
}

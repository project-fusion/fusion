import type { Files } from './contract.generated.js'

/** Picks and saves nothing: a server has no file chooser, so every request is `unavailable`. */
export const serverFiles: Files = {
  pick: () => Promise.resolve({ files: [], outcome: 'unavailable' }),
  save: () => Promise.resolve('unavailable'),
}

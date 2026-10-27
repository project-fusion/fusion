import type { Share } from './contract.generated.js'

/** Shares nothing: a server has no share sheet, so every share is `unavailable`. */
export const serverShare: Share = {
  share: () => Promise.resolve('unavailable'),
}

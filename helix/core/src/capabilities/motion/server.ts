import type { Motion } from './contract.generated.js'

/**
 * Draws nothing, and a glide arrives at once and calls back: a server draws no
 * frame to move a part through, so a machine waiting on a glide moves on.
 */
export const serverMotion: Motion<unknown> = {
  glide: (_node, _to, _transition, done) => {
    done()
    return () => undefined
  },
  place: () => undefined,
}

import type { Camera } from './contract.generated.js'

/** Takes nothing: a server has no camera or photo library, so every request is `unavailable`. */
export const serverCamera: Camera = {
  capture: () => Promise.resolve({ files: [], outcome: 'unavailable' }),
  choose: () => Promise.resolve({ files: [], outcome: 'unavailable' }),
}

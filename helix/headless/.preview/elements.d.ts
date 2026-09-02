/**
 * The element typings, brought in the way a consumer brings them.
 *
 * As a module rather than by path, because `jsx.d.ts` carries
 * `declare module "react"` and an augmentation only applies when the file
 * declaring it is loaded as one. `fusion/site` takes them the same way.
 */
import '@fusion.dev/helix-headless/jsx'

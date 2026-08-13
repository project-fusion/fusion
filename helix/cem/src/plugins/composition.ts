import type { HelixContext, HelixManifest, Plugin } from '../types.js'
import { eachComponent } from '../types.js'

const pascal = (value: string): string =>
  value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

/**
 * Derives a component's composition group and part from its module path.
 *
 * The directory is the group and the file is the part, with the file matching
 * its directory being `Root`:
 *
 *   src/card/card.ts          -> Card.Root
 *   src/card/card-header.ts   -> Card.Header
 *   src/scroll-area/index.ts  -> ScrollArea.Root
 *
 * Deriving this from the tag name instead is ambiguous in exactly the cases
 * that matter: `helix-scroll-area` is one component, `helix-card-header` is
 * part of another, and nothing in either name distinguishes them. The directory
 * already encodes the author's intent, so it is the honest source.
 *
 * Recording it in the manifest rather than recomputing it in each generator
 * means the React wrappers, the docs site, and anything else agree on what
 * belongs together, and a regrouping shows up as a manifest diff.
 */
export const composition = (): Plugin => ({
  name: 'helix-composition',
  packageLinkPhase({ context, customElementsManifest }) {
    for (const { declaration, module } of eachComponent(
      customElementsManifest as HelixManifest,
      context as HelixContext,
    )) {
      const path = module.path ?? ''
      const match = /(?:^|\/)src\/([^/]+)\/([^/]+)\.[jt]s$/.exec(path)
      if (!match) {
        continue
      }

      const [, directory, file] = match
      if (!directory || !file) {
        continue
      }

      const isRoot = file === directory || file === 'index'
      const suffix = file.startsWith(`${directory}-`) ? file.slice(directory.length + 1) : file

      declaration.helix = {
        ...declaration.helix,
        group: pascal(directory),
        part: isRoot ? 'Root' : pascal(suffix),
      }
    }
  },
})

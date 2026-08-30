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
 * Each part owns a folder, so the two directory levels above the file are the
 * group and the part:
 *
 *   src/card/root/card-root.ts       -> Card.Root
 *   src/tree/item/tree-item.ts       -> Tree.Item
 *   src/scroll-area/root/…           -> ScrollArea.Root
 *
 * Deriving this from the tag name instead is ambiguous in exactly the cases
 * that matter: `helix-scroll-area` is one component, `helix-tree-item` is part
 * of another, and nothing in either name distinguishes them. Folders already
 * encode the author's intent, so they are the honest source.
 *
 * Recording it in the manifest rather than recomputing it in each generator
 * means the docs site and anything else reading the manifest agree on what
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
      const match = /(?:^|\/)src\/([^/]+)\/([^/]+)\/[^/]+\.[jt]s$/.exec(path)
      if (!match) {
        continue
      }

      const [, directory, partDir] = match
      if (!directory || !partDir) {
        continue
      }

      // The headless tier is a parallel family, not a variant of the styled
      // one, so it namespaces as `BaseCard.Root` alongside `Card.Root`. A
      // `CardBase` suffix would sort the two apart and read as an
      // implementation detail rather than a supported entry point.
      const prefix = declaration.helix?.tier === 'headless' ? 'Base' : ''

      declaration.helix = {
        ...declaration.helix,
        group: `${prefix}${pascal(directory)}`,
        part: pascal(partDir),
      }
    }
  },
})

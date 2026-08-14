import type { Plugin } from '../types.js'

/** A manifest module, with only the field the ordering reads. */
interface OrderedModule {
  path?: string
}

/**
 * Sorts the manifest's modules by path.
 *
 * The analyzer emits modules in the order its globs resolved, which is
 * filesystem order and not stable between runs. Two analyses of an unchanged
 * tree produce the same modules in different positions, so `custom-elements.json`
 * and every file generated from it rewrite with thousands of lines of moved
 * content and no change to what they mean.
 *
 * That has two costs. Every commit carries the churn, which buries the real
 * change. And the site reads the manifest, so the dev server recompiles each
 * time one is written, whether or not anything about it differs.
 *
 * Runs before the JSX generator, which walks the modules in order, so the
 * declarations it emits are stable for the same reason.
 */
export const stableOrder = (): Plugin => ({
  name: 'helix-stable-order',
  packageLinkPhase({ customElementsManifest }) {
    const manifest = customElementsManifest as { modules?: OrderedModule[] }
    if (!Array.isArray(manifest.modules)) {
      return
    }
    manifest.modules.sort((left, right) => (left.path ?? '').localeCompare(right.path ?? ''))
  },
})

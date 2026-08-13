import type { HelixContext, HelixManifest, HelixMetadata, Plugin } from '../types.js'
import { eachComponent } from '../types.js'
/**
 * Stamps every Helix component with the design-system tier it belongs to.
 *
 * Downstream consumers need this and cannot infer it: the React wrapper
 * generator wraps only the styled tier (wrapping headless would ship unstyled
 * components under the same names), and the docs site labels the two
 * differently. Recording it in the manifest keeps that knowledge in one place
 * rather than duplicated as a path heuristic in every generator.
 */
export const helixTier = (tier: NonNullable<HelixMetadata['tier']>): Plugin => ({
  name: 'helix-tier',
  packageLinkPhase({ context, customElementsManifest }) {
    for (const { declaration } of eachComponent(
      customElementsManifest as HelixManifest,
      context as HelixContext,
    )) {
      declaration.helix = { ...declaration.helix, tier }
    }
  },
})

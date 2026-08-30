import type { HelixContext, HelixManifest, HelixMetadata, Plugin } from '../types.js'
import { eachComponent } from '../types.js'
/**
 * Stamps every Helix component with the design-system tier it belongs to.
 *
 * Downstream consumers need this and cannot infer it: `helix-composition`
 * namespaces the headless tier as `BaseCard.Root`, and the docs site renders a
 * family's reference page from both tiers and hides one behind a preference.
 * Recording it in the manifest keeps that knowledge in one place rather than
 * duplicated as a path heuristic in every generator.
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

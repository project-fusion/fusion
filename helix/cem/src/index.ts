import type { Config } from '@custom-elements-manifest/analyzer'
import { type ConventionLintOptions, conventionLint } from './plugins/convention-lint.js'
import { declaredEvents } from './plugins/declared-events.js'
import { helixTier } from './plugins/helix-tier.js'
import { reactEvents } from './plugins/react-events.js'
import type { HelixMetadata, Plugin } from './types.js'

export interface HelixCemOptions {
  /** Globs to analyze. Defaults to the package's own source. */
  globs?: string[]
  /** Passed through to the convention linter. Pass `false` to skip it. */
  lint?: ConventionLintOptions | false
  /** Extra plugins, appended after the Helix set. */
  plugins?: Plugin[]
  /** Which design-system tier this package ships. */
  tier: NonNullable<HelixMetadata['tier']>
}

/**
 * Builds the analyzer config for a Helix package.
 *
 * Every package that ships custom elements uses this rather than configuring
 * the analyzer itself, so that a new plugin is added once here instead of
 * being copied into each package and drifting.
 */
export const createHelixCemConfig = ({
  globs = ['src/**/*.ts'],
  lint = {},
  plugins = [],
  tier,
}: HelixCemOptions): Config => {
  const helixPlugins: Plugin[] = [
    helixTier(tier),
    // Must precede the linter: it validates declared events, not inferred ones.
    declaredEvents(),
    reactEvents(),
    ...(lint === false ? [] : [conventionLint(lint)]),
    ...plugins,
  ]

  return {
    // Teaches the analyzer to read Lit's `@property`, `@customElement`, and
    // friends. Without it every decorated field is invisible to the manifest.
    // Pulls in dependencies' manifests so applyInheritancePlugin can resolve
    // members, events, slots, and parts inherited across package boundaries,
    // stamping each with `inheritedFrom`.
    dependencies: true,
    exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
    globs,
    litelement: true,
    outdir: '.',
    packagejson: true,
    // Upstream types `plugins` as `Array<() => unknown>`, but the runtime
    // destructures hooks straight off each element
    // (`mergedPlugins.forEach(({ name, initialize }) => ...)` in
    // analyzer/src/create.js), so it wants plugin *objects*. The analyzer's own
    // example config passes objects too. Cast at this one boundary rather than
    // shipping factories the analyzer would never call.
    plugins: helixPlugins as unknown as NonNullable<Config['plugins']>,
  }
}

export { toReactProp } from './plugins/react-events.js'
export type {
  HelixContext,
  HelixDeclaration,
  HelixEvent,
  HelixManifest,
  HelixMetadata,
  Plugin,
  Violation,
} from './types.js'
export {
  COMPONENT_ROOT,
  classIndex,
  descendsFrom,
  eachComponent,
  isCustomElement,
} from './types.js'
export type { ConventionLintOptions }
export { conventionLint, declaredEvents, helixTier, reactEvents }

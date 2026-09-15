import type { Config } from '@custom-elements-manifest/analyzer'
import { jsxTypesPlugin } from '@wc-toolkit/jsx-types'
import { vuejsTypesPlugin } from '@wc-toolkit/vuejs-types'
import { borrowedStyles } from './plugins/borrowed-styles.js'
import { composition } from './plugins/composition.js'
import { type ConventionLintOptions, conventionLint } from './plugins/convention-lint.js'
import { declaredEvents } from './plugins/declared-events.js'
import { examples } from './plugins/examples.js'
import { helixTier } from './plugins/helix-tier.js'
import { jsxDeclaredEvents } from './plugins/jsx-declared-events.js'
import { jsxImports } from './plugins/jsx-imports.js'
import { jsxNativeEvents } from './plugins/jsx-native-events.js'
import { jsxNumericAttributes } from './plugins/jsx-numeric-attributes.js'
import { jsxOptionalUndefined } from './plugins/jsx-optional-undefined.js'
import { jsxReactRef } from './plugins/jsx-react-ref.js'
import { metadata } from './plugins/metadata.js'
import { reactEvents } from './plugins/react-events.js'
import { references } from './plugins/references.js'
import { source } from './plugins/source.js'
import { stableOrder } from './plugins/stable-order.js'
import { svelteTypes } from './plugins/svelte-types.js'
import type { HelixMetadata, Plugin } from './types.js'

export interface HelixCemOptions {
  /**
   * Emit type declarations for the package's elements, per framework.
   *
   * Without them a custom element accepts any attribute, so
   * `appearance="wrong"` passes silently. Generated from the same manifest
   * everything else reads: `jsx.d.ts` by `@wc-toolkit/jsx-types` for the whole
   * JSX family, and `vue.d.ts` by `@wc-toolkit/vuejs-types` for Vue templates,
   * which are not JSX and augment a different interface.
   */
  frameworkTypes?: boolean

  /**
   * Package the element classes are imported from in generated JSX types.
   *
   * Without it the generator emits raw source paths like
   * `src/card/root/card-root.ts`, which resolve for nobody downstream.
   */
  packageName?: string

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
 * Where the framework typings land.
 *
 * A directory rather than the package root, which held six generated files and
 * four hand-written ones. It sits beside `css/` and `dist/`, the three of them
 * being what `files` publishes, and the name says what is in it: a `shared/`
 * wrapper over both only collided with `src/shared`, which is the source
 * families share and is a different thing entirely.
 *
 * `exports` is what a consumer reads: `@fusion.dev/helix/jsx` still resolves.
 */
const TYPES = 'types'

/**
 * Builds the analyzer config for a Helix package.
 *
 * Every package that ships custom elements uses this rather than configuring
 * the analyzer itself, so that a new plugin is added once here instead of
 * being copied into each package and drifting.
 *
 * **Each package names its config on the command line and must keep doing so.**
 * The file is `cem.config.ts`, and the analyzer discovers
 * `custom-elements-manifest.config.*` and nothing else, so an `analyze` script
 * that loses its `--config` runs with the analyzer's defaults rather than
 * failing: a manifest is still written, with none of the plugins below in it,
 * and every tier, part, example and source path silently disappears from the
 * docs built on top of it.
 */
export const createHelixCemConfig = ({
  globs = ['src/**/*.ts'],
  frameworkTypes = false,
  lint = {},
  packageName,
  plugins = [],
  tier,
}: HelixCemOptions): Config => {
  const helixPlugins: Plugin[] = [
    helixTier(tier),
    composition(),
    metadata(),
    // Both after `composition`, which is what decides a declaration is the
    // family's root: examples and a source path hang off the root rather than
    // off every part.
    examples(),
    source(),
    // Must precede the linter: it validates declared events, not inferred ones.
    declaredEvents(),
    references(),
    /* After the analyzer has filled every declaration's own `cssProperties`,
       since it copies them across, and before `stableOrder` so what it appends
       is ordered with everything else. */
    borrowedStyles(),
    reactEvents(),
    ...(lint === false ? [] : [conventionLint(lint)]),
    // Before the JSX generator, which walks modules in order, so both the
    // manifest and the declarations generated from it land in a stable order.
    stableOrder(),
    ...(frameworkTypes
      ? [
          jsxTypesPlugin({
            fileName: 'jsx.d.ts',
            ...(packageName ? { globalTypePath: packageName } : {}),
            // Standard React handlers and attributes, so `onClick` and
            // `className` typecheck alongside the element's own props.
            includeDefaultDOMEvents: true,
            outdir: TYPES,
            // `event.target` typed as the element rather than EventTarget.
            stronglyTypedEvents: true,
          }) as Plugin,
          // Must follow the generator: it references event types it does not
          // import, and an unresolved name degrades to `any` under skipLibCheck.
          ...(packageName ? [jsxImports({ fileName: `${TYPES}/jsx.d.ts`, packageName })] : []),
          // Also after the generator: its `ref` type is framework-agnostic and
          // rejects the `useRef` every React consumer reaches for.
          jsxReactRef({ fileName: `${TYPES}/jsx.d.ts` }),
          jsxNativeEvents({ fileName: `${TYPES}/jsx.d.ts` }),
          // After it, which is what makes `BaseEvents` generic, and before
          // `jsxOptionalUndefined` so these entries get the same `| undefined`.
          jsxDeclaredEvents({ fileName: `${TYPES}/jsx.d.ts` }),
          /* Vue reads none of the above. Its templates are not JSX, so the
             types augment `GlobalComponents` rather than `IntrinsicElements`,
             and a handler is bound with `@helix-input` rather than a prop. Same
             manifest, same `stronglyTypedEvents`, separate file. */
          vuejsTypesPlugin({
            fileName: 'vue.d.ts',
            ...(packageName ? { globalTypePath: packageName } : {}),
            outdir: TYPES,
            stronglyTypedEvents: true,
          }) as Plugin,
          /* After everything that rewrites the JSX tag map, because it reuses
             the finished one. */
          ...(packageName
            ? [
                svelteTypes({
                  fileName: `${TYPES}/jsx.d.ts`,
                  outFile: `${TYPES}/svelte.d.ts`,
                  packageName,
                }),
              ]
            : []),
          /* After both generators, which type an attribute as its property,
             and before `jsxOptionalUndefined`, so the string form it admits
             is wrapped in the same `| undefined`. */
          jsxNumericAttributes({ fileNames: [`${TYPES}/jsx.d.ts`, `${TYPES}/vue.d.ts`] }),
          /* Last of the generators, because it rewrites what two of them wrote.
             `?: T` is not the same type as `?: T | undefined` under
             `exactOptionalPropertyTypes`, and it is the one a consumer cannot
             forward an optional prop into. */
          jsxOptionalUndefined({ fileNames: [`${TYPES}/jsx.d.ts`, `${TYPES}/vue.d.ts`] }),
        ]
      : []),
    ...plugins,
  ]

  return {
    // Teaches the analyzer to read Lit's `@property`, `@customElement`, and
    // friends. Without it every decorated field is invisible to the manifest.
    // Pulls in dependencies' manifests so applyInheritancePlugin can resolve
    // members, events, slots, and parts inherited across package boundaries,
    // stamping each with `inheritedFrom`.
    dependencies: true,
    /* **A generated module is not read, because it is written from this
       manifest.** `element-events.generated.ts` comes out of the manifest
       after `analyze`, so read here it put an empty module in the manifest
       only when a build had already run: two manifests for one source, and
       every task hashing `src/**` after it a cache miss. Measured on CI 15 Sep
       2026, 81 seconds of `analyze` rebuilding what `build` had just built. */
    exclude: ['src/**/*.spec.ts', 'src/**/*.d.ts', 'src/**/*.generated.ts'],
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
  Documented,
  HelixAttribute,
  HelixContext,
  HelixCssProperty,
  HelixDeclaration,
  HelixEvent,
  HelixManifest,
  HelixMember,
  HelixMetadata,
  HelixModule,
  InheritedFrom,
  Plugin,
  TypeText,
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
export {
  borrowedStyles,
  composition,
  conventionLint,
  declaredEvents,
  examples,
  helixTier,
  jsxDeclaredEvents,
  jsxImports,
  jsxNativeEvents,
  jsxNumericAttributes,
  jsxOptionalUndefined,
  metadata,
  reactEvents,
  references,
  source,
  svelteTypes,
}

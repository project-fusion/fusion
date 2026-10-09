import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { lintOf, type ManifestSource } from '@fusion.dev/helix-diagnostics'
import { jsxTypesPlugin } from '@wc-toolkit/jsx-types'
import { vuejsTypesPlugin } from '@wc-toolkit/vuejs-types'
import { catalog, type ExampleSource } from './catalog.js'
import { jsxBaseProps } from './plugins/jsx-base-props.js'
import { jsxDeclaredEvents } from './plugins/jsx-declared-events.js'
import { jsxImports } from './plugins/jsx-imports.js'
import { jsxNativeEvents } from './plugins/jsx-native-events.js'
import { jsxNumericAttributes } from './plugins/jsx-numeric-attributes.js'
import { jsxOptionalUndefined } from './plugins/jsx-optional-undefined.js'
import { jsxReactRef } from './plugins/jsx-react-ref.js'
import { svelteTypes } from './plugins/svelte-types.js'
import { wordsTypes } from './plugins/words-types.js'
import type { HelixContext, HelixManifest, HelixMetadata, Plugin } from './types.js'

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

  /**
   * The documentation pages the package ships as an agent skill, relative to
   * the package, written to `skills/helix/SKILL.md`.
   *
   * **In the package, so the guide is the installed version's.** An agent
   * reading it from `node_modules` reads what this release does, offline, and
   * nothing is written into the consumer's project unless they point a tool at
   * it. Absent, the package ships no skill.
   */
  skill?: string[]

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

/** The file every consumer reads, and what `analyze` exists to write. */
const MANIFEST = 'custom-elements.json'

/**
 * What `@fusion.dev/helix-diagnostics` reads of the manifest, beside it.
 *
 * **About a seventieth of the manifest**, so a page in development can load
 * the data for exactly the version it runs: measured 4 Oct 2026, 124 KB for
 * the styled tier, 18 KB compressed, against a manifest of 8.6 MB. Derived by
 * diagnostics' own `lintOf`, so what is written here and what diagnostics
 * reads from a full manifest cannot drift apart.
 */
const LINT = 'lint.json'

/**
 * The tier's catalog without its examples: every family with its elements,
 * their properties, events with React props, slots, parts, hooks, states,
 * words, and the import lines. `helix mcp` answers from it, and it is the
 * same `catalog()` the site's family pages are written from, so an agent and a
 * reader see one answer. About a third of the manifest, which repeats every
 * inherited member on every class.
 */
const API = 'api.json'

/** The tier's examples by family, each with the import lines it needs. */
const EXAMPLES = 'examples.json'

/** Where the documentation pages a skill links to are published. */
const DOCS = 'https://fusion.dev/helix/docs'

/**
 * The agent skill, from the documentation pages it names: their bodies under
 * one heading each, their links made absolute, and the package's version in
 * the frontmatter so an agent can tell which release it is reading.
 */
const skillOf = (pages: string[], cwd: string, version: string): string => {
  const sections = pages.map((page) => {
    const text = readFileSync(resolve(cwd, page), 'utf8')
    const body = text.replace(/^---\n[\s\S]*?\n---\n/, '').trim()
    return body.replace(/^(#{1,5}) /gm, '#$1 ').replace(/\]\(\.\/([a-z0-9-]+)\)/g, `](${DOCS}/$1)`)
  })
  return [
    '---',
    'name: helix',
    'description: Writes and checks pages built with Helix, the web components in @fusion.dev/helix. Use when building or reviewing any user interface in a project that installs @fusion.dev/helix, and when code has helix- elements, Helix tokens, or the helix command line.',
    'metadata:',
    `  version: "${version}"`,
    '---',
    '',
    '# Helix',
    '',
    `This guide is for @fusion.dev/helix ${version}, the version installed beside it.`,
    '',
    ...sections.flatMap((section) => [section, '']),
  ].join('\n')
}

/**
 * The environment the baselines were taken in, from the nearest
 * `visual.fingerprint.json` up: the browser, the fonts, the system. A render
 * compared to a baseline is fair only in the same one. `null` where there is
 * none.
 */
const environmentOf = (cwd: string): unknown => {
  let dir = resolve(cwd)
  for (;;) {
    const file = join(dir, 'visual.fingerprint.json')
    if (existsSync(file)) {
      return JSON.parse(readFileSync(file, 'utf8')) as unknown
    }
    const parent = dirname(dir)
    if (parent === dir) {
      return null
    }
    dir = parent
  }
}

/**
 * The example files under `src/<family>/.examples`, as the site reads them:
 * the HTML is the list, and the stylesheet and the TSX beside it are optional.
 */
const examplesOnDisk = (cwd: string): ExampleSource[] => {
  const source = join(cwd, 'src')
  if (!existsSync(source)) {
    return []
  }
  const found: ExampleSource[] = []
  for (const family of readdirSync(source, { withFileTypes: true })) {
    const dir = join(source, family.name, '.examples')
    if (!family.isDirectory() || !existsSync(dir)) {
      continue
    }
    const listed = readdirSync(dir).sort()
    const pictures = listed.filter((file) => file.endsWith('.png'))
    for (const file of listed) {
      if (!file.endsWith('.html')) {
        continue
      }
      const slug = file.replace(/\.html$/, '')
      const read = (name: string): string =>
        existsSync(join(dir, name)) ? readFileSync(join(dir, name), 'utf8').trim() : ''
      found.push({
        css: read(`${slug}.css`),
        family: family.name,
        html: read(file),
        pictures,
        slug,
        tsx: read(`${slug}.tsx`),
      })
    }
  }
  return found
}

/**
 * What runs over the finished manifest, in the order it runs.
 *
 * **One job, where this package used to do three.** It held eighteen plugins
 * for `@custom-elements-manifest/analyzer`, and ten of them built the manifest:
 * a tier, a group and a part, an example, a source path, a reference, a React
 * prop, an order. `helix manifest build` does all of that in Rust now, as
 * ordinary code rather than as plugins, which is why they are gone rather than
 * moved. The linter went the same way, to `helix component`'s `conventions`
 * rule, it being a rule over a finished manifest and nothing else. What is
 * left is the typings generators, which never parsed any TypeScript and so
 * never carried the version pin that the move away from the analyzer ended.
 */
export const afterManifest = ({
  frameworkTypes = false,
  packageName,
}: HelixCemOptions): Plugin[] => [
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
        // Before `jsxNativeEvents`, which rewrites the handler lines it reads.
        jsxBaseProps({ fileName: `${TYPES}/jsx.d.ts` }),
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
        /* What `registerWords` takes for each family, from the word
             properties the manifest marks. */
        wordsTypes({ outFile: `${TYPES}/words.d.ts` }),
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
]

/** Where a dependency is installed, looked for the way node looks for one. */
const installed = (name: string, from: string): string | undefined => {
  for (let at = resolve(from); ; at = dirname(at)) {
    const candidate = join(at, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) {
      return candidate
    }
    if (dirname(at) === at) {
      return undefined
    }
  }
}

/**
 * The manifests this package's manifest is built against, by package name.
 *
 * **Every helix package reachable through `dependencies`, not only the ones
 * named there.** The analyzer collected them by following imports through the
 * dependencies' own files, so Sandbox, which names the styled tier, was given
 * the headless and core manifests beneath it too. The generator resolves
 * inheritance across them, and the output came out byte for byte the analyzer's
 * with this set and with the narrower one a package names.
 *
 * **A package ships one where its `package.json` says `customElements`**, the
 * schema's own field for where a manifest is, which the analyzer read too. Not
 * where the file happens to exist: that depends on what has been built, and a
 * job that ran only the specs found core's manifest and not the styled one
 * beside it. Turbo is what makes sure the file is there by the time it is read,
 * every `analyze` waiting on its dependencies' builds.
 *
 * In the order they are reached, which is the order the analyzer read them in
 * and the order a class name found twice is settled by.
 */
export const dependenciesOf = (cwd: string): Map<string, string> => {
  const found = new Map<string, string>()
  const visit = (from: string): void => {
    const pkg = JSON.parse(readFileSync(join(from, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }
    for (const name of Object.keys(pkg.dependencies ?? {})) {
      if (found.has(name)) {
        continue
      }
      const root = installed(name, from)
      if (root === undefined) {
        continue
      }
      const declared = (
        JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { customElements?: string }
      ).customElements
      if (declared === undefined) {
        continue
      }
      found.set(name, join(root, declared))
      visit(root)
    }
  }
  visit(cwd)
  return found
}

/** The `helix` command, reached through its npm package as any caller would. */
const helix = (): string => createRequire(import.meta.url).resolve('@fusion.dev/helix-cli/bin.mjs')

/**
 * Writes a package's manifest, then its typings.
 *
 * The manifest is `helix manifest build`'s, which is byte for byte what
 * `@custom-elements-manifest/analyzer` wrote across all four tiers when this
 * replaced it. The rest is `afterManifest`, run over the manifest in the shape
 * the analyzer called it with, from the package directory, because the
 * typings generators write where they are told relative to that.
 */
export const analyze = (options: HelixCemOptions, cwd = process.cwd()): HelixManifest => {
  const dependencies = dependenciesOf(cwd)
  const flags = [...dependencies].flatMap(([name, at]) => ['--dependency', `${name}=${at}`])
  const built = spawnSync(
    process.execPath,
    [helix(), 'manifest', 'build', '.', '--tier', options.tier, ...flags],
    { cwd, encoding: 'utf8', maxBuffer: 1024 * 1024 * 256, stdio: ['ignore', 'pipe', 'inherit'] },
  )
  if (built.status !== 0) {
    throw new Error(`helix manifest build exited ${built.status} in ${cwd}`)
  }
  writeFileSync(join(cwd, MANIFEST), built.stdout)

  const customElementsManifest = JSON.parse(built.stdout) as HelixManifest
  /* Only where the package declares an element: core's manifest holds the
     base classes, which nothing diagnoses. */
  const name = (JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')) as { name: string })
    .name
  const lint = lintOf(customElementsManifest as ManifestSource, name)
  if (Object.keys(lint.tags).length > 0) {
    writeFileSync(join(cwd, LINT), `${JSON.stringify(lint)}\n`)
    /* **Read with the tiers this one builds on, then narrowed to its own.**
       A container's import block can sit on the tier below it alone: Select,
       Combobox, and Data Table write theirs in the headless description, and
       a styled catalog read on its own lost the Option and Table lines. */
    const below = [...dependencies]
      .filter(([dependency]) => dependency.startsWith('@fusion.dev/helix'))
      .map(([, at]) => JSON.parse(readFileSync(at, 'utf8')) as HelixManifest)
    const own = options.tier === 'headless' ? 'headless' : 'styled'
    const families = catalog([customElementsManifest, ...below], examplesOnDisk(cwd))
      .map((family) => ({
        ...family,
        elements: family.elements.filter((element) => element.tier === own),
      }))
      .filter((family) => family.elements.length > 0)
    writeFileSync(
      join(cwd, API),
      `${JSON.stringify({ families: families.map(({ examples: _, ...family }) => family), package: name })}\n`,
    )
    if (options.skill) {
      const version =
        (JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')) as { version?: string })
          .version ?? ''
      mkdirSync(join(cwd, 'skills', 'helix'), { recursive: true })
      writeFileSync(join(cwd, 'skills', 'helix', 'SKILL.md'), skillOf(options.skill, cwd, version))
    }
    writeFileSync(
      join(cwd, EXAMPLES),
      `${JSON.stringify({ environment: environmentOf(cwd), examples: Object.fromEntries(families.map((family) => [family.slug, family.examples])), package: name })}\n`,
    )
  }
  const context: HelixContext = {
    thirdPartyCEMs: [...dependencies.values()].map(
      (at) => JSON.parse(readFileSync(at, 'utf8')) as HelixManifest,
    ),
  }
  const back = process.cwd()
  process.chdir(cwd)
  try {
    for (const step of afterManifest(options)) {
      step.packageLinkPhase?.({ context, customElementsManifest })
    }
  } finally {
    process.chdir(back)
  }
  return customElementsManifest
}

export {
  type ApiMember,
  catalog,
  type Element,
  type EventDoc,
  type Example,
  type ExampleSource,
  type Family,
  findInCatalog,
  type PropertyDoc,
  type Render,
  rendersOf,
} from './catalog.js'
export { displayName, place, startCase, tierOf } from './naming.js'
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
} from './types.js'
export {
  jsxBaseProps,
  jsxDeclaredEvents,
  jsxImports,
  jsxNativeEvents,
  jsxNumericAttributes,
  jsxOptionalUndefined,
  jsxReactRef,
  svelteTypes,
  wordsTypes,
}

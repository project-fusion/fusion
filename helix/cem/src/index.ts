import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { lintOf, type ManifestSource } from '@fusion.dev/helix-diagnostics'
import {
  type Anatomy,
  catalog,
  type ExampleSource,
  type NativeRecord,
  publishedBy,
  withAnatomy,
  withPlatforms,
} from './catalog.js'
import type { HelixManifest, HelixMetadata } from './types.js'
import { renderJsx } from './typings/jsx.js'
import { renderSvelte } from './typings/svelte.js'
import { renderVue } from './typings/vue.js'
import { renderWords, wordsOf } from './typings/words.js'

export interface HelixCemOptions {
  /**
   * Emit type declarations for the package's elements, per framework.
   *
   * Without them a custom element accepts any attribute, so
   * `appearance="wrong"` passes silently. Written from the same manifest
   * everything else reads: `jsx.d.ts` for the whole JSX family, and `vue.d.ts`
   * for Vue templates, which are not JSX and augment a different interface.
   */
  frameworkTypes?: boolean

  /**
   * The package holding the platform-neutral sources of the families this
   * package also draws on React Native, relative to this one, such as
   * `../neutral`. `analyze` asks `helix family platforms` there what each
   * element is called on a phone, and `api.json` says so. Absent, every
   * family is the web's alone.
   */
  native?: string

  /**
   * Package the element classes are imported from in the typings, which
   * `frameworkTypes` needs: it is the one name a manifest's `path` cannot give,
   * since `src/card/root/card-root.ts` resolves for nobody downstream.
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
 * The package's catalog without its examples: every family with its elements,
 * their properties, events with React props, slots, parts, hooks, states,
 * words, and the import lines. `helix mcp` answers from it, and it is the
 * same `catalog()` the site's family pages are written from, so an agent and a
 * reader see one answer. About a third of the manifest, which repeats every
 * inherited member on every class.
 *
 * A family whose root another package holds is listed with this package's
 * elements alone and marked `contributes`, as `publishedBy` says.
 */
const API = 'api.json'

/** The package's examples by family, each with the import lines it needs. */
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
 * Whether each Helix event bubbles, by name, read from the event classes in
 * `@fusion.dev/helix-core`: each declares `static readonly eventName` and
 * passes `bubbles` to `super()`. From the source where the package has it, as
 * in this repository, and from what it built otherwise.
 *
 * **What a scan needs to judge a listener on a wrapper.** A coordination event
 * such as `helix-dismiss` reaches an ancestor; a lifecycle event such as
 * `helix-before-open` stops at the element that sent it.
 */
export const bubblingOf = (cwd: string): Map<string, boolean> => {
  const found = new Map<string, boolean>()
  let core: string
  try {
    core = dirname(
      createRequire(join(cwd, 'package.json')).resolve('@fusion.dev/helix-core/package.json'),
    )
  } catch {
    return found
  }
  const folder = [join(core, 'src', 'events'), join(core, 'dist', 'events')].find((one) =>
    existsSync(one),
  )
  if (folder === undefined) {
    return found
  }
  for (const file of readdirSync(folder)) {
    if (!/\.(ts|js)$/.test(file) || /\.(d|spec|pure\.spec)\.ts$|\.d\.ts$/.test(file)) {
      continue
    }
    const text = readFileSync(join(folder, file), 'utf8')
    /* Each class from its declaration to the next one, so a file holding two
       pairs each name with its own options. */
    for (const block of text.split(/\bclass\s+/).slice(1)) {
      const name = /static\s+(?:readonly\s+)?eventName\s*=\s*['"]([a-z][\w-]*)['"]/.exec(block)?.[1]
      const bubbles = /bubbles:\s*(true|false)/.exec(block)?.[1]
      if (name !== undefined && bubbles !== undefined) {
        found.set(name, bubbles === 'true')
      }
    }
  }
  return found
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
 * Writes the framework typings from the finished manifest.
 *
 * **Each file is a template over the manifest**, in `src/typings`, and the
 * projects in `typings/` say whether a framework accepts what it writes.
 *
 * **No formatter runs over the files.** A hover shows the doc comment, and nobody
 * edits them, so formatting them bought nothing and took about half a second per
 * tier.
 */
export const writeTypings = (
  manifest: HelixManifest,
  packageName: string | undefined,
  cwd: string,
): void => {
  if (packageName === undefined) {
    throw new Error('frameworkTypes needs packageName, which the typings import the classes from')
  }
  mkdirSync(join(cwd, TYPES), { recursive: true })
  const write = (name: string, text: string): void => writeFileSync(join(cwd, TYPES, name), text)
  write('jsx.d.ts', renderJsx(manifest, packageName))
  write('vue.d.ts', renderVue(manifest, packageName))
  write('svelte.d.ts', renderSvelte(manifest, packageName))
  write('words.d.ts', renderWords(wordsOf(manifest), packageName))
}

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

/**
 * The manifests of the Helix packages this one peers, by package name.
 *
 * **Read for the families this package adds elements to**, and for nothing
 * else: `@fusion.dev/helix-sandbox` peers `@fusion.dev/helix`, which holds the
 * Sandbox family's root, so its `api.json` can name the package that supplies
 * that family's facts. A peer is not built against, so nothing inherits from
 * one.
 */
export const peersOf = (cwd: string): Map<string, string> => {
  const found = new Map<string, string>()
  const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')) as {
    peerDependencies?: Record<string, string>
  }
  for (const name of Object.keys(pkg.peerDependencies ?? {})) {
    const root = name.startsWith('@fusion.dev/helix') ? installed(name, cwd) : undefined
    if (root === undefined) {
      continue
    }
    const declared = (
      JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { customElements?: string }
    ).customElements
    if (declared !== undefined && existsSync(join(root, declared))) {
      found.set(name, join(root, declared))
    }
  }
  return found
}

/** The `helix` command, reached through its npm package as any caller would. */
const helix = (): string => createRequire(import.meta.url).resolve('@fusion.dev/helix-cli/bin.mjs')

/**
 * What each element is called on React Native, from `helix family platforms`
 * over the neutral sources at `native`, which reads the manifest `analyze`
 * has just written. Empty where the package draws nothing natively.
 */
const nativeOf = (native: string | undefined, cwd: string): NativeRecord => {
  if (native === undefined) {
    return {}
  }
  const named = spawnSync(process.execPath, [helix(), 'family', 'platforms', native], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16,
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  if (named.status !== 0) {
    throw new Error(`helix family platforms exited ${named.status} in ${cwd}`)
  }
  return JSON.parse(named.stdout) as NativeRecord
}

/**
 * What each element is made of on each platform, from `helix family anatomy`
 * over the neutral sources at `native`, by tag. Empty where the package draws
 * nothing from them.
 */
const anatomyOf = (native: string | undefined, cwd: string): Record<string, Anatomy> => {
  if (native === undefined) {
    return {}
  }
  const read = spawnSync(process.execPath, [helix(), 'family', 'anatomy', native], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16,
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  if (read.status !== 0) {
    throw new Error(`helix family anatomy exited ${read.status} in ${cwd}`)
  }
  return JSON.parse(read.stdout) as Record<string, Anatomy>
}

/**
 * Writes a package's manifest, then its typings.
 *
 * The manifest is `helix manifest build`'s, which is byte for byte what
 * `@custom-elements-manifest/analyzer` wrote across all four tiers when this
 * replaced it. The typings are `writeTypings`, from that manifest.
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
       a styled catalog read on its own lost the Option and Table lines. The
       packages it peers are read too, for the root of a family it adds
       elements to. */
    const below = [...new Map([...dependencies, ...peersOf(cwd)])]
      .filter(([dependency]) => dependency.startsWith('@fusion.dev/helix'))
      .map(([, at]) => JSON.parse(readFileSync(at, 'utf8')) as HelixManifest)
    const families = withAnatomy(
      withPlatforms(
        publishedBy(
          catalog([customElementsManifest, ...below], examplesOnDisk(cwd), bubblingOf(cwd)),
          name,
        ),
        nativeOf(options.native, cwd),
      ),
      anatomyOf(options.native, cwd),
    )
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
  if (options.frameworkTypes) {
    writeTypings(customElementsManifest, options.packageName, cwd)
  }
  return customElementsManifest
}

export {
  type Anatomy,
  type AnatomyNode,
  type AnatomySide,
  type ApiMember,
  type Contribution,
  catalog,
  type Element,
  type EventDoc,
  type Example,
  type ExampleSource,
  type Family,
  findInCatalog,
  type NativeElement,
  type NativeRecord,
  type Platforms,
  type PropertyDoc,
  publishedBy,
  type Render,
  rendersOf,
  withAnatomy,
  withPlatforms,
} from './catalog.js'
export { displayName, familyOf, place, startCase, tierOf } from './naming.js'
export type {
  Documented,
  HelixAttribute,
  HelixCssProperty,
  HelixDeclaration,
  HelixEvent,
  HelixManifest,
  HelixMember,
  HelixMetadata,
  HelixModule,
  InheritedFrom,
  TypeText,
} from './types.js'

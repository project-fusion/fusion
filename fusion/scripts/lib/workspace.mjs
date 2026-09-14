#!/usr/bin/env node
/**
 * Where the packages are. A module, not a script: nothing here runs alone.
 *
 * **Scope says which domain, `private` says whether it ships.** These are two
 * questions and one field cannot answer both. `@fusion.dev/helix-cem` is Helix's
 * analyzer configuration: it hardcodes Helix conventions, it belongs to Helix,
 * and it is of no use to anyone outside this repository. Renaming it to
 * `@fusion.dev/cem` to express "does not publish" would file it beside the
 * company-wide test helpers and claim it is general Fusion tooling, which is
 * the one thing it is not.
 *
 * So the domain is the namespace and publication is a flag on the package. The
 * flag cannot drift into a stale allowlist, because it lives in the manifest
 * anyone editing that package already has open.
 *
 * "Which manifests are there" is written down once, in the root `workspaces`
 * field. A script with its own copy of that answer is a second definition of the
 * workspace, and the first package added outside it is silently uncovered by
 * every check holding one.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const root = resolve(import.meta.dirname, '../../..')

/**
 * The one scope, and the domains inside it. The scope is the company, so the
 * domain is read off the name rather than the prefix. `@fusion.dev/helix` is the
 * styled tier itself, so a domain matches its own bare name as well as its
 * prefix.
 */
export const SCOPE = '@fusion.dev/'
export const DOMAINS = { cortex: 'cortex', helix: 'helix' }

/**
 * What the design system prefixes its element names with.
 *
 * **This is the parameter a consumer would have to change and this repository
 * never will.** A library built on Helix registers its own elements, so a rule
 * asking "is this one of ours" is asking about a prefix rather than about the
 * word `helix`. Named here so the rules ask a question rather than assert an
 * answer, which is the difference between a rule that ships and a rule that
 * only ever runs here.
 *
 * The rest of what looks like prefix coupling is either a specific element name,
 * which is vocabulary, or a package name, which is a dependency.
 */
export const TAG_PREFIX = 'helix-'

/**
 * Where source lives, named once so a folder rename has one copy to find.
 *
 * A script holding its own copy of these paths fails a rename with
 * `ENOENT: scandir 'docs'`, which is a check that cannot start rather than one
 * that fails, so nothing in the message says what was going unchecked.
 *
 * **Named places rather than one list**, because the lists are not the same
 * question and collapsing them would lose that: `helix component`'s `motion` reads the
 * styles, the styled tier, the sandbox and the gallery, while `helix component`'s `parts`
 * reads core, both tiers and the sandbox. Each script still says what it looks
 * at. What it no longer says is where those things are.
 */
export const SOURCE = {
  core: 'helix/core/src',
  gallery: 'helix/gallery/src',
  headless: 'helix/headless/src',
  sandbox: 'helix/sandbox/src',
  styled: 'helix/styled/src',
  styles: 'helix/styles/src',
}

/**
 * Where a package's own `exports` says one of its published files is.
 *
 * **The package's declaration is the source of truth, not this file.** Reading
 * `exports` means `tokens.json` moving from the package root into `dist` is one
 * edit in the manifest that declares it, rather than an edit here and in every
 * script that had spelled the path out.
 *
 * It throws rather than returning a path that is not exported, so a file a
 * package stopped publishing fails with the package and the subpath named,
 * instead of an `ENOENT` on a stale path several steps later.
 */
const exported = (directory, subpath) => {
  const manifest = JSON.parse(readFileSync(join(root, directory, 'package.json'), 'utf8'))
  const target = manifest.exports?.[subpath]
  const file = typeof target === 'string' ? target : target?.default
  if (!file) {
    throw new Error(`${manifest.name} does not export \`${subpath}\``)
  }
  return join(directory, file.replace(/^\.\//, ''))
}

/**
 * What a package publishes, resolved through the package rather than spelled out.
 *
 * **A specifier would be better and is not available.** `@fusion.dev/scripts`
 * cannot depend on the packages it measures: `helix/styles` and both tiers
 * already depend on this one, so an edge back is a cycle. Resolving `exports` by
 * hand is the same answer without the edge, and it fails the same way when a
 * package stops publishing something. Outside this repository these files are
 * reached the way a consumer reaches them, by specifier.
 */
export const ARTIFACT = {
  coreManifest: exported('helix/core', './custom-elements.json'),
  headlessManifest: exported('helix/headless', './custom-elements.json'),
  styledManifest: exported('helix/styled', './custom-elements.json'),
  tokens: exported('helix/styles', './tokens.json'),
}

/** The two component tiers, which is the set six checks read on their own. */
export const TIERS = [SOURCE.headless, SOURCE.styled]

/** Every workspace directory, with `dir/*` globs expanded. */
export function directories() {
  const { workspaces } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const found = []
  for (const pattern of workspaces) {
    if (!pattern.endsWith('/*')) {
      found.push(join(root, pattern))
      continue
    }
    const parent = join(root, pattern.slice(0, -2))
    for (const entry of readdirSync(parent)) {
      const path = join(parent, entry)
      if (statSync(path).isDirectory()) {
        found.push(path)
      }
    }
  }
  return found
}

/**
 * Every workspace manifest, keyed by package name. `directory` is relative to
 * the repository root, because that is what a message has to print and what
 * `repository.directory` has to hold.
 */
export function manifests() {
  const found = new Map()
  for (const directory of directories()) {
    let raw
    try {
      raw = readFileSync(join(directory, 'package.json'), 'utf8')
    } catch {
      continue
    }
    const manifest = JSON.parse(raw)
    found.set(manifest.name, {
      directory: directory.slice(root.length + 1),
      file: join(directory, 'package.json'),
      manifest,
    })
  }
  return found
}

/**
 * The domain a package name belongs to, or undefined for one that belongs to no
 * product. `@fusion.dev/helix` and `@fusion.dev/helix-core` both answer helix;
 * `@fusion.dev/site` answers nothing, and `fusion workspace`'s `publishable` is what then
 * requires it to be private.
 *
 * **A `create-` prefix is read past.** `npm create @fusion.dev/helix-app` runs
 * `@fusion.dev/create-helix-app` and no other name, so a launcher's prefix is
 * npm's and the product is the word after it.
 */
export const domainOf = (name) => {
  if (!name.startsWith(SCOPE)) {
    return undefined
  }
  const bare = name.slice(SCOPE.length).replace(/^create-/, '')
  return Object.keys(DOMAINS).find(
    (domain) => bare === DOMAINS[domain] || bare.startsWith(`${DOMAINS[domain]}-`),
  )
}

/**
 * Whether a package leaves the repository. `private` is the declaration, and a
 * package in a domain may still be internal: a Helix byproduct is still Helix.
 */
export const publishes = (manifest) => manifest.private !== true

#!/usr/bin/env node
/**
 * Where the packages are. A module, not a script: nothing here runs alone.
 *
 * **Scope says which domain, `private` says whether it ships.** These are two
 * questions and were briefly answered by one field. `@fusion.dev/helix-cem` is Helix's
 * analyzer configuration: it hardcodes Helix conventions, it belongs to Helix,
 * and it is of no use to anyone outside this repository. Renaming it to
 * `@fusion.dev/cem` to express "does not publish" would file it beside the
 * company-wide test helpers and claim it is general Fusion tooling, which is
 * the one thing it is not.
 *
 * So the domain is the namespace and publication is a flag on the package. The
 * flag still cannot drift into a stale allowlist, because it lives in the
 * manifest anyone editing that package already has open.
 *
 * Three scripts need the same answer to "which manifests are there", and the
 * answer is already written down once, in the root `workspaces` field. Restated
 * a third time it would be a second definition of the workspace, and the first
 * package added outside it would be silently uncovered by every check that had
 * its own copy.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const root = resolve(import.meta.dirname, '../../..')

/**
 * The one scope, and the domains inside it. The scope used to name the domain,
 * so `domainOf` could read it off the prefix; a single company scope cannot say
 * that and the name is where it moved. `@fusion.dev/helix` is the styled tier
 * itself, so a domain matches its own bare name as well as its prefix.
 */
export const SCOPE = '@fusion.dev/'
export const DOMAINS = { cortex: 'cortex', helix: 'helix' }

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
 * `@fusion.dev/site-ui` answers nothing, and `check:pkg:publishable` is what then
 * requires it to be private.
 */
export const domainOf = (name) => {
  if (!name.startsWith(SCOPE)) {
    return undefined
  }
  const bare = name.slice(SCOPE.length)
  return Object.keys(DOMAINS).find(
    (domain) => bare === DOMAINS[domain] || bare.startsWith(`${DOMAINS[domain]}-`),
  )
}

/**
 * Whether a package leaves the repository. `private` is the declaration, and a
 * package in a domain may still be internal: a Helix byproduct is still Helix.
 */
export const publishes = (manifest) => manifest.private !== true

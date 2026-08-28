#!/usr/bin/env node
/**
 * Refuses a barrel import of a workspace package that cannot be tree-shaken.
 *
 * **A package of custom elements is side-effectful by definition and honestly
 * so.** A module that calls `customElements.define` at load has done something
 * by being loaded, `@fusion.dev/helix-headless` says so in its `sideEffects` field, and
 * that field is correct. What follows from it is that a bundler may drop
 * nothing out of its barrel: `import { HelixHeadlessButton } from
 * '@fusion.dev/helix-headless'` retains all 83 families whether or not one of them is
 * reachable.
 *
 * Measured before this check existed, by `bun run gen:metrics`: 82 of the 88 styled
 * families imported the headless barrel, and `@fusion.dev/helix/button` came to
 * 449,026 raw bytes, 115,590 gzipped, against 41,587 and 14,149 after the same
 * import went deep. The whole styled tier is 1.4MB, so one button was 29
 * percent of the library.
 *
 * **The rule reads `sideEffects`, and does not name a package.** A dependency
 * declaring `sideEffects: false` tree-shakes and its barrel is free, which is
 * why `@fusion.dev/helix-core` is not a finding and why nothing here has to be updated
 * the day that changes. A dependency that does not, and that publishes a
 * subpath pattern, has to be imported through the subpath.
 *
 * **Specs are covered too.** They are excluded from `tsconfig` and reach no
 * bundle, so they cost a consumer nothing, but a spec is where the next person
 * copies an import from.
 *
 * Run with `bun run check:api:barrels`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { manifests, root } from './lib/workspace.mjs'

const packages = manifests()

/**
 * Whether a bundler may drop unreached modules out of this package.
 *
 * Only `sideEffects: false` says so. An array of globs is a list of files that
 * must be kept, and every one of these packages that has an array has one
 * covering the whole of `dist`.
 */
const shakeable = (manifest) => manifest.sideEffects === false

/** Whether a package offers a subpath for its parts, which is the fix to name. */
const hasSubpaths = (manifest) =>
  Object.keys(manifest.exports ?? {}).some((key) => key.includes('*'))

const sources = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      sources(path, found)
    } else if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      found.push(path)
    }
  }
  return found
}

/**
 * Where a class or function is declared, from the built types.
 *
 * So the message can say which subpath to use rather than that one exists. A
 * package that has not been built yet gets the general advice, which is why
 * this returns a map rather than failing: a check that needs a build to report
 * anything at all is a check that gets skipped.
 */
const declarations = (directory) => {
  const dist = join(root, directory, 'dist')
  const found = new Map()
  let families
  try {
    families = readdirSync(dist)
  } catch {
    return found
  }
  for (const family of families) {
    const path = join(dist, family)
    if (!statSync(path).isDirectory()) {
      continue
    }
    for (const file of sources(path).filter((one) => one.endsWith('.d.ts'))) {
      for (const [, name] of readFileSync(file, 'utf8').matchAll(
        /export declare (?:abstract )?(?:class|function|const) (\w+)/g,
      )) {
        found.set(name, family)
      }
    }
  }
  return found
}

const problems = []
let scanned = 0
let checked = 0

for (const [name, { directory, manifest }] of packages) {
  const dependencies = Object.keys(manifest.dependencies ?? {})
  const barrels = dependencies.filter((dependency) => {
    const target = packages.get(dependency)
    return target && !shakeable(target.manifest) && hasSubpaths(target.manifest)
  })
  if (barrels.length === 0) {
    continue
  }
  checked += 1

  const where = new Map(
    barrels.map((dependency) => [dependency, declarations(packages.get(dependency).directory)]),
  )

  let files
  try {
    files = sources(join(root, directory, 'src'))
  } catch {
    continue
  }

  for (const file of files) {
    scanned += 1
    const source = readFileSync(file, 'utf8')
    for (const dependency of barrels) {
      const pattern = new RegExp(
        `^import (?:type )?\\{([^}]*)\\} from '${dependency.replace('/', '\\/')}'$`,
        'gm',
      )
      for (const match of source.matchAll(pattern)) {
        const line = source.slice(0, match.index).split('\n').length
        const imported = match[1]
          .split(',')
          .map((one) => one.trim().split(/\s+as\s+/)[0])
          .filter(Boolean)
        const subpaths = [
          ...new Set(imported.map((one) => where.get(dependency).get(one)).filter(Boolean)),
        ]
        const advice =
          subpaths.length > 0
            ? `import from ${subpaths.map((one) => `\`${dependency}/${one}\``).join(' and ')} instead`
            : `import from \`${dependency}/<part>\` instead`
        problems.push(
          `${file.slice(root.length + 1)}:${line}: barrel import of \`${dependency}\`, which is side-effectful and cannot be shaken. ${advice}. Package ${name}`,
        )
      }
    }
  }
}

if (problems.length > 0) {
  console.error(
    `barrels: ${problems.length} problems\n  ${problems.join('\n  ')}\n\n` +
      'A side-effectful package retains its whole barrel. Importing the subpath ' +
      'is the only lever, since the `sideEffects` field is true and removing it ' +
      'would be a lie about what a `customElements.define` costs.',
  )
  process.exit(1)
}

console.log(
  `barrels: ${scanned} files across ${checked} packages, no barrel import of a package that cannot be shaken`,
)

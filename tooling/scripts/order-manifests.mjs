#!/usr/bin/env node
/**
 * Normalizes key order in every package.json.
 *
 * Identity first (who is this), then how it is consumed, then how it is built,
 * then everything else alphabetically. Alphabetizing the whole file reads
 * tidily and buries `name` under `devDependencies`, which is the one field
 * anyone opening the file is looking for.
 *
 * Run with `bun run order` (also part of `bun run check`).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Keys pinned to the top, in this order. Everything else sorts after them. */
const PRIORITY = [
  // identity
  'name',
  'description',
  'version',
  'private',
  'license',
  'author',
  'repository',
  // consumption
  'type',
  'main',
  'module',
  'types',
  'exports',
  'files',
  'customElements',
  'sideEffects',
  'bin',
  // build
  'scripts',
]

/**
 * Export conditions are matched in order, so this one is semantic, not
 * cosmetic. `types` must precede `default` or TypeScript resolves the runtime
 * entry and reports the package as untyped. Alphabetizing them is a real bug,
 * which is why `useSortedKeys` is turned off for package.json in biome.json.
 */
const CONDITIONS = ['types', 'browser', 'node', 'import', 'require', 'module', 'default']

/* `.claude` holds the agent tooling's git worktrees, which are second checkouts
   of this repository. Without it this walks into one and rewrites fifteen
   package.json files on somebody else's branch: measured, and it found all
   fifteen. They happened to already be in order, so nothing was damaged, which
   is not a reason to leave it. */
const IGNORED = new Set([
  '.claude',
  '.git',
  '.local',
  '.next',
  '.turbo',
  'dist',
  'node_modules',
  'target',
])

const sortByList = (obj, list) => {
  const rest = Object.keys(obj)
    .filter((k) => !list.includes(k))
    .sort((a, b) => a.localeCompare(b))
  const ordered = {}
  for (const key of [...list.filter((k) => k in obj), ...rest]) {
    ordered[key] = obj[key]
  }
  return ordered
}

/** Recursively orders export conditions, which nest arbitrarily deep. */
const orderExports = (node) => {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) {
    return node
  }
  const ordered = sortByList(node, CONDITIONS)
  for (const [key, value] of Object.entries(ordered)) {
    ordered[key] = orderExports(value)
  }
  return ordered
}

const order = (pkg) => {
  const ordered = sortByList(pkg, PRIORITY)
  if (ordered.exports) {
    ordered.exports = orderExports(ordered.exports)
  }
  return ordered
}

const walk = function* (dir) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED.has(entry)) {
      continue
    }
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      yield* walk(full)
    } else if (entry === 'package.json') {
      yield full
    }
  }
}

const root = process.argv[2] ?? process.cwd()
let changed = 0

for (const file of walk(root)) {
  const before = readFileSync(file, 'utf8')
  const after = `${JSON.stringify(order(JSON.parse(before)), null, 2)}\n`
  if (before !== after) {
    writeFileSync(file, after)
    console.log(`ordered ${file.replace(`${root}/`, '')}`)
    changed += 1
  }
}

console.log(
  changed === 0 ? 'all package manifests already ordered' : `ordered ${changed} manifest(s)`,
)

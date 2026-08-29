#!/usr/bin/env node
/**
 * What may leave the repository, and what a package must be to do it.
 *
 * **Two questions, two answers.** The name says which domain a package belongs
 * to; `private` says whether it ships. `@fusion.dev/helix-cem` is Helix's
 * analyzer configuration and also a build tool of no use to anyone outside this
 * repository, and a rule reading publication off the name could express only
 * one of those: it would force a rename to `@fusion.dev/cem`, claiming
 * Helix-specific tooling is general Fusion tooling.
 *
 * `private` is still not an allowlist. It lives in the manifest of the package
 * it describes, which anyone changing that package already has open, rather
 * than in a central list nothing makes you read.
 *
 * **A package belonging to no domain is always private**, and that is the whole
 * of what the name decides. `cli`, `insights`, `site` and `source` name no
 * product, so there is no reading under which they ship.
 *
 * **A published package may not depend on an unpublished one.** This is the
 * failure this file exists for. Inside the workspace every dependency resolves,
 * because bun links them from disk, so the mistake is invisible in every test,
 * every build, and every example. It surfaces only on someone else's machine,
 * at install, as a 404 for a package that was never meant to leave. `files`,
 * `exports` and the rest are checkable by reading one manifest. This one is not
 * visible from inside any single package, which is why it is worth a script.
 *
 * `devDependencies` are exempt, because a consumer never installs them.
 * `@fusion.dev/helix-testing` is a devDependency of published packages and that
 * is correct.
 *
 * **`types` before `default`.** Conditions match top to bottom, so a `types`
 * written after `default` is never reached and TypeScript reports the package
 * as untyped. This is why `useSortedKeys` is off for package.json, and turning
 * an ordering rule off is only half the job: nothing then checks the order is
 * right, it only stops being made wrong automatically.
 *
 * **`files`, `description`, `license`, `repository`.** A package with no `files`
 * ships its `src`, its specs and its `.examples`, which is both larger and more
 * than was meant. `repository` is what links a published tarball back to the
 * commit that built it, and provenance attestation has nothing to attest
 * without it.
 *
 * **One version per domain.** Lockstep is the versioning policy, and the
 * property it exists to hold is that `@fusion.dev/helix-headless@x` works with
 * `@fusion.dev/helix@x`. A manifest carrying a different string from its neighbors
 * is that promise already broken, and the release stamps whatever it finds.
 *
 * Run with `bun run check:pkg:publishable` (also part of `bun run verify`).
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { DOMAINS, domainOf, manifests, publishes, root, SCOPE } from './lib/workspace.mjs'

/** Every `types`/`default` pair in an exports tree, in the order written. */
function conditions(node, trail = []) {
  const found = []
  if (node === null || typeof node !== 'object' || Array.isArray(node)) {
    return found
  }
  const keys = Object.keys(node)
  if (keys.includes('types')) {
    found.push({ keys, trail })
  }
  for (const key of keys) {
    found.push(...conditions(node[key], [...trail, key]))
  }
  return found
}

const problems = []
const versions = new Map()
const shipping = new Set()
let publishable = 0
let internal = 0

for (const [name, { manifest }] of manifests()) {
  if (domainOf(name) !== undefined && publishes(manifest)) {
    shipping.add(name)
  }
}

for (const [name, { directory, manifest }] of manifests()) {
  const domain = domainOf(name)

  if (domain === undefined) {
    if (!name.startsWith(SCOPE)) {
      problems.push(
        `${directory}: \`${name}\` is outside \`${SCOPE}\`. Every package in this repository ` +
          'is in the one company scope, and the name after it says which product owns it: ' +
          `${Object.values(DOMAINS).join(' and ')}, or neither.`,
      )
      continue
    }
    internal += 1
    if (manifest.private !== true) {
      problems.push(
        `${directory}: \`${name}\` belongs to no domain but is not \`private\`. The scope no ` +
          'longer says what ships, so `private` is the only thing that does, and this is one ' +
          'publish away from being public under a name chosen on the assumption ' +
          'that it never would be.',
      )
    }
    continue
  }

  /* Lockstep is a property of the domain, so an internal member versions with
     its siblings too: a Helix byproduct is still Helix. */
  versions.set(name, { directory, domain, version: manifest.version })

  if (!publishes(manifest)) {
    internal += 1
    if (manifest.publishConfig !== undefined) {
      problems.push(
        `${directory}: \`${name}\` is \`private\` and still carries \`publishConfig\`, which ` +
          'describes how it would be published. One of the two is out of date.',
      )
    }
    continue
  }

  publishable += 1

  for (const field of ['description', 'files', 'license', 'repository', 'version']) {
    if (manifest[field] === undefined) {
      problems.push(
        `${directory}: \`${name}\` has no \`${field}\`, which a published package needs.`,
      )
    }
  }

  if (manifest.publishConfig?.access === undefined) {
    problems.push(
      `${directory}: \`${name}\` declares no \`publishConfig.access\`, so publication depends on ` +
        'whatever the registry defaults to for the scope that day.',
    )
  }

  if (manifest.repository?.directory !== undefined && manifest.repository.directory !== directory) {
    problems.push(
      `${directory}: \`${name}\` points \`repository.directory\` at ` +
        `\`${manifest.repository.directory}\`. A published tarball links back to source that is ` +
        'not its own.',
    )
  }

  for (const { keys, trail } of conditions(manifest.exports ?? {})) {
    if (keys.indexOf('types') !== 0) {
      problems.push(
        `${directory}: \`${name}\` orders \`exports${trail.map((k) => `[${k}]`).join('')}\` as ` +
          `${keys.join(', ')}. Conditions match top to bottom, so \`types\` after \`${keys[0]}\` ` +
          'is never read and the package reports as untyped.',
      )
    }
  }

  /* The one that cannot be seen from inside the package. */
  for (const field of ['dependencies', 'peerDependencies']) {
    for (const dependency of Object.keys(manifest[field] ?? {})) {
      if (!manifests().has(dependency) || shipping.has(dependency)) {
        continue
      }
      problems.push(
        `${directory}: \`${name}\` is published and takes \`${dependency}\` as a ` +
          `${field === 'dependencies' ? 'runtime' : 'peer'} dependency, which is not. ` +
          'Resolves here because bun links it from disk; 404s on install anywhere else.',
      )
    }
  }
}

/* One visibility for everything, because a release is all of it or none. A
   domain half public and half restricted installs for nobody: a consumer who
   can reach `@fusion.dev/helix` gets a 404 on the `@fusion.dev/helix-core` it depends on,
   and the failure names the dependency rather than the setting that caused it.
   npm also decides visibility at first publish, so a package that goes out
   wrong is not corrected by editing this field afterwards. */
const access = new Set(
  [...manifests().values()]
    .filter(({ manifest }) => shipping.has(manifest.name))
    .map(({ manifest }) => manifest.publishConfig?.access),
)
if (access.size > 1) {
  problems.push(
    `publishConfig.access disagrees across the published packages (${[...access].sort().join(', ')}). ` +
      'Visibility is one decision for all of them, and npm fixes it at first publish.',
  )
}

/* Lockstep, per domain. */
for (const domain of Object.keys(DOMAINS)) {
  const inDomain = [...versions.values()].filter((entry) => entry.domain === domain)
  const distinct = new Set(inDomain.map((entry) => entry.version))
  if (distinct.size > 1) {
    problems.push(
      `${domain}: versions disagree across the domain (${[...distinct].sort().join(', ')}). ` +
        'Lockstep is what makes `@fusion.dev/helix-headless@x` work with `@fusion.dev/helix@x`, and the ' +
        'release stamps whatever it finds: ' +
        inDomain.map((entry) => `${entry.directory} is ${entry.version}`).join(', '),
    )
  }
}

/* The Rust half, which fails in the one direction nothing else watches.
   `cortex` spans two package managers: `@fusion.dev/cortex-docs` on npm and the crates
   on Cargo, each carrying its own version (see below). The release
   stamps that version and pushes a `cortex-v*` tag whether or not a crate ever
   leaves, so the day someone turns `publish` on is the day the tag starts
   claiming a crate release that no workflow performs. Silent, and discovered by
   whoever tries to depend on it.

   Note that crates.io is public-only. A private Cargo release needs an
   alternate registry, which is what `publish = ["name"]` is for; until there is
   one, `publish = false` is the honest setting and a consumer takes the crates
   as a git dependency pinned to the very tag the release already pushes. */
const cargo = readFileSync(join(root, 'Cargo.toml'), 'utf8')
const section = cargo.slice(cargo.indexOf('[workspace.package]'))
const declared = /^publish = (.+)$/m.exec(section)?.[1]?.trim()
const workflow = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8')
const releases = /cargo\s+publish/.test(workflow)

if (declared !== 'false' && !releases) {
  problems.push(
    `Cargo.toml: \`[workspace.package] publish\` is ${declared}, so the crates are meant to be ` +
      'published, and `release.yml` runs no `cargo publish`. A `cortex-v*` tag would name a ' +
      'release of fusion-cortex-core, fusion-cortex-engram and fusion-cortex-trace that never happened.',
  )
}
if (declared === 'false' && releases) {
  problems.push(
    'Cargo.toml: `[workspace.package] publish` is false while `release.yml` runs `cargo publish`. ' +
      'The release will fail at the last step, after npm has already published.',
  )
}

/* **A crate may not inherit its version from the workspace**, which is the Rust
   half of one-version-per-domain.
 *
 * `[workspace.package] version` was the Cortex version only because every crate
 * was Cortex. This workspace is about to hold `fusion-helix-theme` and `fusion-helix-cli`, and
 * `release.yml` matrices over `helix` and `cortex` and computes each domain's
 * number from its own tags: two numbers, one shared field, and whichever
 * stamped last would win. Nothing else would say so, which is the failure this
 * whole file exists to prevent one package manager over.
 *
 * Read off `members` rather than a glob, so a crate that is added without being
 * listed fails here rather than being skipped by the check that would have
 * caught it. */
const members = [
  ...(/members\s*=\s*\[([\s\S]*?)\]/.exec(cargo)?.[1] ?? '').matchAll(/"([^"]+)"/g),
].map((found) => found[1])
if (members.length === 0) {
  problems.push('Cargo.toml: no `members` found, so no crate was checked for an inherited version.')
}
if (/^version\s*=/m.test(section)) {
  problems.push(
    'Cargo.toml: `[workspace.package]` declares a `version`. One value cannot be two domains, ' +
      'and `release.yml` computes `helix` and `cortex` from separate tags. Each crate carries ' +
      'its own.',
  )
}
for (const member of members) {
  const manifest = join(root, member, 'Cargo.toml')
  if (!existsSync(manifest)) {
    problems.push(`Cargo.toml: lists \`${member}\` as a member and there is no manifest there.`)
    continue
  }
  if (/^version\.workspace\s*=\s*true$/m.test(readFileSync(manifest, 'utf8'))) {
    problems.push(
      `${member}/Cargo.toml: takes \`version.workspace = true\`, which is the Cortex version ` +
        'only while every crate is Cortex. Declare `version = "0.0.0-dev"` on the crate.',
    )
  }
}

if (problems.length > 0) {
  console.error(`Packages that cannot be published as they stand (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}\n`)
  }
  process.exit(1)
}
console.log(
  `publishable: ${publishable} packages publish, ${internal} stay in, one version per domain, ` +
    'no published package depends on one that does not',
)

#!/usr/bin/env node
/**
 * Nothing in `dist` outlives the source it was compiled from.
 *
 * **Found by sweeping for a pattern rather than by anything failing**, 25 Aug
 * 2026. `@helix-io/core` measured 103 shipped files after a cached build and
 * 101 after a forced one, and the four that appeared were
 * `dist/utils/severities/severities.{js,d.ts}` and their maps. The source was
 * deleted in 2aa6f3d4, nothing imports it, and `files` publishes `dist`, so a
 * release cut from a tree in that state would have shipped a module that does
 * not exist.
 *
 * **`tsc` does not remove the output of a source you delete**, and no package
 * here cleans `dist` first. So a stale file sits there until somebody notices,
 * and Turborepo then caches the whole `dist/**` it was told to cache, strays
 * included: every later cache hit restores them, on every machine that shares
 * the cache. One dirty build directory becomes everyone's.
 *
 * Cleaning before every build would also fix it and costs a full recompile each
 * time. This is the cheaper half of the trade: builds stay incremental and the
 * strays are named rather than tolerated, which is the same shape as `verify`
 * judging while `check` writes.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')

/**
 * Packages whose `dist` is one file per source file, so the mapping back is
 * exact. `@helix-io/styles` is built by a script that emits a bundle rather than
 * a tree, and `site/ui` is a Next application, so neither can be checked this
 * way and neither publishes a `dist` of compiled modules.
 */
const PACKAGES = [
  'cortex/docs',
  'helix/core',
  'helix/docs',
  'helix/headless',
  'helix/icons',
  'helix/styled',
  'helix/theme',
]

/** Everything under a directory, relative to it. */
const walk = (dir, base = dir) =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry)
        return statSync(full).isDirectory() ? walk(full, base) : [relative(base, full)]
      })
    : []

const findings = []
let checked = 0

for (const pkg of PACKAGES) {
  const dist = join(ROOT, pkg, 'dist')
  const src = join(ROOT, pkg, 'src')
  if (!existsSync(dist)) {
    /* Not built is not a fault. `verify` builds before it reaches here, and a
       package nobody has compiled has shipped nothing to be wrong about. */
    continue
  }

  for (const file of walk(dist)) {
    const stem = file.replace(/\.(js|d\.ts)(\.map)?$/, '')
    if (stem === file) {
      continue
    }
    checked += 1

    /* A `.css.ts` is generated beside its stylesheet and compiles like any
       other source, so both spellings count as the origin. */
    const origins = [`${stem}.ts`, `${stem}.tsx`, `${stem}.css.ts`]
    if (!origins.some((origin) => existsSync(join(src, origin)))) {
      findings.push(`${pkg}/dist/${file}: no source at ${pkg}/src/${stem}.ts`)
    }
  }
}

if (findings.length > 0) {
  console.error(
    `shipped: ${findings.length} compiled files outlive their source.\n  ` +
      `${findings.join('\n  ')}\n\n` +
      '  `tsc` leaves the output of a deleted source behind, Turborepo caches\n' +
      '  the directory it was told to cache, and every later hit restores them.\n' +
      '  Remove them, and rebuild forced so the poisoned entry is replaced:\n' +
      '    rm -rf <package>/dist && bunx turbo run build --force --filter=<name>',
  )
  process.exit(1)
}

console.log(
  `shipped: ${checked} compiled files across ${PACKAGES.length} packages, every one with a source`,
)

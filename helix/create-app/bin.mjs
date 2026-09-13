#!/usr/bin/env node
/**
 * `npm create @fusion.dev/helix-app`: `helix new` for somebody with no project
 * yet.
 *
 * **One implementation, two doors.** The scaffolding belongs to the binary, and
 * this is the door for a reader with nothing installed: npm fetches this
 * package, the command it depends on, the binary for their machine and the
 * templates, and this runs `helix new` against the templates it came with.
 * Nothing here copies or substitutes, which is the part that would drift from
 * the other door.
 *
 * **It names the templates rather than letting the binary look.** `helix new`
 * walks up from where it is run for a `node_modules` holding them, and the
 * directory a reader runs this in has none: npm installed everything into its
 * own cache. So this hands over the package it resolved, which is the one
 * versioned with the binary beside it. `HELIX_TEMPLATES` already set wins, as it
 * does everywhere else it is read.
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'

const require = createRequire(import.meta.url)
const templates = dirname(require.resolve('@fusion.dev/helix-templates/templates.json'))
const helix = require.resolve('@fusion.dev/helix-cli/bin.mjs')

const { status, error } = spawnSync(process.execPath, [helix, 'new', ...process.argv.slice(2)], {
  env: { ...process.env, HELIX_TEMPLATES: process.env.HELIX_TEMPLATES ?? templates },
  stdio: 'inherit',
})
/* A status means it ran, whatever `error` says: see the same line in the shim. */
if (error && status === null) {
  console.error(`create-helix-app: could not run helix: ${error.message}`)
  process.exit(70)
}
process.exit(status ?? 70)

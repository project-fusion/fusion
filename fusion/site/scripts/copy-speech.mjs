#!/usr/bin/env bun
/**
 * Puts the dictation engine's worker where the site serves it from.
 *
 * `@fusion.dev/helix-speech` runs Moonshine in a worker that loads an
 * Emscripten module beside it. Next's bundler would turn the worker into a
 * hashed asset without its neighbors, as it does MapLibre's, so the folder is
 * served from `public/helix-speech/` as the package ships it, and
 * `components/helix-elements` points the engine at it.
 *
 * A build output like `maplibre-copy`: declared in `turbo.json` and ignored by
 * git, so the served files are always the installed package's.
 */
import { cpSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const source = dirname(
  fileURLToPath(import.meta.resolve('@fusion.dev/helix-speech/worker/moonshine-worker.js')),
)
const served = join(import.meta.dirname, '..', 'public', 'helix-speech')
rmSync(served, { force: true, recursive: true })
cpSync(source, served, { recursive: true })

console.log('speech-copy: helix-speech/dist/worker copied to public/helix-speech')

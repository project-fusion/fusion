#!/usr/bin/env bun
/**
 * Puts MapLibre's worker where the site serves it from.
 *
 * MapLibre 6 runs its worker from a file of its own, `maplibre-gl-worker.mjs`,
 * which imports `maplibre-gl-shared.mjs` beside it. Next's bundler turns the
 * worker into a hashed asset without that neighbor, so the worker fails on its
 * first import and the map never asks for a tile. Both are served from
 * `public/maplibre/` instead, as MapLibre's installation guide says for
 * Next.js, and `utils/maplibre` points MapLibre at them.
 *
 * A build output like the theme engine's `wasm-copy`: declared in `turbo.json`
 * and ignored by git, so the served files are always the installed version's.
 * **In a folder named for that version**, which `utils/maplibre` points
 * MapLibre at, so a tab opened before an upgrade keeps the worker it was built
 * with; older folders are cleared.
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const { version } = JSON.parse(
  readFileSync(fileURLToPath(import.meta.resolve('maplibre-gl/package.json')), 'utf8'),
)
const root = join(import.meta.dirname, '..', 'public', 'maplibre')
rmSync(root, { force: true, recursive: true })
const served = join(root, version)
mkdirSync(served, { recursive: true })

for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  const source = fileURLToPath(import.meta.resolve(`maplibre-gl/dist/${file}`))
  copyFileSync(source, join(served, basename(source)))
}

console.log(
  `maplibre-copy: MapLibre ${version}'s worker and shared module copied to public/maplibre/${version}`,
)

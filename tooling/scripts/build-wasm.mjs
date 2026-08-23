/**
 * Builds the browser distribution of `helix-theme`.
 *
 * **One folder, two distributions**, which is what `helix/theme` is for: the
 * crate is the engine and this is how a browser reaches it. Two implementations
 * of a search-based derivation disagree by construction, since iteration count,
 * bisection order and float arithmetic are implementation choices, so the
 * JavaScript half has to be a wrapper rather than a second engine.
 *
 * `wasm-bindgen` directly rather than `wasm-pack`, which is a wrapper around
 * exactly these two commands plus an npm package it wants to write for us. This
 * package already has a `package.json` with an argued-over `exports` map in it.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const ARTIFACT = 'target/wasm32-unknown-unknown/release/helix_theme.wasm'
export const OUT = join(ROOT, 'helix/theme/wasm')

const run = (command, args) => {
  execFileSync(command, args, { cwd: ROOT, stdio: 'inherit' })
}

/* `--target web`, not `bundler`. The bundler target emits an ES module with a
   bare `import` of the `.wasm` file, which every bundler resolves differently
   and Turbopack resolves not at all today; `web` emits an explicit `init(url)`
   that works from a plain script, from Next, and from Node with a file URL.
   One artifact and no build-tool opinion in it. */
run('cargo', [
  'build',
  '-p',
  'helix-theme',
  '--features',
  'wasm',
  '--target',
  'wasm32-unknown-unknown',
  '--release',
])

if (!existsSync(join(ROOT, ARTIFACT))) {
  console.error(`wasm: cargo reported success and wrote no ${ARTIFACT}`)
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
run('wasm-bindgen', ['--target', 'web', '--out-dir', OUT, ARTIFACT])

console.log(`wasm: helix-theme built for the browser into ${OUT.replace(`${ROOT}/`, '')}`)

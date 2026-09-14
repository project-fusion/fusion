/**
 * Builds the browser distribution of `fusion-helix-theme`.
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
import { join } from 'node:path'
import { root } from '@fusion.dev/scripts/workspace'

const ARTIFACT = 'target/wasm32-unknown-unknown/release/fusion_helix_theme.wasm'
const OUT = join(root, 'helix/theme/wasm')

/* **A bundler cannot be asked to find the binary, which was measured rather
   than assumed.** The generated loader resolves its module with
   `new URL('fusion_helix_theme_bg.wasm', import.meta.url)`, and Turbopack treats
   that as a module specifier and fails the build outright: "Can't resolve
   'fusion_helix_theme_bg.wasm'". Node cannot use that default either, its
   `fetch` refusing a `file:` URL. So `initTheme` takes the source as a required
   argument, and a consumer serves the file itself: the site copies it under
   `public/` with `turbo run wasm-copy`, on terms this repository controls
   rather than whatever a bundler decides about an asset import this year. */

const run = (command, args) => {
  execFileSync(command, args, { cwd: root, stdio: 'inherit' })
}

/* `--target web`, not `bundler`. The bundler target emits an ES module with a
   bare `import` of the `.wasm` file, which every bundler resolves differently
   and Turbopack resolves not at all today; `web` emits an explicit `init(url)`
   that works from a plain script, from Next, and from Node with a file URL.
   One artifact and no build-tool opinion in it. */
run('cargo', [
  'build',
  '-p',
  'fusion-helix-theme',
  '--features',
  'wasm',
  '--target',
  'wasm32-unknown-unknown',
  '--release',
])

if (!existsSync(join(root, ARTIFACT))) {
  console.error(`wasm: cargo reported success and wrote no ${ARTIFACT}`)
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
run('wasm-bindgen', ['--target', 'web', '--out-dir', OUT, ARTIFACT])

console.log(`wasm: fusion-helix-theme built for the browser into ${OUT.replace(`${root}/`, '')}`)

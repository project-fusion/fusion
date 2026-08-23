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
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const ARTIFACT = 'target/wasm32-unknown-unknown/release/helix_theme.wasm'
export const OUT = join(ROOT, 'helix/theme/wasm')

/**
 * The site's copy, served as a static file.
 *
 * **A bundler cannot be asked to find this, which was measured rather than
 * assumed.** The generated loader resolves its module with
 * `new URL('helix_theme_bg.wasm', import.meta.url)`, and Turbopack treats that
 * as a module specifier and fails the build outright: "Can't resolve
 * 'helix_theme_bg.wasm'". Node cannot use that default either, its `fetch`
 * refusing a `file:` URL. So `initTheme` takes the source as a required
 * argument, and the site says where it put it.
 *
 * The same shape `frame.js` already uses, and for a related reason: a static
 * file under `public/` is served on terms this repository controls rather than
 * on whatever a bundler decides about an asset import this year.
 */
const SERVED = join(ROOT, 'site/ui/public/helix/theme.wasm')

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

mkdirSync(dirname(SERVED), { recursive: true })
copyFileSync(join(OUT, 'helix_theme_bg.wasm'), SERVED)

console.log(
  `wasm: helix-theme built for the browser into ${OUT.replace(`${ROOT}/`, '')}, ` +
    `and served from ${SERVED.replace(`${ROOT}/`, '')}`,
)

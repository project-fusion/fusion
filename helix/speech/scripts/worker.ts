/**
 * Finishes `dist/worker`, the folder the engine starts its worker from: the
 * worker bundled with Moonshine's JavaScript layer in place of what `tsc`
 * emitted for `src/worker`, and both builds of the Emscripten module beside
 * it. The folder runs as it is served, so an app's bundler never follows the
 * worker or the module's Node branches.
 *
 * Runs after `tsc`, which writes the worker it bundles, and before
 * `single-thread.ts`, which adds the single-thread build to the folder.
 */
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const folder = join(import.meta.dir, '..', 'dist', 'worker')
const bundled = mkdtempSync(join(tmpdir(), 'helix-speech-worker-'))

/* Moonshine's loader imports its threaded module for when no factory is
   given. The worker always gives one, so that import is left unresolved. */
const built = await Bun.build({
  entrypoints: [join(folder, 'moonshine-worker.js')],
  format: 'esm',
  minify: true,
  outdir: bundled,
  plugins: [
    {
      name: 'leave-the-module',
      setup(build) {
        build.onResolve({ filter: /moonshine\.mjs$/ }, (args) => ({
          external: true,
          path: args.path,
        }))
      },
    },
  ],
  target: 'browser',
})
if (!built.success) {
  throw new AggregateError(built.logs, 'The worker did not bundle.')
}
copyFileSync(join(bundled, 'moonshine-worker.js'), join(folder, 'moonshine-worker.js'))
rmSync(bundled, { force: true, recursive: true })

const threaded = dirname(fileURLToPath(import.meta.resolve('@moonshine-ai/moonshine-wasm')))
mkdirSync(join(folder, 'threaded'), { recursive: true })
for (const file of ['moonshine.mjs', 'moonshine.wasm']) {
  copyFileSync(join(threaded, file), join(folder, 'threaded', file))
}

/**
 * Builds the sandbox preview document as a static, self-contained page.
 *
 * It was a Next route, and a route cannot be sandboxed. A frame with
 * `sandbox="allow-scripts"` has an opaque origin, and from there every module
 * import and `fetch` back to the site is cross-origin without CORS headers, so
 * the route's own chunks never load and the document never comes alive.
 * Measured: the frame said nothing at all.
 *
 * A classic `<script src>` is not CORS-checked and does run there, which is why
 * this emits one IIFE with the component library inside it, and a plain HTML
 * document beside it. `<link rel="stylesheet">` is not CORS-checked either.
 *
 * The point of all of it: markup typed into the sandbox executes in a document
 * that cannot read the site's cookies, its storage, or the page around it.
 *
 * Run with bun, not node: `Bun.build` is the bundler.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const out = join(root, 'site/ui/public/sandbox')
const entry = join(root, 'site/ui/lib/preview-frame-entry.ts')

/* The layers, in the order a consumer is told to import them. `elements.css` is
   generated from the element sources and hides each tag until it upgrades. */
const layers = [
  'helix/styles/src/tokens.css',
  'helix/styles/src/primitives.css',
  'helix/styles/src/base.css',
  'helix/web/elements.css',
]

await rm(out, { force: true, recursive: true })
await mkdir(out, { recursive: true })

const built = await Bun.build({
  entrypoints: [entry],
  format: 'iife',
  minify: true,
  target: 'browser',
})

if (!built.success) {
  for (const log of built.logs) {
    console.error(log)
  }
  process.exit(1)
}

const script = await built.outputs[0].text()
await writeFile(join(out, 'frame.js'), script)

const css = await Promise.all(layers.map((layer) => readFile(join(root, layer), 'utf8')))
await writeFile(join(out, 'frame.css'), css.join('\n'))

/* `preview-root` carries the layout mode, and the example's markup replaces its
   contents. The script is deferred so the element exists before it runs. */
await writeFile(
  join(out, 'frame.html'),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sandbox preview</title>
    <link rel="stylesheet" href="./frame.css" />
  </head>
  <body>
    <div id="preview-root" data-layout="padded"></div>
    <script src="./frame.js" defer></script>
  </body>
</html>
`,
)

const size = Math.round((script.length + css.join('').length) / 1024)
console.log(`frame: ${size} KB, ${layers.length} style layers, one classic script`)

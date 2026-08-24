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

import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const out = join(root, 'site/ui/public/sandbox')
const entry = join(root, 'site/ui/preview/preview-frame-entry.ts')

/* The layers, in the order a consumer is told to import them. `elements.css` is
   generated from the element sources and hides each tag until it upgrades. */
const layers = [
  'helix/styles/src/tokens.css',
  'helix/styles/src/primitives.css',
  'helix/styles/src/base.css',
  'helix/styled/elements.css',
  // The frame's own layout modes, which belong to the document rather than to
  // the site that used to render it.
  'site/ui/preview/preview-frame.css',
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

/* What the frame asks for, stamped with what it got.
 *
 * The frame loads its bundle with a plain `<script src="./frame.js">`, and a
 * static file under `public/` is served with caching headers, so a browser that
 * has seen one build keeps it. The failure that causes is nasty because it does
 * not look like caching: an element added since the cached bundle is simply not
 * defined, so it never upgrades, and an unknown element renders its children
 * inline. A dialog looks permanently open with buttons that do nothing, which
 * reads as a broken component rather than a stale file.
 *
 * Reported exactly that way, and it cost an hour of looking at the component.
 * The content decides the token, so a rebuild that changes nothing changes no
 * URL and the cache still does its job. */
const stamp = (contents) => createHash('sha256').update(contents).digest('hex').slice(0, 8)

const css = await Promise.all(layers.map((layer) => readFile(join(root, layer), 'utf8')))

/* The brand faces, inlined.
 *
 * The frame is a sandboxed document with an opaque origin. A stylesheet and a
 * classic script it can fetch, because neither is CORS-checked; a font is,
 * because `@font-face` fetches in CORS mode, and a request from an opaque
 * origin arrives as `Origin: null` with nothing on the other end configured to
 * allow it. `next/font` is no help either: it emits URLs only the site's own
 * build knows.
 *
 * So the same files the site loads go in as data URIs, which are not fetched at
 * all and therefore have nothing to be refused. Eighty kilobytes for the three
 * latin faces, against a frame that already carries the component library.
 *
 * Without this the preview rendered in the fallback stack while the site around
 * it rendered in the brand's, so the one place a reader compares a component
 * against the real thing was the one place the type was wrong.
 */
const faces = [
  { file: 'geist-latin.woff2', name: 'Fusion Sans', weight: '100 900' },
  { file: 'fira-code-latin.woff2', name: 'Fusion Mono', weight: '300 700' },
  { file: 'funnel-display-latin.woff2', name: 'Fusion Display', weight: '300 800' },
]

const fonts = await Promise.all(
  faces.map(async ({ file, name, weight }) => {
    const data = await readFile(join(root, 'site/ui/app/fonts', file))
    return `@font-face {
  font-display: swap;
  font-family: '${name}';
  font-style: normal;
  font-weight: ${weight};
  src: url(data:font/woff2;base64,${data.toString('base64')}) format('woff2');
}`
  }),
)

/* After the layers, so these win. `primitives.css` sets the sans and mono
   families to system stacks and leaves display unset, which is exactly right
   for a consumer who brings their own and exactly wrong here, where the whole
   point is to be the site. */
const families = `:root {
  --_helix-family-sans: 'Fusion Sans', ui-sans-serif, system-ui, sans-serif;
  --_helix-family-mono: 'Fusion Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  --_helix-family-display: 'Fusion Display', 'Fusion Sans', ui-sans-serif, sans-serif;
}`

const styles = [...css, ...fonts, families].join('\n')
await writeFile(join(out, 'frame.css'), styles)

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
    <link rel="stylesheet" href="./frame.css?v=${stamp(styles)}" />
  </head>
  <body>
    <div id="preview-root" data-layout="padded"></div>
    <script src="./frame.js?v=${stamp(script)}" defer></script>
  </body>
</html>
`,
)

const size = Math.round((script.length + css.join('').length) / 1024)
console.log(`frame: ${size} KB, ${layers.length} style layers, one classic script`)

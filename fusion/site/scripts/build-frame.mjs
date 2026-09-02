/**
 * Builds the sandbox preview document as a static, self-contained page.
 *
 * A Next route cannot be sandboxed. A frame with `sandbox="allow-scripts"` has
 * an opaque origin, and from there every module import and `fetch` back to the
 * site is cross-origin without CORS headers, so the route's own chunks never
 * load and the document never comes alive.
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

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const out = join(root, 'fusion/site/public/sandbox')
const entry = join(root, 'fusion/site/preview/preview-frame-entry.ts')

/* The layers, in the order a consumer is told to import them. `elements.css` is
   generated from the element sources and hides each tag until it upgrades.
 *
 * **Resolved through each package's `exports`, so the frame gets what a consumer
 * gets.** Read from `src` these were 108,798 bytes for the three `helix-styles`
 * layers against 49,409 shipped, the difference being the prose `styles-dist`
 * strips. A reader of the sandbox was downloading the reasoning. */
const layers = [
  ...['tokens.css', 'primitives.css', 'base.css'].map((name) =>
    fileURLToPath(import.meta.resolve(`@fusion.dev/helix-styles/${name}`)),
  ),
  fileURLToPath(import.meta.resolve('@fusion.dev/helix/elements.css')),
  // The frame's own layout modes, which belong to the document rather than to
  // the site around it.
  join(root, 'fusion/site/preview/preview-frame.css'),
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
 * The content decides the token, so a rebuild that changes nothing changes no
 * URL and the cache still does its job. */
const stamp = (contents) => createHash('sha256').update(contents).digest('hex').slice(0, 8)

const css = await Promise.all(layers.map((layer) => readFile(layer, 'utf8')))

/* The brand faces, fetched rather than inlined.
 *
 * The frame is a sandboxed document with an opaque origin, so a font request
 * from it arrives as `Origin: null`: `@font-face` fetches in CORS mode, so the
 * other end has to allow it. What is *not* true is that the frame cannot
 * resolve a URL. It loads from `/sandbox/frame.html`, an ordinary same-origin
 * address, so only the origin is opaque and a path resolves the way any page's
 * does.
 *
 * So this takes one header. `next.config.ts` sends
 * `Access-Control-Allow-Origin: *` for `/fonts/*`, the faces sit at a stable
 * public path instead of behind `next/font`'s content hash, and the site and
 * the frame ask for the same three URLs.
 *
 * **Do not inline them instead**, which is the shorter-looking fix: base64
 * costs 111,208 bytes over 83,340 bytes of woff2, 38% of a 292,825 byte
 * `frame.css`. Worse than its size, the stylesheet is stamped with a hash of
 * its own contents, so inlined faces ride inside a bundle re-stamped by any
 * change to any token in `helix/styles`, and a one-character color change costs
 * every preview visitor a fresh 111KB of font.
 *
 * Without any of this the preview rendered in the fallback stack while the site
 * around it rendered in the brand's, so the one place a reader compares a
 * component against the real thing was the one place the type was wrong.
 */
const faces = [
  { file: 'geist-latin.woff2', name: 'Fusion Sans', weight: '100 900' },
  { file: 'fira-code-latin.woff2', name: 'Fusion Mono', weight: '300 700' },
  { file: 'funnel-display-latin.woff2', name: 'Fusion Display', weight: '300 800' },
]

const fonts = faces.map(
  ({ file, name, weight }) => `@font-face {
  font-display: swap;
  font-family: '${name}';
  font-style: normal;
  font-weight: ${weight};
  src: url(/fonts/${file}) format('woff2');
}`,
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

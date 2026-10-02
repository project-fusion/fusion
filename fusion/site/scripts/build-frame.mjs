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
const graphEntry = join(root, 'fusion/site/preview/preview-graph-entry.ts')
const cosmosEntry = join(root, 'fusion/site/preview/preview-graph-cosmos-entry.ts')
const threeEntry = join(root, 'fusion/site/preview/preview-graph-three-entry.ts')
const mapEntry = join(root, 'fusion/site/preview/preview-map-entry.ts')
const maplibreEntry = join(root, 'fusion/site/preview/preview-maplibre-entry.ts')

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
  fileURLToPath(import.meta.resolve('@fusion.dev/helix-styles/elements.css')),
  // The frame's own layout modes, which belong to the document rather than to
  // the site around it.
  join(root, 'fusion/site/preview/preview-frame.css'),
]

await rm(out, { force: true, recursive: true })
await mkdir(out, { recursive: true })

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

/* **A live map, in two files the frame loads only when a render carries one.**
 *
 * MapLibre, bundled into a classic script by `preview-maplibre-entry.ts`:
 * MapLibre 6 ships as modules, which an opaque origin cannot load from the
 * site, and its worker is bundled into that script, which starts it.
 * Then the map chunk, which is the connector and the style compiler, with
 * MapLibre's stylesheet inlined because the chunk is what knows it needs one.
 * Both are classic scripts for the reason the frame is one.
 *
 * `frame.js` learns both stamped URLs at build time, so a new MapLibre or a
 * new chunk is a new URL the moment it is built. */
/* **MapLibre's worker as one classic script**, its shared module inside it,
   which the entry carries and the frame starts from a `blob:` URL: an opaque
   origin can start no worker from the site, nor one that imports. */
const workerBuilt = await Bun.build({
  define: { 'import.meta.url': 'globalThis.location.href' },
  entrypoints: [fileURLToPath(import.meta.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs'))],
  format: 'iife',
  minify: true,
  target: 'browser',
})
if (!workerBuilt.success) {
  for (const log of workerBuilt.logs) {
    console.error(log)
  }
  process.exit(1)
}
const maplibreBuilt = await Bun.build({
  /* **The page's address for the module's own**, which a classic script has
     no way to name, `import.meta` being a syntax error there. MapLibre reads
     it to find its worker when none is set, and the entry sets one. */
  define: {
    __MAPLIBRE_WORKER__: JSON.stringify(await workerBuilt.outputs[0].text()),
    'import.meta.url': 'globalThis.location.href',
  },
  entrypoints: [maplibreEntry],
  format: 'iife',
  minify: true,
  target: 'browser',
})
if (!maplibreBuilt.success) {
  for (const log of maplibreBuilt.logs) {
    console.error(log)
  }
  process.exit(1)
}
const maplibre = await maplibreBuilt.outputs[0].text()
await writeFile(join(out, 'maplibre-gl.js'), maplibre)
const mapBuilt = await Bun.build({
  define: {
    __MAPLIBRE_CSS__: JSON.stringify(
      await readFile(
        fileURLToPath(import.meta.resolve('maplibre-gl/dist/maplibre-gl.css')),
        'utf8',
      ),
    ),
  },
  entrypoints: [mapEntry],
  format: 'iife',
  minify: true,
  target: 'browser',
})
if (!mapBuilt.success) {
  for (const log of mapBuilt.logs) {
    console.error(log)
  }
  process.exit(1)
}
const mapScript = await mapBuilt.outputs[0].text()
await writeFile(join(out, 'map.js'), mapScript)

/* **A live graph, in one file the frame loads only when a render carries
 * one**: the connector, Sigma, graphology and ForceAtlas2, whose layout
 * starts its own worker from a `blob:` URL. */
const graphBuilt = await Bun.build({
  entrypoints: [graphEntry],
  format: 'iife',
  minify: true,
  target: 'browser',
})
if (!graphBuilt.success) {
  for (const log of graphBuilt.logs) {
    console.error(log)
  }
  process.exit(1)
}
const graphScript = await graphBuilt.outputs[0].text()
await writeFile(join(out, 'graph.js'), graphScript)

/* The same for a graph cosmos.gl draws, which lays out and draws on the GPU. */
const cosmosBuilt = await Bun.build({
  entrypoints: [cosmosEntry],
  format: 'iife',
  minify: true,
  target: 'browser',
})
if (!cosmosBuilt.success) {
  for (const log of cosmosBuilt.logs) {
    console.error(log)
  }
  process.exit(1)
}
const cosmosScript = await cosmosBuilt.outputs[0].text()
await writeFile(join(out, 'graph-cosmos.js'), cosmosScript)

/* The same for a graph three.js draws, in three dimensions. */
const threeBuilt = await Bun.build({
  entrypoints: [threeEntry],
  format: 'iife',
  minify: true,
  target: 'browser',
})
if (!threeBuilt.success) {
  for (const log of threeBuilt.logs) {
    console.error(log)
  }
  process.exit(1)
}
const threeScript = await threeBuilt.outputs[0].text()
await writeFile(join(out, 'graph-three.js'), threeScript)

const built = await Bun.build({
  define: {
    __PREVIEW_GRAPH_COSMOS_URL__: JSON.stringify(`./graph-cosmos.js?v=${stamp(cosmosScript)}`),
    __PREVIEW_GRAPH_THREE_URL__: JSON.stringify(`./graph-three.js?v=${stamp(threeScript)}`),
    __PREVIEW_GRAPH_URL__: JSON.stringify(`./graph.js?v=${stamp(graphScript)}`),
    __PREVIEW_MAP_URL__: JSON.stringify(`./map.js?v=${stamp(mapScript)}`),
    __PREVIEW_MAPLIBRE_URL__: JSON.stringify(`./maplibre-gl.js?v=${stamp(maplibre)}`),
  },
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
const mapSize = Math.round((maplibre.length + mapScript.length) / 1024)
const graphSize = Math.round(graphScript.length / 1024)
const cosmosSize = Math.round(cosmosScript.length / 1024)
const threeSize = Math.round(threeScript.length / 1024)
console.log(
  `frame: ${size} KB, ${layers.length} style layers, one classic script, and ${mapSize} KB of map and ${graphSize} KB of graph, ${cosmosSize} KB drawn by cosmos.gl, or ${threeSize} KB drawn by three.js, loaded only when a render carries one`,
)

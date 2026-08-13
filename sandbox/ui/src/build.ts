import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Generates the sandbox as a single self-contained HTML file.
 *
 * One file, no server, no framework, and no network requests: it opens from
 * disk, and it can be published somewhere for review without a deployment. That
 * is also what makes it correct as an artifact, where a strict content policy
 * blocks every external host.
 *
 * The component list is not written anywhere. It comes from the manifests, so
 * adding a component adds a sandbox page with its full API and no edit here.
 */

const root = join(import.meta.dir, '..')
const repo = join(root, '..', '..')

const read = (...parts: string[]): string => readFileSync(join(repo, ...parts), 'utf8')

/** Both tiers, so the sandbox shows what the headless tier looks like unstyled. */
const manifests = ['helix/web/custom-elements.json', 'helix/headless/custom-elements.json'].map(
  (path) => JSON.parse(read(path)) as { modules: unknown[] },
)
const manifest = { modules: manifests.flatMap((entry) => entry.modules) }

const bundle = await Bun.build({
  entrypoints: [join(root, 'src/main.ts')],
  minify: true,
  target: 'browser',
})

if (!bundle.success) {
  for (const message of bundle.logs) {
    console.error(message)
  }
  process.exit(1)
}

const script = await (bundle.outputs[0] as { text(): Promise<string> }).text()

const css = [
  read('helix/styles/src/primitives.css'),
  read('helix/styles/src/tokens.css'),
  read('helix/styles/src/base.css'),
  read('helix/web/elements.css'),
  readFileSync(join(root, 'src/app.css'), 'utf8'),
].join('\n')

/** Markup and behavior, with no document scaffolding around it. */
const page = `<style>${css}</style>
<aside id="sidebar">
  <div id="brand"><strong>Helix</strong><span>sandbox</span></div>
  <input id="search" type="search" placeholder="Filter components" aria-label="Filter components">
  <div id="nav"></div>
</aside>
<main>
  <div id="topbar"><button id="theme" type="button">Light</button></div>
  <div id="meta"></div>
  <div id="stage"></div>
  <code id="snippet"></code>
  <div class="panels">
    <section class="panel"><h3>Properties</h3><div id="controls"></div></section>
    <section class="panel"><h3>Events</h3><div id="log"></div></section>
  </div>
  <div id="reference"></div>
</main>
<script type="application/json" id="manifest">${JSON.stringify(manifest).replace(/</g, '\\u003c')}</script>
<script>${script}</script>
`

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Helix Sandbox</title>
</head>
<body>
${page}</body>
</html>
`

mkdirSync(join(root, 'dist'), { recursive: true })
writeFileSync(join(root, 'dist/index.html'), html)

// Body-only variant. An artifact host supplies the document scaffolding and
// blocks every external host, which this already satisfies: the styles, the
// manifest, and the bundle are all inline.
writeFileSync(join(root, 'dist/artifact.html'), `<title>Helix Sandbox</title>\n${page}`)

const kb = (value: number): string => `${Math.round(value / 1024)} kB`
console.log(
  `sandbox: ${manifest.modules.length} modules, script ${kb(script.length)}, page ${kb(html.length)}`,
)

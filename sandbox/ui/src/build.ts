import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
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
 * Examples are the same: they are `.examples/*.html` files colocated with the
 * component, read off disk at build time. A map in this package would be one
 * more thing to forget, and forgetting it looks exactly like a component with
 * no examples.
 */

const root = join(import.meta.dir, '..')
const repo = join(root, '..', '..')

const read = (...parts: string[]): string => readFileSync(join(repo, ...parts), 'utf8')

/** Both tiers, so the sandbox shows what the headless tier looks like unstyled. */
const manifests = ['helix/web/custom-elements.json', 'helix/headless/custom-elements.json'].map(
  (path) => JSON.parse(read(path)) as { modules: unknown[] },
)
const manifest = { modules: manifests.flatMap((entry) => entry.modules) }

/**
 * Examples per family folder, read from `src/<family>/.examples/*.html`.
 *
 * Keyed by folder rather than by tag, because a family's examples belong to the
 * family: `accordion/.examples/` covers both `helix-accordion` and
 * `helix-accordion-item`, and the component resolves its folder from the
 * `modulePath` the manifest already records.
 */
const examples: Record<string, Array<{ html: string; slug: string }>> = {}
const componentRoot = join(repo, 'helix/web/src')

for (const family of readdirSync(componentRoot)) {
  const dir = join(componentRoot, family, '.examples')
  if (!existsSync(dir)) {
    continue
  }
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.html'))
    // `default` first, then alphabetical: it is the headline preview, and the
    // rest are named variants.
    .sort((a, b) => (a === 'default.html' ? -1 : b === 'default.html' ? 1 : a.localeCompare(b)))

  examples[family] = files.map((file) => ({
    html: readFileSync(join(dir, file), 'utf8').trim(),
    slug: file.replace(/\.html$/, ''),
  }))
}

const exampleCount = Object.values(examples).reduce((total, list) => total + list.length, 0)

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
  <div id="examples-bar"></div>
  <div id="stage"></div>
  <label class="srOnly" for="source">Example markup</label>
  <textarea id="source" spellcheck="false"></textarea>
  <div class="panels">
    <section class="panel"><h3>Properties</h3><div id="controls"></div></section>
    <section class="panel"><h3>Events</h3><div id="log"></div></section>
  </div>
  <div id="reference"></div>
</main>
<script type="application/json" id="manifest">${JSON.stringify(manifest).replace(/</g, '\\u003c')}</script>
<script type="application/json" id="examples">${JSON.stringify(examples).replace(/</g, '\\u003c')}</script>
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
  `sandbox: ${manifest.modules.length} modules, ${exampleCount} examples, script ${kb(script.length)}, page ${kb(html.length)}`,
)

/**
 * Bundles the DOM specs so they can run in a browser.
 *
 * The sandbox runs a component's own specs against the real platform, so the
 * same files that run in CI are the ones that run there. `bun:test` and
 * `@fusion-io/testing/dom` are resolved to the browser harness instead, which
 * is the whole of the difference: no rewriting, no second suite to keep in
 * step, and a spec that is deleted stops being reported the same day.
 *
 * One `Bun.build` for every family with `splitting`, so Lit and anything two
 * families share is emitted once rather than into each of thirty-six bundles.
 *
 * Run with bun, not node: `Bun.build` is the bundler.
 */

import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const source = join(root, 'helix/web/src')
const harness = join(root, 'tooling/testing/src/browser.ts')
const entries = join(root, '.local/spec-entries')
const out = join(root, 'site/ui/public/specs')

/** Every family holding at least one DOM spec, with the specs it holds. */
const families = async () => {
  const found = new Map()
  for (const family of await readdir(source, { withFileTypes: true })) {
    if (!family.isDirectory() || family.name === 'testing') {
      continue
    }
    const specs = []
    for (const part of await readdir(join(source, family.name), { withFileTypes: true })) {
      if (!part.isDirectory()) {
        continue
      }
      for (const file of await readdir(join(source, family.name, part.name))) {
        if (file.endsWith('.dom.spec.ts')) {
          specs.push(join(source, family.name, part.name, file))
        }
      }
    }
    if (specs.length > 0) {
      found.set(family.name, specs.sort())
    }
  }
  return found
}

/** Points the spec harness imports at the browser one. */
const useBrowserHarness = {
  name: 'browser-spec-harness',
  setup(build) {
    build.onResolve({ filter: /^(bun:test|@fusion-io\/testing\/dom)$/ }, () => ({
      path: harness,
    }))
  },
}

const found = await families()
await rm(entries, { force: true, recursive: true })
await rm(out, { force: true, recursive: true })
await mkdir(entries, { recursive: true })

/**
 * Lit's two unsafe directives, named by every entry so they share one chunk.
 *
 * `unsafe-svg` extends `unsafe-html`, and splitting groups a module by which
 * entries reach it: nearly every family reaches `unsafe-svg`, through the icons,
 * and far fewer reach `unsafe-html`. So the two landed in different chunks with
 * the subclass in the shared one, and the chunks imported each other, because
 * the subclass needs its base and the base needs Lit's directive machinery back
 * out of the shared chunk.
 *
 * An `extends` clause is evaluated the moment its module runs, so neither chunk
 * could go first: `Cannot access 'JZ' before initialization`, on 66 of 74
 * families, which is every family that reaches the cycle at all. Naming both
 * here makes them reachable from every entry, so they are grouped together and
 * the edge between them stops crossing a chunk boundary.
 *
 * Imported for the grouping rather than for the bindings, which is why nothing
 * is named: this is a statement about chunking, and deleting it puts the cycle
 * back.
 */
const SHARED = "import 'lit/directives/unsafe-html.js'\nimport 'lit/directives/unsafe-svg.js'\n"

const written = []
for (const [family, specs] of found) {
  const file = join(entries, `${family}.ts`)
  const imports = specs.map((spec) => `import '${relative(entries, spec).replaceAll('\\', '/')}'`)
  // `claim` runs after the spec imports above have evaluated, which hoisting
  // guarantees, and takes exactly the tests they registered. The harness is a
  // shared chunk, so without this a family would run every family opened before
  // it as well.
  await writeFile(
    file,
    `${SHARED}${imports.join('\n')}\nimport { claim } from '${relative(entries, harness).replaceAll('\\', '/')}'\nexport const run = claim()\n`,
  )
  written.push(file)
}

const result = await Bun.build({
  entrypoints: written,
  minify: true,
  // No [dir]: the entries are generated in a scratch directory, and that path
  // is not something the served URL should carry.
  naming: { chunk: '[name]-[hash].[ext]', entry: '[name].[ext]' },
  outdir: out,
  plugins: [useBrowserHarness],
  splitting: true,
  target: 'browser',
})

if (!result.success) {
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

await rm(entries, { force: true, recursive: true })

const bytes = result.outputs.reduce((total, output) => total + output.size, 0)
const specCount = [...found.values()].reduce((total, specs) => total + specs.length, 0)
console.log(
  `specs: ${found.size} families, ${specCount} files, ${result.outputs.length} chunks, ${Math.round(bytes / 1024)} KB`,
)

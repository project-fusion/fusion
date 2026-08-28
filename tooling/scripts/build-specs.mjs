/**
 * Bundles the DOM specs so they can run in a browser.
 *
 * The sandbox runs a component's own specs against the real platform, so the
 * same files that run in CI are the ones that run there. `bun:test` and
 * `@fusion.dev/helix-testing/dom` are resolved to the browser harness instead, which
 * is the whole of the difference: no rewriting, no second suite to keep in
 * step, and a spec that is deleted stops being reported the same day.
 *
 * Two `Bun.build` calls: one shared runtime, and one bundle per family that
 * imports it rather than inlining it.
 *
 * **Splitting was on and had to come off.** It emitted Lit and anything two
 * families shared once instead of into every bundle, which is the right instinct
 * and is not worth what it costs here: a family's entry now imports *both*
 * tiers, because its behavior is specified in `helix/headless` and its
 * appearance in `helix/styled`, and the styled class extends the headless one. An
 * `extends` clause is evaluated the moment its module runs, so when the two land
 * in different chunks neither can go first, and every entry dies on
 * `ReferenceError: Cannot access 'A' before initialization` before a single test
 * runs. Measured: 218 chunks and a passing suite, then two more spec files took
 * it to 450 chunks and all 88 families failed at load.
 *
 * **So the shared parts are shared by being external, not by being chunked.**
 * `RUNTIME` below is built once with splitting on, and every family resolves
 * those specifiers to a URL instead of inlining them. The cycle above cannot
 * reach it: it is a fact about Helix's two tiers, and the runtime carries
 * neither. What it carries is Lit and the icon set, and both were in all 88
 * bundles. Measured: 14,674 KB became 9,350 KB and a 65 KB runtime, and a
 * family that was 132 KB is 71 KB against a runtime the next family already
 * has.
 *
 * **The duplication that mattered was not the bytes.** Two families opened in
 * one sandbox session were two Lit instances in one document, so `unsafeSVG`
 * from the first was a directive the second's `render` did not recognize, and
 * `helix-icon` was defined by whichever family ran first while the other's specs
 * held a different class of the same name. `helix/core`'s `customElement` warns
 * about exactly this and cannot fix it. One runtime is the fix.
 *
 * Run with bun, not node: `Bun.build` is the bundler.
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * Both tiers, merged by family.
 *
 * The specs moved when the tiers stopped sharing tags: a family's functional
 * tests are `helix/headless`'s and its stylesheet tests are `helix/styled`'s, so
 * twenty files left one directory for the other. Reading only `helix/styled`,
 * which is what this did, would have dropped every one of them from the browser
 * runner while still printing a family count and a size, which is the shape of
 * a coverage loss nobody sees.
 *
 * Merged rather than kept apart, because the sandbox opens a *family*: pressing
 * Select should run what Select is tested by, and which tier a file sits in is
 * a fact about this repository rather than about the component.
 */
const SOURCES = [join(root, 'helix/headless/src'), join(root, 'helix/styled/src')]
const harness = join(root, 'helix/testing/src/browser.ts')
const entries = join(root, '.local/spec-entries')
const out = join(root, 'site/ui/public/specs')

/**
 * What every family imports instead of inlining, and the file each one gets.
 *
 * Keyed by specifier so the plugin below can refuse anything absent: a lit
 * subpath nobody listed would otherwise be inlined quietly, which is a second
 * Lit in the document and the exact fault this exists to remove.
 *
 * One entry per specifier rather than one file re-exporting all of them,
 * because `lit` and `lit/static-html.js` both export `html` and they are not
 * the same binding. A single flat module would have to drop one of them.
 *
 * **`@fusion.dev/helix-core` is deliberately not here**, and it is the obvious entry to
 * add: every family extends `HelixElement`, so with splitting off it is inlined
 * ninety-three times and it is most of what a bundle weighs. Measured 27 Aug
 * 2026, naming it took the family bundles from 9,143 KB to 3,017 KB.
 *
 * It also broke the sandbox family with `ReferenceError: <minified> is not
 * defined` at import, and cost 52 tests that stopped running behind it. The
 * runtime build below is `splitting: true`, so core does not arrive as one file:
 * it came out as ten `helix-core-*.js` chunks with circular initialization
 * between them, which is the cycle the family build's own `splitting: false`
 * comment describes, reached through a different door. The minified name moved
 * between builds, which is what says it is evaluation order rather than a bug in
 * the code.
 *
 * What makes it not worth retrying at the ratio it looks like it pays at: the
 * build succeeds, so there is no signal until a family fails at runtime, and
 * ninety-two of ninety-three passing is not a property that holds. These bundles
 * are gitignored artifacts, so the whole prize is a faster local spec run.
 */
const RUNTIME = {
  '@fusion.dev/helix-icons': 'helix-icons',
  lit: 'lit',
  'lit/decorators.js': 'lit-decorators',
  'lit/directives/repeat.js': 'lit-repeat',
  'lit/directives/style-map.js': 'lit-style-map',
  'lit/directives/unsafe-html.js': 'lit-unsafe-html',
  'lit/directives/unsafe-svg.js': 'lit-unsafe-svg',
  'lit/static-html.js': 'lit-static-html',
}

/** Every family holding at least one DOM spec, with the specs it holds. */
const families = async () => {
  const found = new Map()
  for (const source of SOURCES) {
    for (const family of await readdir(source, { withFileTypes: true })) {
      if (!family.isDirectory() || family.name === 'testing') {
        continue
      }
      const specs = found.get(family.name) ?? []
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
  }
  return found
}

/**
 * Points the shared specifiers at the built runtime, as a relative URL.
 *
 * Relative and not absolute, because the two places these bundles load from
 * disagree about the prefix: the sandbox serves them under `/specs/` and
 * `run-browser-specs.mjs` serves the same directory at its root. `./runtime/x.js`
 * is correct from both; `/specs/runtime/x.js` is correct from one.
 */
const shareRuntime = {
  name: 'shared-runtime',
  setup(build) {
    build.onResolve({ filter: /^(@fusion\.dev\/helix-icons|lit(\/.*)?)$/ }, ({ path }) => {
      const name = RUNTIME[path]
      if (!name) {
        throw new Error(
          `A spec reaches \`${path}\`, which the shared runtime does not carry. Add it to RUNTIME, ` +
            'or it is inlined into every family that imports it and the document holds two Lits.',
        )
      }
      return { external: true, path: `./runtime/${name}.js` }
    })
  },
}

/** Points the spec harness imports at the browser one. */
const useBrowserHarness = {
  name: 'browser-spec-harness',
  setup(build) {
    build.onResolve({ filter: /^(bun:test|@fusion\.dev\/helix-testing\/dom)$/ }, () => ({
      path: harness,
    }))
  },
}

const found = await families()
await rm(entries, { force: true, recursive: true })
await rm(out, { force: true, recursive: true })
await mkdir(entries, { recursive: true })

/**
 * The shared runtime, built before the families that import it.
 *
 * Splitting is on here and off below, and the difference is what each build
 * holds. This one holds libraries: `lit/directives/unsafe-svg.js` extends
 * `unsafe-html`, and grouping them is the whole reason splitting is safe to
 * ask for, since both are reachable from every entry and land together. The
 * family build holds Helix's two tiers, where the same grouping cannot be
 * arranged, so it stays off there.
 */
const runtimeEntries = join(entries, 'runtime')
await mkdir(runtimeEntries, { recursive: true })
await Promise.all(
  Object.entries(RUNTIME).map(([specifier, name]) =>
    writeFile(join(runtimeEntries, `${name}.ts`), `export * from '${specifier}'\n`),
  ),
)

const runtime = await Bun.build({
  entrypoints: Object.values(RUNTIME).map((name) => join(runtimeEntries, `${name}.ts`)),
  minify: true,
  naming: { chunk: '[name]-[hash].[ext]', entry: '[name].[ext]' },
  outdir: join(out, 'runtime'),
  splitting: true,
  target: 'browser',
})

if (!runtime.success) {
  for (const log of runtime.logs) {
    console.error(log)
  }
  process.exit(1)
}

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
    `${imports.join('\n')}\nimport { claim } from '${relative(entries, harness).replaceAll('\\', '/')}'\nexport const run = claim()\n`,
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
  plugins: [shareRuntime, useBrowserHarness],
  /* Off, for the reason the header gives: an entry holding both tiers of a
     family puts a subclass and its base in different chunks and the cycle is
     unresolvable. `SHARED` below fixed the same fault for one pair of Lit
     directives and cannot fix this one, since the pair is different per
     family. */
  splitting: false,
  target: 'browser',
})

if (!result.success) {
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

/**
 * The external specifiers, pointed at the runtime files after the fact.
 *
 * `shareRuntime` returns a path and Bun keeps the specifier: an external import
 * is emitted verbatim as `from"lit"`, which is a bare specifier and a browser
 * will not resolve one without an import map. esbuild honors the returned path
 * here and Bun does not, so the rewrite happens where the limitation is rather
 * than in the two documents that load these bundles.
 *
 * An import map was the other option and is worse in the place it has to go.
 * One of the two hosts is a Next route, so the map would have to be in the
 * document before Next's own module scripts trigger a load, and a map that
 * arrives late is a hard error rather than a fallback. This is a string
 * replacement over minified output, which is only safe because `from"` and
 * `import"` appear in import statements and nowhere else, and because the
 * assertion below fails the build if any specifier survives.
 */
const rewrites = Object.entries(RUNTIME).flatMap(([specifier, name]) => [
  [`from"${specifier}"`, `from"./runtime/${name}.js"`],
  [`import"${specifier}"`, `import"./runtime/${name}.js"`],
])

for (const file of await readdir(out)) {
  if (!file.endsWith('.js')) {
    continue
  }
  const path = join(out, file)
  let text = await readFile(path, 'utf8')
  for (const [before, after] of rewrites) {
    text = text.replaceAll(before, after)
  }
  const stranded = Object.keys(RUNTIME).filter(
    (specifier) => text.includes(`from"${specifier}"`) || text.includes(`import"${specifier}"`),
  )
  if (stranded.length > 0) {
    console.error(`specs: ${file} still imports ${stranded.join(', ')} by bare specifier`)
    process.exit(1)
  }
  await writeFile(path, text)
}
await rm(entries, { force: true, recursive: true })

/**
 * The families, written down rather than left to be guessed from filenames.
 *
 * The runner used to take every `.js` that did not look like a hashed chunk,
 * `-[a-z0-9]{8}.js`, and that is a guess a family name can satisfy by accident:
 * `video-playlist.js` ends in eight lowercase alphanumerics, so it was read as
 * a chunk and skipped. Its specs had never run in a browser and nothing said so,
 * because a suite that silently covers 87 of 88 families reports a clean pass.
 */
await writeFile(
  join(out, 'families.json'),
  `${JSON.stringify([...found.keys()].sort(), null, 2)}\n`,
)

const bytes = result.outputs.reduce((total, output) => total + output.size, 0)
const specCount = [...found.values()].reduce((total, specs) => total + specs.length, 0)
const runtimeBytes = runtime.outputs.reduce((total, output) => total + output.size, 0)
console.log(
  `specs: ${found.size} families, ${specCount} files, ${result.outputs.length} chunks, ` +
    `${Math.round(bytes / 1024)} KB, plus a ${Math.round(runtimeBytes / 1024)} KB shared runtime`,
)

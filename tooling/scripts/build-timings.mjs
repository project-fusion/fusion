#!/usr/bin/env node
/**
 * What a component costs in time, measured in a real browser.
 *
 * **Bytes are one half of the question and time is the other**, and time is the
 * half a reader experiences: a package that is small and slow to upgrade is not
 * the trade anybody wanted. Bundle size came first and load later. See 190.
 *
 * **Three numbers, and they are different in kind.**
 *
 * *Time to upgrade* is the gap between markup being in the document and its
 * shadow root existing. That is the flash of unstyled content a reader sees, and
 * it is the number server rendering exists to remove, so it is measured the way
 * it actually happens: the markup is parsed first and the definition arrives
 * after, which is what a script tag at the foot of a page does.
 *
 * *First render* is what one fresh element costs once the definition is already
 * there, from construction to `updateComplete`. It is mostly Lit's and should be
 * close to identical across families, which is the point: a family that is far
 * off it is doing something in its first update that the others are not.
 *
 * *Hydration* is the third, and it is the one server rendering exists to
 * justify. It is the gap between a server-rendered tree sitting in the document
 * and that same tree being live, which is only a hydration if the tree is
 * *adopted*: a timer around an import measures a re-render, reads as a win, and
 * proves nothing. Three things make it real here.
 *
 * The markup is served, not assigned. `innerHTML` does not parse
 * `<template shadowrootmode>`, so a page built that way has no shadow root
 * before the definition arrives and there is nothing to adopt. Each family gets
 * a URL whose body is what `helix/testing/src/ssr.ts` rendered, and the parser
 * builds the shadow root the way a browser does for a real server response.
 *
 * The hydration support module is bundled ahead of the definition, in one entry.
 * It patches `LitElement` on the Lit instance it is given, so a support module
 * and an element carrying two copies of Lit patch nothing: the element rebuilds
 * and the number looks fine. One entry importing both is what keeps them on one
 * copy, and it is the same duplicate-Lit trap 279 records from the sandbox.
 *
 * **And adoption is asserted rather than assumed.** The `[part]` nodes in the
 * parsed shadow root are counted before the definition loads and again after:
 * adoption adds nothing, a rebuild appends a second copy of the tree. `adopted`
 * is recorded beside every reading, and a run that reports `false` is a
 * re-render figure wearing a hydration label.
 *
 * **The median of nine, and no `check:`.** A timing moves several percent
 * between runs on one machine and much more between machines, so a gate on it
 * would fail for reasons nobody caused. `verify` does not run this. It is
 * refreshed by hand, the same as the peer table, and the page says when.
 *
 * Run with `bun run gen:timings`.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { chromium } from 'playwright'

const ROOT = join(import.meta.dirname, '../..')
const SCRATCH = join(ROOT, '.local/metrics-timing')
const OUT = join(ROOT, 'helix/docs/timings.json')

/* The same five the peer table compares, so the two sections are about the same
   components and a reader can hold one against the other. */
const FAMILIES = ['button', 'checkbox', 'dialog', 'tabs', 'tooltip']

/** How many times each number is taken. Odd, so the median is a real reading. */
const RUNS = 9

mkdirSync(SCRATCH, { recursive: true })

console.log('timing: bundling')
for (const family of FAMILIES) {
  const entry = join(SCRATCH, `${family}.entry.js`)
  writeFileSync(entry, `import '@fusion.dev/helix/${family}'\n`)
  execFileSync(
    'bun',
    ['build', entry, '--outfile', join(SCRATCH, `${family}.js`), '--minify', '--target', 'browser'],
    { cwd: ROOT, stdio: 'pipe' },
  )
  /* The support module and the definition in one entry, in that order. Two
     entries would be two bundles and two copies of Lit, and the patch only
     reaches the copy it was bundled with: the element would rebuild, the timing
     would look ordinary, and nothing would say which number this was. */
  const hydrateEntry = join(SCRATCH, `${family}.hydrate.entry.js`)
  writeFileSync(
    hydrateEntry,
    `import '@lit-labs/ssr-client/lit-element-hydrate-support.js'\nimport '@fusion.dev/helix/${family}'\n`,
  )
  execFileSync(
    'bun',
    [
      'build',
      hydrateEntry,
      '--outfile',
      join(SCRATCH, `${family}.hydrate.js`),
      '--minify',
      '--target',
      'browser',
    ],
    { cwd: ROOT, stdio: 'pipe' },
  )
}

const bundles = new Map(
  FAMILIES.flatMap((family) => [
    [family, readFileSync(join(SCRATCH, `${family}.js`), 'utf8')],
    [`${family}.hydrate`, readFileSync(join(SCRATCH, `${family}.hydrate.js`), 'utf8')],
  ]),
)

/* What the server rendered, one document per family.
 *
 * Rendered here, in Node, by the same helper the SSR specs assert against, so
 * the markup under test is the markup those specs describe rather than a second
 * approximation of it. */
const { ssr } = await import('@fusion.dev/helix-testing/ssr')
const { html: staticHtml, unsafeStatic } = await import('lit/static-html.js')
const documents = new Map()
for (const family of FAMILIES) {
  /* Imported for its side effect: `ssr` renders a tag it can resolve, so the
     definition has to be registered in this process first. */
  await import(`@fusion.dev/helix/${family}`)
  /* `static-html` because the tag is a variable. A tag name is not a binding
     position in an ordinary Lit template, so the plain `html` tag cannot take
     one and fails at render rather than at type-check. */
  const tag = unsafeStatic(`helix-${family}`)
  documents.set(family, ssr(staticHtml`<${tag}></${tag}>`))
}

/* Served rather than inlined, because a module has to have an origin: a data URL
   gets an opaque one and dynamic import from it is refused. */
const server = createServer((request, response) => {
  const path = (request.url ?? '').replace(/^\//, '')
  if (path.endsWith('.js') && bundles.has(path.slice(0, -3))) {
    response.writeHead(200, { 'content-type': 'text/javascript' })
    response.end(bundles.get(path.slice(0, -3)))
    return
  }
  /* **The server-rendered document, delivered rather than assigned.** This is
     the whole reason hydration needs its own URL: `innerHTML` does not parse
     `<template shadowrootmode>`, so a page assembled in script has no shadow
     root to adopt and every reading would be a rebuild. Served, the parser
     builds it the way it does for a real response. */
  const rendered = /^([a-z-]+)\.ssr$/.exec(path)
  if (rendered && documents.has(rendered[1])) {
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end(`<!doctype html><html><body>${documents.get(rendered[1])}</body></html>`)
    return
  }
  response.writeHead(200, { 'content-type': 'text/html' })
  response.end('<!doctype html><html><body></body></html>')
})
await new Promise((ready) => server.listen(0, '127.0.0.1', ready))
const origin = `http://127.0.0.1:${server.address().port}`

const median = (numbers) => [...numbers].sort((a, b) => a - b)[Math.floor(numbers.length / 2)]

const browser = await chromium.launch()
const results = []

for (const family of FAMILIES) {
  const upgrades = []
  const renders = []
  for (let run = 0; run < RUNS; run += 1) {
    /* A fresh page each run. A second measurement in a page whose registry
       already holds the definition is not an upgrade, it is a no-op. */
    const page = await browser.newPage()
    await page.goto(origin, { waitUntil: 'load' })
    const taken = await page.evaluate(
      async ([tag, url]) => {
        document.body.innerHTML = `<${tag}></${tag}>`
        const element = document.body.firstElementChild
        const before = performance.now()
        await import(url)
        await customElements.whenDefined(tag)
        await element.updateComplete
        const upgrade = performance.now() - before

        const fresh = document.createElement(tag)
        const start = performance.now()
        document.body.append(fresh)
        await fresh.updateComplete
        return { render: performance.now() - start, upgrade }
      },
      [`helix-${family}`, `${origin}/${family}.js`],
    )
    upgrades.push(taken.upgrade)
    renders.push(taken.render)
    await page.close()
  }
  /* Hydration, on the served document rather than an assembled one. */
  const hydrations = []
  let adopted = true
  for (let run = 0; run < RUNS; run += 1) {
    const page = await browser.newPage()
    await page.goto(`${origin}/${family}.ssr`, { waitUntil: 'load' })
    const taken = await page.evaluate(
      async ([tag, url]) => {
        const host = document.querySelector(tag)
        /* **Counted, not marked.** The obvious probe is to stamp a node and
           see whether it survives, and it passes either way: Lit does not
           clear a shadow root it did not create, so on a failed hydration the
           stamped node is still there with a second copy of the tree appended
           after it. Measured on Button with no support module, parts went 1 to
           2 and children 2 to 3 with the mark intact. What separates adoption
           from a rebuild is that adoption adds nothing. */
        const parts = () => host.shadowRoot?.querySelectorAll('[part]').length ?? 0
        const before = parts()
        const started = performance.now()
        await import(url)
        await customElements.whenDefined(tag)
        await host.updateComplete
        return {
          /* `before > 0` because a document with nothing in its shadow root
             never tested adoption, and an equality between two zeroes must
             not read as a pass. */
          adopted: before > 0 && parts() === before,
          hydrate: performance.now() - started,
        }
      },
      [`helix-${family}`, `${origin}/${family}.hydrate.js`],
    )
    if (!taken.adopted) {
      adopted = false
    }
    hydrations.push(taken.hydrate)
    await page.close()
  }

  const row = {
    adopted,
    family,
    hydrate: median(hydrations),
    render: median(renders),
    upgrade: median(upgrades),
  }
  results.push(row)
  console.log(
    `  ${family.padEnd(10)} upgrade ${row.upgrade.toFixed(2)}ms  render ${row.render.toFixed(2)}ms` +
      `  hydrate ${row.hydrate.toFixed(2)}ms ${adopted ? '(adopted)' : '(REBUILT)'}`,
  )
}

await browser.close()
server.close()

const stamp = execFileSync('git', ['log', '-1', '--format=%cs'], { cwd: ROOT }).toString().trim()
writeFileSync(
  OUT,
  `${JSON.stringify({ families: results, measured: stamp, runs: RUNS }, null, 2)}\n`,
)
console.log(
  `timing: ${results.length} families over ${RUNS} runs, written to helix/docs/timings.json`,
)

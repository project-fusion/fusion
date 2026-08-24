#!/usr/bin/env node
/**
 * What a component costs in time, measured in a real browser.
 *
 * **The metrics page argued one half of the question.** It carried eleven tables
 * of bytes and nothing about time, which is the half a reader actually
 * experiences: a package that is small and slow to upgrade is not the trade
 * anybody wanted. `23-helix-docs.md` said bundle size first and load later, and
 * later arrived. See 190.
 *
 * **Two numbers, and they are different in kind.**
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
 * **Hydration is the third and is not here.** Adopting a server-rendered tree is
 * the number with the most to say, and measuring it needs the DSD markup and the
 * hydration support module loaded in the right order rather than a timer around
 * an import. `helix/testing/src/ssr.ts` is the rig it would build on. Left out
 * rather than approximated, because a hydration figure that is really a
 * re-render figure would be worse than no figure. Filed separately.
 *
 * **The median of nine, and no `check:`.** A timing moves several percent
 * between runs on one machine and much more between machines, so a gate on it
 * would fail for reasons nobody caused, which is the fastest way to teach a team
 * to ignore a red build. `verify` does not run this. It is refreshed by hand,
 * the same as the peer table and for the same reason, and the page says when.
 *
 * Run with `bun run metrics:timing`.
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
  writeFileSync(entry, `import '@helix-io/styled/${family}'\n`)
  execFileSync(
    'bun',
    ['build', entry, '--outfile', join(SCRATCH, `${family}.js`), '--minify', '--target', 'browser'],
    { cwd: ROOT, stdio: 'pipe' },
  )
}

const bundles = new Map(
  FAMILIES.map((family) => [family, readFileSync(join(SCRATCH, `${family}.js`), 'utf8')]),
)

/* Served rather than inlined, because a module has to have an origin: a data URL
   gets an opaque one and dynamic import from it is refused. */
const server = createServer((request, response) => {
  const family = (request.url ?? '').replace(/^\/|\.js$/g, '')
  if (bundles.has(family)) {
    response.writeHead(200, { 'content-type': 'text/javascript' })
    response.end(bundles.get(family))
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
  const row = { family, render: median(renders), upgrade: median(upgrades) }
  results.push(row)
  console.log(
    `  ${family.padEnd(10)} upgrade ${row.upgrade.toFixed(2)}ms  render ${row.render.toFixed(2)}ms`,
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

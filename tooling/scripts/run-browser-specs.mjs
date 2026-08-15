#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
/**
 * Runs the DOM specs in a real browser, and reports what happened.
 *
 * `bun test` runs them under happy-dom, which has no layout: every spec behind
 * `hasLayout()` is skipped there, and those are the ones that matter most,
 * because a component that renders correct markup in the wrong place is exactly
 * what a DOM with no boxes cannot see. Four spec files were browser-only and
 * therefore ran only when a person opened the sandbox and clicked the Specs
 * tab. That is not a check, it is a habit.
 *
 * The same bundles the sandbox runs. `bun run specs` emits one module per
 * family, each exporting `run()`, and this loads every one of them in headless
 * Chromium and collects the results. No second suite, no rewriting: a spec
 * deleted from the source stops being reported here the same day.
 *
 * Run with `bun run specs:browser`, after `bun run specs`.
 *
 * Playwright rather than Puppeteer, for one reason worth naming: its GitHub
 * action installs the browser and its system libraries in one step, and a
 * headless browser in CI fails far more often on a missing shared library than
 * on anything to do with the tests.
 */
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve(import.meta.dirname, '../..')
const specs = join(root, 'site/ui/public/specs')
/* The sandbox's stylesheet, which is the base layer and every token in it.
   Without it a component's own shadow styles still arrive, because those come
   with the definition, but every `var(--helix-...)` in them resolves to nothing:
   a checkbox whose size is a token comes out zero by zero. The first run of this
   script reported four failures that were all this and none of which said
   anything about the components, including one that read "expected 0 to be
   greater than 0" on a box that had simply never been given a size. The sandbox
   loads it, so a spec runner that does not is not running what the sandbox
   runs. */
const base = join(root, 'site/ui/public/sandbox/frame.css')

const TYPES = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript' }

/* Served rather than loaded from disk, because a module graph on `file://` is
   blocked by the same-origin rules the bundles' own imports rely on. */
const server = createServer(async (request, response) => {
  const path = (request.url ?? '/').split('?')[0]
  if (path === '/') {
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end(
      '<!doctype html><meta charset="utf-8"><title>specs</title>' +
        '<link rel="stylesheet" href="/base.css">',
    )
    return
  }
  try {
    const body = await readFile(path === '/base.css' ? base : join(specs, path.replace(/^\/+/, '')))
    response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'text/plain' })
    response.end(body)
  } catch {
    response.writeHead(404)
    response.end()
  }
})

await new Promise((done) => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`

/* Only the family entry points. `Bun.build` with splitting also emits shared
   chunks, which are named with a hash and are imports rather than entries:
   loading one directly runs nothing and reports nothing. */
const families = (await readdir(specs))
  .filter((file) => file.endsWith('.js') && !/-[a-z0-9]{8}\.js$/.test(file))
  .sort()

if (families.length === 0) {
  console.error('browser specs: no bundles. Run `bun run specs` first.')
  process.exit(1)
}

const browser = await chromium.launch()
const page = await browser.newPage()
const crashes = []
page.on('pageerror', (error) => crashes.push(String(error)))
await page.goto(origin, { waitUntil: 'load' })

let passed = 0
const failures = []

for (const family of families) {
  const name = family.replace(/\.js$/, '')
  /* Each family in its own evaluation, so one that throws while loading is one
     family reported as broken rather than the run ending with no results at
     all. A bundle that cannot even be imported is the failure most worth
     seeing, since it means the component does not load in a browser. */
  const results = await page.evaluate(async (url) => {
    try {
      const module = await import(url)
      if (typeof module.run !== 'function') {
        return [{ error: 'the bundle exports no run()', name: 'load', passed: false, suite: '' }]
      }
      return await module.run()
    } catch (error) {
      return [{ error: String(error), name: 'load', passed: false, suite: '' }]
    }
  }, `${origin}/${family}`)

  for (const result of results) {
    if (result.passed) {
      passed += 1
    } else {
      failures.push(`${name} > ${result.suite ? `${result.suite} > ` : ''}${result.name}
    ${result.error ?? 'failed'}`)
    }
  }
}

await browser.close()
server.close()

for (const crash of crashes) {
  failures.push(`uncaught in the page: ${crash}`)
}

if (failures.length > 0) {
  console.error(`browser specs: ${failures.length} failed, ${passed} passed\n`)
  for (const failure of failures) {
    console.error(`  ${failure}\n`)
  }
  process.exit(1)
}

console.log(`browser specs: ${passed} passed across ${families.length} families, in Chromium`)

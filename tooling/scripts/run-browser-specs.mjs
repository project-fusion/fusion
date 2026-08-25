#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
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
 * Run with `bun run specs:browser`, after `bun run specs`. A family name limits
 * it to that one: `bun run specs:browser carousel`.
 *
 * **The whole suite is eighty-eight families and twenty minutes**, which is
 * fine for CI and is not a thing anybody runs while fixing one component. The
 * absence of a filter is why a throwaway copy of this script got written during
 * a carousel fix, and that copy left out the stylesheet below and reported
 * three failures that were all the missing tokens: the same mistake this
 * script's first run made, made again, because the fix lived in a comment here
 * rather than in something reusable.
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
        '<link rel="stylesheet" href="/frame.css">',
    )
    return
  }
  try {
    const body = await readFile(
      path === '/frame.css' ? base : join(specs, path.replace(/^\/+/, '')),
    )
    response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'text/plain' })
    response.end(body)
  } catch {
    response.writeHead(404)
    response.end()
  }
})

await new Promise((done) => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`

/* The families the builder wrote down, rather than every `.js` that does not
   look like a hashed chunk. That test was a guess and a family name could
   satisfy it: `video-playlist.js` ends in eight lowercase alphanumerics, the
   same shape as a hash, so it was skipped and its specs had never run here.
   Nothing reported it, because a suite covering 87 of 88 families still says
   it passed. */
/* Positional, so a flag must not be mistaken for a family name: passing
   `--throttle 4` alone reported "no bundle for `--throttle`". */
const only = process.argv
  .slice(2)
  .find((argument) => !argument.startsWith('--') && !/^\d+$/.test(argument))
const named = JSON.parse(await readFile(join(specs, 'families.json'), 'utf8'))
const families = named
  .map((name) => `${name}.js`)
  .filter((file) => only === undefined || file === `${only}.js`)
  .sort()

if (families.length === 0) {
  console.error(
    only === undefined
      ? 'browser specs: no bundles. Run `bun run specs` first.'
      : `browser specs: no bundle for \`${only}\`. Run \`bun run specs\` first, and check the name.`,
  )
  process.exit(1)
}

/** How long one family may block the page before the run gives up on it. */
const STUCK = 60_000

/** How much to divide the CPU by, for reproducing a runner locally. */
const THROTTLE = Number(
  process.argv[process.argv.indexOf('--throttle') + 1] ??
    (process.argv.includes('--throttle') ? 4 : 1),
)

const browser = await chromium.launch()
const crashes = []

/**
 * A blank page at the origin, ready to import a bundle.
 *
 * Made again after a family destroys the one before it, which is what a
 * navigation or a renderer crash does: the context a spec was evaluating in is
 * gone, and every family after it would fail against a page that no longer
 * exists.
 */
const freshPage = async () => {
  const made = await browser.newPage()
  made.on('pageerror', (error) => crashes.push(String(error)))

  /* **A way to reproduce a runner's speed on a desk**, because three specs
     failed only in CI and two rounds of guessing at why cost more than this
     took to write. A GitHub runner is two slow cores; this machine is neither,
     and every timing assertion in here was written against the fast one.
     `node tooling/scripts/run-browser-specs.mjs --throttle 4` divides the CPU
     by four through the same CDP switch DevTools uses. A flag rather than an
     environment variable because nothing else in here reads one. */
  if (THROTTLE > 1) {
    const session = await made.context().newCDPSession(made)
    await session.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
  }

  await made.goto(origin, { waitUntil: 'load' })

  /* **The pointer starts at 0,0 and specs mount at 0,0.** `mount` assigns
     `document.body.innerHTML`, so content appears directly under where the
     browser believes its mouse is, and Chromium fires a trusted `pointerenter`
     at it. Measured: a megamenu spec dispatching a synthetic touch enter saw
     `pointerType: 'mouse'` on a runner, opened on hover as it should, and
     failed an assertion that a touch had not opened it. The component was
     right and the page was hovering it.
     Moved to the far corner, which is over `body` and over nothing a spec
     mounts. */
  const size = made.viewportSize()
  if (size) {
    await made.mouse.move(size.width - 2, size.height - 2)
  }

  return made
}

let page = await freshPage()

let passed = 0
const failures = []

for (const family of families) {
  const name = family.replace(/\.js$/, '')
  /* Each family in its own evaluation, so one that throws while loading is one
     family reported as broken rather than the run ending with no results at
     all. A bundle that cannot even be imported is the failure most worth
     seeing, since it means the component does not load in a browser. */
  let results
  try {
    /* A wall clock on this side, because the one inside the page cannot always
       fire.
     *
       Every test is already raced against a 2000ms `setTimeout` in the harness,
       and that is enough for a test that merely waits too long. It is no use
       against one that pegs the main thread: a timer cannot run when nothing
       yields, so the page never comes back, `page.evaluate` never settles, and
       the run stops with no output and no name to blame.
     *
       `virtual-list` did exactly that until #174, and it cost several runs that
       read as the suite hanging rather than as one family failing. It was
       measuring a box whose height its own render decided, so the window never
       settled; it is fixed, and this stays, because the failure it catches is a
       shape rather than a component. `bun run probe:stuck <family>` is what to
       reach for the next time this line fires.
     *
       Sixty seconds is thirty times the slowest family measured, so this can
       only ever catch something genuinely stuck. */
    results = await Promise.race([
      page.evaluate(async (url) => {
        try {
          const module = await import(url)
          if (typeof module.run !== 'function') {
            return [
              { error: 'the bundle exports no run()', name: 'load', passed: false, suite: '' },
            ]
          }
          return await module.run()
        } catch (error) {
          return [{ error: String(error), name: 'load', passed: false, suite: '' }]
        }
      }, `${origin}/${family}`),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`blocked the page for ${STUCK / 1000}s, so the run gave up on it`))
        }, STUCK)
      }),
    ])
  } catch (error) {
    /* The `try` inside the page cannot catch this one: the context it would
       have run in is gone. A family navigates the page, or crashes the
       renderer, and everything after it would then be evaluated against a page
       that no longer exists, so the whole run ended with no results at all.
       That is the opposite of what the comment above intends, and it is how
       this runner spent a day reporting nothing while thirty-six specs in one
       family were the only thing wrong. */
    results = [
      {
        error: `it destroyed the page: ${String(error).split('\n')[0]}. A spec that navigates, submits a form for real, or crashes the renderer will do this, and none of them show up under happy-dom.`,
        name: 'the page',
        passed: false,
        suite: '',
      },
    ]
    await page.close().catch(() => {})
    page = await freshPage()
  }

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

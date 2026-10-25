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
 * The same bundles the sandbox runs. `turbo run specs` emits one module per
 * family, each exporting `run()`, and this loads every one of them in headless
 * Chromium, or in WebKit, and collects the results. No second suite, no
 * rewriting: a spec deleted from the source stops being reported here the same
 * day.
 *
 * Run with `bun run specs:browser`, after `turbo run specs`. A family name limits
 * it to that one: `bun run specs:browser carousel`. `--shard <i> --of <n>` runs
 * one of `n` shares of the families, as `@fusion.dev/scripts/shard` splits them
 * for CI. `--browser webkit` runs them in Playwright's WebKit, which is the
 * engine Safari and a Tauri app on macOS or Linux draw with.
 *
 * **The whole suite is every family, which is not a thing anybody runs while
 * fixing one component**, so it takes a family filter. Without one somebody
 * writes a throwaway copy of this script, leaves out the stylesheet below, and
 * reads the missing tokens as component failures.
 *
 * **Families run on a fixed number of workers, and every family on a page of
 * its own**, through `@fusion.dev/scripts/pool`, which carries the argument for
 * the stripe and the worker count, and which the pixel checks share on one page
 * per worker. The specs keep the pool's default, a fresh page per family,
 * because that is what keeps one family's definitions from deciding another's
 * result (the note in `run` has the case that made it necessary). Results are
 * reported in the order the families sort, whichever worker ran them. Measured
 * 14 Sep 2026 on twelve cores, 2251 specs passing every time: 91 seconds on the
 * one shared page this replaced, of which 60 were the stuck timer holding the
 * process open; 44 on one worker, 24 on two, 17 on four. `--workers` overrides
 * the default, and `--workers 1 --throttle 4` is a runner on a desk.
 *
 * Playwright rather than Puppeteer, for one reason worth naming: its GitHub
 * action installs the browser and its system libraries in one step, and a
 * headless browser in CI fails far more often on a missing shared library than
 * on anything to do with the tests.
 */
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
import { argument } from '@fusion.dev/scripts/argv'
import { costOf } from '@fusion.dev/scripts/cost'
import { KNOWN_IN_WEBKIT } from '@fusion.dev/scripts/known-in-webkit'
import { leave } from '@fusion.dev/scripts/leave'
import { offline, pool, workers } from '@fusion.dev/scripts/pool'
import { owner, shard, which } from '@fusion.dev/scripts/shard'
import { root } from '@fusion.dev/scripts/workspace'
import { chromium, webkit } from 'playwright'

/**
 * The engines `--browser` takes, by the name it takes them under: how each
 * launches, what it is called in a report, what it is known to fail, and the
 * name its cost is measured under, since one family costs each engine its own.
 */
const ENGINES = {
  chromium: { known: {}, launch: () => chromium.launch(), name: 'Chromium', task: 'specs' },
  webkit: {
    known: KNOWN_IN_WEBKIT,
    launch: () => webkit.launch(),
    name: 'WebKit',
    task: 'specs-webkit',
  },
}
const chosen = argument('browser') ?? 'chromium'
const engine = ENGINES[chosen]
if (engine === undefined) {
  console.error(
    `browser specs: --browser takes ${Object.keys(ENGINES).join(' or ')}, and was given \`${chosen}\``,
  )
  process.exit(1)
}

const specs = join(root, 'fusion/site/public/specs')
/* The sandbox's stylesheet, which is the base layer and every token in it.
   Without it a component's own shadow styles still arrive, because those come
   with the definition, but every `var(--helix-...)` in them resolves to nothing:
   a checkbox whose size is a token comes out zero by zero. The failures that
   produces say nothing about the components: "expected 0 to be greater than 0"
   on a box that was never given a size. The sandbox loads it, so a spec runner
   that does not is not running what the sandbox runs. */
const base = join(root, 'fusion/site/public/sandbox/frame.css')

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
   look like a hashed chunk. A family name can satisfy that test: `video-playlist.js`
   ends in eight lowercase alphanumerics, the same shape as a hash, so it is
   skipped and its specs never run. Nothing reports it, because a suite covering
   87 of 88 families still says it passed. */
/* Positional, so a flag must not be mistaken for a family name: passing
   `--throttle 4` alone reported "no bundle for `--throttle`". A number is never
   a family, and neither is the engine after `--browser`. */
const only = process.argv
  .slice(2)
  .find(
    (one, at, all) => !one.startsWith('--') && !/^\d+$/.test(one) && all[at - 1] !== '--browser',
  )
const listed = JSON.parse(await readFile(join(specs, 'families.json'), 'utf8'))
const bundles = listed
  .map((name) => `${name}.js`)
  .filter((file) => only === undefined || file === `${only}.js`)
  .sort()

if (bundles.length === 0) {
  console.error(
    only === undefined
      ? 'browser specs: no bundles. Run `turbo run specs` first.'
      : `browser specs: no bundle for \`${only}\`. Run \`turbo run specs\` first, and check the name.`,
  )
  process.exit(1)
}

/* **This run's families, when CI splits the check**, weighed by what each was
   measured to cost and one apiece where it was not, since what a family's specs
   cost is otherwise known only by running them: `@fusion.dev/scripts/cost`
   argues that and `@fusion.dev/scripts/shard` the split. A shard with none
   passes before the browser starts, and says so in words. */
const named = (bundle) => bundle.replace(/\.js$/, '')
const seconds = costOf(engine.task, () => 1)
const asked = shard()
const ours = owner(bundles, (bundle) => seconds(named(bundle)), asked)
const families = bundles.filter(ours)
if (families.length === 0) {
  console.log(
    `browser specs: ${which(asked)} holds none of the families, which the other shards run.`,
  )
  process.exit(0)
}

/** The error event a page raises for a ResizeObserver loop. */
const LOOP = 'ResizeObserver loop completed with undelivered notifications'

/** How long one family may block the page before the run gives up on it. */
const STUCK = 60_000

/** How much to divide the CPU by, for reproducing a runner locally. */
const THROTTLE = Number(
  process.argv[process.argv.indexOf('--throttle') + 1] ??
    (process.argv.includes('--throttle') ? 4 : 1),
)
/* Refused outright. The throttle goes through Chromium's DevTools protocol, and
   a WebKit run that silently ran at full speed is not the reproduction you
   asked for. */
if (THROTTLE > 1 && chosen !== 'chromium') {
  console.error('browser specs: --throttle runs in Chromium alone, through its DevTools protocol.')
  process.exit(1)
}

/**
 * How many families run at once, which `pool` decides and argues: a core left
 * free, four at most, and one on a GitHub runner, which is two cores. Measured
 * on the first CI run of this, 14 Sep 2026: two workers there timed out four
 * Chat specs at the harness's two-second bound, where a desk at a quarter of
 * its speed with two workers passed everything. The runner still gets a page
 * per family and the cleared timer, which is where most of the time was.
 */
const WORKERS = workers()

const browser = await engine.launch()

/**
 * The fresh page `pool` hands a family, made a blank page at the origin and
 * ready to import a bundle.
 *
 * A family that destroys its page, which is what a navigation or a renderer
 * crash does, takes only that page with it: the context a spec was evaluating
 * in is gone, and on a shared page every family after it would fail against a
 * page that no longer exists.
 */
const ready = async (made, crashes) => {
  made.on('pageerror', (error) => {
    /* Counted from the page itself, below, and not twice. */
    if (String(error).includes(LOOP)) {
      return
    }
    crashes.push(String(error))
  })

  /* **A ResizeObserver loop fails the family, in both engines.** A component
     that changes a size it observes while the browser is still delivering
     notices gets this error event on the window. Chromium never hands it to
     Playwright as a page error and WebKit does, so it is heard on the page,
     where both raise it. Chat and Graph raised it on October 10, 2026, and
     once both were fixed no family did, in either engine. */
  await made.addInitScript((loop) => {
    window.addEventListener('error', (event) => {
      if (String(event.message).includes(loop)) {
        window.__helixResizeLoops = [...(window.__helixResizeLoops ?? []), String(event.message)]
      }
    })
  }, LOOP)

  /* **A way to reproduce a runner's speed on a desk**, for the specs that fail
     only in CI. A GitHub runner is two slow cores; this machine is neither,
     and every timing assertion in here was written against the fast one.
     `node fusion/scripts/run-browser-specs.mjs --throttle 4` divides the CPU
     by four through the same CDP switch DevTools uses. A flag rather than an
     environment variable because nothing else in here reads one. */
  if (THROTTLE > 1) {
    const session = await made.context().newCDPSession(made)
    await session.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
  }

  await made.goto(origin, { waitUntil: 'load' })

  /* **Every font face loaded before a family starts.** A face loads when text
     first needs it, and its arrival is page activity, which the
     unregistered-child audit waits out: it reports once the page has loaded
     nothing for `QUIET` milliseconds. A family whose first spec mounted the
     first text waited for Geist too, and its report came a period after the
     spec stopped listening. Measured in Chromium on October 15, 2026: the font
     arrived 66 ms after that mount, and six families failed that way. */
  await made.evaluate(() =>
    Promise.all([...document.fonts].map((face) => face.load().catch(() => undefined))),
  )

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

let passed = 0
const failures = []

/** Each family's results, in the order the families sort, whichever worker ran it. */
const byFamily = await pool(families, {
  browser,
  count: WORKERS,
  family: named,
  /* **Nothing leaves this machine, which the pixel checks already held to and
     the specs did not.** Two examples point an image at
     `https://example.invalid/missing.png` and their specs wait for the `error`
     it produces, so what decided the result was how fast this runner's resolver
     refused a name, raced against the harness's own 2000ms: `avatar > the
     events example` timed out on 13 Sep 2026 in a run that had touched neither
     family, having passed on the five before it. Refused at the context, the
     `error` arrives at once and says the same thing everywhere, and the
     examples stay what a consumer would write. `offline` carries the rest of
     the argument. */
  prepare: offline(origin),
  run: async (fresh, family) => {
    /* **A page of its own for every family**, so the custom element registry
       starts empty each time. Each bundle carries its own copy of the headless
       modules the shared runtime does not, and on a shared page the first
       family to define a tag owns its class: measured 14 Sep 2026, Filter
       Input defined `helix-headless-option`, and Select's listbox, built from
       another copy, then failed every `instanceof` and found no options. It
       passed on one page only because Combobox happened to run first and
       defined both from one copy. A consumer installs one copy, so a spec is
       run the way a consumer's page would load it. */
    const crashes = []
    /* A page that will not load is this family's failure, and the run goes on.
       WebKit once could not connect to the server on a machine that had run
       out of local ports, and the whole run ended there with no report. */
    let page
    try {
      page = await ready(fresh, crashes)
    } catch (error) {
      return {
        crashes,
        results: [
          {
            error: `the page did not load: ${String(error).split('\n')[0]}`,
            name: 'the page',
            passed: false,
            suite: '',
          },
        ],
      }
    }
    /* Each family in its own evaluation, so one that throws while loading is one
       family reported as broken rather than the run ending with no results at
       all. A bundle that cannot even be imported is the failure most worth
       seeing, since it means the component does not load in a browser. */
    let results
    let stuck
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
         A spec measuring a box whose height its own render decides is the shape
         that does this: the window never settles. `bun run probe:stuck <family>`
         is what to reach for when this line fires.
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
            const ran = await module.run()
            const loops = window.__helixResizeLoops ?? []
            return loops.length === 0
              ? ran
              : [
                  ...ran,
                  {
                    error: `the page raised "${loops[0]}" ${loops.length === 1 ? 'once' : `${loops.length} times`}`,
                    name: 'a resize loop',
                    passed: false,
                    suite: '',
                  },
                ]
          } catch (error) {
            return [{ error: String(error), name: 'load', passed: false, suite: '' }]
          }
        }, `${origin}/${family}`),
        new Promise((_, reject) => {
          stuck = setTimeout(() => {
            reject(new Error(`blocked the page for ${STUCK / 1000}s, so the run gave up on it`))
          }, STUCK)
        }),
      ])
      /* Cleared as soon as the family answers. A timer left running holds the
         process open, so every family that finished would keep the run alive
         for its full sixty seconds after the last one reported. */
      clearTimeout(stuck)
    } catch (error) {
      clearTimeout(stuck)
      /* The `try` inside the page cannot catch this one: the context it would
         have run in is gone. A family navigates the page, or crashes the
         renderer, and everything after it would then be evaluated against a page
         that no longer exists, so the whole run reports nothing at all rather than
         naming the one family that broke. */
      results = [
        {
          error: `it destroyed the page: ${String(error).split('\n')[0]}. A spec that navigates, submits a form for real, or crashes the renderer will do this, and none of them show up under happy-dom.`,
          name: 'the page',
          passed: false,
          suite: '',
        },
      ]
    }
    return { crashes, results }
  },
})

/* **What this engine is known to fail is reported and not counted**, and a
   listed spec that passes, or that this run's families no longer hold, fails
   the run: the list says what is still wrong, so it is kept true both ways. */
/* An entry is its cause, or the cause with `only` and `sometimes`, which
   `known-in-webkit.mjs` explains. One for another platform is left out. */
const known = Object.fromEntries(
  Object.entries(engine.known)
    .map(([line, entry]) => [line, typeof entry === 'string' ? { cause: entry } : entry])
    .filter(([, entry]) => entry.only === undefined || entry.only === process.platform),
)
const expected = []
const met = new Set()
for (const [at, { results }] of byFamily.entries()) {
  const name = named(families[at])
  for (const result of results) {
    const line = `${name} > ${result.suite ? `${result.suite} > ` : ''}${result.name}`
    if (line in known) {
      met.add(line)
      if (!result.passed) {
        expected.push(line)
      } else if (!known[line].sometimes) {
        failures.push(`${line}
    passes in ${engine.name} now. Take it off the list in fusion/scripts/lib/known-in-webkit.mjs.`)
      }
    } else if (result.passed) {
      passed += 1
    } else {
      failures.push(`${line}
    ${result.error ?? 'failed'}`)
    }
  }
}
/* Only a family whose specs ran can be missing one. A family that failed to
   load is already reported, and every entry for it would read as renamed. */
const ran = new Set(
  families
    .filter((_, at) =>
      byFamily[at].results.some((result) => result.name !== 'load' && result.name !== 'the page'),
    )
    .map(named),
)
for (const line of Object.keys(known)) {
  if (ran.has(line.split(' > ')[0]) && !met.has(line)) {
    failures.push(`${line}
    is listed as known to fail in ${engine.name}, and no spec has that name now.`)
  }
}

await browser.close()
server.close()

/* After every result, as before, and in family order rather than in the order
   the workers happened to hear them, so two runs list them alike. */
for (const [at, { crashes }] of byFamily.entries()) {
  for (const crash of crashes) {
    failures.push(`${named(families[at])} > uncaught in the page: ${crash}`)
  }
}

/* Every run says what it is still known to fail, and why, so the list is read
   where the result is. */
const owed =
  expected.length === 0
    ? ''
    : `\n\n${expected.length} known to fail in ${engine.name}, listed in fusion/scripts/lib/known-in-webkit.mjs:\n` +
      expected.map((line) => `\n  ${line}\n    ${known[line].cause}\n`).join('')

if (failures.length > 0) {
  console.error(`browser specs: ${failures.length} failed, ${passed} passed, in ${engine.name}\n`)
  for (const failure of failures) {
    console.error(`  ${failure}\n`)
  }
  console.error(owed)
  await leave(1)
}

console.log(
  `browser specs: ${passed} passed across ${families.length} families, in ${engine.name} on ${Math.min(WORKERS, families.length)} worker(s)` +
    (asked === undefined ? '' : `, in ${which(asked)}`) +
    owed,
)

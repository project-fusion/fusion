#!/usr/bin/env node
/**
 * Screenshots every headless example and compares it to a committed baseline.
 *
 * **The one fault class nothing else here can see.** A 233 pixel chevron, a
 * callout drawn as a black half-circle, an indicator translated through its own
 * label: all three shipped, and all three survived a green `verify`, because
 * every check in it reads source or asserts a fact somebody thought to assert.
 * A pixel diff asserts the part nobody thinks to, which is everything that was
 * already right. See 148.
 *
 * **The corpus was built for something else and is better for it.** Each
 * `.examples/headless.html` renders one family's headless tier against
 * `headless.css`, a hand-written sheet with no token, no theme and a fixed
 * seven-value gray ramp. That is the determinism a screenshot comparison needs,
 * and the styled tier cannot offer it while theming is in flight: a seed change
 * would redraw all eighty-three baselines and say nothing about any component.
 *
 * **Linux only, and that is a decision rather than a limitation.** Text
 * rasterisation, subpixel antialiasing and the default font stack all differ
 * between macOS and the `ubuntu-latest` this runs on, and no headless example sets
 * `font-family`, so a baseline taken here and compared there differs on nearly
 * every glyph. Rather than tune a threshold until real faults fit under it, the
 * comparison never crosses platforms: the baselines are Linux, the check runs
 * on Linux, and on anything else it says so and exits clean. To refresh them
 * from a Mac, run this in the same container CI uses.
 *
 * Baselines live beside the example they picture, `\`.examples/headless.png\``, which
 * `check:examples` ignores because it reads only `.html` and `.css`.
 *
 * ```
 * bun run check:visual              compare, and fail on a difference
 * bun run check:visual accordion    just that family
 * bun run visual:update             rewrite the baselines
 * ```
 *
 * A failure writes `headless.diff.png` beside the baseline, the changed pixels
 * marked, and leaves it there to be looked at. It is gitignored: what belongs in
 * the history is the baseline a reviewer approved, not the artifact of a run.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import pixelmatch from 'pixelmatch'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const root = resolve(import.meta.dirname, '../..')
const SOURCE = join(root, 'helix/styled/src')
const FRAME = join(root, 'site/ui/public/sandbox/frame.js')

/* The family is the first argument that is not a flag, rather than the first
   argument. `visual:update` puts `--update` in that slot itself, so reading
   position two meant `bun run visual:update accordion` silently rewrote all
   eighty-three baselines: the one command where doing more than was asked is
   least recoverable. */
const args = process.argv.slice(2)
const only = args.find((one) => !one.startsWith('--'))
const update = args.includes('--update')

if (process.platform !== 'linux') {
  console.log(
    `visual: skipped on ${process.platform}. Baselines are Linux, because no headless example sets a ` +
      'font and the default stack differs by platform, so a comparison that crossed them would ' +
      'differ on nearly every glyph. CI is where this runs.',
  )
  process.exit(0)
}

if (!existsSync(FRAME)) {
  console.error('visual: no frame bundle. Run `bun run frame` first: it is what defines the tags.')
  process.exit(1)
}

const families = readdirSync(SOURCE, { withFileTypes: true })
  .filter(
    (one) => one.isDirectory() && existsSync(join(SOURCE, one.name, '.examples/headless.html')),
  )
  .map((one) => one.name)
  .filter((name) => only === undefined || name === only)
  .sort()

if (families.length === 0) {
  console.error(
    only ? `visual: no headless example for ${only}.` : 'visual: no headless examples found.',
  )
  process.exit(1)
}

/* Served rather than opened from disk: the frame bundle is a classic script and
   the example links `styles.css` relatively, so both want a real origin. The
   page is assembled here rather than read from a file so nothing has to be
   written into the tree to take a picture of it. */
const page = (family) => {
  const html = readFileSync(join(SOURCE, family, '.examples/headless.html'), 'utf8')
  return (
    '<!doctype html><meta charset="utf-8"><title>base</title>' +
    /* A fixed ground and a fixed inset, so a component that draws to its own
       edge is not cropped and the page's own color is never the thing under
       test. `color-scheme` is declared because the base sheets resolve their
       grays through `light-dark()`. */
    '<style>:root{color-scheme:light}' +
    'body{margin:0;padding:24px;background:#fff;width:640px;box-sizing:border-box}</style>' +
    /* `defer`, which is what `frame.html` ships and is not a detail.
       
       Loaded eagerly the bundle runs mid-parse, so an element upgrades the
       moment the parser reaches it and anything it looks up by id further down
       the document does not exist yet. Virtual List reads its rows from a
       `<script type="application/json">` that follows it, and came out with
       zero rows and a viewport full of nothing: a component that works
       everywhere else, reported broken by the harness looking at it. Deferred,
       the document is complete before a single tag upgrades, which is the
       condition the sandbox already renders under. */
    `<script defer src="/frame.js"></script>${html}`
  )
}

const TYPES = { '.css': 'text/css', '.js': 'text/javascript' }
const server = createServer((request, response) => {
  const path = (request.url ?? '/').split('?')[0]
  if (path === '/frame.js') {
    response.writeHead(200, { 'content-type': TYPES['.js'] })
    response.end(readFileSync(FRAME))
    return
  }
  const example = /^\/([a-z][a-z0-9-]*)\/(styles\.css)?$/.exec(path)
  if (example === null) {
    response.writeHead(404).end()
    return
  }
  const [, family, sheet] = example
  if (sheet !== undefined) {
    const file = join(SOURCE, family, '.examples/headless.css')
    response.writeHead(200, { 'content-type': TYPES['.css'] })
    response.end(existsSync(file) ? readFileSync(file) : '')
    return
  }
  response.writeHead(200, { 'content-type': 'text/html' })
  response.end(page(family))
})

await new Promise((done) => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch()
const tab = await browser.newPage({ viewport: { height: 800, width: 640 } })

/* Nothing leaves this machine, and that is a correctness rule rather than a
 * courtesy.
 *
 * Three headless examples name assets on other people's servers: `image` and
 * `video` load a photograph from Unsplash, and `video` and `video-playlist`
 * load clips from MDN. Left open, a baseline records whatever those hosts
 * happened to return, so the check goes red the day one of them is slow, is
 * down, or re-encodes a picture, none of which is a fact about this library.
 * The first run proved it: the poster arrived over the network and the clip did
 * not, because Playwright's Chromium ships without the proprietary codecs, so
 * the picture recorded a photograph and an error message together.
 *
 * Blocked, all three render the same missing-media state everywhere, which is
 * deterministic and is still the thing under test: what a baseline guards on
 * these families is the component's own frame, controls and layout, and the
 * poster was never more than what happened to be behind them. */
await tab.route('**/*', (route) => {
  const url = route.request().url()
  return url.startsWith(origin) ? route.continue() : route.abort()
})

const changed = []
const written = []
let compared = 0

for (const family of families) {
  await tab.goto(`${origin}/${family}/`, { waitUntil: 'load' })
  /* The tags upgrade when the bundle runs, and a component may render again
     after that: Lit batches, so the first paint can be the pre-update one.
     Waiting on the definition and then on the frame after it is what the spec
     runner does for the same reason. */
  await tab.evaluate(async () => {
    await Promise.all(
      [...document.body.querySelectorAll(':not(:defined)')].map((one) =>
        customElements.whenDefined(one.localName),
      ),
    )
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
    await document.fonts.ready
  })

  const shot = await tab.screenshot({ fullPage: true })
  const baseline = join(SOURCE, family, '.examples/headless.png')

  if (update) {
    mkdirSync(dirname(baseline), { recursive: true })
    writeFileSync(baseline, shot)
    written.push(family)
    continue
  }

  /* A missing baseline is a failure and not a chance to write one. Seeding on a
     bare run is the version of this that passes forever: CI would take its own
     picture, agree with it, report success and commit nothing, so the check
     would be green from the day it was added without ever having compared
     anything. `--update` is the only thing that writes, and what it writes is
     reviewed as a diff before it counts. */
  if (!existsSync(baseline)) {
    changed.push(
      `${family}: no baseline. Run \`bun run visual:update\` on Linux and commit what it takes, ` +
        'after looking at it: the first picture is the one every later comparison trusts.',
    )
    continue
  }

  const before = PNG.sync.read(readFileSync(baseline))
  const after = PNG.sync.read(shot)
  compared += 1

  if (before.width !== after.width || before.height !== after.height) {
    changed.push(
      `${family}: ${before.width}x${before.height} became ${after.width}x${after.height}. A size ` +
        'change is a layout change, and no diff image is written because there is nothing to ' +
        'lay one over.',
    )
    continue
  }

  const diff = new PNG({ height: before.height, width: before.width })
  /* `threshold` is per-pixel color distance, not a budget of pixels. Zero
     tolerated pixels, because this only ever compares Linux to Linux and a
     single moved pixel is the fault it exists to catch. The threshold is off
     the floor only so a renderer's own dithering does not read as a change. */
  const moved = pixelmatch(before.data, after.data, diff.data, before.width, before.height, {
    threshold: 0.1,
  })
  if (moved > 0) {
    const where = join(SOURCE, family, '.examples/headless.diff.png')
    writeFileSync(where, PNG.sync.write(diff))
    changed.push(
      `${family}: ${moved} pixels moved. The marked difference is at ` +
        `helix/styled/src/${family}/.examples/headless.diff.png. If the change was meant, ` +
        '`bun run visual:update` takes the new picture and the review is the diff on the baseline.',
    )
  }
}

await browser.close()
server.close()

if (changed.length > 0) {
  console.error(`Headless examples have moved (${changed.length}):\n\n  ${changed.join('\n  ')}\n`)
  process.exit(1)
}

if (written.length > 0) {
  console.log(
    `visual: wrote ${written.length} baseline(s) (${written.join(', ')})` +
      (compared > 0 ? `, compared ${compared} more` : '') +
      '. Commit them: an unreviewed baseline records whatever was on screen as correct.',
  )
  process.exit(0)
}

console.log(`visual: ${compared} headless examples, every one pixel for pixel with its baseline`)

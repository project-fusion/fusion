#!/usr/bin/env node
/**
 * Screenshots every example in both tiers and compares it to a committed baseline.
 *
 * **The one fault class nothing else here can see.** A 233 pixel chevron, a
 * callout drawn as a black half-circle, an indicator translated through its own
 * label: all three shipped, and all three survived a green `verify`, because
 * every check in it reads source or asserts a fact somebody thought to assert.
 * A pixel diff asserts the part nobody thinks to, which is everything that was
 * already right.
 *
 * **The headless corpus was built for something else and is better for it.**
 * Each `.examples/preview.html` under `helix/headless/src` renders one family's
 * headless tier against `preview.css`, a hand-written sheet with no token, no
 * theme and a fixed seven-value gray ramp. That is the determinism a screenshot
 * comparison needs with nothing asked of anybody, which is why this started
 * there and why that tier still needs no stylesheet from outside its own
 * directory.
 *
 * **The styled tier depends on the token layer holding still**, because a seed
 * change redraws every styled baseline at once and says nothing about any
 * component. Measured 25 Aug 2026 against `helix/styles/src/tokens.css`: **0 of
 * the last 30 commits touched it, 1 of the last 100, and 4 of the last 300**,
 * the one inside a hundred moving a translucency from 72% to 60%. A file that
 * moves four times in three hundred commits is not in flight, and a token change
 * that does redraw every styled picture is itself worth seeing laid out as a
 * diff rather than discovered on a page.
 *
 * So both tiers are pictured, and every headless name is also a styled name:
 * layout and effect families ship in the styled tier alone, having no behavior
 * to separate, so a family with no headless twin is expected rather than a
 * fault.
 *
 * **The styled tier needs `frame.css`, and without it the pages look plausible
 * rather than broken.** A styled sheet resolves design tokens and nothing else
 * in this harness defines one; the elements upgrade from `frame.js` either way.
 * Every styled family measured at 640, both ways: without the sheet, **23 of the
 * 30 `<helix-icon>` elements in the corpus are 100px or wider**, most of them
 * 300 by 300, and three pages report wider than the viewport they were given,
 * `app-header` at 707, `pin-input` at 984 and `toolbar` at 667. With
 * `/frame.css` served, no icon reaches 100px, the same ones measure 16 or 20,
 * and no page reports over 640. Rendering this way produces responsiveness
 * findings against families that overflow nothing, and a baseline taken without
 * the sheet bakes that in as the expected picture, which is worse than having no
 * baseline at all: from then on the check defends it.
 *
 * **The link comes before the inline style, and the ordering is load-bearing.**
 * `frame.css` sets `:root { color-scheme: light dark }` and a `body` background
 * from `--helix-color-background`, both at the same specificity as the two
 * rules written below, so nothing but source order decides. Measured both ways
 * on the same page: link last reports `color-scheme: light dark` and a body
 * painted in a token, which hands the color mode to whatever the runner's
 * `prefers-color-scheme` answers and puts the page's own ground under test;
 * link first reports `color-scheme: light` and `rgb(255, 255, 255)`, which is
 * what this file declares.
 *
 * **The mode is declared and emulated both**, because each covers what the other
 * misses. The declaration beats `frame.css`, but a headless example links its
 * own sheet after it, and every one of those declares `color-scheme: light
 * dark`, which then asks the preference. The preference alone loses to a
 * declaration, and `frame.css` keys the toast's inverted scheme to the media
 * query rather than to `color-scheme`. Declared only, every headless dark
 * picture was the light rendering on a black ground, and the styled toast was
 * dark over a dark page when it is meant to be the page's opposite.
 *
 * **The three brand faces are served, because `frame.css` asks for them.** It
 * carries `@font-face` rules naming `/fonts/*.woff2`, real files under
 * `fusion/site/public/fonts` since the frame stopped inlining them. Left
 * unanswered, `document.fonts` reports `Fusion Sans: error` and the styled
 * examples are drawn in whatever the platform calls `sans-serif`, so a baseline
 * would picture the library in a face the sandbox never shows it in. Served,
 * the same probe reports `loaded`.
 *
 * **Linux only, and that is a decision rather than a limitation.** Text
 * rasterization and subpixel antialiasing differ between macOS and the
 * `ubuntu-latest` this runs on, and no headless example sets `font-family`, so
 * on that tier the default stack differs as well and a baseline taken here and
 * compared there differs on nearly every glyph. Serving the faces settles the
 * font question for the styled tier and neither of the other two for either, so
 * the comparison still never crosses platforms: the baselines are Linux, the
 * check runs on Linux, and on anything else it says so and exits clean. To
 * refresh them from a Mac, dispatch the `Visual baselines` workflow, which
 * takes them on `ubuntu-latest` and opens a pull request to be looked at.
 *
 * Baselines live beside the example they picture, `.examples/preview.png` and
 * `.examples/preview.narrow.png`, in the package that authors it. The tiers
 * keep separate `src` trees, so the two sets share names and never a path.
 * `helix component`'s `examples` ignores them because it reads only `.html` and `.css`, which
 * is true of every other reader of an `.examples` directory as well.
 *
 * ```
 * bun run check:spec:visual              compare both tiers, and fail on a difference
 * bun run check:spec:visual accordion    just that family, in whichever tiers have one
 * bun run visual:update             rewrite the baselines
 * bun run check:spec:visual --workers 1  one family at a time, as a runner does
 * ```
 *
 * A failure writes `preview.diff.png` beside the baseline, the changed pixels
 * marked, and leaves it there to be looked at. It is gitignored: what belongs in
 * the history is the baseline a reviewer approved, not the artifact of a run.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join, relative } from 'node:path'
import { pool } from '@fusion.dev/scripts/pool'
import { root, SOURCE } from '@fusion.dev/scripts/workspace'
import pixelmatch from 'pixelmatch'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

/**
 * The two tiers, each read from the package that authors its own examples.
 *
 * Each tier authors its own examples, under the same name, so neither tier's
 * evidence is a function of the other's.
 *
 * `sheet` is the whole difference between them. A headless example is
 * deliberately token-free and its `preview.css` is the only styling it wants; a
 * styled example is nothing but tokens, and `frame.css` is the only file in the
 * repository that defines them for a document this harness assembles.
 */
const TIERS = [
  { name: 'headless', sheet: false, source: join(root, SOURCE.headless) },
  { name: 'styled', sheet: true, source: join(root, SOURCE.styled) },
]

/**
 * Every picture taken of a family: a width, and the mode it is taken in.
 *
 * **640 alone is neither a phone nor a desktop**, which makes a responsiveness
 * pass something done once rather than something that stays done. A library with
 * one viewport-width media query in it, Dialog's, and two families declaring
 * `container-type` has no policy yet; what it can have first is a picture of
 * what narrow currently looks like, so a change to it is visible.
 *
 * 390 is an iPhone's, and it is where the splitter keeps a horizontal
 * orientation and cuts its source pane to 237px. The suffix is empty at 640 so
 * those baselines keep the names they were committed under.
 *
 * **Dark is a third picture, and it exists because a whole mode was unwatched.**
 * Every baseline here was light, so a component could be correct in the theme it
 * was authored in and invisible in the other one with nothing to say so. Orb
 * shipped exactly that: its palette is read off the canvas, the computed value
 * comes back as `lab()` for tokens built through `oklab`, and the reader took
 * the first three numbers for red, green and blue. In light the near dots are
 * `lab(0 0 0)`, which scrapes to black and looks right; in dark it was a very
 * dark red mixed toward black on a near-black ground. Nothing here could see it.
 *
 * One width rather than two, because the mode is the axis being covered and a
 * fourth picture per family is a fourth thing to review for what the second
 * width already says about layout.
 */
const SHOTS = [
  { mode: 'light', suffix: '', width: 640 },
  { mode: 'light', suffix: '.narrow', width: 390 },
  { mode: 'dark', suffix: '.dark', width: 640 },
]

/* Both halves of what `turbo run frame` writes, and both are required.
   `build-frame.mjs` empties the directory and writes the bundle, the stylesheet
   and the document together, so one of them missing means none of them is
   trustworthy. */
const FRAME = join(root, 'fusion/site/public/sandbox/frame.js')
const SHEET = join(root, 'fusion/site/public/sandbox/frame.css')
const FONTS = join(root, 'fusion/site/public/fonts')

/* The family is the first argument that is not a flag, rather than the first
   argument. `visual:update` puts `--update` in that slot itself, so reading
   position two meant `bun run visual:update accordion` silently rewrote every
   baseline in the repository: the one command where doing more than was asked
   is least recoverable. Nor is a number a family: it is the value of
   `--workers`, and no family's name is one. */
const args = process.argv.slice(2)
const only = args.find((one) => !one.startsWith('--') && !/^\d+$/.test(one))
const update = args.includes('--update')

if (process.platform !== 'linux') {
  console.log(
    `visual: skipped on ${process.platform}. Baselines are Linux, because text rasterization and ` +
      'antialiasing differ by platform and no headless example names a font, so a comparison that ' +
      'crossed them would differ on nearly every glyph. CI is where this runs.',
  )
  process.exit(0)
}

const absent = [FRAME, SHEET].filter((one) => !existsSync(one))
if (absent.length > 0) {
  console.error(
    `visual: missing ${absent.map((one) => relative(root, one)).join(', ')}. Run \`turbo run frame\`` +
      ' first: the bundle is what defines the tags, and the stylesheet is what defines every token ' +
      'the styled tier draws with.',
  )
  process.exit(1)
}

/** Every family in a tier that has an example, filtered to the one asked for. */
const found = (source) =>
  readdirSync(source, { withFileTypes: true })
    .filter(
      (one) => one.isDirectory() && existsSync(join(source, one.name, '.examples/preview.html')),
    )
    .map((one) => one.name)
    .filter((name) => only === undefined || name === only)
    .sort()

const tiers = TIERS.map((tier) => ({ ...tier, families: found(tier.source) }))
const total = tiers.reduce((count, tier) => count + tier.families.length, 0)

if (total === 0) {
  console.error(
    only ? `visual: no example for ${only} in either tier.` : 'visual: no examples found.',
  )
  process.exit(1)
}

/* A named family present in one tier and not the other is reported and not
   refused. Layout and effect families ship styled-only, having no structure or
   a11y to separate, so `bun run check:spec:visual flex` legitimately pictures one
   tier; failing on it would make the filter unusable for exactly the families
   whose appearance is all they are. */
for (const tier of tiers) {
  if (only !== undefined && tier.families.length === 0) {
    console.log(
      `visual: no ${tier.name} example for ${only}, so only the other tier is pictured. A family ` +
        'that is presentation with nothing to separate has no headless tier to picture.',
    )
  }
}

/* Served rather than opened from disk: the frame bundle is a classic script and
   the example links `styles.css` relatively, so both want a real origin. The
   page is assembled here rather than read from a file so nothing has to be
   written into the tree to take a picture of it. */
const page = (tier, family, width, mode) => {
  const html = readFileSync(join(tier.source, family, '.examples/preview.html'), 'utf8')
  return (
    '<!doctype html><meta charset="utf-8"><title>preview</title>' +
    /* First, so the two rules below outrank it. See the header: `frame.css`
       declares `color-scheme` and a body background of its own, at the same
       specificity, and whichever comes last wins. */
    (tier.sheet ? '<link rel="stylesheet" href="/frame.css">' : '') +
    /* A fixed ground and a fixed inset, so a component that draws to its own
       edge is not cropped and the page's own color is never the thing under
       test. `color-scheme` is declared because the base sheets resolve their
       grays through `light-dark()`, and the token layer resolves everything
       else through it. */
    /* **The mode is declared here as well as emulated, because a declaration
       beats a preference.** Emulated alone, the page overrode it at the same
       specificity: asking the browser for dark and serving `color-scheme:
       light` produced 182 pictures with a white ground, each one the light
       rendering under a dark name. The ground is fixed in both modes
       for the reason it was fixed in one: the page's own color is never the
       thing under test, and `#000` is what `--helix-color-background` resolves
       to in dark, measured as `oklch(0 0 0)`. */
    `<style>:root{color-scheme:${mode}}` +
    `body{margin:0;padding:24px;background:${mode === 'dark' ? '#000' : '#fff'};` +
    /* **The ink is declared as well as the ground, because the headless tier
       has no color of its own.** That tier links no stylesheet, so its text took
       whatever the user agent defaults to, and `color-scheme: dark` changing
       that default is a browser behavior rather than a guarantee: headless
       Chromium on Linux kept it black, so the first dark retake wrote 8 pictures
       that were a single color and 21 that had lost most of their ink. Black on
       black is not a component being invisible in dark, it is the harness
       failing to say what ink is. */
    `color:${mode === 'dark' ? '#fff' : '#000'};` +
    `width:${width}px;box-sizing:border-box}</style>` +
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

const TYPES = { '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2' }
const server = createServer((request, response) => {
  const path = (request.url ?? '/').split('?')[0]
  if (path === '/frame.js') {
    response.writeHead(200, { 'content-type': TYPES['.js'] })
    response.end(readFileSync(FRAME))
    return
  }
  if (path === '/frame.css') {
    response.writeHead(200, { 'content-type': TYPES['.css'] })
    response.end(readFileSync(SHEET))
    return
  }
  /* The faces `frame.css` names, from the same public directory the site serves
     them out of, so the frame's stylesheet gets the same answer here that it
     gets in the sandbox. */
  const face = /^\/fonts\/([a-z0-9-]+\.woff2)$/.exec(path)
  if (face !== null) {
    const file = join(FONTS, face[1])
    if (!existsSync(file)) {
      response.writeHead(404).end()
      return
    }
    response.writeHead(200, { 'content-type': TYPES['.woff2'] })
    response.end(readFileSync(file))
    return
  }
  /* The tier is in the path rather than in the port or in a module variable,
     for the reason the width is in the query: a request carries everything
     needed to answer it, so the two corpora cannot be served the wrong sheet by
     being asked for in the wrong order. A relative `styles.css` from
     `/styled/card/` resolves inside the same pair, which is what lets one
     example file work under either tier. */
  const example = /^\/(headless|styled)\/([a-z][a-z0-9-]*)\/(styles\.css)?$/.exec(path)
  if (example === null) {
    response.writeHead(404).end()
    return
  }
  const [, name, family, sheet] = example
  const tier = TIERS.find((one) => one.name === name)
  if (sheet !== undefined) {
    const file = join(tier.source, family, '.examples/preview.css')
    response.writeHead(200, { 'content-type': TYPES['.css'] })
    response.end(existsSync(file) ? readFileSync(file) : '')
    return
  }
  response.writeHead(200, { 'content-type': 'text/html' })
  /* The width rides in the query rather than in a module variable the loop
     sets, so a request is answered by what it asked for and two widths could
     be fetched in any order without the page depending on when it was asked. */
  const asked = new URL(request.url ?? '/', 'http://x').searchParams
  const width = Number(asked.get('w')) || SHOTS[0].width
  const mode = asked.get('m') === 'dark' ? 'dark' : 'light'
  response.end(page(tier, family, width, mode))
})

await new Promise((done) => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch()
/* **`reducedMotion`, because `animations: 'disabled'` only reaches the
   animations the browser is running.** It cancels CSS and Web Animations, which
   is every family here bar one: `aura` drives a WebGL shader from its own
   `requestAnimationFrame` loop, so the screenshot caught the field at whatever
   phase the runner happened to reach. Measured on one machine, three
   consecutive loads of the same page: 26,883 and 25,677 pixels apart. On CI,
   44,573 against the committed picture, a sixth of the image, at a channel
   delta of 22.

   None of it ever failed the check, which is the part worth saying plainly. It
   sat inside the threshold for a decade of runs and would have started failing
   on a driver change, for a reason that is not a fact about the component.

   `prefers-reduced-motion` rather than a per-family pin: it is the platform's
   own way to ask for no motion, and `aura` already answers it with one still
   frame rather than an empty box, so the harness asks for the frame the
   component already offers instead of the example being written to sit still.
   Measured across both corpora, 181 families at the check's own threshold,
   **0 of them draw differently under it**, so nothing else is repictured and no
   baseline moves for this. The two `aura` pictures become byte-identical run to
   run. */
const CONTEXT = { reducedMotion: 'reduce', viewport: { height: 800, width: SHOTS[0].width } }

/* Nothing leaves this machine, and that is a correctness rule rather than a
 * courtesy.
 *
 * Three headless examples name assets on other people's servers: `image` and
 * `video` load a photograph from Unsplash, and `video` and `video-playlist`
 * load clips from MDN. Left open, a baseline records whatever those hosts
 * happened to return, so the check goes red the day one of them is slow, is
 * down, or re-encodes a picture, none of which is a fact about this library.
 * Left open, the poster arrives over the network and the clip does not, because
 * Playwright's Chromium ships without the proprietary codecs, so the picture
 * records a photograph and an error message together.
 *
 * Blocked, all three render the same missing-media state everywhere, which is
 * deterministic and is still the thing under test: what a baseline guards on
 * these families is the component's own frame, controls and layout, and the
 * poster was never more than what happened to be behind them.
 *
 * The brand faces are the reason this is an origin test rather than a scheme
 * test: they are served from here, so they continue, and nothing else does. */
const closed = (context) =>
  context.route('**/*', (route) => {
    const url = route.request().url()
    return url.startsWith(origin) ? route.continue() : route.abort()
  })

/**
 * One picture of one family, compared with its baseline or written over it.
 *
 * What it found is returned rather than recorded, so the pictures can be taken
 * on any worker and still be reported in the order the loop over them had.
 */
const shoot = async (tab, tier, family, { mode, suffix, width }) => {
  const outcome = { changed: [], compared: false, held: [], written: [] }
  await tab.setViewportSize({ height: 800, width })
  await tab.emulateMedia({ colorScheme: mode })
  await tab.goto(`${origin}/${tier.name}/${family}/?w=${width}&m=${mode}`, {
    waitUntil: 'load',
  })
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

  /* **`animations: 'disabled'` or the animated families can never settle.**
     Loader carries three `infinite` animations, a 0.8s turn and two 2.4s
     breathes, so a screenshot catches the spinner wherever it happened to be
     and the comparison reports a difference that is only a phase. Measured on
     26 Aug 2026: `styled/loader`, 17 pixels moved, against a baseline taken
     from the same source minutes earlier.

     Playwright cancels infinite animations to their initial state and
     fast-forwards finite ones to completion, so every family is pictured at
     one definite moment rather than at whatever moment the runner reached it.
     That is what makes a baseline a fact about the component rather than
     about the machine's timing. */
  const shot = await tab.screenshot({ animations: 'disabled', fullPage: true })
  const baseline = join(tier.source, family, `.examples/preview${suffix}.png`)
  /* Both tiers, both widths, one name each. The pictures never collide
     because the tiers keep separate `src` trees, so the name says only
     which width it is and the path says which tier. */
  const what = `${tier.name}/${family}${suffix}`

  /* A missing baseline is a failure and not a chance to write one. Seeding on a
     bare run is the version of this that passes forever: CI would take its own
     picture, agree with it, report success and commit nothing, so the check
     would be green from the day it was added without ever having compared
     anything. `--update` is the only thing that writes, and what it writes is
     reviewed as a diff before it counts. */
  const has = existsSync(baseline)
  if (!has && !update) {
    outcome.changed.push(
      `${what}: no baseline. Dispatch the \`Visual baselines\` workflow and look at the pull ` +
        'request it opens: the first picture is the one every later comparison trusts.',
    )
    return outcome
  }

  const after = PNG.sync.read(shot)
  const before = has ? PNG.sync.read(readFileSync(baseline)) : undefined
  const resized =
    before !== undefined && (before.width !== after.width || before.height !== after.height)

  let moved = 0
  let diff
  if (before !== undefined && !resized) {
    diff = new PNG({ height: before.height, width: before.width })
    /* `threshold` is per-pixel color distance, not a budget of pixels. Zero
       tolerated pixels, because this only ever compares Linux to Linux and a
       single moved pixel is the fault it exists to catch. The threshold is off
       the floor only so a renderer's own dithering does not read as a change. */
    moved = pixelmatch(before.data, after.data, diff.data, before.width, before.height, {
      threshold: 0.1,
    })
  }

  /* **Writing only what the comparison would have rejected**, which is not
     the same as writing what changed. A PNG whose bytes differ is not a
     picture that differs: re-encoding the same page produced files unequal
     to `git` and equal to `pixelmatch` on ten of the ninety-three families,
     and a retake that committed them proposed twenty-three files for review
     when two had actually moved. The sub-threshold ones measured 3 to 5
     pixels a side apart, at a channel delta of 1, except `styled/aura`,
     which redraws a soft field across 44,573 pixels at a delta of 22 and
     still lands inside the threshold.

     Holding those keeps a retake reviewable, since every file in it is one
     somebody has to look at, and keeps the baseline the picture a reviewer
     approved rather than the newest byte-identical rendering of it. It also
     bounds the drift: each comparison is against the committed baseline, so
     sub-threshold movement cannot accumulate past the threshold by being
     re-recorded a run at a time. */
  if (update) {
    if (!has || resized || moved > 0) {
      mkdirSync(dirname(baseline), { recursive: true })
      writeFileSync(baseline, shot)
      outcome.written.push(what)
    } else {
      outcome.held.push(what)
    }
    return outcome
  }

  outcome.compared = true

  if (resized) {
    outcome.changed.push(
      `${what}: ${before.width}x${before.height} became ${after.width}x${after.height}. A size ` +
        'change is a layout change, and no diff image is written because there is nothing to ' +
        'lay one over.',
    )
    return outcome
  }

  if (moved > 0) {
    const where = join(tier.source, family, `.examples/preview${suffix}.diff.png`)
    writeFileSync(where, PNG.sync.write(diff))
    outcome.changed.push(
      `${what}: ${moved} pixels moved. The marked difference is at ${relative(root, where)}. ` +
        'If the change was meant, dispatch the `Visual baselines` workflow and the review is ' +
        'the diff on the baseline.',
    )
  }
  return outcome
}

/* **One page per worker, on the workers `pool` decides**, taking all three
   pictures of every family that worker is given. Each picture is a navigation,
   so the registry is empty for every one of them, and nothing here listens, so
   a page per family kept nothing apart and cost a runner a page load per
   family (see `pool`). What a picture depends on is set where it was: the
   viewport and the mode per picture, and reduced motion, the route and the
   device scale on the context every worker is given. Measured 15 Sep 2026 in
   the Playwright image on twelve cores, whose fonts move 254 pictures from
   their ubuntu-latest baselines, the same pictures by the same counts on every
   run either way: 32 and 29 seconds on four workers and 69 on one, against 30,
   30 and 73 on a page per family. */
const units = tiers.flatMap((tier) => tier.families.map((family) => ({ family, tier })))
const outcomes = await pool(units, {
  browser,
  context: CONTEXT,
  page: 'worker',
  prepare: closed,
  run: async (tab, { family, tier }) => {
    const taken = []
    for (const shot of SHOTS) {
      taken.push(await shoot(tab, tier, family, shot))
    }
    return taken
  },
})

/* Read back picture by picture, then tier, then family, the order a single page
   took them in, so a failing run lists what moved as it always did. */
const changed = []
const written = []
/** Baselines a retake left alone, because the comparison would have passed. */
const held = []
const compared = new Map(TIERS.map((tier) => [tier.name, 0]))
for (const at of SHOTS.keys()) {
  for (const [index, { tier }] of units.entries()) {
    const outcome = outcomes[index][at]
    changed.push(...outcome.changed)
    written.push(...outcome.written)
    held.push(...outcome.held)
    if (outcome.compared) {
      compared.set(tier.name, compared.get(tier.name) + 1)
    }
  }
}

await browser.close()
server.close()

/** `2 headless, 3 styled`, from a map keyed by tier, with the empty ones out. */
const counted = (counts) =>
  [...counts]
    .filter(([, count]) => count > 0)
    .map(([name, count]) => `${count} ${name}`)
    .join(', ')

if (changed.length > 0) {
  console.error(`Examples have moved (${changed.length}):\n\n  ${changed.join('\n  ')}\n`)
  process.exit(1)
}

if (update && written.length === 0) {
  console.log(
    `visual: ${held.length} baseline(s) already agree with the page, and none was rewritten. ` +
      'A retake writes only what the comparison would have rejected, so nothing here needs review.',
  )
  process.exit(0)
}

if (written.length > 0) {
  const by = new Map(TIERS.map((tier) => [tier.name, 0]))
  for (const what of written) {
    const name = what.split('/')[0]
    by.set(name, by.get(name) + 1)
  }
  console.log(
    `visual: wrote ${written.length} baseline(s) (${counted(by)})` +
      /* Named while there are few enough to read. Both tiers at both widths is
         three hundred and forty-two lines, which is a wall rather than a
         report; one family is four, which is exactly what somebody running
         `visual:update accordion` wants to see. */
      (written.length <= 12 ? `: ${written.join(', ')}` : '') +
      `. ${held.length} left alone, agreeing with the page already` +
      '. Commit them: an unreviewed baseline records whatever was on screen as correct.',
  )
  process.exit(0)
}

console.log(`visual: ${counted(compared)} examples, every one pixel for pixel with its baseline`)

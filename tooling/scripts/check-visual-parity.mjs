#!/usr/bin/env bun
/**
 * Renders every example twice, from its HTML and from its TSX, and compares.
 *
 * **This is the assertion that makes two authored files safe.** Both syntaxes
 * are written by hand now, neither derived from the other, which is the right
 * arrangement and costs exactly one thing: nothing stops them drifting. The old
 * arrangement could not drift because the React view was a function of the HTML
 * one; it also could not be correct, emitting a `<script>` into a JSX fragment
 * for all 28 script-bearing examples and three separate faults on the rest.
 * `check:examples-paired` holds the two files to each other. This holds the two
 * pictures to each other, which is the only comparison that can see a React
 * example rendering something else.
 *
 * **The bug it was written against**, and the reason it is worth its runtime: a
 * data table given `rows={rows}` drew a correctly labeled, permanently empty
 * grid. React skips object props while hydrating, both halves of it agree to
 * drop them, and nothing warns. Every check in this repository reads source or
 * asserts a fact somebody thought to assert. Two pictures of the same example
 * assert the part nobody thinks to.
 *
 * **No baseline, and that is the interesting difference from `check:visual`.**
 * That check compares today's render to a committed PNG, so it is Linux-only:
 * text rasterization differs by platform and a cross-platform comparison would
 * differ on nearly every glyph. This compares two renders taken seconds apart
 * on one machine in one browser, so the platform cancels out and it runs
 * anywhere. Nothing is committed, so nothing can be committed wrong.
 *
 * **What a difference means is usually the React side.** The HTML example is
 * the one the sandbox has always run and the one `check:visual` already guards
 * against a reviewed baseline, so when these two disagree the picture to
 * distrust is the new one. The diff is written beside the example as
 * `<slug>.parity.png` and left there to be looked at.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createServer } from 'node:http'
import { join, relative, resolve } from 'node:path'
import pixelmatch from 'pixelmatch'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const root = resolve(import.meta.dirname, '../..')

/* The same two tiers `check:visual` pictures, read the same way and for the
   same reason: a headless example is deliberately token-free and wants only its
   own `preview.css`, and a styled example is nothing but tokens and wants
   `frame.css`. */
const TIERS = [
  { name: 'headless', sheet: false, source: join(root, 'helix/headless/src') },
  { name: 'styled', sheet: true, source: join(root, 'helix/styled/src') },
]

const FRAME = join(root, 'site/ui/public/sandbox/frame.js')
const SHEET = join(root, 'site/ui/public/sandbox/frame.css')
const FONTS = join(root, 'site/ui/public/fonts')
const BUILT = join(root, '.local/parity')

/* One width, not the two `check:visual` takes. That check is asking whether the
   library still looks like itself, which is a question about layout and wants
   a narrow picture; this one is asking whether two spellings of one example
   agree, and a disagreement large enough to matter is visible at any width. The
   corpus here is fourteen times larger, so the second width would buy a
   repetition rather than a finding. */
const WIDTH = 640

const args = process.argv.slice(2)
const only = args.find((one) => !one.startsWith('--'))

const absent = [FRAME, SHEET].filter((one) => !existsSync(one))
if (absent.length > 0) {
  console.error(
    `parity: missing ${absent.map((one) => relative(root, one)).join(', ')}. Run ` +
      '`bun run frame` first: the bundle is what defines the tags on both sides.',
  )
  process.exit(1)
}

/**
 * The bundle has to be newer than the components, or a fix looks like a failure.
 *
 * **Both sides render from `frame.js`**, so a change to a component reaches
 * neither of them until `bun run frame` has rebuilt it. That is not a stale
 * picture, it is a stale *library*, and it reads as the fix not having worked:
 * `breadcrumbs/links` was repaired, re-run, and still reported 1,236 pixels,
 * because the bundle predated the repair. Checked rather than remembered.
 */
const newest = (dir) => {
  let latest = 0
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name.includes('.spec.')) {
      continue
    }
    latest = Math.max(latest, statSync(join(entry.parentPath ?? entry.path, entry.name)).mtimeMs)
  }
  return latest
}

const bundled = statSync(FRAME).mtimeMs
const sources = Math.max(...TIERS.map((tier) => newest(tier.source)))
if (sources > bundled) {
  console.error(
    'parity: `frame.js` is older than the components it bundles, so both sides would render the\n' +
      '  library as it was before your change. Run `bun run frame` and try again.',
  )
  process.exit(1)
}

/**
 * The three that are not compared, each with what was measured rather than a name.
 *
 * **An exception here is a recorded fact, not a silenced failure**, which is why
 * each carries its numbers: a reader can re-run the measurement and take the
 * entry out. Two are the harness meeting something it cannot hold still even across a
 * retry, and one is a real difference between the two idioms.
 */
const UNCOMPARED = new Map([
  [
    'styled/pagination/footer',
    /* Nondeterministic on *both* sides, so the comparison is a coin flip rather
       than a reading. The row settles within a load, six frames of 274 on one
       side and 273 on the other, and settles somewhere else on the next:
       measured across three loads, the markup twin alone came out 272, 273 and
       275. The width that moves is `helix-pagination-size`, 223 to 228, and the
       trigger inside it is sized by the browser from its widest option rather
       than by any code here.

       Ruled out, so the next reader does not repeat it: it is not scroll and not
       an unsettled layout, since the row holds one value for six straight frames
       within a load and picks a different one on the next; it is not a React
       fault, since the markup side varies just as much; and it is not the brand
       font failing, which a scratch probe suggested and was an artifact of that
       probe having no `/fonts/` route where this file has one. */
    'unstable on both sides across loads: 272, 273 and 275 for the markup twin alone',
  ],
  [
    'styled/video/native',
    /* The native control strip is the user agent's own shadow DOM, and nothing
       here reaches it: `animations: 'disabled'` covers author animations and the
       settle loop covers author layout. It survives the retry too, which is what
       separates it from `aura/streaks`: that one paints to a canvas and clears
       on a second pass, while this differs every time by a different amount.
       Measured at 22, 34 and 122 pixels, all of it inside the controls. */
    "the user agent's own video controls, which no wait or retry here can settle",
  ],
  [
    'styled/outline/events',
    /* A real difference between the idioms, and the React side is the honest
       one. The outline announces its opening reading position during its first
       update, deliberately, so a consumer syncing a URL hash does not have to
       poll for it. A deferred module script binds after that has happened and
       misses it; a React `onhelix-before-activate` prop does not, because
       `bindReactHandler` binds at dispatch. The markup twin's log reads "Nothing
       yet" and the React twin's records the announcement, and both are telling
       the truth about how they were written. Making them agree means crippling
       the React one or teaching the markup one to listen on `document` before
       anything upgrades, and the second is a worse example. */
    'the markup twin binds too late to hear the opening announcement; React does not',
  ],
])

/** Every example that is authored in both syntaxes, which is what can be paired. */
const corpus = []
for (const tier of TIERS) {
  for (const entry of readdirSync(tier.source, { withFileTypes: true })) {
    const dir = join(tier.source, entry.name, '.examples')
    if (!entry.isDirectory() || !existsSync(dir)) {
      continue
    }
    if (only !== undefined && entry.name !== only) {
      continue
    }
    for (const file of readdirSync(dir)
      .filter((one) => one.endsWith('.html'))
      .sort()) {
      const slug = file.replace(/\.html$/, '')
      if (!existsSync(join(dir, `${slug}.tsx`))) {
        continue
      }
      corpus.push({ dir, family: entry.name, slug, tier })
    }
  }
}

if (corpus.length === 0) {
  console.error(only ? `parity: no paired example for ${only}.` : 'parity: no paired examples.')
  process.exit(1)
}

/**
 * One browser module per example, React and all, built ahead of the run.
 *
 * **A stylesheet import resolves to nothing on purpose.** An example says
 * `import './preview.css'` because that is what a React consumer writes, and
 * the page here links the very same file the HTML side links. Bundling it as
 * well would apply it twice, and more to the point it would be *this* harness
 * deciding how the stylesheet arrives, which is the one thing that has to be
 * identical on both sides for the comparison to mean anything.
 */
const stubStylesheets = {
  name: 'stub-stylesheets',
  setup(build) {
    build.onResolve({ filter: /\.css$/ }, (one) => ({ namespace: 'stub', path: one.path }))
    build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: '', loader: 'js' }))
  },
}

rmSync(BUILT, { force: true, recursive: true })
mkdirSync(BUILT, { recursive: true })

/* `display: contents` on the mount point, so React's root generates no box.
   Without it the React side has one more element in the tree than the HTML
   side and every flow layout differs by whatever that box does. */
const entries = corpus.map((one) => {
  const id = `${one.tier.name}--${one.family}--${one.slug}`
  const file = join(BUILT, `${id}.tsx`)
  writeFileSync(
    file,
    `import { createRoot } from 'react-dom/client'\n` +
      `import { Example } from ${JSON.stringify(join(one.dir, `${one.slug}.tsx`))}\n` +
      `createRoot(document.getElementById('root')).render(<Example />)\n`,
  )
  return { ...one, file, id }
})

/* **`root` is pinned, and leaving it inferred is a trap worth naming.** Bun
   derives the output layout from the common parent of the entrypoints, and what
   it derives changes with how many there are: twenty entries in this directory
   came out flat in `out/`, and all 548 came out under `out/.local/parity/`
   instead. The server went on serving `out/<id>.js`, every module 404'd, and
   every React page rendered an empty root, which the comparison reported as a
   plausible little pixel count on each of 548 examples. Naming the root makes
   the layout a fact rather than a function of the corpus size. */
const built = await Bun.build({
  entrypoints: entries.map((one) => one.file),
  minify: false,
  outdir: join(BUILT, 'out'),
  plugins: [stubStylesheets],
  root: BUILT,
  splitting: true,
  target: 'browser',
})

if (!built.success) {
  console.error(
    `parity: ${built.logs.length} example(s) would not build.\n\n  ` +
      `${built.logs.map((one) => String(one)).join('\n  ')}\n\n` +
      '  A TSX example that does not compile is one nothing can render. Fix it there.',
  )
  process.exit(1)
}

/* Checked against the disk rather than against `built.outputs`, which reported
   all 548 while ten files existed where they were being served from. A bundle
   that is not where the server looks is an error here, not a blank page later. */
const unbuilt = entries.filter((one) => !existsSync(join(BUILT, 'out', `${one.id}.js`)))
if (unbuilt.length > 0) {
  console.error(
    `parity: ${unbuilt.length} bundle(s) are not where they are served from, starting with ` +
      `${unbuilt[0].id}.js. The build reported success, so this is a layout question rather ` +
      'than a compile one: check `root` against where the entries were written.',
  )
  process.exit(1)
}

/** The shared page frame, so the only difference between the two is the body. */
const shell = (tier, body, script) =>
  '<!doctype html><meta charset="utf-8"><title>parity</title>' +
  (tier.sheet ? '<link rel="stylesheet" href="/frame.css">' : '') +
  '<link rel="stylesheet" href="styles.css">' +
  '<style>:root{color-scheme:light}' +
  `body{margin:0;padding:24px;background:#fff;width:${WIDTH}px;box-sizing:border-box}` +
  '#root{display:contents}</style>' +
  /* `defer`, for the reason `check-visual.mjs` records: loaded eagerly the
     bundle runs mid-parse, an element upgrades the moment the parser reaches it,
     and anything it looks up by id further down the document is not there yet.
     Virtual List reads its rows from a `<script type="application/json">` that
     follows it and came out empty.

     It is also the ordering that matters for the React side, and the two are
     the same fact. A classic `defer` script and a module both run before
     `DOMContentLoaded` in document order, so the definitions are registered
     before React creates a single element, which is the arrangement where an
     object prop is assigned as a property rather than stringified into an
     attribute. */
  `<script defer src="/frame.js"></script>${script}${body}`

/* **Held in memory rather than read per request, because the file moves.**
   `bun run frame` empties the directory and rewrites the bundle, so a rebuild
   running alongside this serves a truncated `frame.js` or none at all. Every
   element then fails to define, every React page renders an empty root, and the
   run reports all 568 examples differing, which reads as a catastrophe in the
   examples rather than as a missing file. Read once, and a rebuild mid-run
   cannot reach the comparison. */
const frameBundle = readFileSync(FRAME)
const frameSheet = readFileSync(SHEET)

const TYPES = { '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2' }

const server = createServer((request, response) => {
  const path = (request.url ?? '/').split('?')[0]

  if (path === '/frame.js' || path === '/frame.css') {
    response.writeHead(200, { 'content-type': TYPES[path.endsWith('.js') ? '.js' : '.css'] })
    response.end(path === '/frame.js' ? frameBundle : frameSheet)
    return
  }

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

  const bundle = /^\/bundle\/(.+\.js)$/.exec(path)
  if (bundle !== null) {
    const file = join(BUILT, 'out', bundle[1])
    if (!existsSync(file)) {
      response.writeHead(404).end()
      return
    }
    response.writeHead(200, { 'content-type': TYPES['.js'] })
    response.end(readFileSync(file))
    return
  }

  /* `<mode>/<tier>/<family>/<slug>/`, with the example's own stylesheet under
     it, so a relative `styles.css` resolves inside the pair being compared and
     both modes are handed byte-identical CSS. */
  const asked =
    /^\/(html|react)\/(headless|styled)\/([a-z][a-z0-9-]*)\/([a-z0-9.-]+)\/(styles\.css)?$/.exec(
      path,
    )
  if (asked === null) {
    response.writeHead(404).end()
    return
  }
  const [, mode, tierName, family, slug, wantsSheet] = asked
  const entry = entries.find(
    (one) => one.tier.name === tierName && one.family === family && one.slug === slug,
  )
  if (entry === undefined) {
    response.writeHead(404).end()
    return
  }

  if (wantsSheet !== undefined) {
    const file = join(entry.dir, `${slug}.css`)
    response.writeHead(200, { 'content-type': TYPES['.css'] })
    response.end(existsSync(file) ? readFileSync(file) : '')
    return
  }

  response.writeHead(200, { 'content-type': 'text/html' })
  if (mode === 'html') {
    /* The example's markup as it sits on disk, minus the directive comments the
       manifest reads. The HTML side keeps its `<link>`; the shell already
       emitted one to the same file, and a second is inert. */
    response.end(shell(entry.tier, readFileSync(join(entry.dir, `${slug}.html`), 'utf8'), ''))
    return
  }
  /* **`type="module"`, and getting this wrong is the failure this harness is
     most vulnerable to.** Bun emits ESM, and with `splitting` the entry carries
     a real `import` of the shared chunk. Loaded as a classic script that is a
     syntax error, React never mounts, and the page is a bare `#root`: the
     comparison then runs against a blank and reports a small, plausible pixel
     count rather than an error. Measured while writing this, `styled/badge/dot`
     reported 74 pixels that way, against 0 once the type was right.

     A module script and a deferred classic script both run after parsing, in
     tree order, so `frame.js` still defines the elements before this creates
     one. */
  response.end(
    shell(
      entry.tier,
      '<div id="root"></div>',
      `<script type="module" src="/bundle/${entry.id}.js"></script>`,
    ),
  )
})

await new Promise((done) => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch()
const tab = await browser.newPage({ viewport: { height: 800, width: WIDTH } })

/* Nothing leaves this machine, for the reason `check-visual.mjs` gives: three
   examples name assets on other people's servers, and a comparison that let
   them through would record whatever those hosts returned each time. Blocked,
   both sides render the same missing-media state, which is deterministic and
   still the thing under test. */
await tab.route('**/*', (route) =>
  route.request().url().startsWith(origin) ? route.continue() : route.abort(),
)

/* **Nothing is normalized, and two attempts to were both wrong.**
   The idea each time was that JSX drops whitespace touching a line break while
   HTML keeps it, so the HTML side should be adjusted to match. Both versions
   made the numbers move and neither was right, because the premise is: this
   compares what the two examples *ship as*, and the HTML one ships with those
   spaces. Rewriting it to render like the TSX asks the comparison whether the
   two say the same thing, which is a question `check:examples-paired` already
   covers and not the one worth a browser.

   So the difference is real and it belongs to the TSX. Prose wrapping an inline
   element needs an explicit `{' '}` in JSX, the way `quote/preview` does:
   without it React renders "Lorem ipsumdolor sit amet" and the HTML renders
   "Lorem ipsum dolor sit amet". That is a fact about writing React, it is what a
   consumer copying the example would hit, and hiding it behind a normalization
   is the harness lying to make itself green. */

/* **What the page said, kept so a blank render can explain itself.** The guard
   below can tell that `#root` is empty and nothing else; the reason is always in
   the console, and a harness that makes somebody re-run it by hand to read the
   reason is a harness that gets guessed at instead. Cleared per navigation. */
const said = []
tab.on('console', (one) => {
  if (one.type() === 'error') {
    said.push(one.text())
  }
})
tab.on('pageerror', (one) => said.push(String(one)))

/** Loads one side and waits for it to have settled, the way the spec runner does. */
const picture = async (url) => {
  said.length = 0
  await tab.goto(url, { waitUntil: 'load' })
  const undefinedTags = await tab.evaluate(async () => {
    /* **Bounded, because `whenDefined` on a tag nothing registers never
       settles.** An example naming an element the bundle does not define used to
       hang the run outright: no output, no failure, no way to tell a slow
       machine from a stuck one, and a full sweep that sat for forty minutes and
       had to be killed. The wait is the same wait; what is new is that it gives
       up and says which tags it was waiting for. Five seconds is far past any
       real upgrade and far short of noticing it by hand. */
    const pending = [...document.querySelectorAll(':not(:defined)')].map((one) => one.localName)
    await Promise.race([
      Promise.all([...new Set(pending)].map((tag) => customElements.whenDefined(tag))),
      new Promise((done) => setTimeout(done, 5000)),
    ])
    return [...new Set(pending)].filter((tag) => customElements.get(tag) === undefined)
  })
  await tab.evaluate(async () => {
    /* Three frames rather than the two `check:visual` waits. React mounts in a
       task of its own and an example that sets state in an effect, which the
       timestamped ones do, needs the render that follows it. */
    await new Promise((done) =>
      requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done))),
    )
    await document.fonts.ready

    /* **Every Helix element's own settle signal, which is the one the library
       publishes for exactly this.** `HelixElement` resolves `whenSettled` from
       the frame after `firstUpdated`, once its first style resolution is done
       and the transition suppression lifts; `@helix-io/testing` already waits on
       it for the same reason. Without it the comparison reads a stopwatch:
       `pagination/footer` reported 419 pixels on one run and 842 on the next
       from the same two files.

       Bounded, because an element that never settles must not hang the sweep. */
    await Promise.race([
      Promise.all(
        [...document.querySelectorAll('*')]
          .map((one) => one.whenSettled)
          .filter((one) => one instanceof Promise),
      ),
      new Promise((done) => setTimeout(done, 5000)),
    ])

    /* **And wait for scrolling to stop, which `animations: 'disabled'` does not
       do.** Playwright cancels CSS animations and fast-forwards transitions; a
       programmatic `scrollTo({ behavior: 'smooth' })` is neither, so a component
       that scrolls itself on the first update is caught wherever it happened to
       be. Measured on `carousel/controlled`, which scrolls to its opening slide:
       three runs of the same page reported `scrollLeft` of 135, 184 and 239. The
       comparison was reading a stopwatch, not a difference between two examples.

       Polled rather than waited on `scrollend`, which does not fire for a scroll
       that never started, and bounded so a component scrolling forever cannot
       hang the run. */
    /* **Geometry as well as scroll, because the page is still moving after
       both.** A nested control that measures itself settles a frame or two after
       everything this already waits for, and the flex row it sits in
       redistributes when it does. Measured on `pagination/footer`, whose width
       came out 272, 273 and 275 across three runs of the *same* file: both sides
       were unstable, so the comparison was reading whichever frame it caught
       rather than a difference between two examples.

       One signal covering scroll offsets and boxes together, held for three
       frames and bounded, so a component that never stops moving reports a
       difference instead of hanging. */
    const shape = () =>
      [...document.querySelectorAll('*')]
        .map((one) => {
          const box = one.getBoundingClientRect()
          return `${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)},${one.scrollLeft},${one.scrollTop}`
        })
        .join('|')
    let last = shape()
    for (let still = 0, spent = 0; still < 3 && spent < 120; spent += 1) {
      await new Promise((done) => requestAnimationFrame(done))
      const now = shape()
      still = now === last ? still + 1 : 0
      last = now
    }
  })
  return { shot: await tab.screenshot({ animations: 'disabled', fullPage: true }), undefinedTags }
}

const findings = []
/** Listed exceptions that have started matching, which is a fact worth failing on. */
const stale = []
let compared = 0

for (const entry of entries) {
  const where = `${entry.tier.name}/${entry.family}/${entry.slug}`
  /**
   * Taken twice when they disagree, and reported only if they disagree again.
   *
   * **A real difference reproduces and a flake does not**, which is what makes
   * this honest rather than a way of going green. `chat/command` reported 2,566
   * pixels on three consecutive runs before it was fixed; `aura/streaks` paints
   * to a canvas and reported 33 pixels on one run in three, and nothing here can
   * know when a canvas has finished. The retry costs a second pass only on the
   * examples that differ, and a difference that survives it is a difference.
   */
  let first = await picture(`${origin}/html/${entry.tier.name}/${entry.family}/${entry.slug}/`)
  let second = await picture(`${origin}/react/${entry.tier.name}/${entry.family}/${entry.slug}/`)
  if (!first.shot.equals(second.shot)) {
    first = await picture(`${origin}/html/${entry.tier.name}/${entry.family}/${entry.slug}/`)
    second = await picture(`${origin}/react/${entry.tier.name}/${entry.family}/${entry.slug}/`)
  }
  const from = first.shot
  const to = second.shot

  /* An element nothing registers is a broken example, not a difference between
     two of them, and it is worth saying so rather than diffing two pictures of
     an inert tag. Both sides are named because only one of them usually has it:
     a renamed component reaches the markup twin and not the TSX one, or the
     bundle predates both. */
  const missing = [...new Set([...first.undefinedTags, ...second.undefinedTags])]
  if (missing.length > 0) {
    findings.push(
      `${where}: ${missing.map((tag) => `\`<${tag}>\``).join(', ')} never upgraded, so nothing ` +
        'registers them. The example names an element the bundle does not define: check the tag ' +
        'against the component, and that `bun run frame` has run since it was renamed.',
    )
    continue
  }

  /* **Asserted rather than assumed, because a blank page is a picture too.**
     Everything that can go wrong on the React side (a module that would not
     load, an export named something else, a mount that threw) produces an empty
     `#root`, and an empty root diffed against a real render is a pixel count
     rather than an error. The count is small and plausible on a small example,
     which is exactly how it would be believed. */
  const mounted = await tab.evaluate(() => document.getElementById('root')?.childElementCount ?? 0)
  if (mounted === 0) {
    findings.push(
      `${where}: the TSX rendered nothing, \`#root\` is empty. ` +
        (said.length > 0
          ? `The page said: ${said.slice(0, 2).join(' | ')}`
          : 'The page said nothing, so the module loaded and the component returned no elements.'),
    )
    continue
  }

  const html = PNG.sync.read(from)
  const react = PNG.sync.read(to)
  compared += 1

  if (html.width !== react.width || html.height !== react.height) {
    findings.push(
      `${where}: HTML renders ${html.width}x${html.height} and TSX renders ` +
        `${react.width}x${react.height}. A size difference is a layout difference, and no diff ` +
        'image is written because there is nothing to lay one over.',
    )
    continue
  }

  const diff = new PNG({ height: html.height, width: html.width })
  const moved = pixelmatch(html.data, react.data, diff.data, html.width, html.height, {
    threshold: 0.1,
  })

  /* **A listed example is still rendered and still compared; only the verdict is
     inverted.** An exception nobody re-measures is an exception that outlives its
     reason, which is the drift this repository writes down about itself more than
     once. Skipping them would save two page loads and cost the only signal that
     one has been fixed. */
  const excused = UNCOMPARED.get(where)
  if (excused !== undefined) {
    /* **Confirmed before it is called spent, the same way a difference is
       confirmed before it is called real.** Two of these three are on the list
       for being unstable, so one matching run is as likely to be luck as a fix:
       `video/native` matched once and differed on the next run, which had this
       reporting the entry as stale every other time. A second pass costs one
       reload on three examples and turns a coin flip into a reading. */
    if (moved === 0) {
      const again = await picture(
        `${origin}/html/${entry.tier.name}/${entry.family}/${entry.slug}/`,
      )
      const twin = await picture(
        `${origin}/react/${entry.tier.name}/${entry.family}/${entry.slug}/`,
      )
      if (again.shot.equals(twin.shot)) {
        stale.push(
          `${where}: matched twice, so the entry is spent. It was listed for "${excused}". ` +
            'Take it out of UNCOMPARED.',
        )
      }
    }
    continue
  }

  if (moved > 0) {
    const file = join(entry.dir, `${entry.slug}.parity.png`)
    writeFileSync(file, PNG.sync.write(diff))
    findings.push(
      `${where}: ${moved} pixels differ between the two syntaxes. The marked difference is at ` +
        `${relative(root, file)}, and the side to distrust is usually the TSX: the HTML one is ` +
        'what `check:visual` already holds to a reviewed baseline.',
    )
  }
}

await browser.close()
server.close()

if (stale.length > 0) {
  console.error(
    `parity: ${stale.length} recorded exception(s) no longer differ.\n\n  ` +
      `${stale.join('\n  ')}\n\n` +
      '  This is the good failure: something was fixed. Delete the entry and the check goes green.\n',
  )
  process.exit(1)
}

if (findings.length > 0) {
  console.error(
    `parity: ${findings.length} of ${compared} examples render differently.\n\n  ` +
      `${findings.join('\n  ')}\n\n` +
      '  Both syntaxes are authored, so a difference is a real edit to one and not the other.\n',
  )
  process.exit(1)
}

console.log(
  `parity: ${compared} examples render identically from their HTML and their TSX` +
    /* Named every run, because an exception nobody is reminded of is an
       exception that becomes permanent. */
    (UNCOMPARED.size > 0
      ? `, and ${UNCOMPARED.size} are not compared: ${[...UNCOMPARED.keys()].join(', ')}`
      : ''),
)

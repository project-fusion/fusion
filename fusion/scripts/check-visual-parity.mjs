#!/usr/bin/env bun
/**
 * Renders every example twice, from its HTML and from its TSX, and compares.
 *
 * **This is the assertion that makes two authored files safe.** Both syntaxes
 * are written by hand, neither derived from the other, which costs exactly one
 * thing: nothing stops them drifting. `helix component`'s `examples-paired` holds the
 * two files to each other. This holds the two pictures to each other, which is
 * the only comparison that can see a React example rendering something else.
 *
 * **The fault class it exists for**: a data table given `rows={rows}` draws a
 * correctly labeled, permanently empty grid. React skips object props while
 * hydrating, both halves of it agree to drop them, and nothing warns. Every
 * other check in this repository reads source or asserts a fact somebody thought
 * to assert. Two pictures of the same example assert the part nobody thinks to.
 *
 * **No baseline, and that is the interesting difference from `check:spec:visual`.**
 * That check compares today's render to a committed PNG, so it is Linux-only:
 * text rasterization differs by platform and a cross-platform comparison would
 * differ on nearly every glyph. This compares two renders taken seconds apart
 * on one machine in one browser, so the platform cancels out and it runs
 * anywhere. Nothing is committed, so nothing can be committed wrong.
 *
 * **What a difference means is usually the React side.** The HTML example is
 * the one the sandbox has always run and the one `check:spec:visual` already guards
 * against a reviewed baseline, so when these two disagree the picture to
 * distrust is the new one. The diff is written beside the example as
 * `<slug>.parity.png` and left there to be looked at.
 *
 * Families are compared side by side on the workers `@fusion.dev/scripts/pool`
 * decides, and `--workers 1` takes them one at a time.
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
import { join, relative } from 'node:path'
import { costOf } from '@fusion.dev/scripts/cost'
import { offline, pool } from '@fusion.dev/scripts/pool'
import { OWN, scopeFor } from '@fusion.dev/scripts/scope'
import { awaitStill, awaitUpgrades } from '@fusion.dev/scripts/settle'
import { owner, shard, which } from '@fusion.dev/scripts/shard'
import { root, SOURCE } from '@fusion.dev/scripts/workspace'
import pixelmatch from 'pixelmatch'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

/* The same two tiers `check:spec:visual` pictures, read the same way and for the
   same reason: a headless example is deliberately token-free and wants only its
   own `preview.css`, and a styled example is nothing but tokens and wants
   `frame.css`. */
const TIERS = [
  { name: 'headless', sheet: false, source: join(root, SOURCE.headless) },
  { name: 'styled', sheet: true, source: join(root, SOURCE.styled) },
]

const FRAME = join(root, 'fusion/site/public/sandbox/frame.js')
const SHEET = join(root, 'fusion/site/public/sandbox/frame.css')
const FONTS = join(root, 'fusion/site/public/fonts')
const BUILT = join(root, '.local/parity')

/* One width, not the two `check:spec:visual` takes. That check is asking whether the
   library still looks like itself, which is a question about layout and wants
   a narrow picture; this one is asking whether two spellings of one example
   agree, and a disagreement large enough to matter is visible at any width. The
   corpus here is fourteen times larger, so the second width would buy a
   repetition rather than a finding. */
const WIDTH = 640

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const changedAt = args.indexOf('--changed')
const changedFrom = changedAt === -1 ? undefined : args[changedAt + 1]
/* **The value of `--changed` is not a family name, and the positional search
   will take it for one.** Unexcluded, `--changed HEAD~1` reads `HEAD~1` as the
   family to filter to, matches nothing, and reports a clean scoped run over an
   empty corpus. Excluding the slot after the flag is what keeps the positional
   argument positional. Nor is a number a family: it is the value of `--workers`,
   and no family's name is one. */
const only = args.find(
  (one, at) =>
    !one.startsWith('--') && !/^\d+$/.test(one) && !(changedAt !== -1 && at === changedAt + 1),
)

/* Gated on the same reasoning as the staleness check below: a dry run answers
   which families would be compared, which is a question about git and the source
   tree, and neither half of the bundle is consulted to answer it. In a shared
   checkout the bundle is also the thing most likely to be missing, because
   somebody else is part way through rebuilding it. */
const absent = dryRun ? [] : [FRAME, SHEET].filter((one) => !existsSync(one))
if (absent.length > 0) {
  console.error(
    `parity: missing ${absent.map((one) => relative(root, one)).join(', ')}. Run ` +
      '`turbo run frame` first: the bundle is what defines the tags on both sides.',
  )
  process.exit(1)
}

/**
 * The bundle has to be newer than the components, or a fix looks like a failure.
 *
 * **Measured against what a person edits, not against what a build writes.**
 * An mtime answers "was this written later", and a cache hit writes a file whose
 * content did not change, so anything generated has to stay out of the walk or
 * the question is asked of the wrong clock.
 *
 * **Both sides render from `frame.js`**, so a change to a component reaches
 * neither of them until `turbo run frame` has rebuilt it. That is not a stale
 * picture, it is a stale *library*, and it reads as the fix not having worked:
 * a repaired example re-run against an older bundle still reports its full pixel
 * count. Checked rather than remembered.
 */
const authored = (name) => {
  if (name.includes('.spec.')) {
    return false
  }
  /* **Authored files only, and `.css.ts` is not one.** Those are the `styles`
     task's outputs, which a turbo cache hit restores with today's mtime after
     the bundle was written: 151 of them, every time, on any branch. The bundle
     was then correct and looked stale, and the message sent a reader looking
     for a change that was not there. The `.css` each is generated from is an
     input rather than an output, so it is never restored and a hand edit to it
     still moves this. */
  if (name.endsWith('.css.ts')) {
    return false
  }
  return name.endsWith('.ts') || name.endsWith('.css')
}

const newest = (dir) => {
  let latest = 0
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !authored(entry.name)) {
      continue
    }
    latest = Math.max(latest, statSync(join(entry.parentPath ?? entry.path, entry.name)).mtimeMs)
  }
  return latest
}

/* Not asked of a dry run, which renders nothing: the bundle's age cannot make
   the answer to "which families would be compared" wrong, and requiring a fresh
   one would make the cheap question unanswerable in exactly the tree where it is
   most worth asking, which is one with uncommitted component edits in it. */
const bundled = dryRun ? 0 : statSync(FRAME).mtimeMs
const sources = dryRun ? 0 : Math.max(...TIERS.map((tier) => newest(tier.source)))
if (sources > bundled) {
  console.error(
    'parity: `frame.js` is older than the components it bundles, so both sides would render the\n' +
      '  library as it was before your change. Run `turbo run frame` and try again.',
  )
  process.exit(1)
}

/**
 * What is not compared, each with what was measured rather than a name.
 *
 * **An exception here is a recorded fact, not a silenced failure**, which is why
 * each carries its numbers: a reader can re-run the measurement and take the
 * entry out.
 *
 * **Two kinds, because they age differently.** A `differs` entry is a real
 * difference between the two idioms; the day it matches twice, it is spent and
 * this reports it. An `unstable` entry is a surface the harness cannot hold
 * still, so it can match or differ from run to run and neither reading means
 * anything: the video controls matched twice on ubuntu-latest on 14 Sep 2026,
 * were taken out as spent, and differed by 188 pixels on the next run. Such an
 * entry is skipped rather than judged, and carries the numbers that put it here.
 */
const UNCOMPARED = new Map([
  [
    'styled/video/native',
    {
      /* The native control strip is the user agent's own shadow DOM, and nothing
         here reaches it: `animations: 'disabled'` covers author animations, the
         settle loop covers author layout, and `reducedMotion` covers a canvas that
         offers a still frame. This offers none: it differs every time by a
         different amount and survives the retry, measured at 22, 34 and 122
         pixels, then matched twice, then 188, all of it inside the controls. */
      unstable: true,
      why: "the user agent's own video controls, which no wait or retry here can settle",
    },
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
    { why: 'the markup twin binds too late to hear the opening announcement; React does not' },
  ],
])

/* `null` means everything, which is what a run with no `--changed` asks for. */
const scope =
  changedFrom === undefined
    ? null
    : scopeFor(changedFrom, {
        label: 'parity',
        own: OWN.parity,
        root,
        tiers: TIERS,
      })

/** Every example that is authored in both syntaxes, which is what can be paired. */
const reached = []
const skipped = new Set()
for (const tier of TIERS) {
  for (const entry of readdirSync(tier.source, { withFileTypes: true })) {
    const dir = join(tier.source, entry.name, '.examples')
    if (!entry.isDirectory() || !existsSync(dir)) {
      continue
    }
    if (only !== undefined && entry.name !== only) {
      continue
    }
    if (scope !== null && !scope.has(entry.name)) {
      skipped.add(entry.name)
      continue
    }
    for (const file of readdirSync(dir)
      .filter((one) => one.endsWith('.html'))
      .sort()) {
      const slug = file.replace(/\.html$/, '')
      if (!existsSync(join(dir, `${slug}.tsx`))) {
        continue
      }
      reached.push({ dir, family: entry.name, slug, tier })
    }
  }
}

/* **This run's families, when CI splits the check**, weighed by what each was
   measured to cost rather than by how many examples it brings:
   `@fusion.dev/scripts/cost` argues that and `@fusion.dev/scripts/shard` the
   split. After the scope rather than before, so the shards divide what the
   change reaches and not the whole corpus. */
const asked = shard()
const ours = owner(
  reached.map((one) => one.family),
  costOf('parity', (family) => reached.filter((one) => one.family === family).length),
  asked,
)
const corpus = reached.filter((one) => ours(one.family))

/* **What the scope came to, without paying for the pictures.** A run that
   compares a subset should be able to say which subset before it spends twelve
   minutes proving it, both for a contributor checking the flag does what they
   meant and for CI, where this line is the record of what a green tick actually
   covered. */
if (dryRun) {
  const families = [...new Set(corpus.map((one) => one.family))].sort()
  console.log(
    `parity: would compare ${corpus.length} examples across ${families.length} ` +
      `${families.length === 1 ? 'family' : 'families'}` +
      (asked === undefined ? '' : ` in ${which(asked)}`) +
      (skipped.size > 0 ? `, skipping ${skipped.size}` : '') +
      (families.length > 0 ? `: ${families.join(', ')}` : ''),
  )
  process.exit(0)
}

/* **A scoped run that reaches nothing is a pass, and every other empty run is
   not.** `--changed` against a commit that touched only the site or the docs
   legitimately has no example to compare, and failing there would make the
   check impossible to keep green. An unscoped run finding no corpus means the
   corpus is missing, which is a real fault. */
if (reached.length === 0 && scope !== null) {
  console.log(
    `parity: nothing changed that any example renders, ${skipped.size} families not compared.`,
  )
  process.exit(0)
}

/* **A shard holding none of what is in scope passes, and says whose it is.**
   A scope of three families split four ways leaves one shard empty, and that is
   the split working rather than the corpus missing: the families are compared,
   by the other shards. It says so in words, with no count of nothing in it. */
if (corpus.length === 0 && asked !== undefined && reached.length > 0) {
  const families = new Set(reached.map((one) => one.family)).size
  console.log(
    `parity: ${which(asked)} holds none of the ${families} ` +
      `${families === 1 ? 'family' : 'families'} in scope, which the other shards compare.`,
  )
  process.exit(0)
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
  /* **Off, because a scoped run builds a different set and splits it
     differently.** With splitting on, the CJS interop helper lands in a shared
     chunk that the page never fetches, so React renders nothing and the report
     is `TypeError: __commonJS is not a function` against an example that is
     fine. Which examples fail is a function of what was built: CI scoped to one
     commit reported `pin-input` and `file-input`, the same scope run here
     reported `donut-chart`, and the unscoped run of all 610 reports none, which
     is why this survived until `--changed` had a wide diff to work on.
     Self-contained bundles cost bytes this check never ships. */
  splitting: false,
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
   `turbo run frame` empties the directory and rewrites the bundle, so a rebuild
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
/* **`reducedMotion` because a canvas is not an animation Playwright can pause.**
   `animations: 'disabled'` at capture time cancels CSS animations and
   fast-forwards transitions, and reaches nothing driven by
   `requestAnimationFrame`: `aura` paints a shader on every frame, so the two
   sides were photographed at whatever moment each reached, and the comparison
   was of two instants rather than of two examples. It failed on roughly two runs
   in three, twelve of its examples at a time, and passed on the third, which is
   the worst shape a check can have, because it teaches people to re-run it.
   Retrying is what the corpus did about it before, and a retry is a coin flipped
   twice.

   **The component already has a still state and this is how to ask for it.**
   `aura` honors `prefers-reduced-motion: reduce` by painting one frame rather
   than an empty box, which is a decision it made for readers and which happens
   to be exactly what a comparison needs. Both sides render under the same
   setting, so what is being compared is unchanged: this asks the same question
   of a page that has stopped moving.

   What it gives up is comparing a moving state, which was never being compared,
   only sampled.

   Given to every worker's context, so each worker's page starts with the
   settings the one shared page had. */
const CONTEXT = { reducedMotion: 'reduce', viewport: { height: 800, width: WIDTH } }

/* Nothing leaves this machine, which `offline` carries the argument for: three
   examples name assets on other people's servers, and a comparison that let
   them through would record whatever those hosts returned each time. Blocked,
   both sides render the same missing-media state, which is deterministic and
   still the thing under test. */
const closed = offline(origin)

/* **Nothing is normalized, and normalizing the whitespace is the wrong fix.**
   JSX drops whitespace touching a line break where HTML keeps it, which invites
   adjusting the HTML side to match. The premise is wrong: this compares what the
   two examples *ship as*, and the HTML one ships with those spaces. Rewriting it
   to render like the TSX asks the comparison whether the two say the same thing,
   which is a question `helix component`'s `examples-paired` already covers and not the
   one worth a browser.

   So the difference is real and it belongs to the TSX. Prose wrapping an inline
   element needs an explicit `{' '}` in JSX, the way `quote/preview` does:
   without it React renders "Lorem ipsumdolor sit amet" and the HTML renders
   "Lorem ipsum dolor sit amet". That is a fact about writing React, it is what a
   consumer copying the example would hit, and hiding it behind a normalization
   is the harness lying to make itself green. */

/* **What the page said, kept so a blank render can explain itself.** The guard
   below can tell that `#root` is empty and nothing else; the reason is always in
   the console, and a harness that makes somebody re-run it by hand to read the
   reason is a harness that gets guessed at instead. Attached once to each page
   the pool opens, and cleared per navigation. */
const watch = (tab) => {
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
    const undefinedTags = await awaitUpgrades(tab)
    await awaitStill(tab)
    return { shot: await tab.screenshot({ animations: 'disabled', fullPage: true }), undefinedTags }
  }
  return { picture, said, tab }
}

/**
 * One example's verdict: whether it was compared, and the finding or the spent
 * exception it produced, if either.
 */
const judge = async ({ picture, said, tab }, entry) => {
  const where = `${entry.tier.name}/${entry.family}/${entry.slug}`
  const verdict = { compared: false, findings: [], stale: [] }
  /**
   * Taken twice when they disagree, and reported only if they disagree again.
   *
   * **A real difference reproduces and a flake does not**, which is what makes
   * this honest rather than a way of going green. `chat/command-palette` reported 2,566
   * pixels on three consecutive runs before it was fixed.
   *
   * **The case this was written for is gone, and the retry is worth keeping
   * anyway.** `aura` painted to a canvas and reported a difference on one run in
   * three, then on two in three, twelve examples at a time; the retry was what
   * stood between that and a red build, and a coin flipped twice is a poor
   * guard. It is held still at the source now, by `reducedMotion` on the page.
   * What remains here is a second reading for whatever is next: the retry costs
   * a pass only on the examples that differ, and a difference that survives it
   * is a difference.
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
    verdict.findings.push(
      `${where}: ${missing.map((tag) => `\`<${tag}>\``).join(', ')} never upgraded, so nothing ` +
        'registers them. The example names an element the bundle does not define: check the tag ' +
        'against the component, and that `turbo run frame` has run since it was renamed.',
    )
    return verdict
  }

  /* **Asserted rather than assumed, because a blank page is a picture too.**
     Everything that can go wrong on the React side (a module that would not
     load, an export named something else, a mount that threw) produces an empty
     `#root`, and an empty root diffed against a real render is a pixel count
     rather than an error. The count is small and plausible on a small example,
     which is exactly how it would be believed. */
  const mounted = await tab.evaluate(() => document.getElementById('root')?.childElementCount ?? 0)
  if (mounted === 0) {
    verdict.findings.push(
      `${where}: the TSX rendered nothing, \`#root\` is empty. ` +
        (said.length > 0
          ? `The page said: ${said.slice(0, 2).join(' | ')}`
          : 'The page said nothing, so the module loaded and the component returned no elements.'),
    )
    return verdict
  }

  const html = PNG.sync.read(from)
  const react = PNG.sync.read(to)
  verdict.compared = true

  if (html.width !== react.width || html.height !== react.height) {
    verdict.findings.push(
      `${where}: HTML renders ${html.width}x${html.height} and TSX renders ` +
        `${react.width}x${react.height}. A size difference is a layout difference, and no diff ` +
        'image is written because there is nothing to lay one over.',
    )
    return verdict
  }

  const diff = new PNG({ height: html.height, width: html.width })
  const moved = pixelmatch(html.data, react.data, diff.data, html.width, html.height, {
    threshold: 0.1,
  })

  /* **A listed example is still rendered and still compared; only the verdict is
     inverted.** An exception nobody re-measures is an exception that outlives
     its reason. Skipping them would save two page loads and cost the only signal
     that one has been fixed. */
  const excused = UNCOMPARED.get(where)
  if (excused?.unstable) {
    return verdict
  }
  if (excused !== undefined) {
    /* **Confirmed before it is called spent, the same way a difference is
       confirmed before it is called real.** One matching run can be luck, so a
       second pass costs one reload and turns a coin flip into a reading. What
       two matches cannot settle is an unstable surface, which is why those are
       skipped above rather than read here: `video/native` matched twice and
       then differed by 188 pixels the next run. */
    if (moved === 0) {
      const again = await picture(
        `${origin}/html/${entry.tier.name}/${entry.family}/${entry.slug}/`,
      )
      const twin = await picture(
        `${origin}/react/${entry.tier.name}/${entry.family}/${entry.slug}/`,
      )
      if (again.shot.equals(twin.shot)) {
        verdict.stale.push(
          `${where}: matched twice, so the entry is spent. It was listed for "${excused.why}". ` +
            'Take it out of UNCOMPARED.',
        )
      }
    }
    return verdict
  }

  if (moved > 0) {
    const file = join(entry.dir, `${entry.slug}.parity.png`)
    writeFileSync(file, PNG.sync.write(diff))
    verdict.findings.push(
      `${where}: ${moved} pixels differ between the two syntaxes. The marked difference is at ` +
        `${relative(root, file)}, and the side to distrust is usually the TSX: the HTML one is ` +
        'what `check:spec:visual` already holds to a reviewed baseline.',
    )
  }
  return verdict
}

/* **One page per worker, on the workers `pool` decides, taking every family that
   worker is given.** Each side is a navigation, so the registry is empty for
   every picture either way, and what a page heard, the errors a blank render
   explains itself with, is cleared before each one; a page per family kept
   nothing apart that this does not, and cost a runner a page load per family
   (see `pool`). The verdicts are read back in the order the examples were listed,
   whichever worker took them, so the findings print as they always did.
   Measured 15 Sep 2026 on twelve cores, 663 examples matching every time and
   the output the same to the byte as on a page per family: 259 and 261 seconds
   on four workers and 602 on one, against 262, 263 and 614. */
const families = [...Map.groupBy(entries, (one) => `${one.tier.name}/${one.family}`).values()]
const verdicts = (
  await pool(families, {
    browser,
    context: CONTEXT,
    family: (group) => group[0].family,
    open: watch,
    page: 'worker',
    prepare: closed,
    run: async (watched, family) => {
      const judged = []
      for (const entry of family) {
        judged.push(await judge(watched, entry))
      }
      return judged
    },
  })
).flat()

const findings = verdicts.flatMap((verdict) => verdict.findings)
/** Listed exceptions that have started matching, which is a fact worth failing on. */
const stale = verdicts.flatMap((verdict) => verdict.stale)
const compared = verdicts.filter((verdict) => verdict.compared).length

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
    /* A shard says which, for the reason a scoped run does below. */
    (asked === undefined ? '' : `, in ${which(asked)}`) +
    /* **A scoped run says so in the same line as its verdict.** A number on its
       own reads as the whole corpus, which is how a check that stopped covering
       things goes on looking like one that passes. See `check:spec:floors`. */
    (skipped.size > 0 ? `, with ${skipped.size} families not compared this run` : '') +
    /* Named every run, because an exception nobody is reminded of is an
       exception that becomes permanent. */
    (UNCOMPARED.size > 0
      ? `, and ${UNCOMPARED.size} are not compared: ${[...UNCOMPARED.keys()].join(', ')}`
      : ''),
)

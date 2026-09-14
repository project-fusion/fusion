#!/usr/bin/env bun
/**
 * Measures what Helix costs a page, and writes
 * `helix/docs/content/metrics.mdx` from the measurement.
 *
 * **Generated, the way the component reference and the token reference are.**
 * The prose lives in this file rather than in the MDX for the same reason the
 * token reference's prose does: a page half generated and half authored has two
 * owners and no way to tell which half is behind.
 *
 * **Two columns per component, or the table is arguing rather than
 * reporting.** A component in a shadow-DOM library has no single honest number.
 * Alone flatters the second component, because the runtime it shares is counted
 * again; added flatters the first, because the runtime it needs is counted
 * nowhere. Both are here and both are defined on the page.
 *
 * **What is measured is `dist`, which is what npm ships.** Not `src`: the
 * published artifact is `tsc` output, and bundling the TypeScript instead would
 * measure a decorator lowering no consumer receives. So this runs after a build
 * and says so when the build has not happened.
 *
 * **The bundler is part of the number and is named in the output.** Bun's
 * bundler is pinned at 1.1.43 by `packageManager` and by
 * `.github/workflows/verify.yml`, so the same source measures the same on a
 * contributor's machine and in CI. A different Bun produces different bytes,
 * which `--check` reports as a version difference rather than as a stale file,
 * because the two failures have different fixes.
 *
 * Run `bun run gen:metrics` to write it, `bun run check:gen:metrics` to fail when it is
 * behind. `verify` runs the check, for the reason `verify` never writes.
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

import { join } from 'node:path'
import { promisify } from 'node:util'
import { brotliCompress, constants, gzip } from 'node:zlib'
import { ARTIFACT, root } from '@fusion.dev/scripts/workspace'

const OUTPUT = 'helix/docs/content/metrics.mdx'

/**
 * What the other systems measured, from `turbo run peers`.
 *
 * Committed, because measuring them needs a registry and `check:gen:metrics` runs
 * in CI. Our own side of that comparison is not in the file: it is measured
 * here on every run, so the column that can go stale against this repository
 * is the one that cannot.
 */
const PEERS = 'helix/docs/peers.json'

/** What a component costs in time, from `turbo run timings`. */
const TIMINGS = 'helix/docs/timings.json'

/**
 * Where the entry modules go while they are being measured.
 *
 * Inside the repository rather than in the system temp directory, because an
 * entry says `import '@fusion.dev/helix/button'` and package resolution walks up
 * from the file: a module outside the workspace resolves nothing. `.local/` is
 * the declared per-machine scratch and is gitignored.
 *
 * **One directory per process, because a run empties its directory before and
 * after measuring.** A shared one lets a second run in the same checkout, a
 * hook's or another session's, delete entries this one is still bundling, and
 * `Bun.build` fails on `File not found`.
 */
const SCRATCH = join(root, '.local/metrics', String(process.pid))

const check = process.argv.includes('--check')

/**
 * Where this page sits in Getting started, which is a path and therefore
 * ordered.
 *
 * **Computed as last rather than written down.** Metrics belongs at the end of
 * that section, and the end is a position rather than a number: a hardcoded
 * order collides with the next page inserted into the path, which `bun run
 * gen:docs` refuses. Reading the other pages' frontmatter makes the intent
 * survive that insertion.
 */
const lastInSection = () => {
  const dir = join(root, 'helix/docs/content')
  let highest = 0
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.mdx') || file === 'metrics.mdx') {
      continue
    }
    const source = readFileSync(join(dir, file), 'utf8')
    if (!/^section: Getting started$/m.test(source)) {
      continue
    }
    const order = /^order: (\d+)$/m.exec(source)
    if (order) {
      highest = Math.max(highest, Number(order[1]))
    }
  }
  return highest + 1
}

/**
 * The runtime floor, and the definition of the second column.
 *
 * Lit and `@fusion.dev/helix-core`: the two things every Helix element needs and
 * neither of which belongs to any one of them. A page that has one component
 * has already paid this, so what a second component adds is measured against
 * it.
 *
 * `@fusion.dev/helix-headless` is deliberately not in here. It is a tier rather than a
 * runtime: a page with one styled component has some of it and never all of
 * it, so a floor containing it would credit every family with code no page
 * loads. the `barrels` rule in `fusion workspace` is what keeps that true.
 *
 * **`export *`, not a bare import, and the difference is the whole floor.**
 * `@fusion.dev/helix-core` is `sideEffects: false`, so `import '@fusion.dev/helix-core'` for
 * effect compiles to nothing and measures 0 raw bytes. Re-exporting pins the
 * complete public API in place, which is what a floor has to be for the second
 * column to mean the same thing for every family: a tree-shaken floor would be
 * a different size under each one.
 */
const RUNTIME = ["export * from 'lit'", "export * from '@fusion.dev/helix-core'", ''].join('\n')

/** The two tiers with per-family entry points, in dependency order. */
const TIERS = [
  {
    dir: 'helix/headless',
    heading: 'Headless tier',
    name: '@fusion.dev/helix-headless',
    note: 'Structure, accessibility, state and form participation. No presentation, and no stylesheet to load beside it.',
  },
  {
    dir: 'helix/styled',
    heading: 'Styled tier',
    name: '@fusion.dev/helix',
    note: 'The headless tier plus presentation. This is what `bun add @fusion.dev/helix` gives you.',
  },
]

/** Every package with a JavaScript entry a page can import, and what it is for. */
const PACKAGES = [
  {
    entry: '@fusion.dev/helix-core',
    note: 'Element base class, mixins, decorators, floating positioning.',
  },
  {
    entry: '@fusion.dev/helix-headless',
    note: 'Every headless family, which is what the barrel means.',
  },
  { entry: '@fusion.dev/helix-icons', note: 'The whole glyph set.' },
  {
    entry: '@fusion.dev/helix-theme',
    note: 'The derivation engine. Build time for most consumers, runtime for a theme switcher.',
  },
  { entry: '@fusion.dev/helix', note: 'Every styled family.' },
  { entry: 'lit', note: 'Not ours. Here so it can be subtracted from every row above it.' },
]

/**
 * How many semantic tokens there are, read rather than written.
 *
 * Every other number on this page is measured, and a typed one is the one that
 * goes stale.
 */
const TOKEN_COUNT = JSON.parse(readFileSync(join(root, ARTIFACT.tokens), 'utf8')).tokens.length

/**
 * The stylesheets a consumer links, which no bundler is involved in.
 *
 * **`dist` rather than `src`, for the reason this whole page gives about
 * JavaScript: what is measured is what npm ships.** The authoring copies are
 * most comment by weight, so pointing these rows at `src` would count the
 * reasoning as payload.
 */
const STYLESHEETS = [
  {
    note: 'The base layer. Recipes for markup Helix does not render, usable with no JavaScript at all.',
    path: 'helix/styles/dist/base.css',
  },
  {
    note: 'Hides each element until its definition loads, generated from the tags in `@fusion.dev/helix`.',
    path: 'helix/styles/dist/elements.css',
  },
  {
    note: 'The four above in one import, in the order they have to be in.',
    path: 'helix/styles/dist/helix.css',
  },
  {
    note: 'The primitive layer. Private, shipped because `tokens.css` resolves into it.',
    path: 'helix/styles/dist/primitives.css',
  },
  {
    note: `The ${TOKEN_COUNT} semantic tokens. Nothing paints without this.`,
    path: 'helix/styles/dist/tokens.css',
  },
]

/**
 * How many measurements run at once.
 *
 * **Brotli at quality 11 is the whole runtime of this script**, not the
 * bundler: measured on one styled family, 23ms to bundle and 481ms to
 * compress. `node:zlib`'s callback form runs on libuv's pool rather than on the
 * JavaScript thread, so eight at once cost 786ms against 530ms for one, and the
 * pool is sized to match. Sync compression would leave every core but one
 * idle for the entire run.
 */
const CONCURRENCY = 8

/** Comma groups, written out rather than taken from `toLocaleString`, which is machine-dependent. */
const grouped = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const compressed = { brotli: promisify(brotliCompress), gzip: promisify(gzip) }

/**
 * The three sizes of one buffer.
 *
 * Gzip at 9 and brotli at 11, which is what a CDN serving static assets uses,
 * with the size hint brotli wants so its window is not guessed.
 */
const sizes = async (buffer) => {
  const [brotli, gzipped] = await Promise.all([
    compressed.brotli(buffer, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
        [constants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
      },
    }),
    compressed.gzip(buffer, { level: 9 }),
  ])
  return { brotli: brotli.length, gzip: gzipped.length, raw: buffer.length }
}

/**
 * Run tasks `CONCURRENCY` at a time, in order.
 *
 * Ordered because the output is compared byte for byte by `--check`, and a
 * table whose rows arrived in completion order would fail against itself.
 */
const pooled = async (items, run) => {
  const results = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await run(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker))
  return results
}

/**
 * Bundle one entry module and measure what comes out.
 *
 * Minified, because a consumer minifies, and unminified bytes would be a
 * measurement of our own formatting. Everything is bundled in, Lit included: a
 * page with no other Lit library pays for it, and the row that lets a reader
 * subtract it is in the package table.
 */
const measure = async (name, source) => {
  const entry = join(SCRATCH, `${name}.js`)
  writeFileSync(entry, source)
  const built = await Bun.build({
    entrypoints: [entry],
    format: 'esm',
    minify: true,
    sourcemap: 'none',
    target: 'browser',
  })
  if (!built.success) {
    console.error(built.logs.join('\n'))
    throw new Error(`Could not bundle:\n${source}`)
  }
  let buffer = Buffer.alloc(0)
  for (const artifact of built.outputs) {
    buffer = Buffer.concat([buffer, Buffer.from(await artifact.arrayBuffer())])
  }
  return await sizes(buffer)
}

/** Every family in a tier, from the manifest, which is the same list the docs use. */
const families = (dir) => {
  const manifest = JSON.parse(readFileSync(join(root, dir, 'custom-elements.json'), 'utf8'))
  const found = new Set()
  for (const module of manifest.modules) {
    for (const declaration of module.declarations ?? []) {
      if (declaration.customElement) {
        found.add(module.path.split('/')[1])
      }
    }
  }
  return [...found].sort()
}

/** Every file under a path, for the unpacked size of what `files` publishes. */
const walk = (path, found = []) => {
  if (statSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) {
      walk(join(path, entry), found)
    }
  } else {
    found.push(path)
  }
  return found
}

/** What one published package puts in `node_modules`, unpacked. */
const footprint = (dir) => {
  const manifest = JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'))
  let bytes = 0
  let count = 0
  let maps = 0
  for (const entry of manifest.files ?? []) {
    const path = join(root, dir, entry)
    if (!existsSync(path)) {
      continue
    }
    for (const file of walk(path)) {
      /* **Maps are counted and then taken off, because they no longer ship.**
         `publish.mjs` opens the packed tarball and removes every `.map` and the
         trailing `sourceMappingURL` comment with it, so `dist` on disk is not
         what lands in a consumer's `node_modules`. Reporting the directory total
         overstates every row by its own map column, 272,406 bytes on
         `@fusion.dev/helix` alone. Counted rather than skipped so the row can say
         how much was removed. */
      if (file.endsWith('.map')) {
        maps += statSync(file).size
        continue
      }
      bytes += statSync(file).size
      count += 1
    }
  }
  return {
    bytes,
    count,
    dependencies: Object.keys(manifest.dependencies ?? {}),
    maps,
    name: manifest.name,
  }
}

/* Nothing here can be measured before a build, and the failure without this
   guard is a resolution error naming one file, which reads as a broken script
   rather than as a missing step. */
for (const tier of TIERS) {
  if (!existsSync(join(root, tier.dir, 'dist/index.js'))) {
    console.error(
      `${tier.dir}/dist is missing. Metrics measure the published artifact, so run \`bun run build\` first.`,
    )
    process.exit(1)
  }
}

rmSync(SCRATCH, { force: true, recursive: true })
mkdirSync(SCRATCH, { recursive: true })
process.on('exit', () => rmSync(SCRATCH, { force: true, recursive: true }))

const floor = await measure('floor', RUNTIME)

const packages = await pooled(PACKAGES, async (entry, index) => ({
  ...entry,
  ...(await measure(`package-${index}`, `export * from '${entry.entry}'\n`)),
}))

const stylesheets = await pooled(STYLESHEETS, async (sheet) => ({
  ...sheet,
  ...(await sizes(readFileSync(join(root, sheet.path)))),
}))

/* Which styled families reach for the headless barrel rather than the family
   they extend. Counted rather than claimed, because the paragraph that reads
   these numbers is the load-bearing one on the page. */
const sources = (dir, found = []) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      sources(path, found)
    } else if (path.endsWith('.ts') && !path.endsWith('.spec.ts')) {
      found.push(path)
    }
  }
  return found
}

const barrelled = new Set()
for (const path of sources(join(root, 'helix/styled/src'))) {
  if (readFileSync(path, 'utf8').includes("from '@fusion.dev/helix-headless'")) {
    barrelled.add(path.slice(join(root, 'helix/styled/src').length + 1).split('/')[0])
  }
}

const measured = []
for (const tier of TIERS) {
  const slug = tier.dir.split('/').at(-1)
  const rows = await pooled(families(tier.dir), async (family) => {
    const [alone, withFloor] = await Promise.all([
      measure(`${slug}-${family}-alone`, `import '${tier.name}/${family}'\n`),
      measure(`${slug}-${family}-added`, `${RUNTIME}import '${tier.name}/${family}'\n`),
    ])
    return {
      added: {
        brotli: withFloor.brotli - floor.brotli,
        gzip: withFloor.gzip - floor.gzip,
        raw: withFloor.raw - floor.raw,
      },
      alone,
      family,
    }
  })
  measured.push({ ...tier, rows })
}

const timings = existsSync(join(root, TIMINGS))
  ? JSON.parse(readFileSync(join(root, TIMINGS), 'utf8'))
  : undefined

const peers = existsSync(join(root, PEERS))
  ? JSON.parse(readFileSync(join(root, PEERS), 'utf8'))
  : undefined

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle]
}

const styled = measured.find((tier) => tier.name === '@fusion.dev/helix')
const headless = measured.find((tier) => tier.name === '@fusion.dev/helix-headless')
const styledGzip = styled.rows.map((row) => row.alone.gzip)
const styledAdded = styled.rows.map((row) => row.added.gzip)
const headlessGzip = headless.rows.map((row) => row.alone.gzip)
const cheapest = styled.rows.reduce((low, row) => (row.alone.gzip < low.alone.gzip ? row : low))
const dearest = styled.rows.reduce((high, row) => (row.alone.gzip > high.alone.gzip ? row : high))
const wholeStyled = packages.find((one) => one.entry === '@fusion.dev/helix')
const wholeHeadless = packages.find((one) => one.entry === '@fusion.dev/helix-headless')

const kb = (bytes) => `${(bytes / 1000).toFixed(1)} kB`

const percent = (part, whole) => Math.round((part / whole) * 100)
const sharedShare = percent(median(styledGzip) - median(styledAdded), median(styledGzip))
const addedShare = percent(median(styledAdded), median(styledGzip))
const barrelMultiple = Math.round(wholeHeadless.gzip / median(styledGzip))

const footprints = [
  'helix/core',
  'helix/headless',
  'helix/icons',
  'helix/styles',
  'helix/theme',
  'helix/styled',
].map(footprint)

/**
 * The comparison, or an honest absence of one.
 *
 * **Helix's rows are the same `alone` numbers as the table below**, not a
 * second measurement of the same thing: `alone` is `import '@fusion.dev/helix/x'`,
 * and every peer row is `import` of that system's own subpath for the same
 * component. One convention, or the table would compare conventions.
 *
 * Helix sorts first within each component because it is the subject of the
 * page, which is worth saying out loud since first place in a size table
 * usually means something else. The rest are alphabetical and the winner is
 * whichever number is smallest.
 */
const comparison = () => {
  if (!peers) {
    return [
      '## Against other systems',
      '',
      'Not measured. `turbo run peers` installs the systems and writes',
      '`helix/docs/peers.json`, and this section renders whatever is in it.',
      '',
    ]
  }

  const parts = [...new Set(peers.systems.flatMap((one) => Object.keys(one.parts)))].sort()
  const ours = new Map(styled.rows.map((one) => [one.family, one.alone]))

  const rows = []
  const losses = []
  for (const part of parts) {
    const mine = ours.get(part)
    if (!mine) {
      continue
    }
    rows.push(
      `| \`${part}\` | **Helix** | ${grouped(mine.raw)} | ${grouped(mine.gzip)} | ${grouped(mine.brotli)} |`,
    )
    for (const system of peers.systems) {
      const theirs = system.parts[part]
      if (!theirs) {
        rows.push(`| | ${system.name} | | not shipped | |`)
        continue
      }
      rows.push(
        `| | ${system.name} | ${grouped(theirs.raw)} | ${grouped(theirs.gzip)} | ${grouped(theirs.brotli)} |`,
      )
      if (theirs.gzip < mine.gzip) {
        losses.push({ by: mine.gzip - theirs.gzip, name: system.name, part })
      }
    }
  }

  const beaten = [...new Set(losses.map((one) => one.part))].sort()
  const worst = losses.sort((a, b) => b.by - a.by)[0]

  return [
    '## Against other systems',
    '',
    `Four other libraries of custom elements, pinned and measured on ${peers.measured} by \`turbo run peers\`, which installs them into \`.local\` and bundles them through the harness that produced everything above. **Helix's own rows are measured on every run of \`bun run gen:metrics\`**, so the column that could go stale against this repository is the one that cannot.`,
    '',
    `**Every system here is built on Lit**, so the runtime under the comparison is the same library in every column and what is left is the components. A React component library is not in the table, because comparing a custom element with a React component measures the framework.`,
    '',
    '**There is no whole-library row**, deliberately. It would compare how many components each vendor decided to ship, and how each one counts a component, which is the number that looks most like a measurement and means least. Five components every one of these has is the comparison.',
    '',
    '| Component | System | Raw | Gzip | Brotli |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    losses.length === 0
      ? '**Helix is smallest on all five**, which is a fact about five components and not about a library. The comparison is here to be checked, not to be won.'
      : `**Where Helix loses**, which is the half of a comparison table worth reading: ${beaten.map((one) => `\`${one}\``).join(', ')}. The largest gap is ${worst.part} against ${worst.name}, by ${grouped(worst.by)} bytes gzipped. ${losses.length} of ${rows.length - parts.length} peer measurements come in under ours.`,
    '',
    ...peers.systems.map(
      (system) => `- **${system.name}** \`${system.package}@${system.version}\`. ${system.note}`,
    ),
    '',
    'Every specifier measured is in [`peers.json`](https://github.com/project-fusion/fusion/blob/main/helix/docs/peers.json), so a disagreement with these numbers is a thing that can be run rather than argued.',
    '',
  ]
}

/**
 * What a component costs in time, which is the half this page did not argue.
 *
 * **Kept away from the comparison above and it always will be.** Bytes are a
 * fact about a package and can be held against anybody else's; a timing is a
 * fact about a page, a machine and a day, and putting another library's number
 * beside ours would be comparing two laptops.
 */
const timing = () => {
  if (!timings) {
    return [
      '## What it costs in time',
      '',
      'Not measured. `turbo run timings` drives a real browser against the',
      'built packages and writes `helix/docs/timings.json`, and this section',
      'renders whatever is in it.',
      '',
    ]
  }
  return [
    '## What it costs in time',
    '',
    `Measured on ${timings.measured} by \`turbo run timings\`, which drives a real browser against the built packages. The median of ${timings.runs} runs each, on one machine.`,
    '',
    "**These never join the comparison above, and that is not a hedge.** Bytes are a fact about a package and can be held against anybody else's. A timing is a fact about a page, a machine and a day, so a column of somebody else's milliseconds would be comparing two laptops rather than two libraries.",
    '',
    '**Nothing checks these.** A timing moves several percent between runs on one machine and much further between machines, so a gate on it would fail for reasons nobody caused, which is the fastest way to teach a team that red means nothing. `verify` does not run it. It is refreshed by hand, the same as the peer table, and the date above is the answer to how current it is.',
    '',
    '| Component | Time to upgrade | First render | Hydration |',
    '| --- | --- | --- | --- |',
    ...timings.families.map(
      (one) =>
        `| \`${one.family}\` | ${one.upgrade.toFixed(2)}ms | ${one.render.toFixed(2)}ms | ` +
        `${one.hydrate.toFixed(2)}ms${one.adopted ? '' : ' (rebuilt)'} |`,
    ),
    '',
    '**Time to upgrade** is the gap between markup being in the document and its shadow root existing, which is the flash of unstyled content that server rendering exists to remove. It is measured the way it happens: the markup is parsed first and the definition arrives after, which is what a script at the foot of a page does. It is dominated by fetching and evaluating the module, so it tracks the byte tables above rather than saying something separate from them.',
    '',
    "**First render** is what one fresh element costs once the definition is already there, from construction to its first update completing. It is mostly Lit's and is close to identical across families, which is the point: a family far off it is doing something in its first update that the others are not.",
    '',
    '**Hydration** is the gap between a server-rendered tree sitting in the document and that same tree being live. It is the number server rendering exists to justify and the easiest of the three to fake, so it is measured against a document the server actually rendered and delivered: assigning that markup with `innerHTML` does not parse a declarative shadow root, so there would be nothing to adopt and every reading would be a rebuild wearing the right label.',
    '',
    '**Every figure above was checked for adoption rather than assumed to have it**, and the check is that adoption adds nothing: the count of parts in the shadow root before the definition arrives has to equal the count after. Marking a node and looking for it later passes either way, because Lit does not clear a shadow root it did not create, so a failed hydration leaves the mark in place and appends a second copy of the tree beneath it. Measured on Button with the support module removed, the parts went from one to two while the timing moved by half a millisecond, so without the adoption test the wrong number is indistinguishable from the right one. A row reading `(rebuilt)` is that failure, and there are none.',
    '',
  ]
}

const row = (label, measurement) =>
  `| ${label} | ${grouped(measurement.raw)} | ${grouped(measurement.gzip)} | ${grouped(measurement.brotli)} |`

const lines = [
  '---',
  'description: What Helix costs a page, measured rather than claimed.',
  `order: ${lastInSection()}`,
  'section: Getting started',
  'title: Metrics',
  '---',
  '',
  '# Metrics',
  '',
  '*Generated by `bun run gen:metrics` from the built packages. Do not edit: every',
  'number here is measured, and an edited one is a number nothing produced.*',
  '',
  'Bundle size, and what a component costs in time. The two are kept apart on',
  'purpose: bytes are falsifiable across systems and belong in the comparison,',
  'and a render timing is a fact about a page, a machine and a day, so it never',
  'joins one.',
  '',
  '## How these are measured',
  '',
  'The method is on the page because a size table without one is a claim rather',
  'than a measurement.',
  '',
  `- **The published artifact, not the source.** Each row bundles \`dist\`, which is what npm ships, through Bun ${Bun.version}, minified, ESM, browser target, no source maps.`,
  '- **Everything is bundled in, Lit included.** A page with no other Lit library pays for Lit, so it is counted. Its own row is in the package table below, so it can be subtracted.',
  '- **A package row re-exports the package; a component row imports it for effect.** That is how each is used: an element is imported to register itself, and a package is measured by its whole public API. Importing a `sideEffects: false` package for effect measures nothing, because a bundler is right to delete it.',
  '- **Gzip is level 9 and brotli is quality 11**, which is what a CDN serving static assets does.',
  '- **The bundler version is part of the number.** It is pinned in `packageManager` and in CI, so the same source measures the same in both places.',
  '',
  'Two columns for every component, because there is no single honest number for',
  'a component in a library with a shared runtime:',
  '',
  '- **Alone** is a page that uses this component and nothing else. It includes the runtime the component cannot work without, so it counts that runtime again for every component after the first.',
  '- **Added** is what this component costs a page that already has the runtime. It excludes what is shared, so it flatters the first component you install.',
  '',
  'Neither is the real number. The pair brackets it.',
  '',
  '## The floor',
  '',
  'Lit and `@fusion.dev/helix-core`, which is what every element needs and no element',
  'owns. **Added** is measured against this.',
  '',
  '**It is larger than most single components below, and that is not a mistake.**',
  'The floor re-exports the whole of `@fusion.dev/helix-core` so that it is the same size',
  'under every family. A family that reaches only part of core shakes the rest',
  'out and comes in smaller than the floor, which is the tree-shaking working:',
  'nobody ever downloads this floor on its own.',
  '',
  '| | Raw | Gzip | Brotli |',
  '|---|---|---|---|',
  row('Lit and `@fusion.dev/helix-core`', floor),
  '',
  '## Whole packages',
  '',
  'Everything a package exports, retained. This is the ceiling rather than a',
  'typical page: `@fusion.dev/helix` and `@fusion.dev/helix-headless` are side-effectful, so',
  'a barrel import of either really does cost the whole row, and nothing in this',
  'repository does that. The per-component tables are what a page pays.',
  '',
  '| Package | Raw | Gzip | Brotli | |',
  '|---|---|---|---|---|',
  ...packages.map(
    (one) =>
      `| \`${one.entry}\` | ${grouped(one.raw)} | ${grouped(one.gzip)} | ${grouped(one.brotli)} | ${one.note} |`,
  ),
  '',
  '## The stylesheets',
  '',
  'Linked rather than bundled, so these are the files exactly as a browser',
  'receives them. `@fusion.dev/helix-styles` ships its stylesheets with the comments',
  'removed and keeps the reasoning in the repository, which is why these numbers',
  'are a quarter of what the sources weigh. It has no JavaScript at all, so this',
  'is the whole cost of adopting the base layer on its own.',
  '',
  '| File | Raw | Gzip | Brotli | |',
  '|---|---|---|---|---|',
  ...stylesheets.map(
    (sheet) =>
      `| \`${sheet.path.split('/').at(-1)}\` | ${grouped(sheet.raw)} | ${grouped(sheet.gzip)} | ${grouped(sheet.brotli)} | ${sheet.note} |`,
  ),
  '',
  '## What the numbers say',
  '',
  `**Most of a first component is the runtime under it.** The median styled family is ${grouped(median(styledGzip))} bytes gzipped alone and adds ${grouped(median(styledAdded))} to a page that already has Helix on it, so ${sharedShare} percent of the first one is shared and ${addedShare} percent is the component. Ten typical components are one plus nine additions rather than ten of the first number, and the pair of columns below is what lets that be worked out rather than guessed.`,
  '',
  `Across the tier: the cheapest is \`${cheapest.family}\` at ${grouped(cheapest.alone.gzip)} gzipped alone, the dearest \`${dearest.family}\` at ${grouped(dearest.alone.gzip)}, over ${styled.rows.length} components. Every family at once is ${grouped(wholeStyled.gzip)}.`,
  '',
  `**No family imports a barrel, and the \`barrels\` rule in \`fusion workspace\` is what keeps it that way.** \`@fusion.dev/helix-headless\` is \`sideEffects\` over every module in \`dist\`, which is true of a file that calls \`customElements.define\` and which means a bundler may drop none of it: one \`import { HelixHeadlessButton } from '@fusion.dev/helix-headless'\` costs ${grouped(wholeHeadless.gzip)} bytes gzipped whatever else the page does, which is ${barrelMultiple} times the median family measured above. ${barrelled.size === 0 ? `The styled tier imports the family it extends instead, all ${styled.rows.length} of them` : `${barrelled.size} families still import the barrel`}, and the check refuses the shape rather than the package name, so the rule follows \`sideEffects\` wherever it goes.`,
  '',
  `The headless tier never had the problem, and it is the control: \`@fusion.dev/helix-core\` is \`sideEffects: false\`, and a headless family is a median of ${grouped(median(headlessGzip))} bytes gzipped alone.`,
  '',
  ...comparison(),
  ...timing(),
  '## Per component',
  '',
  'Alphabetical, so this is a lookup table. Bytes, not kilobytes, because a',
  'rounded number in a generated table is a number somebody has to un-round',
  'before they can check it.',
  '',
]

for (const tier of measured) {
  lines.push(
    `### ${tier.heading}`,
    '',
    tier.note,
    '',
    '| Family | Alone raw | Alone gzip | Alone brotli | Added raw | Added gzip | Added brotli |',
    '|---|---|---|---|---|---|---|',
    ...tier.rows.map(
      (one) =>
        `| \`${one.family}\` | ${grouped(one.alone.raw)} | ${grouped(one.alone.gzip)} | ${grouped(one.alone.brotli)} | ${grouped(one.added.raw)} | ${grouped(one.added.gzip)} | ${grouped(one.added.brotli)} |`,
    ),
    '',
  )
}

lines.push(
  '## What lands in `node_modules`',
  '',
  'A different question from what reaches a browser, and the one an install',
  'budget is written against. Unpacked bytes of exactly what each package',
  'publishes, which is its `files` field. **Source maps are not in these',
  'numbers**: they are stripped from the tarball at pack time, so the last',
  'column is what was removed rather than part of what remains.',
  '',
  '| Package | Unpacked | Files | Source maps stripped | Runtime dependencies |',
  '|---|---|---|---|---|',
  ...footprints.map(
    (one) =>
      `| \`${one.name}\` | ${grouped(one.bytes)} | ${grouped(one.count)} | ${grouped(one.maps)} | ${one.dependencies.length === 0 ? 'none' : one.dependencies.map((name) => `\`${name}\``).join(', ')} |`,
  ),
  '',
  '## Not measured yet',
  '',
  'Named rather than left out, because a metrics page is read for what it does',
  'not say as much as for what it does.',
  '',
  '- **No whole-library comparison, and no fifth component.** The comparison above is five components against four systems. Widening it means naming the equivalent element in each system by hand, which is where a comparison table starts arguing, so each addition is a deliberate one rather than a sweep.',
  '- **The peer numbers are pinned, so they age.** They are dated in the section above and refreshed by running `turbo run peers`. Nothing fails when they are old, because nothing in this repository changes when somebody else releases, and a check that fired on the calendar would be noise.',
  '- **No first paint.** The timings above are facts about a component: time to upgrade, first render, hydration. First paint is a fact about a whole page, so it belongs to whatever renders one rather than to the library it renders.',
  "- **No per-component stylesheet bytes.** There are none to report: a family's CSS is compiled into its JavaScript, so it is already inside every number above. `elements.css` is the light-DOM layer and is in the stylesheet table.",
  '',
)

const written = `${lines
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trimEnd()}\n`
const output = join(root, OUTPUT)

/**
 * The four claims the landing page prints, emitted rather than copied.
 *
 * The landing page says "every number here was produced, not written", and a
 * number a generator could produce and a human retypes goes stale on a day
 * nobody is looking.
 *
 * Emitted from this script rather than a generator of its own because every
 * value is already computed for the MDX above, and measuring them twice is how
 * two documents come to disagree about one run.
 */
const CLAIMS_OUT = 'fusion/site/content/landing/claims.generated.ts'

const claims = [
  {
    label: 'Components',
    note: 'Two tiers. Headless behavior and a styled layer over it, both shipped.',
    value: String(styled.rows.length),
  },
  {
    label: 'The token layer, compressed',
    note: `${TOKEN_COUNT} semantic tokens. Nothing on a Helix page paints without this file.`,
    value: kb(stylesheets.find((sheet) => sheet.path.endsWith('dist/tokens.css')).brotli),
  },
  {
    label: 'The derivation engine',
    note: 'Build time for most consumers, runtime for a theme switcher.',
    value: kb(packages.find((one) => one.entry === '@fusion.dev/helix-theme').brotli),
  },
  {
    label: 'Shared across the first component',
    note: 'Ten components are one runtime plus nine additions, not ten of the first number.',
    value: `${sharedShare}%`,
  },
]

/* **The landing page's comparison, from the same two sources the metrics table
   uses.** Ours is measured on every run from this repository; theirs comes from
   `helix/docs/peers.json`, which `turbo run peers` writes and which is
   committed, so this needs no network and 192's pinning is untouched: refreshing
   the rivals stays a deliberate act with a date on it, and only the copying
   stops being one.

   Sorted by what is printed. A table claiming to be ordered and not being so is
   worse than an unordered one, because a reader stops checking. */
const buttonRivals = (() => {
  const mine = styled.rows.find((one) => one.family === 'button')
  if (!peers || !mine) {
    return []
  }
  return [
    { brotli: mine.alone.brotli, name: 'Helix', ours: true },
    ...peers.systems
      .map((system) => ({ brotli: system.parts.button?.brotli, name: system.name }))
      .filter((one) => typeof one.brotli === 'number'),
  ].sort((a, b) => a.brotli - b.brotli)
})()

const claimsSource = [
  '/* Generated from the built packages by `bun run gen:metrics`. Do not edit. */',
  '',
  'export interface Claim {',
  '  /** What was measured, in the fewest words that stay true. */',
  '  label: string',
  '  /** Why the number is the one worth printing. Never an adjective. */',
  '  note: string',
  '  /** Rendered large. A string because the unit belongs to the figure. */',
  '  value: string',
  '}',
  '',
  'export const CLAIMS: readonly Claim[] = [',
  ...claims.flatMap((claim) => [
    '  {',
    `    label: '${claim.label}',`,
    `    note: '${claim.note.replace(/'/g, "\\'")}',`,
    `    value: '${claim.value}',`,
    '  },',
  ]),
  ']',
  '',
  'export interface Rival {',
  '  /** Brotli bytes for the one component, alone. */',
  '  brotli: number',
  '  name: string',
  '  /** Ours, which the page marks rather than infers from the name. */',
  '  ours?: boolean',
  '}',
  '',
  'export const BUTTON: readonly Rival[] = [',
  ...buttonRivals.flatMap((rival) => [
    '  {',
    `    brotli: ${rival.brotli},`,
    `    name: '${rival.name}',`,
    ...(rival.ours ? ['    ours: true,'] : []),
    '  },',
  ]),
  ']',
  '',
].join('\n')

const claimsPath = join(root, CLAIMS_OUT)

if (check) {
  let claimsExisting = ''
  try {
    claimsExisting = readFileSync(claimsPath, 'utf8')
  } catch {
    claimsExisting = ''
  }
  if (claimsExisting !== claimsSource) {
    console.error(
      `${CLAIMS_OUT} is behind the packages it measures. Run \`bun run gen:metrics\` and commit the result.`,
    )
    process.exit(1)
  }

  const existing = existsSync(output) ? readFileSync(output, 'utf8') : ''
  if (existing !== written) {
    /* **Which lines, not just that some line.** Reporting only staleness costs a
       round trip to find out what moved, and on a runner that round trip is the
       whole build again. A number that differs by platform and a number that
       differs because somebody edited a component look identical until you see
       them. */
    const before = existing.split('\n')
    const after = written.split('\n')
    const moved = after
      .map((line, index) => [before[index], line])
      .filter(([was, now]) => was !== now)

    console.error(
      `${OUTPUT} is behind the packages it measures. Run \`bun run gen:metrics\` and commit the result.\n` +
        `If the only difference is the numbers, check the bundler first: this run used Bun ${Bun.version}, ` +
        'and the pinned version is the one in `packageManager`.\n\n' +
        `${moved.length} line${moved.length === 1 ? '' : 's'} differ:\n` +
        moved
          .slice(0, 20)
          .map(([was, now]) => `  - ${was ?? '(absent)'}\n  + ${now}`)
          .join('\n') +
        (moved.length > 20 ? `\n  ... and ${moved.length - 20} more` : ''),
    )
    process.exit(1)
  }
  console.log(
    `metrics: ${styled.rows.length} styled and ${headless.rows.length} headless families measured, current`,
  )
} else {
  writeFileSync(output, written)
  writeFileSync(claimsPath, claimsSource)
  console.log(
    `metrics: ${styled.rows.length} styled and ${headless.rows.length} headless families written to ${OUTPUT}`,
  )
}

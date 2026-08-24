#!/usr/bin/env bun
/**
 * Measures what Helix costs a page, and writes
 * `helix/docs/content/metrics.mdx` from the measurement.
 *
 * **Generated, the way the component reference and the token reference are.**
 * [`23-helix-docs.md`](../../docs/plan/23-helix-docs.md) asks for this directly: a
 * hand-written size table is stale within a month and unfalsifiable the whole
 * time, and this one moves the moment a component gains an import. The prose
 * lives in this file rather than in the MDX for the same reason the token
 * reference's prose does, that a page half generated and half authored has two
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
 * Run `bun run metrics` to write it, `bun run check:metrics` to fail when it is
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
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { brotliCompress, constants, gzip } from 'node:zlib'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUTPUT = 'helix/docs/content/metrics.mdx'

/**
 * What the other systems measured, from `bun run metrics:peers`.
 *
 * Committed, because measuring them needs a registry and `check:metrics` runs
 * in CI. Our own side of that comparison is not in the file: it is measured
 * here on every run, so the column that can go stale against this repository
 * is the one that cannot.
 */
const PEERS = 'helix/docs/peers.json'

/**
 * Where the entry modules go while they are being measured.
 *
 * Inside the repository rather than in the system temp directory, because an
 * entry says `import '@helix-io/web/button'` and package resolution walks up
 * from the file: a module outside the workspace resolves nothing. `.local/` is
 * the declared per-machine scratch and is gitignored.
 */
const SCRATCH = join(ROOT, '.local/metrics')

const check = process.argv.includes('--check')

/**
 * Where this page sits in Getting started, which is a path and therefore
 * ordered.
 *
 * **Computed as last rather than written down.** [`23-helix-docs.md`](../../docs/plan/23-helix-docs.md)
 * puts Metrics at the end of that section, and the end is a position rather
 * than a number: pages were inserted into the path twice while this was being
 * built, and the second time a hardcoded 6 collided with Versioning, which
 * `bun run docs` refuses. Reading the other pages' frontmatter makes the
 * intent survive the next insertion.
 */
const lastInSection = () => {
  const dir = join(ROOT, 'helix/docs/content')
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
 * Lit and `@helix-io/core`: the two things every Helix element needs and
 * neither of which belongs to any one of them. A page that has one component
 * has already paid this, so what a second component adds is measured against
 * it.
 *
 * `@helix-io/headless` is deliberately not in here. It is a tier rather than a
 * runtime: a page with one styled component has some of it and never all of
 * it, so a floor containing it would credit every family with code no page
 * loads. `check:barrels` is what keeps that true.
 *
 * **`export *`, not a bare import, and the difference is the whole floor.**
 * `@helix-io/core` is `sideEffects: false`, so `import '@helix-io/core'` for
 * effect compiles to nothing and the first run of this script reported the
 * runtime at 0 raw bytes and the whole icon set at 0 beside it. Re-exporting
 * pins the complete public API in place, which is what a floor has to be for
 * the second column to mean the same thing for every family: a tree-shaken
 * floor would be a different size under each one.
 */
const RUNTIME = ["export * from 'lit'", "export * from '@helix-io/core'", ''].join('\n')

/** The two tiers with per-family entry points, in dependency order. */
const TIERS = [
  {
    dir: 'helix/headless',
    heading: 'Headless tier',
    name: '@helix-io/headless',
    note: 'Structure, accessibility, state and form participation. No presentation, and no stylesheet to load beside it.',
  },
  {
    dir: 'helix/web',
    heading: 'Styled tier',
    name: '@helix-io/web',
    note: 'The headless tier plus presentation. This is what `bun add @helix-io/web` gives you.',
  },
]

/** Every package with a JavaScript entry a page can import, and what it is for. */
const PACKAGES = [
  {
    entry: '@helix-io/core',
    note: 'Element base class, mixins, decorators, floating positioning.',
  },
  { entry: '@helix-io/headless', note: 'Every headless family, which is what the barrel means.' },
  { entry: '@helix-io/icons', note: 'The whole glyph set.' },
  {
    entry: '@helix-io/theme',
    note: 'The derivation engine. Build time for most consumers, runtime for a theme switcher.',
  },
  { entry: '@helix-io/web', note: 'Every styled family.' },
  { entry: 'lit', note: 'Not ours. Here so it can be subtracted from every row above it.' },
]

/**
 * How many semantic tokens there are, read rather than written.
 *
 * The note below said 176 and there are 177, which is the drift this file exists
 * to prevent everywhere else: every byte on this page is measured, and the one
 * number that was typed is the one that went stale. Two documentation pages had
 * the same figure and had drifted the same way.
 */
const TOKEN_COUNT = JSON.parse(readFileSync(join(ROOT, 'helix', 'styles', 'tokens.json'), 'utf8'))
  .tokens.length

/** The stylesheets a consumer links, which no bundler is involved in. */
const STYLESHEETS = [
  {
    note: 'The base layer. Recipes for markup Helix does not render, usable with no JavaScript at all.',
    path: 'helix/styles/src/base.css',
  },
  {
    note: "The components' own layer, generated from every family's stylesheet.",
    path: 'helix/web/elements.css',
  },
  {
    note: 'The primitive layer. Private, shipped because `tokens.css` resolves into it.',
    path: 'helix/styles/src/primitives.css',
  },
  {
    note: `The ${TOKEN_COUNT} semantic tokens. Nothing paints without this.`,
    path: 'helix/styles/src/tokens.css',
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
  const manifest = JSON.parse(readFileSync(join(ROOT, dir, 'custom-elements.json'), 'utf8'))
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
  const manifest = JSON.parse(readFileSync(join(ROOT, dir, 'package.json'), 'utf8'))
  let bytes = 0
  let count = 0
  let maps = 0
  for (const entry of manifest.files ?? []) {
    const path = join(ROOT, dir, entry)
    if (!existsSync(path)) {
      continue
    }
    for (const file of walk(path)) {
      /* **Maps are counted and then taken off, because they no longer ship.**
         `publish.mjs` opens the packed tarball and removes every `.map` and the
         trailing `sourceMappingURL` comment with it, so `dist` on disk is not
         what lands in a consumer's `node_modules`. Measuring the directory and
         reporting the total overstated every row by its own map column: 272,406
         bytes on `@helix-io/web` alone.

         Still counted rather than skipped, so the row can say how much was
         removed. A number that used to be part of the total and is now
         subtracted from it is worth showing rather than quietly dropping. */
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
  if (!existsSync(join(ROOT, tier.dir, 'dist/index.js'))) {
    console.error(
      `${tier.dir}/dist is missing. Metrics measure the published artifact, so run \`bun run build\` first.`,
    )
    process.exit(1)
  }
}

rmSync(SCRATCH, { force: true, recursive: true })
mkdirSync(SCRATCH, { recursive: true })

const floor = await measure('floor', RUNTIME)

const packages = await pooled(PACKAGES, async (entry, index) => ({
  ...entry,
  ...(await measure(`package-${index}`, `export * from '${entry.entry}'\n`)),
}))

const stylesheets = await pooled(STYLESHEETS, async (sheet) => ({
  ...sheet,
  ...(await sizes(readFileSync(join(ROOT, sheet.path)))),
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
for (const path of sources(join(ROOT, 'helix/web/src'))) {
  if (readFileSync(path, 'utf8').includes("from '@helix-io/headless'")) {
    barrelled.add(path.slice(join(ROOT, 'helix/web/src').length + 1).split('/')[0])
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

rmSync(SCRATCH, { force: true, recursive: true })

const peers = existsSync(join(ROOT, PEERS))
  ? JSON.parse(readFileSync(join(ROOT, PEERS), 'utf8'))
  : undefined

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle]
}

const styled = measured.find((tier) => tier.name === '@helix-io/web')
const headless = measured.find((tier) => tier.name === '@helix-io/headless')
const styledGzip = styled.rows.map((row) => row.alone.gzip)
const styledAdded = styled.rows.map((row) => row.added.gzip)
const headlessGzip = headless.rows.map((row) => row.alone.gzip)
const cheapest = styled.rows.reduce((low, row) => (row.alone.gzip < low.alone.gzip ? row : low))
const dearest = styled.rows.reduce((high, row) => (row.alone.gzip > high.alone.gzip ? row : high))
const wholeStyled = packages.find((one) => one.entry === '@helix-io/web')
const wholeHeadless = packages.find((one) => one.entry === '@helix-io/headless')

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
  'helix/web',
].map(footprint)

/**
 * The comparison, or an honest absence of one.
 *
 * **Helix's rows are the same `alone` numbers as the table below**, not a
 * second measurement of the same thing: `alone` is `import '@helix-io/web/x'`,
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
      'Not measured. `bun run metrics:peers` installs the systems and writes',
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
    `Four other libraries of custom elements, pinned and measured on ${peers.measured} by \`bun run metrics:peers\`, which installs them into \`.local\` and bundles them through the harness that produced everything above. **Helix's own rows are measured on every run of \`bun run metrics\`**, so the column that could go stale against this repository is the one that cannot.`,
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
    'Every specifier measured is in [`peers.json`](https://github.com/former-org/former-repo/blob/main/helix/docs/peers.json), so a disagreement with these numbers is a thing that can be run rather than argued.',
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
  '*Generated by `bun run metrics` from the built packages. Do not edit: every',
  'number here is measured, and an edited one is a number nothing produced.*',
  '',
  'Bundle size only. Load and rendering are not measured yet, and when they are',
  'they stay off any comparison with another library, because bytes are',
  'falsifiable across systems and a render timing is a fact about a page.',
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
  'Lit and `@helix-io/core`, which is what every element needs and no element',
  'owns. **Added** is measured against this.',
  '',
  '**It is larger than most single components below, and that is not a mistake.**',
  'The floor re-exports the whole of `@helix-io/core` so that it is the same size',
  'under every family. A family that reaches only part of core shakes the rest',
  'out and comes in smaller than the floor, which is the tree-shaking working:',
  'nobody ever downloads this floor on its own.',
  '',
  '| | Raw | Gzip | Brotli |',
  '|---|---|---|---|',
  row('Lit and `@helix-io/core`', floor),
  '',
  '## Whole packages',
  '',
  'Everything a package exports, retained. This is the ceiling rather than a',
  'typical page: `@helix-io/web` and `@helix-io/headless` are side-effectful, so',
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
  'Linked rather than bundled, so these are the files as shipped and a consumer',
  'minifies them or does not. `@helix-io/styles` has no JavaScript at all, which',
  'is why it is the whole cost of adopting the base layer on its own.',
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
  `**No family imports a barrel, and \`check:barrels\` is what keeps it that way.** \`@helix-io/headless\` is \`sideEffects\` over every module in \`dist\`, which is true of a file that calls \`customElements.define\` and which means a bundler may drop none of it: one \`import { HelixBaseButton } from '@helix-io/headless'\` costs ${grouped(wholeHeadless.gzip)} bytes gzipped whatever else the page does, which is ${barrelMultiple} times the median family measured above. ${barrelled.size === 0 ? `The styled tier imports the family it extends instead, all ${styled.rows.length} of them` : `${barrelled.size} families still import the barrel`}, and the check refuses the shape rather than the package name, so the rule follows \`sideEffects\` wherever it goes.`,
  '',
  `The headless tier never had the problem, and it is the control: \`@helix-io/core\` is \`sideEffects: false\`, and a headless family is a median of ${grouped(median(headlessGzip))} bytes gzipped alone.`,
  '',
  ...comparison(),
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
  '- **The peer numbers are pinned, so they age.** They are dated in the section above and refreshed by running `bun run metrics:peers`. Nothing fails when they are old, because nothing in this repository changes when somebody else releases, and a check that fired on the calendar would be noise.',
  '- **No load or rendering timings.** First paint, time to upgrade, and the cost of hydrating a server-rendered tree. These need a browser harness rather than a bundler, and they never join a cross-system table.',
  "- **No per-component stylesheet bytes.** There are none to report: a family's CSS is compiled into its JavaScript, so it is already inside every number above. `elements.css` is the light-DOM layer and is in the stylesheet table.",
  '',
)

const written = `${lines
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trimEnd()}\n`
const output = join(ROOT, OUTPUT)

if (check) {
  const existing = existsSync(output) ? readFileSync(output, 'utf8') : ''
  if (existing !== written) {
    console.error(
      `${OUTPUT} is behind the packages it measures. Run \`bun run metrics\` and commit the result.\n` +
        `If the only difference is the numbers, check the bundler first: this run used Bun ${Bun.version}, ` +
        'and the pinned version is the one in `packageManager`.',
    )
    process.exit(1)
  }
  console.log(
    `metrics: ${styled.rows.length} styled and ${headless.rows.length} headless families measured, current`,
  )
} else {
  writeFileSync(output, written)
  console.log(
    `metrics: ${styled.rows.length} styled and ${headless.rows.length} headless families written to ${OUTPUT}`,
  )
}

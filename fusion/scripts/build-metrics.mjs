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
 *
 * **Measured once per set of inputs, not once per command.** `verify` runs the
 * writer, as the dependency of `turbo run docs -- --check`, and then the
 * check, so a change to any component measured every family twice, a few
 * seconds apart, from the same `dist`. So a write leaves a receipt in
 * `.local/`: a fingerprint of everything the measurement reads, and a hash of
 * each file it wrote. The check reads the fingerprint first, which costs a hash
 * of a few megabytes rather than two bundles per family, and when the receipt
 * vouches for the files on disk it says so and measures nothing.
 *
 * **What the receipt cannot vouch for is exactly what the check is for.** A
 * turbo cache restore writes the page and not the receipt, so a page restored
 * from somewhere else, the laptop build that once reported the theme at 16
 * files where Linux ships 8, arrives with no receipt or a mismatched hash and
 * is measured. The receipt is per machine and gitignored, and the fingerprint
 * takes the Bun version, so a page this checkout measured is the only one it
 * ever skips.
 */
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'

import { join } from 'node:path'
import { promisify } from 'node:util'
import { brotliCompress, constants, gzip } from 'node:zlib'
import { emit } from '@fusion.dev/scripts/emit'
import { ARTIFACT, root } from '@fusion.dev/scripts/workspace'

const OUTPUT = 'helix/docs/content/metrics.mdx'

/**
 * What the landing page prints from this run: the component count, the size a
 * component adds, and the coverage table, emitted rather than copied.
 *
 * A number a generator could produce and a human retypes goes stale on a day
 * nobody is looking. Emitted from this script rather than a generator of its
 * own because every value is already computed for the MDX, and computing them
 * twice is how two documents come to disagree about one run.
 */
const CLAIMS_OUT = 'fusion/site/content/landing/claims.generated.ts'

/**
 * What the other systems measured, from `turbo run peers`.
 *
 * Committed, because measuring them needs a registry and `check:gen:metrics` runs
 * in CI. Our own side of that comparison is not in the file: it is measured
 * here on every run, so the column that can go stale against this repository
 * is the one that cannot.
 */
const PEERS = 'helix/docs/peers.json'

/**
 * **The jobs the coverage table asks about, each as the element names that do
 * it.** A system covers a job when its published manifest defines an element
 * with one of the names, after its prefix. One list of names for every system,
 * Helix included, so the table reads manifests and makes no judgment about
 * anybody's components.
 *
 * **Exact names, never a pattern.** Carbon ships `cds-chat-button`, which is
 * a button and not a chat, and a pattern on `chat` would have counted it.
 * Every mark on the page has to survive somebody looking up the element.
 *
 * **Only jobs Helix does, and that is the table's subject.** Every system here
 * ships buttons, form controls, menus, and dialogs, so rows for those would
 * fill every cell and say nothing. The page states that above the table.
 */
const CAPABILITIES = [
  {
    group: 'Data',
    rows: [
      {
        name: 'Charts',
        names: [
          'area-chart',
          'bar-chart',
          'chart',
          'donut-chart',
          'line-chart',
          'pie-chart',
          'scatter-chart',
          'sparkline',
        ],
      },
      {
        name: '3D charts',
        names: [
          'spatial-bar-chart',
          'spatial-heatmap',
          'spatial-ribbon-chart',
          'spatial-scatter-chart',
          'spatial-surface-chart',
          'spatial-treemap',
        ],
      },
      { name: 'Data table', names: ['data-grid', 'data-table', 'table'] },
      { name: 'Tree', names: ['tree', 'tree-view'] },
    ],
  },
  {
    group: 'Input',
    rows: [
      { name: 'Combobox', names: ['autocomplete', 'combo-box', 'combobox'] },
      { name: 'Date picker', names: ['calendar', 'date-picker'] },
      { name: 'Time picker', names: ['time-picker'] },
      { name: 'Color picker', names: ['color-area', 'color-picker', 'color-wheel'] },
      { name: 'File upload', names: ['dropzone', 'file-input', 'file-uploader'] },
    ],
  },
  {
    group: 'Workflow',
    rows: [
      { name: 'Chat', names: ['chat'] },
      { name: 'Command palette', names: ['command', 'command-palette'] },
      { name: 'Product tour', names: ['coachmark', 'tour'] },
      { name: 'Node diagrams', names: ['canvas', 'diagram', 'graph'] },
    ],
  },
  {
    group: 'Media and places',
    rows: [
      { name: 'Maps', names: ['map'] },
      { name: 'Video player', names: ['video', 'video-player'] },
      { name: 'Carousel', names: ['carousel'] },
    ],
  },
]

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
 * loads. the `barrels` rule in `fusion x workspace` is what keeps that true.
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
    note: 'Structure, accessibility, state, and form participation. It has no presentation and no stylesheet to load.',
  },
  {
    dir: 'helix/styled',
    heading: 'Styled tier',
    name: '@fusion.dev/helix',
    note: 'The headless tier plus presentation. `bun add @fusion.dev/helix` installs this tier.',
  },
]

/** Every package with a JavaScript entry a page can import, and what it is for. */
const PACKAGES = [
  {
    entry: '@fusion.dev/helix-core',
    note: 'The element base class, mixins, decorators, and floating positioning.',
  },
  {
    entry: '@fusion.dev/helix-headless',
    note: 'Every headless family. The barrel entry includes all of them.',
  },
  { entry: '@fusion.dev/helix-icons', note: 'The whole glyph set.' },
  {
    entry: '@fusion.dev/helix-theme',
    note: 'The JavaScript that runs the derivation engine. Most sites run it at build time, and a theme switcher runs it in the browser.',
  },
  { entry: '@fusion.dev/helix', note: 'Every styled family.' },
  { entry: 'lit', note: 'Lit itself, listed so you can subtract it from every row above.' },
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
    note: 'The base layer. It styles markup Helix does not render, and it works with no JavaScript.',
    path: 'helix/styles/dist/base.css',
  },
  {
    note: 'Hides each element until its definition loads. It is generated from the tags in `@fusion.dev/helix`.',
    path: 'helix/styles/dist/elements.css',
  },
  {
    note: 'The other four stylesheets in one import, in the order they must load.',
    path: 'helix/styles/dist/helix.css',
  },
  {
    note: 'The primitive layer. It is private, and it ships because `tokens.css` refers to it.',
    path: 'helix/styles/dist/primitives.css',
  },
  {
    note: `The ${TOKEN_COUNT} semantic tokens. Every styled component needs them.`,
    path: 'helix/styles/dist/tokens.css',
  },
]

/**
 * The derivation engine itself, which its package's entry loads when it runs.
 *
 * **Measured as a file, beside the bundle.** The entry fetches this at run time,
 * so `Bun.build` never sees it, and the package row alone came to 1.4 kB for an
 * engine a theme switcher downloads at 126 kB.
 */
const ENGINE_WASM = {
  note: 'The derivation engine itself, in WebAssembly. The entry above loads it when the engine runs.',
  path: 'helix/theme/wasm/fusion_helix_theme_bg.wasm',
}

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
 * The two compressed sizes of one buffer.
 *
 * Gzip at 9 and brotli at 11, which is what a CDN serving static assets uses,
 * with the size hint brotli wants so its window is not guessed.
 *
 * **Every setting is written inside this function.** The source of the
 * function is part of the key the sizes are stored under (see `ENGINE`). A
 * setting kept outside the function could change while the key stayed the
 * same, and the memo would then return sizes measured with the old setting.
 */
const compress = async (buffer) => {
  const [brotli, gzipped] = await Promise.all([
    compressed.brotli(buffer, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
        [constants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
      },
    }),
    compressed.gzip(buffer, { level: 9 }),
  ])
  return { brotli: brotli.length, gzip: gzipped.length }
}

/**
 * The compressed sizes already measured, keyed by a hash of the bytes.
 *
 * **Compression is most of this script's run time, and its result depends
 * only on the bytes.** A bundle that did not change keeps its sizes. So each
 * measurement is stored under a hash of the bundle, and a bundle with a stored
 * size is not compressed again. A change to one family compresses that
 * family's bundles, and `check:gen:metrics` after a write in the same job
 * compresses one bundle. Bundling still runs every time, so the hash is of
 * the bytes this machine builds now.
 *
 * **Two things carry the file between jobs.** It is an output of the `metrics`
 * turbo task, so the job that runs the check restores it with the build. An
 * Actions cache in `verify` carries it from one run of `warm` to the next,
 * because a turbo miss restores no outputs. The file is never an input, so it
 * moves no cache key. A missing file, or one from another engine, costs time
 * and changes no number on the page.
 */
const MEMO = join(root, '.local/metrics/sizes.json')

/**
 * Everything besides the bytes that can change a compressed size, as one hash.
 *
 * - The Bun build that compresses, by version and revision, and the zlib it
 *   links.
 * - The platform and the architecture, in case a compressor picks its code
 *   path by machine.
 * - The source of `compress`, which holds every setting.
 *
 * A memo written under any other engine is discarded whole.
 */
const ENGINE = createHash('sha256')
  .update(
    JSON.stringify({
      arch: process.arch,
      bun: Bun.version,
      compress: compress.toString(),
      platform: process.platform,
      revision: Bun.revision,
      zlib: process.versions.zlib ?? null,
    }),
  )
  .digest('hex')

/** The memo as found on disk, or empty when it is missing, unreadable or from another engine. */
const remembered = (() => {
  try {
    const memo = JSON.parse(readFileSync(MEMO, 'utf8'))
    return memo.engine === ENGINE && memo.sizes && typeof memo.sizes === 'object' ? memo.sizes : {}
  } catch {
    return {}
  }
})()

/** Every size this run used, which is the whole of the memo it writes. */
const used = new Map()

/** How many buffers were compressed, and how many were answered by the memo. */
const tally = { compressed: 0, remembered: 0 }

/** Whether a memo entry is two counts of bytes and not something else. */
const wellFormed = (entry) =>
  Number.isSafeInteger(entry?.brotli) &&
  entry.brotli > 0 &&
  Number.isSafeInteger(entry?.gzip) &&
  entry.gzip > 0

/**
 * The three sizes of one buffer.
 *
 * **The first buffer of every run is compressed, whether or not the memo holds
 * it.** When the memo holds it, the two results have to match. The first
 * buffer is always the shared runtime, so the cost is one compression per run.
 * If the compressor's output changes while its key stays the same, the run
 * fails here and prints no stale size.
 */
const sizes = async (buffer) => {
  const key = digest(buffer)
  const known = wellFormed(remembered[key]) ? remembered[key] : undefined
  let measured = known
  if (known === undefined || tally.compressed === 0) {
    tally.compressed += 1
    measured = await compress(buffer)
    if (known && (known.brotli !== measured.brotli || known.gzip !== measured.gzip)) {
      throw new Error(
        `${MEMO} says ${JSON.stringify(known)} for a buffer the compressor measures at ` +
          `${JSON.stringify(measured)}. Delete the file and run again.`,
      )
    }
  } else {
    tally.remembered += 1
  }
  used.set(key, { brotli: measured.brotli, gzip: measured.gzip })
  return { brotli: measured.brotli, gzip: measured.gzip, raw: buffer.length }
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
const walk = (path) =>
  statSync(path).isDirectory()
    ? readdirSync(path, { recursive: true })
        .map((entry) => join(path, entry))
        .filter((file) => statSync(file).isFile())
    : [path]

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

/** Where a write records what it measured from and what it wrote. */
const RECEIPT = join(root, '.local/metrics/receipt.json')

/** The two files a run emits, relative to the root. */
const OUTPUTS = [OUTPUT, CLAIMS_OUT]

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')

/**
 * Everything the measurement reads, as one hash.
 *
 * **Wider than the reads, on purpose.** Listing exactly the files this script
 * opens would let a new read go unhashed, and the receipt would vouch for a
 * page measured before that file moved. So it takes every package the page
 * measures whole, `package.json`, manifest and all of `dist`, beside the
 * lockfile, the data files, the other pages, this script and the library it
 * imports. A few megabytes, hashed in a fifth of a second.
 */
const fingerprint = () => {
  const hash = createHash('sha256').update(`bun ${Bun.version}\n`)
  const take = (path) => {
    const full = join(root, path)
    if (!existsSync(full)) {
      return
    }
    for (const file of walk(full).sort()) {
      hash.update(file.slice(root.length))
      hash.update(readFileSync(file))
    }
  }
  for (const path of [
    'bun.lock',
    'fusion/scripts/build-metrics.mjs',
    'fusion/scripts/lib',
    PEERS,
    TIMINGS,
    ARTIFACT.tokens,
    'helix/styled/src',
  ]) {
    take(path)
  }
  for (const file of readdirSync(join(root, 'helix/docs/content')).sort()) {
    if (file.endsWith('.mdx') && file !== 'metrics.mdx') {
      take(join('helix/docs/content', file))
    }
  }
  for (const dir of ['core', 'headless', 'icons', 'styled', 'styles', 'theme']) {
    for (const part of ['package.json', 'custom-elements.json', 'dist']) {
      take(join('helix', dir, part))
    }
  }
  return hash.digest('hex')
}

const inputs = fingerprint()

if (check && existsSync(RECEIPT)) {
  const receipt = JSON.parse(readFileSync(RECEIPT, 'utf8'))
  const vouched =
    receipt.inputs === inputs &&
    OUTPUTS.every((path) => {
      const full = join(root, path)
      return existsSync(full) && receipt.outputs?.[path] === digest(readFileSync(full))
    })
  if (vouched) {
    console.log(
      `metrics: ${receipt.styled} styled and ${receipt.headless} headless families, current: ` +
        'this checkout measured them from the same inputs and wrote the page on disk',
    )
    process.exit(0)
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

const engineWasm = await sizes(readFileSync(join(root, ENGINE_WASM.path)))
const engineEntry = packages.find((one) => one.entry === '@fusion.dev/helix-theme')

const stylesheets = await pooled(STYLESHEETS, async (sheet) => ({
  ...sheet,
  ...(await sizes(readFileSync(join(root, sheet.path)))),
}))

/* Which styled families reach for the headless barrel rather than the family
   they extend. Counted rather than claimed, because the paragraph that reads
   these numbers is the load-bearing one on the page. */
const sources = (dir) =>
  readdirSync(dir, { recursive: true })
    .filter((entry) => entry.endsWith('.ts') && !entry.endsWith('.spec.ts'))
    .map((entry) => join(dir, entry))

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

/**
 * Helix's elements, from the manifest the styled package publishes, with the
 * status each declares. The same two lists `turbo run peers` writes for the
 * other systems.
 */
const helixElements = (() => {
  const manifest = JSON.parse(readFileSync(join(root, 'helix/styled/custom-elements.json'), 'utf8'))
  const elements = []
  const experimental = []
  for (const module of manifest.modules) {
    for (const one of module.declarations ?? []) {
      if (!one.tagName) {
        continue
      }
      elements.push(one.tagName)
      if (one.helix?.status === 'experimental') {
        experimental.push(one.tagName)
      }
    }
  }
  return { elements: elements.sort(), experimental: experimental.sort() }
})()

/**
 * Each system's element for each job, or nothing. Helix first, then the peers
 * in the order the size table uses.
 */
const coverage = (() => {
  const systems = [
    { ...helixElements, name: 'Helix', ours: true, prefix: 'helix-' },
    ...(peers?.systems ?? []).filter((one) => Array.isArray(one.elements)),
  ]
  const find = (system, names) => {
    const tag = names
      .map((name) => `${system.prefix}${name}`)
      .find((one) => system.elements?.includes(one))
    return tag ? { experimental: system.experimental.includes(tag), tag } : null
  }
  const groups = CAPABILITIES.map((group) => ({
    name: group.group,
    rows: group.rows.map((row) => ({
      cells: systems.map((system) => find(system, row.names)),
      name: row.name,
    })),
  }))
  const totals = systems.map(
    (_, index) =>
      groups.flatMap((group) => group.rows).filter((row) => row.cells[index] !== null).length,
  )
  return {
    groups,
    rows: groups.reduce((sum, group) => sum + group.rows.length, 0),
    systems: systems.map((one, index) => ({
      name: one.name,
      ours: one.ours === true,
      total: totals[index],
    })),
  }
})()

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

/** A measured day, the way the site writes dates. */
const day = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  })

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
      '## Compared with other systems',
      '',
      'Not measured yet. Run `turbo run peers` to install the other systems and',
      'write `helix/docs/peers.json`. The comparison is built from that file.',
      '',
    ]
  }

  const parts = [...new Set(peers.systems.flatMap((one) => Object.keys(one.parts)))].sort()
  const ours = new Map(styled.rows.map((one) => [one.family, one.alone]))

  const rows = []
  const losses = []
  let measured = 0
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
      measured += 1
      if (theirs.gzip < mine.gzip) {
        losses.push({ by: mine.gzip - theirs.gzip, name: system.name, part })
      }
    }
  }

  const beaten = [...new Set(losses.map((one) => one.part))].sort()
  const worst = losses.sort((a, b) => b.by - a.by)[0]

  return [
    '## Compared with other systems',
    '',
    `We compare Helix with the libraries of custom elements listed under the table. \`turbo run peers\` measured them on ${day(peers.measured)}. It installs pinned versions into \`.local\` and bundles them with the same harness as the tables above. The Helix rows are measured on every run of \`bun run gen:metrics\`, so they always match this repository.`,
    '',
    `Every system in the table is built on Lit. The runtime is the same library in every column, so the differences come from the components. React component libraries are left out, because comparing a custom element with a React component would measure the framework.`,
    '',
    'The table has no whole-library row. That row would compare how many components each vendor ships and how each vendor counts a component. It would look like a measurement and mean little. The table compares components that most systems ship, and a system without one says so.',
    '',
    '| Component | System | Raw | Gzip | Brotli |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    losses.length === 0
      ? 'Helix is the smallest on every component in the table. The result covers these components only.'
      : `At least one system is smaller than Helix on ${beaten.map((one) => `\`${one}\``).join(', ')}. The largest gap is ${worst.part} against ${worst.name}, at ${grouped(worst.by)} bytes gzipped. ${losses.length} of ${measured} peer measurements are smaller than the Helix row.`,
    '',
    "Helix's `radio` family includes Radio Group, so its row carries an element that some peer rows measure without.",
    '',
    ...peers.systems.map(
      (system) => `- **${system.name}** \`${system.package}@${system.version}\`. ${system.note}`,
    ),
    '',
    'Every specifier we measured is in [`peers.json`](https://github.com/project-fusion/fusion/blob/main/helix/docs/peers.json), so you can run the same measurement yourself.',
    '',
  ]
}

/**
 * What each system ships, from the element names in each one's manifest.
 *
 * **Names in the cells, never ticks.** A tick asks you to trust the person who
 * drew it; an element name can be looked up in that system's documentation.
 */
const coverageSection = () => {
  if (!peers || coverage.systems.length < 2) {
    return []
  }
  const cell = (one) =>
    one === null ? '' : `\`${one.tag}\`${one.experimental ? ' (experimental)' : ''}`
  return [
    '## What each system ships',
    '',
    `Every system in the size comparison ships buttons, form controls, menus, and dialogs. This table lists jobs beyond those, and the element each system ships for each job. Each name comes from the manifest the system publishes, read by \`turbo run peers\` on ${day(peers.measured)}. The Helix column reads \`@fusion.dev/helix\` on every run.`,
    '',
    'A system covers a job when its manifest defines an element with one of a fixed list of names, after its prefix. The list is the same for every system, and it is in `build-metrics.mjs`. An empty cell means no element has one of those names. A system can still do the job with a pattern, a separate library, or an element under another name.',
    '',
    `| Job | ${coverage.systems.map((one) => (one.ours ? `**${one.name}**` : one.name)).join(' | ')} |`,
    `|---|${coverage.systems.map(() => '---').join('|')}|`,
    ...coverage.groups.flatMap((group) =>
      group.rows.map((row) => `| ${row.name} | ${row.cells.map(cell).join(' | ')} |`),
    ),
    `| **Jobs covered** | ${coverage.systems.map((one) => `${one.total} of ${coverage.rows}`).join(' | ')} |`,
    '',
    'An element marked experimental is one its system has not committed to. Helix and Web Awesome mark these with a status in their manifests, and Material Web publishes them under `labs`.',
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
      '## What a component costs in time',
      '',
      'Not measured yet. Run `turbo run timings` to measure the built packages in',
      'a real browser and write `helix/docs/timings.json`. The timings are built',
      'from that file.',
      '',
    ]
  }
  return [
    '## What a component costs in time',
    '',
    `\`turbo run timings\` measured these on ${timings.measured} by loading the built packages in a real browser. Each figure is the median of ${timings.runs} runs on one machine.`,
    '',
    'We do not compare these timings with other systems. A byte count belongs to a package, so you can compare it with any other package. A timing depends on the page, the machine, and the day. Timings from another library, measured on another machine, would show the difference between the two machines.',
    '',
    'No check runs on these timings. A timing moves several percent between runs on one machine, and much more between machines. A check on it would fail when no code changed, and a team soon learns to ignore a check like that. `verify` does not run the measurement. We refresh it by hand, like the peer table, and the date above shows how current it is.',
    '',
    '| Component | Time to upgrade | First render | Hydration |',
    '| --- | --- | --- | --- |',
    ...timings.families.map(
      (one) =>
        `| \`${one.family}\` | ${one.upgrade.toFixed(2)}ms | ${one.render.toFixed(2)}ms | ` +
        `${one.hydrate.toFixed(2)}ms${one.adopted ? '' : ' (rebuilt)'} |`,
    ),
    '',
    '**Time to upgrade** is the time from the markup entering the document to its shadow root existing. During that gap you see a flash of unstyled content, which server rendering removes. The measurement parses the markup first and loads the definition after it, in the same order as a script at the end of a page. Most of the time goes to fetching and evaluating the module, so the column follows the byte tables above.',
    '',
    '**First render** is the time one new element takes once its definition has loaded, from construction to the end of its first update. Most of that time is spent in Lit, so it is close to the same for every family. A family far from the others does extra work in its first update.',
    '',
    '**Hydration** is the time from a server-rendered tree being in the document to that tree becoming live. Server rendering is worth using only if this number is small, and it is the easiest of the three to measure wrongly. We measure it against a document the server rendered and delivered. Markup assigned with `innerHTML` does not parse a declarative shadow root, so the element would have nothing to adopt, and every reading would be a rebuild.',
    '',
    'We check every figure above for adoption. Adoption adds nothing to the shadow root, so the count of parts before the definition arrives must equal the count after. Marking a node and looking for it later does not work as a check. Lit does not clear a shadow root it did not create, so a failed hydration keeps the mark and adds a second copy of the tree below it. On Button with the support module removed, the parts went from one to two, and the timing moved by only half a millisecond. Without the adoption check, the wrong number looks the same as the right one. A row marked `(rebuilt)` shows that failure, and no row has it.',
    '',
  ]
}

const row = (label, measurement) =>
  `| ${label} | ${grouped(measurement.raw)} | ${grouped(measurement.gzip)} | ${grouped(measurement.brotli)} |`

const lines = [
  '---',
  'description: How much Helix adds to a page, measured from the built packages.',
  `order: ${lastInSection()}`,
  'section: Getting started',
  'title: Metrics',
  '---',
  '',
  '# Metrics',
  '',
  '*Generated by `bun run gen:metrics` from the built packages. Do not edit the',
  'page by hand, because every number on it comes from a measurement.*',
  '',
  'We measure Helix in two ways: the bytes it adds to your page, and the time its',
  'components take to render. We compare the bytes with other systems, because',
  'you can check a byte count on any machine. We keep the timings out of that',
  'comparison, because a timing depends on the page, the machine, and the day.',
  '',
  '## How we measure',
  '',
  'We publish the method so you can repeat each measurement.',
  '',
  `- **The published files.** Each row bundles \`dist\`, the files npm ships, with Bun ${Bun.version}. The bundle is minified ESM for the browser, with no source maps.`,
  '- **Everything is bundled, including Lit.** A page with no other Lit library downloads Lit, so we count it. Lit has its own row in the package table below, so you can subtract it.',
  '- **A package row re-exports the package, and a component row imports the component for effect.** You import an element to register it, so a component row measures that import. A package row measures the whole public API. Importing a `sideEffects: false` package for effect measures nothing, because the bundler removes it.',
  '- **Gzip runs at level 9 and brotli at quality 11**, the settings a CDN uses for static assets.',
  '- **The bundler version affects the numbers.** It is pinned in `packageManager` and in CI, so the same source gives the same numbers in both places.',
  '',
  'Each component has two columns. Components share a runtime, so no single',
  'number gives the cost of one component:',
  '',
  "- **Alone** is a page that imports the component's own entry and nothing else. It includes the runtime the component needs, so a sum of Alone numbers counts the runtime once for every component.",
  '- **Added** is what the component adds to a page that already has the runtime. It leaves out the shared runtime, so it understates the cost of your first component.',
  '',
  'The cost on your page falls between the two numbers.',
  '',
  "A container that holds another family's elements does not register them, so neither column includes them. A page with a Select also imports `option`, and a page with a Data Table also imports `table`. Each component's page lists the entries to import beside it.",
  '',
  '## The shared runtime',
  '',
  'The shared runtime is Lit and `@fusion.dev/helix-core`. Every element needs it,',
  'and no single element owns it. The Added columns are measured against it.',
  '',
  'The shared runtime is larger than most single components below. It re-exports',
  'all of `@fusion.dev/helix-core`, so it is the same size under every family. A',
  'family that uses only part of core leaves the rest out of its bundle, and can',
  'come in smaller than the shared runtime. No page downloads the shared runtime',
  'on its own.',
  '',
  '| | Raw | Gzip | Brotli |',
  '|---|---|---|---|',
  row('Lit and `@fusion.dev/helix-core`', floor),
  '',
  '## Whole packages',
  '',
  'Each row keeps everything a package exports, so it is the most the package can',
  'cost. `@fusion.dev/helix` and `@fusion.dev/helix-headless` have side effects, so a',
  'barrel import of either costs the whole row. Nothing in this repository imports',
  'either barrel. The per-component tables show what your page pays.',
  '',
  '| Package | Raw | Gzip | Brotli | |',
  '|---|---|---|---|---|',
  ...packages.flatMap((one) => [
    `| \`${one.entry}\` | ${grouped(one.raw)} | ${grouped(one.gzip)} | ${grouped(one.brotli)} | ${one.note} |`,
    ...(one === engineEntry
      ? [
          `| \`${ENGINE_WASM.path.split('/').at(-1)}\` | ${grouped(engineWasm.raw)} | ${grouped(engineWasm.gzip)} | ${grouped(engineWasm.brotli)} | ${ENGINE_WASM.note} |`,
        ]
      : []),
  ]),
  '',
  '## Stylesheets',
  '',
  'You link these files directly, so the sizes are the files as a browser',
  'receives them. `@fusion.dev/helix-styles` ships its stylesheets without comments',
  'and keeps the commented sources in the repository. The shipped files are a',
  'quarter of the size of the sources. The package has no JavaScript, so the table',
  'shows the whole cost of using the base layer on its own.',
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
  `**Most of your first component is the shared runtime.** The median styled family is ${grouped(median(styledGzip))} bytes gzipped alone, and it adds ${grouped(median(styledAdded))} to a page that already has Helix. The shared runtime is ${sharedShare} percent of the first component, and the component itself is ${addedShare} percent. Ten typical components cost the first number once, plus nine of the added number. The two columns in the tables below let you work that out for your own components.`,
  '',
  `Across the ${styled.rows.length} styled components, the smallest is \`${cheapest.family}\` at ${grouped(cheapest.alone.gzip)} bytes gzipped alone, and the largest is \`${dearest.family}\` at ${grouped(dearest.alone.gzip)}. Every family together is ${grouped(wholeStyled.gzip)}.`,
  '',
  `No family imports a barrel. The \`barrels\` rule in \`fusion x workspace\` enforces that. \`@fusion.dev/helix-headless\` marks every module in \`dist\` as having side effects, which is true of a file that calls \`customElements.define\`. A bundler can remove none of it. One \`import { HelixHeadlessButton } from '@fusion.dev/helix-headless'\` costs ${grouped(wholeHeadless.gzip)} bytes gzipped, whatever else the page imports. That is ${barrelMultiple} times the median family above. ${barrelled.size === 0 ? `All ${styled.rows.length} styled families import the headless family they extend directly.` : `${barrelled.size} families still import the barrel.`} The rule checks the shape of the import, so it applies to any package that sets \`sideEffects\`, whatever its name.`,
  '',
  `The headless tier never had the problem, so it serves as the control. \`@fusion.dev/helix-core\` is \`sideEffects: false\`, and the median headless family is ${grouped(median(headlessGzip))} bytes gzipped alone.`,
  '',
  ...comparison(),
  ...coverageSection(),
  ...timing(),
  '## Per component',
  '',
  'Families are in alphabetical order. Sizes are in bytes, so you can check each',
  'number without rounding.',
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
  '## What an install adds to `node_modules`',
  '',
  'These sizes are what an install adds to your disk, which is what an install',
  'budget limits. Each row is the unpacked size of exactly what a package',
  'publishes, as listed in its `files` field. The sizes do not include source',
  'maps. We strip them from the tarball when we pack it, and the Source maps',
  'stripped column shows the bytes we removed.',
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
  'We list these gaps so you know what the numbers above leave out.',
  '',
  '- **No whole-library comparison, and a short list of components.** Adding a component means choosing the matching element in each system by hand, so we add components one at a time.',
  "- **The peer numbers are pinned, so they age.** The comparison shows the date they were measured. Run `turbo run peers` to refresh them. No check fails when they are old. Another library's release changes nothing in this repository, so a check based on the date would fail for no useful reason.",
  '- **No first paint.** The timings above measure single components. First paint depends on the whole page, so the app that renders the page should measure it.',
  "- **No per-component stylesheet bytes.** Each family's CSS is compiled into its JavaScript, so every number above already includes it. `elements.css` is the light-DOM layer, and it is in the stylesheet table.",
  '',
)

const written = `${lines
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trimEnd()}\n`
const output = join(root, OUTPUT)

/**
 * **The landing page's coverage table, and the one size it still quotes.** The
 * page used to lead with four size figures and one button in five systems.
 * Helix's button came first by about one percent, and on the other six
 * components in the size table it ranked from second to last, so the band
 * showed the one row we won. Size is a reason not to rule a system out, and the
 * metrics page keeps the whole table for anybody checking. What the page shows
 * now is what you can build with the package.
 *
 * `ADDED` is the median brotli bytes a styled family adds to a page that
 * already has the runtime, which is the honest size figure for a second
 * component and every one after it.
 */
const claimsSource = [
  '/* Generated from the built packages by `bun run gen:metrics`. Do not edit. */',
  '',
  '/** Styled families in `@fusion.dev/helix`. */',
  `export const COMPONENTS = ${styled.rows.length}`,
  '',
  '/** The median a styled family adds to a page that already has the runtime. */',
  `export const ADDED = '${kb(median(styled.rows.map((row) => row.added.brotli)))}'`,
  '',
  '/** The day `turbo run peers` read the other systems. */',
  `export const MEASURED = '${peers?.measured ?? ''}'`,
  '',
  'export interface CoverageCell {',
  '  /** Whether the system has not committed to the element. */',
  '  experimental: boolean',
  '  /** The element, as the system names it. */',
  '  tag: string',
  '}',
  '',
  'export interface Coverage {',
  '  groups: readonly {',
  '    name: string',
  '    /** One cell per system, in the order of `systems`, or null for none. */',
  '    rows: readonly { cells: readonly (CoverageCell | null)[]; name: string }[]',
  '  }[]',
  '  /** How many jobs the table asks about. */',
  '  rows: number',
  '  /** Helix first. `total` counts the jobs the system has an element for. */',
  '  systems: readonly { name: string; ours: boolean; total: number }[]',
  '}',
  '',
  `export const COVERAGE: Coverage = ${JSON.stringify(coverage, null, 2)}`,
  '',
].join('\n')

const claimsPath = join(root, CLAIMS_OUT)

/* A number that differs by platform and a number that differs because
   somebody edited a component look identical until the lines are seen, which
   `emit` prints; the bundler is the first thing to suspect when only numbers
   moved. */
const hint =
  'Run `bun run gen:metrics`. If the only difference is the numbers, check the bundler ' +
  `first: this run used Bun ${Bun.version}, and the pinned version is the one in \`packageManager\`.`
const stale = [
  emit(claimsPath, claimsSource, { check, hint }),
  emit(output, written, { check, hint }),
].some((one) => one.stale)
if (stale) {
  process.exit(1)
}
/* Only a write leaves one. The check measured what is on disk and found it
   current, which is as good a reason, but a check that writes is the thing
   `verify` is built not to have, even into `.local/`. */
if (!check) {
  mkdirSync(join(root, '.local/metrics'), { recursive: true })
  /* Only the sizes this run used, so the file holds one page's worth. Written
     to a temporary name and renamed, so another run in the same checkout
     reads either the old file or the new one, whole. */
  const memo = `${MEMO}.${process.pid}`
  writeFileSync(
    memo,
    `${JSON.stringify({ engine: ENGINE, sizes: Object.fromEntries([...used].sort(([a], [b]) => (a < b ? -1 : 1))) })}\n`,
  )
  renameSync(memo, MEMO)
  writeFileSync(
    RECEIPT,
    `${JSON.stringify(
      {
        headless: headless.rows.length,
        inputs,
        outputs: Object.fromEntries(
          OUTPUTS.map((path) => [path, digest(readFileSync(join(root, path)))]),
        ),
        styled: styled.rows.length,
      },
      null,
      2,
    )}\n`,
  )
}
console.log(
  `metrics: ${styled.rows.length} styled and ${headless.rows.length} headless families ` +
    (check ? 'measured, current' : `written to ${OUTPUT}`) +
    `; compressed ${tally.compressed} bundles and found ${tally.remembered} in the memo`,
)

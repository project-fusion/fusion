#!/usr/bin/env bun
/**
 * Measures other web-component libraries, and writes `helix/docs/peers.json`.
 *
 * **Separate from `bun run gen:metrics` because this one needs the network.** It
 * writes a throwaway package into `.local`, installs four design systems at
 * pinned versions, and bundles the same components out of each. `.local`
 * is the declared per-machine scratch and is gitignored, so nothing about those
 * installs enters this repository except the numbers.
 *
 * The numbers are committed, which is what lets `check:gen:metrics` run in CI with
 * no registry access. Run `bun run gen:peers` to refresh them, which is a
 * deliberate act with a date on it rather than something that happens on every
 * build.
 *
 * **Helix's own column is not in here, and that is the point.** It is measured
 * by `build-metrics.mjs` from this repository every time the page is generated,
 * so our side of the comparison cannot go stale against our own code. Theirs is
 * pinned and dated, and the page prints both facts.
 *
 * **Like for like, which is why these four.** Every system here ships custom
 * elements built on Lit, so the runtime under the comparison is the same
 * library in every column and the numbers are about the components. React
 * component libraries are excluded for the same reason: comparing a custom
 * element against a React component measures the framework.
 *
 * **Seven components, all of which every system has, except where noted.** A
 * comparison across a system's whole library would be a comparison of how many
 * components each vendor decided to ship, which is the number that looks most
 * like a measurement and means least.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { brotliCompress, constants, gzip } from 'node:zlib'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SCRATCH = join(ROOT, '.local/metrics-peers')
const OUTPUT = join(ROOT, 'helix/docs/peers.json')

/**
 * **When these go stale, and why nothing stops them (192).** The date on the
 * page is the whole answer, and it is deliberate rather than a gap somebody has
 * not got to.
 *
 * A check on the calendar would fire for a reason nobody caused, because nothing
 * in this repository changes when Shoelace releases. A check that installed the
 * latest on every run would put a registry in the middle of `verify`, which
 * makes an offline machine fail a gate about our own bytes. And there is no
 * dependency-bump schedule to hang it on: this repository has no Dependabot and
 * no Renovate, so "do it with the bumps" would be scheduling against a thing
 * that does not exist.
 *
 * So the refresh is a hand command and the page says when it last ran. What a
 * reader needs is not a fresh number, it is knowing how old the one they are
 * reading is, and a date supplies that without pretending to more.
 *
 * The four, pinned exactly.
 *
 * **Seven components, each a thing every one of the four ships**, under a name
 * nobody has to argue about. `radio` and `switch` are both universal; what
 * differs is only spelling, and a naming note is what the table already uses for
 * `dialog` being Carbon's Modal and `tabs` being Shoelace's Tab Group. Carbon
 * calls a radio a Radio Button and a switch a Toggle, which is the same kind of
 * difference.
 *
 * **What was refused, and why, because the refusals are the rule.** Anything
 * charting, anything with a date in it, and `select`, which is a listbox in one
 * system and a combobox in another: comparing those compares our reading of
 * somebody else's library rather than the libraries. `tag` fails too, Material
 * shipping a Chip, and `accordion` fails because Material ships none and
 * Shoelace calls its own Details. See 191.
 *
 * Exact rather than a range, because a caret would silently re-measure on
 * somebody else's machine and the table would say a version it had not read.
 * `version` here is asserted against what the install actually resolved.
 */
const SYSTEMS = [
  {
    dependencies: { '@carbon/web-components': '2.61.0' },
    entries: {
      button: '@carbon/web-components/es/components/button/index.js',
      checkbox: '@carbon/web-components/es/components/checkbox/index.js',
      dialog: '@carbon/web-components/es/components/modal/index.js',
      radio: '@carbon/web-components/es/components/radio-button/index.js',
      switch: '@carbon/web-components/es/components/toggle/index.js',
      tabs: '@carbon/web-components/es/components/tabs/index.js',
      tooltip: '@carbon/web-components/es/components/tooltip/index.js',
    },
    name: 'Carbon',
    note: 'Its dialog is Modal, its radio is Radio Button, and its switch is Toggle.',
    package: '@carbon/web-components',
  },
  {
    dependencies: { '@material/web': '2.5.0' },
    entries: {
      button: '@material/web/button/filled-button.js',
      checkbox: '@material/web/checkbox/checkbox.js',
      dialog: '@material/web/dialog/dialog.js',
      radio: '@material/web/radio/radio.js',
      switch: '@material/web/switch/switch.js',
      tabs: '@material/web/tabs/tabs.js',
    },
    name: 'Material Web',
    note: 'Ships no tooltip. Its button is measured as the filled one, there being no single button element.',
    package: '@material/web',
  },
  {
    dependencies: { '@shoelace-style/shoelace': '2.20.1' },
    entries: {
      button: '@shoelace-style/shoelace/dist/components/button/button.js',
      checkbox: '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js',
      dialog: '@shoelace-style/shoelace/dist/components/dialog/dialog.js',
      radio: '@shoelace-style/shoelace/dist/components/radio/radio.js',
      switch: '@shoelace-style/shoelace/dist/components/switch/switch.js',
      tabs: '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js',
      tooltip: '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js',
    },
    name: 'Shoelace',
    note: 'Its tabs element is Tab Group.',
    package: '@shoelace-style/shoelace',
  },
  {
    dependencies: {
      '@spectrum-web-components/button': '1.12.2',
      '@spectrum-web-components/checkbox': '1.12.2',
      '@spectrum-web-components/dialog': '1.12.2',
      '@spectrum-web-components/radio': '1.12.2',
      '@spectrum-web-components/switch': '1.12.2',
      '@spectrum-web-components/tabs': '1.12.2',
      '@spectrum-web-components/tooltip': '1.12.2',
    },
    entries: {
      button: '@spectrum-web-components/button/sp-button.js',
      checkbox: '@spectrum-web-components/checkbox/sp-checkbox.js',
      dialog: '@spectrum-web-components/dialog/sp-dialog.js',
      radio: '@spectrum-web-components/radio/sp-radio.js',
      switch: '@spectrum-web-components/switch/sp-switch.js',
      tabs: '@spectrum-web-components/tabs/sp-tabs.js',
      tooltip: '@spectrum-web-components/tooltip/sp-tooltip.js',
    },
    name: 'Spectrum',
    note: 'One package per component, so there is no barrel to import by accident.',
    package: '@spectrum-web-components/button',
  },
]

const compressed = { brotli: promisify(brotliCompress), gzip: promisify(gzip) }

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

/* Bundled exactly the way `build-metrics.mjs` bundles a Helix family, because
   two conventions would make the comparison a comparison of conventions. */
const measure = async (name, specifier) => {
  const entry = join(SCRATCH, `${name}.js`)
  writeFileSync(entry, `import '${specifier}'\n`)
  const built = await Bun.build({
    entrypoints: [entry],
    format: 'esm',
    minify: true,
    sourcemap: 'none',
    target: 'browser',
  })
  if (!built.success) {
    console.error(built.logs.join('\n'))
    throw new Error(`Could not bundle ${specifier}`)
  }
  let buffer = Buffer.alloc(0)
  for (const artifact of built.outputs) {
    buffer = Buffer.concat([buffer, Buffer.from(await artifact.arrayBuffer())])
  }
  return await sizes(buffer)
}

mkdirSync(SCRATCH, { recursive: true })

const dependencies = {}
for (const system of SYSTEMS) {
  Object.assign(dependencies, system.dependencies)
}

writeFileSync(
  join(SCRATCH, 'package.json'),
  `${JSON.stringify(
    { dependencies, name: 'helix-metrics-peers', private: true, version: '0.0.0' },
    null,
    2,
  )}\n`,
)

console.log('peers: installing')
execFileSync('bun', ['install'], { cwd: SCRATCH, stdio: 'inherit' })

const measured = []
for (const system of SYSTEMS) {
  const installed = JSON.parse(
    readFileSync(join(SCRATCH, 'node_modules', system.package, 'package.json'), 'utf8'),
  ).version
  const wanted = system.dependencies[system.package]
  if (installed !== wanted) {
    console.error(
      `${system.package} resolved to ${installed} and the pin says ${wanted}. ` +
        'A table that names a version it did not read is worse than no table.',
    )
    process.exit(1)
  }
  const parts = {}
  for (const [part, specifier] of Object.entries(system.entries)) {
    parts[part] = {
      ...(await measure(`${system.name.toLowerCase().replace(/\W/g, '-')}-${part}`, specifier)),
      specifier,
    }
  }
  measured.push({
    name: system.name,
    note: system.note,
    package: system.package,
    parts,
    version: installed,
  })
}

/* The day, not the moment. A timestamp would rewrite this file on every run and
   the diff would say nothing about what changed. */
const measuredOn = new Date().toISOString().slice(0, 10)

writeFileSync(
  OUTPUT,
  `${JSON.stringify({ bun: Bun.version, measured: measuredOn, systems: measured }, null, 2)}\n`,
)

console.log(
  `peers: ${measured.length} systems measured on ${measuredOn}, written to ${OUTPUT.slice(ROOT.length + 1)}`,
)

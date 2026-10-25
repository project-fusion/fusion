#!/usr/bin/env bun
/**
 * Runs the web half of Helix's conformance suite on this machine, in Chromium
 * and in WebKit, and compares what it recorded with what the native half
 * recorded, as CI does across its jobs. Each family runs in the spec bundle
 * that holds its web half, as `tag-group` runs in `tag`.
 *
 *   bun run conformance
 *
 * The root script builds the spec bundles and runs the native half first,
 * which writes `.local/conformance/react-native.json`. This runs the browser
 * specs of the families the scenarios cover in each browser, which write
 * `chromium.json` and `webkit.json` beside it, and then
 * `compare-conformance.mjs` over the records written.
 *
 * **A browser that cannot run here is named, and the comparison goes on
 * without it.** The browser specs serve their bundles on 127.0.0.1 and launch
 * Playwright's browsers, and a sandboxed shell can refuse either. With no
 * browser at all nothing is compared, and the browser jobs in CI run the web
 * half.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { PLATFORM_NAMES, SCENARIOS } from '@fusion.dev/helix-testing/conformance'
import { root, SOURCE } from '@fusion.dev/scripts/workspace'

const out = join(root, '.local/conformance')

/**
 * The spec bundle that holds a family's web half. A bundle is named by its
 * folder in the styled tier, and a scenario by its family in `helix/neutral`,
 * so `tag-group` runs in the `tag` bundle, which holds
 * `tag/group/tag-group-conformance.dom.spec.ts`.
 */
const bundleOf = (family) => {
  const styled = join(root, SOURCE.styled)
  for (const folder of readdirSync(styled, { withFileTypes: true })) {
    if (!folder.isDirectory()) {
      continue
    }
    for (const element of readdirSync(join(styled, folder.name), { withFileTypes: true })) {
      const spec = join(styled, folder.name, element.name, `${family}-conformance.dom.spec.ts`)
      if (element.isDirectory() && existsSync(spec)) {
        return folder.name
      }
    }
  }
  console.error(
    `conformance: no web half for \`${family}\`. Write ${SOURCE.styled}/<folder>/<element>/${family}-conformance.dom.spec.ts.`,
  )
  process.exit(1)
}

const families = [...new Set(Object.keys(SCENARIOS).map(bundleOf))].sort()

/** The browsers that wrote a record, and whether any of their specs failed. */
const ran = []
let failed = false
for (const browser of ['chromium', 'webkit']) {
  const file = join(out, `${browser}.json`)
  rmSync(file, { force: true })
  console.log(`\nconformance: the web half in ${PLATFORM_NAMES[browser]}`)
  const run = spawnSync(
    process.execPath,
    [join(root, 'fusion/scripts/run-browser-specs.mjs'), ...families, '--browser', browser],
    { stdio: 'inherit' },
  )
  if (existsSync(file)) {
    ran.push(browser)
    failed ||= run.status !== 0
  } else {
    console.error(
      `conformance: ${PLATFORM_NAMES[browser]} wrote no record on this machine, so the comparison leaves it out. The output above says why.`,
    )
  }
}

if (ran.length === 0) {
  console.error(
    '\nconformance: the web half cannot run on this machine, so nothing was compared. ' +
      'The browser specs need a local server on 127.0.0.1 and a Playwright browser. ' +
      'CI runs the web half in the browser jobs and compares there.',
  )
  process.exit(1)
}

console.log('')
const compared = spawnSync(
  process.execPath,
  [
    join(root, 'fusion/scripts/compare-conformance.mjs'),
    '--expect',
    [...ran, 'react-native'].join(','),
  ],
  { stdio: 'inherit' },
)
process.exit(compared.status !== 0 || failed ? 1 : 0)

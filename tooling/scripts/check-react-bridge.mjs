#!/usr/bin/env node
/**
 * The key the React bridge reads still exists in the React that is installed.
 *
 * `HelixElement` repairs React's hydration bug by reading the props React
 * stashes on a DOM node, under a key built as `"__reactProps$" + randomKey`.
 * That prefix is a React internal. It has been stable for years and the
 * failure direction is safe, since finding nothing returns the pre-hydration
 * behavior rather than breaking anything.
 *
 * **Safe is not the same as visible.** If a React release renames it, every
 * `onhelix-*` prop goes quietly back to being dead on a server-rendered page,
 * which is precisely the bug the bridge exists to fix and precisely the kind
 * that ships: nothing throws, nothing warns, and the element goes on doing its
 * own job. Nothing else in this repository would go red.
 *
 * So the prefix is asserted against the installed `react-dom`, in both the
 * development and production bundles, and read from `helix-element.ts` rather
 * than written twice. A react-dom bump that renames it fails here, at the point
 * where somebody is already looking at React.
 *
 * It cannot be a spec: `helix/core` has no React dependency and should not gain
 * one to test a string.
 *
 * **It also holds the rules file's measurement to the version it was taken on.**
 * `.claude/rules/helix.md` says "measured in Chrome against 19.2.8" twice, and
 * that is the whole basis for two rules: that a hyphenated `on` prop binds at
 * all, and that binding at dispatch does not double up with React's own
 * listener. Both are claims about one release's internals. React moves, the
 * prose does not, and nothing in `verify` reads a comment: a note is true on a
 * date and goes on reading as true forever. So a react-dom bump fails here until
 * somebody re-runs the probe and moves the date, which is the only thing that
 * makes the note worth trusting.
 *
 * Run with `bun run check:pkg:react-bridge` (also part of `bun run verify`).
 */
import { readFileSync } from 'node:fs'

const ELEMENT = 'helix/core/src/helix-element/helix-element.ts'
const BUNDLES = [
  'node_modules/react-dom/cjs/react-dom-client.development.js',
  'node_modules/react-dom/cjs/react-dom-client.production.js',
]

const source = readFileSync(ELEMENT, 'utf8')
const declared = source.match(/const REACT_PROPS = '([^']+)'/)

if (!declared) {
  console.error(`react-bridge: no REACT_PROPS constant in ${ELEMENT}, so nothing could be checked`)
  process.exit(1)
}

const prefix = declared[1]
const missing = []

for (const path of BUNDLES) {
  let bundle
  try {
    bundle = readFileSync(path, 'utf8')
  } catch {
    console.error(`react-bridge: ${path} is not installed, so nothing could be checked`)
    process.exit(1)
  }
  if (!bundle.includes(prefix)) {
    missing.push(path)
  }
}

if (missing.length > 0) {
  const { version } = JSON.parse(readFileSync('node_modules/react-dom/package.json', 'utf8'))
  console.error(
    `react-bridge: \`${prefix}\` is gone from react-dom ${version} (${missing.join(', ')}).\n\n` +
      '  `bindReactHandler` finds the props React is holding by that prefix, and it is how every\n' +
      '  `onhelix-*` prop survives hydration. Without it they are silently dead again on any\n' +
      '  server-rendered page. Check whether React has fixed facebook/react#35446, in which case\n' +
      '  the bridge can be deleted, or renamed the key, in which case follow it.\n',
  )
  process.exit(1)
}

const { version } = JSON.parse(readFileSync('node_modules/react-dom/package.json', 'utf8'))

/* Every version the rules file claims to have measured against. Read rather than
   written here, so the two cannot drift apart, and a set because the same number
   appears beside both probes. */
const RULES = '.claude/rules/helix.md'
const claimed = new Set(
  [...readFileSync(RULES, 'utf8').matchAll(/[Aa]gainst\s+(?:React\s+)?(\d+\.\d+\.\d+)/g)].map(
    (one) => one[1],
  ),
)
const stale = [...claimed].filter((one) => one !== version)
if (stale.length > 0) {
  console.error(
    `react-bridge: ${RULES} reports measurements against React ${stale.join(', ')}, and react-dom ` +
      `is ${version}.\n\n` +
      '  Two rules rest on those probes: that a hyphenated `on` prop binds at all, and that\n' +
      "  binding at dispatch does not double up with React's own listener. Both are claims about\n" +
      "  one release's internals, and prose does not move when a dependency does.\n\n" +
      '  Re-run the probes on this version and write the new number into the file, or pin React\n' +
      '  back. A measured note is true on a date, and this is the date.\n',
  )
  process.exit(1)
}

console.log(
  `react-bridge: \`${prefix}\` present in react-dom ${version}, both bundles, and the rules file ` +
    'measured against that version',
)

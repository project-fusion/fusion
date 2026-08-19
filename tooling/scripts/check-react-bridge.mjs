#!/usr/bin/env node
/**
 * The key the React bridge reads still exists in the React that is installed.
 *
 * `HelixElement` repairs React's hydration bug by reading the props React
 * stashes on a DOM node, under a key built as `"__reactProps$" + randomKey`.
 * That prefix is a React internal. It has been stable for years and the
 * failure direction is safe, since finding nothing returns the pre-hydration
 * behaviour rather than breaking anything.
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
 * Run with `bun run check:react-bridge` (also part of `bun run verify`).
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
console.log(`react-bridge: \`${prefix}\` present in react-dom ${version}, both bundles`)

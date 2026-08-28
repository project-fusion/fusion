#!/usr/bin/env node
/**
 * The specs document never registers the component library a second time.
 *
 * The spec runner imports a bundle per family from `public/specs`, and each of
 * those carries the family it tests. It has to: `run-browser-specs.mjs` runs the
 * same bundles against a blank page in CI, where nothing else registers
 * anything. So in the sandbox's iframe, anything that registers the library
 * again is a second copy, and `customElement` in `helix/core` warns once per tag
 * saying so. `spec-frame.tsx` states the intent in as many words, that it
 * imports no components "because loading every component would be loading 92
 * families to test one", and a root layout sits above that intent: a child route
 * cannot un-render a parent's component.
 *
 * **Two mechanisms satisfy this and the check accepts either**, which is the
 * point of writing it as an invariant rather than as a test of today's code. A
 * path guard in the registrar is what holds it now. A root layout of its own for
 * the tool routes is the structural version, and Next supports one per top-level
 * route group; it moves every route in the app into a group, so it is not a
 * change to make while another branch is holding thirty files open in the same
 * directory. Either way the assertion is the same, and this check is what lets
 * the second one land without anybody having to remember why the first existed.
 *
 * **What it is really guarding is the string.** The guard compares
 * `window.location.pathname` against a literal, and the route is a directory on
 * disk: move the specs page and the literal goes on matching nothing, the
 * registration silently resumes, and what a reader sees is a console warning on
 * one route in one iframe. So the route is derived from where `spec-frame.tsx`
 * actually sits, with route groups stripped the way Next strips them, and
 * compared to the literal. Nothing else in the repository holds those two
 * together.
 *
 * **And it refuses a static import of the library in the registrar**, which is
 * the edit this file most expects to see. The comment there now says a
 * module-scope import is safe *for hydration*, which is true and was measured,
 * and which reads as an invitation to simplify the effect away. It is not safe
 * for this: an import at module scope runs on every route including the one
 * below, and no guard inside a hook can reach it.
 *
 * Run with `bun run check:spec:specs-isolated`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const app = join(root, 'fusion/site/app')
const registrar = join(root, 'fusion/site/components/helix-elements/helix-elements.tsx')

const walk = (dir) => {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(path))
    } else {
      out.push(path)
    }
  }
  return out
}

const files = new Set(walk(app))

/* Anchored on the frame component rather than on a written-down path, so moving
   the route moves the check with it. That is the whole failure this exists for. */
const frame = [...files].find((file) => file.endsWith(`${sep}spec-frame.tsx`))
if (!frame) {
  console.error(
    'specs-isolated: no `spec-frame.tsx` under `fusion/site/app`.\n\n' +
      '  This check finds the specs document by that file. If the frame was renamed, rename it\n' +
      '  here too; if the specs route is gone, so is this check.\n',
  )
  process.exit(1)
}

/* Route groups are parentheses and contribute no URL segment, which is exactly
   why the literal cannot be read off the directory path by eye. */
const route = `/${relative(app, dirname(frame))
  .split(sep)
  .filter((segment) => !segment.startsWith('('))
  .join('/')}`

const ancestors = []
let cursor = dirname(frame)
while (true) {
  const layout = join(cursor, 'layout.tsx')
  if (files.has(layout)) {
    ancestors.push(layout)
  }
  if (cursor === app) {
    break
  }
  cursor = dirname(cursor)
}

const registering = ancestors.filter((layout) =>
  /<HelixElements\b/.test(readFileSync(layout, 'utf8')),
)
const source = readFileSync(registrar, 'utf8')

/* A static import outranks every guard below it, so this is checked whichever
   mechanism is in force. */
if (/^import\s[^\n]*['"]@fusion\.dev\/(?:helix-sandbox\/specs|helix)['"]/m.test(source)) {
  console.error(
    `specs-isolated: ${relative(root, registrar)} imports the library at module scope.\n\n` +
      '  That runs on every route, including the specs document, and no guard inside a hook\n' +
      '  can reach it. The elements are registered a second time in the sandbox iframe and the\n' +
      '  library warns once per tag that the page holds two copies of Helix.\n\n' +
      '  The dynamic `import()` inside the effect is what makes the guard reachable. A\n' +
      '  module-scope import is safe for hydration now, which is what invites this edit, and\n' +
      '  it is a different question from this one.\n',
  )
  process.exit(1)
}

if (registering.length === 0) {
  console.log(
    `specs-isolated: no layout above ${route} renders the registrar, so the specs document ` +
      'cannot register the library. Held structurally, and the path guard is no longer what holds it',
  )
  process.exit(0)
}

const guarded = source.includes(`'${route}'`) || source.includes(`"${route}"`)

if (!guarded) {
  const layouts = registering.map((layout) => `    ${relative(root, layout)}`).join('\n')
  console.error(
    `specs-isolated: ${route} inherits the registrar and nothing keeps the library out of it.\n\n` +
      `  Rendered by:\n${layouts}\n\n` +
      `  ${relative(root, registrar)} names no such path, so every element registers a second\n` +
      "  time inside the spec runner's iframe, where the family bundles have already registered\n" +
      '  the one family under test. The library warns per tag that the page holds two copies of\n' +
      '  Helix, and it is right.\n\n' +
      `  Either guard on ${route} in the registrar, or give the tool routes a root layout of\n` +
      '  their own that does not render it. This check accepts both.\n',
  )
  process.exit(1)
}

if (!source.includes('window.location.pathname')) {
  console.error(
    `specs-isolated: ${relative(root, registrar)} names ${route} but never reads the pathname.\n\n` +
      '  The literal is only a guard if something compares it to where the page actually is.\n',
  )
  process.exit(1)
}

console.log(
  `specs-isolated: ${route} inherits ${registering.length === 1 ? 'a layout' : `${registering.length} layouts`} ` +
    `that render${registering.length === 1 ? 's' : ''} the registrar, and the registrar refuses that path ` +
    'and imports the library only inside the effect',
)

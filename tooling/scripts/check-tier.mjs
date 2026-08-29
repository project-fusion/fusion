#!/usr/bin/env node
/**
 * Holds every styled component that renders a child to the styled tier.
 *
 * **`tag()` composes a child's tag name from a static, and a static is
 * inherited.** `HelixElement` declares `tier = 'helix-headless-'`; each styled
 * class overrides it with `helix-`, and `this.tag('tooltip')` is then
 * `helix-tooltip` rather than `helix-headless-tooltip`. A styled class that
 * forgets the override inherits the headless prefix from the class it extends
 * and renders headless children into its own shadow root.
 *
 * **Which fails silently, and that is the reason this exists.** The child is
 * the right element with the right behavior and no stylesheet, so it works: it
 * opens, it closes, it announces itself, and it is drawn by the browser's own
 * defaults. Three chart tiers shipped this way. The bar chart's reading bubble
 * came out with a 1.5px white border, square corners, `0.25em` of padding and
 * the page's font size, sitting under a UA `margin: auto` that centered it in
 * the viewport, and it read as a positioning bug for long enough to be
 * "fixed" twice at the wrong layer.
 *
 * Nothing else catches it. The manifests describe what a component renders and
 * not which tier it renders it from; the specs mount the styled tag and assert
 * behavior, which is exactly the half that still works.
 *
 * **Asked of the headless source and answered by the styled one**, because the
 * call and the override live in different files. `this.tag()` is written in the
 * headless class; the styled class inherits the method and has only to declare
 * the prefix it should compose with. Keying on the styled file finds nothing at
 * all, which is a check that passes by looking in the wrong place.
 *
 * A headless component with no styled twin is skipped: there is no second tier
 * to disagree with.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOURCE, TAG_PREFIX } from './lib/workspace.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const HEADLESS = join(ROOT, SOURCE.headless)
const STYLED = join(ROOT, SOURCE.styled)

/** Every `*.ts` under a directory, minus the specs and the generated sheets. */
const sources = (dir) => {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...sources(path))
    } else if (
      entry.name.endsWith('.ts') &&
      !entry.name.includes('.spec.') &&
      !entry.name.endsWith('.css.ts')
    ) {
      out.push(path)
    }
  }
  return out
}

const problems = []
let checked = 0

for (const file of sources(HEADLESS)) {
  if (!readFileSync(file, 'utf8').includes('this.tag(')) {
    continue
  }
  const twin = join(STYLED, relative(HEADLESS, file))
  if (!existsSync(twin)) {
    continue
  }
  checked += 1
  if (
    !new RegExp(`static\\s+override\\s+tier\\s*=\\s*'${TAG_PREFIX}'`).test(
      readFileSync(twin, 'utf8'),
    )
  ) {
    problems.push(relative(ROOT, twin))
  }
}

if (problems.length > 0) {
  console.error(
    'tier: these styled components inherit a `this.tag()` call and do not override `tier`,\n' +
      'so they render headless children into their own shadow root. Add\n' +
      `  static override tier = '${TAG_PREFIX}'\n` +
      'to each class:\n' +
      problems.map((one) => `  ${one}`).join('\n'),
  )
  process.exit(1)
}

console.log(
  `tier: ${checked} styled components inherit a \`tag()\` call and all declare the styled prefix`,
)

#!/usr/bin/env node
/**
 * Holds a surface's two separation mechanisms to each other.
 *
 * **A surface is told apart from what is behind it by exactly one of four
 * things: a fill, an edge, a lift, or space.** A design language leads with one
 * of them, and until #141 this library could express none: of 68 border
 * declarations reaching for `--helix-color-border`, eight put the *colour*
 * behind a hook and none put the width behind one, so a border could be
 * recoloured and never removed. The floating surfaces wrote `border: none`
 * outright, so one could never be added either.
 *
 * The policy tokens are `--helix-border-surface` and `--helix-shadow-surface`
 * for a surface in the flow, and `--helix-border-floating` and
 * `--helix-shadow-floating` for one over content.
 *
 * **What this checks is that a surface can be themed in both directions**, not
 * that it names both policy tokens, and the difference is the whole of the
 * first version's mistake. Megamenu and Tour carry a border *and* a lift on
 * purpose, so their widths default to `--helix-border-thin` rather than to the
 * floating policy, which is 0 and would have deleted an edge they have today.
 * They are themeable through `--megamenu-border-width` and
 * `--tour-border-width` and are not half-converted. What matters is that the
 * width is behind *a* hook, not which default sits inside it.
 *
 * **A half-converted surface is the failure worth catching**, because it reads
 * as done. A menu that hooks its shadow and hardcodes `border: none` themes
 * perfectly for anybody going shadow-first and cannot be made border-first at
 * all, and nothing about the file says so.
 *
 * **What this deliberately does not check is which rules should be surfaces**,
 * and that is the part a script cannot do. The audit that produced these tokens
 * found 31 elevation declarations of which 13 were not surfaces at all: a FAB
 * and its items, a switch thumb, a raised icon button, a selected chip, a
 * carousel's overlaid controls, a colour picker's handle, and four slider rings
 * drawn as shadows. Every one is a control drawing itself rather than a surface
 * separating from a ground, and a policy that flattened them would be a bug
 * wearing a theme. The classification is a judgement, so it lives in the audit
 * and in `docs/22-theming.md` rather than in a regexp here.
 *
 * Run with `bun run check:separation` (also part of `bun run verify`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SOURCE = join(ROOT, 'helix/web/src')

const PAIRS = [
  { edge: '--helix-border-floating', kind: 'floating', lift: '--helix-shadow-floating' },
  { edge: '--helix-border-surface', kind: 'in-flow', lift: '--helix-shadow-surface' },
]

const sheets = []
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      walk(path)
    } else if (entry.endsWith('.css')) {
      sheets.push(path)
    }
  }
}
walk(SOURCE)

/* Comments carry these names too: every converted stylesheet explains the
   policy above the rule, and a scan that does not blank them reports the
   documentation as a half-converted surface. The same trap `check:composed`,
   `check:seams` and `check:grounds` each record hitting. */
const uncommented = (source) => source.replace(/\/\*[\s\S]*?\*\//g, ' ')

const problems = []
let surfaces = 0

for (const path of sheets) {
  const source = uncommented(readFileSync(path, 'utf8'))
  const file = relative(ROOT, path)

  for (const rule of source.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const body = rule[2]
    for (const { edge, kind, lift } of PAIRS) {
      const hasEdge = body.includes(edge)
      const hasLift = body.includes(lift)
      if (!hasEdge && !hasLift) {
        continue
      }
      /* A width behind any hook is themeable, whatever the default inside it. */
      const edgeHooked = hasEdge || /border:\s*var\(--[a-z-]+-border-width,/.test(body)
      const liftHooked = hasLift || /box-shadow:\s*var\(--[a-z-]+-shadow,/.test(body)
      if (edgeHooked && liftHooked) {
        surfaces += 1
        continue
      }
      const selector = rule[1].split('\n').pop().trim().slice(0, 60)
      const missing = edgeHooked ? 'a lift' : 'an edge'
      problems.push(
        `${file}: \`${selector}\` is a ${kind} surface and ${missing} is hardcoded. ` +
          'A surface that hooks one mechanism and fixes the other themes perfectly ' +
          'in one direction and not at all in the other, and nothing in the file ' +
          `says so. Put it behind a hook defaulting to \`${edgeHooked ? lift : edge}\`.`,
      )
    }
  }
}

if (problems.length > 0) {
  console.error(`Separation half-converted (${problems.length}):\n\n  ${problems.join('\n\n  ')}\n`)
  process.exit(1)
}

console.log(`separation: ${surfaces} surfaces, every one hooking both its edge and its lift`)

#!/usr/bin/env node
/**
 * Holds the two tiers to one answer about what a family is for.
 *
 * `@category` is written twice, once on the headless root and once on the styled
 * one, and only the styled tier's copy reaches the catalog: `catalog.ts` reads
 * the root element's, and the reference pages and the components index group on
 * what it found. So the headless copy is documentation that nothing renders and
 * nothing contradicts, which is the shape a value drifts in.
 *
 * **It had drifted, and the split is what exposed it.** When `charts` came out
 * of `content` on 23 Aug 2026 only `helix/styled` moved. `bar-chart`, `donut-chart`,
 * `line-chart`, `sparkline`, `trend` and `legend` went on saying `content` in
 * `helix/headless` for a day, and nothing failed, because `content` was still a
 * legal word. A vocabulary check cannot catch a stale value that is spelled
 * correctly; only the other tier can.
 *
 * Measured when `content` was retired on 24 Aug: 25 of the 88 families disagreed,
 * every one of them a headless root still holding the drawer the styled root had
 * already left.
 *
 * **Why a check rather than one declaration.** The obvious fix is to write the
 * category once and have the styled tier inherit it, and there is nowhere to put
 * it: these are JSDoc tags on two classes in two packages, read by an analyzer
 * that sees one file at a time. A tag that only exists on one tier would leave
 * the headless manifest unable to say what its own components are for. Two
 * declarations that are checked against each other is the honest shape.
 *
 * Run with `bun run check:api:categories` (also part of `bun run verify`).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { SOURCE } from './lib/workspace.mjs'

const TIERS = { headless: SOURCE.headless, styled: SOURCE.styled }
const CATEGORY = /@category ([a-z-]+)/

/** The category on a family's root element, or null where there is no root. */
const rootCategory = (base, family) => {
  const dir = join(base, family, 'root')
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return null
  }
  for (const entry of entries) {
    if (!entry.endsWith('-root.ts') || entry.endsWith('.spec.ts')) {
      continue
    }
    const found = CATEGORY.exec(readFileSync(join(dir, entry), 'utf8'))
    if (found) {
      return found[1]
    }
  }
  return null
}

const families = readdirSync(TIERS.headless).filter((name) =>
  statSync(join(TIERS.headless, name)).isDirectory(),
)

const problems = []
let agreed = 0

for (const family of families) {
  const headless = rootCategory(TIERS.headless, family)
  const styled = rootCategory(TIERS.styled, family)
  /* A family present on one tier only is not this check's business: the tiers
     are deliberately not a mirror, and `check:css:pairings` and `check:api:seams` are
     where that question already lives. */
  if (headless === null || styled === null) {
    continue
  }
  if (headless === styled) {
    agreed += 1
    continue
  }
  problems.push(
    `${family}: headless says \`${headless}\` and web says \`${styled}\`. Only the styled tier's ` +
      'copy reaches the catalog, so the components index is already showing one of these and the ' +
      'other is a value nobody reads. Move both.',
  )
}

if (problems.length > 0) {
  console.error(
    `Families whose tiers disagree about their category (${problems.length}):\n\n  ${problems.join(
      '\n\n  ',
    )}\n`,
  )
  process.exit(1)
}

console.log(`categories: ${agreed} families, both tiers naming the same one`)

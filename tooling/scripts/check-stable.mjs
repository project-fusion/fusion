#!/usr/bin/env node
/**
 * Holds `@status stable` to what stable has to mean.
 *
 * **A status is a promise to a consumer, and a promise nothing checks is a
 * word somebody typed.** `stable` says an API will not change under you, which
 * is the single most consequential thing this library says about itself: it is
 * what decides whether somebody builds on a component or waits.
 *
 * So it is earned rather than declared. Three conditions, all mechanical,
 * because a mechanical bar is one that cannot quietly slip:
 *
 * 1. **Every part of the family has both specs.** A `*.dom.spec.ts` proves it
 *    behaves after hydration and a `*.ssr.spec.ts` proves the server output
 *    carries the right state. The second is the one that catches a promise
 *    broken at first paint, and it is the one that goes missing.
 * 2. **Both tiers agree.** A headless class marked stable whose styled subclass
 *    is experimental is two answers to one question, and the reference page
 *    picks by tier, so a reader sees whichever one their import gives them.
 * 3. **It has at least one example.** A component nobody has written a usage
 *    for is one whose API has been read and not used, which is not the same as
 *    settled.
 *
 * What it deliberately does not check is whether the component is any good.
 * That is the judgment in the queue row, and it belongs to a person: the ten
 * that went stable first are the ones an audit read end to end and found
 * nothing substantive in, and no script would have known that.
 *
 * Run with `bun run check:stable` (also part of `bun run verify`).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Every family folder in a tier, by the same test `check:examples` uses. */
const families = (tier) =>
  readdirSync(tier, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(tier, entry.name, 'index.ts')))
    .map((entry) => entry.name)

/** The part folders of a family, which are its directories minus `.examples`. */
const parts = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)

/** Whether any source file in a folder declares the given status. */
const declares = (dir, status) => {
  if (!existsSync(dir)) {
    return false
  }
  const walk = (from) =>
    readdirSync(from, { withFileTypes: true }).flatMap((entry) => {
      const path = join(from, entry.name)
      if (entry.isDirectory()) {
        return entry.name.startsWith('.') ? [] : walk(path)
      }
      return entry.name.endsWith('.ts') && !entry.name.includes('.spec.') ? [path] : []
    })
  return walk(dir).some((file) => readFileSync(file, 'utf8').includes(`@status ${status}`))
}

const problems = []
let stable = 0

for (const family of families('helix/styled/src')) {
  const web = join('helix/styled/src', family)
  const headless = join('helix/headless/src', family)
  if (!declares(web, 'stable') && !declares(headless, 'stable')) {
    continue
  }
  stable += 1

  if (declares(web, 'experimental') || declares(headless, 'experimental')) {
    problems.push(
      `${family}: one tier says stable and the other says experimental. The reference page picks ` +
        'by tier, so a reader sees whichever their import gave them.',
    )
  }

  for (const part of parts(web)) {
    /* Both tiers, because a part's specs are split across them now. The
       functional ones moved to `headless`, which is where the behavior is, and
       what stays in `web` is what asserts presentation. A part is covered when
       the pair exists somewhere, not when it exists here: reading only `web`
       reported eleven stable families as untested the day the specs moved, and
       every one of them had gained coverage rather than lost it. */
    const dirs = [join(web, part), join(headless, part)].filter((one) => existsSync(one))
    const files = dirs.flatMap((one) => readdirSync(one))
    if (!files.some((one) => one.endsWith('.dom.spec.ts'))) {
      problems.push(`${family}/${part}: stable with no \`*.dom.spec.ts\` in either tier.`)
    }
    if (!files.some((one) => one.endsWith('.ssr.spec.ts'))) {
      problems.push(
        `${family}/${part}: stable with no \`*.ssr.spec.ts\` in either tier. A DOM spec runs ` +
          'after hydration, when a promise broken at first paint already looks kept.',
      )
    }
  }

  const examples = join(web, '.examples')
  if (
    !existsSync(examples) ||
    readdirSync(examples).filter((one) => one.endsWith('.html')).length === 0
  ) {
    problems.push(
      `${family}: stable with no example. An API that has been read and not used is not settled.`,
    )
  }
}

if (problems.length > 0) {
  console.error(
    `Components claiming stable without earning it (${problems.length}):\n\n  ${problems.join('\n  ')}\n`,
  )
  process.exit(1)
}

console.log(
  `stable: ${stable} families are stable, every one with both specs on every part and an example`,
)

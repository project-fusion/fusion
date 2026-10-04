/**
 * Everything a consumer gets wrong in Helix is valid CSS.
 *
 * It compiles, it ships, it produces no error, and it is detectable only against
 * the manifest. A `::part()` naming a part nothing publishes styles nothing. A
 * hook named for the wrong family inherits into the subtree and does nothing
 * where it was written. Two copies of the library on one page make `instanceof`
 * quietly false. None of it warns.
 *
 * The library's own repository found six classes of this in one week, written by
 * the people who wrote the library, and the one that mattered most passed every
 * one of sixty checks: a part rendering visibly with no rule, black on the
 * headless tier, caught four days late by a screenshot. A third party gets none
 * of those checks. This is what they get instead.
 *
 * ```ts
 * import { diagnose, report } from '@fusion.dev/helix-diagnostics'
 * import styled from '@fusion.dev/helix/custom-elements.json'
 *
 * report(diagnose({ tiers: [{ manifest: styled, name: '@fusion.dev/helix' }] }))
 * ```
 *
 * **Nothing here sends anything.** `diagnose` returns a report and `report`
 * prints it. Where else a report goes is a sink's decision, and every sink
 * that leaves the page is one the caller adds.
 *
 * **Development only.** Import it from a dev-only entry: it walks every
 * stylesheet in the page and has no business in a production bundle.
 */
export { collect } from './collect.js'
export { report } from './console.js'
export type { ManifestSource, Published, Tier } from './manifest.js'
export { index, nearest } from './manifest.js'
export type {
  Coverage,
  Finding,
  Kind,
  Layer,
  Origin,
  Report,
  Severity,
  Unreadable,
  Usage,
} from './report.js'
export { KINDS } from './report.js'
export { type Override, type Rules, SHIPPED_RULES } from './rules.js'
export { type Watcher, watch } from './usage.js'

import { analyze, registrations, skew } from './analyze.js'
import { collect } from './collect.js'
import type { Tier } from './manifest.js'
import { index } from './manifest.js'
import type { Report } from './report.js'
import { applyRules, checkRules, type Rules } from './rules.js'
import { listed, styled, type Watcher, walk } from './usage.js'

/** What to look at, and what to compare it against. */
export interface Options {
  /**
   * `duplicateRegistrations` from `@fusion.dev/helix-core`, when it is installed.
   *
   * **Passed in rather than imported**, so this package does not depend on the
   * library it diagnoses. A diagnostics release would otherwise have to follow
   * every core release, and a consumer on an older core could not run a newer
   * collector at all. Omitted, the duplicate check falls back to comparing a
   * live element against its own registered class, which finds the same fault
   * from outside and cannot name the losing class.
   */
  duplicates?: () => string[]
  /**
   * The project's own overrides, parsed from its file. The build reads the
   * file, since the page cannot: import the JSON and pass it here.
   */
  file?: Rules | undefined
  /**
   * The document to scan. Defaults to the ambient one.
   *
   * Present so a test can hand over a constructed document, and so a page with
   * an iframe it owns can scan that too.
   */
  from?: Document
  /**
   * Overrides for this run, which win over `file`. Each says a severity,
   * `off`, or either for some tags only:
   *
   * ```ts
   * diagnose({ tiers, rules: { 'unforwarded-part': 'off', 'dead-hook': { severity: 'warn', tags: ['helix-card'] } } })
   * ```
   */
  rules?: Rules | undefined
  /**
   * The manifests to check against, one per installed tier.
   *
   * **Pass both tiers when both are installed.** A part `@fusion.dev/helix-headless`
   * publishes and `@fusion.dev/helix` never forwarded is a real fault and is
   * invisible to either manifest alone.
   */
  tiers: Tier[]
  /**
   * A watcher from `watch()`, so usage counts every element that rendered
   * since it began. Without one, usage counts the elements in the page now.
   */
  watcher?: Watcher | undefined
}

/**
 * One pass over the page.
 *
 * **It returns coverage and findings together and offers no way to have one
 * without the other.** A collector that cannot read cross-origin sheets reports
 * the same empty array whether it read everything or nothing. An empty
 * `findings` is only meaningful beside the `coverage` that says what was looked
 * at.
 *
 * Cheap enough to call on a route change. There is no observer and no polling
 * loop: sheets that arrive later are found by calling it again.
 *
 * **A manifest from another version is refused**, with one finding that says
 * so in place of every other: see `skew`.
 */
export const diagnose = ({ duplicates, file, from, rules, tiers, watcher }: Options): Report => {
  if (tiers.length === 0) {
    throw new Error(
      'diagnose() needs at least one manifest. Without one every part name is unknown and every finding would be noise.',
    )
  }
  checkRules(file, 'file')
  checkRules(rules, 'argument')
  const document_ = from ?? globalThis.document
  const { answered, coverage, rules: located } = collect(document_)
  const tags = index(tiers)
  /* **Refused on a manifest from another version**, unless the project
     turned that finding off, in which case it is judged as usual: a report
     that lost every finding to a check nobody wanted would read as a clean
     page, which is the silent pass this package exists to prevent. */
  const skewed = applyRules(skew(tags, document_), file, rules)
  const judged =
    skewed.findings.length > 0
      ? { findings: [], silenced: { argument: 0, file: 0 } }
      : applyRules(
          [...analyze(located, tags, document_, answered), ...registrations(document_, duplicates)],
          file,
          rules,
        )
  return {
    coverage,
    findings: [...skewed.findings, ...judged.findings],
    silenced: {
      argument: skewed.silenced.argument + judged.silenced.argument,
      file: skewed.silenced.file + judged.silenced.file,
    },
    usage: {
      ...listed(watcher ? watcher.counts() : walk(document_), tags),
      ...styled(located, tags, answered),
      counted: watcher ? 'watched' : 'walked',
    },
  }
}

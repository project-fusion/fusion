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
 * **Zero network calls, at this layer, ever.** The privacy policy this project
 * published says the site sends nothing, and a diagnostics package that phones
 * home from a consumer's page would make us the third party we told our own
 * readers we were not. Findings go where the caller puts them.
 *
 * **Development only.** Import it from a dev-only entry: it walks every
 * stylesheet in the page and has no business in a production bundle.
 */
export { collect } from './collect.js'
export { report } from './console.js'
export type { ManifestSource, Published, Tier } from './manifest.js'
export { index, nearest } from './manifest.js'
export type { Coverage, Finding, Origin, Report, Unreadable } from './report.js'

import { analyze, registrations } from './analyze.js'
import { collect } from './collect.js'
import type { Tier } from './manifest.js'
import { index } from './manifest.js'
import type { Report } from './report.js'

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
   * The document to scan. Defaults to the ambient one.
   *
   * Present so a test can hand over a constructed document, and so a page with
   * an iframe it owns can scan that too.
   */
  from?: Document
  /**
   * The manifests to check against, one per installed tier.
   *
   * **Pass both tiers when both are installed.** A part `@fusion.dev/helix-headless`
   * publishes and `@fusion.dev/helix` never forwarded is a real fault and is
   * invisible to either manifest alone.
   */
  tiers: Tier[]
}

/**
 * One pass over the page.
 *
 * **It returns coverage and findings together and offers no way to have one
 * without the other.** A collector that cannot read cross-origin sheets reports
 * the same empty array whether it read everything or nothing, and this
 * repository has already shipped one check that was structurally incapable of
 * failing and green for weeks because of it. An empty `findings` is only
 * meaningful beside the `coverage` that says what was looked at.
 *
 * Cheap enough to call on a route change. There is no observer and no polling
 * loop: sheets that arrive later are found by calling it again.
 */
export const diagnose = ({ duplicates, from, tiers }: Options): Report => {
  if (tiers.length === 0) {
    throw new Error(
      'diagnose() needs at least one manifest. Without one every part name is unknown and every finding would be noise.',
    )
  }
  const document_ = from ?? globalThis.document
  const { answered, coverage, rules } = collect(document_)
  const tags = index(tiers)
  return {
    coverage,
    findings: [
      ...analyze(rules, tags, document_, answered),
      ...registrations(document_, duplicates),
    ],
  }
}

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
export { type Config, DEFAULTS, pagePattern } from './config.js'
export { report } from './console.js'
export { diagnose, type Options } from './diagnose.js'
export { fingerprintOf, normalize } from './identity.js'
export { type Diagnostics, INSTANCE, type InitOptions, initDiagnostics } from './init.js'
export type { LintData, LintTag, ManifestSource, Published, Tier } from './manifest.js'
export { index, lintOf, nearest } from './manifest.js'
export type {
  Category,
  Configuration,
  Coverage,
  Environment,
  Finding,
  FindingCategory,
  Kind,
  Layer,
  Origin,
  Owner,
  Report,
  Severity,
  Unreadable,
  Usage,
  Weight,
} from './report.js'
export { CATEGORIES, KINDS } from './report.js'
export { type Override, type Rules, SHIPPED_RULES } from './rules.js'
export { TIMING, type Timing } from './schedule.js'
export { type Watcher, watch } from './usage.js'
export { VERSION } from './version.js'

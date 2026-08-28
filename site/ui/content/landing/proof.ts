/**
 * The measured claims, for the front of the site.
 *
 * **The claims are generated now; the comparison below is still by hand.**
 * `CLAIMS` came from this file until the copy drifted, and is emitted by
 * `bun run metrics` into `claims.generated.ts`. `BUTTON` has not moved yet: it
 * needs the peer numbers, which come from `bun run metrics:peers` and a set of
 * libraries installed into `.local`, so it is the same defect one step further
 * from the generator that could fix it.
 *
 * Brotli throughout. Gzip is the honest floor and brotli is what a CDN actually
 * serves, and quoting the larger of the two to look conservative would be
 * quoting a number no reader receives.
 */

/**
 * The measured claims, re-exported from what the build wrote.
 *
 * **They were copied by hand and the copy went stale, exactly as the note here
 * predicted.** The component count read 92 while the build measured 93, printed
 * under a heading that says every number on the page was produced rather than
 * written, and the token layer had moved from 1.9 kB to 2.0. Both were found by
 * comparing the page against `bun run metrics` rather than by anybody noticing.
 *
 * `build-metrics.mjs` emits `claims.generated.ts` beside the MDX now and
 * `check:metrics` judges it, so the front of the site quotes the same run as
 * the docs. Re-exported rather than imported at each call site, so nothing
 * downstream had to change.
 */
export { CLAIMS, type Claim } from './claims.generated'

/**
 * The same button, built five ways.
 *
 * **Named systems rather than "other libraries".** A comparison that will not
 * say who it is against is a claim about nobody, and every one of these is
 * measured by the same script on the same day under the same compression.
 *
 * Button, because it is the one component every system in the row has and the
 * one a reader can hold in their head. The full table is on the metrics page.
 */
export interface Rival {
  /** Brotli bytes for one button, runtime included. */
  brotli: number
  name: string
  /** Ours, and said so rather than left to the reader to spot. */
  ours?: boolean
}

export const BUTTON: readonly Rival[] = [
  { brotli: 9977, name: 'Helix', ours: true },
  { brotli: 12591, name: 'Material Web' },
  { brotli: 15805, name: 'Shoelace' },
  { brotli: 17685, name: 'Carbon' },
  { brotli: 18674, name: 'Spectrum' },
]

/** Where the whole table lives, with the method above it. */
export const METRICS_HREF = '/helix/docs/metrics'

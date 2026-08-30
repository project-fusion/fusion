/*
 * The measured claims, for the front of the site.
 *
 * **`CLAIMS` is generated; the comparison below is still by hand.** `bun run
 * gen:metrics` emits `claims.generated.ts`. `BUTTON` has not moved yet: it needs
 * the peer numbers, which come from `turbo run peers` and a set of libraries
 * installed into `.local`, so it is the same defect one step further from the
 * generator that could fix it.
 *
 * Brotli throughout. Gzip is the honest floor and brotli is what a CDN actually
 * serves, and quoting the larger of the two to look conservative would be
 * quoting a number no reader receives.
 */

/**
 * The measured claims, re-exported from what the build wrote.
 *
 * **Never copy these by hand.** Copied, they drift: 92 components printed
 * against 93 measured, and a token layer quoted at 1.9 kB after it had moved to
 * 2.0, both under a heading saying every number on the page was produced rather
 * than written.
 *
 * `build-metrics.mjs` emits `claims.generated.ts` beside the MDX and
 * `check:gen:metrics` judges it, so the front of the site quotes the same run as
 * the docs. Re-exported rather than imported at each call site, so nothing
 * downstream has to change.
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

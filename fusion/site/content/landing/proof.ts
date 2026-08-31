/*
 * The measured claims, for the front of the site.
 *
 * **Both are generated now.** `bun run gen:metrics` emits `claims.generated.ts`
 * and `BUTTON` moved into it: ours is measured from this repository on every
 * run, and the rivals come from `helix/docs/peers.json`, which `turbo run peers`
 * writes and which is committed, so the check needs no network. Refreshing the
 * rivals stays a deliberate act with a date on it, which is what 192 asked for;
 * only the copying stopped being one.
 *
 * The copy had already drifted. Helix's button was written here as 9,977 brotli
 * bytes and measured at 10,187, so the one table on this page comparing us with
 * anyone else was flattering us by 210 bytes that nothing produced.
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
 *
 * **`BUTTON` is the same button, built five ways**, and it comes from the same
 * file for the same reason. Named systems rather than "other libraries",
 * because a comparison that will not say who it is against is a claim about
 * nobody, and every one of these is measured by one script on one day under one
 * compression. Button, because it is the one component every system in the row
 * has and the one a reader can hold in their head. The full table is on the
 * metrics page.
 */
export { BUTTON, CLAIMS, type Claim, type Rival } from './claims.generated'

/** Where the whole table lives, with the method above it. */
export const METRICS_HREF = '/helix/docs/metrics'

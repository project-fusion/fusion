/*
 * What the landing page says about the package's coverage.
 *
 * **Coverage, where package size was.** The band used to lead with four size
 * figures and one button built five ways. Helix's button was smallest by about
 * one percent, and across the seven components in the size table it ranked
 * from first to last, so the band printed the one row we won and said nothing
 * about why the others were larger. The reason is what the package does, so
 * the band shows that, and the size table stays on the metrics page for
 * anybody checking it.
 *
 * **Every figure is generated.** `bun run gen:metrics` writes
 * `claims.generated.ts`: the component count and the size a component adds
 * from this repository's build, and the table from the manifests in
 * `helix/docs/peers.json`, which `turbo run peers` writes on a date it records.
 * Copied by hand, these drift; this file adds only the words.
 */

export {
  ADDED,
  COMPONENTS,
  COVERAGE,
  type Coverage,
  type CoverageCell,
  MEASURED,
} from './claims.generated'

/** The table with every element named, and the size comparison beside it. */
export const METRICS_HREF = '/helix/docs/metrics#what-each-system-ships'

/** The day the peers were read, written the way the site writes dates. */
export const measuredOn = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  })

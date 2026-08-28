import { BUTTON, CLAIMS, METRICS_HREF } from '@/content/landing/proof'
import styles from './landing-c.module.css'

/**
 * The numbers, on the front of the site.
 *
 * **A server component with no client boundary.** Nothing here changes after
 * the page lands, and the chart reads the DOM rather than a prop, so the whole
 * band is markup.
 *
 * **The comparison is a real table and the chart is drawn from it.** `for`
 * points `helix-bar-chart` at a `<table>` that is hidden visually and present to
 * everything else: a screen reader gets rows and headers, a page with the
 * script blocked gets the figures, and the drawing is an enhancement over data
 * that was already correct. A chart taking an array prop would have made the
 * numbers unreadable to half of that list.
 *
 * The same argument the showcase makes one band above, applied to the numbers
 * rather than to the controls: the chart is the library drawing its own
 * measurements.
 */
export const ProofBand = () => (
  <helix-flex data-shell direction="column">
    <div className={styles.bandCard} data-material="glass" data-substrate>
      <helix-flex class={styles.bandSection} direction="column" gap="sm">
        <p className={styles.tLabel}>Measured, not claimed</p>
        {/* **Not "fast" and not "small".** Both are adjectives a reader has been
          promised by every library they have ever evaluated, and neither is
          checkable.

          **And not a second run at the kicker either.** This read "Every number
          here was produced, not written", directly under "Measured, not
          claimed": the same sentence twice, in the same `X, not Y` shape, with
          the lede under it saying it a third time. Three lines to establish
          where numbers come from and none of them saying what the numbers are
          about. The kicker already carries the epistemics, which frees the
          heading to name the subject the way every other band on this page
          does. */}
        <helix-text as="h2" data-measure data-section-title>
          What Helix costs a page
        </helix-text>
        <helix-text as="p" data-measure tone="muted">
          Generated from the built packages on every release. Brotli, which is what a CDN serves.
        </helix-text>
      </helix-flex>

      <div className={styles.bandRow}>
        {CLAIMS.map((claim) => (
          <helix-flex class={styles.bandCell} direction="column" gap="2xs" key={claim.label}>
            <helix-text as="p" class={styles.claimValue}>
              {claim.value}
            </helix-text>
            <helix-text as="p" variant="label">
              {claim.label}
            </helix-text>
            <helix-text as="p" tone="muted" variant="caption">
              {claim.note}
            </helix-text>
          </helix-flex>
        ))}
      </div>

      <helix-flex class={`${styles.proofPanel} ${styles.bandSection}`} direction="column" gap="md">
        <helix-flex direction="column" gap="2xs">
          <helix-text as="h3" data-substrate-name>
            One button, five systems
          </helix-text>
          {/* **Named, and Material Web is ahead of us.** A comparison that only
            appears where it wins is an advertisement, and an engineer reading
            this will check. Printing the row we lose is what makes the other
            three worth believing. */}
          <helix-text as="p" tone="muted" variant="caption">
            Brotli bytes for one button with its runtime, measured the same way on the same day.
          </helix-text>
        </helix-flex>

        {/* **Two columns, because "ours" is a fact about the data.** One series
          painted every bar the same, in a chart whose entire job is the
          comparison: a reader had to find Helix by reading labels. Splitting the
          measurement into `Helix` and `Others` gives the chart two series to
          color and the legend something true to say, and each row still carries
          exactly one number. */}
        <table data-hidden-visually id="proof-button">
          <caption>One button and its runtime, brotli bytes, by design system</caption>
          <thead>
            <tr>
              <th scope="col">System</th>
              <th scope="col">Helix</th>
              <th scope="col">Others</th>
            </tr>
          </thead>
          <tbody>
            {BUTTON.map((rival) => (
              <tr key={rival.name}>
                <th scope="row">{rival.name}</th>
                <td data-value={rival.ours ? rival.brotli : 0}>
                  {rival.ours ? rival.brotli.toLocaleString('en-US') : ''}
                </td>
                <td data-value={rival.ours ? 0 : rival.brotli}>
                  {rival.ours ? '' : rival.brotli.toLocaleString('en-US')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <helix-bar-chart
          class={styles.proofBars}
          emphasis="outlined"
          for="proof-button"
          wash="gradient"
        ></helix-bar-chart>
        <helix-legend class={styles.proofLegend} for="proof-button"></helix-legend>

        <helix-flex data-density="lg">
          {/* The workaround here is gone, because the fault it worked around
            is fixed. `standard` set a fixed `inline-size` while the note beside
            it called the value a floor, so a label wider than the standard
            width filled the box and ate its own padding, and this button opted
            out rather than do that. It is `min-inline-size` now and behaves as
            documented, so this takes the width every other button on the page
            takes. The shorter label stays: it was the better label anyway. */}
          <a data-button="subtle" data-button-width="standard" href={METRICS_HREF}>
            The method
          </a>
        </helix-flex>
      </helix-flex>
    </div>
  </helix-flex>
)

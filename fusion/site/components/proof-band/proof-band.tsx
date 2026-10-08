import { Band, band } from '@/components/band/band'
import { Eyebrow } from '@/components/eyebrow/eyebrow'
import { BUTTON, CLAIMS, METRICS_HREF } from '@/content/landing/proof'
import styles from './proof-band.module.css'

/**
 * The numbers, on the front of the site.
 */
export const ProofBand = () => (
  <Band card={false} id="proof">
    <div className={band.fieldStack}>
      <helix-flex class={band.fieldIntro} direction="column" gap="sm">
        <Eyebrow>Package size</Eyebrow>
        {/* **Where the numbers come from, under the subject.** "Fast" and
          "small" are adjectives every library promises, and neither can be
          checked. The eyebrow names the subject, so the heading says how each
          number below is measured. */}
        <helix-text as="h2" data-measure data-section-title>
          Measured on every release
        </helix-text>
        <helix-text as="p" data-measure emphasis="muted">
          From the built packages, compressed with Brotli as a CDN serves them.
        </helix-text>
      </helix-flex>

      {/* The numbers on the field, each over a rule: four figures to read, not
        four objects to open. */}
      <div className={styles.claims}>
        {CLAIMS.map((claim) => (
          <helix-flex class={styles.claim} direction="column" gap="2xs" key={claim.label}>
            <helix-text as="p" class={styles.claimValue}>
              {claim.value}
            </helix-text>
            <helix-text as="p" variant="label">
              {claim.label}
            </helix-text>
            <helix-text as="p" emphasis="muted" variant="caption">
              {claim.note}
            </helix-text>
          </helix-flex>
        ))}
      </div>

      <helix-flex
        class={styles.proofPanel}
        data-material="glass"
        data-substrate
        direction="column"
        gap="md"
      >
        <helix-flex direction="column" gap="2xs">
          <helix-text as="h3" data-substrate-name>
            One button, five systems
          </helix-text>
          {/* **Named, and Material Web is ahead of us.** A comparison that only
            appears where it wins is an advertisement, and an engineer reading
            this will check. Printing the row we lose is what makes the other
            three worth believing. */}
          <helix-text as="p" emphasis="muted" variant="caption">
            Brotli bytes for one button with its runtime, measured the same way on the same day.
          </helix-text>
        </helix-flex>

        {/* **Two columns, because "ours" is a fact about the data.** A single
          series paints every bar the same, leaving a reader to find Helix by
          reading labels. `Helix` and `Others` give the chart two series to color
          and the legend something true to say, and each row still carries
          exactly one number.

          **Stacked, so each row is one bar.** Side by side, the empty half of
          each row still took its slot, and the gaps between bars came out
          uneven. Horizontal, so each system's name reads on one line. */}
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
          orientation="horizontal"
          stacked
          wash="gradient"
        ></helix-bar-chart>
        <helix-legend class={styles.proofLegend} for="proof-button"></helix-legend>

        <helix-flex class="siteActions" data-density="lg">
          <a data-button="subtle" href={METRICS_HREF}>
            See how we measure
          </a>
        </helix-flex>
      </helix-flex>
    </div>
  </Band>
)

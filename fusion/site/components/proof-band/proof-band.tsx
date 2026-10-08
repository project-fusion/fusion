import { Band, band } from '@/components/band/band'
import { Eyebrow } from '@/components/eyebrow/eyebrow'
import { BUTTON, CLAIMS, METRICS_HREF } from '@/content/landing/proof'
import styles from './proof-band.module.css'

/**
 * The numbers, on the front of the site.
 */
export const ProofBand = () => (
  <Band id="proof">
    <helix-flex class={band.bandSection} direction="column" gap="sm">
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

    <div className={band.bandRow}>
      {CLAIMS.map((claim) => (
        <helix-flex class={band.bandCell} direction="column" gap="2xs" key={claim.label}>
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

    <helix-flex class={`${styles.proofPanel} ${band.bandSection}`} direction="column" gap="md">
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

      {/* **One column, and Helix's cell names its own tone.** It was split
          into a `Helix` column and an `Others` column only so the chart had a
          second series to color Helix's bar with, and every tooltip then showed
          the empty one: hovering Material Web read "Helix" over nothing and
          "Others 12,591". `data-tone` colors the one bar, so the table says
          what it measures and the tooltip reads one system and one number.
          Horizontal, so each system's name reads on one line. */}
      <table data-hidden-visually id="proof-button">
        <caption>One button and its runtime, brotli bytes, by design system</caption>
        <thead>
          <tr>
            <th scope="col">System</th>
            <th scope="col">Brotli bytes</th>
          </tr>
        </thead>
        <tbody>
          {BUTTON.map((rival) => (
            <tr key={rival.name}>
              <th scope="row">{rival.name}</th>
              <td data-tone={rival.ours ? 'primary' : undefined} data-value={rival.brotli}>
                {rival.brotli.toLocaleString('en-US')}
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
        wash="gradient"
      ></helix-bar-chart>

      <helix-flex class="siteActions" data-density="lg">
        <a data-button="subtle" href={METRICS_HREF}>
          See how we measure
        </a>
      </helix-flex>
    </helix-flex>
  </Band>
)

/**
 * What the preview shows: a page somebody would ship.
 *
 * **A palette is judged in composition, not in isolation.** An earlier version
 * was a card, a callout and a row of tags, which answers "what colour is a tag"
 * and not "would I ship this". Contrast between an ink and its ground is
 * measured by the engine and reported in the audit; what a reader is here to
 * judge is the thing the audit cannot see, which is whether the palette holds
 * together across real hierarchy.
 *
 * So it is a full landing page: header, hero, proof, features, a working
 * detail section, a closing band and a footer. Each lands on a different
 * surface, which also puts every ground in the model on screen at once rather
 * than one at a time.
 *
 * **The copy is a company's, not ours.** It said things like "every foreground
 * measured against the ground it lands on", which is Fusion's pitch wearing a
 * customer's header: a reader judging a palette should not be reading about the
 * palette. Nothing here refers to theming at all.
 *
 * Static on purpose. It takes no props and holds no state, so it renders once
 * and every change a reader makes reaches it through inherited custom
 * properties rather than through React.
 */

/** The one place the name lives, so settling on another is one line. */
const COMPANY = 'Strata'

const FEATURES = [
  {
    body: 'Every route, every stop, every exception, in one place and current to the minute.',
    icon: 'gauge',
    title: 'One view of the fleet',
  },
  {
    body: 'Delays surface before they cascade, with the three moves that recover the schedule.',
    icon: 'pulse',
    title: 'Warnings that arrive early',
  },
  {
    body: 'Read your own data out whenever you like. No export queue, no support ticket.',
    icon: 'share-network',
    title: 'Yours to take with you',
  },
] as const

const SHIPMENTS = [
  { lane: 'Rotterdam to Felixstowe', state: 'success', status: 'On time', window: '14:20' },
  { lane: 'Algeciras to Genoa', state: 'warning', status: 'Delayed 40m', window: '09:05' },
  { lane: 'Gdansk to Aarhus', state: 'danger', status: 'Missed window', window: '22:45' },
  { lane: 'Bilbao to Cork', state: 'success', status: 'On time', window: '06:30' },
] as const

/**
 * The mark: three strata with a fault through them.
 *
 * **Figure and ground rather than one silhouette**, which is most of what
 * separates a logo from a shape. The bands are the figure and the gaps between
 * them are the page showing through, so the mark has structure at any size
 * instead of being a filled polygon.
 *
 * The middle band is displaced, which is what a fault does to strata and is the
 * one thing here that could not be any other name's mark. Two ideas, one form.
 *
 * **Drawn rather than fetched.** Three rectangles is markup, not an asset: an
 * SVG file would need loading, sizing and a licence to say the same thing, and
 * `currentColor` lets one definition serve the header and the footer.
 *
 * `aria-hidden`, because the wordmark beside it is the accessible name and a
 * reader should not be told the company twice.
 */
function Mark() {
  return (
    <svg
      aria-hidden="true"
      className="themedMark"
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect height="5" rx="1.6" width="18" x="1" y="2" />
      <rect height="5" rx="1.6" width="18" x="5" y="9.5" />
      <rect height="5" rx="1.6" width="18" x="1" y="17" />
    </svg>
  )
}

export function ThemedPage() {
  return (
    <div className="themedPage">
      <helix-app-header className="themedHeader">
        {/* **A mark, because it is the one place the brand appears as itself.**
            Everywhere else on this page the brand is solved for a word: the
            button fill has to carry white and the link colour has to clear the
            page as text. `--helix-color-brand-mark` answers to the 3:1 a graphic
            owes rather than the 4.5 a word does, so a reader who picks a colour
            can find it here even when every button has moved away from it. */}
        <helix-flex align="center" gap="xs" slot="start">
          <Mark />
          <helix-text appearance="label">{COMPANY}</helix-text>
        </helix-flex>

        {/* Plain anchors carrying `data-navigation-item`, which is the base
            layer's helper for exactly this: `helix-navigation` is the landmark
            and takes whatever is slotted into it. Wrapped, because the container
            query that hides it must not set `display` on the component itself. */}
        <div className="themedNav">
          <helix-navigation label="Product">
            <a data-navigation-item href="#platform">
              Platform
            </a>
            <a data-navigation-item href="#pricing">
              Pricing
            </a>
            <a data-navigation-item href="#docs">
              Docs
            </a>
          </helix-navigation>
        </div>

        <helix-flex align="center" gap="xs" slot="end">
          <helix-button emphasis="ghost">Sign in</helix-button>
          <helix-button emphasis="solid" tone="primary">
            Book a walkthrough
          </helix-button>
        </helix-flex>
      </helix-app-header>

      <section className="themedHero">
        <helix-flex direction="column" gap="md">
          <helix-flex align="center" gap="xs">
            <helix-tag emphasis="subtle" tone="accent">
              New
            </helix-tag>
            <helix-text appearance="caption">Live berth windows, in twelve more ports</helix-text>
          </helix-flex>
          <helix-text appearance="display" as="h1">
            Know where the freight is before the customer asks.
          </helix-text>
          <helix-text appearance="body">
            {COMPANY} reads the schedules, the terminals and the telematics, and tells you which of
            today&rsquo;s shipments is about to be late while there is still something to do about
            it.
          </helix-text>
          <helix-flex gap="sm">
            <helix-button emphasis="solid" tone="primary">
              Start free
            </helix-button>
            <helix-button emphasis="outlined">
              Book a walkthrough
              <helix-icon name="arrow-right" slot="end"></helix-icon>
            </helix-button>
          </helix-flex>
          <helix-flex align="center" gap="xs">
            <helix-icon name="check-circle-fill"></helix-icon>
            <helix-text appearance="caption">
              No card. Two weeks of your own history loaded on the first day.
            </helix-text>
          </helix-flex>
        </helix-flex>
      </section>

      {/* A recessed band, so `surface-sunken` is on screen beside the others
          rather than being the one ground nobody looks at. */}
      <section className="themedFigures">
        {[
          { figure: '2,400', label: 'Lanes watched' },
          { figure: '19 min', label: 'Median warning lead' },
          { figure: '98.6%', label: 'Window accuracy' },
          { figure: '31', label: 'Ports live' },
        ].map((stat) => (
          <helix-stat key={stat.label}>
            {stat.figure}
            <span slot="label">{stat.label}</span>
          </helix-stat>
        ))}
      </section>

      <section className="themedFeatures" id="platform">
        <helix-grid columns={3} gap="md">
          {FEATURES.map((feature) => (
            <helix-card key={feature.title}>
              <helix-flex direction="column" gap="sm">
                <helix-icon className="themedFeatureIcon" name={feature.icon}></helix-icon>
                <helix-text appearance="subheading" as="h2">
                  {feature.title}
                </helix-text>
                <helix-text appearance="caption">{feature.body}</helix-text>
              </helix-flex>
            </helix-card>
          ))}
        </helix-grid>
      </section>

      {/* **A chart, because the series ramp is a third of the palette and had
          nothing on screen.** Twenty-four tokens rotate off the brand and not
          one of them appeared in this preview, so a reader could move the
          saturation and never see what it did to a chart.

          It reads a table, which is the whole point of the component: the
          accessible representation is markup a consumer wrote rather than an
          `aria-label` generated from an array. The table is clipped rather than
          hidden, so it stays in the accessibility tree. */}
      <section className="themedChart">
        {/* Glass on one card, so the material policy has something to act on
            that a reader can compare against the opaque ones beside it. It is an
            attribute rather than two custom properties because glass is a
            translucent ground *and* a backdrop, and either alone does nothing. */}
        <helix-card material="glass">
          <helix-flex direction="column" gap="md">
            <helix-text appearance="subheading" as="h2">
              On-time arrivals
            </helix-text>
            <table data-hidden-visually id="arrivals">
              <caption>On-time arrivals by month, as a percentage</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">On time</th>
                  <th scope="col">Recovered</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['Jan', 91, 4],
                    ['Feb', 88, 7],
                    ['Mar', 94, 3],
                    ['Apr', 96, 2],
                    ['May', 93, 5],
                    ['Jun', 98, 1],
                  ] as const
                ).map(([month, ontime, recovered]) => (
                  <tr key={month}>
                    <th scope="row">{month}</th>
                    <td data-value={ontime}>{ontime}%</td>
                    <td data-value={recovered}>{recovered}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* `gridlines` names an axis rather than being a boolean, which the
                generated types caught: `value` draws the lines the bars are read
                against and leaves the category axis alone. */}
            {/* Gradient, so the chart is in the same language as the glass card
                it sits in rather than the one opaque slab on the page. */}
            <helix-bar-chart
              for="arrivals"
              gridlines="value"
              label="On-time arrivals by month"
              material="gradient"
            ></helix-bar-chart>
          </helix-flex>
        </helix-card>
      </section>

      <section className="themedSplit">
        <helix-card>
          <helix-flex direction="column" gap="md">
            <helix-flex align="center" gap="sm" justify="between">
              <helix-text appearance="subheading" as="h2">
                Today
              </helix-text>
              {/* **A menu, which is where motion is most visible.** It is the
                  one thing on this page that opens, and a character change moves
                  every transition in the library: a reader needs something that
                  actually transitions to judge it by. Anchored and in the top
                  layer, so it opens over the page the way a real one does rather
                  than pushing the card around. */}
              <helix-menu label="Table actions" placement="bottom-end">
                <helix-icon-button label="Table actions" slot="trigger">
                  <helix-icon name="dots-three"></helix-icon>
                </helix-icon-button>
                <helix-menu-item>Export today</helix-menu-item>
                <helix-menu-item>Subscribe to changes</helix-menu-item>
                <helix-menu-item>Open in the planner</helix-menu-item>
              </helix-menu>
            </helix-flex>
            <helix-table label="Shipments today">
              <helix-table-column slot="columns">Lane</helix-table-column>
              <helix-table-column slot="columns">Window</helix-table-column>
              <helix-table-column slot="columns">Status</helix-table-column>
              {SHIPMENTS.map((row) => (
                <helix-table-row key={row.lane}>
                  <helix-table-cell>{row.lane}</helix-table-cell>
                  <helix-table-cell>{row.window}</helix-table-cell>
                  <helix-table-cell>
                    <helix-tag emphasis="subtle" tone={row.state}>
                      {row.status}
                    </helix-tag>
                  </helix-table-cell>
                </helix-table-row>
              ))}
            </helix-table>
            <helix-flex align="center" gap="sm">
              <helix-progress value={68}></helix-progress>
              <helix-text appearance="caption">68% of today&rsquo;s windows closed</helix-text>
            </helix-flex>
          </helix-flex>
        </helix-card>

        <helix-card>
          <helix-flex direction="column" gap="md">
            <helix-text appearance="subheading" as="h2">
              Start a trial
            </helix-text>
            <helix-input
              default-value="ada@example.com"
              label="Work email"
              name="email"
            ></helix-input>
            {/* `feedback` and not an `invalid` attribute, which does not exist:
                the styled tier keys its wrong-state off `data-invalid`, which the
                component writes from the same validity that decides the message.
                Markup claiming it would be setting a mirror the component owns. */}
            <helix-input
              default-value="Example Freight"
              feedback="That company is already on a plan."
              label="Company"
              name="company"
              required
            ></helix-input>
            <helix-checkbox name="terms">Send me the monthly reliability report</helix-checkbox>
            <helix-flex gap="sm">
              <helix-button emphasis="solid" tone="primary">
                Create account
              </helix-button>
              <helix-button emphasis="ghost">Talk to sales</helix-button>
            </helix-flex>
          </helix-flex>
        </helix-card>
      </section>

      {/* The closing band, on the brand fill, which is the one large area of
          `primary-surface` on the page and therefore the one place
          `foreground-on-accent` is doing real work. */}
      <section className="themedClose">
        <helix-flex align="center" gap="md" justify="between">
          <helix-flex direction="column" gap="2xs">
            <helix-text appearance="subheading" as="h2">
              See it against your own lanes
            </helix-text>
            <helix-text appearance="caption">
              Two weeks of your history, loaded before the call.
            </helix-text>
          </helix-flex>
          <helix-button emphasis="solid">Book a walkthrough</helix-button>
        </helix-flex>
      </section>

      <footer className="themedFooter">
        <helix-flex align="center" gap="md" justify="between">
          <helix-flex align="center" gap="xs">
            <Mark />
            <helix-text appearance="caption">
              &copy; {COMPANY} {new Date().getFullYear()}
            </helix-text>
          </helix-flex>
          <helix-flex gap="md">
            <a data-link="subtle" href="#privacy">
              Privacy
            </a>
            <a data-link="subtle" href="#terms">
              Terms
            </a>
            <a data-link="subtle" href="#status">
              Status
            </a>
          </helix-flex>
        </helix-flex>
      </footer>
    </div>
  )
}

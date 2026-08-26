/**
 * What the preview shows: a page somebody would ship.
 *
 * **A palette is judged in composition, not in isolation.** An earlier version
 * was a card, a callout and a row of tags, which answers "what color is a tag"
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
 * **And it is one company only until a reader says otherwise.** The page was a
 * freight platform and nothing else, so anyone theming a magazine or a shop
 * read three hundred words about berth windows to find out what their headings
 * would look like. Copy that belongs to somebody else is a tax on every reader
 * it does not describe, and the tax is not small: the hero, the features, the
 * table and the drawer are most of the text on screen.
 *
 * **The skeleton does not move, and that is the point.** A context changes
 * words and nothing else: the same components land on the same grounds in the
 * same order, so the chart still shows the series ramp and the drawer still
 * carries the scrim, the glass and the motion together. A publication that
 * dropped the chart would be a nicer page and a worse instrument.
 *
 * Static on purpose. It takes a context and holds no state, so a rendering is
 * final: every change a reader makes to the *theme* reaches it through
 * inherited custom properties rather than through React. The context is chosen
 * before the render rather than during it, which is why `bun run themed-page`
 * emits one string per context and the builder posts whichever is asked for.
 */

/** A place in the table, and which tone says so. */
type State = 'danger' | 'success' | 'warning'

/**
 * Everything one context says, which is every word on the page that belongs to
 * a company rather than to a browser.
 *
 * What is *not* here is as deliberate: "Sign in", "Work email", "Privacy",
 * "Terms" and "Status" say the same thing on a freight platform and in a shop,
 * so they are written once in the markup. A string earns a place in here by
 * differing, not by being copy.
 */
interface Context {
  /** The bar chart: its heading, its accessible table, and the numbers in it. */
  chart: {
    caption: string
    columns: readonly [string, string]
    heading: string
    label: string
    rows: readonly (readonly [string, number, number])[]
  }
  /** The closing band, on the brand fill. */
  close: { body: string; cta: string; heading: string }
  /** The company whose page this is. */
  company: string
  /** The drawer: one row of the table, opened. */
  detail: {
    cta: string
    heading: string
    label: string
    lead: { caption: string; value: string }
    status: { caption: string; state: State; words: string }
    trail: { caption: string; value: string }
  }
  /** The three cards. Icons are names in `@helix-io/icons`. */
  features: readonly { body: string; icon: string; title: string }[]
  /** The recessed band of numbers. */
  figures: readonly { figure: string; label: string }[]
  /** Above the fold. `secondary` is also the header's own button. */
  hero: {
    assurance: string
    badge: string
    body: string
    headline: string
    note: string
    primary: string
    secondary: string
  }
  /** What a reader picks this context by. */
  label: string
  /** Which mark `Mark` draws. */
  mark: 'loom' | 'meridian' | 'strata'
  /** The three menu items, which exist to be opened rather than read. */
  menu: readonly [string, string, string]
  /** The header's links. The first is the one anchor on the page that resolves. */
  nav: readonly { href: string; label: string }[]
  /** The line beside the progress bar. */
  progress: string
  /** The table: its heading, its columns and its rows. */
  table: {
    columns: readonly [string, string, string]
    heading: string
    label: string
    link: string
    rows: readonly { state: State; status: string; subject: string; when: string }[]
  }
  /** The form card beside the table. */
  trial: {
    checkbox: string
    cta: string
    heading: string
    secondary: string
    taken: { feedback: string; label: string; value: string }
  }
  /** What the builder stores, and what names the generated string. */
  value: string
  /** The dialog the hero opens. */
  walkthrough: { body: string; cta: string; heading: string }
}

/**
 * The contexts, in the order the builder offers them.
 *
 * Three rather than one of everything. Each is a different *kind* of product
 * rather than a different industry: a platform somebody works in all day, a
 * publication somebody reads, and a shop somebody buys from. A fourth freight
 * company would cost the same bytes and answer nothing new.
 *
 * The first is the resting one, and it is the freight platform the page has
 * always been, so nothing about the default preview moved.
 */
export const CONTEXTS: readonly Context[] = [
  {
    chart: {
      caption: 'On-time arrivals by month, as a percentage',
      columns: ['On time', 'Recovered'],
      heading: 'On-time arrivals',
      label: 'On-time arrivals by month',
      rows: [
        ['Jan', 91, 4],
        ['Feb', 88, 7],
        ['Mar', 94, 3],
        ['Apr', 96, 2],
        ['May', 93, 5],
        ['Jun', 98, 1],
      ],
    },
    close: {
      body: 'Two weeks of your history, loaded before the call.',
      cta: 'Book a walkthrough',
      heading: 'See it against your own lanes',
    },
    company: 'Strata',
    detail: {
      cta: 'Watch this lane',
      heading: 'Rotterdam to Felixstowe',
      label: 'Lane detail',
      lead: { caption: 'Window', value: '06:00 to 09:30, berth 14' },
      status: { caption: 'Status', state: 'success', words: 'On time' },
      trail: { caption: 'Last reading', value: 'Nineteen minutes ago, from the terminal feed.' },
    },
    features: [
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
    ],
    figures: [
      { figure: '2,400', label: 'Lanes watched' },
      { figure: '19 min', label: 'Median warning lead' },
      { figure: '98.6%', label: 'Window accuracy' },
      { figure: '31', label: 'Ports live' },
    ],
    hero: {
      assurance: 'No card. Two weeks of your own history loaded on the first day.',
      badge: 'New',
      body: 'Strata reads the schedules, the terminals and the telematics, and tells you which of today’s shipments is about to be late while there is still something to do about it.',
      headline: 'Know where the freight is before the customer asks.',
      note: 'Live berth windows, in twelve more ports',
      primary: 'Start free',
      secondary: 'Book a walkthrough',
    },
    label: 'Logistics platform',
    mark: 'strata',
    menu: ['Export today', 'Subscribe to changes', 'Open in the planner'],
    nav: [
      { href: '#features', label: 'Platform' },
      { href: '#pricing', label: 'Pricing' },
      { href: '#docs', label: 'Docs' },
    ],
    progress: '68% of today’s windows closed',
    table: {
      columns: ['Lane', 'Window', 'Status'],
      heading: 'Today',
      label: 'Shipments today',
      link: 'Lane detail',
      rows: [
        {
          state: 'success',
          status: 'On time',
          subject: 'Rotterdam to Felixstowe',
          when: '14:20',
        },
        { state: 'warning', status: 'Delayed 40m', subject: 'Algeciras to Genoa', when: '09:05' },
        { state: 'danger', status: 'Missed window', subject: 'Gdansk to Aarhus', when: '22:45' },
        { state: 'success', status: 'On time', subject: 'Bilbao to Cork', when: '06:30' },
      ],
    },
    trial: {
      checkbox: 'Send me the monthly reliability report',
      cta: 'Create account',
      heading: 'Start a trial',
      secondary: 'Talk to sales',
      taken: {
        feedback: 'That company is already on a plan.',
        label: 'Company',
        value: 'Example Freight',
      },
    },
    value: 'logistics',
    walkthrough: {
      body: 'Thirty minutes with someone who runs Strata day to day. Bring a route you are unhappy with and we will look at it together.',
      cta: 'Request a time',
      heading: 'Book a walkthrough',
    },
  },
  {
    chart: {
      caption: 'Pieces read to the end by month, as a percentage',
      columns: ['Finished', 'Saved'],
      heading: 'Read to the end',
      label: 'Pieces read to the end by month',
      rows: [
        ['Jan', 71, 12],
        ['Feb', 68, 15],
        ['Mar', 74, 11],
        ['Apr', 79, 9],
        ['May', 76, 13],
        ['Jun', 82, 8],
      ],
    },
    close: {
      body: 'The first month is open. Cancel from the same page you signed up on.',
      cta: 'Start reading',
      heading: 'Read one properly this week',
    },
    company: 'Meridian',
    detail: {
      cta: 'Follow this correspondent',
      heading: 'The last ferry from Durres',
      label: 'Piece detail',
      lead: { caption: 'Filed', value: 'Monday, 06:40, from the coast road' },
      status: { caption: 'Status', state: 'success', words: 'Published' },
      trail: { caption: 'Last edit', value: 'Nineteen minutes ago, by the desk.' },
    },
    features: [
      {
        body: 'Edited, not aggregated. Nothing arrives that an editor did not choose to send.',
        icon: 'book-open-text',
        title: 'One piece a day',
      },
      {
        body: 'Correspondents on the ground, paid for the time a story actually takes.',
        icon: 'compass',
        title: 'Reported where it happens',
      },
      {
        body: 'Every issue you paid for, downloadable, for as long as you want it.',
        icon: 'archive',
        title: 'The archive stays yours',
      },
    ],
    figures: [
      { figure: '1,840', label: 'Pieces published' },
      { figure: '11 min', label: 'Median read' },
      { figure: '94%', label: 'Renew after a year' },
      { figure: '38', label: 'Countries reported from' },
    ],
    hero: {
      assurance: 'No card. The first month is open, and the archive with it.',
      badge: 'New',
      body: 'Meridian commissions long reporting on the things that move slowly, and sends you one piece a day instead of forty.',
      headline: 'Read the argument, not the headline.',
      note: 'Three new essays this week, from three continents',
      primary: 'Start reading',
      secondary: 'Read a sample',
    },
    label: 'Publication',
    mark: 'meridian',
    menu: ['Export this week', 'Follow this section', 'Open in the desk'],
    nav: [
      { href: '#features', label: 'Sections' },
      { href: '#pricing', label: 'Subscribe' },
      { href: '#docs', label: 'Archive' },
    ],
    progress: '68% of this week’s pieces filed',
    table: {
      columns: ['Piece', 'Filed', 'Status'],
      heading: 'This week',
      label: 'Pieces this week',
      link: 'Piece detail',
      rows: [
        {
          state: 'success',
          status: 'Published',
          subject: 'The last ferry from Durres',
          when: 'Mon',
        },
        {
          state: 'warning',
          status: 'With the editor',
          subject: 'What the copper price knows',
          when: 'Tue',
        },
        { state: 'danger', status: 'Held', subject: 'A winter in Kiruna', when: 'Wed' },
        { state: 'success', status: 'Published', subject: 'The river that moved', when: 'Thu' },
      ],
    },
    trial: {
      checkbox: 'Send me the Saturday edition',
      cta: 'Create account',
      heading: 'Start reading',
      secondary: 'See the plans',
      taken: {
        feedback: 'That name is already taken.',
        label: 'Display name',
        value: 'Ada Lovelace',
      },
    },
    value: 'publication',
    walkthrough: {
      body: 'One full piece, sent now, chosen by the editor who commissioned it. No card, and no series of emails afterwards.',
      cta: 'Send it',
      heading: 'Read a sample',
    },
  },
  {
    chart: {
      caption: 'Orders shipped inside the promised window by month, as a percentage',
      columns: ['On time', 'Recovered'],
      heading: 'Shipped on time',
      label: 'Orders shipped on time by month',
      rows: [
        ['Jan', 89, 6],
        ['Feb', 85, 9],
        ['Mar', 92, 5],
        ['Apr', 95, 3],
        ['May', 91, 6],
        ['Jun', 97, 2],
      ],
    },
    close: {
      body: 'Swatches of the whole range, posted free, before you decide.',
      cta: 'Order swatches',
      heading: 'See it against your own light',
    },
    company: 'Loom',
    detail: {
      cta: 'Track this order',
      heading: 'Herringbone throw, oat',
      label: 'Order detail',
      lead: { caption: 'Placed', value: '14:20, for next-day dispatch' },
      status: { caption: 'Status', state: 'success', words: 'Packed' },
      trail: { caption: 'Last scan', value: 'Nineteen minutes ago, on the packing bench.' },
    },
    features: [
      {
        body: 'The number on the page is the number on the shelf, counted this morning.',
        icon: 'cube',
        title: 'In stock means in stock',
      },
      {
        body: 'What the fiber cost, what the weaving cost, and what we kept.',
        icon: 'receipt',
        title: 'One price, printed',
      },
      {
        body: 'Sixty days, a printed label in the box, and a refund when it is scanned.',
        icon: 'arrow-counter-clockwise',
        title: 'Returns without a conversation',
      },
    ],
    figures: [
      { figure: '1,200', label: 'Meters woven a week' },
      { figure: '4 days', label: 'Median dispatch' },
      { figure: '99.1%', label: 'Kept after sixty days' },
      { figure: '9', label: 'Fibers in the range' },
    ],
    hero: {
      assurance: 'Free returns for sixty days. Swatches are free and always will be.',
      badge: 'New',
      body: 'Loom weaves in one mill and sells direct, so every blanket on this page has a fiber, a farm and the name of whoever finished it.',
      headline: 'Cloth you can find out everything about.',
      note: 'The winter weights are on the looms now',
      primary: 'Shop the winter range',
      secondary: 'Order swatches',
    },
    label: 'Storefront',
    mark: 'loom',
    menu: ['Export today', 'Subscribe to changes', 'Open in the workroom'],
    nav: [
      { href: '#features', label: 'Shop' },
      { href: '#pricing', label: 'Fabrics' },
      { href: '#docs', label: 'Stockists' },
    ],
    progress: '68% of today’s orders packed',
    table: {
      columns: ['Order', 'Placed', 'Status'],
      heading: 'Today',
      label: 'Orders today',
      link: 'Order detail',
      rows: [
        { state: 'success', status: 'Packed', subject: 'Herringbone throw, oat', when: '14:20' },
        {
          state: 'warning',
          status: 'Waiting on yarn',
          subject: 'Waffle blanket, indigo',
          when: '09:05',
        },
        {
          state: 'danger',
          status: 'Return opened',
          subject: 'Fine wool scarf, rust',
          when: '22:45',
        },
        { state: 'success', status: 'Packed', subject: 'Linen sheet set, chalk', when: '06:30' },
      ],
    },
    trial: {
      checkbox: 'Send me the seasonal lookbook',
      cta: 'Create account',
      heading: 'Open an account',
      secondary: 'Talk to the trade desk',
      taken: {
        feedback: 'That company already has a trade account.',
        label: 'Company',
        value: 'Example Interiors',
      },
    },
    value: 'storefront',
    walkthrough: {
      body: 'Nine fibers, cut from the roll they will be woven from. Free, posted anywhere Loom ships, and yours to keep.',
      cta: 'Post them',
      heading: 'Order swatches',
    },
  },
]

/**
 * The mark, which is a different drawing per company.
 *
 * **Figure and ground rather than one silhouette**, which is most of what
 * separates a logo from a shape. The figure is drawn and the gaps are the page
 * showing through, so each mark has structure at any size instead of being a
 * filled polygon.
 *
 * **And each one has to be its own**, which is why this is a switch rather than
 * one drawing reused. Strata's middle band is displaced, which is what a fault
 * does to strata and is the one thing here that could not be any other name's
 * mark. Handing that to a magazine would be a mark that means nothing, which is
 * exactly the failure the copy split exists to fix, one layer down.
 *
 * **Drawn rather than fetched.** A few rectangles is markup, not an asset: an
 * SVG file would need loading, sizing and a license to say the same thing, and
 * `currentColor` lets one definition serve the header and the footer.
 *
 * `aria-hidden`, because the wordmark beside it is the accessible name and a
 * reader should not be told the company twice.
 */
function Mark({ mark }: { mark: Context['mark'] }) {
  return (
    <svg
      aria-hidden="true"
      className="themedMark"
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Three strata with a fault through them. */}
      {mark === 'strata' ? (
        <>
          <rect height="5" rx="1.6" width="18" x="1" y="2" />
          <rect height="5" rx="1.6" width="18" x="5" y="9.5" />
          <rect height="5" rx="1.6" width="18" x="1" y="17" />
        </>
      ) : null}
      {/* A globe and the meridian across it, which is the name drawn. */}
      {mark === 'meridian' ? (
        <>
          <circle cx="12" cy="12" fill="none" r="9.4" stroke="currentColor" strokeWidth="2.4" />
          <ellipse
            cx="12"
            cy="12"
            fill="none"
            rx="4.2"
            ry="9.4"
            stroke="currentColor"
            strokeWidth="2.4"
          />
        </>
      ) : null}
      {/* Warp and weft, crossing. The cloth is the gaps. */}
      {mark === 'loom' ? (
        <>
          <rect height="20" rx="1.4" width="3.2" x="3.4" y="2" />
          <rect height="20" rx="1.4" width="3.2" x="17.4" y="2" />
          <rect height="3.2" rx="1.4" width="20" x="2" y="6.4" />
          <rect height="3.2" rx="1.4" width="20" x="2" y="14.4" />
        </>
      ) : null}
    </svg>
  )
}

export function ThemedPage(context: Context) {
  const { chart, close, company, detail, features, figures, hero, table, trial, walkthrough } =
    context

  return (
    <div className="themedPage">
      <helix-app-header className="themedHeader">
        {/* **A mark, because it is the one place the brand appears as itself.**
            Everywhere else on this page the brand is solved for a word: the
            button fill has to carry white and the link color has to clear the
            page as text. `--helix-color-brand-mark` answers to the 3:1 a graphic
            owes rather than the 4.5 a word does, so a reader who picks a color
            can find it here even when every button has moved away from it. */}
        <helix-flex align="center" gap="xs" slot="start">
          <Mark mark={context.mark} />
          <helix-text variant="label">{company}</helix-text>
        </helix-flex>

        {/* Plain anchors carrying `data-navigation-item`, which is the base
            layer's helper for exactly this: `helix-navigation` is the landmark
            and takes whatever is slotted into it. Wrapped, because the container
            query that hides it must not set `display` on the component itself. */}
        <div className="themedNav">
          <helix-navigation label="Product">
            {context.nav.map((item) => (
              <a data-navigation-item href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </helix-navigation>
        </div>

        <helix-flex align="center" gap="xs" slot="end">
          <helix-button emphasis="ghost">Sign in</helix-button>
          <helix-button emphasis="solid" tone="primary">
            {hero.secondary}
          </helix-button>
        </helix-flex>
      </helix-app-header>

      <section className="themedHero">
        <helix-flex direction="column" gap="md">
          <helix-flex align="center" gap="xs">
            <helix-tag emphasis="subtle" tone="accent">
              {hero.badge}
            </helix-tag>
            <helix-text variant="caption">{hero.note}</helix-text>
          </helix-flex>
          <helix-text as="h1" variant="display">
            {hero.headline}
          </helix-text>
          <helix-text variant="body">{hero.body}</helix-text>
          <helix-flex gap="sm">
            <helix-button emphasis="solid" tone="primary">
              {hero.primary}
            </helix-button>
            <helix-button command="--show" commandfor="walkthrough" emphasis="outlined">
              {hero.secondary}
              <helix-icon name="arrow-right" slot="end"></helix-icon>
            </helix-button>
          </helix-flex>
          <helix-flex align="center" gap="xs">
            <helix-icon name="check-circle-fill"></helix-icon>
            <helix-text variant="caption">{hero.assurance}</helix-text>
          </helix-flex>
        </helix-flex>
      </section>

      {/* A recessed band, so `surface-sunken` is on screen beside the others
          rather than being the one ground nobody looks at. */}
      <section className="themedFigures">
        {figures.map((stat) => (
          <helix-stat key={stat.label}>
            {stat.figure}
            <span slot="label">{stat.label}</span>
          </helix-stat>
        ))}
      </section>

      <section className="themedFeatures" id="features">
        <helix-grid columns={3} gap="md">
          {features.map((feature) => (
            <helix-card key={feature.title}>
              <helix-flex direction="column" gap="sm">
                <helix-icon className="themedFeatureIcon" name={feature.icon}></helix-icon>
                <helix-text as="h2" variant="subheading">
                  {feature.title}
                </helix-text>
                <helix-text variant="caption">{feature.body}</helix-text>
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
            <helix-text as="h2" variant="subheading">
              {chart.heading}
            </helix-text>
            <table data-hidden-visually id="arrivals">
              <caption>{chart.caption}</caption>
              <thead>
                <tr>
                  <th scope="col">Month</th>
                  <th scope="col">{chart.columns[0]}</th>
                  <th scope="col">{chart.columns[1]}</th>
                </tr>
              </thead>
              <tbody>
                {chart.rows.map(([month, first, second]) => (
                  <tr key={month}>
                    <th scope="row">{month}</th>
                    <td data-value={first}>{first}%</td>
                    <td data-value={second}>{second}%</td>
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
              label={chart.label}
              wash="gradient"
            ></helix-bar-chart>
          </helix-flex>
        </helix-card>
      </section>

      <section className="themedSplit">
        <helix-card>
          <helix-flex direction="column" gap="md">
            <helix-flex align="center" gap="sm" justify="between">
              <helix-text as="h2" variant="subheading">
                {table.heading}
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
                {context.menu.map((item) => (
                  <helix-menu-item key={item}>{item}</helix-menu-item>
                ))}
              </helix-menu>
            </helix-flex>
            <helix-table label={table.label}>
              {table.columns.map((column) => (
                <helix-table-column key={column} slot="columns">
                  {column}
                </helix-table-column>
              ))}
              {table.rows.map((row) => (
                <helix-table-row key={row.subject}>
                  <helix-table-cell>{row.subject}</helix-table-cell>
                  <helix-table-cell>{row.when}</helix-table-cell>
                  <helix-table-cell>
                    <helix-tag emphasis="subtle" tone={row.state}>
                      {row.status}
                    </helix-tag>
                  </helix-table-cell>
                </helix-table-row>
              ))}
            </helix-table>
            <helix-flex align="center" gap="sm" justify="between">
              <helix-flex align="center" gap="sm">
                <helix-progress value={68}></helix-progress>
                <helix-text variant="caption">{context.progress}</helix-text>
              </helix-flex>
              <helix-button command="--show" commandfor="lane" emphasis="ghost">
                {table.link}
                <helix-icon name="arrow-right" slot="end"></helix-icon>
              </helix-button>
            </helix-flex>
          </helix-flex>
        </helix-card>

        <helix-card>
          <helix-flex direction="column" gap="md">
            <helix-text as="h2" variant="subheading">
              {trial.heading}
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
              default-value={trial.taken.value}
              feedback={trial.taken.feedback}
              label={trial.taken.label}
              name="account"
              required
            ></helix-input>
            <helix-checkbox name="terms">{trial.checkbox}</helix-checkbox>
            <helix-flex gap="sm">
              <helix-button emphasis="solid" tone="primary">
                {trial.cta}
              </helix-button>
              <helix-button emphasis="ghost">{trial.secondary}</helix-button>
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
            <helix-text as="h2" variant="subheading">
              {close.heading}
            </helix-text>
            <helix-text variant="caption">{close.body}</helix-text>
          </helix-flex>
          <helix-button emphasis="solid">{close.cta}</helix-button>
        </helix-flex>
      </section>

      <footer className="themedFooter">
        <helix-flex align="center" gap="md" justify="between">
          <helix-flex align="center" gap="xs">
            <Mark mark={context.mark} />
            <helix-text variant="caption">
              &copy; {company} {new Date().getFullYear()}
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

      {/* **The second thing on this page that opens, and the one that shows all
          three axes at once.** The menu above moves on `motion` and nothing
          else; a dialog is the only surface here that is floating, scrimmed and
          translucent together, so `separation.floating`, `material` and the
          motion character each change something visible in it. Material had no
          control at all until this session, which is part of why the preview had
          nothing that would have shown one.

          Opened from the hero rather than from a button of its own, because a
          control that exists to be demonstrated reads as a demo and the rest of
          this page is a page somebody would ship.

          **It covers the builder and not just the preview, and that is the top
          layer rather than a mistake.** `showModal` paints outside every
          ancestor, so a modal opened inside a pane is a modal over the window.
          Custom properties still inherit down the DOM, so it is themed by the
          preview's scope and not by the site around it: checked, its primary
          button takes the palette being built. The alternative is a surface that
          is not modal, and then there is nothing on this page that draws a
          scrim, which is half of what `separation.floating` and `material` do. */}
      {/* **The one thing here that moves far enough to be timed.** A dialog rises
          and fades, and even at `lg` that is twenty-four pixels: measured,
          `snappy` settles at 159ms and `gentle` at 262ms, a hundred milliseconds
          nobody can read across a short distance. A drawer translates its own
          full width, so the same hundred milliseconds is the difference between
          a panel that arrives and one that glides.

          It also carries the scrim and the glass at a size worth looking at,
          where the dialog shows them in a box. Between them the three axes have
          somewhere to land: `motion` here, `material` on both, and
          `separation.floating` on all of it. */}
      <helix-drawer id="lane" label={detail.label} material="glass" placement="end">
        <helix-text as="h2" slot="header">
          {detail.heading}
        </helix-text>
        <helix-flex direction="column" gap="md">
          <helix-flex direction="column" gap="xs">
            <helix-text variant="caption">{detail.lead.caption}</helix-text>
            <helix-text>{detail.lead.value}</helix-text>
          </helix-flex>
          <helix-flex direction="column" gap="xs">
            <helix-text variant="caption">{detail.status.caption}</helix-text>
            <helix-tag emphasis="subtle" tone={detail.status.state}>
              {detail.status.words}
            </helix-tag>
          </helix-flex>
          <helix-flex direction="column" gap="xs">
            <helix-text variant="caption">{detail.trail.caption}</helix-text>
            <helix-text>{detail.trail.value}</helix-text>
          </helix-flex>
          <helix-button command="--close" commandfor="lane" emphasis="solid" tone="primary">
            {detail.cta}
          </helix-button>
        </helix-flex>
      </helix-drawer>

      <helix-dialog id="walkthrough" label={walkthrough.heading}>
        <helix-text as="h2" slot="header">
          {walkthrough.heading}
        </helix-text>
        <helix-flex direction="column" gap="md">
          <helix-text>{walkthrough.body}</helix-text>
          <helix-input label="Work email" name="email" placeholder="you@company.com" />
        </helix-flex>
        <helix-flex gap="sm" slot="footer">
          <helix-button
            command="--close"
            commandfor="walkthrough"
            emphasis="solid"
            tone="primary"
            width="standard"
          >
            {walkthrough.cta}
          </helix-button>
          <helix-button command="--close" commandfor="walkthrough" width="standard">
            Not now
          </helix-button>
        </helix-flex>
      </helix-dialog>
    </div>
  )
}

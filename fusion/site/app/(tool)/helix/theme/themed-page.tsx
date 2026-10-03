/**
 * What the preview shows: a page somebody would ship, at four sizes of page.
 *
 * **A palette is judged in composition, not in isolation.** A card, a callout
 * and a row of tags answers "what color is a tag" and not "would I ship this".
 * Contrast between an ink and its ground is measured by the engine and reported
 * in the audit; what a reader is here to judge is the thing the audit cannot
 * see, which is whether the palette holds together across real hierarchy.
 */
import { type Context, Mark } from './themed-contexts'

/* The pieces more than one layout renders, written once.
 *
 * **Extracted because two layouts render them and not because they are
 * components.** A page's footer is a page's footer, and the marketing page and
 * the minimal one disagree about everything above it and about nothing here.
 * Copying it would be two footers that drift, which on a preview means a reader
 * comparing two layouts seeing a difference the theme did not cause.
 *
 * They stay plain functions taking a context, like the layouts themselves, so
 * nothing here is a React component with props to hydrate. Called rather than
 * rendered as elements, for the same reason: this tree is serialized once and
 * never mounted.
 */

/** The footer. Every layout that has one has this one. */
function Footer(context: Context) {
  const { company } = context

  return (
    <footer className="themedFooter">
      {/* Wrapping, because a copyright line and three links do not sit on one
          row at 320: measured, the pair wanted 287 in a 272 box and the links
          were clipped rather than pushed, so nothing overflowed the page and
          only looking at it found them. */}
      <helix-flex align-items="center" gap="md" justify-content="between" wrap>
        <helix-flex align-items="center" gap="xs">
          <Mark mark={context.mark} />
          <helix-text variant="caption">
            &copy; {company} {new Date().getFullYear()}
          </helix-text>
        </helix-flex>
        {/* **Quiet, not subtle**, which is the base layer's own distinction: both
            are muted, and only quiet drops the underline. A footer is
            navigation, and the helper says in as many words that a line under
            every row of it is noise. Three underlined links were the heaviest
            thing in the footer. */}
        <helix-flex gap="md">
          <a data-link="quiet" href="#privacy">
            Privacy
          </a>
          <a data-link="quiet" href="#terms">
            Terms
          </a>
          <a data-link="quiet" href="#status">
            Status
          </a>
        </helix-flex>
      </helix-flex>
    </footer>
  )
}

/**
 * The dialog the hero opens, which is the one thing a sparse page floats.
 *
 * On the minimal layout this is the only surface that is floating, scrimmed and
 * translucent at once, so it carries `separation.floating`, `material` and the
 * motion character on its own there. On the marketing page it shares that work
 * with the drawer.
 */
function Walkthrough(context: Context) {
  const { walkthrough } = context

  return (
    <helix-dialog id="walkthrough" label={walkthrough.heading}>
      <helix-text as="h2" slot="header">
        {walkthrough.heading}
      </helix-text>
      <helix-flex direction="column" gap="md">
        <helix-text>{walkthrough.body}</helix-text>
        <helix-input label="Work email" name="email" placeholder="you@company.com" />
      </helix-flex>
      <helix-flex gap="sm" slot="footer">
        <helix-button command="--close" commandfor="walkthrough" emphasis="solid" tone="primary">
          {walkthrough.cta}
        </helix-button>
        <helix-button command="--close" commandfor="walkthrough">
          Not now
        </helix-button>
      </helix-flex>
    </helix-dialog>
  )
}

/**
 * One row of the table, opened.
 *
 * **The one thing here that moves far enough to be timed.** A dialog rises and
 * fades, and even at `lg` that is twenty-four pixels: measured, `snappy`
 * settles at 159ms and `gentle` at 262ms, a hundred milliseconds nobody can
 * read across a short distance. A drawer translates its own full width, so the
 * same hundred milliseconds is the difference between a panel that arrives and
 * one that glides.
 */
function Detail(context: Context) {
  const { detail } = context

  return (
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
  )
}

/**
 * The chart, in the glass card it is always in.
 */
function ChartCard(context: Context) {
  const { chart } = context

  return (
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
  )
}
/**
 * The full landing page, and the resting layout.
 */
function MarketingPage(context: Context) {
  const { close, company, features, figures, hero, table, trial } = context

  return (
    <div className="themedPage">
      <helix-app-header className="themedHeader">
        {/* **A mark, because it is the one place the brand appears as itself.**
            Everywhere else on this page the brand is solved for a word: the
            button fill has to carry white and the link color has to clear the
            page as text. `--helix-color-brand-mark` answers to the 3:1 a graphic
            owes rather than the 4.5 a word does, so a reader who picks a color
            can find it here even when every button has moved away from it. */}
        <helix-flex align-items="center" gap="xs" slot="start">
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

        {/* **The header repeats the primary action, not the secondary one.**
            Reusing \`hero.secondary\` here puts the same words in the header, on
            the hero's outlined button and on the closing band: three identical
            calls to action in one scroll, reading as a page that could not
            decide. Repeating the conversion action in the header is what a
            landing page does, and it leaves the softer one said once. */}
        <helix-flex align-items="center" gap="xs" slot="end">
          <helix-button emphasis="ghost">Sign in</helix-button>
          <helix-button emphasis="solid" tone="primary">
            {hero.primary}
          </helix-button>
        </helix-flex>
      </helix-app-header>

      <section className="themedHero">
        <helix-flex direction="column" gap="md">
          <helix-flex align-items="center" gap="xs">
            <helix-tag emphasis="subtle" tone="accent">
              {hero.badge}
            </helix-tag>
            <helix-text variant="caption">{hero.note}</helix-text>
          </helix-flex>
          <helix-text as="h1" variant="display">
            {hero.headline}
          </helix-text>
          <helix-text variant="body">{hero.body}</helix-text>
          {/* **Wrapping, because two labeled buttons do not fit a phone.**
              Measured at 320 the pair ran 61 pixels past the pane on the
              storefront, whose calls to action are the longest, and 11 on the
              freight one: the row is what overflows rather than either button,
              so it is the row that has to give. A real landing page stacks its
              calls to action at that width, so this is the component's own
              \`wrap\` rather than a rule that hides one. */}
          <helix-flex gap="sm" wrap>
            <helix-button emphasis="solid" tone="primary">
              {hero.primary}
            </helix-button>
            <helix-button command="--show" commandfor="walkthrough" emphasis="outlined">
              {hero.secondary}
              <helix-icon name="arrow-right" slot="end"></helix-icon>
            </helix-button>
          </helix-flex>
          {/* **The check is set to the line it affirms, not to the icon scale.**
              It rendered at 20px beside 13px caption text and in the page's own
              foreground, so the heaviest, darkest mark in the hero was a
              punctuation glyph under the calls to action: it read as a bullet
              rather than as a tick. Sized to the text and taking the primary,
              it belongs to the sentence and matches the feature icons below. */}
          <helix-flex align-items="center" className="themedAssurance" gap="xs">
            <helix-icon name="check-circle-fill"></helix-icon>
            <helix-text variant="caption">{hero.assurance}</helix-text>
          </helix-flex>
        </helix-flex>
      </section>

      {/* A recessed band, so `surface-sunken` is on screen beside the others
          rather than being the one ground nobody looks at. */}
      <section className="themedFigures" data-band-slot>
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

      <section className="themedChart">{ChartCard(context)}</section>

      <section className="themedSplit">
        <helix-card>
          <helix-flex direction="column" gap="md">
            <helix-flex align-items="center" gap="sm" justify-content="between">
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
            <helix-flex align-items="center" gap="sm" justify-content="between" wrap>
              <helix-flex align-items="center" gap="sm">
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
            <helix-flex gap="sm" wrap>
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
        <helix-flex align-items="center" gap="md" justify-content="between" wrap>
          <helix-flex direction="column" gap="2xs">
            <helix-text as="h2" variant="subheading">
              {close.heading}
            </helix-text>
            <helix-text variant="caption">{close.body}</helix-text>
          </helix-flex>
          <helix-button emphasis="solid">{close.cta}</helix-button>
        </helix-flex>
      </section>

      {Footer(context)}

      {Detail(context)}

      {Walkthrough(context)}
    </div>
  )
}

/**
 * A landing page with room in it.
 */
function MinimalPage(context: Context) {
  const { company, features, hero } = context

  return (
    <div className="themedMinimal">
      <helix-app-header className="themedHeader">
        <helix-flex align-items="center" gap="xs" slot="start">
          <Mark mark={context.mark} />
          <helix-text variant="label">{company}</helix-text>
        </helix-flex>

        <helix-flex align-items="center" gap="xs" slot="end">
          <helix-button emphasis="ghost">Sign in</helix-button>
        </helix-flex>
      </helix-app-header>

      {/* Centered and narrow, because a landing page with four things on it is
          a column rather than a layout. The measure is the hero's own: at the
          width the marketing page uses, three short paragraphs sit in a row so
          wide that nothing reads as related to anything. */}
      <section className="themedMinimalHero">
        <helix-flex direction="column" gap="lg">
          <helix-text as="h1" variant="display">
            {hero.headline}
          </helix-text>
          <helix-text variant="body">{hero.body}</helix-text>
          {/* **Wrapping, because two labeled buttons do not fit a phone.**
              Measured at 320 the pair ran 61 pixels past the pane on the
              storefront, whose calls to action are the longest, and 11 on the
              freight one: the row is what overflows rather than either button,
              so it is the row that has to give. A real landing page stacks its
              calls to action at that width, so this is the component's own
              \`wrap\` rather than a rule that hides one. */}
          <helix-flex gap="sm" wrap>
            <helix-button emphasis="solid" tone="primary">
              {hero.primary}
            </helix-button>
            <helix-button command="--show" commandfor="walkthrough" emphasis="outlined">
              {hero.secondary}
              <helix-icon name="arrow-right" slot="end"></helix-icon>
            </helix-button>
          </helix-flex>
          {/* **The check is set to the line it affirms, not to the icon scale.**
              It rendered at 20px beside 13px caption text and in the page's own
              foreground, so the heaviest, darkest mark in the hero was a
              punctuation glyph under the calls to action: it read as a bullet
              rather than as a tick. Sized to the text and taking the primary,
              it belongs to the sentence and matches the feature icons below. */}
          <helix-flex align-items="center" className="themedAssurance" gap="xs">
            <helix-icon name="check-circle-fill"></helix-icon>
            <helix-text variant="caption">{hero.assurance}</helix-text>
          </helix-flex>
        </helix-flex>
      </section>

      <section className="themedMinimalFeatures">
        {features.map((feature) => (
          <helix-flex direction="column" gap="xs" key={feature.title}>
            <helix-icon className="themedFeatureIcon" name={feature.icon}></helix-icon>
            <helix-text as="h2" variant="subheading">
              {feature.title}
            </helix-text>
            <helix-text variant="caption">{feature.body}</helix-text>
          </helix-flex>
        ))}
      </section>

      {Footer(context)}
      {Walkthrough(context)}
    </div>
  )
}

/**
 * What somebody looks at for six hours rather than for six seconds.
 */
function WorkspacePage(context: Context) {
  const { action, company, figures, table } = context

  return (
    <div className="themedApp">
      <aside className="themedAppRail">
        <helix-flex align-items="center" gap="xs">
          <Mark mark={context.mark} />
          <helix-text variant="label">{company}</helix-text>
        </helix-flex>

        {/* **The rail says where you are.** A sidebar with three identical rows
            is a list of links rather than a place in a product, which is not
            what any application shows. `aria-current="page"`
            is the mechanism rather than a class, so a screen reader is told the
            same thing the eye is, and the base layer already carries the
            treatment for it. */}
        <nav aria-label="Sections" className="themedAppNav">
          {context.nav.map((item, index) => (
            <a
              aria-current={index === 0 ? 'page' : undefined}
              data-navigation-item
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* The one avatar in the preview, and it is here because this is the
            only layout with somewhere a signed-in person belongs. It falls back
            to initials from `name`, which is the component's own slot fallback
            rather than anything arranged here. */}
        <helix-flex align-items="center" className="themedAppUser" gap="xs">
          <helix-avatar name="Ada Lovelace" size="sm"></helix-avatar>
          <helix-text variant="caption">Ada Lovelace</helix-text>
        </helix-flex>
      </aside>

      <main className="themedAppMain">
        {/* A toolbar, which declares its own density, so the controls in it are
            already the right height without this page saying so. */}
        {/* Wrapping for the same reason the hero's calls to action do: measured
            at 320 the title, the menu and the action ran five pixels past the
            pane, and the actions dropping under the title is what an
            application does at that width. */}
        <helix-flex
          align-items="center"
          className="themedAppBar"
          gap="sm"
          justify-content="between"
          wrap
        >
          <helix-text as="h1" variant="subheading">
            {table.heading}
          </helix-text>
          <helix-flex align-items="center" gap="xs">
            <helix-menu label="Table actions" placement="bottom-end">
              <helix-icon-button label="Table actions" slot="trigger">
                <helix-icon name="dots-three"></helix-icon>
              </helix-icon-button>
              {context.menu.map((item) => (
                <helix-menu-item key={item}>{item}</helix-menu-item>
              ))}
            </helix-menu>
            <helix-button emphasis="solid" tone="primary">
              {action}
            </helix-button>
          </helix-flex>
        </helix-flex>

        {/* Each figure in its own card, unlike the marketing page's one recessed
            band. A dashboard states its numbers as things that could each be
            clicked; a landing page states them as proof, in a row. Same four
            numbers, and the surface they land on is the difference. */}
        <section className="themedAppStats">
          {figures.map((stat) => (
            <helix-card key={stat.label}>
              <helix-stat>
                {stat.figure}
                <span slot="label">{stat.label}</span>
              </helix-stat>
            </helix-card>
          ))}
        </section>

        <section className="themedAppGrid">
          {ChartCard(context)}

          <helix-card>
            <helix-flex direction="column" gap="md">
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
              <helix-flex align-items="center" gap="sm" justify-content="between" wrap>
                <helix-flex align-items="center" gap="sm">
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
        </section>
      </main>

      {Detail(context)}
    </div>
  )
}

/**
 * A rail, a measure, and prose.
 */
function EditorialPage(context: Context) {
  const { company, editorial } = context

  return (
    <div className="themedEditorial">
      <header className="themedRail themedMasthead">
        {/* **The mark and the name together, in the rail.** The mark alone
            leaves the page with no wordmark, so a reader arriving here cannot
            tell whose page it is without reading a paragraph. It sits in the
            rail column rather than the measure so the destinations still start
            on the line every paragraph starts on, which is the arrangement the
            whole layout is for. Not the rail's own label styling, which is mono
            and subtle and would set a masthead in the voice of a margin note. */}
        <div className="themedWordmark">
          <Mark mark={context.mark} />
          <helix-text variant="label">{company}</helix-text>
        </div>
        <div className="themedMeasure">
          {/* The real element, because this is a set of destinations that marks
              the current one, and it takes the consumer's own anchors rather
              than describing them as data. */}
          <helix-navigation label="Main">
            {context.nav.map((item, index) => (
              <a
                aria-current={index === 0 ? 'page' : undefined}
                data-navigation-item
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
          </helix-navigation>
        </div>
      </header>

      <main className="themedEditorialMain">
        <div className="themedRail">
          <div className="themedRailLabel">{editorial.place}</div>
          <div className="themedMeasure">
            <helix-text as="p" variant="display">
              {editorial.lead}
            </helix-text>
          </div>
        </div>

        {editorial.sections.map((section) => (
          <div className="themedRail" key={section.rail}>
            <div className="themedRailLabel">{section.rail}</div>
            <div className="themedMeasure">
              {section.body.map((paragraph) => (
                <helix-text as="p" key={paragraph} variant="body">
                  {paragraph}
                </helix-text>
              ))}
            </div>
          </div>
        ))}

        {/* **The only divided list in the tool**, and the only place a reader
            can see what a border color does to a rule that is not a card's.
            Each entry carries its date and its length in the supporting slot,
            which is the component's own arrangement rather than a second column
            built here. */}
        <div className="themedRail">
          <div className="themedRailLabel">Writing</div>
          <div className="themedMeasure">
            <helix-list divided label="Recent writing">
              {editorial.posts.map((post) => (
                <helix-list-item href="#writing" key={post.title}>
                  {post.title}
                  <helix-text as="span" slot="description" variant="caption">
                    {post.when} &middot; {post.minutes} min
                  </helix-text>
                </helix-list-item>
              ))}
            </helix-list>
            {/* **No underline until it is hovered, which the base layer already
                offers.** A rule at rest under a word with an arrow after it read
                as two separate marks, and the arrow, being an atomic inline, was
                skipped by the decoration so the line stopped in the whitespace
                before it. `data-link-underline="hover"` is the published recipe
                for a link that should not carry a rule at rest, so this asks for
                it rather than turning the decoration off and drawing its own. */}
            <helix-text as="p" variant="body">
              <a className="themedMore" data-link data-link-underline="hover" href="#writing">
                All writing
                <helix-icon name="arrow-right"></helix-icon>
              </a>
            </helix-text>
          </div>
        </div>
      </main>

      {/* A colophon rather than a footer: the rail stays empty so the contact
          line starts on the same measure as every paragraph above it. */}
      <footer className="themedRail themedColophon">
        <div className="themedRailLabel" />
        <div className="themedMeasure">
          <helix-flex gap="lg" wrap>
            <a data-link="quiet" href="#privacy">
              Privacy
            </a>
            <a data-link="quiet" href="#terms">
              Terms
            </a>
            <a data-link="quiet" href="#status">
              Status
            </a>
          </helix-flex>
          <helix-text as="p" variant="caption">
            <a data-link href={`mailto:${editorial.contact}`}>
              {editorial.contact}
            </a>
          </helix-text>
          <helix-text as="p" variant="caption">
            &copy; {company} {new Date().getFullYear()}
          </helix-text>
        </div>
      </footer>
    </div>
  )
}

/**
 * A product whose page is a map, with what it is about in a panel over it.
 *
 * **The map is live and nothing here makes it so.** This markup is a string
 * like every other layout's; the frame sees `data-preview-map` and loads the
 * renderer and the connector beside it, and redraws the map's colors whenever
 * the theme moves. So what is previewed is the map a consumer would get from
 * the same tokens, not a picture of one.
 *
 * **The table's rows, where they happen.** The four markers carry the rows'
 * states as their tones, which is the one place in the preview the status
 * colors sit on ground that is not a flat surface: land, water and roads,
 * each already drawn from the palette.
 */
function MapPage(context: Context) {
  const { action, company, map } = context

  return (
    <div className="themedMapPage">
      <helix-flex align-items="center" className="themedMapBar" gap="sm" justify-content="between">
        <helix-flex align-items="center" gap="xs">
          <Mark mark={context.mark} />
          <helix-text variant="label">{company}</helix-text>
        </helix-flex>
        <helix-button emphasis="solid" tone="primary">
          {action}
        </helix-button>
      </helix-flex>

      <div className="themedMapStage">
        {/* **Glass wherever something lies over the map**: the controls, the
            names and the panel. The map is the one busy ground in the
            preview, so it is where a theme's blur and translucency can be
            judged rather than seen over a flat page, where glass is only a
            slightly different gray. */}
        <helix-map className="themedMapFrame" data-preview-map label={map.label} material="glass">
          <div className="themedMapCanvas" data-preview-map-canvas></div>
          {/* **The rows that are journeys, drawn as the renderer's own lines**
              in the rows' tones, under the place names, and named in the
              frame's list for a reader who cannot see them. */}
          {map.places.map((place) =>
            place.route ? (
              <helix-map-route
                description={place.status}
                key={`route-${place.label}`}
                label={`${place.route.from.charAt(0).toUpperCase()}${place.route.from.slice(1)} to ${place.label}`}
                /* The attribute's own syntax rather than the array the
                   property takes: this page is rendered to a string, where
                   React writes an attribute only for a string and drops an
                   array without a word. */
                points={
                  (place.route.path
                    ? place.route.path.map(([lat, lng]) => `${lat},${lng}`).join(' ')
                    : `${place.route.lat},${place.route.lng} ${place.lat},${place.lng}`) as never
                }
                tone={place.state}
              ></helix-map-route>
            ) : null,
          )}
          {/* Something on its way, moving in silence and heard by its words. */}
          {map.position ? (
            <helix-map-position
              accuracy={map.position.accuracy}
              description={map.position.description}
              heading={map.position.heading}
              label={map.position.label}
              lat={map.position.lat}
              lng={map.position.lng}
              tone={map.position.state}
            ></helix-map-position>
          ) : null}
          {map.places.map((place) => (
            <helix-map-marker
              key={place.label}
              label={place.label}
              lat={place.lat}
              lng={place.lng}
              material="glass"
              name={place.detail}
              tone={place.state}
            ></helix-map-marker>
          ))}
        </helix-map>

        {/* **Named as what the camera keeps clear**, so the frame's script
            frames the places beside the panel rather than under it, where a
            marker could take focus with nobody able to see it. */}
        <aside className="themedMapPanel" data-preview-map-clear>
          <helix-flex direction="column" gap="2xs">
            <helix-text as="h1" variant="subheading">
              {map.heading}
            </helix-text>
            <helix-text emphasis="muted" variant="caption">
              {map.lead}
            </helix-text>
          </helix-flex>
          <helix-list divided label={map.heading}>
            {map.places.map((place) => (
              <helix-list-item key={place.label}>
                {place.detail}
                <helix-text as="span" slot="description" variant="caption">
                  {place.label}
                </helix-text>
                <helix-tag emphasis="subtle" slot="end" tone={place.state}>
                  {place.status}
                </helix-tag>
              </helix-list-item>
            ))}
          </helix-list>
        </aside>
      </div>
    </div>
  )
}

/**
 * A local business's page: an announcement over everything, a hero on a
 * picture, three prices, how it goes, what people ask, and where to find it.
 *
 * **The shape of a services site**, a pool builder's or a joiner's, where the
 * marketing layout is a product's: no chart, no table, and the price on the
 * page. The hero's picture is drawn from the theme, so its words sit on
 * `surface-media` in `foreground-media`, the pair a photograph's caption uses.
 */
function LocalPage(context: Context) {
  const { company, hero, local } = context

  return (
    <div className="themedLocal">
      {/* The band the builder can color, as a site sets an announcement apart. */}
      <div className="themedLocalBar" data-band-slot>
        <helix-text variant="caption">{local.announcement}</helix-text>
      </div>

      <helix-app-header className="themedHeader">
        <helix-flex align-items="center" gap="xs" slot="start">
          <Mark mark={context.mark} />
          <helix-text variant="label">{company}</helix-text>
        </helix-flex>
        <helix-flex align-items="center" gap="xs" slot="end">
          <helix-button emphasis="solid" tone="primary">
            {local.contact.heading}
          </helix-button>
        </helix-flex>
      </helix-app-header>

      <section className="themedLocalHero">
        <helix-flex align-items="center" direction="column" gap="lg">
          <helix-text as="h1" variant="display">
            {hero.headline}
          </helix-text>
          <helix-button data-density="lg" emphasis="solid" tone="primary">
            {hero.primary}
          </helix-button>
          <helix-flex align-items="center" className="themedLocalRating" gap="xs">
            <helix-text variant="label">{local.rating.score}</helix-text>
            <span
              aria-label={`${local.rating.score} out of 5`}
              className="themedLocalStars"
              role="img"
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <helix-icon key={star} name="star"></helix-icon>
              ))}
            </span>
            <helix-text variant="caption">{local.rating.count}</helix-text>
          </helix-flex>
        </helix-flex>
      </section>

      <section className="themedLocalSection">
        <helix-text as="h2" variant="heading">
          {local.tiersHeading}
        </helix-text>
        <helix-grid columns={3} gap="md">
          {local.tiers.map((tier) => (
            <helix-card key={tier.name}>
              <helix-flex direction="column" gap="md">
                <helix-flex direction="column" gap="2xs">
                  <helix-text as="h3" variant="title">
                    {tier.name}
                  </helix-text>
                  <helix-text className="themedLocalPrice" variant="subheading">
                    {tier.price}
                  </helix-text>
                </helix-flex>
                <ul className="themedLocalIncludes">
                  {tier.includes.map((item) => (
                    <li key={item}>
                      <helix-icon name="check"></helix-icon>
                      <helix-text variant="caption">{item}</helix-text>
                    </li>
                  ))}
                </ul>
                <helix-button emphasis="outlined">Choose {tier.name}</helix-button>
              </helix-flex>
            </helix-card>
          ))}
        </helix-grid>
      </section>

      <section className="themedLocalSection">
        <helix-text as="h2" variant="heading">
          {local.stepsHeading}
        </helix-text>
        <ol className="themedLocalSteps">
          {local.steps.map((step, at) => (
            <li key={step.title}>
              <span aria-hidden="true" className="themedLocalStepNumber">
                {at + 1}
              </span>
              <helix-flex direction="column" gap="2xs">
                <helix-text as="h3" variant="title">
                  {step.title}
                </helix-text>
                <helix-text variant="caption">{step.body}</helix-text>
              </helix-flex>
            </li>
          ))}
        </ol>
      </section>

      <section className="themedLocalSection">
        <helix-text as="h2" variant="heading">
          {local.faqHeading}
        </helix-text>
        <helix-accordion>
          {local.faq.map((item, at) => (
            <helix-accordion-item default-open={at === 0 || undefined} key={item.question}>
              <span slot="summary">{item.question}</span>
              {item.answer}
            </helix-accordion-item>
          ))}
        </helix-accordion>
      </section>

      <section className="themedLocalSection themedLocalVisit">
        <helix-card>
          <helix-flex direction="column" gap="md">
            <helix-text as="h2" variant="subheading">
              {local.visit.heading}
            </helix-text>
            <helix-text variant="caption">{local.visit.body}</helix-text>
            <helix-flex align-items="center" gap="xs">
              <helix-icon name="building"></helix-icon>
              <helix-text variant="caption">{local.visit.address}</helix-text>
            </helix-flex>
            <helix-flex align-items="center" gap="xs">
              <helix-icon name="clock"></helix-icon>
              <helix-text variant="caption">{local.visit.hours}</helix-text>
            </helix-flex>
          </helix-flex>
        </helix-card>
        <helix-card>
          <helix-flex direction="column" gap="md">
            <helix-text as="h2" variant="subheading">
              {local.contact.heading}
            </helix-text>
            <helix-input label="Name" name="name"></helix-input>
            <helix-input label="Email" name="email" type="email"></helix-input>
            <helix-textarea label="Message" name="message"></helix-textarea>
            <helix-flex>
              <helix-button emphasis="solid" tone="primary">
                {local.contact.cta}
              </helix-button>
            </helix-flex>
          </helix-flex>
        </helix-card>
      </section>

      {Footer(context)}
    </div>
  )
}

/**
 * The layouts, in the order the builder offers them, resting one first.
 *
 * Same convention as `CONTEXTS`, so neither axis has a default stated anywhere
 * but in the order of its own list, and the builder reads `[0]` for both.
 */
export const LAYOUTS: readonly {
  label: string
  render: (context: Context) => ReturnType<typeof MarketingPage>
  value: string
}[] = [
  { label: 'Marketing site', render: MarketingPage, value: 'marketing' },
  { label: 'Local business', render: LocalPage, value: 'local' },
  { label: 'Minimal', render: MinimalPage, value: 'minimal' },
  { label: 'Editorial', render: EditorialPage, value: 'editorial' },
  { label: 'Application', render: WorkspacePage, value: 'workspace' },
  { label: 'Map', render: MapPage, value: 'map' },
]

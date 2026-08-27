/**
 * What the preview shows: a page somebody would ship, at three sizes of page.
 *
 * **A palette is judged in composition, not in isolation.** An earlier version
 * was a card, a callout and a row of tags, which answers "what color is a tag"
 * and not "would I ship this". Contrast between an ink and its ground is
 * measured by the engine and reported in the audit; what a reader is here to
 * judge is the thing the audit cannot see, which is whether the palette holds
 * together across real hierarchy.
 *
 * **Two axes, because two of the answers can be true at once.** A context is
 * whose page this is and lives in `themed-contexts.tsx`; a layout is how much
 * page there is, and that is this file. A minimal storefront and a dense
 * storefront are both real arrangements, which is the area rules' own test for
 * whether something is one question or two.
 *
 * **A layout is its own markup and not the full page with parts hidden**, which
 * was the first design and the wrong one. Hiding sections from a superset makes
 * every layout carry the densest one's structure, so "minimal" would be a
 * workspace wearing `display: none` and a reader inspecting it would find an app
 * shell underneath. These are three pages. They share a vocabulary of copy and
 * nothing else.
 *
 * **What each is for:**
 *
 * - `marketing` is the full landing page, and the resting one. Header, hero,
 *   proof, features, a chart, a working detail section, a closing band and a
 *   footer, each landing on a different surface, which puts every ground in the
 *   model on screen at once rather than one at a time.
 * - `minimal` is four surfaces and a dialog. A page with room in it, where a
 *   palette has nowhere to hide behind density.
 * - `workspace` is the other end: a rail, a toolbar, statistics, a chart and a
 *   table, with no hero and no marketing bands at all. What somebody looks at
 *   for six hours rather than for six seconds.
 *
 * **A sparse layout hides axes, and that is the reader's call.** Nothing on the
 * minimal page charts anything, so a reader sitting there can move the
 * saturation and never see what it does to a series ramp; nothing there floats,
 * so `separation.floating` acts only on the dialog. That is a real cost and it
 * is not defended against, because somebody who picked "minimal" has said what
 * they are building. The audit is unaffected either way: it measures the
 * palette rather than what is displayed, so the count in the toolbar is the same
 * on all three.
 *
 * Static on purpose. A layout takes a context and holds no state, so a
 * rendering is final: every change a reader makes to the *theme* reaches it
 * through inherited custom properties rather than through React. Both axes are
 * chosen before the render rather than during it, which is why
 * `bun run themed-page` emits one string per pair and the builder posts
 * whichever is asked for.
 */
import { type Context, Mark } from './themed-contexts'

/* The pieces more than one layout renders, written once.
 *
 * A plain block rather than a doc one: it introduces the four functions under it
 * rather than documenting any of them, and a doc block sitting on another doc
 * block claims a member it does not have.
 *
 * **Extracted because two layouts render them and not because they are
 * components.** A page's footer is a page's footer, and the marketing page and
 * the minimal one disagree about everything above it and about nothing here.
 * Copying it would be two footers that drift, which on a preview means a reader
 * comparing two layouts seeing a difference the theme did not cause.
 *
 * They stay plain functions taking a context, like the layouts themselves, so
 * nothing here is a React component with props to hydrate. Called rather than
 * rendered as elements, for the same reason: this tree is serialised once and
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
      <helix-flex align="center" gap="md" justify="between" wrap>
        <helix-flex align="center" gap="xs">
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
 *
 * It also carries the scrim and the glass at a size worth looking at, where the
 * dialog shows them in a box. Between them the three axes have somewhere to
 * land: `motion` here, `material` on both, and `separation.floating` on all of
 * it.
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
 *
 * **It exists because the series ramp is a third of the palette and had nothing
 * on screen.** Twenty-four tokens rotate off the brand and not one of them
 * appeared in this preview, so a reader could move the saturation and never see
 * what it did to a chart. The minimal layout is the one page that still does
 * not have it, which is what "minimal" costs and is said out loud at the top of
 * this file.
 *
 * It reads a table, which is the whole point of the component: the accessible
 * representation is markup a consumer wrote rather than an `aria-label`
 * generated from an array. The table is clipped rather than hidden, so it stays
 * in the accessibility tree.
 *
 * Glass, so the material policy has something to act on that a reader can
 * compare against the opaque cards beside it. It is an attribute rather than
 * two custom properties because glass is a translucent ground *and* a backdrop,
 * and either alone does nothing.
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
 *
 * **Every ground in the model on screen at once**, which is what a reader is
 * here for and what the other two each give up half of. Header, hero, a
 * recessed band of proof, features, a chart, a working detail section, a
 * closing band on the brand fill and a footer: each lands on a different
 * surface, so `surface`, `surface-raised`, `surface-sunken`, `background` and
 * `primary-surface` are all comparable in one glance rather than one at a time.
 *
 * It is the resting one for that reason rather than because it came first.
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

        {/* **The header repeats the primary action, not the secondary one.**
            It carried \`hero.secondary\` to save a string, which put "Book a
            walkthrough" in the header, again as the hero's outlined button and
            a third time on the closing band: three identical words in one
            scroll, two of them solid and one outlined, reading as a page that
            could not decide. Repeating the conversion action in the header is
            what a landing page does, and it leaves the softer one said once. */}
        <helix-flex align="center" gap="xs" slot="end">
          <helix-button emphasis="ghost">Sign in</helix-button>
          <helix-button emphasis="solid" tone="primary">
            {hero.primary}
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
          <helix-flex align="center" className="themedAssurance" gap="xs">
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

      <section className="themedChart">{ChartCard(context)}</section>

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
            <helix-flex align="center" gap="sm" justify="between" wrap>
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
        <helix-flex align="center" gap="md" justify="between" wrap>
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
 *
 * **Four surfaces and a dialog**, against the marketing page's nine. The point
 * is not that it is smaller: it is that a palette has nowhere to hide. Density
 * flatters a theme, because a busy page gives the eye somewhere else to go and
 * a hierarchy that is nearly right reads as right. With a header, a hero, three
 * paragraphs and a footer, a foreground that is a little too pale against its
 * ground is the only thing on screen.
 *
 * **The features are text, not cards**, which is most of what makes this
 * different from the marketing page rather than a shorter copy of it. A card
 * puts a surface and a border between the reader and the words; three columns
 * of prose put the ink straight on the page ground, and `foreground-muted`
 * against `background` is a pair a card never shows.
 */
function MinimalPage(context: Context) {
  const { company, features, hero } = context

  return (
    <div className="themedMinimal">
      <helix-app-header className="themedHeader">
        <helix-flex align="center" gap="xs" slot="start">
          <Mark mark={context.mark} />
          <helix-text variant="label">{company}</helix-text>
        </helix-flex>

        <helix-flex align="center" gap="xs" slot="end">
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
          <helix-flex align="center" className="themedAssurance" gap="xs">
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
 *
 * **No hero, no bands, no footer**, which is the whole difference. A marketing
 * page is read once and an application is inhabited, and the palette questions
 * are not the same ones: what matters here is whether a rail reads as behind
 * the work, whether a card reads as on top of the page, and whether a status
 * tag in a dense row is still a status at a glance. None of those is asked by a
 * hero.
 *
 * **Three grounds stacked, which no other layout puts side by side.** The rail
 * is `surface-sunken`, the page is `background` and the cards are `surface`, all
 * visible at once and touching. On the marketing page the same three tokens
 * appear in bands separated by whitespace, where a ground only has to be
 * distinguishable from the one above it. Here they share edges, which is the
 * harder test and the one an application actually sets.
 *
 * **A plain `<nav>` rather than `helix-navigation`.** The component's
 * contribution is an indicator that travels to the current destination, which
 * is a row's idea: it is positioned for a horizontal set, and turning the
 * container into a column through `::part(nav)` would leave the marker
 * measuring against an axis it is not on. A rail wants a landmark and stacked
 * anchors, which is a `<nav>` and the base layer's `data-navigation-item`
 * helper, so this uses those and claims nothing it does not need.
 */
function WorkspacePage(context: Context) {
  const { action, company, figures, table } = context

  return (
    <div className="themedApp">
      <aside className="themedAppRail">
        <helix-flex align="center" gap="xs">
          <Mark mark={context.mark} />
          <helix-text variant="label">{company}</helix-text>
        </helix-flex>

        {/* **The rail says where you are.** It marked no destination at all,
            which no application does: a sidebar with three identical rows is a
            list of links rather than a place in a product. `aria-current="page"`
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
        <helix-flex align="center" className="themedAppUser" gap="xs">
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
        <helix-flex align="center" className="themedAppBar" gap="sm" justify="between" wrap>
          <helix-text as="h1" variant="subheading">
            {table.heading}
          </helix-text>
          <helix-flex align="center" gap="xs">
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
              <helix-flex align="center" gap="sm" justify="between" wrap>
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
        </section>
      </main>

      {Detail(context)}
    </div>
  )
}

/**
 * A rail, a measure, and prose.
 *
 * **The one layout that is a page of writing rather than a page of selling**,
 * and the only one whose organising idea is a margin. Every row is the same two
 * columns: a label in the rail and the text beside it, so the structure is
 * visible without a single box being drawn. Nothing here is a card, and the
 * only rule on the page is between one entry in the list and the next.
 *
 * **It is the only layout that shows two things the builder can change and no
 * other preview could.** Nothing else in this tool renders a `helix-list`, and
 * nothing else pulls `--helix-font-mono`: the rail is set in it, so the Mono
 * face control moved a preview for the first time here. A control whose effect
 * is nowhere on screen is a control a reader cannot judge, which is the same
 * argument the chart settles for the series ramp.
 *
 * **And it is the hardest test of a text palette.** A marketing page can carry
 * a weak `foreground-muted` because a card border is doing the separating; here
 * the rail is `foreground-subtle` against the page ground at the smallest size
 * on the page, with nothing else to hold it up. If a theme fails anywhere, it
 * fails visibly here first.
 *
 * **Not `helix-app-header`.** That element lays brand and navigation out as its
 * own flex row, and this masthead is two cells of the same grid every other row
 * uses, with the mark in the rail so the destinations start on the line every
 * paragraph starts on. Reaching for the element would mean fighting its
 * internal layout from outside a shadow boundary, which the area rules say
 * cannot be won.
 */
function EditorialPage(context: Context) {
  const { company, editorial } = context

  return (
    <div className="themedEditorial">
      <header className="themedRail themedMasthead">
        {/* **The mark and the name together, in the rail.** The mark alone left
            the page with no wordmark at all: a reader arriving at an editorial
            page could not tell whose it was without reading a paragraph, and
            every other layout says the name in its header. It sits in the rail
            column rather than the measure so the destinations still start on
            the line every paragraph starts on, which is the arrangement the
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
                  <helix-text as="span" slot="supporting" variant="caption">
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
  { label: 'Minimal', render: MinimalPage, value: 'minimal' },
  { label: 'Editorial', render: EditorialPage, value: 'editorial' },
  { label: 'Application', render: WorkspacePage, value: 'workspace' },
]

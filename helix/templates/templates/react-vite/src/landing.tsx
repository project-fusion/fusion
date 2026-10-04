import { roster } from './data.js'
import { DOCS } from './docs.js'
import { Link } from './routes.js'

/**
 * **A locale named, so the number reads the same everywhere.**
 * `toLocaleString()` with no argument reads the machine's locale: the server's
 * in the Next.js template, and the browser's in both. The same number is then
 * grouped two ways, and the markup React hydrates does not match the markup it
 * rendered.
 */
const figure = new Intl.NumberFormat('en-US')

/**
 * The first screen, and the only page here about the starter itself.
 *
 * Delete it once you know your way around: nothing else imports it, and the
 * route it answers becomes yours.
 *
 * **The heading says what this is, and the project's name stays in the bar.**
 * A scaffold called `my-app` opening on an `<h1>my-app</h1>` repeats what you
 * typed thirty seconds ago, in the loudest line on the page.
 *
 * **The calls to action are anchors.** A button that navigates is a link
 * dressed as a button, and the two are different things to a keyboard and to
 * a screen reader. The base stylesheet styles an anchor that asks with
 * `data-button`, so a link can look like one and stay a link.
 */
export function Landing() {
  return (
    <div className="stack">
      <header className="first-screen">
        <div className="hero">
          <helix-text emphasis="muted" variant="label">
            Helix starter
          </helix-text>
          <helix-text as="h1">Every tag on this page is Helix</helix-text>
          <helix-text as="p" className="lede" emphasis="muted" variant="body">
            The tags are the library's own elements, and every color, size, and space inside them
            comes from one set of tokens. The three routes are yours.
          </helix-text>
          <div className="actions">
            <Link data-button="solid" data-button-tone="primary" href="/overview">
              See the data view
            </Link>
            <Link data-button href="/join">
              Open the form
            </Link>
          </div>
        </div>

        {/* **The library at work, on the first screen.** The figures are the
            roster the data view draws, read from the same module, so the panel
            is the app itself. `helix-stat` sets the number on the display face
            at a size the type scale does not reach, the one place on a page
            where the number is the design. */}
        <helix-card className="specimen" separation="outlined">
          <helix-text as="h2" slot="header" variant="title">
            The roster, in three figures
          </helix-text>
          <helix-stat-group divided>
            <helix-stat>
              {roster.people}
              <span slot="label">People</span>
            </helix-stat>
            <helix-stat>
              {roster.teams}
              <span slot="label">Teams</span>
            </helix-stat>
            <helix-stat>
              {figure.format(roster.reviews)}
              <span slot="label">Reviews</span>
            </helix-stat>
          </helix-stat-group>
          <Link data-link href="/overview" slot="footer">
            Open the data view
          </Link>
        </helix-card>
      </header>

      <section className="section">
        <helix-text as="h2" variant="subheading">
          What you have
        </helix-text>
        {/* Three paragraphs about one installed thing, so they take a rule each
            and no box. `app.css` says why at more length. */}
        <div className="facts">
          <article className="fact">
            <helix-text as="h3" variant="title">
              Custom elements
            </helix-text>
            <helix-text as="p" emphasis="muted" variant="body">
              You write the tags directly, with no import per component to keep in step. One line
              in <helix-code>src/main.tsx</helix-code> registers all of
              them, and a subpath like <helix-code>@fusion.dev/helix/tabs</helix-code> registers
              one.
            </helix-text>
            <a data-link href={DOCS.elements}>
              Using the elements
            </a>
          </article>

          <article className="fact">
            <helix-text as="h3" variant="title">
              One set of tokens
            </helix-text>
            <helix-text as="p" emphasis="muted" variant="body">
              Every color is written once as a light and dark pair, so the control in the bar
              switches the whole page by setting one attribute on the root. Type, spacing, radii,
              and control sizes come from the same place.
            </helix-text>
            <a data-link href={DOCS.tokens}>
              Tokens
            </a>
          </article>

          <article className="fact">
            <helix-text as="h3" variant="title">
              A short stylesheet
            </helix-text>
            <helix-text as="p" emphasis="muted" variant="body">
              <helix-code>src/app.css</helix-code> holds the page's measure and the rhythm between
              its blocks. Where a component leaves a decision open, it names a part: the data view
              names one for the rows you tick, and the stylesheet paints them.
            </helix-text>
            <a data-link href={DOCS.parts}>
              Overriding a component
            </a>
          </article>
        </div>
      </section>

      <section className="section">
        <helix-text as="h2" variant="subheading">
          Where to go next
        </helix-text>
        {/* **The whole card is the link, which is what `data-card` is for.** A
            card with an anchor in its footer gives you a target the size of
            three words inside a box the size of a paragraph, and the box is
            what you aim at. The base layer draws the ring, moves the card's
            border to the brand on hover, and leaves focus alone. Nothing inside
            may be interactive, since a link inside a link is neither valid nor
            reachable. */}
        <helix-grid columns={2} gap="md">
          <Link data-card href="/overview">
            <helix-card separation="outlined">
              {/* The route beside the name, on one baseline in the header, so a
                  row of cards stretched to a common height has nothing
                  floating in the middle. */}
              <helix-flex align-items="baseline" gap="sm" justify-content="between" slot="header">
                <helix-text as="h3" variant="title">
                  The data view
                </helix-text>
                <helix-text emphasis="subtle" variant="code">
                  /overview
                </helix-text>
              </helix-flex>
              <helix-text as="p" emphasis="muted" variant="body">
                Twelve people from a local module, sorted, paged, and selected with nothing wired
                up. The columns are markup you can read and the rows are one property, which keeps
                the same component working at ten thousand rows.
              </helix-text>
            </helix-card>
          </Link>

          <Link data-card href="/join">
            <helix-card separation="outlined">
              <helix-flex align-items="baseline" gap="sm" justify-content="between" slot="header">
                <helix-text as="h3" variant="title">
                  The form
                </helix-text>
                <helix-text emphasis="subtle" variant="code">
                  /join
                </helix-text>
              </helix-flex>
              <helix-text as="p" emphasis="muted" variant="body">
                Five controls a <helix-code>&lt;form&gt;</helix-code> reads with{' '}
                <helix-code>FormData</helix-code>, because every one of them is a real form
                participant. The email field's error message comes from the browser.
              </helix-text>
            </helix-card>
          </Link>
        </helix-grid>
      </section>
    </div>
  )
}

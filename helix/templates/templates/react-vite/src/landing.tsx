import { DOCS } from './docs.js'
import { Link } from './routes.js'

/**
 * The first screen, and the only page here that is about the starter rather
 * than built out of it.
 *
 * Delete it once you know your way around: nothing else imports it, and the
 * route it answers becomes yours.
 *
 * **Anchors, not a `Button` with an `href`.** A button that navigates is a link
 * wearing a button's clothes, and the two are different things to a keyboard and
 * to a screen reader. The base stylesheet styles an anchor that asks with
 * `data-button`, so a link can look like one without being one.
 */
export function Landing() {
  return (
    <div className="stack">
      <header className="hero">
        <helix-text as="h1">__PROJECT_NAME__</helix-text>
        <helix-text as="p" className="lede" emphasis="muted" variant="body">
          Helix is installed and running. Every tag on this page is one of its elements, and every
          color, size and space inside them comes from one set of tokens.
        </helix-text>
        <div className="actions">
          <Link data-button="solid" data-button-tone="primary" href="/overview">
            See the data view
          </Link>
          <Link data-button href="/join">
            Open the form
          </Link>
        </div>
      </header>

      <section className="section">
        <helix-text as="h2" variant="subheading">
          What you have
        </helix-text>
        {/* **`columns` and a media query, rather than `min`.** `min` fits as many
            columns as the room allows and needs no breakpoint, and it is applied
            from JavaScript, so a server-rendered grid is one column until the
            element upgrades and then jumps to three. A fixed count is plain CSS
            and is already right in the served markup. `app.css` states the one
            departure: below 48rem there is room for a single column. */}
        <helix-grid columns={3} gap="md">
          <helix-card separation="outlined">
            <helix-text as="h3" slot="header" variant="title">
              Elements, not wrappers
            </helix-text>
            <helix-text as="p" emphasis="muted" variant="body">
              They are custom elements, so you write the tags and there is no per-component import
              to keep in step. One line in <helix-code>src/main.tsx</helix-code>{' '}
              registers all of them, and a subpath like{' '}
              <helix-code>@fusion.dev/helix/tabs</helix-code> registers one.
            </helix-text>
            <a data-link href={DOCS.elements} slot="footer">
              Using the elements
            </a>
          </helix-card>

          <helix-card separation="outlined">
            <helix-text as="h3" slot="header" variant="title">
              One set of tokens
            </helix-text>
            <helix-text as="p" emphasis="muted" variant="body">
              Every color is written once as a light and dark pair, so the control in the bar moves
              the whole page by setting a single attribute on the root. Type, spacing, radii and
              control sizes come from the same place.
            </helix-text>
            <a data-link href={DOCS.tokens} slot="footer">
              Tokens
            </a>
          </helix-card>

          <helix-card separation="outlined">
            <helix-text as="h3" slot="header" variant="title">
              A short stylesheet
            </helix-text>
            <helix-text as="p" emphasis="muted" variant="body">
              <helix-code>src/app.css</helix-code> holds this page's measure, the rhythm between its
              blocks, and nothing a component already draws. Where a component leaves a decision
              open it names a part: the data view reaches one to paint the row you tick.
            </helix-text>
            <a data-link href={DOCS.parts} slot="footer">
              Overriding a component
            </a>
          </helix-card>
        </helix-grid>
      </section>

      <section className="section">
        <helix-text as="h2" variant="subheading">
          The other two pages
        </helix-text>
        <helix-grid columns={2} gap="md">
          <helix-card separation="outlined">
            <helix-text as="h3" slot="header" variant="title">
              A data view
            </helix-text>
            <helix-text as="p" emphasis="muted" variant="body">
              Twelve people from a local module, sorted, paged and selected with nothing wired up.
              The columns are markup you can read and the rows are one property, which is what keeps
              the same component working at ten thousand.
            </helix-text>
            <Link data-link href="/overview" slot="footer">
              Open the overview
            </Link>
          </helix-card>

          <helix-card separation="outlined">
            <helix-text as="h3" slot="header" variant="title">
              A form the platform reads
            </helix-text>
            <helix-text as="p" emphasis="muted" variant="body">
              Every control is form-associated, so <helix-code>FormData</helix-code> collects the
              answers and the email field's complaint is the browser's own. The submit shows exactly
              what a server would have received.
            </helix-text>
            <Link data-link href="/join" slot="footer">
              Open the form
            </Link>
          </helix-card>
        </helix-grid>
      </section>

      <footer className="closing">
        <helix-text as="p" emphasis="muted" variant="body">
          Every component, with its API, its parts and its examples, is in{' '}
          <a data-link href={DOCS.gallery}>
            the gallery
          </a>
          . What React in particular does with these elements has{' '}
          <a data-link href={DOCS.react}>
            a page of its own
          </a>
          .
        </helix-text>
      </footer>
    </div>
  )
}

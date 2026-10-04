import Link from 'next/link'
import { roster } from './data'
import { DOCS } from './docs'

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
 * **The calls to action are anchors.** A button that navigates is a link
 * dressed as a button, and the two are different things to a keyboard and to
 * a screen reader. The base stylesheet styles an anchor that asks with
 * `data-button`, so a link can look like one and stay a link.
 */
export function Landing() {
  return (
    <div className="stack">
      <header className="first-screen">
        {/* **The light behind the first screen**: a helix, drawn by the library
            in the theme's colors, so a new brand color relights it. It shows
            one still frame where motion is reduced, and a gradient where the
            browser draws without a GPU. */}
        <helix-aura className="first-light" data-layer speed={0.4} terminus={0.8} variant="braid" />
        <div className="hero">
          <helix-tag emphasis="subtle" tone="primary">
            Starter
          </helix-tag>
          <helix-text as="h1" variant="display">
            Helix design system
          </helix-text>
          <helix-text as="p" className="lede" variant="body">
            Web components in your brand's colors, drawn from one set of tokens.
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
            is the app itself, on glass over the light. */}
        <helix-card className="specimen" material="glass" separation="outlined">
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
        {/* **Each tile is a link, which is what `data-card` is for.** The base
            layer draws the ring, moves the card's border to the brand on hover,
            and leaves focus alone. Nothing inside may be interactive, since a
            link inside a link is neither valid nor reachable. */}
        <div className="features">
          <a className="feature" data-card href={DOCS.elements}>
            <helix-card separation="outlined">
              <span className="feature-mark">
                <helix-icon name="cube" />
              </span>
              <helix-text as="h3" variant="title">
                Custom elements
              </helix-text>
              <helix-text as="p" emphasis="muted" variant="body">
                One import in <helix-code>app/helix-elements.tsx</helix-code> registers every tag.
              </helix-text>
            </helix-card>
          </a>
          <a className="feature" data-card href={DOCS.tokens}>
            <helix-card separation="outlined">
              <span className="feature-mark">
                <helix-icon name="palette" />
              </span>
              <helix-text as="h3" variant="title">
                One set of tokens
              </helix-text>
              <helix-text as="p" emphasis="muted" variant="body">
                Every color, size, and space, in light and dark.
              </helix-text>
            </helix-card>
          </a>
          <a className="feature" data-card href={DOCS.parts}>
            <helix-card separation="outlined">
              <span className="feature-mark">
                <helix-icon name="sliders-horizontal" />
              </span>
              <helix-text as="h3" variant="title">
                Parts to style
              </helix-text>
              <helix-text as="p" emphasis="muted" variant="body">
                Reach inside a component with <helix-code>::part()</helix-code>.
              </helix-text>
            </helix-card>
          </a>
        </div>
      </section>
    </div>
  )
}

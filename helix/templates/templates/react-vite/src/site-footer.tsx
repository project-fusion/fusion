import { DOCS } from './docs.js'

/**
 * The bar's counterpart, on every route.
 *
 * **It puts a floor under the content.** The overview is a heading, a table,
 * and a caption, which on a tall window left the bottom third of the screen
 * empty, as if the layout had run out. The footer is also where the links you
 * want once belong, so the landing page no longer carries them.
 *
 * `data-link="subtle"` reads as body text until it is hovered, which suits a
 * row of links under a rule.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-row">
        <helix-text as="p" emphasis="subtle" variant="caption">
          Every component here has a page, with its API, its parts, and its examples.
        </helix-text>
        <div className="footer-links">
          <a data-link="subtle" href={DOCS.gallery}>
            Components
          </a>
          <a data-link="subtle" href={DOCS.elements}>
            Documentation
          </a>
          <a data-link="subtle" href={DOCS.react}>
            React
          </a>
        </div>
      </div>
    </footer>
  )
}

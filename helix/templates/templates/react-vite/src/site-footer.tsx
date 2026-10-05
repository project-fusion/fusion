import { DOCS } from './docs.js'

/**
 * The bar's counterpart, on every route.
 *
 * **It puts a floor under the content.** The overview is a heading, a table,
 * and a caption, which on a tall window left the bottom third of the screen
 * empty, as if the layout had run out. The footer is also where the links you
 * want once belong, so the landing page no longer carries them.
 *
 * `data-link="quiet"` sets a link in the muted ink with no underline, and it
 * takes the foreground on hover, which suits a row of links under a rule.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-row">
        <div className="footer-links">
          <a data-link="quiet" href={DOCS.gallery}>
            Components
          </a>
          <a data-link="quiet" href={DOCS.elements}>
            Documentation
          </a>
          <a data-link="quiet" href={DOCS.react}>
            React
          </a>
        </div>
      </div>
    </footer>
  )
}

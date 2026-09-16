import { DOCS } from './docs'

/**
 * The bar's counterpart, on every route.
 *
 * **It is here so that a page ends rather than stops.** The overview is a
 * heading, a table and a caption, which on a tall window left the bottom third
 * of the screen empty and read as a layout that had run out. A footer is the
 * ordinary answer: it puts a floor under the content, and it is where the links
 * a reader wants once rather than constantly belong, which is why the landing
 * page no longer carries them itself.
 *
 * `data-link="subtle"` reads as body text until it is hovered, which is what a
 * row of links under a rule should do: they are a destination, not a sentence
 * asking to be read.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-row">
        <helix-text as="p" emphasis="subtle" variant="caption">
          Every component in here, with its API, its parts and its examples, has a page.
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

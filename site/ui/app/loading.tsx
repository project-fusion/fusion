import styles from './loading.module.css'

/**
 * What every route falls back to while its server render is in flight.
 *
 * **The generic one, and deliberately the least specific thing here.** A
 * `loading.tsx` beside a page wraps that page in a Suspense boundary, and the
 * nearest one wins, so a route with a skeleton of its own never reaches this.
 * What it covers is everything with no skeleton written for it: the tools, and
 * any route added later before somebody has thought about its shape.
 *
 * **A skeleton is a promise about a layout and this file cannot make one.** It
 * stands in for pages it has never seen, so drawing boxes here would be drawing
 * boxes that do not match, and a stand-in that lies about the shape is worse
 * than one that admits it is only saying "working". A pulse says exactly that
 * and nothing more, and `pulse` is what the design system has already settled an
 * indeterminate wait looks like: it is `helix-loader`'s only variant.
 *
 * **Drawn by the document rather than by `helix-loader`, and that is not a
 * preference.** `elements.css` hides every Helix tag with `visibility: hidden`
 * until it upgrades, so a loading state built from one is invisible until the
 * bundle it is waiting for has landed and registered it: absent from exactly the
 * window it exists to fill, and present only on client navigations where the
 * definitions were already there. A loading state may not depend on the
 * JavaScript it is waiting for. The recipe in `site.css` copies the component's
 * values so the two read alike wherever both appear.
 *
 * **It does not appear for a quarter of a second**, which is most of what makes
 * it usable. Next shows a loading boundary the instant a navigation starts, and
 * measured warm in development the four dynamic routes answer in 35, 88, 181 and
 * 588ms: on three of those a loader that rendered immediately would be a flash
 * with no information in it, read as jank rather than as feedback. The delay is
 * in CSS rather than in a timer because it costs no JavaScript and cannot be
 * left running by a navigation that finished first.
 */
export default function Loading() {
  return (
    <div className={styles.loading}>
      <div data-pulse />
    </div>
  )
}

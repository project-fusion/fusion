import Link from 'next/link'
import styles from './trouble.module.css'

/**
 * The 404's body, rendered by two files because Next needs two.
 *
 * **`app/not-found.tsx` answers a URL that matched no route, and
 * `app/(site)/not-found.tsx` answers `notFound()` thrown inside the group.**
 * Measured against the running server rather than assumed: an unmatched address
 * returns 404 and never reaches the group's file, so a single copy under
 * `(site)` left every mistyped URL on the framework's own black-and-white page.
 * A single copy at the root would answer both and lose the nav and the footer on
 * the one page whose whole job is offering a way onward, since that chrome is
 * the group layout's and the root file renders above it.
 *
 * **The status differs between the two and that is the framework's**, not a
 * defect: an unmatched URL is 404, and a `notFound()` inside a streamed response
 * is 200, because the status is written before the stream opens. It is worth
 * knowing before somebody reports the second one as a bug.
 */
export function NotFoundBody() {
  return (
    <div className={styles.trouble}>
      <p className={styles.troubleKicker}>404</p>
      <h1 className={styles.troubleTitle}>That page is not here.</h1>
      <p className={styles.troubleLede}>
        The link may be old, or the address may have a typo in it. Nothing has been deleted to make
        this happen: we keep the writing and the component reference where they were.
      </p>

      <div className={styles.troubleWays}>
        <Link data-link="quiet" href="/">
          Front page
        </Link>
        <Link data-link="quiet" href="/helix">
          Helix
        </Link>
        <Link data-link="quiet" href="/insights">
          Writing
        </Link>
      </div>
    </div>
  )
}

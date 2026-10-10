import { fusion } from '@fusion.dev/helix-icons'
import mark from '@/components/fusion-mark/fusion-mark.module.css'
import styles from './loading.module.css'

/**
 * What a reader waits in front of.
 *
 * **The mark rather than a dot.** A bare `data-pulse` reads as a spinner on any
 * site and identifies this one as none. The mark the masthead already uses says
 * whose page is arriving, and the wait is short enough that a
 * second thing to look at would be noise: no copy, no progress, one mark
 * breathing.
 *
 * **Drawn in plain markup, with no Helix element in it.** This shows in place
 * of everything under the root layout, the site layout included, and the site
 * layout is where Helix registers its elements. Every Helix tag is hidden until
 * it upgrades, so the `Wordmark` this used drew nothing on a cold load: a blank
 * page for as long as the wait lasted. The mark is the same `fusion` icon
 * `helix-icon` draws, in its own `<svg>`, and the name is set as the
 * masthead's `Wordmark` sets it.
 */
export default function Loading() {
  return (
    <>
      <div className={styles.loading}>
        <div className={styles.loadingMark}>
          <span className={styles.lockup}>
            <svg
              aria-hidden="true"
              className={`${mark.mark} ${styles.mark}`}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: the icon package's own markup, built from its source
              dangerouslySetInnerHTML={{ __html: fusion.content }}
              viewBox={fusion.viewBox}
            />
            <span className={styles.name}>Fusion</span>
          </span>
        </div>
      </div>

      <p data-hidden-visually role="status">
        Loading
      </p>
    </>
  )
}

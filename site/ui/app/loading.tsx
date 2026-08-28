import { Wordmark } from '@/components/wordmark/wordmark'
import styles from './loading.module.css'

/**
 * What a reader waits in front of.
 *
 * **A dot said nothing.** The old one was a bare `data-pulse`, which reads as a
 * spinner on any site and identifies this one as none. The mark the masthead
 * already uses says whose page is arriving, and the wait is short enough that a
 * second thing to look at would be noise: no copy, no progress, one mark
 * breathing.
 */
export default function Loading() {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingMark}>
        <Wordmark size="2.5rem" />
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import styles from './section-title.module.css'

/**
 * A band's heading.
 *
 * Always an `h2`: every band on the landing page is a peer section under the
 * page's one `h1`, so the level is a property of the shape rather than a choice
 * at the call site.
 */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className={styles.sectionTitle}>{children}</h2>
}

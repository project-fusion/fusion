import type { ReactNode } from 'react'
import styles from './claim.module.css'

/**
 * A sentence carrying weight on its own, set heavier than the lede around it.
 */
export function Claim({ children }: { children: ReactNode }) {
  return <p className={styles.claim}>{children}</p>
}

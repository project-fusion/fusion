import type { ReactNode } from 'react'
import styles from './lede.module.css'

/**
 * The size the argument is made at, under a band's heading.
 */
export function Lede({ children }: { children: ReactNode }) {
  return <p className={styles.lede}>{children}</p>
}

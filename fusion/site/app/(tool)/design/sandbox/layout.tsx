import type { ReactNode } from 'react'
import styles from '../tool-shell.module.css'

/**
 * The sandbox owns the whole viewport.
 *
 * No site header and no centered column: this is a tool, and every row of chrome
 * around it is a row taken from the thing being examined.
 */
export default function SandboxLayout({ children }: { children: ReactNode }) {
  return <div className={styles.sandboxShell}>{children}</div>
}

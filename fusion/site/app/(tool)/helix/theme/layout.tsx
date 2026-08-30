import type { ReactNode } from 'react'
import styles from '../workbench.module.css'

/**
 * The theme builder owns the whole viewport, as the sandbox does.
 *
 * The same `sandboxShell` rather than a shell of its own: both are tools, both
 * are a fixed header over a splitter that takes the rest, and two class names
 * for one arrangement is two places to change it. What differs between the two
 * tools is what goes in the panes, which is not a layout question.
 */
export default function ThemeLayout({ children }: { children: ReactNode }) {
  return <div className={styles.sandboxShell}>{children}</div>
}

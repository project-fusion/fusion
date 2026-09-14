import type { ReactNode } from 'react'
import { DocsNav } from '@/components/docs-nav/docs-nav'
import { helixNavigation } from '@/content/helix-nav/helix-nav'
import styles from './docs-shell.module.css'

/**
 * The two-column shell the reference pages and the prose pages both sit in.
 */
export function DocsShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.docsShell}>
      <DocsNav sections={helixNavigation()} />
      {children}
    </div>
  )
}

export { styles as docsShell }

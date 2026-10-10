import type { ReactNode } from 'react'
import { DocsNav } from '@/components/docs-nav/docs-nav'
import { helixNavigation } from '@/content/helix-nav/helix-nav'
import styles from './docs-shell.module.css'

/**
 * The two-column shell the reference pages and the prose pages both sit in.
 */
export function DocsShell({
  children,
  path,
}: {
  children: ReactNode
  /** The page the rail marks current, where it is not the address. */
  path?: string | undefined
}) {
  return (
    <div className={styles.docsShell}>
      <DocsNav path={path} sections={helixNavigation()} />
      {children}
    </div>
  )
}

export { styles as docsShell }

import { navigation } from '@helix-io/docs'
import type { ReactNode } from 'react'
import styles from '../components/docs.module.css'
import { DocsNav } from './docs-nav'

/**
 * The shell every documentation page sits in.
 *
 * A layout above the `[slug]` segment, for the reason the component rail's
 * layout gives at length: a layout inside a dynamic segment is keyed by that
 * segment's value, so it remounts on every navigation and a branch a reader
 * collapsed comes back open. One directory up it wraps every page and none of
 * them, so the tree keeps its identity and the state a reader set stays set.
 *
 * It borrows `docs.module.css` from the component pages rather than growing a
 * second copy of a two-column shell. The day the two shells genuinely differ is
 * the day to split it.
 */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.docsShell}>
      <DocsNav sections={navigation()} />
      {children}
    </div>
  )
}

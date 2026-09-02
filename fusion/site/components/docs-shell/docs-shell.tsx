import type { ReactNode } from 'react'
import { DocsNav } from '@/app/(site)/helix/docs-nav'
import { helixNavigation } from '@/content/helix-nav/helix-nav'
import styles from './docs-shell.module.css'

/**
 * The two-column shell the reference pages and the prose pages both sit in.
 *
 * **Rendered from a layout, never from a page**, because the nav has state a
 * reader owns. Rendered from the page, Next tears it down and builds it again on
 * every navigation, so a reader who collapsed the Components branch finds it
 * open again the moment they open a component. A layout stays mounted across the
 * routes it wraps, so the tree keeps its identity and nothing has to be stored.
 *
 * The layout also has to sit *above* the dynamic segment: one inside `[family]`
 * is keyed by that segment's value, so a different family is a different
 * instance and the tree is rebuilt exactly as before.
 *
 * That is why `DocsNav` reads the route itself rather than taking a prop: the
 * layout is not handed the family, and not being handed it is the point.
 *
 * **Both shells were the same three lines**, in two layouts, one importing the
 * other's stylesheet under a comment saying the day they genuinely differ is the
 * day to split it. They never did.
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

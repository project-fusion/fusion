import type { ReactNode } from 'react'
import styles from './filter-bar.module.css'

/**
 * The bar of filters between a hero and the grid it filters.
 *
 * **Dense by nature**, which is the rule app header and toolbar already follow:
 * a bar of filters over a grid is chrome, and a control in it takes its height
 * from the region rather than asking for one.
 *
 * The shell is here rather than at the call sites because the loading states
 * had drifted from it: they rendered the bar without `data-shell`, so a
 * skeleton control sat flush against the window while the control it stood in
 * for was inset by `--site-inset`, and the row jumped sideways when the real
 * bar arrived.
 */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className={styles.filterBar}>
      <helix-flex
        align="center"
        className={styles.filterBarInner}
        data-density="sm"
        data-shell
        gap="md"
        justify="between"
        wrap
      >
        {children}
      </helix-flex>
    </div>
  )
}

export { styles as filterBar }

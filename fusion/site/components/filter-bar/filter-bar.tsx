import type { ReactNode } from 'react'
import styles from './filter-bar.module.css'

/**
 * The bar of filters between a hero and the grid it filters.
 *
 * **Dense by nature**, which is the rule app header and toolbar already follow:
 * a bar of filters over a grid is chrome, and a control in it takes its height
 * from the region rather than asking for one.
 */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className={styles.filterBar}>
      <helix-flex
        align-items="center"
        className={styles.filterBarInner}
        data-density="sm"
        data-shell
        gap="md"
        justify-content="between"
        wrap
      >
        {children}
      </helix-flex>
    </div>
  )
}

export { styles as filterBar }

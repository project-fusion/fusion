import type { ReactNode } from 'react'
import styles from './grid-band.module.css'

/**
 * The field of cards under a filter bar.
 *
 * `data-filtered-grid` is the hook the filtering reaches for: each browser
 * renders a `<style>` that hides `[data-filtered-grid] [data-slug="…"]` for
 * everything filtered out, so the mark stays whatever the class names hash to.
 */
export function GridBand({ children }: { children: ReactNode }) {
  return (
    <div className={styles.gridBand} data-filtered-grid data-shell>
      {children}
    </div>
  )
}

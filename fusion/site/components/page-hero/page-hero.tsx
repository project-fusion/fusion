import type { ReactNode } from 'react'
import styles from './page-hero.module.css'

/**
 * The band at the top of a browsing page: the gallery, the insights index, the
 * services page.
 *
 * It runs up behind the masthead and lines up with it rather than with the
 * prose column, which is why the inset is the sheet's business and not the
 * caller's.
 *
 * `shell="plain"` is for a hero that brings its own column. Services does; the
 * two browsers and their loading states take the centered one, which is the
 * default because four of the five callers want it.
 *
 * `backdrop` is what is drawn behind that column rather than inside it: the
 * gallery's lit lattice, the insights aura. It is a separate slot because the
 * section positions and isolates itself for exactly this, and a backdrop that
 * went in with the children would be laid out as one of them.
 */
export function PageHero({
  backdrop,
  children,
  className,
  shell = 'column',
}: {
  backdrop?: ReactNode | undefined
  children: ReactNode
  className?: string | undefined
  shell?: 'column' | 'plain'
}) {
  return (
    <section className={className ? `${styles.pageHero} ${className}` : styles.pageHero}>
      {backdrop}
      {shell === 'plain' ? (
        children
      ) : (
        <helix-flex align="center" className={styles.pageHeroInner} direction="column" gap="lg">
          {children}
        </helix-flex>
      )}
    </section>
  )
}

export { styles as pageHero }

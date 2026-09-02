import type { ReactNode } from 'react'
import styles from './page-hero.module.css'

/**
 * The band at the top of a browsing page: the gallery, the insights index, the
 * services page.
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

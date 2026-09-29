import type { ReactNode } from 'react'
import styles from './band.module.css'

/**
 * A section holding one card on the field, which is what the landing page is
 * made of and what `services` builds by hand.
 */
export function Band({
  card = true,
  children,
  id,
  shell = 'flex',
  wide,
}: {
  /** Whether the shell holds one glass card, which is the usual shape. */
  card?: boolean
  children: ReactNode
  id?: string | undefined
  shell?: 'flex' | 'plain'
  wide?: boolean | undefined
}) {
  const inner = card ? (
    <div className={styles.bandCard} data-material="glass" data-substrate>
      {children}
    </div>
  ) : (
    children
  )
  return (
    <section
      className={wide ? `${styles.showcaseBand} ${styles.fieldBand}` : styles.fieldBand}
      data-band
      id={id}
    >
      {shell === 'plain' ? (
        <div data-shell>{inner}</div>
      ) : (
        <helix-flex data-shell direction="column">
          {inner}
        </helix-flex>
      )}
    </section>
  )
}

export { styles as band }

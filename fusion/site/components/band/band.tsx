import type { ReactNode } from 'react'
import styles from './band.module.css'

/**
 * A section holding one card on the field, which is what the landing page is
 * made of and what `services` builds by hand.
 *
 * **The component owns the section, the shell and the card**, because those
 * three were repeated at every call site and the styles for them were reaching
 * across files to find each other. What goes inside is the caller's, and the
 * layout pieces for it are `bandSection`, `bandRow`, `bandCell` and `bandSplit`
 * on this sheet.
 *
 * `shell` is `plain` where the card holds its own grid and a flex column would
 * be a second opinion about the same axis. `wide` is the showcase, which is the
 * one band that sizes to its content rather than to the measure.
 */
export function Band({
  children,
  id,
  shell = 'flex',
  wide,
}: {
  children: ReactNode
  id?: string | undefined
  shell?: 'flex' | 'plain'
  wide?: boolean | undefined
}) {
  const card = (
    <div className={styles.bandCard} data-material="glass" data-substrate>
      {children}
    </div>
  )
  return (
    <section
      className={wide ? `${styles.showcaseBand} ${styles.fieldBand}` : styles.fieldBand}
      data-band
      id={id}
    >
      {shell === 'plain' ? (
        <div data-shell>{card}</div>
      ) : (
        <helix-flex data-shell direction="column">
          {card}
        </helix-flex>
      )}
    </section>
  )
}

export { styles as band }

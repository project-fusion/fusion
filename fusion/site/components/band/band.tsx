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
  card = true,
  children,
  id,
  reveal,
  shell = 'flex',
  wide,
}: {
  /** Whether the shell holds one glass card, which is the usual shape. */
  card?: boolean
  children: ReactNode
  id?: string | undefined
  /** Marks the band for `RevealOnScroll`. */
  reveal?: boolean | undefined
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
      {...(reveal ? { 'data-reveal': true } : {})}
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

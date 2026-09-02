import styles from './fusion-mark.module.css'

/**
 * The Fusion mark, carrying its own gradient.
 *
 * The stops are the mark's, not the wordmark's and not the footer's: both drew
 * the glyph and both reached for the same three custom properties, which is a
 * component that had not been written yet.
 *
 * `label` names it for a reader who cannot see it. Pass one where the mark
 * stands alone, and leave it off where words beside it already say Fusion —
 * `Wordmark` does exactly that.
 */
export function FusionMark({ label, size = '1.5rem' }: { label?: string; size?: string }) {
  return (
    <helix-icon
      className={styles.mark}
      name="fusion"
      style={{ '--icon-size': size }}
      {...(label === undefined ? {} : { label })}
    />
  )
}

import styles from './fusion-mark.module.css'

/**
 * The Fusion mark, carrying its own gradient.
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

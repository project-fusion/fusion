import styles from './fusion-mark.module.css'

/**
 * The Fusion mark.
 *
 * **Two cuts of one drawing.** The `fusion` icon is the small cut, whose rings
 * are few and thick enough to hold at 16px. `detail` is the full mark, whose thin
 * outer rings blur together at small sizes, for the art it is drawn large in,
 * which says nothing a reader needs.
 */
export function FusionMark({
  detail = false,
  label,
  size = '1.5rem',
}: {
  detail?: boolean
  label?: string
  size?: string
}) {
  if (detail) {
    return (
      <svg
        aria-hidden="true"
        className={styles.mark}
        fill="currentColor"
        height={size}
        viewBox="0 0 100 100"
        width={size}
      >
        <g transform="rotate(-30 50 50)">
          <path d="M52.5 8.074A42 42 0 0 1 52.5 91.926L52.5 67.826A18 18 0 0 0 52.5 32.174Z" />
          <path d="M47.5 8.074A42 42 0 0 0 47.5 91.926L47.5 89.922A40 40 0 0 1 47.5 10.078Z" />
          <path d="M47.5 15.089A35 35 0 0 0 47.5 84.911L47.5 80.899A31 31 0 0 1 47.5 19.101Z" />
          <path
            d="M47.5 24.12A26 26 0 0 0 47.5 75.88L47.5 67.826A18 18 0 0 1 47.5 32.174Z"
            fill="var(--helix-color-accent)"
          />
        </g>
      </svg>
    )
  }
  return (
    <helix-icon
      className={styles.mark}
      name="fusion"
      style={{ '--icon-size': size }}
      {...(label === undefined ? {} : { label })}
    />
  )
}

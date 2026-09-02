import Link from 'next/link'
import styles from './news-kicker.module.css'

/**
 * The news pill above the headline.
 */
export const NewsKicker = ({
  href,
  label,
  text,
}: {
  href: string
  label: string
  text: string
}) => (
  <Link className={styles.kicker} href={href}>
    <span className={styles.kickerBadge}>{label}</span>
    <span className={styles.kickerText}>{text}</span>
    {/* Decorative: the link's own text already says where it goes. */}
    <span aria-hidden="true" className={styles.kickerArrow}>
      →
    </span>
  </Link>
)

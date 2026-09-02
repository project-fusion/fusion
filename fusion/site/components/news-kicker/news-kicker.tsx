import Link from 'next/link'
import styles from './news-kicker.module.css'

/**
 * The news pill above the headline.
 *
 * **One line of news is a claim that the thing is alive.** A landing page says
 * what a product is; this says somebody shipped something recently, which is a
 * different and harder claim to fake. It is the first element in the hero
 * because it is the cheapest to read and the only one with a date behind it.
 *
 * A link rather than a decoration. A pill that says news and goes nowhere is
 * worse than no pill.
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

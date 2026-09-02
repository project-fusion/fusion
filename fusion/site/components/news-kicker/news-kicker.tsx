import Link from 'next/link'
import landing from '@/components/landing.module.css'

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
  <Link className={landing.kicker} href={href}>
    <span className={landing.kickerBadge}>{label}</span>
    <span className={landing.kickerText}>{text}</span>
    {/* Decorative: the link's own text already says where it goes. */}
    <span aria-hidden="true" className={landing.kickerArrow}>
      →
    </span>
  </Link>
)

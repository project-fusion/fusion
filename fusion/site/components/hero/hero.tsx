import type { SitePage } from '@fusion.dev/insights'
import Link from 'next/link'
import { Lede } from '@/components/lede/lede'
import { NewsKicker } from '@/components/news-kicker/news-kicker'
import { HERO } from '@/content/landing/helix-landing'
import styles from './hero.module.css'

/**
 * The landing page's opening band: the light, the claim and the two doors.
 *
 * Takes the announcement rather than reading the registry itself, so the page
 * that already has it does not fetch it twice and this stays a component that
 * renders what it is given.
 */
export function Hero({ announcement }: { announcement?: SitePage | undefined }) {
  return (
    <section className={styles.hero}>
      <helix-flex align="center" class={styles.heroShell} data-shell direction="column" gap="lg">
        {/*
         *  What is coming, which is what a chip under a heading about the
         *             company should say. It pointed at the newest essay, so the first
         *             element on the site sent a reader asking "is this real yet" to a
         *             list of writing.
         */}
        {announcement ? (
          <NewsKicker href="/announcements" label="Coming soon" text={announcement.title} />
        ) : undefined}

        <h1 className={styles.tDisplay}>
          {HERO.title} <span className={styles.tDisplayAccent}>{HERO.accent}</span>
        </h1>

        <Lede>{HERO.lede}</Lede>

        <helix-flex class={styles.heroActions} direction="column" gap="md">
          <helix-flex align="center" data-density="lg" gap="sm" justify="center" wrap>
            <Link data-button="solid" data-button-tone="primary" href="/helix">
              Open Helix
            </Link>
            <Link data-button="subtle" href="/company/services">
              Work with us
            </Link>
          </helix-flex>
          <helix-flex align="center" class={styles.heroInstall} gap="2xs" justify="between">
            <code>{HERO.install}</code>
            <helix-copy-button
              copied-label="Copied"
              label="Copy the install command"
              value={HERO.install}
            ></helix-copy-button>
          </helix-flex>
        </helix-flex>

        {/* Below the actions rather than beside the kicker: a reader looks at
            the buttons, asks "can I use this", and the answer is the next thing
            down. */}
        <p className={styles.heroWorks}>{HERO.works}</p>
      </helix-flex>
    </section>
  )
}

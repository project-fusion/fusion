import Link from 'next/link'
import { Lede } from '@/components/lede/lede'
import { HERO } from '@/content/landing/helix-landing'
import styles from './hero.module.css'

/**
 * The landing page's opening band: the light, the claim and the two doors.
 */
export function Hero() {
  return (
    <section className={styles.hero} id="hero">
      <helix-flex
        align-items="center"
        class={styles.heroShell}
        data-shell
        direction="column"
        gap="lg"
        id="hero-words"
      >
        <h1 className={styles.tDisplay}>
          {HERO.title} <span className={styles.tDisplayAccent}>{HERO.accent}</span>
        </h1>

        <Lede>{HERO.lede}</Lede>

        <helix-flex class={styles.heroActions} direction="column" gap="md">
          <helix-flex align-items="center" data-density="lg" gap="sm" justify-content="center" wrap>
            <Link data-button="solid" data-button-tone="primary" href="/helix">
              Open Fusion Helix
            </Link>
            <Link data-button="subtle" href="/company/services">
              Work with us
            </Link>
          </helix-flex>
          <helix-flex
            align-items="center"
            class={styles.heroInstall}
            gap="2xs"
            justify-content="between"
          >
            <code>{HERO.install}</code>
            <helix-copy-button
              copied-label="Copied"
              label="Copy the install command"
              value={HERO.install}
            ></helix-copy-button>
          </helix-flex>
        </helix-flex>

        {/* Below the actions: a reader looks at the buttons, asks "can I use
            this", and the answer is the next thing down. */}
        <p className={styles.heroWorks}>{HERO.works}</p>
      </helix-flex>
    </section>
  )
}

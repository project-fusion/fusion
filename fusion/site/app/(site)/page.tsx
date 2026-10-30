import Link from 'next/link'
import { Band, band } from '@/components/band/band'
import { Claim } from '@/components/claim/claim'
import { CoverageBand } from '@/components/coverage-band/coverage-band'
import { DerivationDiagrams } from '@/components/derivation-diagram/derivation-diagram'
import { Eyebrow } from '@/components/eyebrow/eyebrow'
import { Hero } from '@/components/hero/hero'
import { Lede } from '@/components/lede/lede'
import { PageStrands } from '@/components/page-strands/page-strands'
import { PlatformDiagrams } from '@/components/platform-diagram/platform-diagram'
import { ProofBands } from '@/components/proof-bands/proof-bands'
import { SectionTitle } from '@/components/section-title/section-title'
import { Showcase } from '@/components/showcase/showcase'
import { ThemeScope } from '@/components/theme-context/theme-context'
import { ThemeFab } from '@/components/theme-fab/theme-fab'
import { XRay } from '@/components/x-ray/x-ray'
import { INSIGHTS } from '@/content/insights'
import { DELIVERY, ENGAGEMENT, HERO, MECHANISMS, PROBLEM } from '@/content/landing/helix-landing'
import { SERVICES } from '@/content/services/services'
import { pageMetadata } from '@/utils/metadata/metadata'
import { serverTheme } from '@/utils/theme-engine/theme-engine.server'
import styles from './page.module.css'

export const metadata = pageMetadata({
  description: HERO.description,
  path: '/',
  title: 'Fusion Development Group',
})

/**
 * Draft C: the design system is the product, and the engagements are how it
 * arrives.
 */
export default async function Home() {
  return (
    <ThemeScope>
      <div className={`${styles.reel} ${styles.fabClearance} ${styles.noRules}`}>
        {/* **One strand down the whole page, behind everything.** It comes
            in at the top right corner and crosses in one diagonal to the first
            card's top left corner, dimmed to a faint glow behind the hero's
            words so they stay crisp; it runs down the
            margin behind the sections, and sweeps across above the numbers
            and above the close. Scrolling travels along it. Strands is a Helix
            component, so the light behind the page is the product too. */}
        <PageStrands className={styles.reelStrands} />

        <Hero />

        <Band cardId="platform-card" id="platform">
          <PlatformDiagrams className={band.bandSection} />
        </Band>

        {/* The problem, before the answer. A reader who recognizes themselves in
          this reads the next band; one who does not was never the buyer. */}
        <Band>
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <SectionTitle>{PROBLEM.title}</SectionTitle>
            <Lede>{PROBLEM.lede}</Lede>
          </helix-flex>

          <div className={`${band.bandRow} ${styles.stagger}`}>
            {MECHANISMS.map((one) => (
              <helix-flex class={band.bandCell} direction="column" gap="md" key={one.name}>
                <Eyebrow>{one.name}</Eyebrow>
                <Claim>{one.claim}</Claim>
                <ul className={styles.proofList}>
                  {one.bullets.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </helix-flex>
            ))}
          </div>
        </Band>

        <Band id="mechanism">
          {/* The eyebrow repeats the name of the card above that this band
              explains, so you can see it is the same subject in more depth. */}
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <Eyebrow>Theming</Eyebrow>
            <SectionTitle>Every pair Helix solves, checked for contrast</SectionTitle>
            <Lede>You enter one brand color, and Helix computes every token from it.</Lede>
          </helix-flex>
          <DerivationDiagrams className={band.bandSection} />
        </Band>

        {/* **The band does not paint its own ground.** An opaque fill here cut
          the field out of this one band, on the argument that a moving light
          under a panel of live components is two things competing for the same
          attention. With the showcase in a card of the same glass as the others,
          the card is the surface and the field runs behind it like everywhere
          else. */}
        <Band shell="plain" wide>
          <div className={`${band.bandSplit} ${styles.showcaseSplit}`}>
            <helix-flex class={band.bandSection} direction="column" gap="md">
              {/* Named after the card above that this band explains, like the
                  Theming band. */}
              <Eyebrow>Components</Eyebrow>
              <SectionTitle>The panel runs in your browser</SectionTitle>
              <Lede>Each control in it is a custom element from the Helix package.</Lede>
              <helix-flex
                align-items="start"
                class="siteActions"
                data-density="lg"
                direction="column"
                gap="md"
              >
                <Link data-button="subtle" href="/helix">
                  Explore components
                </Link>

                {/*
                 * *The two tools, under the reference rather than beside
                 *                         it.** Both are the same claim as the panel above carried
                 *                         one step further: the controls are real, and these are
                 *                         where you get to change them. They are quiet links
                 *                         because the reference is the thing a reader came for and
                 *                         three buttons of equal weight is a menu rather than an
                 *                         invitation.
                 */}
                <helix-flex data-density="sm" gap="lg" wrap>
                  <Link className={styles.onward} data-link="quiet" href="/helix/sandbox">
                    Open the sandbox
                    <helix-icon name="arrow-right"></helix-icon>
                  </Link>
                  <Link className={styles.onward} data-link="quiet" href="/helix/theme">
                    Build a theme
                    <helix-icon name="arrow-right"></helix-icon>
                  </Link>
                </helix-flex>
                {/* **A switch, apart from the links.** It turns something on
                    and off on this page, and set among links as one more gray
                    phrase it read as a third place to go. */}
                <XRay />
              </helix-flex>
            </helix-flex>

            <div className={band.bandSection}>
              <Showcase />
            </div>
          </div>
        </Band>

        {/*
         * *The field picks up again here and runs to the end.** One `200svh`
         *           box anchored to this band reaches down through Services and the close,
         *           which is the same trick the live page uses for its own late field: an
         *           absolutely positioned child does not take part in flow, so it lights
         *           the three bands below it without lengthening any of them.
         */}
        <ProofBands engine={await serverTheme()} />

        <CoverageBand />

        {/* Delivery, last, because it is what a convinced reader wants and a
          reason to leave for anyone who is not there yet.

          **The second field, anchored here so it reaches the closing card.**
          The live page runs its late aura the same way, from the band above the
          one it is really lighting: an absolutely positioned child at 200svh
          starts at this band's top and carries down through the close, so the
          page ends in light rather than trailing off into flat ground. */}
        <Band>
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <Eyebrow>Services</Eyebrow>
            <SectionTitle>{DELIVERY.title}</SectionTitle>
            <Lede>{DELIVERY.lede}</Lede>
          </helix-flex>

          <div className={`${band.bandRow} ${styles.stagger}`}>
            {SERVICES.map((service) => (
              <helix-flex class={band.bandCell} direction="column" gap="sm" key={service.name}>
                <Claim>{service.name}</Claim>
                <helix-text as="p" emphasis="muted">
                  {service.summary}
                </helix-text>
              </helix-flex>
            ))}
          </div>

          {/* **What the work is like, under what it is.** Two lines that the
              services cannot say: who owns the result, and that we say what is
              unfinished. They were a band of their own with two more cards
              that restated the services, and the page read the offer twice. A
              quiet row under the services, set smaller than them, because they
              qualify the offer rather than add to it. */}
          <div className={`${band.bandSection} ${styles.terms}`}>
            {ENGAGEMENT.map((one) => (
              <helix-flex direction="column" gap="2xs" key={one.name}>
                <helix-text as="h3" variant="body-strong">
                  {one.name}
                </helix-text>
                <helix-text as="p" emphasis="muted" variant="caption">
                  {one.body}
                </helix-text>
              </helix-flex>
            ))}
            <helix-flex class={`${styles.termsAction} siteActions`} data-density="lg">
              <Link data-button="subtle" href="/company/services">
                Compare the services
              </Link>
            </helix-flex>
          </div>
        </Band>

        {/*
         * *The arguments, before the ask.** The essays are the one thing on this
         *           page that is neither a product claim nor a price, so they sit between
         *           the offer and the close: a reader who is not ready to talk has
         *           somewhere to go that is not away.
         */}
        <Band>
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <helix-flex align-items="center" gap="md" justify-content="between" wrap>
              <helix-flex direction="column" gap="sm">
                <Eyebrow>Insights</Eyebrow>
                <SectionTitle>How we decide, and why</SectionTitle>
              </helix-flex>
              <Link className="siteActions" data-button="subtle" href="/insights">
                Read all articles
              </Link>
            </helix-flex>
          </helix-flex>

          {/* **No card and no art, because the band is the card.**
                  `InsightCard` here would be a card inside a card: two edges, and
                  a `backdrop-filter` sampling a surface that is already frosted.
                  The three things a reader chooses from, what it is about, what it
                  is called and what it argues, remove the nesting rather than
                  exempting it, and the cell is the link so the whole of it is the
                  target. The full card, with its art and its glass, is what
                  `/insights` shows. */}
          <div className={`${band.bandRow} ${styles.insightRow}`}>
            {INSIGHTS.slice(0, 4).map((insight) => (
              <Link
                className={`${band.bandCell} ${styles.insightCell}`}
                href={`/insights/${insight.slug}`}
                key={insight.slug}
              >
                <helix-flex align-items="center" data-density="sm" gap="sm" wrap>
                  <helix-tag tone="primary">{insight.topic}</helix-tag>
                  <helix-tag>{insight.kind}</helix-tag>
                </helix-flex>
                <helix-text as="h3" variant="title">
                  {insight.title}
                </helix-text>
                <helix-text emphasis="muted" variant="caption">
                  {insight.summary}
                </helix-text>
              </Link>
            ))}
          </div>
        </Band>

        <section className={styles.closingCard} data-band data-closing id="close">
          <helix-flex align-items="center" data-shell direction="column" gap="lg">
            <SectionTitle>Work with us</SectionTitle>
            <Lede>
              Tell us what you need built. If we are not the right team for it, we will tell you.
            </Lede>
            <a
              className="siteActions"
              data-button="solid"
              data-button-tone="primary"
              data-density="lg"
              href="/contact"
            >
              Start a conversation
            </a>
          </helix-flex>
        </section>

        <ThemeFab />
      </div>
    </ThemeScope>
  )
}

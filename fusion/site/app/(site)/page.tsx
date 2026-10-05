import { findSitePage } from '@fusion.dev/insights'
import Link from 'next/link'
import { Band, band } from '@/components/band/band'
import { Claim } from '@/components/claim/claim'
import { DerivationDiagrams } from '@/components/derivation-diagram/derivation-diagram'
import { Eyebrow } from '@/components/eyebrow/eyebrow'
import { Hero } from '@/components/hero/hero'
import { Lede } from '@/components/lede/lede'
import { ProofBand } from '@/components/proof-band/proof-band'
import { SectionTitle } from '@/components/section-title/section-title'
import { Showcase } from '@/components/showcase/showcase'
import { ThemeScope } from '@/components/theme-context/theme-context'
import { ThemeFab } from '@/components/theme-fab/theme-fab'
import { INSIGHTS } from '@/content/insights'
import {
  DELIVERY,
  ENGAGEMENT,
  ENGAGEMENT_COPY,
  HERO,
  MECHANISMS,
  PROBLEM,
} from '@/content/landing/helix-landing'
import { SERVICES } from '@/content/services/services'
import { pageMetadata } from '@/utils/metadata/metadata'
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
export default function Home() {
  /* The pill's words are the page's own title, so the two cannot disagree about
     what is being announced. */
  const announcements = findSitePage('/announcements')

  return (
    <ThemeScope>
      <div className={`${styles.reel} ${styles.fabClearance} ${styles.noRules}`}>
        {/* **The field, and nothing tempering it.** A scrim over this, a
          vertical gradient of the page background holding the aura back
          everywhere at once, answers a problem already solved elsewhere: every
          claim on the page sits on glass, so the ground behind the type is the
          card rather than the field. */}
        {/* **Coarser features, because the box grew and the field does not
            repeat to fill it.**

            `p.y` spans -1 to 1 over the box whatever the box is, so `scale` sets
            how much field fits top to bottom and the height only sets how many
            pixels that is: one shape-unit is `H / 2 / scale` of them. Six
            band-sized boxes became one the length of the page, and at 1.7 the
            same braid was drawn across three times the pixels, coming out as a
            smooth gradient with no variation inside any one screen.

            A card on glass reads by contrast against what is behind it rather
            than by how bright that is, so an even field gives it nothing to
            separate from and it goes flat however correct its blur is. Raising
            `gain` toward 1 makes that worse by evening the field further.

            Multiplied rather than divided, so a shape-unit stays near the size
            the two-screen box drew at 1.7. The cost is the ends, since `flow`
            closes on `exp(-0.55 * scale)` of its center brightness at the box
            edge: 39% at 1.7, 15% at 3.5. Hero and
            footer sit dimmer than the middle bands do, which is a page-length
            gradient rather than a seam, and is the price of one canvas over nine
            screens instead of two over four.

            **`gain` at 0.75 since the site went to ink.** The field is drawn in
            the primary, which in dark mode is now a near-white at lightness
            0.91 where Fusion's blue sat at 0.67, about two and a half times the
            light. */}
        <helix-aura
          class={styles.reelAura}
          data-layer
          gain={0.75}
          scale={3.5}
          speed={1}
          terminus={0.5625}
          variant="caustics"
        ></helix-aura>

        <Hero announcement={announcements} />

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
            <SectionTitle>
              Every text and background pair is measured before the theme is used
            </SectionTitle>
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
          <div className={band.bandSplit}>
            <helix-flex class={band.bandSection} direction="column" gap="md">
              {/* Named after the card above that this band explains, like the
                  Theming band. */}
              <Eyebrow>Components</Eyebrow>
              <SectionTitle>The panel is Helix, running in your browser</SectionTitle>
              <Lede>Each control in it is a custom element from the Helix package.</Lede>
              <helix-flex class="siteActions" data-density="lg" direction="column" gap="md">
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
                  <Link data-link="quiet" href="/helix/sandbox">
                    Open the sandbox
                  </Link>
                  <Link data-link="quiet" href="/helix/theme">
                    Build a theme
                  </Link>
                </helix-flex>
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
        <ProofBand />

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

          <helix-flex class={`${band.bandSection} siteActions`} data-density="lg">
            <Link data-button="subtle" href="/company/services">
              Compare the services
            </Link>
          </helix-flex>
        </Band>

        {/* **What the work is, after what it costs.** The band above is three
          ways to buy and a link to the services; this is the half of the heading
          those cannot answer. A reader deciding whether to hire engineers wants
          to know what having them in the repository is like, and the honest
          answers are that the system is already built, that this is why it is
          quick, that they keep it, and that we say what is unfinished. */}
        <Band>
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <Eyebrow>Working with us</Eyebrow>
            <SectionTitle>{ENGAGEMENT_COPY.title}</SectionTitle>
          </helix-flex>

          <div className={`${band.bandRow} ${styles.stagger}`}>
            {ENGAGEMENT.map((one) => (
              <helix-flex class={band.bandCell} direction="column" gap="sm" key={one.name}>
                <Claim>{one.name}</Claim>
                <helix-text as="p" emphasis="muted">
                  {one.body}
                </helix-text>
              </helix-flex>
            ))}
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
                <SectionTitle>
                  How we make design, engineering, and business decisions, and why
                </SectionTitle>
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

        <section className={styles.closingCard} data-band data-closing data-material="glass">
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

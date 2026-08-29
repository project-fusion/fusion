import Link from 'next/link'
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
import { DerivationDiagram, DerivationDiagramStacked } from './derivation-diagram'
import landing from './landing.module.css'
import styles from './landing-c.module.css'
import { NewsKicker } from './news-kicker'
import { ProofBand } from './proof-band'
import { Showcase } from './showcase'
import { ThemeScope } from './theme-context'
import { ThemeFab } from './theme-fab'

export const metadata = pageMetadata({
  description: HERO.description,
  path: '/',
  title: 'Fusion Development Group',
})

/**
 * Draft C: the design system is the product, and the engagements are how it
 * arrives.
 *
 * **The order is the argument.** Opening with the company, or putting two
 * substrates and three offers on the page as peers, asks a reader to care about
 * Fusion before being told what Fusion has. This states a problem, answers it
 * with three mechanisms, shows the mechanism working, proves it with
 * measurements, and only then says what it costs to have someone bring it to
 * you.
 *
 * **Cortex is not on this page and that is deliberate.** It is real and it is
 * Building, and it is also a second thing to understand at the moment a reader
 * is deciding about the first. It keeps its own page.
 *
 * The type scale is C's own rather than the token ramp: see `.tDisplay` and its
 * siblings for why a landing page wants a different curve from a document.
 */
export default function Home() {
  return (
    <ThemeScope>
      <div
        className={`${landing.reel} ${styles.oneBrand} ${styles.fabClearance} ${styles.noRules}`}
      >
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
            screens instead of two over four. */}
        <helix-aura
          class={landing.reelAura}
          data-layer
          gain={1.05}
          scale={3.5}
          speed={1}
          terminus={0.5625}
          variant="caustics"
        ></helix-aura>

        <section className={landing.hero}>
          <helix-flex
            align="center"
            class={landing.heroShell}
            data-shell
            direction="column"
            gap="lg"
          >
            {/* The latest thing published, which is what a chip pointing at the
                writing should say. Not a release note for one part of one
                product, sitting directly under a heading about the company. */}
            <NewsKicker href="/insights" label="News" text="Helix ships as one open tier" />

            <h1 className={styles.tDisplay}>
              {HERO.title} <span className={styles.tDisplayAccent}>{HERO.accent}</span>
            </h1>

            <p className={styles.tLede}>{HERO.lede}</p>

            <helix-flex class={landing.heroActions} direction="column" gap="md">
              <helix-flex align="center" data-density="lg" gap="sm" justify="center" wrap>
                <Link
                  data-button="solid"
                  data-button-tone="primary"
                  data-button-width="standard"
                  href="/helix"
                >
                  Open Helix
                </Link>
                <Link data-button="subtle" data-button-width="standard" href="/services">
                  Work with us
                </Link>
              </helix-flex>
              <helix-flex align="center" class={landing.heroInstall} gap="2xs" justify="between">
                <code>{HERO.install}</code>
                <helix-copy-button
                  copied-label="Copied"
                  label="Copy the install command"
                  value={HERO.install}
                ></helix-copy-button>
              </helix-flex>
            </helix-flex>

            {/* Below the actions rather than beside the kicker: a reader looks
              at the buttons, asks "can I use this", and the answer is the next
              thing down. */}
            <p className={landing.heroWorks}>{HERO.works}</p>
          </helix-flex>
        </section>

        {/* The problem, before the answer. A reader who recognizes themselves in
          this reads the next band; one who does not was never the buyer. */}
        <section className={styles.fieldBand} data-band>
          <helix-flex data-shell direction="column">
            <div className={styles.bandCard} data-material="glass" data-substrate>
              <helix-flex class={styles.bandSection} direction="column" gap="md">
                <h2 className={styles.tTitle}>{PROBLEM.title}</h2>
                <p className={styles.tLede}>{PROBLEM.lede}</p>
              </helix-flex>

              <div className={`${styles.bandRow} ${styles.stagger}`}>
                {MECHANISMS.map((one) => (
                  <helix-flex class={styles.bandCell} direction="column" gap="md" key={one.name}>
                    <p className={styles.tLabel}>{one.name}</p>
                    <p className={styles.tClaim}>{one.claim}</p>
                    <ul className={styles.proofList}>
                      {one.bullets.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </helix-flex>
                ))}
              </div>
            </div>
          </helix-flex>
        </section>

        <section className={styles.fieldBand} data-band id="mechanism">
          <helix-flex data-shell direction="column">
            <div className={styles.bandCard} data-material="glass" data-substrate>
              {/* **Labeled as the first of the three, because that is what it
                  is.** The band above ends on three claims and this draws one of
                  them out. A label naming the subject instead, "The derivation",
                  reads as the page narrowing back to the theme engine one section
                  after widening to the interface; naming the card it belongs to,
                  with the lede saying which of the three costs is answered, tells
                  a reader this is depth rather than a change of subject. */}
              <helix-flex class={styles.bandSection} direction="column" gap="md">
                <p className={styles.tLabel}>Derived, not picked</p>
                <h2 className={styles.tTitle}>What happens between the color and the page</h2>
                <p className={styles.tLede}>
                  The first of those three, drawn out. One value goes in, the whole token layer
                  comes out, and every pair it produces is measured against the ground it lands on
                  before any of it reaches a page.
                </p>
              </helix-flex>
              <div className={styles.bandSection}>
                <DerivationDiagram />
                <DerivationDiagramStacked />
              </div>
            </div>
          </helix-flex>
        </section>

        {/* **The band does not paint its own ground.** An opaque fill here cut
          the field out of this one band, on the argument that a moving light
          under a panel of live components is two things competing for the same
          attention. With the showcase in a card of the same glass as the others,
          the card is the surface and the field runs behind it like everywhere
          else. */}
        <section className={`${landing.showcaseBand} ${styles.fieldBand}`} data-band>
          <div data-shell>
            <div className={styles.bandCard} data-material="glass" data-substrate>
              <div className={styles.bandSplit}>
                <helix-flex class={styles.bandSection} direction="column" gap="md">
                  {/* The card this band draws out, named after it, the way the
                    other two mechanisms are: "Derived, not picked" above and
                    "Measured, not claimed" below. A label naming the subject,
                    "The library", leaves the pattern two-thirds visible. */}
                  <p className={styles.tLabel}>Standards, not bindings</p>
                  <h2 className={styles.tTitle}>Every control here is the real one</h2>
                  <p className={styles.tLede}>
                    Not a screenshot and not a video. These are custom elements from the package,
                    upgrading in your browser on the page you are already reading.
                  </p>
                  <helix-flex data-density="lg" direction="column" gap="md">
                    <Link data-button="subtle" data-button-width="standard" href="/helix">
                      Explore components
                    </Link>

                    {/* **The two tools, under the reference rather than beside
                        it.** Both are the same claim as the panel above carried
                        one step further: the controls are real, and these are
                        where you get to change them. They are quiet links
                        because the reference is the thing a reader came for and
                        three buttons of equal weight is a menu rather than an
                        invitation.

                        The theme pill at the foot of this page is the builder
                        in miniature, which is the reason to name the full one
                        here: a reader who has moved a slider and liked it has
                        nowhere to go with that. */}
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

                <div className={styles.bandSection}>
                  <Showcase />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* **The field picks up again here and runs to the end.** One `200svh`
          box anchored to this band reaches down through Services and the close,
          which is the same trick the live page uses for its own late field: an
          absolutely positioned child does not take part in flow, so it lights
          the three bands below it without lengthening any of them.

          It is anchored here rather than on Services because this is the first
          band after the showcase, and the showcase is the one place the field is
          deliberately absent. */}
        <section className={styles.fieldBand} data-band>
          <ProofBand />
        </section>

        {/* Delivery, last, because it is what a convinced reader wants and a
          reason to leave for anyone who is not there yet.

          **The second field, anchored here so it reaches the closing card.**
          The live page runs its late aura the same way, from the band above the
          one it is really lighting: an absolutely positioned child at 200svh
          starts at this band's top and carries down through the close, so the
          page ends in light rather than trailing off into flat ground. */}
        <section className={styles.fieldBand} data-band>
          <helix-flex data-shell direction="column">
            <div className={styles.bandCard} data-material="glass" data-substrate>
              <helix-flex class={styles.bandSection} direction="column" gap="md">
                <p className={styles.tLabel}>How it arrives</p>
                <h2 className={styles.tTitle}>{DELIVERY.title}</h2>
                <p className={styles.tLede}>{DELIVERY.lede}</p>
              </helix-flex>

              <div className={`${styles.bandRow} ${styles.stagger}`}>
                {SERVICES.map((service) => (
                  <helix-flex
                    class={styles.bandCell}
                    direction="column"
                    gap="sm"
                    key={service.name}
                  >
                    <p className={styles.tClaim}>{service.name}</p>
                    <helix-text as="p" tone="muted">
                      {service.summary}
                    </helix-text>
                  </helix-flex>
                ))}
              </div>

              <helix-flex class={styles.bandSection} data-density="lg">
                <Link data-button="subtle" data-button-width="standard" href="/services">
                  See what each costs
                </Link>
              </helix-flex>
            </div>
          </helix-flex>
        </section>

        {/* **What the work is, after what it costs.** The band above is three
          ways to buy and a link to the prices; this is the half of the heading
          those cannot answer. A reader deciding whether to hire engineers wants
          to know what having them in the repository is like, and the honest
          answers are that the system is already built, that this is why it is
          quick, that they keep it, and that we say what is unfinished. */}
        <section className={styles.fieldBand} data-band>
          <helix-flex data-shell direction="column">
            <div className={styles.bandCard} data-material="glass" data-substrate>
              <helix-flex class={styles.bandSection} direction="column" gap="md">
                <p className={styles.tLabel}>The engagement</p>
                <h2 className={styles.tTitle}>{ENGAGEMENT_COPY.title}</h2>
                <p className={styles.tLede}>{ENGAGEMENT_COPY.lede}</p>
              </helix-flex>

              <div className={`${styles.bandRow} ${styles.stagger}`}>
                {ENGAGEMENT.map((one) => (
                  <helix-flex class={styles.bandCell} direction="column" gap="sm" key={one.name}>
                    <p className={styles.tClaim}>{one.name}</p>
                    <helix-text as="p" tone="muted">
                      {one.body}
                    </helix-text>
                  </helix-flex>
                ))}
              </div>
            </div>
          </helix-flex>
        </section>

        {/* **The arguments, before the ask.** The essays are the one thing on this
          page that is neither a product claim nor a price, so they sit between
          the offer and the close: a reader who is not ready to talk has
          somewhere to go that is not away.

          **A card of four, not a carousel.** A reel here is the one band with no
          glass behind its heading, so it reads as unfinished beside the seven
          that have one, and the fix that would finish it is not available:
          dissolving each card at the boundary needs an edge fade, an edge fade is
          a mask, and a mask flattens every `backdrop-filter` beneath it, which is
          the cards themselves. The note above `[data-substrate]` in `site.css`
          has the measurements.

          So the band is a card like every other, the four newest essays are
          cells inside it, and each one drops its own glass rather than nesting
          it. Four because that is a row, and because a set that fits on one
          screen does not need controls, an indicator or a scroll position to be
          restored. `Read all` is where the rest go. */}
        <section className={styles.fieldBand} data-band>
          <helix-flex data-shell direction="column">
            <div className={styles.bandCard} data-material="glass" data-substrate>
              <helix-flex class={styles.bandSection} direction="column" gap="md">
                <helix-flex align="center" gap="md" justify="between" wrap>
                  <helix-flex direction="column" gap="sm">
                    <p className={styles.tLabel}>Insights</p>
                    <h2 className={styles.tTitle}>The arguments, written down</h2>
                  </helix-flex>
                  <Link data-button="subtle" data-button-width="standard" href="/insights">
                    Read all
                  </Link>
                </helix-flex>
                {/* Below the row rather than inside it, so `Read all` stays on the
                    heading's line and the sentence runs the full measure. */}
                <p className={styles.tLede}>
                  Design, engineering and business decisions, with the reasoning kept in.
                </p>
              </helix-flex>

              {/* **No card and no art, because the band is the card.**
                  `InsightCard` here would be a card inside a card: two edges, and
                  a `backdrop-filter` sampling a surface that is already frosted.
                  The three things a reader chooses from, what it is about, what it
                  is called and what it argues, remove the nesting rather than
                  exempting it, and the cell is the link so the whole of it is the
                  target. The full card, with its art and its glass, is what
                  `/insights` shows. */}
              <div className={`${styles.bandRow} ${styles.insightRow}`}>
                {INSIGHTS.slice(0, 4).map((insight) => (
                  <Link
                    className={`${styles.bandCell} ${styles.insightCell}`}
                    href={`/insights/${insight.slug}`}
                    key={insight.slug}
                  >
                    <helix-flex align="center" data-density="sm" gap="sm" wrap>
                      <helix-tag tone="primary">{insight.topic}</helix-tag>
                      <helix-tag>{insight.kind}</helix-tag>
                    </helix-flex>
                    <helix-text as="h3" variant="title">
                      {insight.title}
                    </helix-text>
                    <helix-text tone="muted" variant="caption">
                      {insight.summary}
                    </helix-text>
                  </Link>
                ))}
              </div>
            </div>
          </helix-flex>
        </section>

        <section className={landing.closingCard} data-band data-closing data-material="glass">
          <helix-flex align="center" data-shell direction="column" gap="lg">
            <h2 className={styles.tTitle}>Take on the work</h2>
            <p className={styles.tLede}>
              Tell us what you need built. We will say plainly if we are not the right people.
            </p>
            <a
              data-button="solid"
              data-button-tone="primary"
              data-button-width="standard"
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

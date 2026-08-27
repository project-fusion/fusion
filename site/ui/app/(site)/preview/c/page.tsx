import Link from 'next/link'
import { INSIGHTS } from '@/content/insights'
import { SERVICES } from '@/content/services/services'
import { pageMetadata } from '@/utils/metadata/metadata'
import { InsightReel } from '../../insight-reel'
import landing from '../../landing.module.css'
import { Showcase } from '../../showcase'
import { Blueprint } from '../blueprint'
import { DerivationDiagram } from '../derivation-diagram'
import { InsightPlate } from '../insight-plate'
import styles from '../preview.module.css'
import { ProofBand } from '../proof-band'
import { ThemeFab } from '../theme-fab'
import { DELIVERY, HERO, MECHANISMS, PROBLEM } from './copy'
import { NewsKicker } from './kicker'

export const metadata = pageMetadata({
  description: 'Draft C. Helix first, services as delivery.',
  path: '/preview/c',
  title: 'Draft C',
})

/**
 * Draft C: the design system is the product, and the engagements are how it
 * arrives.
 *
 * **The reordering is the change.** Earlier drafts opened with the company and
 * put two substrates and three offers on the page as peers, which asks a reader
 * to care about Fusion before being told what Fusion has. This one states a
 * problem, answers it with three mechanisms, shows the mechanism working, proves
 * it with measurements, and only then says what it costs to have someone bring
 * it to you.
 *
 * **Cortex is not on this page and that is deliberate.** It is real and it is
 * Building, and it is also a second thing to understand at the moment a reader
 * is deciding about the first. It keeps its own page.
 *
 * The type scale is C's own rather than the token ramp: see `.tDisplay` and its
 * siblings for why a landing page wants a different curve from a document.
 */
export default function DraftC() {
  return (
    <div className={`${landing.reel} ${styles.oneBrand} ${styles.fabClearance} ${styles.noRules}`}>
      {/* **The live page's field, at its own settings.** Draft C ran without one
          while the aura could not be judged: the pane it was being reviewed in
          pauses background tabs, so the canvas stayed 2x2 and drew nothing,
          leaving `reelScrim` as an unexplained radial on a flat page. The
          numbers here are the live page's rather than mine, because those were
          arrived at against real screens. */}
      <helix-aura
        class={landing.reelAura}
        data-layer
        gain={0.85}
        scale={1.7}
        speed={1}
        terminus={0.5625}
        variant="flow"
      ></helix-aura>
      <div className={landing.reelScrim} data-layer />

      <section className={landing.hero}>
        <helix-flex align="center" class={landing.heroShell} data-shell direction="column" gap="lg">
          <NewsKicker
            href="/insights"
            label="News"
            text="The theme engine now measures every pair it derives"
          />

          <h1 className={styles.tDisplay}>{HERO.title}</h1>

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
              <Link data-button data-button-width="standard" href="/services">
                Hire the people who built it
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
        </helix-flex>
      </section>

      {/* The problem, before the answer. A reader who recognizes themselves in
          this reads the next band; one who does not was never the buyer. */}
      <section className={styles.fieldBand} data-band data-reveal>
        <Blueprint />
        <helix-flex data-shell direction="column" gap="xl">
          <helix-flex direction="column" gap="md">
            <h2 className={styles.tTitle}>{PROBLEM.title}</h2>
            <p className={styles.tLede}>{PROBLEM.lede}</p>
          </helix-flex>

          <helix-grid class={styles.stagger} gap="xl" min="18rem">
            {MECHANISMS.map((one) => (
              <helix-flex direction="column" gap="md" key={one.name}>
                <p className={styles.tLabel}>{one.name}</p>
                <p className={styles.tClaim}>{one.claim}</p>
                <ul className={styles.proofList}>
                  {one.bullets.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </helix-flex>
            ))}
          </helix-grid>
        </helix-flex>
      </section>

      <section data-band data-reveal id="mechanism">
        <helix-flex data-shell direction="column" gap="xl">
          <helix-flex direction="column" gap="md">
            <p className={styles.tLabel}>The derivation</p>
            <h2 className={styles.tTitle}>What happens between the color and the page</h2>
          </helix-flex>
          <DerivationDiagram />
        </helix-flex>
      </section>

      {/* **The one band with no field behind it.** The showcase is already a
          panel full of live components with their own surfaces, and a moving
          light under that is two things competing for the same attention. It
          paints its own ground rather than merely lacking an aura, because the
          field above it runs `200svh` and would otherwise reach down into it. */}
      <section className={`${landing.showcaseBand} ${styles.solidBand}`} data-band data-reveal>
        <div className={landing.showcaseSplit} data-shell>
          <helix-flex class={landing.showcaseProse} direction="column" gap="md">
            <p className={styles.tLabel}>The library</p>
            <h2 className={styles.tTitle}>Every control here is the real one</h2>
            <p className={styles.tLede}>
              Not a screenshot and not a video. These are custom elements from the package,
              upgrading in your browser on the page you are already reading.
            </p>
            <helix-flex data-density="lg">
              <Link data-button href="/helix">
                Open the component index
              </Link>
            </helix-flex>
          </helix-flex>

          <Showcase />
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
      <section className={styles.fieldBand} data-band data-reveal>
        <helix-aura
          class={landing.reelAuraLate}
          data-layer
          gain={0.85}
          scale={1.7}
          speed={1}
          terminus={0.5625}
          variant="flow"
        ></helix-aura>
        <div className={landing.reelScrimLate} data-layer />
        <Blueprint tone="brand" />
        <ProofBand />
      </section>

      {/* Delivery, last, because it is what a convinced reader wants and a
          reason to leave for anyone who is not there yet.

          **The second field, anchored here so it reaches the closing card.**
          The live page runs its late aura the same way, from the band above the
          one it is really lighting: an absolutely positioned child at 200svh
          starts at this band's top and carries down through the close, so the
          page ends in light rather than trailing off into flat ground. */}
      <section data-band data-reveal>
        <helix-flex data-shell direction="column" gap="xl">
          <helix-flex direction="column" gap="md">
            <p className={styles.tLabel}>How it arrives</p>
            <h2 className={styles.tTitle}>{DELIVERY.title}</h2>
            <p className={styles.tLede}>{DELIVERY.lede}</p>
          </helix-flex>

          <helix-grid class={styles.stagger} gap="xl" min="18rem">
            {SERVICES.map((service) => (
              <helix-flex
                data-material="glass"
                data-substrate
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
          </helix-grid>

          <helix-flex data-density="lg">
            <Link data-button href="/services">
              See what each one costs
            </Link>
          </helix-flex>
        </helix-flex>
      </section>

      {/* **The arguments, before the ask.** The essays are the one thing on this
          page that is neither a product claim nor a price, so they sit between
          the offer and the close: a reader who is not ready to talk has
          somewhere to go that is not away.

          A carousel because the registry is newest-first, which is an order
          rather than a ranking, and a carousel is what shows a set of peers
          whose sequence carries no weight past the first. No autoplay: this is
          prose somebody chooses to start, and copy that slides away mid-sentence
          is the reason carousels have the reputation they do. */}
      <section data-band data-reveal>
        <helix-flex data-shell direction="column" gap="xl">
          <helix-flex align="center" gap="md" justify="between" wrap>
            <helix-flex direction="column" gap="sm">
              <p className={styles.tLabel}>Insights</p>
              <h2 className={styles.tTitle}>The arguments, written down</h2>
            </helix-flex>
            <Link data-button href="/insights">
              Read all
            </Link>
          </helix-flex>

          <InsightReel>
            {INSIGHTS.map((insight, index) => (
              <InsightPlate index={index} insight={insight} key={insight.slug} />
            ))}
          </InsightReel>
        </helix-flex>
      </section>

      <section
        className={landing.closingCard}
        data-band
        data-closing
        data-material="glass"
        data-reveal
      >
        <helix-flex align="center" data-shell direction="column" gap="lg">
          <h2 className={styles.tTitle}>Take on the work</h2>
          <p className={styles.tLede}>
            Tell us what you need built. We will say plainly whether we are the right people for it.
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
  )
}

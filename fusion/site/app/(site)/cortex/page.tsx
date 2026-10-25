import Link from 'next/link'
import { Band, band } from '@/components/band/band'
import { Claim } from '@/components/claim/claim'
import { Eyebrow } from '@/components/eyebrow/eyebrow'
import hero from '@/components/hero/hero.module.css'
import { Lede } from '@/components/lede/lede'
import { NewsKicker } from '@/components/news-kicker/news-kicker'
import { SectionTitle } from '@/components/section-title/section-title'
import { Picture } from '@/components/site-nav/tiles'
import { ThemeScope } from '@/components/theme-context/theme-context'
import { PRODUCTS } from '@/content/products/products'
import { findVertical, stageAppearance } from '@/content/verticals/verticals'
import { pageMetadata } from '@/utils/metadata/metadata'
import { CortexAura } from './cortex-aura'
import { CORTEX_MODULES } from './modules'
import styles from './page.module.css'
import { TraceGraph } from './trace-graph'

const vertical = findVertical('/cortex')
const product = PRODUCTS.find((entry) => entry.href === '/cortex')

/**
 * Cortex, which is what this route is now named for.
 */
export const metadata = pageMetadata({
  description: product?.body ?? vertical?.summary ?? '',
  path: '/cortex',
  title: product?.name ?? vertical?.name ?? 'Cortex',
})

/**
 * What a reader can check about any fact Cortex keeps, which is the argument
 * for a memory layer at all. Each is a line from the thesis.
 */
const ACCOUNTS = [
  {
    body: 'Engram keeps what a system has seen and what it has learned, as two stores, and moves facts from the first to the second.',
    name: 'What it knows',
  },
  {
    body: 'Trace links every memory, context, and output to its inputs, so you can follow any claim back to the source it came from.',
    name: 'Where it learned it',
  },
  {
    body: 'The record is kept apart from the model. Replace the model, and what the system knows and where it came from stays.',
    name: 'How far to trust it',
  },
]

/**
 * The Cortex page in the landing page's idiom: the light, a claim over it, and
 * glass bands. A product page, so the hero is shorter than the landing's
 * screen and the first band is what the product is made of.
 */
export default function Page() {
  if (!vertical || !product) {
    return null
  }
  return (
    <ThemeScope>
      <div className={`${styles.reel} ${styles.noRules}`}>
        <CortexAura className={styles.reelAura} />

        <section className={`${hero.hero} ${styles.productHero}`} id="cortex-hero">
          <helix-flex
            align-items="center"
            class={hero.heroShell}
            data-shell
            direction="column"
            gap="lg"
            id="cortex-hero-words"
          >
            {/* The stage, as the kicker the landing page opens with: what is
                coming, and a way to the page that says where the work stands.
                It carries the stage, so nothing under the doors has to. */}
            <NewsKicker
              href="/company/thesis#where-the-work-stands"
              label={product.stage}
              text="Engram and Trace are underway"
            />

            <h1 className={hero.tDisplay}>
              Memory for AI systems,{' '}
              <span className={hero.tDisplayAccent}>kept across models.</span>
            </h1>

            <Lede>Cortex records each fact, where it came from, and how far to trust it.</Lede>

            <helix-flex class={hero.heroActions} direction="column" gap="md">
              <helix-flex
                align-items="center"
                data-density="lg"
                gap="sm"
                justify-content="center"
                wrap
              >
                <a data-button="solid" data-button-tone="primary" href="#trace">
                  See an example trace
                </a>
                <Link data-button="subtle" href="/company/thesis">
                  Read the thesis
                </Link>
              </helix-flex>
            </helix-flex>
          </helix-flex>
        </section>

        {/* What it is made of, first, because the division of Cortex is the
            argument. Each module carries its own stage beside its name. */}
        <Band cardId="cortex-modules">
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <Eyebrow>What Cortex includes</Eyebrow>
            <SectionTitle>Memory, provenance, and context</SectionTitle>
            <Lede>Three modules, and each can say where a fact came from.</Lede>
          </helix-flex>

          <div className={`${band.bandRow} ${styles.stagger}`}>
            {CORTEX_MODULES.map((module) => (
              <helix-flex class={band.bandCell} direction="column" gap="md" key={module.title}>
                <div className={styles.modulePicture}>
                  <Picture camera="isometric" name={module.picture} />
                </div>
                <div className={styles.moduleName}>
                  <Eyebrow>{module.title}</Eyebrow>
                  <helix-tag data-density="sm" tone={stageAppearance(module.stage)}>
                    {module.stage}
                  </helix-tag>
                </div>
                <Claim>{module.job}</Claim>
                <helix-text as="p" emphasis="muted">
                  {module.body}
                </helix-text>
              </helix-flex>
            ))}
          </div>
        </Band>

        {/* **What Trace records, drawn with Helix**: an example of the graph
            Trace keeps, in its own terms, and its deletion run on it. Said to
            be an example, since Trace is still being built. */}
        <Band cardId="trace-card" id="trace">
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <Eyebrow>Trace</Eyebrow>
            <SectionTitle>Every answer, traced to its inputs</SectionTitle>
            <Lede>
              Trace links every output to what it was derived from. Choose an answer, and the
              drawing lights everything it came from.
            </Lede>
          </helix-flex>
          <div className={band.bandSection}>
            <TraceGraph />
          </div>
        </Band>

        {/* The argument for a memory layer, after the thing itself: what a
            reader can check about any fact Cortex keeps. */}
        <Band>
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <Eyebrow>Why a memory layer</Eyebrow>
            <SectionTitle>The record stays when you replace the model</SectionTitle>
            <Lede>
              Cortex records what a system knows, where it learned it, and how far to trust it. That
              mattered less when a person wrote every line. It matters now that most lines are
              generated.
            </Lede>
          </helix-flex>

          <div className={`${band.bandRow} ${styles.stagger}`}>
            {ACCOUNTS.map((one) => (
              <helix-flex class={band.bandCell} direction="column" gap="sm" key={one.name}>
                <Claim>{one.name}</Claim>
                <helix-text as="p" emphasis="muted">
                  {one.body}
                </helix-text>
              </helix-flex>
            ))}
          </div>
        </Band>

        {/* The close, in the brand's own fill: the one solid object on the
            page, and the one place it asks for something. */}
        <section className={styles.closingCard} data-band data-closing id="close">
          <helix-flex align-items="center" data-shell direction="column" gap="lg">
            <SectionTitle>Work with us</SectionTitle>
            <Lede>
              We take on work that also improves Cortex, so each engagement adds to the foundation.
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
      </div>
    </ThemeScope>
  )
}

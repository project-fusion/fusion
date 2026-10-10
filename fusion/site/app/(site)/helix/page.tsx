import Link from 'next/link'
import { Band, band } from '@/components/band/band'
import { Eyebrow } from '@/components/eyebrow/eyebrow'
import hero from '@/components/hero/hero.module.css'
import { Lede } from '@/components/lede/lede'
import { NewsKicker } from '@/components/news-kicker/news-kicker'
import { SectionTitle } from '@/components/section-title/section-title'
import { Picture } from '@/components/site-nav/tiles'
import { ThemeScope } from '@/components/theme-context/theme-context'
import { HERO } from '@/content/landing/helix-landing'
import { PRODUCTS } from '@/content/products/products'
import { findVertical } from '@/content/verticals/verticals'
import { pageMetadata } from '@/utils/metadata/metadata'
import { getFamilies } from '../../../content/catalog/catalog'
import { HelixStrands } from './helix-strands'
import styles from './page.module.css'

const vertical = findVertical('/helix')
const product = PRODUCTS.find((entry) => entry.href === '/helix')

/**
 * Helix, which is what this route is about rather than what it lists.
 */
export const metadata = pageMetadata({
  description: product?.body ?? vertical?.summary ?? '',
  path: '/helix',
  title: product?.name ?? vertical?.name ?? 'Helix',
})

/**
 * The Helix page in the landing page's idiom: the strand, a claim over it,
 * and a glass band of the places a reader goes, which are the same tiles the
 * masthead's band shows, from the same list.
 */
export default function Page() {
  if (!vertical || !product) {
    return null
  }
  const families = getFamilies().length
  const places = product.destinations.filter((destination) => destination.picture)
  const reads = product.destinations.filter(
    (destination) => !destination.picture && destination.href,
  )

  return (
    <ThemeScope>
      <div className={`${styles.reel} ${styles.noRules}`}>
        <HelixStrands className={styles.reelStrands} />

        <section className={`${hero.hero} ${styles.productHero}`} id="helix-hero">
          <helix-flex
            align-items="center"
            class={hero.heroShell}
            data-shell
            direction="column"
            gap="lg"
            id="helix-hero-words"
          >
            {/* The stage, as the kicker the landing page opens with, and a
                way to the thesis's account of where the work stands. */}
            <NewsKicker
              href="/company/thesis#where-the-work-stands"
              label={product.stage}
              text={`${families} component families are published`}
            />

            <h1 className={hero.tDisplay}>
              Web components,{' '}
              <span className={hero.tDisplayAccent}>themed from your brand color.</span>
            </h1>

            <Lede>
              Every component uses the same tokens, computed from one color, so your interface stays
              consistent.
            </Lede>

            <helix-flex class={hero.heroActions} direction="column" gap="md">
              <helix-flex
                align-items="center"
                data-density="lg"
                gap="sm"
                justify-content="center"
                wrap
              >
                <Link data-button="solid" data-button-tone="primary" href="/helix/components">
                  Browse the components
                </Link>
                <Link data-button="subtle" href="/helix/docs">
                  Read the docs
                </Link>
              </helix-flex>
              {product.install && (
                <helix-flex
                  align-items="center"
                  class={hero.heroInstall}
                  gap="2xs"
                  justify-content="between"
                >
                  <code>{product.install}</code>
                  <helix-copy-button
                    copied-label="Copied"
                    label="Copy the install command"
                    value={product.install}
                  ></helix-copy-button>
                </helix-flex>
              )}
            </helix-flex>

            <p className={hero.heroWorks}>{HERO.works}</p>
          </helix-flex>
        </section>

        {/* The same places the masthead's band shows, from the same list, with
            the same pictures: a panel and a page disagreeing about what a
            product contains is the fault two lists of it would produce. */}
        <Band cardId="helix-places">
          <helix-flex class={band.bandSection} direction="column" gap="md">
            <Eyebrow>Where to go</Eyebrow>
            <SectionTitle>What you open, and what you read</SectionTitle>
            <Lede>Five things to use, and the pages that explain them.</Lede>
          </helix-flex>

          <div className={`${styles.places} ${styles.stagger}`}>
            {places.map((place) => (
              <Link className={styles.place} href={place.href ?? product.href} key={place.title}>
                {place.picture && <Picture name={place.picture} />}
                <span className={styles.placeName}>{place.title}</span>
                <span className={styles.placeSummary}>{place.summary}</span>
              </Link>
            ))}
          </div>

          <div className={styles.reads}>
            {reads.map((read) => (
              <Link className={styles.read} href={read.href ?? product.href} key={read.title}>
                <span className={styles.placeName}>{read.title}</span>
                <span className={styles.placeSummary}>{read.summary}</span>
              </Link>
            ))}
          </div>
        </Band>

        <section className={styles.closingCard} data-band data-closing id="close">
          <helix-flex align-items="center" data-shell direction="column" gap="lg">
            <SectionTitle>Work with us</SectionTitle>
            <Lede>
              We deliver interface work into your repository, built on Helix, so each engagement
              adds to the foundation.
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

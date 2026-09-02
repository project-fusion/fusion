import { FilterBar } from '@/components/filter-bar/filter-bar'
import { PageHero } from '@/components/page-hero/page-hero'
import styles from './insights.module.css'
import loading from './loading.module.css'

/**
 * The writing index, in outline, while the registry is sorted.
 *
 * At 35ms warm this route is the fastest of the four and the root loader's delay
 * would usually beat it to the screen. It is here because the delay is a
 * quarter second rather than a guarantee: a cold process, a slow machine or a
 * long list all spend it, and what shows then should be this page rather than a
 * spinner.
 */
const CARDS = Array.from({ length: 8 }, (_, index) => index)

export default function Loading() {
  return (
    <>
      <div className={loading.standIn} inert>
        <PageHero className={styles.insightsHero}>
          <div className={loading.heroTitle} data-skeleton />
          <div className={loading.heroLede} data-skeleton />
          <div className={loading.heroSearch} data-skeleton />
        </PageHero>

        <FilterBar>
          {[0, 1, 2].map((slot) => (
            <div className={loading.filterControl} data-skeleton key={slot} />
          ))}
        </FilterBar>

        <helix-grid className={styles.insightGrid} columns={4} gap="xl">
          {CARDS.map((card) => (
            <helix-card key={card}>
              <helix-flex direction="column" gap="sm">
                <div className={loading.cardTitle} data-skeleton />
                <div className={loading.cardLine} data-skeleton />
                <div className={loading.cardByline} data-skeleton />
              </helix-flex>
            </helix-card>
          ))}
        </helix-grid>
      </div>

      <p data-hidden-visually role="status">
        Loading writing
      </p>
    </>
  )
}

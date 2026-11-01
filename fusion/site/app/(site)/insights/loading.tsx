import { FilterBar, filterBar } from '@/components/filter-bar/filter-bar'
import { GridBand } from '@/components/grid-band/grid-band'
import card from '@/components/insight-card/insight-card.module.css'
import { PageHero, pageHero } from '@/components/page-hero/page-hero'
import { formatDate, INSIGHTS } from '../../../content/insights'
import browser from './insight-browser.module.css'
import loading from './loading.module.css'
import styles from './page.module.css'
import { SORTS } from './sorts'

/**
 * The writing index, in outline, while the registry is sorted.
 *
 * At 35ms warm this route is the fastest of the four and the root loader's delay
 * would usually beat it to the screen. It is here because the delay is a
 * quarter second rather than a guarantee: a cold process, a slow machine or a
 * long list all spend it, and what shows then should be this page rather than a
 * spinner.
 *
 * **Every box sits in the element the page puts its text in.** The hero, the
 * filter bar, the band and each card are the page's own, with the same slots,
 * classes and gaps. What lands then lands where the boxes were, at every width.
 *
 * **Each card holds its post's own words.** The registry is metadata the page
 * reads with no wait, so each card carries the post's topic, kind, title,
 * summary and date, in the page's default order, as `data-skeleton="words"`:
 * transparent text with a bar behind each line. A title that wraps on the page
 * wraps here, and a card is the height its post's card will be.
 */
const POSTS = [...INSIGHTS].sort(SORTS.newest)
export default function Loading() {
  return (
    <>
      <div className={loading.standIn} inert>
        <PageHero className={browser.insightsHero}>
          <helix-flex align-items="center" data-density="sm" direction="column" gap="sm">
            <helix-text as="h1">
              <span className={loading.heroTitle} data-skeleton="text" />
            </helix-text>
            <helix-text as="p" className={pageHero.pageHeroLede}>
              <span className={loading.heroLede} data-skeleton="text" />
              <span className={loading.heroLedeWrap} data-skeleton="text" />
            </helix-text>
          </helix-flex>
          <div className={`${pageHero.heroSearch} ${loading.heroSearch}`} data-skeleton />
        </PageHero>

        <FilterBar>
          <helix-flex className={filterBar.filterGroup} gap="sm" wrap>
            {[0, 1].map((slot) => (
              <div
                className={`${filterBar.filterControl} ${loading.filterControl}`}
                data-skeleton
                key={slot}
              />
            ))}
          </helix-flex>
          <helix-flex align-items="center" className={filterBar.filterSort} gap="sm">
            <div className={`${filterBar.filterControl} ${loading.filterControl}`} data-skeleton />
          </helix-flex>
        </FilterBar>

        <GridBand>
          <helix-grid className={styles.insightGrid} columns={5} gap="xl">
            {POSTS.map((insight) => (
              <div className={card.insightCard} key={insight.slug}>
                <helix-card material="glass" separation="elevated">
                  <helix-flex align-items="center" data-density="sm" gap="sm" slot="header" wrap>
                    <span className={loading.cardTag} data-skeleton>
                      {insight.topic}
                    </span>
                    <span className={loading.cardTag} data-skeleton>
                      {insight.kind}
                    </span>
                  </helix-flex>

                  <helix-flex direction="column" gap="xs">
                    <helix-text as="h3" scale="title">
                      <span data-skeleton="words">{insight.title}</span>
                    </helix-text>
                    <helix-text
                      class={`${card.insightSummary} ${loading.cardSummary}`}
                      scale="caption"
                    >
                      <span data-skeleton="words">{insight.summary}</span>
                    </helix-text>
                  </helix-flex>

                  <helix-flex align-items="center" gap="sm" slot="footer">
                    <helix-text scale="caption">
                      <span data-skeleton="words">{formatDate(insight.date)}</span>
                    </helix-text>
                    <helix-text scale="caption">
                      <span data-skeleton="words">{insight.minutes} min</span>
                    </helix-text>
                  </helix-flex>
                </helix-card>
              </div>
            ))}
          </helix-grid>
        </GridBand>
      </div>

      <p data-hidden-visually role="status">
        Loading writing
      </p>
    </>
  )
}

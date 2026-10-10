import { FilterBar, filterBar } from '@/components/filter-bar/filter-bar'
import { GridBand } from '@/components/grid-band/grid-band'
import { PageHero, pageHero } from '@/components/page-hero/page-hero'
import styles from './gallery.module.css'
import loading from './loading.module.css'

/**
 * The gallery, in outline, while the catalog is read.
 *
 * **This is the route the whole idea is for.** Measured warm in development,
 * the four dynamic routes answer in 35, 88, 181 and 588ms, and this is the
 * 588: a reader clicks Components and, with no boundary here, the App Router
 * blocks on the server render and nothing whatever happens for half a second.
 * The click is not acknowledged, which reads as a click that missed.
 *
 * **The chrome is the page's own components, not a copy of them.** `PageHero`,
 * `FilterBar` and `GridBand` are the ones the gallery itself renders, and each
 * card is a `helix-card` with the gallery's slots, so this cannot drift into a
 * different layout than the one it precedes. What is invented here is only the
 * boxes inside them, and each line of text is a `data-skeleton="text"` inside a
 * `helix-text` of the variant it stands in for.
 *
 * **Twenty cards**, which fill the first screen at every column count the grid
 * steps through and end on a full row at four and at five.
 */
const CARDS = Array.from({ length: 20 }, (_, index) => index)

export default function Loading() {
  return (
    <>
      {/*
       * *`inert` on the whole stand-in, in one place.** A screen reader being
       *           read twenty empty cards is being read nothing, slowly, and the wait is
       *           announced once in words at the bottom instead. `inert` rather than
       *           `aria-hidden` on each part: it takes the subtree out of the tab order
       *           as well as out of the accessibility tree, which matters because a
       *           skeleton is a thing a reader can otherwise tab into and find nothing
       *           in. It is also the platform's own state for this rather than a mirror
       *           of it.
       */}
      <div className={loading.standIn} inert>
        <PageHero className={`${styles.designHero} ${loading.hero}`}>
          {/* The eyebrow's two tags, the title and the lede, as one block at
              `sm`, as the page sets them. */}
          <helix-flex align-items="center" data-density="sm" direction="column" gap="sm">
            <helix-flex align-items="center" gap="xs">
              <div className={loading.heroEyebrow} data-skeleton />
              <div className={loading.heroStage} data-skeleton />
            </helix-flex>
            <helix-text as="h1">
              <span className={loading.heroTitle} data-skeleton="text" />
            </helix-text>
            <helix-text as="p" className={pageHero.pageHeroLede}>
              <span className={loading.heroLede} data-skeleton="text" />
              <span className={loading.heroLedeWrap} data-skeleton="text" />
            </helix-text>
          </helix-flex>
          <div className={`${pageHero.heroSearch} ${loading.heroSearch}`} data-skeleton />
          {/* Start and Sandbox, which are the tallest thing in the hero after
              the title and move everything above them when they are missing. */}
          <div className={loading.heroActions} data-skeleton />
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
          <helix-grid className={styles.familyGrid} columns={5} gap="2xl">
            {CARDS.map((card) => (
              <div className={styles.familyCard} key={card}>
                <helix-card separation="outlined">
                  <div className={loading.cardArt} data-skeleton slot="media" />
                  <helix-flex align-items="center" gap="sm" justify-content="between" slot="header">
                    <helix-text as="h3" variant="title">
                      <span className={loading.cardName} data-skeleton="text" />
                    </helix-text>
                  </helix-flex>
                  <helix-text variant="caption">
                    <span data-skeleton="text" />
                    <span className={loading.cardSummaryMore} data-skeleton="text" />
                    <span className={loading.cardSummaryEnd} data-skeleton="text" />
                  </helix-text>
                </helix-card>
              </div>
            ))}
          </helix-grid>
        </GridBand>
      </div>

      {/* The one thing that is announced. `polite`, because a reader mid-sentence
          should not be interrupted by a page that is merely on its way. */}
      <p data-hidden-visually role="status">
        Loading components
      </p>
    </>
  )
}

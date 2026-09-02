import { FilterBar } from '@/components/filter-bar/filter-bar'
import { PageHero } from '@/components/page-hero/page-hero'
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
 * **A skeleton rather than the root loader, because the shape is known.** The
 * page is a hero, a filter bar and a grid of cards, and it is the same shape
 * every time: the catalog decides how many cards, never whether there are
 * cards. Standing in with that shape means the layout does not jump when the
 * real thing arrives, which a centered spinner cannot promise.
 *
 * **The chrome is the page's own components, not a copy of them.** `PageHero`
 * and `FilterBar` are the ones the gallery itself renders, so this cannot drift
 * into a different hero than the one it precedes. What is invented here is only
 * the boxes inside them.
 *
 * The count is a guess and has to be: twelve fills a first screen at five
 * columns without running so far down that a reader scrolls a skeleton.
 */
const CARDS = Array.from({ length: 12 }, (_, index) => index)

export default function Loading() {
  return (
    <>
      {/* **`inert` on the whole stand-in, in one place.** A screen reader being
          read twelve empty cards is being read nothing, slowly, and the wait is
          announced once in words at the bottom instead. `inert` rather than
          `aria-hidden` on each part: it takes the subtree out of the tab order
          as well as out of the accessibility tree, which matters because a
          skeleton is a thing a reader can otherwise tab into and find nothing
          in. It is also the platform's own state for this rather than a mirror
          of it.

          `display: contents`, so the wrapper is a place to put the attribute and
          not a box: the hero, the bar and the grid stay direct children of the
          layout they are laid out by. */}
      <div className={loading.standIn} inert>
        <PageHero className={styles.designHero}>
          <div className={loading.heroTitle} data-skeleton />
          <div className={loading.heroLede} data-skeleton />
          <div className={loading.heroSearch} data-skeleton />
        </PageHero>

        <FilterBar>
          {[0, 1, 2].map((slot) => (
            <div className={loading.filterControl} data-skeleton key={slot} />
          ))}
        </FilterBar>

        <helix-grid className={styles.familyGrid} columns={5} gap="2xl">
          {CARDS.map((card) => (
            <helix-card key={card} separation="outlined">
              <div className={loading.cardArt} data-skeleton />
              <div className={loading.cardName} data-skeleton />
            </helix-card>
          ))}
        </helix-grid>
      </div>

      {/* The one thing that is announced. `polite`, because a reader mid-sentence
          should not be interrupted by a page that is merely on its way. */}
      <p data-hidden-visually role="status">
        Loading components
      </p>
    </>
  )
}

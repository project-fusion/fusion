import { docsShell } from '@/components/docs-shell/docs-shell'
import loading from './loading.module.css'

/**
 * A component's reference page, in outline, while its manifest is read.
 *
 * **A different shape from the two grid pages, which is why it is its own file
 * rather than a copy of theirs.** The gallery and the writing index are both a
 * hero, a filter bar and a grid of cards; this is an article with a rail beside
 * it, and standing in with the wrong one moves the layout at the moment the real
 * page lands, which is the single thing a skeleton exists to prevent.
 *
 * The sections are the ones `SECTIONS` in `page.tsx` says every family has,
 * in the order it renders them: the title block, Usage, Preview, then the API
 * tables. Examples follow those and are not drawn, being the one part whose
 * presence a family decides.
 *
 * **The navigation is not here**, and that is the layout doing its job. `DocsNav`
 * lives in `(reference)/layout.tsx`, outside the boundary this file fills, so it
 * stays on screen through the wait rather than being drawn twice.
 *
 * `inert` on one wrapper, and the wait announced once in words: a screen reader
 * being read a page of empty boxes is being read nothing, slowly. It is also the
 * platform's own state for content that is not there yet, and it takes the
 * subtree out of the tab order as well as out of the accessibility tree.
 */
const API_ROWS = Array.from({ length: 6 }, (_, index) => index)

export default function Loading() {
  return (
    <>
      <div className={loading.standIn} inert>
        <article className={docsShell.docsMain}>
          <div className={loading.stack}>
            {/* The title block: the name, its description, and the three tags
                every family carries. */}
            <div className={loading.head}>
              <div className={loading.title} data-skeleton />
              <div className={loading.description} data-skeleton />
              <div className={loading.tags}>
                {[0, 1, 2].map((tag) => (
                  <div className={loading.tag} data-skeleton key={tag} />
                ))}
              </div>
            </div>

            {/* Usage: a heading and the install block under it. */}
            <div className={loading.section}>
              <div className={loading.heading} data-skeleton />
              <div className={loading.code} data-skeleton />
            </div>

            {/* Preview: a heading and the sandbox, which is the tallest thing on
                the page and the one worth reserving room for. */}
            <div className={loading.section}>
              <div className={loading.heading} data-skeleton />
              <div className={loading.preview} data-skeleton />
            </div>

            {/* The API tables. One heading and a run of rows, because the count
                is the manifest's and the shape is not. */}
            <div className={loading.section}>
              <div className={loading.heading} data-skeleton />
              <div className={loading.table}>
                {API_ROWS.map((row) => (
                  <div className={loading.row} data-skeleton key={row} />
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* The outline, which is a short column of links whatever the family. */}
        <aside className={docsShell.docsRail}>
          <div className={loading.railHead} data-skeleton />
          {[0, 1, 2].map((entry) => (
            <div className={loading.railRow} data-skeleton key={entry} />
          ))}
        </aside>
      </div>

      <p className={loading.announcement} role="status">
        Loading the reference
      </p>
    </>
  )
}

import { docsShell } from '@/components/docs-shell/docs-shell'
import loading from './loading.module.css'

/**
 * A component's reference page, in outline, while its manifest is read.
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

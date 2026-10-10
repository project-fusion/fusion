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
            {/* The title block: the name with its two actions on the same
                line, its description, and the three tags every family
                carries. */}
            <div className={loading.head}>
              <div className={loading.titleRow}>
                <div className={loading.title}>
                  <div className={loading.titleText} data-skeleton="text" />
                </div>
                <div className={loading.actions} data-density="sm">
                  <div className={loading.source} data-skeleton />
                  <div className={loading.menu} data-skeleton />
                </div>
              </div>
              <div className={loading.description}>
                <div className={loading.descriptionText} data-skeleton="text" />
              </div>
              <div className={loading.tags} data-density="sm">
                {[0, 1, 2].map((tag) => (
                  <div className={loading.tag} data-skeleton key={tag} />
                ))}
              </div>
            </div>

            {/* Usage: a heading and the install block under it. */}
            <div className={loading.section}>
              <div className={loading.heading}>
                <div className={loading.headingText} data-skeleton="text" />
              </div>
              <div className={loading.code} data-skeleton />
            </div>

            {/* Preview: a heading and the sandbox, which is the tallest thing on
                the page and the one worth reserving room for. */}
            <div className={loading.section}>
              <div className={loading.heading}>
                <div className={loading.headingText} data-skeleton="text" />
              </div>
              <div className={loading.preview} data-skeleton />
            </div>

            {/* The API tables. One heading and a run of rows, because the count
                is the manifest's and the shape is not. */}
            <div className={loading.section}>
              <div className={loading.heading}>
                <div className={loading.headingText} data-skeleton="text" />
              </div>
              <div className={loading.table}>
                {API_ROWS.map((row) => (
                  <div className={loading.row} data-skeleton key={row} />
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* The outline: its label, then a short column of links whatever the
            family. */}
        <aside className={docsShell.docsRail}>
          <div className={loading.railHead}>
            <div className={loading.railHeadText} data-skeleton="text" />
          </div>
          {/* Usage, Preview, API Reference and Examples, which every family
              has, and the element under API Reference that most have one of. */}
          <div className={loading.rail}>
            {[0, 1, 2, 3, 4].map((entry) => (
              <div className={loading.railRow} key={entry}>
                <div className={loading.railRowText} data-skeleton="text" />
              </div>
            ))}
          </div>
        </aside>
      </div>

      <p className={loading.announcement} role="status">
        Loading the reference
      </p>
    </>
  )
}

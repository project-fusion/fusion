import type { CSSProperties } from 'react'
import { Band, band } from '@/components/band/band'
import { Eyebrow } from '@/components/eyebrow/eyebrow'
import { Lede } from '@/components/lede/lede'
import { SectionTitle } from '@/components/section-title/section-title'
import {
  ADDED,
  COMPONENTS,
  COVERAGE,
  type CoverageCell,
  MEASURED,
  METRICS_HREF,
  measuredOn,
} from '@/content/landing/coverage'
import styles from './coverage-band.module.css'

/** One mark, with the element it stands for in words for a screen reader. */
const Mark = ({ cell }: { cell: CoverageCell | null }) => (
  <>
    <span aria-hidden="true" className={styles.mark} />
    <span data-hidden-visually>
      {cell === null ? 'None' : `${cell.tag}${cell.experimental ? ', experimental' : ''}`}
    </span>
  </>
)

const state = (cell: CoverageCell | null) =>
  cell === null ? 'none' : cell.experimental ? 'experimental' : 'ships'

/**
 * What the package covers, beside the systems people compare it with.
 *
 * **A real table under the picture.** The marks are decoration over a
 * `<table>` whose cells name the element, so a screen reader reads the same
 * evidence the hover shows, and the visual check reads one tree.
 *
 * **Helix's column is one shape, drawn behind the table.** A highlight on each
 * cell breaks at every row and cannot glow as one piece, so a single element
 * sits under the second column. The columns are fixed widths for that reason:
 * the label column takes `--label` and the systems share the rest equally, so
 * the shape's position is arithmetic and never a measurement.
 */
export const CoverageBand = () => {
  const ours = COVERAGE.systems.findIndex((one) => one.ours)
  /* The jobs no other system in the table publishes an element for. */
  const alone = COVERAGE.groups
    .flatMap((group) => group.rows)
    .filter((row) => row.cells.every((cell, index) => (index === ours) === (cell !== null)))
  return (
    <Band id="coverage">
      <div className={`${band.bandSplit} ${styles.split}`}>
        <helix-flex class={`${band.bandSection} ${styles.intro}`} direction="column" gap="md">
          <Eyebrow>Coverage</Eyebrow>
          {/* `data-site-count` is what the site's visual check masks: the count
              follows the catalog, and every new family changes it. */}
          <SectionTitle>
            <span data-site-count>{COMPONENTS}</span> components in one package
          </SectionTitle>
          <Lede>
            Charts, data tables, chat, and date pickers use the same tokens as your buttons.
          </Lede>

          <ul aria-label="Key" className={styles.legend}>
            <li data-state="ships">
              <span aria-hidden="true" className={styles.mark} />
              Ships an element
            </li>
            <li data-state="experimental">
              <span aria-hidden="true" className={styles.mark} />
              Ships it as experimental
            </li>
          </ul>

          {alone.length > 0 && (
            <div className={styles.alone}>
              <helix-text as="p" variant="label">
                {alone.length} jobs only Helix covers
              </helix-text>
              <helix-flex data-density="sm" gap="xs" wrap>
                {alone.map((row) => (
                  <helix-tag key={row.name} tone="primary">
                    {row.name}
                  </helix-tag>
                ))}
              </helix-flex>
            </div>
          )}

          <div className={styles.added}>
            {/* `data-site-measure` is what the site's visual check masks: the
                figure is a rounded median measured from the build, and it
                tips between tenths on changes the page has no part in. */}
            <helix-text as="p" class={styles.addedValue} data-site-measure>
              {ADDED}
            </helix-text>
            <helix-text as="p" emphasis="muted" variant="caption">
              A typical extra component, compressed.
            </helix-text>
          </div>

          <helix-flex class="siteActions" data-density="lg">
            <a data-button="subtle" href={METRICS_HREF}>
              Compare the systems
            </a>
          </helix-flex>
        </helix-flex>

        <div className={`${band.bandSection} ${styles.stage}`}>
          <div
            className={styles.frame}
            style={{ '--ours': ours, '--systems': COVERAGE.systems.length } as CSSProperties}
          >
            <div aria-hidden="true" className={styles.column} />
            <table className={styles.matrix}>
              <caption data-hidden-visually>
                Jobs each design system publishes an element for, from each system's manifest
              </caption>
              <colgroup>
                <col className={styles.labelColumn} />
                {COVERAGE.systems.map((system) => (
                  <col key={system.name} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <td aria-hidden="true" className={styles.corner}>
                    Out of {COVERAGE.rows} jobs
                  </td>
                  {COVERAGE.systems.map((system) => (
                    <th
                      className={styles.headCell}
                      data-ours={system.ours || undefined}
                      key={system.name}
                      scope="col"
                    >
                      <span className={styles.head}>
                        <span className={styles.total} data-empty={system.total === 0 || undefined}>
                          {system.total}
                          <span data-hidden-visually> of {COVERAGE.rows} jobs</span>
                        </span>
                        <span className={styles.system}>{system.name}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              {COVERAGE.groups.map((group) => (
                <tbody key={group.name}>
                  <tr className={styles.group}>
                    <th colSpan={COVERAGE.systems.length + 1} scope="colgroup">
                      {group.name}
                    </th>
                  </tr>
                  {group.rows.map((row) => (
                    <tr className={styles.row} key={row.name}>
                      <th scope="row">{row.name}</th>
                      {row.cells.map((cell, index) => (
                        <td
                          data-ours={index === ours || undefined}
                          data-state={state(cell)}
                          data-tag={cell?.tag}
                          key={COVERAGE.systems[index]?.name}
                        >
                          <Mark cell={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
          <helix-text as="p" class={styles.source} emphasis="muted" variant="caption">
            Every system ships buttons, form controls, menus, and dialogs, so the table lists the
            rest. Read from each system's manifest on {measuredOn(MEASURED)}.{' '}
            <span className={styles.hint}>Hover a mark to see the element.</span>
          </helix-text>
        </div>
      </div>
    </Band>
  )
}

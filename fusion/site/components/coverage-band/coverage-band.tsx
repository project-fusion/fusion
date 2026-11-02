import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Band, band } from '@/components/band/band'
import { Eyebrow } from '@/components/eyebrow/eyebrow'
import { Lede } from '@/components/lede/lede'
import { SectionTitle } from '@/components/section-title/section-title'
import { findFamily } from '@/content/catalog/catalog'
import {
  ADDED,
  COMPONENTS,
  COVERAGE,
  type CoverageCell,
  elementName,
  MEASURED,
  METRICS_HREF,
  measuredOn,
} from '@/content/landing/coverage'
import styles from './coverage-band.module.css'
import { CoverageCards } from './coverage-cards'

type System = (typeof COVERAGE.systems)[number]

/* A job with one committed element is covered, so its mark is the full dot;
   the ring is for a job whose every element is experimental. */
const state = (cell: CoverageCell | null) =>
  cell === null ? 'none' : cell.every((one) => one.experimental) ? 'experimental' : 'ships'

/**
 * A system's elements for one job, each by its name and its tag. Helix's rows
 * link to their pages and take the names those pages use.
 */
const Card = ({
  cell,
  id,
  job,
  system,
}: {
  cell: CoverageCell
  id: string
  job: string
  system: System
}) => (
  <div
    aria-label={`${job} in ${system.name}`}
    className={styles.card}
    data-ours={system.ours || undefined}
    id={id}
    popover="manual"
    role="dialog"
  >
    <div className={styles.cardHead}>
      <span className={styles.cardJob}>{job}</span>
      <span className={styles.cardSystem}>{system.name}</span>
    </div>
    <ul className={styles.cardList}>
      {cell.map((element) => {
        const family = system.ours ? findFamily(element.tag.slice(system.prefix.length)) : undefined
        const body = (
          <>
            <span aria-hidden="true" className={styles.mark} />
            <span className={styles.cardName}>
              {family?.label ?? elementName(element.tag, system.prefix)}
              {element.experimental && <span data-hidden-visually>, experimental</span>}
            </span>
            <code className={styles.cardTag}>{element.tag}</code>
            {family && <helix-icon class={styles.cardGo} name="arrow-right"></helix-icon>}
          </>
        )
        const look = {
          className: styles.cardItem,
          'data-ours': system.ours || undefined,
          'data-state': element.experimental ? 'experimental' : 'ships',
        }
        return (
          <li key={element.tag}>
            {family ? (
              <Link href={`/helix/components/${family.slug}`} {...look}>
                {body}
              </Link>
            ) : (
              <div {...look}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
    {cell.some((element) => element.experimental) && (
      <p className={styles.cardNote} data-ours={system.ours || undefined} data-state="experimental">
        <span aria-hidden="true" className={styles.mark} />
        Experimental. The API can change.
      </p>
    )}
  </div>
)

/**
 * What the package covers, beside the systems people compare it with.
 *
 * **A real table under the picture.** The marks are buttons in a `<table>`,
 * each named by the elements it stands for, so a screen reader reads the same
 * evidence the cards show, and the visual check reads one tree.
 *
 * **A mark opens a card of its elements.** A job can take several elements,
 * as 3D charts take several of Helix's, so the card lists every one, by name
 * and tag. Helix's rows link to their pages. `CoverageCards` opens and places
 * them.
 *
 * **Helix's column is one shape, drawn behind the table.** A highlight on each
 * cell breaks at every row and cannot glow as one piece, so a single element
 * sits under the second column. The columns are fixed widths for that reason:
 * the label column takes `--label` and the systems share the rest equally, so
 * the shape's position is arithmetic and never a measurement.
 */
export const CoverageBand = () => {
  const ours = COVERAGE.systems.findIndex((one) => one.ours)
  const rows = COVERAGE.groups.flatMap((group) => group.rows)
  /* The jobs no other system in the table publishes an element for. */
  const alone = rows.filter((row) =>
    row.cells.every((cell, index) => (index === ours) === (cell !== null)),
  )
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
              <helix-text as="p" scale="label">
                {alone.length} jobs only Helix covers
              </helix-text>
              <helix-flex data-density="sm" gap="xs" wrap>
                {alone.map((row) => (
                  <helix-tag key={row.name} tone="accent">
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
            <helix-text as="p" emphasis="muted" scale="caption">
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
          <CoverageCards
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
                  {group.rows.map((row) => {
                    const at = rows.indexOf(row)
                    return (
                      <tr className={styles.row} key={row.name}>
                        <th scope="row">{row.name}</th>
                        {row.cells.map((cell, index) => {
                          const system = COVERAGE.systems[index]
                          const look = {
                            'data-ours': index === ours || undefined,
                            'data-state': state(cell),
                          }
                          if (cell === null || !system) {
                            return (
                              <td key={system?.name ?? index} {...look}>
                                <span aria-hidden="true" className={styles.mark} />
                                <span data-hidden-visually>None</span>
                              </td>
                            )
                          }
                          const id = `coverage-${at}-${index}`
                          return (
                            <td key={system.name}>
                              <button
                                aria-controls={id}
                                aria-expanded="false"
                                aria-haspopup="dialog"
                                className={styles.trigger}
                                data-coverage-col={index}
                                data-coverage-row={at}
                                data-coverage-trigger
                                tabIndex={at === 0 && index === ours ? 0 : -1}
                                type="button"
                                {...look}
                              >
                                <span aria-hidden="true" className={styles.mark} />
                                <span data-hidden-visually>
                                  {cell
                                    .map(
                                      (element) =>
                                        `${element.tag}${element.experimental ? ' (experimental)' : ''}`,
                                    )
                                    .join(', ')}
                                </span>
                              </button>
                              <Card cell={cell} id={id} job={row.name} system={system} />
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              ))}
            </table>
          </CoverageCards>
          <helix-text as="p" class={styles.source} emphasis="muted" scale="caption">
            Every system ships buttons, form controls, menus, and dialogs, so the table lists the
            rest. Read from each system's manifest on {measuredOn(MEASURED)}.{' '}
            <span className={styles.hint}>Hover a mark to see the elements.</span>
            <span className={styles.hintTouch}>Press a mark to see the elements.</span>
          </helix-text>
        </div>
      </div>
    </Band>
  )
}

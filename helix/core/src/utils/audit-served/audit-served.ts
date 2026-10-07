import { reportRuntime } from '../report-runtime/report-runtime.js'

/** The hosts already reported, so each is reported at most once in its life. */
const audited = new WeakSet<HTMLElement>()

/** A row's cells, each as the words it shows, with the white space folded. */
const said = (row: Element): string =>
  [...row.children]
    .filter((cell) => /-table-cell$/.test(cell.localName) || cell.matches('[part~="cell"]'))
    .map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim())
    .join(' | ')

/**
 * Reports a table whose first drawn page differs from the rows the page
 * served, which a reader sees as the rows changing under them once the
 * script runs.
 *
 * **The served rows are the page's own markup and the drawn ones are the
 * table's**, so nothing else can catch it: the two are made by different
 * code, often on different machines, and either can sort, page or format
 * differently. Compared by the words in each cell, which is what a reader
 * sees change, and only as far as the first difference.
 *
 * **In a development build only**, as `missing-name` is: every table would pay
 * for a sentence meant for the person writing the page. Core imports it as
 * `#audit-served`, which `package.json` resolves here under the `development`
 * condition and to `audit-served-off.ts`, which does nothing, everywhere else.
 *
 * `served` are the rows the page wrote, `drawn` the rows the table drew in
 * their place, and `page` how many rows the first page holds.
 */
export const auditServed = (
  host: HTMLElement,
  served: readonly Element[],
  drawn: readonly Element[],
  page: number,
): void => {
  if (served.length === 0 || audited.has(host)) {
    return
  }
  const table = `<${host.localName}${host.getAttribute('label') ? ` label="${host.getAttribute('label')}"` : ''}>`
  let differs = ''
  if (served.length > page) {
    differs = `serves ${served.length} rows and its first page holds ${page}`
  } else {
    const at = served.findIndex(
      (row, index) => drawn[index] && said(row) !== said(drawn[index] as Element),
    )
    if (at !== -1) {
      differs = `serves row ${at + 1} as "${said(served[at] as Element)}" and draws it as "${said(drawn[at] as Element)}"`
    }
  }
  if (differs === '') {
    return
  }
  audited.add(host)
  reportRuntime({
    kind: 'served-rows-differ',
    message:
      `${table} ${differs}, so the rows change once the table draws its own. ` +
      'Serve the first page in the order, the page size and the formatting the table draws it with.',
    tag: host.localName,
  })
}

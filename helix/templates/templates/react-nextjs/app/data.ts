/**
 * The rows the overview draws.
 *
 * A local module and no network, so the starter runs with nothing behind it.
 * Point `rows` at whatever you fetch and the table does not change: it takes the
 * whole result and does the sorting, the filtering and the paging itself. Past
 * the size a browser can hold, `mode="server"` inverts that and the table asks
 * you for a page instead.
 */

/**
 * One person on the roster.
 *
 * **A type alias and not an interface**, which TypeScript makes load-bearing
 * here: `rows` takes `Readonly<Record<string, unknown>>`, an interface has no
 * implicit index signature, and so an interface of exactly these fields is not
 * assignable to it. The error names the index signature and not the shape, so
 * it reads as though the data were wrong.
 */
export type Member = {
  /**
   * A stable identity, which is what `row-key` names.
   *
   * Sorting moves a row's element rather than rewriting every cell in it, so
   * without one a sort throws away focus and anything attached to a row.
   */
  readonly id: string
  /**
   * What the reader is here to find.
   */
  readonly name: string
  /**
   * A number rather than a formatted string, so the column sorts by size.
   *
   * A cell showing `2.4k` sorts as text unless the column's `compare` says what
   * the value underneath is, which is the one thing here that is cheap to get
   * right now and expensive to add later.
   */
  readonly reviews: number
  /**
   * What they do.
   */
  readonly role: string
  /**
   * Who they do it with.
   */
  readonly team: string
}

export const members: readonly Member[] = [
  { id: 'm-01', name: 'Ada Okonkwo', reviews: 184, role: 'Staff', team: 'Platform' },
  { id: 'm-02', name: 'Bruno Salas', reviews: 96, role: 'Senior', team: 'Payments' },
  { id: 'm-03', name: 'Cai Wen', reviews: 231, role: 'Principal', team: 'Platform' },
  { id: 'm-04', name: 'Dilara Yilmaz', reviews: 64, role: 'Senior', team: 'Growth' },
  { id: 'm-05', name: 'Esi Mensah', reviews: 148, role: 'Staff', team: 'Payments' },
  { id: 'm-06', name: 'Felix Braun', reviews: 39, role: 'Engineer', team: 'Growth' },
  { id: 'm-07', name: 'Gita Raman', reviews: 112, role: 'Senior', team: 'Platform' },
  { id: 'm-08', name: 'Hana Sato', reviews: 57, role: 'Engineer', team: 'Design' },
  { id: 'm-09', name: 'Ivan Petrov', reviews: 88, role: 'Senior', team: 'Payments' },
  { id: 'm-10', name: 'Jo Lindqvist', reviews: 21, role: 'Engineer', team: 'Design' },
  { id: 'm-11', name: 'Kwame Asante', reviews: 73, role: 'Staff', team: 'Growth' },
  { id: 'm-12', name: 'Lena Fischer', reviews: 12, role: 'Engineer', team: 'Design' },
]

/** The teams the form offers, read from the roster so the two cannot disagree. */
export const teams: readonly string[] = [...new Set(members.map((one) => one.team))].toSorted()

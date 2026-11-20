/**
 * How many of a set's opening items stand open, as an accordion's `mode`
 * says: any number under `multiple`, one under `single`, and one or none
 * under `single-collapsible`.
 */

/** How many of a set's opening items stand open. */
export type OpenMode = 'multiple' | 'single' | 'single-collapsible'

/** The mode a prop's value says: `multiple` where it holds nothing the set knows. */
export const modeOf = (written: unknown): OpenMode =>
  written === 'single' || written === 'single-collapsible' ? written : 'multiple'

/**
 * Whether the set keeps an item from turning to `checked` before anyone is
 * asked: **under `single`, the open item stays open**, and a press on it
 * sends nothing, as on the web.
 */
export const keepsOpen = (mode: OpenMode, checked: boolean): boolean =>
  mode === 'single' && !checked

/** Whether opening one item closes the others that are open. */
export const closesPeers = (mode: OpenMode): boolean => mode !== 'multiple'

/**
 * Which items stand open once the set settles, by their place, or
 * `undefined` where nothing changes: **the first open item alone** in a set
 * that holds one, and **the first item** under `single` where none is open.
 * The web settles the same way, with nothing sent.
 */
export const settled = (mode: OpenMode, open: readonly boolean[]): boolean[] | undefined => {
  if (mode === 'multiple' || open.length === 0) {
    return undefined
  }
  const first = open.indexOf(true)
  if (first === -1) {
    return mode === 'single' ? open.map((_, at) => at === 0) : undefined
  }
  const next = open.map((_, at) => at === first)
  return next.every((one, at) => one === open[at]) ? undefined : next
}

/**
 * A stack of pages that shows one at a time, with a way back, as a
 * drilldown and a menu that drills hold their pages. **The tree is the
 * state**: a row's page holds that page's rows, so a stack holds one row,
 * the one drilled into, and reads the rest from the tree each time. The web's
 * `DrilldownController` reads the document as the tree, and a phone reads
 * the rows that registered with their parent.
 */

/** What a stack reads of the tree of rows it walks. */
export interface StackTree<Row> {
  /** Whether a row has a page of its own to drill into. */
  readonly hasPage: (row: Row) => boolean
  /** The words that name a row's page: its own words, and not its page's. */
  readonly labelOf: (row: Row) => string
  /** The row whose page holds `row`, or `null` for a row of the top page. */
  readonly parentOf: (row: Row) => Row | null
  /** Whether a row is still in the tree, with every row above it. */
  readonly present: (row: Row) => boolean
  /** The rows of a page: the top page's for `null`, and otherwise the row's own. */
  readonly rowsOf: (page: Row | null) => Row[]
}

/**
 * The row whose page is showing, or `null` at the top. **A row taken out of
 * the tree is no page**, nor is one whose page an ancestor's removal took
 * with it, so the stack is back at the top and holds nothing detached.
 */
export const hereOf = <Row>(tree: StackTree<Row>, current: Row | null): Row | null =>
  current !== null && tree.present(current) ? current : null

/** How deep the page showing is, with the top page at zero, counted by walking up the tree. */
export const depthOf = <Row>(tree: StackTree<Row>, current: Row | null): number => {
  let depth = 0
  for (let row = hereOf(tree, current); row !== null; row = tree.parentOf(row)) {
    depth += 1
  }
  return depth
}

/** The rows from the top page's down to the one whose page is showing, which is last. */
export const pathOf = <Row>(tree: StackTree<Row>, current: Row | null): Row[] => {
  const path: Row[] = []
  for (let row = hereOf(tree, current); row !== null; row = tree.parentOf(row)) {
    path.unshift(row)
  }
  return path
}

/** What the page showing is called: its row's words, and nothing at the top. */
export const labelOf = <Row>(tree: StackTree<Row>, current: Row | null): string => {
  const here = hereOf(tree, current)
  return here === null ? '' : tree.labelOf(here)
}

/** The rows on the page showing, which the keys move among. */
export const rowsOn = <Row>(tree: StackTree<Row>, current: Row | null): Row[] =>
  tree.rowsOf(hereOf(tree, current))

/**
 * The row to show in place of the page showing, or `undefined` where `row`
 * has no page: **a row with no page is refused**, so a reader never lands on
 * an empty page whose one control goes back.
 */
export const enterOf = <Row>(tree: StackTree<Row>, row: Row): Row | undefined =>
  tree.hasPage(row) ? row : undefined

/**
 * Where going back from the page showing lands: the page above, one level,
 * `null` for the top page, and whether there was a page to leave. A reader
 * three levels down pressed one control and goes up one level.
 */
export const backOf = <Row>(
  tree: StackTree<Row>,
  current: Row | null,
): { readonly moved: boolean; readonly to: Row | null } => {
  const here = hereOf(tree, current)
  return here === null ? { moved: false, to: null } : { moved: true, to: tree.parentOf(here) }
}

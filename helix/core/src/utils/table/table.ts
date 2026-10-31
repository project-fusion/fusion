/**
 * The arithmetic of a table, which the web elements and a phone's machines both
 * read.
 */

export { type GridPlace, gridMove, pageRows } from '../grid-move/grid-move.js'
export { rangeAdd } from '../range-add/range-add.js'
export { cycle, format, parse } from '../row-order/row-order.js'
export { type TreeArrow, treeArrow } from '../tree-arrow/tree-arrow.js'
export { Typeahead } from '../typeahead/typeahead.js'
export {
  anchorAt,
  commaList,
  everyState,
  inRowOrder,
  toggleEvery,
} from '../written-list/written-list.js'
export { type NestingRow, nestedRows, type RowShape, rowShapes, sortedRows } from './rows.js'
export { fittedTracks, SAMPLE, tracksOf } from './tracks.js'

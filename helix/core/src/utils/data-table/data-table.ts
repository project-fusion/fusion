/**
 * The arithmetic of a table drawn from an array, which the web element and a
 * phone's machine both read: what a search leaves, how it sorts, which rows a
 * page holds, and how rows that hold rows are laid out.
 */

export { valueAt } from '../row-data/row-data.js'
export {
  type Arranged,
  type Axis,
  arranged,
  type DataRow,
  filter,
  type Ordered,
  ordered,
  sort,
  window_,
} from '../row-order/row-order.js'
export { toggledOpen } from './keys.js'
export { childrenOf, type Grown, grow, type Placement } from './tree.js'

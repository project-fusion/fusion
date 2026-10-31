import { callback, cancelable, headless, oneOf, Pressable, Slot, View } from '../../../render.js'

/**
 * One column of a table, in its headless tier: its heading, its width, and the
 * field it reads from each row. `Table` and `DataTable` both hold it.
 *
 * **`width` is the track this column takes**, as CSS's track lists write one.
 * Left unset it takes the track in its place in the table's `columns`, and
 * otherwise a table fits it to what it holds.
 *
 * **`sortable` with a `field` draws the heading as a press** that sorts the
 * table by the column, and the column says which way it is ordered: `aria-sort`
 * on the web and the words of a phone's value.
 *
 * **`resizable` draws a separator on the heading's end edge.** A drag moves it,
 * as do the arrow keys on the web and a screen reader's adjustments on a phone,
 * and `before-resize` and `resized` ask and say each width.
 *
 * **`cell` and `compare` read a row's data, which only `DataTable` holds.** The
 * web's `cell` returns what Lit can render. A phone's `Table` draws the cells it
 * is given and calls neither, until `DataTable` is drawn on a phone.
 *
 * **Held to `helix-table-column`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('table-column', {
  props: {
    cell: callback('(row: Readonly<Record<string, unknown>>) => unknown'),
    compare: callback('(row: Readonly<Record<string, unknown>>) => unknown'),
    field: '',
    moveLabel: '{named, select, no {Move column} other {Move {name}}}',
    resizable: false,
    resizeLabel: '{named, select, no {Resize column} other {Resize {name}}}',
    rowHeader: false,
    sortable: false,
    textAlign: oneOf(['center', 'end', 'start']),
    width: '',
    widthLabel: '{width, plural, one {# pixel} other {# pixels}}',
  },
  events: {
    beforeResize: cancelable(['value']),
    resized: ['value'],
  },
  states: ['settled', 'sortedAscending', 'sortedDescending'],
  tableColumn: {
    field: 'field',
    movable: 'movable',
    onBeforeResize: 'beforeResize',
    onResized: 'resized',
    resizable: 'resizable',
    resizeLabel: 'resizeLabel',
    sortable: 'sortable',
    sorts: 'sorts',
    still: 'still',
    textAlign: 'textAlign',
    width: 'width',
    widthLabel: 'widthLabel',
  },
  render: ({ props, tableColumn }) => (
    <View part="column">
      {tableColumn.movable && (
        <Pressable part="grip">
          <View
            ariaHidden
            icon="dots-six-vertical"
            part="grip-mark"
          />
        </Pressable>
      )}
      {tableColumn.sorts && (
        <Pressable part="sort">
          <Slot />
        </Pressable>
      )}
      {tableColumn.still && <Slot />}
      {props.resizable && (
        <View
          part="resizer"
          role="separator"
        />
      )}
    </View>
  ),
})

import {
  callback,
  cancelable,
  headless,
  oneOf,
  Path,
  Pressable,
  Slot,
  Svg,
  View,
} from '../../../render.js'

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
 * **A sortable heading draws two chevrons after its words.** The chevron for the
 * current direction takes the heading's ink, so you can see which columns sort
 * and which way the table is sorted.
 *
 * **`menu` adds a small button after the chevrons, in a web `DataTable`.** A
 * phone's `Table` ignores it, until `DataTable` is drawn on a phone.
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
    menu: false,
    menuLabel: '{named, select, no {Column menu} other {{name} column menu}}',
    minTableWidth: '',
    moveLabel: '{named, select, no {Move column} other {Move {name}}}',
    resizable: false,
    resizeLabel: '{named, select, no {Resize column} other {Resize {name}}}',
    rowHeader: false,
    sortable: false,
    textAlign: oneOf(['center', 'end', 'start']),
    /* Where the column's cells sit from top to bottom; the web writes it on each cell. */
    verticalAlign: oneOf(['center', 'end', 'start']),
    width: '',
    widthLabel: '{width, plural, one {# pixel} other {# pixels}}',
  },
  events: {
    beforeResize: cancelable(['value']),
    resized: ['value'],
  },
  states: ['hasMenu', 'settled', 'sortedAscending', 'sortedDescending'],
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
          <Svg
            ariaHidden
            part="sort-mark"
            viewBox="0 0 18 18"
          >
            <Path
              d="M5.5 7.2 9 3.7l3.5 3.5"
              part="sort-up"
            />
            <Path
              d="M5.5 10.8 9 14.3l3.5-3.5"
              part="sort-down"
            />
          </Svg>
        </Pressable>
      )}
      {tableColumn.still && <Slot />}
      {props.menu && (
        <Pressable
          part="menu-button"
          platform="web"
        >
          <View
            ariaHidden
            icon="dots-three"
            part="menu-mark"
          />
        </Pressable>
      )}
      {props.resizable && (
        <View
          part="resizer"
          role="separator"
        />
      )}
    </View>
  ),
})

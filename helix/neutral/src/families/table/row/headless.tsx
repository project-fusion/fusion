import { headless, Pressable, Repeat, Slot, string, View, Wrap, web } from '../../../render.js'

/**
 * One row of a table, in its headless tier: the cells it holds, and the cells
 * the table has it draw before them.
 *
 * **The row lays out none of its cells on the web**, which are items of the
 * table's one grid. A phone has no grid, so the row draws each cell in a box as
 * wide as the column's track, which the table works out once for every row.
 *
 * **In a `selectable` table the row draws a checkbox cell**, in a `reorderable`
 * table a grip cell before that, and in a table whose rows nest a disclosure
 * cell after it. `value` is the key the table knows the row by. `disabled` keeps
 * the row out of the selection and out of its link.
 *
 * **`parent` nests the row under another**, by that row's key, and its rows are
 * drawn only while it is open.
 *
 * **`href` makes the whole row a link**: a press anywhere on the row follows it,
 * except on a control of the row's own.
 *
 * **What a screen reader hears on a phone.** Each cell of words is one stop,
 * which says its column's heading and its words, under the words `cellReading`
 * in `helix-table`. A cell that holds controls leaves them to be reached.
 *
 * **Held to `helix-table-row`.** `helix system check` compares the props, the
 * states, the regions, and the parts with what the manifest says the element has.
 */
export default headless('table-row', {
  props: {
    disabled: false,
    href: '',
    parent: '',
    rel: web(string()),
    target: web(string()),
    value: '',
  },
  events: {},
  states: ['dragging', 'dropAfter', 'dropBefore', 'expanded', 'link', 'selected', 'settled'],
  tableRow: {
    branch: 'branch',
    cells: 'cells',
    disabled: 'disabled',
    grips: 'grips',
    gripStill: 'gripStill',
    href: 'href',
    nests: 'nests',
    parent: 'parent',
    selectable: 'selectable',
    selectedCell: 'selectedCell',
    value: 'value',
  },
  render: ({ entry, tableRow }) => (
    <>
      {tableRow.grips && (
        <View
          part="grip"
          role="cell"
        >
          <Pressable
            data-still={tableRow.gripStill}
            part="grip-button"
          >
            <View
              ariaHidden
              icon="dots-six-vertical"
              part="grip-mark"
            />
          </Pressable>
        </View>
      )}
      {tableRow.selectable && (
        <View
          also={{ 'select-selected': tableRow.selectedCell }}
          part="select"
          role="cell"
        >
          <Wrap
            draws="checkbox"
            exports={{
              box: true,
              control: true,
              feedback: true,
              field: true,
              hint: true,
              label: true,
              mark: true,
              'mark-checked': true,
              'mark-dash': true,
              'mark-indeterminate': true,
            }}
            part="checkbox"
          />
        </View>
      )}
      {tableRow.nests && (
        <View
          part="expand"
          role="cell"
        >
          {tableRow.branch && (
            <Pressable part="expand-button">
              <View
                ariaHidden
                icon="caret-right"
                part="expand-mark"
              />
            </Pressable>
          )}
        </View>
      )}
      <Slot platform="web" />
      <Repeat
        each={tableRow.cells}
        key="key"
        part="cells"
      >
        <View
          data-pinned={entry.pinned}
          part="cell-box"
          platform="native"
        >
          <Wrap
            part="cell-content"
            passes={entry.key}
            platform="native"
            renders={entry.draw}
          />
        </View>
      </Repeat>
    </>
  ),
})

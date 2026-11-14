import {
  Announce,
  cancelable,
  headless,
  oneOf,
  Repeat,
  Slot,
  string,
  Text,
  View,
  Wrap,
} from '../../../render.js'

/**
 * A table's headless tier: rows of cells that line up under one set of tracks.
 *
 * **One set of tracks.** On the web the table is one CSS grid and its rows take
 * no box. A phone has no grid, so the table works the same tracks out in points,
 * from `columns` and each column's `width`, and each row draws its cells at
 * those widths. A track sized by its content takes the widest cell drawn so far.
 *
 * **On a phone a wide table scrolls across with its first column pinned**, and
 * a screen reader hears each cell with its column's heading (decision 12). A
 * table carries no stacked-card variant: a phone that wants cards uses Card or
 * List.
 *
 * **Sorting, selecting, nesting, and moving rows** ask first and say what stood,
 * as on the web, with the same events and the same values, from core's arithmetic.
 *
 * **`grid` makes the table one stop that the arrow keys move through**, the
 * headings included, with core's `gridMove`. On a phone they are a hardware
 * keyboard's, and a screen reader moves from cell to cell in any table.
 *
 * **`windowed` draws the rows near the screen**, in `FlatList`, under headings
 * drawn outside what scrolls. The rows are still all in the page's markup.
 *
 * **The web's**: `error-text`'s live region, the drag's preview that follows the
 * pointer in the top layer, the `--table-columns` hook, printing, and Tab's ends
 * of a grid. A phone announces what a live region says.
 *
 * **Held to `helix-table`.** `helix system check` compares the props, the events,
 * the states, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('table', {
  props: {
    ascendingLabel: 'ascending',
    canceledLabel: 'Canceled',
    columns: '',
    defaultExpanded: '',
    defaultSelected: '',
    defaultSort: '',
    descendingLabel: 'descending',
    droppedLabel: 'Dropped',
    emptyText: '',
    errorText: '',
    expandColumnLabel: 'Expand',
    expanded: string(),
    expandRowLabel: 'Expand {row}',
    fallbackLabel: 'Table',
    grid: false,
    label: '',
    loading: false,
    loadingText: 'Loading more',
    loadMore: false,
    movedLabel: '{name} moved to position {position} of {count}',
    moveRowLabel: 'Move {row}',
    pickedUpLabel: 'Picked up {name}',
    reorderable: false,
    rowGripsLabel: 'Move rows',
    selectable: false,
    selectAllLabel: 'Select every row',
    selectColumnLabel: 'Select',
    selected: string(),
    selectedLabel: '{count} selected',
    selectionBehavior: oneOf(['replace', 'toggle'], 'toggle'),
    selectionMode: oneOf(['multiple', 'single']),
    selectRowLabel: 'Select {row}',
    sort: string(),
    sortedLabel:
      '{direction, select, ascending {Sorted by {column}, ascending} descending {Sorted by {column}, descending} other {Sorted by {column}}}',
    unsortedLabel: 'Not sorted',
    windowed: false,
  },
  events: {
    beforeExpand: cancelable(['value']),
    beforeReorder: cancelable(['from', 'key', 'keys', 'kind', 'to', 'value']),
    beforeSelect: cancelable(['value']),
    beforeSort: cancelable(['value']),
    expand: ['value'],
    loadMore: [],
    reorder: ['from', 'key', 'keys', 'kind', 'to', 'value'],
    select: ['value'],
    sort: ['value'],
  },
  states: ['empty', 'error', 'loading', 'settled'],
  tableRoot: {
    columns: 'columns',
    defaultExpanded: 'defaultExpanded',
    defaultSelected: 'defaultSelected',
    defaultSort: 'defaultSort',
    empty: 'empty',
    every: 'every',
    expanded: 'expanded',
    grid: 'grid',
    heads: 'heads',
    label: 'label',
    loadMore: 'loadMore',
    nests: 'nests',
    onBeforeExpand: 'beforeExpand',
    onBeforeReorder: 'beforeReorder',
    onBeforeSelect: 'beforeSelect',
    onBeforeSort: 'beforeSort',
    onExpand: 'expand',
    onLoadMore: 'loadMore',
    onReorder: 'reorder',
    onSelect: 'select',
    onSort: 'sort',
    reorderable: 'reorderable',
    rows: 'rows',
    selectable: 'selectable',
    selected: 'selected',
    selectionBehavior: 'selectionBehavior',
    selectionMode: 'selectionMode',
    sort: 'sort',
    waiting: 'waiting',
    windowed: 'windowed',
  },
  render: ({ entry, props, tableRoot }) => (
    <>
      <Slot name="heading" />
      <View
        part="grid-start"
        platform="web"
      />
      <View
        busy={props.loading}
        label={props.label}
        part="table"
        role="table"
      >
        <View
          part="head"
          role="row"
        >
          {props.reorderable && (
            <View
              label={props.rowGripsLabel}
              part="grip-head"
              role="columnheader"
            />
          )}
          {props.selectable && (
            <View
              part="select-all"
              role="columnheader"
            >
              {tableRoot.every && (
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
              )}
            </View>
          )}
          {tableRoot.nests && (
            <View
              label={props.expandColumnLabel}
              part="expand-head"
              role="columnheader"
            />
          )}
          <Slot
            name="columns"
            platform="web"
          />
          <Repeat
            each={tableRoot.heads}
            key="key"
            part="heads"
          >
            <View
              data-pinned={entry.pinned}
              part="head-box"
              platform="native"
            >
              <Wrap
                part="head-content"
                passes={entry.key}
                platform="native"
                renders={entry.draw}
              />
            </View>
          </Repeat>
        </View>
        <View
          part="before"
          platform="web"
        />
        <Slot platform="web" />
        <View
          part="after"
          platform="web"
        />
        {/* The first thing a windowed repeat holds is a copy for each row, and
            what follows stands after the rows, inside what scrolls. */}
        <Repeat
          each={tableRoot.rows}
          key="key"
          part="rows"
          windowed
        >
          <Wrap
            part="row-content"
            passes={entry.key}
            platform="native"
            renders={entry.draw}
          />
          {props.errorText && (
            <View
              part="error"
              role="row"
            >
              <Slot name="error">
                <Text part="error-words">{props.errorText}</Text>
              </Slot>
            </View>
          )}
          {tableRoot.waiting && (
            <View part="loading">
              <Slot name="loading">
                <Text part="loading-words">{props.loadingText}</Text>
              </Slot>
            </View>
          )}
          {tableRoot.empty && (
            <View part="empty">
              <Slot name="empty">
                <Text part="empty-words">{props.emptyText}</Text>
              </Slot>
            </View>
          )}
        </Repeat>
      </View>
      <View
        part="grid-end"
        platform="web"
      />
      <Announce
        part="live"
        platform="web"
      />
      <View
        ariaHidden
        part="drag-preview"
        platform="web"
      />
    </>
  ),
})

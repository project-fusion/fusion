import {
  Announce,
  callback,
  cancelable,
  headless,
  number,
  object,
  oneOf,
  Pressable,
  property,
  Repeat,
  Slot,
  Svg,
  string,
  Text,
  View,
  Wrap,
} from '../../../render.js'

/**
 * A table drawn from an array, in its headless tier: columns written as
 * `TableColumn` children, rows passed as data, and what a reader searches, sorts,
 * pages through, selects, opens, moves, and hides. Core's arithmetic decides what
 * shows, on either platform.
 *
 * **On a phone each row is a `TableRow` of `TableCell`s**, which Table's machine
 * lines up and draws. The web draws its rows in its own root.
 *
 * **The web's**: the rows a page serves, `estimate`, `cellStyles`, the drag's
 * preview, a column moved by its grip, and `row-parts`.
 *
 * **Held to `helix-data-table`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says.
 */
export default headless('data-table', {
  props: {
    ascendingLabel: 'ascending',
    canceledLabel: 'Canceled',
    cellStyles: property(object()),
    childField: string(),
    columns: '',
    defaultExpanded: '',
    defaultFilter: '',
    defaultOrder: '',
    defaultPage: 1,
    defaultPageSize: 0,
    defaultSelected: '',
    defaultSort: '',
    descendingLabel: 'descending',
    droppedLabel: 'Dropped',
    emptyText: '',
    errorText: '',
    estimate: 32,
    expanded: string(),
    filter: string(),
    gapLabel: 'Skip to page {page}',
    hideColumnLabel: 'Hide column',
    label: '',
    loading: false,
    loadingText: 'Loading more',
    loadMore: false,
    loadMoreLabel: 'Load more',
    locale: '',
    mode: oneOf(['client', 'server'], 'client'),
    movedLabel: '{name} moved to position {position} of {count}',
    moveLeftLabel: 'Move left',
    moveRightLabel: 'Move right',
    moveRowLabel: 'Move {row}',
    nextLabel: 'Next page',
    order: string(),
    page: number(),
    pageLabel: 'Page {page}',
    pageSize: number(),
    paginated: false,
    paginationLabel: 'Pagination',
    pickedUpLabel: 'Picked up {name}',
    previousLabel: 'Previous page',
    reorderable: false,
    reorderableRows: false,
    resultLabel: string(),
    resultsLabel: '{count, plural, one {# result} other {# results}}',
    rowGripsLabel: 'Move rows',
    rowKey: '',
    rowLink: false,
    rowParts: callback('(row: Readonly<Record<string, unknown>>, index: number) => string'),
    rows: property(object()),
    selectable: false,
    selectAllLabel: 'Select every row',
    selected: string(),
    selectedLabel: '{count} selected',
    selectionBehavior: oneOf(['replace', 'toggle'], 'toggle'),
    selectRowLabel: 'Select {row}',
    showColumnsLabel: 'Show hidden columns',
    sort: string(),
    sortAscendingLabel: 'Sort ascending',
    sortDescendingLabel: 'Sort descending',
    sortedLabel:
      '{direction, select, ascending {Sorted by {column}, ascending} descending {Sorted by {column}, descending} other {Sorted by {column}}}',
    total: 0,
    unsortedLabel: 'Not sorted',
    windowed: false,
  },
  events: {
    beforeColumnToggle: cancelable(['field', 'hidden']),
    beforeFilter: cancelable(['value']),
    beforeFollow: cancelable(['href']),
    beforeNavigate: cancelable(['page', 'value']),
    beforeReorder: cancelable(['from', 'key', 'keys', 'kind', 'to', 'value']),
    beforeSelect: cancelable(['value']),
    beforeSort: cancelable(['value']),
    columnToggle: ['field', 'hidden'],
    expand: ['value'],
    filter: ['value'],
    follow: ['href'],
    loadMore: [],
    navigate: ['page', 'value'],
    reorder: ['from', 'key', 'keys', 'kind', 'to', 'value'],
    select: ['value'],
    sort: ['value'],
  },
  states: ['empty', 'error', 'loading', 'settled'],
  dataTableRoot: {
    data: 'rows',
    empty: 'empty',
    every: 'every',
    heads: 'heads',
    more: 'more',
    nests: 'nests',
    pagination: 'pagination',
    rows: 'rows',
    waiting: 'waiting',
  },
  render: ({ dataTableRoot, entry, props }) => (
    <>
      <View part="toolbar">
        <Slot name="toolbar" />
      </View>
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
          {props.reorderableRows && (
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
          <Slot platform="web" />
          <Repeat
            each={dataTableRoot.heads}
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
        <View
          also={{
            'row-dragging': props.reorderableRows,
            'row-drop-after': props.reorderableRows,
            'row-drop-before': props.reorderableRows,
            'row-last': props.reorderableRows,
          }}
          part="row"
          platform="web"
        >
          <View
            part="row-grip"
            role="cell"
          >
            <Pressable part="row-grip-button">
              <View
                ariaHidden
                icon="dots-six-vertical"
                part="row-grip-mark"
              />
            </Pressable>
          </View>
          <View
            also={{ 'select-selected': props.selectable }}
            part="select"
            role="cell"
          />
          <View
            also={{ 'cell-header': props.rowLink, 'cell-selected': props.selectable }}
            part="cell"
            role="cell"
          >
            <Pressable
              also={{ 'toggle-open': props.selectable }}
              part="toggle"
            >
              <Svg
                ariaHidden
                part="toggle-mark"
                viewBox="0 0 256 256"
              />
            </Pressable>
          </View>
        </View>
        <Slot platform="web" />
        <View
          part="after"
          platform="web"
        />
        {/* The first thing a windowed repeat holds is a copy for each row, and
            what follows stands after the rows, inside what scrolls. */}
        <Repeat
          each={dataTableRoot.rows}
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
          {dataTableRoot.more && (
            <View
              part="more"
              role="row"
            >
              <View part="more-cell">
                <Pressable part="more-button">
                  <Text part="more-words">{props.loadMoreLabel}</Text>
                </Pressable>
              </View>
            </View>
          )}
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
          {dataTableRoot.waiting && (
            <View part="loading">
              <Slot name="loading">
                <Text part="loading-words">{props.loadingText}</Text>
              </Slot>
            </View>
          )}
          {dataTableRoot.empty && (
            <View part="empty">
              <Slot name="empty">
                <Text part="empty-words">{props.emptyText}</Text>
              </Slot>
            </View>
          )}
        </Repeat>
      </View>
      <Announce
        part="live"
        platform="web"
      />
      <View part="footer">
        <Slot name="footer" />
        {dataTableRoot.pagination && (
          <Wrap
            draws="pagination"
            exports={{
              first: true,
              gap: true,
              item: true,
              last: true,
              list: true,
              live: true,
              mark: true,
              next: true,
              page: true,
              'page-current': true,
              previous: true,
              status: true,
            }}
            part="pagination"
          />
        )}
      </View>
      {/* A column draws its menu in its own root, and the table names its parts. */}
      <View
        also={{
          'menu-back': props.selectable,
          'menu-back-mark': props.selectable,
          'menu-empty': props.selectable,
          'menu-header': props.selectable,
          'menu-live': props.selectable,
          'menu-loading': props.selectable,
          'menu-search-field': props.selectable,
          'menu-title': props.selectable,
        }}
        part="menu-surface"
        platform="web"
      >
        <Wrap
          draws="menu-item"
          exports={{
            end: true,
            item: true,
            mark: true,
            shortcut: true,
            'shortcut-kbd': true,
            'shortcut-key': true,
            'shortcut-separator': true,
            start: true,
            surface: true,
          }}
          part="menu-entry"
          platform="web"
        />
        <Wrap
          draws="divider"
          exports={{ content: true, line: true }}
          part="menu-divider"
          platform="web"
        />
      </View>
      {/* A phone's column draws its menu from these, which the element brings in. */}
      <View
        draws="menu"
        hidden
        part="column-menu"
        platform="native"
      />
      <View
        draws="divider"
        hidden
        part="column-menu-line"
        platform="native"
      />
      <View
        draws="icon-button"
        hidden
        part="column-menu-button"
        platform="native"
      />
      <View
        draws="icon"
        hidden
        part="column-menu-mark"
        platform="native"
      />
      <View
        ariaHidden
        part="drag-preview"
        platform="web"
      />
    </>
  ),
})

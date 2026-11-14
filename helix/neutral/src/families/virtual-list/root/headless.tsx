import {
  bare,
  callback,
  cancelable,
  headless,
  object,
  oneOf,
  Pressable,
  property,
  Repeat,
  Slot,
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Virtual List's headless tier: what it takes, what it sends, and its parts.
 *
 * **The items arrive as data, in `items`, and `renderItem` draws each one.**
 * On the web the rows are your markup in the light DOM, filled from a row
 * `<template>` or by `renderItem` with what Lit draws. On a phone `renderItem`
 * gives a native node, and an item with no `renderItem` is its words:
 * `text-field`, or a string or a number item itself.
 *
 * **A phone windows the rows with `FlatList`**, which draws what is near the
 * screen. It lays items out in `columns`, or as many as fit at
 * `min-column-width`, along a line under `orientation="horizontal"`, and with
 * a header row before each section under `section-field`. A waterfall stands
 * each item under the column that ends highest, in a scroll view that draws
 * the items reaching the screen, from core's `Waterfall`.
 *
 * **Keys and a press read core's arithmetic**, the same the web element
 * reads, so an arrow, Home, End, Page Up, Page Down, a typed letter, Space,
 * Escape, and Control or Command with A land on the same item on both
 * platforms. On a phone they are a hardware keyboard's. A row a screen reader
 * reaches says whether it is selected and disabled.
 *
 * **Moving an item.** Under `reorderable`, Alt with an arrow, a screen
 * reader's actions, and a long press and a drag on a row move it, and send
 * `before-reorder` and `reorder` with every key in the new order. The web
 * needs `@fusion.dev/helix/virtual-list/reorder` imported. A phone carries the
 * moves in the runtime.
 *
 * **Web only:** the row `<template>`, `for`, a row's `aria-posinset` and
 * `aria-setsize`, the `grid` roles a screen reader reads a grid by, and the
 * scrollbars the web draws, where a phone shows the platform's own
 * indicators.
 */
export default headless('virtual-list', {
  props: {
    columns: 1,
    disabledKeys: '',
    /* The old name of `empty-text`, the web's for one release. */
    emptyLabel: web(''),
    emptyText: '',
    estimate: 32,
    /* The id of a script element, and a phone has no document to find one in. */
    for: web(''),
    gap: 0,
    items: property(object()),
    keyField: '',
    label: '',
    layout: oneOf(['grid', 'waterfall'], 'grid'),
    loading: false,
    /* The old name of `loading-text`, the web's for one release. */
    loadingLabel: web(''),
    loadingText: 'Loading more',
    measured: false,
    minColumnWidth: 0,
    orientation: oneOf(['horizontal', 'vertical'], 'vertical'),
    renderItem: callback('(item: any, index: number) => ReactNode'),
    renderSection: callback('(name: string, index: number) => ReactNode'),
    reorderable: false,
    sectionField: '',
    selectionBehavior: oneOf(['replace', 'toggle'], 'toggle'),
    selectionMode: oneOf(['multiple', 'single']),
    textField: '',
    value: '',
  },
  events: {
    beforeChange: cancelable(['value']),
    beforeReorder: cancelable(['from', 'key', 'keys', 'kind', 'to', 'value']),
    change: bare(),
    loadMore: [],
    rangeChange: ['first', 'last'],
    reorder: ['from', 'key', 'keys', 'kind', 'to', 'value'],
  },
  states: ['empty', 'horizontal', 'loading', 'settled'],
  window: {
    columns: 'columns',
    disabledKeys: 'disabledKeys',
    empty: 'empty',
    estimate: 'estimate',
    gap: 'gap',
    horizontal: 'horizontal',
    items: 'items',
    keyField: 'keyField',
    layout: 'layout',
    list: 'rows',
    loading: 'loading',
    loadingState: 'loading',
    minColumnWidth: 'minColumnWidth',
    onBeforeChange: 'beforeChange',
    onBeforeReorder: 'beforeReorder',
    onChange: 'change',
    onLoadMore: 'loadMore',
    onRangeChange: 'rangeChange',
    onReorder: 'reorder',
    orientation: 'orientation',
    reorderable: 'reorderable',
    sectionField: 'sectionField',
    selectionBehavior: 'selectionBehavior',
    selectionMode: 'selectionMode',
    textField: 'textField',
    value: 'value',
  },
  render: ({ entry, props, state, window }) => (
    <View
      busy={props.loading}
      label={props.label}
      part="viewport"
    >
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
        each={window.list}
        key="key"
        part="rows"
        windowed
      >
        <View
          part="line"
          platform="native"
        >
          <View
            hidden={entry.notHeader}
            part="section-header"
            platform="native"
          >
            <Wrap
              part="section-content"
              passes={entry.section}
              platform="native"
              renders={props.renderSection}
            >
              <Text part="section-words">{entry.section}</Text>
            </Wrap>
          </View>
          <View
            hidden={entry.header}
            part="row-box"
            platform="native"
          >
            <Pressable
              also={{
                'row-active': entry.active,
                'row-disabled': entry.disabled,
                'row-dragging': entry.dragging,
                'row-drop-after': entry.dropAfter,
                'row-drop-before': entry.dropBefore,
                'row-selected': entry.selected,
              }}
              part="row"
              platform="native"
            >
              <Wrap
                part="row-content"
                passes={entry.item}
                platform="native"
                renders={props.renderItem}
              >
                <Text part="row-words">{entry.words}</Text>
              </Wrap>
            </Pressable>
          </View>
        </View>
        {props.loading && (
          <View
            part="loading"
            role="listitem"
          >
            <Slot name="loading">
              <Text part="loading-words">{props.loadingText}</Text>
            </Slot>
          </View>
        )}
        {state.empty && !props.loading && (
          <Wrap
            part="empty-shown"
            platform="native"
            when={props.emptyText}
          >
            <View
              part="empty"
              role="listitem"
            >
              <Slot name="empty">
                <Text part="empty-words">{props.emptyText}</Text>
              </Slot>
            </View>
          </Wrap>
        )}
      </Repeat>
    </View>
  ),
})

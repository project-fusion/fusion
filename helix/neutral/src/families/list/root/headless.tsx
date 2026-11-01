import {
  Announce,
  bare,
  cancelable,
  headless,
  number,
  oneOf,
  Slot,
  string,
  Text,
  View,
  web,
} from '../../../render.js'

/**
 * A list's headless tier: what it takes, what it sends, and its parts.
 *
 * **The list holds which rows are selected, and its rows join it.** A row is
 * an item of the list's collection by its `value`. How many a reader can
 * select is `selection-mode`, and what a press does to the rows already
 * selected is `selection-behavior`.
 *
 * **The list numbers its rows.** Where the count starts is `start`, and
 * `reversed` counts down from the number of rows. The rows read the first
 * number and the step as `--list-first` and `--list-step`, which the counters
 * of an ordered list and its rail add up.
 *
 * **Held to `helix-list`.** `helix system check` compares the props, events,
 * states, regions, and parts with what the manifest says the element has.
 */
export default headless('list', {
  props: {
    /* `canceledLabel`, `droppedLabel`, `moveLabel`, `movedLabel`, and
       `pickedUpLabel` are what a reorder says to a screen reader, step by
       step. */
    canceledLabel: 'Canceled',
    disabledBehavior: oneOf(['all', 'selection']),
    droppedLabel: 'Dropped',
    /* The old name of `empty-text`, which the web reads for one release. */
    emptyLabel: web(string()),
    emptyText: 'No items',
    kind: oneOf(['default', 'description', 'ordered', 'unordered']),
    label: '',
    loading: false,
    /* The old name of `loading-text`, which the web reads for one release. */
    loadingLabel: web(string()),
    loadingText: 'Loading more',
    loadMore: false,
    movedLabel: '{name} moved to position {position} of {count}',
    moveLabel: 'Move {name}',
    pickedUpLabel: 'Picked up {name}',
    reorderable: false,
    reversed: false,
    selectionBehavior: oneOf(['replace', 'toggle'], 'toggle'),
    selectionMode: oneOf(['multiple', 'none', 'single']),
    start: number(),
    type: oneOf(['1', 'a', 'A', 'i', 'I']),
    value: '',
  },
  events: {
    action: [],
    beforeChange: cancelable(['value']),
    beforeReorder: cancelable(['keys']),
    /* The platform's own name, as a form control sends it. */
    change: bare(),
    loadMore: [],
    reorder: ['keys'],
  },
  states: ['empty', 'loading', 'settled'],
  collection: {
    /* **The keys only move focus down the rows, and stop at the ends**, as
       the web's list does. Left and Right are the row's own. */
    keys: { itemKeys: ['ArrowLeft', 'ArrowRight'], loop: false, selectionFollowsFocus: false },
    numbering: { first: 'listFirst', reversed: 'reversed', start: 'start', step: 'listStep' },
    empty: 'empty',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    prop: 'value',
    /* **A `reorderable` list lets a reader move its rows**, by a grip on each
       row. It moves no row itself: it asks with `before-reorder`, then says
       the new order in `reorder`, and the page moves its rows. */
    reorder: {
      canceled: 'canceledLabel',
      dropped: 'droppedLabel',
      enabled: 'reorderable',
      move: 'moveLabel',
      moved: 'movedLabel',
      onBeforeReorder: 'beforeReorder',
      onReorder: 'reorder',
      picked: 'pickedUpLabel',
      preview: 'drag-preview',
    },
    selectionBehavior: 'selectionBehavior',
    selectionMode: 'selectionMode',
  },
  render: ({ props, state }) => (
    <>
      <Slot />
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
      {state.empty && (
        <View
          hidden={!props.emptyText}
          part="empty"
          role="listitem"
        >
          <Slot name="empty">
            <Text part="empty-words">{props.emptyText}</Text>
          </Slot>
        </View>
      )}
      {/* A pointer's move, and what it says on the way, are the web's for now. */}
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

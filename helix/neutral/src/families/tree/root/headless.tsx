import { Announce, cancelable, headless, oneOf, Slot, string, Text, View } from '../../../render.js'

/**
 * A tree's headless tier: a hierarchy of items, with branches that open and
 * close.
 *
 * **The tree holds what is chosen, and its items join it wherever they stand.**
 * `active` holds the chosen value, and `before-activate` and then `activate`
 * ask and say each change. An item's level, its place among its siblings, and
 * whether it is a branch come from where it stands, so an item a page moves
 * needs no word about it. On the web the element walks its items, and on a
 * phone each item joins through a context.
 *
 * **Keys read core's arithmetic**, the same the web element reads: Up and Down
 * move between the items a reader can see, Right opens a shut branch and then
 * moves into it, Left shuts an open one and then moves to its parent, the two
 * swapping on a right-to-left page, Home and End go to the first and the last,
 * a typed letter goes to the next item it starts, and `*` opens every branch
 * beside the item. On a phone they are a hardware keyboard's.
 *
 * **`selection-mode="multiple"` draws a check mark on every row.** Checking a
 * branch checks every item under it, and a branch some of whose items are
 * checked is partly checked. `selection-mode="leaf"` chooses only the items at
 * the ends.
 *
 * **`reorderable` lets a reader move items among their siblings**, and with
 * Alt and the arrow along the line, into another branch. A drop asks with
 * `before-reorder` and says the new order in `reorder`, and the page moves the
 * items. On a phone, a drag on the grip, a press on the grip and a press on a
 * sibling, and a screen reader's actions on the row move them too.
 *
 * **The web's**: `values`, the drag's preview that follows the pointer in the
 * top layer, and the live region a move is said in, where a phone announces.
 * Rows keep to the height of what they draw on a phone, and a long tree scrolls
 * with the page around it.
 *
 * **Held to `helix-tree`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('tree', {
  props: {
    active: string(),
    canceledLabel: 'Canceled',
    chevronPlacement: oneOf(['end', 'label', 'start']),
    defaultActive: '',
    droppedLabel: 'Dropped',
    emptyText: '',
    label: '',
    loading: false,
    loadingText: 'Loading more',
    movedIntoLabel: '{name} moved into {parent}, position {position} of {count}',
    movedLabel: '{name} moved to position {position} of {count}',
    nesting: oneOf(['heading', 'peer', 'subordinate']),
    pickedUpLabel: 'Picked up {name}',
    reorderable: false,
    selectionMode: oneOf(['leaf', 'multiple']),
  },
  events: {
    activate: ['previous', 'value'],
    beforeActivate: cancelable(['value']),
    beforeReorder: cancelable(['from', 'key', 'keys', 'kind', 'parent', 'to', 'value']),
    beforeSelect: cancelable(['value']),
    reorder: ['from', 'key', 'keys', 'kind', 'parent', 'to', 'value'],
  },
  states: ['settled'],
  treeRoot: {
    active: 'active',
    canceledLabel: 'canceledLabel',
    chevronPlacement: 'chevronPlacement',
    defaultActive: 'defaultActive',
    droppedLabel: 'droppedLabel',
    empty: 'empty',
    label: 'label',
    movedIntoLabel: 'movedIntoLabel',
    movedLabel: 'movedLabel',
    nesting: 'nesting',
    onBeforeChange: 'beforeActivate',
    onBeforeReorder: 'beforeReorder',
    onChange: 'activate',
    onReorder: 'reorder',
    pickedUpLabel: 'pickedUpLabel',
    reorderable: 'reorderable',
    selectionMode: 'selectionMode',
  },
  render: ({ props, treeRoot }) => (
    <>
      <View
        busy={props.loading}
        label={props.label}
        part="tree"
        role="tree"
      >
        <Slot />
        {props.loading && (
          <View part="loading">
            <Text part="loading-words">{props.loadingText}</Text>
          </View>
        )}
        {treeRoot.empty && !props.loading && (
          <View
            hidden={!props.emptyText}
            part="empty"
          >
            <Text part="empty-words">{props.emptyText}</Text>
          </View>
        )}
      </View>
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

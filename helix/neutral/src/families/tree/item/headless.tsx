import { bare, boolean, cancelable, headless, Pressable, Slot, View } from '../../../render.js'

/**
 * One node of a tree, in its headless tier: a row, and the items it holds.
 *
 * **An item is a branch when an item is passed into `children`.** A press on a
 * branch's row, or Enter or Space on it, opens or closes it, asking
 * `before-open` or `before-close` first, and a branch with a `value` is chosen
 * as well, unless the tree heads its lists or chooses only the items at the
 * ends. `toggle` is sent once it stands the other way.
 *
 * **`href` makes the row a link.** A branch that is a link goes where it
 * points, and its chevron is what opens it.
 *
 * **A closed branch's children stay drawn**, so they move as it opens: hidden
 * until found on the web, and on a phone with no press and nothing a screen
 * reader reaches.
 *
 * **A `disabled` item is reached by the arrow keys and announced as
 * unavailable**, and a press, Enter, or Space on it does nothing.
 *
 * **A `lazy` item is a branch whose children load as it opens**: opening it
 * sends `load`, and the row says it is busy until `lazy` is removed.
 *
 * **What a screen reader hears.** The web says `treeitem`, `aria-level`,
 * `aria-posinset`, and `aria-setsize` on the row. iOS and Android have no trait
 * for those, so a phone says the level and the place in the row's value, under
 * the words `treeItemPlace` in `helix-tree`, and the row says whether it is
 * expanded, selected, checked, disabled, and busy.
 *
 * **The web's**: the find in page that opens a closed branch, `hidden-until-found`,
 * and following a link passed into the item's words.
 *
 * **Held to `helix-tree-item`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('tree-item', {
  props: {
    defaultOpen: false,
    disabled: false,
    href: '',
    lazy: false,
    open: boolean(),
    rel: '',
    selected: false,
    target: '',
    value: '',
  },
  events: {
    beforeClose: cancelable(['open']),
    beforeOpen: cancelable(['open']),
    beforeSelect: cancelable(['value']),
    load: [],
    toggle: bare(['newState', 'oldState']),
  },
  states: [
    'checked',
    'dragging',
    'dropAfter',
    'dropBefore',
    'loading',
    'mixed',
    'open',
    'selected',
    'settled',
  ],
  toggle: {
    defaultProp: 'defaultOpen',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onToggle: 'toggle',
    prop: 'open',
  },
  treeItem: {
    branch: 'branch',
    checkable: 'checkable',
    checkMark: 'checkMark',
    chevronEnd: 'chevronEnd',
    chevronLabel: 'chevronLabel',
    chevronStart: 'chevronStart',
    dashMark: 'dashMark',
    disabled: 'disabled',
    grip: 'grip',
    heading: 'heading',
    href: 'href',
    lazy: 'lazy',
    leaf: 'leaf',
    level: 'level',
    linked: 'linked',
    nested: 'nested',
    onBeforeSelect: 'beforeSelect',
    onLoad: 'load',
    reserved: 'reserved',
    rel: 'rel',
    subordinate: 'subordinate',
    target: 'target',
    value: 'value',
  },
  render: ({ props, treeItem }) => (
    <View part="item">
      <Pressable
        data-disabled={props.disabled}
        data-heading={treeItem.heading}
        data-reserved={treeItem.reserved}
        data-subordinate={treeItem.subordinate}
        part="row"
        role="treeitem"
        style={{ '--tree-level': treeItem.level }}
      >
        {treeItem.chevronStart && (
          <Slot name="chevron">
            <View
              ariaHidden
              icon="caret-down"
              part="toggle"
            />
          </Slot>
        )}
        {treeItem.checkable && (
          <Pressable
            also={{ 'checkbox-checked': treeItem.checkMark, 'checkbox-mixed': treeItem.dashMark }}
            ariaHidden
            part="checkbox"
          >
            {treeItem.checkMark && (
              <View
                icon="check"
                part="checkbox-glyph"
                platform="native"
              />
            )}
            {treeItem.dashMark && (
              <View
                icon="minus"
                part="checkbox-glyph"
                platform="native"
              />
            )}
          </Pressable>
        )}
        <Slot name="start" />
        <View
          data-tight={treeItem.chevronLabel}
          part="label"
        >
          <Slot />
        </View>
        {treeItem.chevronLabel && (
          <Slot name="chevron">
            <View
              ariaHidden
              icon="caret-down"
              part="toggle"
            />
          </Slot>
        )}
        <Slot name="end" />
        {treeItem.chevronEnd && (
          <Slot name="chevron">
            <View
              ariaHidden
              icon="caret-down"
              part="toggle"
            />
          </Slot>
        )}
        {treeItem.grip && (
          <View
            ariaHidden
            part="grip"
          >
            <View
              icon="dots-six-vertical"
              part="grip-mark"
            />
          </View>
        )}
      </Pressable>
      <View
        open={props.open}
        part="group"
        role={props.open ? 'group' : ''}
      >
        <View
          part="group-inner"
          platform="native"
        >
          <Slot name="children" />
        </View>
      </View>
    </View>
  ),
})

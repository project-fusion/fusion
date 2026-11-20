import { boolean, headless, oneOf, Pressable, Slot, View, Wrap, web } from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * A navigation's headless tier: a landmark of destinations, with a mark that
 * moves to the current one.
 *
 * **The landmark is the `nav` part, named by `label`**, and a phone
 * announces it by the same role and name. The page's own `aria-label` or
 * `aria-labelledby` on the host, which win over `label`, are the web's.
 *
 * **The destinations are Navigation Items, and each says itself whether it
 * is current** by its `current`, which the page writes and moves: the set
 * holds no chosen value, and a press on a destination chooses nothing. The
 * mark stands at the item marked `current`, the one marked `page` where
 * several are, and travels to the next one the page marks. On the web a
 * link of your own, with `aria-current`, is a destination too.
 *
 * **With `arrows`, the arrow keys along the way the destinations run move
 * focus among them**, choosing nothing and stopping at the ends: Left and
 * Right in a row, Up and Down in a column, and Home and End to the first
 * and the last. The arrows across them are left to the page. Each
 * destination stays a stop of Tab.
 *
 * **The navigation is `open` while an element among its destinations stands
 * open**, as a megamenu's panel does.
 *
 * **What the web alone does**: a list of destinations slotted as a `<ul>`,
 * the styling of your own links through the `data-navigation-item` recipe,
 * the `duplicate-name` warning where two navigations of one document
 * share a name, since a phone has no document to compare them in, and the
 * overflow menu: a row too narrow for its destinations folds those that do
 * not fit into a menu that a button after the last one opens, named by
 * `more-label`, or by `current-label` with the current destination's name
 * once every destination has folded, and `overflow="scroll"` scrolls the row
 * instead. The navigation is `folded` while any destination has.
 *
 * **Held to `helix-navigation`.** `helix system check` compares the props,
 * the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('navigation', {
  props: {
    /* Unset is no value, so the arrows rove only while it is set. */
    arrows: boolean(),
    currentLabel: web('{name}, more destinations'),
    fallbackLabel: 'Main',
    label: '',
    marker: oneOf(['segmented', 'underlined']),
    moreLabel: web('More'),
    orientation: oneOf(['vertical']),
    overflow: web(oneOf(['scroll'])),
  },
  events: {},
  /* `gliding` while a mouse or pen is over a destination, so the highlight
     draws the hover wash in place of each destination's own. */
  states: ['folded', 'gliding', 'open', 'settled'],
  derived: {
    name: derive('navigation-name'),
  },
  collection: {
    currentFromItems: true,
    itemOpen: 'open',
    keys: {
      loop: false,
      orientation: 'orientation',
      selectionFollowsFocus: false,
      typeahead: false,
    },
    roves: 'arrows',
  },
  render: ({ derived }) => (
    <View
      label={derived.name}
      part="nav"
      role="navigation"
    >
      {/* The hover wash that glides from destination to destination under a
          mouse or pen. Hidden until a stylesheet shows it, so the headless tier
          lays out as it did without it. A phone has no pointer to follow. */}
      <View
        ariaHidden
        hidden
        part="highlight"
        platform="web"
      />
      <View
        ariaHidden
        indicator
        part="indicator"
      >
        <Slot name="indicator" />
      </View>
      <Slot />
      {/* The menu of the destinations that do not fit on the row, and the
          button after the last one that opens it. */}
      <Wrap
        draws="menu"
        exports={{
          back: true,
          'back-mark': true,
          empty: true,
          header: true,
          highlight: true,
          live: true,
          loading: true,
          'search-field': true,
          surface: true,
          title: true,
        }}
        part="overflow"
        platform="web"
      >
        <Pressable
          into="trigger"
          part="more"
          role="button"
        >
          <View part="more-label" />
          <View part="more-current" />
          <Slot name="menu-icon">
            <View
              ariaHidden
              icon="list"
              part="more-glyph"
            />
          </Slot>
          <Slot name="more-icon">
            <View
              ariaHidden
              icon="caret-down"
              part="more-mark"
            />
          </Slot>
        </Pressable>
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
          part="overflow-option"
        />
      </Wrap>
    </View>
  ),
})

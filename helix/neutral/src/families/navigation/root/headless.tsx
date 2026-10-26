import { boolean, headless, oneOf, Slot, View } from '../../../render.js'
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
 * and the `duplicate-name` warning where two navigations of one document
 * share a name, since a phone has no document to compare them in.
 *
 * **Held to `helix-navigation`.** `helix family check` compares the props,
 * the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('navigation', {
  props: {
    /* Unset is no value, so the arrows rove only while it is set. */
    arrows: boolean(),
    fallbackLabel: 'Main',
    label: '',
    orientation: oneOf(['vertical']),
    variant: oneOf(['segmented', 'underlined']),
  },
  events: {},
  states: ['open', 'settled'],
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
      <View
        ariaHidden
        marks="chosen"
        part="indicator"
      >
        <Slot name="indicator" />
      </View>
      <Slot />
    </View>
  ),
})

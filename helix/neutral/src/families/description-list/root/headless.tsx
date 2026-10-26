import { headless, oneOf, Slot, View } from '../../../render.js'
import { bind } from '../../../tree.js'

/**
 * A description list's headless tier: what it takes and its one part, the
 * list its items are passed into.
 *
 * **A list with a `label` is a group named by it**, through the host, where
 * the web element sets the role and the name through `ElementInternals`. A
 * phone names the group with the label's words, and gives a list with no
 * label no role. On the web, an `aria-label` or an `aria-labelledby` on the
 * host names the list too.
 *
 * **Held to `helix-description-list`.** `helix family check` compares the
 * props, the states, the region, and the part with what the manifest says the
 * element has.
 */
export default headless('description-list', {
  props: {
    direction: oneOf(['row']),
    label: '',
  },
  events: {},
  states: ['settled'],
  host: { label: bind('label'), role: 'group' },
  render: () => (
    <View
      element="description-list"
      part="list"
    >
      <Slot />
    </View>
  ),
})

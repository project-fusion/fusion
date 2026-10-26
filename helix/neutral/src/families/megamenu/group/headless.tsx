import { headless, Slot, Text, View } from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * A megamenu group's headless tier: a column of a megamenu's panel, a
 * heading and the destinations under it.
 *
 * **The group is named by its heading**, its `label` or what is passed into
 * `label`, such as a product's mark and its name. The heading is a heading
 * of level 3, which a phone announces as a heading with no level, and a
 * group with no name draws none. Its destinations are the megamenu's own.
 *
 * **Held to `helix-megamenu-group`.** `helix family check` compares the
 * props, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('megamenu-group', {
  props: {
    label: '',
  },
  events: {},
  states: ['settled'],
  derived: {
    named: derive('megamenu-group-named'),
  },
  render: ({ derived, props }) => (
    <View
      labelledby="label"
      part="group"
      role="group"
    >
      <View
        hidden={!derived.named}
        level={3}
        part="label"
        role="heading"
      >
        <Slot name="label">
          <Text part="label-words">{props.label}</Text>
        </Slot>
      </View>
      <Slot />
    </View>
  ),
})

import { headless, Slot, Text, View } from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * A speed dial group's headless tier: a set of actions under a name.
 *
 * **The group is named by its `label`**, or by what is passed into
 * `label`, drawn above its actions, and a group with no name draws none.
 * Its actions are the dial's own: the arrow keys walk them with the rest,
 * and choosing one closes the dial.
 *
 * **Held to `helix-speed-dial-group`.** `helix system check` compares the
 * props, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('speed-dial-group', {
  props: {
    label: '',
  },
  events: {},
  states: ['settled'],
  derived: {
    named: derive('speed-dial-group-named'),
  },
  render: ({ derived, props }) => (
    <View
      labelledby="label"
      part="group"
      role="group"
    >
      <View
        hidden={!derived.named}
        part="label"
      >
        <Slot name="label">
          <Text part="label-words">{props.label}</Text>
        </Slot>
      </View>
      <Slot />
    </View>
  ),
})

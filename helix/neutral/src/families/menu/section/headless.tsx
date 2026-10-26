import { headless, Slot, Text, View } from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * A menu section's headless tier: a group of the menu's rows under a
 * heading.
 *
 * **The section is a group named by its heading**, its `label` or what is
 * passed into `heading`. Its rows are the menu's own: the arrow keys and
 * the typed letters walk them with the rest, and a run of `exclusive` rows
 * is still the rows next to each other. A section stands on the menu's top
 * page.
 *
 * **Held to `helix-menu-section`.** `helix family check` compares the
 * props, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('menu-section', {
  props: {
    label: '',
  },
  events: {},
  states: ['settled', 'start'],
  derived: {
    named: derive('menu-section-named'),
    started: derive('menu-section-start'),
  },
  render: ({ derived, props }) => (
    <View
      labelledby="heading"
      part="section"
      role="group"
    >
      <View
        hidden={!derived.named}
        part="heading"
        role="presentation"
      >
        <Slot name="heading">
          <Text part="heading-words">{props.label}</Text>
        </Slot>
      </View>
      <Slot />
    </View>
  ),
})

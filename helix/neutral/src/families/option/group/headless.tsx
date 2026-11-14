import { headless, Slot, Text, View } from '../../../render.js'

/**
 * A group of options' headless tier: a heading over a run of an owner's options.
 *
 * **The group holds no selection and no value**, which are the owner's. Its
 * options are still the owner's options, so the keys move through a grouped list
 * as through a flat one.
 *
 * **The group is named by its heading**, its `label` or what is passed into
 * `label`, so a screen reader says which run it is in, and the heading is not a
 * stop of its own. A group a filter has emptied goes with its options.
 *
 * **Held to `helix-option-group`.** `helix system check` compares the props, the
 * regions, and the parts with what the manifest says the element has.
 */
export default headless('option-group', {
  props: {
    label: '',
  },
  events: {},
  states: ['settled'],
  optionGroup: {
    emptied: 'emptied',
    label: 'label',
    later: 'later',
  },
  render: ({ optionGroup, props }) => (
    <>
      <View
        ariaHidden
        data-later={optionGroup.later}
        hidden={optionGroup.emptied}
        part="label"
      >
        <Slot name="label">
          <Text part="label-words">{props.label}</Text>
        </Slot>
      </View>
      <View
        label={props.label}
        part="items"
        role="group"
      >
        <Slot />
      </View>
    </>
  ),
})

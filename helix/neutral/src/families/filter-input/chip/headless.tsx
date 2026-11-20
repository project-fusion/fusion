import {
  cancelable,
  headless,
  Pressable,
  property,
  Slot,
  string,
  Text,
  View,
} from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Filter Chip's headless tier: one active filter, its field, its comparison, and
 * the values it is compared to, with a button that asks for the filter to go.
 *
 * **A remove press asks, and the page removes.** It sends `dismiss`, which a handler
 * can cancel, and the chip stays until the page takes it out of its list. In a
 * `FilterInput` the field around hears it too, as the web's event bubbles to it.
 * The button is named `dismiss-label` with the chip's words, its field, its
 * comparison, and its values: "Remove filter Status is not open".
 *
 * **The comparison is drawn only with an `operator-label`**, since the field's usual
 * comparison says nothing a reader needs. **The values' box is drawn only while it
 * holds something**, so a comparison that takes no values, such as `is empty`, is a
 * field and a word.
 *
 * **The web's**: the `operator` region, whose name a phone gives the comparison's name
 * in the page's model. A phone draws `operator-label` there.
 *
 * **Held to `helix-filter-chip`.** `helix system check` compares the props, the events,
 * the states, the regions, and the parts with what the manifest says the element has.
 */
export default headless('filter-chip', {
  props: {
    dismissible: false,
    dismissLabel: 'Remove filter',
    /* What a Filter Input writes on its chips. */
    dismissTabStop: property(true),
    label: '',
    name: string(),
    operator: string(),
    operatorLabel: '',
  },
  events: {
    dismiss: cancelable(['label']),
  },
  states: ['settled'],
  render: ({ props, send, slots }) => (
    <>
      <View part="field">
        <Slot name="field">
          <Text part="field-text">{props.label}</Text>
        </Slot>
      </View>
      {props.operatorLabel && (
        <View part="operator">
          <Slot
            name="operator"
            platform="web"
          >
            <Text part="operator-text">{props.operatorLabel}</Text>
          </Slot>
          <Text
            part="operator-text"
            platform="native"
          >
            {props.operatorLabel}
          </Text>
        </View>
      )}
      <View
        hidden={!slots.default}
        part="values"
      >
        <Slot />
      </View>
      {props.dismissible && (
        <Pressable
          label={derive('filter-chip-remove-name')}
          onPress={send.dismiss}
          part="dismiss"
        >
          <View
            ariaHidden
            icon="x"
            part="dismiss-mark"
          />
        </Pressable>
      )}
    </>
  ),
})

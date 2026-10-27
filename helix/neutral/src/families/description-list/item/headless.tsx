import { headless, Slot, Text, View, web } from '../../../render.js'

/**
 * A description list item's headless tier: a term and the value it
 * describes.
 *
 * **The label is the term and the value its definition**, a `<dt>` and a
 * `<dd>` on the web, and a term and a definition to a phone's screen reader.
 * `label` is the words the label region falls back to, and a label passed in
 * replaces them. The actions sit after the value, inside it.
 *
 * **Several values are the web's.** On the web an item whose children are
 * `<dd>` elements, or that says `several`, draws them in place of its own
 * value. A phone has no `<dd>` to pass, so what is passed in is the value,
 * and several elements passed in stack in the value's column.
 *
 * **Held to `helix-description-list-item`.** `helix system check` compares
 * the props, the states, the regions, and the parts with what the manifest
 * says the element has.
 */
export default headless('description-list-item', {
  props: {
    label: '',
    several: web(false),
  },
  events: {},
  states: ['settled', 'several'],
  render: ({ props }) => (
    <>
      <View
        element="term"
        part="label"
      >
        <Slot name="label">
          <Text part="label-words">{props.label}</Text>
        </Slot>
      </View>
      <View
        element="definition"
        part="value"
      >
        <Slot />
        <View part="actions">
          <Slot name="actions" />
        </View>
      </View>
    </>
  ),
})

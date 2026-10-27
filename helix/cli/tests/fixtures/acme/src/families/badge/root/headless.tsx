import { headless, Slot, Text, View } from '@fusion.dev/helix-neutral/render'

/**
 * Acme's badge: a count beside what it marks.
 *
 * **The count is a status**, named by `label`, so a screen reader says it
 * when it changes.
 */
export default headless('badge', {
  props: {
    label: '',
    value: '',
  },
  events: {},
  states: [],
  render: ({ props }) => (
    <>
      <Slot />
      <View
        label={props.label}
        part="indicator"
        role="status"
      >
        <Text part="count">{props.value}</Text>
      </View>
    </>
  ),
})

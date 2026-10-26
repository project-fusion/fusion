import { headless, number, Slot, Text, View } from '../../../render.js'

/**
 * A timeline group's headless tier: a heading over a run of entries, such as
 * a day.
 *
 * **The group is an entry of the timeline, and its entries are a list of
 * their own**, named by the heading's words, so a screen reader hears how
 * many entries each day holds. The heading is content passed into
 * `heading`, or `label` where none is. React Native gives a view no heading
 * level, so a phone announces a heading with none.
 *
 * **Held to `helix-timeline-group`.** `helix family check` compares the
 * props, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('timeline-group', {
  props: {
    headingLevel: number(),
    label: '',
  },
  events: {},
  states: ['settled'],
  host: { role: 'listitem' },
  render: ({ props }) => (
    <>
      <View
        level={props.headingLevel}
        part="heading"
        role="heading"
      >
        <Slot name="heading">
          <Text part="heading-text">{props.label}</Text>
        </Slot>
      </View>
      <View
        labelledby="heading"
        part="entries"
        role="list"
      >
        <Slot />
      </View>
    </>
  ),
})

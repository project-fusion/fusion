import { headless, number, View } from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * A meter segment's headless tier: one share of a meter's whole, drawn as a
 * slice of its bar.
 *
 * **The meter measures the sum of its segments**, which its `total` says, and
 * draws each as a slice as wide as its `value` is of the meter's range. The
 * slice is the fill, and the segment's own box takes no room, so its fill
 * sits in the meter's track beside the others. A value that is not a number,
 * or is below zero, draws nothing.
 *
 * **A meter's children are presentational to a screen reader**, so a segment
 * says nothing of its own. A segment draws only in the bar: a meter in `ring`
 * or `arc` draws its total.
 *
 * **Held to `helix-meter-segment`.** `helix system check` compares the props
 * and the parts with what the manifest says the element has.
 */
export default headless('meter-segment', {
  props: {
    /* Names the slice where a pointer rests on it, on the web. */
    label: '',
    value: number(),
  },
  events: {},
  states: ['settled'],
  derived: {
    amount: derive('meter-segment-amount'),
  },
  render: ({ derived }) => (
    <View
      part="fill"
      style={{
        '--meter-segment-value': derived.amount,
      }}
    />
  ),
})

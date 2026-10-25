import { bind, box, derive, headless, prop } from '../../../tree.js'

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
 * **Held to `helix-meter-segment`.** `helix family check` compares the props
 * and the parts with what the manifest says the element has.
 */
export default headless('meter-segment', {
  derived: { amount: derive('meter-segment-amount') },
  events: [],
  props: [
    /* Names the slice where a pointer rests on it, on the web. */
    prop('label', 'string', { default: '' }),
    prop('tone', ['accent', 'danger', 'info', 'neutral', 'primary', 'success', 'warning']),
    prop('value', 'number'),
  ],
  states: ['settled'],
  tree: [box('fill', { '--meter-segment-value': bind('amount') })],
})

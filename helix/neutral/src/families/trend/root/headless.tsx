import { headless, number, object, oneOf, Slot, Text, View } from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Trend's headless tier: which way a measurement moved, and whether that is
 * good.
 *
 * **The movement and the judgment are worked out from the props**, by core's
 * trend derivations, on both platforms: `movement`, then the old
 * `direction`, then the sign of `value` for the movement, and `good` for
 * whether it is better or worse. Each is a state, `up`, `down`, `better` or
 * `worse`, which the styled tier colors by.
 *
 * **The arrow is the glyph for the movement**, `arrow-up`, `arrow-down` or
 * `minus`, in the trend's color. A glyph passed into `up-icon`, `down-icon` or
 * `neutral-icon` stands in for the one that matches, and one in `icon` for all
 * three. Every one is hidden from screen readers, since the movement is said
 * in words: the `direction` part, out of sight, says "Up, better", in the
 * words the six `*-label` props and the words registry give.
 *
 * **`value` writes the change** in the `value` part with `format-options` in
 * `locale`, the size without a sign unless `signDisplay` asks for one. A phone
 * reads the reader's locale where `locale` is empty.
 *
 * **The deprecation warning for `direction` is the web's.** A phone has no
 * diagnostics channel yet, and reads the old prop as the web does.
 */
export default headless('trend', {
  props: {
    betterLabel: 'better',
    direction: oneOf(['down', 'neutral', 'up']),
    downLabel: 'Down',
    /* JSON on the web's attribute, such as `{"style":"percent"}`. */
    formatOptions: object(),
    good: oneOf(['down', 'up']),
    judgmentLabel:
      '{judgment, select, better {{direction}, {betterLabel}} worse {{direction}, {worseLabel}} other {{direction}}}',
    locale: '',
    movement: oneOf(['down', 'neutral', 'up']),
    unchangedLabel: 'Unchanged',
    upLabel: 'Up',
    value: number(),
    worseLabel: 'worse',
  },
  events: {},
  states: ['better', 'down', 'settled', 'up', 'worse'],
  derived: {
    better: derive('trend-better'),
    down: derive('trend-down'),
    figure: derive('trend-figure'),
    up: derive('trend-up'),
    worse: derive('trend-worse'),
  },
  render: ({ derived }) => (
    <>
      {derived.up && (
        <Slot
          ariaHidden
          name="up-icon"
        >
          <Slot
            ariaHidden
            name="icon"
          >
            <View
              ariaHidden
              icon="arrow-up"
              part="icon"
            />
          </Slot>
        </Slot>
      )}
      {derived.down && (
        <Slot
          ariaHidden
          name="down-icon"
        >
          <Slot
            ariaHidden
            name="icon"
          >
            <View
              ariaHidden
              icon="arrow-down"
              part="icon"
            />
          </Slot>
        </Slot>
      )}
      {!derived.up && !derived.down && (
        <Slot
          ariaHidden
          name="neutral-icon"
        >
          <Slot
            ariaHidden
            name="icon"
          >
            <View
              ariaHidden
              icon="minus"
              part="icon"
            />
          </Slot>
        </Slot>
      )}
      <View part="direction">
        <Text part="said">{derive('trend-said')}</Text>
      </View>
      <View
        hidden={!derived.figure}
        part="value"
      >
        <Text part="figure">{derive('trend-figure')}</Text>
      </View>
      <Slot />
      <Slot name="label" />
    </>
  ),
})

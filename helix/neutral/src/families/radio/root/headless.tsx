import { cancelable, headless, Pressable, Slot, set, View } from '../../../render.js'

/**
 * Radio's headless tier: one choice of a radio group.
 *
 * **The group holds the answer.** A press on the radio sends `before-select`, which
 * its consumer and then the group's may refuse, and the group chooses it,
 * which the radio reads as `selected`. A screen reader hears a radio,
 * checked while it is chosen. The arrow keys move among the radios of a
 * group, and the radio has no label, hint, or message of its own: those are
 * the group's.
 *
 * **The dot is the circle's to draw**: the styled tier draws it after the
 * circle, and an icon passed into `indicator` takes its place.
 */
export default headless('radio', {
  memberOf: set('radio-group'),
  props: {
    disabled: false,
    selected: false,
    value: '',
  },
  events: {
    beforeSelect: cancelable(['value']),
  },
  states: ['hasIndicator', 'selected', 'settled'],
  render: ({ props, send }) => (
    <Pressable
      checked={props.selected}
      chooses
      disabled={props.disabled}
      onPress={send.beforeSelect}
      part="item"
      role="radio"
    >
      <View
        ariaHidden
        part="box"
      >
        <Slot name="indicator" />
      </View>
      <Slot name="icon" />
      <View part="label">
        <Slot />
      </View>
    </Pressable>
  ),
})

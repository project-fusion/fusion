import { bare, cancelable, headless, Pressable, Slot, set } from '../../../render.js'

/**
 * Toggle's headless tier: a toggle button on its own, and one option of a
 * Toggle Group.
 *
 * **On its own, it is a toggle button.** A press, Enter, or Space sends
 * `before-check` with the state it turns to in `checked`, which a handler can
 * refuse, then turns and sends `change`. `selected` holds whether it is
 * pressed, and a phone announces it as a toggle button, pressed or not.
 *
 * **In a Toggle Group, a press chooses it**, and it sends `before-select`, which a
 * handler can refuse, in place of turning: the item joins the group as a
 * set's items do, and turns as a toggle only while it has joined none. A
 * phone announces it as a radio where the group chooses one, and as a toggle
 * button where several can be pressed.
 *
 * **A toggle button is not a form field**, so it has no `readonly`, no form
 * value, and no `disabled` from a fieldset around it.
 *
 * **Held to Toggle's web element.** `helix family check` compares these
 * props, the events, the states, the regions, and the part with what the
 * manifest says `helix-toggle` has. The group's own properties, `focusable`
 * and `pressed`, are the group's to write and are left out.
 */
export default headless('toggle', {
  memberOf: set('toggle-group'),
  props: {
    disabled: false,
    selected: false,
    value: '',
  },
  events: {
    beforeCheck: cancelable(['checked']),
    beforeSelect: cancelable(['value']),
    change: bare(),
  },
  states: ['pressed', 'selected', 'settled'],
  toggle: { onBeforeChange: 'beforeCheck', onChange: 'change', prop: 'selected' },
  render: ({ props, send }) => (
    <Pressable
      chooses
      disabled={props.disabled}
      onPress={send.beforeSelect}
      part="item"
      role="button"
      toggles
    >
      <Slot name="start" />
      <Slot />
      <Slot name="end" />
    </Pressable>
  ),
})

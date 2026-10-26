import { bind, event, headless, item, pressable, prop, region, toggle } from '../../../tree.js'

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
  events: [
    event('before-check', { cancelable: true, detail: ['checked'] }),
    event('change', { bare: true }),
    event('before-select', { cancelable: true, detail: ['value'] }),
  ],
  item: item('toggle-group', { chooses: true }),
  props: [
    prop('disabled', 'boolean', { default: false }),
    prop('selected', 'boolean', { default: false }),
    prop('value', 'string', { default: '' }),
  ],
  states: ['pressed', 'selected', 'settled'],
  toggle: toggle({ after: 'change', before: 'before-check', checked: 'selected' }),
  tree: [
    pressable(
      'item',
      {
        chooses: true,
        disabled: bind('disabled'),
        role: 'button',
        sends: 'before-select',
        toggles: true,
      },
      [region('start'), region('default'), region('end')],
    ),
  ],
})

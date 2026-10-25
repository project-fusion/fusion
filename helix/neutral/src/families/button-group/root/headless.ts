import { collection, event, headless, prop, region } from '../../../tree.js'

/**
 * Button Group's headless tier: buttons joined into one control, which can
 * stay pressed.
 *
 * **The group has no part of its own.** It is the host and its buttons, and
 * the web element sets its role and name on the host. A phone announces the
 * host as a group named by `label`, a radio group under `single`, and a
 * toolbar under `multiple`, unless a toolbar is around it, where it stays a
 * group of that toolbar's controls.
 *
 * **Its buttons join it as a set's items do.** A Button or an Icon Button
 * with a `value` is a toggle button while the group has a `selection-mode`:
 * its own press, a tap, Space, or Enter, presses or releases it, and the
 * group asks with `before-change` and then sends `change`. `value` holds the
 * pressed values. A pressed button is in its `pressed` state, and a phone
 * announces it as a toggle button, or as a radio under `single`.
 * `disallow-empty-selection` refuses a press that would leave none pressed.
 *
 * **One stop for the keys in a selection mode.** The arrow keys move focus
 * among the buttons, from the last back to the first, and Home and End to the
 * ends, passing over a disabled button. They press nothing, and a typed
 * letter moves nothing. Without a selection mode each button is a control of
 * its own, and inside a toolbar the toolbar's keys walk the buttons.
 *
 * **`disabled` disables every button**, and gives each its own state back
 * once it is cleared.
 *
 * **Held to `helix-button-group`.** `helix family check` compares the props,
 * the events, the states, and the region with what the manifest says the
 * element has. `values`, the pressed values as a list, is the web's property
 * alone, since a phone reads `value`.
 */
export default headless('button-group', {
  collection: collection({
    after: 'change',
    before: 'before-change',
    chosen: 'value',
    disabled: 'disabled',
    keeps: 'disallow-empty-selection',
    keys: { chooses: false, letters: false, selects: false, wrap: true },
    label: 'label',
    mode: 'selection-mode',
    presses: 'selection-mode',
    roves: 'selection-mode',
  }),
  events: [
    event('before-change', { cancelable: true, detail: ['value'] }),
    event('change', { bare: true }),
  ],
  props: [
    prop('disabled', 'boolean', { default: false }),
    prop('disallow-empty-selection', 'boolean', { default: false }),
    prop('label', 'string', { default: '' }),
    prop('orientation', ['horizontal', 'vertical']),
    prop('selection-mode', ['multiple', 'single']),
    prop('value', 'string', { default: '' }),
  ],
  states: ['pressed', 'settled'],
  tree: [region('default')],
})

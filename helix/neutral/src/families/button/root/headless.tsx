import {
  Announce,
  boolean,
  headless,
  oneOf,
  Pressable,
  property,
  Slot,
  set,
  string,
  View,
  web,
} from '../../../render.js'

/**
 * Button's headless tier: what it takes, what it sends, and its parts.
 *
 * **A Button Group presses it.** In a group with a `selection-mode`, a button
 * with a `value` joins the group's set: its press, a tap, Space, or Enter,
 * presses or releases it, and while it is pressed it is in its `pressed`
 * state, announced as a toggle button, or as a radio under `single`. Outside
 * a group, and in a group without one, it is a button of its own. `pressed`
 * is the group's to write, as on the web.
 *
 * **Held to Button's web element.** `helix family check` compares these props,
 * the event, the states, the regions, and the parts with what the manifest
 * says `helix-button` has, so the source cannot drop or invent one unseen.
 */
export default headless('button', {
  memberOf: set('button-group', { pressChooses: true, state: 'pressed' }),
  props: {
    disabled: false,
    expanded: property(boolean()),
    focusable: property(true),
    /* A disabled control kept in the tab order and announced as disabled, so
       a tooltip can say why. */
    focusableWhenDisabled: false,
    label: string(),
    pending: false,
    pendingLabel: 'Loading',
    popup: property(oneOf(['dialog', 'grid', 'listbox', 'menu', 'tree'])),
    pressed: property(boolean()),
    /* What names it among a Button Group's pressed values, and its form
       value on the web. */
    value: '',
    /* A form's and an invoker's, which a phone has neither of. */
    command: web(''),
    commandfor: web(''),
    formaction: web(''),
    formenctype: web(''),
    formmethod: web(''),
    formnovalidate: web(false),
    formtarget: web(''),
    name: web(''),
    type: web(oneOf(['button', 'submit', 'reset'], 'button')),
  },
  events: {
    press: ['pointerType'],
  },
  states: ['pending', 'pressed', 'settled'],
  render: ({ props, send }) => (
    <>
      <Pressable
        part="button"
        chooses
        role="button"
        busy={props.pending}
        disabled={props.disabled}
        expanded={props.expanded}
        focusable-when-disabled={props.focusableWhenDisabled}
        label={props.label}
        popup={props.popup}
        pressed={props.pressed}
        onPress={send.press}
      >
        <Slot name="start" />
        <Slot part="text" />
        <Slot name="end" />
        {props.pending && (
          <View
            part="spinner"
            ariaHidden
          />
        )}
      </Pressable>
      <Announce
        part="live"
        when={props.pending}
      >
        {props.pendingLabel}
      </Announce>
    </>
  ),
})

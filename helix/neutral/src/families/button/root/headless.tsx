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
  memberOf: set('button-group', { selectedState: 'pressed' }),
  props: {
    /* `command` and `commandfor` are an invoker's, and the `form` ones,
       `name`, and `type` a form's, which a phone has neither of. */
    command: web(''),
    commandfor: web(''),
    disabled: false,
    expanded: property(boolean()),
    focusable: property(true),
    /* A disabled control kept in the tab order and announced as disabled, so
       a tooltip can say why. */
    focusableWhenDisabled: false,
    formaction: web(''),
    formenctype: web(''),
    formmethod: web(''),
    formnovalidate: web(false),
    formtarget: web(''),
    label: string(),
    name: web(''),
    pending: false,
    pendingLabel: 'Loading',
    popup: property(oneOf(['dialog', 'grid', 'listbox', 'menu', 'tree'])),
    pressed: property(boolean()),
    type: web(oneOf(['button', 'submit', 'reset'], 'button')),
    /* What names it among a Button Group's pressed values, and its form
       value on the web. */
    value: '',
  },
  events: {
    press: ['pointerType'],
  },
  states: ['pending', 'pressed', 'settled'],
  render: ({ props, send }) => (
    <>
      <Pressable
        busy={props.pending}
        chooses
        disabled={props.disabled}
        expanded={props.expanded}
        focusable-when-disabled={props.focusableWhenDisabled}
        label={props.label}
        onPress={send.press}
        part="button"
        popup={props.popup}
        pressed={props.pressed}
        role="button"
      >
        <Slot name="start" />
        <Slot part="text" />
        <Slot name="end" />
        {props.pending && (
          <View
            ariaHidden
            part="spinner"
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

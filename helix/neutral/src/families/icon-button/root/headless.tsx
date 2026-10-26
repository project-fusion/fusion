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
 * Icon Button's headless tier: a button whose content is an icon, named by
 * its `label`.
 *
 * **Button's tree, under its own name.** The web element extends Button's,
 * so it takes the same props, sends the same press, and draws the same
 * parts. A phone reuses Button's press machine on the same `button` part.
 * The icon is passed in as the default region's content, such as a
 * `HelixIcon`, which draws the glyph.
 *
 * **Named by `label`.** The content is a glyph, which says nothing to a
 * screen reader, so the button is announced as a button with the label's
 * words.
 *
 * **It does not toggle on its own.** A Button Group in a selection mode
 * presses it, as it presses a Button: the button joins the group's set,
 * shows it as its `pressed` state, and is announced as a toggle button, or
 * as a radio under `single`. While it is pressed it takes the group's solid
 * fill, as a pressed Button does, on the web and on a phone.
 *
 * **Held to Icon Button's web element.** `helix family check` compares these
 * props, the event, the states, the regions, and the parts with what the
 * manifest says `helix-icon-button` has.
 */
export default headless('icon-button', {
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
        disabled={props.disabled}
        expanded={props.expanded}
        focusable-when-disabled={props.focusableWhenDisabled}
        label={props.label}
        onPress={send.press}
        part="button"
        popup={props.popup}
        pressed={props.pressed}
        role="button"
        selects
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

import {
  Announce,
  bare,
  boolean,
  cancelable,
  headless,
  Layer,
  oneOf,
  Pressable,
  Slot,
  View,
} from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Dialog's headless tier: a modal window over the page, opened on `open`.
 *
 * **It holds the reader until it closes**: the page behind takes no press,
 * no focus, and nothing a screen reader reaches, and Tab goes round inside
 * it. Opening moves focus to its first control, and closing puts focus back
 * where it was.
 *
 * **Every way out asks `before-close` first**, which a handler may refuse:
 * a close request, which is Escape, a phone's back, or a screen reader's
 * escape; a press on the scrim; and the close control `dismissible` draws,
 * named by `dismiss-label`. `closedby` says which of the first two a reader
 * has, `any` where it names none, and `persistent` keeps both from closing
 * it, while the close control still closes it. A press on the scrim the
 * dialog keeps open makes the panel swell and settle, `data-refused` for
 * the length of that motion, so the reader sees it was heard. `toggle` is
 * sent once it stands open or closed, and `close` once it has closed.
 *
 * **Its name is `label`**, then the words of the title passed into
 * `header`, then `fallback-label`. `alert` makes it an alert dialog, for a
 * question that interrupts. A phone says its name as it opens, and an alert
 * dialog's words with it, since React Native has no dialog role for a screen
 * reader to read it by.
 *
 * **The web's**: the invoker commands, `close(value)` and `returnValue`, a
 * `<form method="dialog">` closing it, the page's scroll held still, and a
 * description drawn from the words at the start of its body. React Native
 * has no command or form to take, and a modal layer covers the page.
 *
 * **Held to `helix-dialog`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('dialog', {
  props: {
    alert: false,
    closedby: oneOf(['any', 'closerequest', 'none']),
    defaultOpen: false,
    dismissible: false,
    dismissLabel: 'Close',
    fallbackLabel: 'Dialog',
    label: '',
    open: boolean(),
    persistent: false,
  },
  events: {
    beforeClose: cancelable(['open']),
    beforeOpen: cancelable(['open']),
    close: bare(),
    toggle: bare(['newState', 'oldState']),
  },
  states: ['entering', 'exiting', 'open', 'settled'],
  derived: {
    dismissal: derive('dialog-dismissal'),
    dismissName: derive('dialog-dismiss-name'),
    name: derive('dialog-name'),
    said: derive('dialog-said'),
  },
  toggle: {
    defaultProp: 'defaultOpen',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onClose: 'close',
    onToggle: 'toggle',
    prop: 'open',
  },
  render: ({ derived, props }) => (
    <Layer
      closedby={derived.dismissal}
      label={derived.name}
      modal
      open={props.open}
      part="surface"
      refuses
      role={props.alert ? 'alertdialog' : 'dialog'}
    >
      <Slot name="icon" />
      <Slot
        name="header"
        part="header"
      />
      <Slot part="body" />
      <Slot
        name="footer"
        part="footer"
      />
      {props.dismissible && (
        <Pressable
          label={derived.dismissName}
          part="dismiss"
          role="button"
          toggles
        >
          <Slot name="dismiss-icon">
            <View
              ariaHidden
              icon="x"
              part="dismiss-mark"
            />
          </Slot>
        </Pressable>
      )}
      <Announce
        arrives
        part="opening"
        platform="native"
      >
        {derived.said}
      </Announce>
    </Layer>
  ),
})

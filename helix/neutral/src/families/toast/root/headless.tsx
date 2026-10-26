import { Announce, cancelable, headless, Layer, number, oneOf, Slot, web } from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Toast's headless tier: the stack that holds toast messages, above every
 * other layer.
 *
 * **The stack is a notice layer.** It stands open while one of its messages
 * shows, above every dialog whenever it opened, and stays read and
 * pressable while a modal holds the reader, as the web's region moves into
 * the open modal. It takes no focus as it opens, and no close request: a
 * message closes on its own.
 *
 * **It stands along the edge `placement` names**, the bottom unless it names
 * `top-`, at the start, the middle, or the end of that edge, and the newest
 * message nearest the edge.
 *
 * **It holds every message's clock while a reader touches one**, so a reader
 * moving from one to the next does not lose the one behind them. **It holds
 * back the messages past `max-visible`**, in the order they were drawn: each
 * waits, drawn as nothing and its clock not started, until a message before
 * it goes. A swipe dismisses a message toward the edge `swipe-direction`
 * names, the end of the line where it names none.
 *
 * **It hears its messages' `dismiss`** after each message's own handler, and a
 * handler on it may refuse the dismissal.
 *
 * **The web's**: the landmark `label` names, since a phone has no landmarks;
 * `hotkey`, which takes focus to the stack and back, F8 unless set, and
 * `hotkey-label`, which reach a phone only from a hardware keyboard;
 * `add()` and `undoable()`, which make messages from script, and the undo
 * keys with `undo-hint`, `undo-keys`, and `undo-label`; and the two live
 * regions that say each message, which a phone's messages say themselves
 * through its screen reader. On a phone, render the messages from your own
 * state, as the gallery's examples do.
 *
 * **Held to `helix-toast`.** `helix family check` compares the props, the
 * event, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('toast', {
  props: {
    /* `fallbackLabel`, `hotkey`, `hotkeyLabel`, `label`, and the `undo` ones
       are the landmark's name and the keys, which a phone reaches from no
       keyboard. */
    fallbackLabel: web('Notifications ({hotkey})'),
    hotkey: web('F8'),
    hotkeyLabel: web('Go to notifications'),
    label: web(''),
    maxVisible: number(),
    placement: oneOf([
      'bottom-center',
      'bottom-end',
      'bottom-start',
      'top-center',
      'top-end',
      'top-start',
    ]),
    swipeDirection: oneOf(['bottom', 'end', 'start', 'top']),
    undoHint: web('Press {keys} to undo.'),
    undoKeys: web('mod+z'),
    undoLabel: web('Undo'),
  },
  events: {
    dismiss: cancelable(['label']),
  },
  states: ['settled'],
  derived: {
    edge: derive('toast-edge'),
  },
  notices: {
    bubbles: 'dismiss',
    maxVisible: 'maxVisible',
    showing: 'showing',
    swipeDirection: 'swipeDirection',
  },
  render: ({ derived, notices }) => (
    <Layer
      closedby="none"
      initialFocus="press"
      notice
      open={notices.showing}
      part="region"
      restoreFocus="held"
      side={derived.edge}
    >
      <Slot />
      <Announce
        part="live"
        platform="web"
      />
      <Announce
        part="live"
        platform="web"
        urgent
      />
    </Layer>
  ),
})

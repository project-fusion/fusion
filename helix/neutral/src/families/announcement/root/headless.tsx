import {
  Announce,
  headless,
  number,
  oneOf,
  Pressable,
  Slot,
  string,
  View,
  web,
} from '../../../render.js'
import { bind, derive } from '../../../tree.js'

/**
 * Announcement's headless tier: a message for the whole page, above its
 * header, that can be dismissed.
 *
 * **It is a region named by `label`**, "Announcement" unless the page names
 * it, so a screen reader lists it among the page's regions. Empty leaves it
 * no region. Its message is told politely as it arrives, whatever its tone.
 *
 * **It never removes itself.** Its dismiss button, and its `duration` once
 * spent, send `dismiss` with the words of the message as `label`, which a
 * handler may refuse. The page takes it out. Where the dismiss button was
 * pressed, focus moves to the dismiss button of the announcement beside it
 * as it leaves, the next one first.
 *
 * **`duration` is spent on core's countdown**, held while a reader touches
 * it or focus is on it, and while the page or the app is away, and run on
 * from what was left. It is `paused` while held partway.
 *
 * **`queued` waits its turn** behind the queued announcements before it,
 * `waiting` and drawn as nothing until the last of them leaves. Its message
 * is told and its `duration` starts when its turn comes. On a phone, the
 * announcements before it are those drawn in the same Helix element, or
 * outside any.
 *
 * **The web's**: `hotkey`, which moves focus to the first control and back,
 * since the first control is usually an action passed in, which a phone
 * cannot find as a view focus can reach; the live region part, a copy of the
 * message that a phone says through its screen reader; and the deprecated
 * `icon` slot, read inside `dismiss-icon`.
 *
 * **Held to `helix-announcement`.** `helix family check` compares the props,
 * the event, the states, the regions, and the parts with what the manifest
 * says the element has.
 */
export default headless('announcement', {
  props: {
    dismissible: false,
    dismissLabel: 'Dismiss',
    duration: number(),
    fallbackLabel: 'Announcement',
    /* The key that moves focus in and out, which a phone has no first control for. */
    hotkey: web('F6'),
    label: string(),
    queued: false,
    tone: oneOf(['accent', 'danger', 'info', 'neutral', 'primary', 'success', 'warning']),
  },
  events: {
    dismiss: { cancelable: true, detail: ['label'], gives: { label: 'words' } },
  },
  states: ['paused', 'settled', 'waiting'],
  derived: {
    dismissName: derive('announcement-dismiss-name'),
    holdsActions: bind('actions'),
    name: derive('announcement-label'),
    regionRole: derive('announcement-role'),
    words: derive('announcement-words'),
  },
  countdown: { duration: 'duration', onDone: 'dismiss', paused: 'paused', waitWhile: 'waiting' },
  host: { label: bind('name'), role: bind('regionRole') },
  queue: { prop: 'queued', queued: 'waiting' },
  render: ({ derived, props, send, state }) => (
    <>
      <View part="content">
        <Slot />
      </View>
      <Announce
        part="live"
        platform="web"
      />
      {!state.waiting && (
        <Announce
          arrives
          part="arrival"
          platform="native"
        >
          {derived.words}
        </Announce>
      )}
      <View
        data-empty={!derived.holdsActions}
        hidden={!derived.holdsActions}
        part="actions"
      >
        <Slot name="actions" />
      </View>
      {props.dismissible && (
        <Pressable
          label={derived.dismissName}
          onPress={send.dismiss}
          part="dismiss"
          role="button"
        >
          <Slot name="dismiss-icon">
            <Slot name="icon">
              <View
                ariaHidden
                icon="x"
                part="dismiss-mark"
              />
            </Slot>
          </Slot>
        </Pressable>
      )}
    </>
  ),
})

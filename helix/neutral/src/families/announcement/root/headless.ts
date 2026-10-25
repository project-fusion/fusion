import {
  bind,
  box,
  countdown,
  derive,
  event,
  headless,
  live,
  not,
  pressable,
  prop,
  queue,
  region,
  unless,
  when,
} from '../../../tree.js'

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
  countdown: countdown({ after: 'duration', done: 'dismiss', paused: 'paused', waits: 'waiting' }),
  derived: {
    'dismiss-name': derive('announcement-dismiss-name'),
    'holds-actions': bind('actions'),
    name: derive('announcement-label'),
    'region-role': derive('announcement-role'),
    words: derive('announcement-words'),
  },
  events: [event('dismiss', { cancelable: true, detail: ['label'], gives: { label: 'words' } })],
  host: { label: bind('name'), role: bind('region-role') },
  props: [
    prop('dismiss-label', 'string', { default: 'Dismiss' }),
    prop('dismissible', 'boolean', { default: false }),
    prop('duration', 'number'),
    prop('label', 'string', { default: 'Announcement' }),
    prop('queued', 'boolean', { default: false }),
    prop('tone', ['accent', 'danger', 'info', 'neutral', 'primary', 'success', 'warning']),
    /* The key that moves focus in and out, which a phone has no first control for. */
    prop('hotkey', 'string', { default: 'F6', platform: 'web' }),
  ],
  queue: queue({ queued: 'queued', waiting: 'waiting' }),
  states: ['paused', 'settled', 'waiting'],
  tree: [
    box('content', {}, [region('default')]),
    live('live', { platform: 'web' }),
    unless('waiting', live('arrival', { arrives: true, platform: 'native', says: bind('words') })),
    box('actions', { 'data-empty': not('holds-actions'), hidden: not('holds-actions') }, [
      region('actions'),
    ]),
    when(
      'dismissible',
      pressable('dismiss', { label: bind('dismiss-name'), role: 'button', sends: 'dismiss' }, [
        region('dismiss-icon', {}, [
          region('icon', {}, [box('dismiss-mark', { decorative: true, glyph: 'x' })]),
        ]),
      ]),
    ),
  ],
})

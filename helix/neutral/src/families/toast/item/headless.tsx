import { Announce, headless, number, oneOf, Pressable, Slot, View } from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Toast Item's headless tier: one message in a toast's stack.
 *
 * **It spends its `duration` on core's countdown**, held while a reader
 * touches any message of its stack or focus is on its dismiss button, while
 * the page or the app is away, and run on from what was left. It is `paused`
 * while held partway. A phone holds the clock for as long as a screen reader
 * runs, since React Native never says where the screen reader's focus is.
 *
 * **It hides itself.** Its dismiss button, its spent `duration`, a swipe, and
 * Escape on its dismiss button send `dismiss` with the words of its text as
 * `label`, which a handler may refuse, and the message closes unless one
 * does: `open` turns false and it leaves. The page shows it again by writing
 * `open`. Where its dismiss button held focus, focus moves to the dismiss
 * button of the message beside it, the next one first.
 *
 * **It waits its turn** while the stack it is in holds it back past its
 * `max-visible`: `waiting`, drawn as nothing, and its clock not started. It
 * says its words as it shows, the word for its tone, its heading, its
 * description, and its text, politely, and assertively for a `danger`
 * message, and never its actions.
 *
 * **A touch swipes its `item` part toward the edge the stack names**, the
 * end of the line unless the stack's `swipe-direction` names another, and
 * past halfway, or quickly, dismisses it. Below that it springs back.
 *
 * **It is drawn in the scheme opposite the page's**, so a new message stands
 * out without a color that carries meaning, unless the stack names its own
 * mode with `data-color-mode`.
 *
 * **The web's**: the `alertdialog` role a reader moving through the stack
 * hears it by, since a phone has no such role and its stack says each message
 * as it shows; the hold a pointer or focus anywhere in the stack makes, since
 * a phone has no pointer and holds its clocks on a touch; Escape on an action
 * passed in, which is the page's own view on a phone; `pause()` and
 * `resume()`; and the swipe's travel written as `--toast-swipe-x` and
 * `--toast-swipe-y`.
 *
 * **Held to `helix-toast-item`.** `helix family check` compares the props,
 * the event, the states, the regions, and the parts with what the manifest
 * says the element has.
 */
export default headless('toast-item', {
  props: {
    dismissible: false,
    dismissLabel: 'Dismiss',
    duration: number(),
    open: true,
    tone: oneOf(['danger', 'info', 'success', 'warning']),
  },
  events: {
    dismiss: { cancelable: true, detail: ['label'], gives: { label: 'dismissed' } },
  },
  states: ['closed', 'entering', 'exiting', 'paused', 'settled', 'waiting'],
  derived: {
    dismissed: derive('toast-item-dismissed'),
    dismissName: derive('toast-item-dismiss-name'),
    glyph: derive('toast-item-glyph'),
    timer: derive('toast-item-timer'),
    toneName: derive('toast-item-tone-name'),
    urgent: derive('toast-item-urgent'),
    words: derive('toast-item-words'),
  },
  countdown: { duration: 'duration', onDone: 'dismiss', paused: 'paused', waitWhile: 'waiting' },
  notice: { deferred: 'waiting', part: 'item' },
  toggle: { closeOnEscape: true, onBeforeClose: 'dismiss', prop: 'open' },
  render: ({ derived, props, state }) => (
    <>
      <View part="item">
        {props.tone && (
          <View part="icon">
            <Slot name="icon">
              <View
                icon={derived.glyph}
                label={derived.toneName}
                part="icon-mark"
                role="img"
              />
            </Slot>
          </View>
        )}
        <View part="content">
          <Slot
            name="heading"
            part="heading"
          />
          <Slot
            name="description"
            part="description"
          />
          <Slot />
        </View>
        <View part="actions">
          <Slot name="actions" />
        </View>
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
        {props.duration && (
          <View
            ariaHidden
            part="timer"
            style={{
              '--toast-duration': derived.timer,
            }}
          />
        )}
      </View>
      {!state.waiting && (
        <Announce
          arrives
          part="arrival"
          platform="native"
          urgent={derived.urgent}
        >
          {derived.words}
        </Announce>
      )}
    </>
  ),
})

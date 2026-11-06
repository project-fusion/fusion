import {
  Announce,
  bare,
  boolean,
  cancelable,
  headless,
  Layer,
  number,
  Pressable,
  Slot,
  string,
  Text,
  time,
  View,
} from '../../../render.js'

/**
 * Lightbox's headless tier: a viewer that shows one item at a time over the
 * page, as a dark room around a picture.
 *
 * **It is a modal layer over the whole window**, which holds the reader until
 * it closes, as a dialog does. Every way out asks `before-close` first: a
 * close request, which is Escape, a phone's back, or a screen reader's
 * escape; the close control `controls` draws; and a press on the empty room
 * around the item where the item does not zoom.
 *
 * **`active` names the item shown**, by its `value`, or by its place counted
 * from 1 where it has none. A move asks `before-activate`, which a handler may
 * refuse, then sends `activate`. Previous and next stop at the ends unless
 * `loop`, the arrow keys step, Home and End go to the ends, and a swipe across
 * the item at its own size steps the way the line of text runs. Each move is
 * said in the words of `status-label`.
 *
 * **`max-zoom` lets a reader zoom into the item**: two fingers pinch it about
 * the point between them, a double tap zooms all the way in and back out, one
 * finger drags it once zoomed, `+`, `-`, and `0` zoom from the keys, and with
 * `controls` two controls zoom out and in by half again. On a phone the zoom
 * is a value on the UI thread, which core's numbers hold as the web's are
 * held. The new scale is said once a reader stops.
 *
 * **The chrome hides while the reader is still** for `idle-delay`, and comes
 * back on a touch, a key, or a focus.
 *
 * **The web's**: the invoker commands, `fullscreen` and its state, the page's
 * scroll held still, and the trackpad's and the wheel's zoom. A phone's layer
 * already fills the screen, and has no wheel.
 *
 * **Held to `helix-lightbox`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('lightbox', {
  props: {
    active: string(),
    controls: false,
    counter: false,
    defaultActive: '',
    defaultOpen: false,
    dismissLabel: 'Close',
    fallbackLabel: 'Lightbox',
    idleDelay: time('0'),
    label: '',
    loop: false,
    maxZoom: number(),
    nextLabel: 'Next',
    open: boolean(),
    previousLabel: 'Previous',
    slideLabel: '{index} of {count}',
    slideRoleLabel: 'slide',
    statusLabel: '{index} of {count}',
    zoomInLabel: 'Zoom in',
    zoomOutLabel: 'Zoom out',
    zoomStatusLabel: 'Zoomed to {scale, number, percent}',
  },
  events: {
    activate: ['previous', 'value'],
    beforeActivate: cancelable(['value']),
    beforeClose: cancelable(['open']),
    beforeOpen: cancelable(['open']),
    close: bare(),
    toggle: bare(['newState', 'oldState']),
  },
  states: ['entering', 'exiting', 'fullscreen', 'idle', 'open', 'settled', 'zoomable', 'zoomed'],
  toggle: {
    defaultProp: 'defaultOpen',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onClose: 'close',
    onToggle: 'toggle',
    prop: 'open',
  },
  lightbox: {
    arrows: 'arrows',
    atEnd: 'atEnd',
    atStart: 'atStart',
    counted: 'counted',
    named: 'named',
    onActivate: 'activate',
    onBeforeActivate: 'beforeActivate',
    place: 'place',
    zoomInOff: 'zoomInOff',
    zoomOutOff: 'zoomOutOff',
    zooms: 'zooms',
  },
  render: ({ lightbox, props }) => (
    <Layer
      label={lightbox.named}
      modal
      open={props.open}
      part="dialog"
      role="dialog"
    >
      <Slot
        name="header"
        part="header"
      />
      <View part="viewport">
        <Slot />
      </View>
      <Slot
        name="footer"
        part="footer"
      />
      {lightbox.arrows && (
        <Pressable
          disabled={lightbox.atStart}
          focusable-when-disabled
          label={props.previousLabel}
          part="previous"
          role="button"
        >
          <Slot name="previous-icon">
            <View
              ariaHidden
              icon="caret-left"
              part="previous-mark"
            />
          </Slot>
        </Pressable>
      )}
      {lightbox.arrows && (
        <Pressable
          disabled={lightbox.atEnd}
          focusable-when-disabled
          label={props.nextLabel}
          part="next"
          role="button"
        >
          <Slot name="next-icon">
            <View
              ariaHidden
              icon="caret-right"
              part="next-mark"
            />
          </Slot>
        </Pressable>
      )}
      {lightbox.zooms && (
        <Pressable
          disabled={lightbox.zoomOutOff}
          focusable-when-disabled
          label={props.zoomOutLabel}
          part="zoom-out"
          role="button"
        >
          <Slot name="zoom-out-icon">
            <View
              ariaHidden
              icon="minus"
              part="zoom-out-mark"
            />
          </Slot>
        </Pressable>
      )}
      {lightbox.zooms && (
        <Pressable
          disabled={lightbox.zoomInOff}
          focusable-when-disabled
          label={props.zoomInLabel}
          part="zoom-in"
          role="button"
        >
          <Slot name="zoom-in-icon">
            <View
              ariaHidden
              icon="plus"
              part="zoom-in-mark"
            />
          </Slot>
        </Pressable>
      )}
      {props.controls && (
        <Pressable
          label={props.dismissLabel}
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
      {lightbox.counted && (
        <View
          ariaHidden
          part="counter"
        >
          <Text part="counter-words">{lightbox.place}</Text>
        </View>
      )}
      <Announce
        part="live"
        platform="web"
      />
    </Layer>
  ),
})

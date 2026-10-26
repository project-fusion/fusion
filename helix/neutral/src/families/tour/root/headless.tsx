import { bare, boolean, cancelable, headless, Layer, number, oneOf, Slot } from '../../../render.js'

/**
 * Tour's headless tier: a guided tour of an interface, one stop at a time.
 *
 * **It holds the order of the stops passed into it**: which one shows,
 * what Next and Back do, and when the tour is finished. Each stop holds its
 * target and its content. `open` starts the run, and `default-open` seeds
 * it. A move asks `before-activate` first, with the new index, which a
 * handler may refuse, and sends `activate` once it stands. **Skip and every
 * other way out ask `before-close`**, which a handler may refuse, then send
 * `tour-status` with `skipped`. **Next on the last stop finishes the tour**:
 * `complete`, then `tour-status` with `completed`, and it closes with
 * nothing asked. `toggle` follows `open` either way.
 *
 * **Back passes over a `wait` stop**, and at a `wait` stop the tour sends
 * `tour-status` with `waiting`, waits for the stop's target to be drawn,
 * and moves on by itself. A stop's `effect` runs as the tour reaches it,
 * and the tour is `preparing` while a promise it returns settles.
 *
 * **The spotlight lights the current target**, `spotlight-padding` around
 * it, with the dimmed area around it: a ring as wide as the window on a
 * phone, a spread shadow on the web. A dialog or a floating stop, which
 * lights nothing, shows over the `backdrop`. **Focus follows the run**:
 * opening moves it to the first stop's panel, a move from inside the tour
 * moves it to the next stop's, and ending gives it back to where it was as
 * the tour opened. Escape, a phone's back, and a screen reader's escape
 * skip the tour, and Right and Left from a hardware keyboard go on and
 * back from a stop's panel, turned on a right-to-left page.
 * `outside-press="close"` ends the tour on a press outside the stop and its
 * target.
 *
 * **The web's**: the region `label` names, which a phone says as the tour
 * opens; the scroll that brings a target into view; `outside-press="block"`,
 * which a phone has no way to refuse outside the stop; a `wait` stop's
 * focus on the control before it, which a phone gives back to where it was
 * as the tour opened; and `next()`, `back()`, and `skip()`, which a phone's
 * page reaches through `index` and `open`, as the gallery's examples do.
 *
 * **Held to `helix-tour`.** `helix family check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says
 * the element has.
 */
export default headless('tour', {
  props: {
    backLabel: '',
    defaultIndex: 0,
    defaultOpen: false,
    doneLabel: '',
    index: number(),
    label: '',
    nextLabel: '',
    open: boolean(),
    outsidePress: oneOf(['block', 'close']),
    progress: false,
    progressLabel: '{index} of {count}',
    skipLabel: '',
    spotlightPadding: 8,
  },
  events: {
    activate: ['value'],
    beforeActivate: cancelable(['value']),
    beforeClose: cancelable(['open']),
    beforeOpen: cancelable(['open']),
    complete: ['value'],
    toggle: bare(['newState', 'oldState']),
    tourAsk: ['what'],
    tourStatus: ['index', 'status'],
  },
  states: ['open', 'preparing', 'settled', 'waiting'],
  toggle: {
    defaultProp: 'defaultOpen',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onToggle: 'toggle',
    prop: 'open',
  },
  tour: {
    backLabel: 'backLabel',
    defaultProp: 'defaultIndex',
    doneLabel: 'doneLabel',
    lit: 'lit',
    nextLabel: 'nextLabel',
    onAsk: 'tourAsk',
    onBeforeChange: 'beforeActivate',
    onChange: 'activate',
    onComplete: 'complete',
    onStatus: 'tourStatus',
    outsidePress: 'outsidePress',
    preparing: 'preparing',
    progress: 'progress',
    progressLabel: 'progressLabel',
    prop: 'index',
    skipLabel: 'skipLabel',
    spotlight: 'spot',
    spotlightPadding: 'spotlightPadding',
    veiled: 'veiled',
    waiting: 'waiting',
  },
  render: ({ tour }) => (
    <>
      {/* Behind a dialog or a floating stop, which lights nothing, drawn only
          while one shows. */}
      {tour.veiled && (
        <Layer
          ariaHidden
          open={tour.veiled}
          part="backdrop"
        />
      )}
      {/* The box over the current target, whose shadow dims the rest, drawn
          only while it lights one. */}
      {tour.lit && (
        <Layer
          ariaHidden
          open={tour.lit}
          part="spotlight"
          style={{
            '--tour-spotlight-height': tour.spotlight.height,
            '--tour-spotlight-width': tour.spotlight.width,
            '--tour-spotlight-x': tour.spotlight.x,
            '--tour-spotlight-y': tour.spotlight.y,
          }}
        />
      )}
      <Slot />
    </>
  ),
})

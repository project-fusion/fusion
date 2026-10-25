import { bind, event, headless, layer, prop, region, toggle, tour, when } from '../../../tree.js'

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
  events: [
    event('activate', { detail: ['value'] }),
    event('before-activate', { cancelable: true, detail: ['value'] }),
    event('before-close', { cancelable: true, detail: ['open'] }),
    event('before-open', { cancelable: true, detail: ['open'] }),
    event('complete', { detail: ['value'] }),
    event('tour-ask', { detail: ['what'] }),
    event('tour-status', { detail: ['index', 'status'] }),
    event('toggle', { bare: true, detail: ['newState', 'oldState'] }),
  ],
  props: [
    prop('back-label', 'string', { default: '' }),
    prop('default-index', 'number', { default: 0 }),
    prop('default-open', 'boolean', { default: false }),
    prop('done-label', 'string', { default: '' }),
    prop('index', 'number'),
    prop('label', 'string', { default: '' }),
    prop('next-label', 'string', { default: '' }),
    prop('open', 'boolean'),
    prop('outside-press', ['block', 'close']),
    prop('progress', 'boolean', { default: false }),
    prop('progress-label', 'string', { default: '{index} of {count}' }),
    prop('skip-label', 'string', { default: '' }),
    prop('spotlight-padding', 'number', { default: 8 }),
  ],
  states: ['open', 'preparing', 'settled', 'waiting'],
  toggle: toggle({
    changes: 'toggle',
    checked: 'open',
    closes: 'before-close',
    initial: 'default-open',
    opens: 'before-open',
  }),
  tour: tour({
    asks: 'tour-ask',
    back: 'back-label',
    before: 'before-activate',
    completes: 'complete',
    done: 'done-label',
    index: 'index',
    initial: 'default-index',
    lit: 'lit',
    moves: 'activate',
    next: 'next-label',
    outside: 'outside-press',
    padding: 'spotlight-padding',
    place: 'progress-label',
    preparing: 'preparing',
    progress: 'progress',
    reports: 'tour-status',
    skip: 'skip-label',
    spot: 'spot',
    veiled: 'veiled',
    waiting: 'waiting',
  }),
  tree: [
    /* Behind a dialog or a floating stop, which lights nothing, drawn only
       while one shows. */
    when('veiled', layer('backdrop', { decorative: true, open: bind('veiled') }, [])),
    /* The box over the current target, whose shadow dims the rest, drawn
       only while it lights one. */
    when(
      'lit',
      layer(
        'spotlight',
        {
          '--tour-spotlight-height': bind('spot-height'),
          '--tour-spotlight-width': bind('spot-width'),
          '--tour-spotlight-x': bind('spot-x'),
          '--tour-spotlight-y': bind('spot-y'),
          decorative: true,
          open: bind('lit'),
        },
        [],
      ),
    ),
    region('default'),
  ],
})

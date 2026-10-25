import {
  bind,
  box,
  collection,
  derive,
  event,
  headless,
  live,
  pressable,
  prop,
  region,
  stack,
  text,
  unless,
  when,
} from '../../../tree.js'

/**
 * Drilldown's headless tier: a stack of pages of rows, one page showing at
 * a time, where a row with a page of its own shows that page in place of
 * the one showing.
 *
 * **A press on a row with a page goes into it**, and the arrow along the
 * line does too. The way back in the header over the page, the arrow back,
 * and Escape go up one level. Each move asks `navigate` first, with the
 * `value` of the row whose page would show, empty for the top page, which a
 * handler may refuse. `page` holds the value of the row whose page is
 * showing, and writing it shows that page.
 *
 * **Focus moves with the page**: to its first row going in, and to the row
 * whose page was left going back. The arrow keys move among the rows, Home
 * and End go to the first and the last, and a typed letter moves to the
 * next row whose name starts with it. A press on a row with no page sends
 * its `select`, which reaches the drilldown's handler too.
 *
 * **The page slides in from the side it came from**: the element is
 * `forward` after a move into a page and `back` after a move out of one,
 * and `drilled` while a page below the top is showing. The header names the
 * page showing, which the page is named by, and the top page is named by
 * `label`.
 *
 * **Under `navigation` the host is a navigation landmark** named by
 * `label`, each page is a list, and each row a list item. While `loading` holds, the page says
 * `loading-text`, and with no rows it says `empty-text`, each told to a
 * screen reader too.
 *
 * **Held to `helix-drilldown`.** `helix family check` compares the props,
 * the events, the states, the regions, and the parts with what the
 * manifest says the element has.
 */
export default headless('drilldown', {
  collection: collection({
    keys: { chooses: false, keeps: ['ArrowLeft', 'ArrowRight'], wrap: true },
    mixes: true,
  }),
  derived: {
    'back-name': derive('drilldown-back-name'),
    'empty-words': derive('drilldown-empty'),
    landmark: derive('drilldown-landmark'),
    'landmark-name': derive('drilldown-landmark-name'),
    'loading-words': derive('drilldown-loading'),
    'page-role': derive('drilldown-page-role'),
    rows: bind('default'),
    status: derive('drilldown-status'),
    'top-name': derive('drilldown-top-name'),
  },
  events: [
    event('navigate', { cancelable: true, detail: ['value'] }),
    event('select', { cancelable: true, detail: ['value'] }),
  ],
  host: { label: bind('landmark-name'), role: bind('landmark') },
  props: [
    prop('back-label', 'string', { default: 'Back' }),
    prop('empty-text', 'string', { default: 'Nothing to show' }),
    prop('label', 'string', { default: 'Navigation' }),
    prop('loading', 'boolean', { default: false }),
    prop('loading-text', 'string', { default: 'Loading' }),
    prop('navigation', 'boolean', { default: false }),
    prop('page', 'string', { default: '' }),
  ],
  stack: stack({
    back: 'back',
    before: 'navigate',
    drilled: 'drilled',
    entered: 'forward',
    label: 'page-label',
    left: 'back',
    page: 'page',
    top: 'top-name',
    writes: { listed: 'navigation' },
  }),
  states: ['back', 'drilled', 'forward', 'settled'],
  tree: [
    when(
      'drilled',
      box('header', {}, [
        pressable('back', { label: bind('back-name') }, [
          region('back-icon', { decorative: true }, [
            box('back-mark', { decorative: true, glyph: 'caret-left' }),
          ]),
        ]),
        box('title', {}, [text('title-words', { says: bind('page-label') })]),
      ]),
    ),
    box('page', { busy: bind('loading'), label: bind('page-label'), role: bind('page-role') }, [
      region('default'),
      when('loading', box('loading', {}, [text('loading-words', { says: bind('loading-words') })])),
      unless(
        'loading',
        unless('rows', box('empty', {}, [text('empty-words', { says: bind('empty-words') })])),
      ),
    ]),
    live('live', { follows: 'status', says: bind('status') }),
  ],
})

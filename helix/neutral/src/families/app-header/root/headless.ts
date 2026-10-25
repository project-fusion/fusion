import {
  bind,
  box,
  derive,
  event,
  headless,
  not,
  page,
  pressable,
  prop,
  region,
  toggle,
  unless,
  when,
} from '../../../tree.js'

/**
 * App Header's headless tier: the page's banner, a row of leading content,
 * a middle region, and trailing content.
 *
 * **The row reads brand, middle, actions from the two edges inwards**:
 * `start`, usually a wordmark, the default region, usually a Navigation,
 * centered in the bar, or beside the brand under `content-align="start"`,
 * and `end`, usually actions. The host is the page's `banner` landmark. A
 * phone has no landmark to announce, so a screen reader there reads what the
 * bar holds in order.
 *
 * **The bar follows the page it stands over**: it is in `scrolled` once the
 * page has moved from its top, which `scrolled` is sent for, and under
 * `hide-on-scroll` in `hidden` after a scroll down past its own height, and
 * out of it on a scroll up, while the folded region stays in view while open.
 * The page is the window on the web and the scroll view the bar is drawn in
 * on a phone, unless `scroller` names what scrolls by its id, as `page` in
 * `src/page.ts` says.
 *
 * **Under `fold-below`, a bar narrower than that folds its middle region
 * behind a toggle**, named by `menu-label`, at the end of the bar, or at its
 * start under `toggle-placement="start"`, and the region opens below the row,
 * after it in focus order. The element is in `folded` while it is that
 * narrow. Every way the region opens and closes asks `before-open` or
 * `before-close` first, which a handler may refuse, and `toggle` follows once
 * it stands the other way. **The web folds at the bar's width, and a phone
 * at the window's**, which is the bar's while the bar spans the window.
 *
 * **The web's**: the landmark's place, a plain box inside `main`, `article`,
 * `aside`, `nav`, or `section`, which a phone has no landmark to drop; the
 * region closing on Escape, on focus moving out of the header, and on a
 * press outside it; and the bar shown again as focus moves into it.
 *
 * **Held to `helix-app-header`.** `helix family check` compares the props,
 * the events, the states, the regions, and the parts with what the manifest
 * says the element has.
 */
export default headless('app-header', {
  derived: {
    folded: derive('app-header-folded'),
    'toggle-end': derive('app-header-toggle-end'),
    'toggle-start': derive('app-header-toggle-start'),
  },
  events: [
    event('before-close', { cancelable: true, detail: ['open'] }),
    event('before-open', { cancelable: true, detail: ['open'] }),
    event('scrolled', { detail: ['scrolled'] }),
    event('toggle', { bare: true, detail: ['newState', 'oldState'] }),
  ],
  host: { role: 'banner' },
  page: page({
    hidden: 'hidden',
    hides: 'hide-on-scroll',
    scrolled: 'scrolled',
    scroller: 'scroller',
    sends: 'scrolled',
    stays: 'open',
  }),
  props: [
    prop('content-align', ['start']),
    prop('default-open', 'boolean', { default: false }),
    prop('fold-below', 'number'),
    prop('hide-on-scroll', 'boolean', { default: false }),
    prop('menu-label', 'string', { default: 'Menu' }),
    prop('open', 'boolean'),
    prop('scroller', 'string'),
    prop('toggle-placement', ['start']),
  ],
  states: ['folded', 'hidden', 'open', 'scrolled', 'settled'],
  toggle: toggle({
    changes: 'toggle',
    checked: 'open',
    closes: 'before-close',
    initial: 'default-open',
    opens: 'before-open',
  }),
  tree: [
    box('row', {}, [
      /* The toggle that opens a folded middle region, at the start of the
         bar under `toggle-placement="start"` and at its end otherwise. */
      box('start', {}, [
        when(
          'toggle-start',
          pressable(
            'toggle',
            { expanded: bind('open'), label: bind('menu-label'), role: 'button', toggles: true },
            [region('menu-icon', {}, [box('toggle-mark', { decorative: true, glyph: 'list' })])],
          ),
        ),
        region('start'),
      ]),
      /* Between the brand and the actions while the bar is wide, and after
         both, on a line of its own, while it is folded, so focus reaches it
         after the toggle at the end. */
      unless('folded', box('content', {}, [region('default')])),
      box('end', {}, [
        region('end'),
        when(
          'toggle-end',
          pressable(
            'toggle',
            { expanded: bind('open'), label: bind('menu-label'), role: 'button', toggles: true },
            [region('menu-icon', {}, [box('toggle-mark', { decorative: true, glyph: 'list' })])],
          ),
        ),
      ]),
      when('folded', box('content', { hidden: not('open') }, [region('default')])),
    ]),
  ],
})
